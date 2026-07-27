import {
  ACTIVE_STATUSES,
  DUPLICATE_THRESHOLD_VERSION,
  PROCESSING_VERSION,
  analysisSchema,
  duplicateDecisionSchema,
  enforceDuplicateThreshold,
  pagePath,
  termOverlap,
  type DuplicateDecision,
  type DuplicateOutcome,
  type ReportAnalysis,
} from "./feedback-intelligence.ts";
import {
  AI_ANALYSIS_MODE,
  FALLBACK_ANALYSIS_MODE,
  classifyFeedbackDeterministically,
  decideDeterministicDuplicate,
  type AnalysisMode,
  type DuplicateCandidate,
} from "./feedback-fallback.ts";
import { createIssueForSubmission, moveSubmission, recalculateIssue } from "./issue-operations.ts";
import { type DispatchOptions } from "./notification-dispatch.ts";
import { errorMessage } from "./response.ts";

type Row = Record<string, any>;

export const AI_ANALYSIS_TIMEOUT_MS = 10_000;
export const AI_DUPLICATE_TIMEOUT_MS = 8_000;

export interface LlmAdapter {
  invoke(input: { prompt: string; response_json_schema: Record<string, unknown> }): Promise<unknown>;
}

export interface ProcessFeedbackResult {
  success: boolean;
  idempotent: boolean;
  issueId: string | null;
  outcome?: DuplicateOutcome;
  analysisMode?: AnalysisMode;
  duplicateMode?: AnalysisMode;
  error?: string;
}

const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  required: ["summary", "feedbackType", "category", "productArea", "severity", "severityReasons", "keywords", "reproducibility", "coreWorkflowBlocked", "confidence"],
  properties: {
    summary: { type: "string" }, feedbackType: { type: "string", enum: ["bug", "feature", "general"] },
    category: { type: "string", enum: ["ui_ux", "functionality", "performance", "authentication", "data", "content", "other"] },
    productArea: { type: "string" }, severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
    severityReasons: { type: "array", items: { type: "string" } }, keywords: { type: "array", items: { type: "string" } },
    reproducibility: { type: "string", enum: ["confirmed", "likely", "unknown"] }, coreWorkflowBlocked: { type: "boolean" },
    confidence: { type: "number" },
  },
};

const DUPLICATE_JSON_SCHEMA = {
  type: "object",
  required: ["candidateIssueId", "sameUnderlyingIssue", "decision", "confidence", "matchingReasons", "conflictingEvidence"],
  properties: {
    candidateIssueId: { type: ["string", "null"] }, sameUnderlyingIssue: { type: "boolean" },
    decision: { type: "string", enum: ["auto_group", "suggest", "separate"] }, confidence: { type: "number" },
    matchingReasons: { type: "array", items: { type: "string" } }, conflictingEvidence: { type: "array", items: { type: "string" } },
  },
};

export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function failProcessing(sr: any, submission: Row, message: string) {
  const safeMessage = message.slice(0, 500);
  await sr.entities.FeedbackSubmission.update(submission.id, {
    processing_status: "failed", processing_error: safeMessage, processing_completed_at: new Date().toISOString(),
  });
  const prior = await sr.entities.ActivityEvent.filter({ submission_id: submission.id, event_type: "processing_failed" });
  if (!prior[0]) await sr.entities.ActivityEvent.create({
    project_id: submission.project_id, owner_id: submission.owner_id, submission_id: submission.id,
    event_type: "processing_failed", actor_type: "system", actor_id: "system",
    internal_message: `Feedback intelligence failed: ${safeMessage}`, created_at: new Date().toISOString(),
  });
}

async function activityOnce(sr: any, event: Row) {
  const prior = await sr.entities.ActivityEvent.filter({ submission_id: event.submission_id, event_type: event.event_type });
  if (!prior[0]) await sr.entities.ActivityEvent.create(event);
}

async function candidateContext(sr: any, issue: Row): Promise<DuplicateCandidate & Row> {
  const links = await sr.entities.IssueReport.filter({ issue_id: issue.id });
  const first = links[0] ? await sr.entities.FeedbackSubmission.get(links[0].submission_id).catch(() => null) : null;
  return {
    id: issue.id, publicCode: issue.public_code, title: issue.title, description: issue.description,
    category: issue.category, productArea: issue.product_area, status: issue.status,
    pagePath: pagePath(first?.page_url), reportCount: issue.report_count ?? links.length,
    feedbackType: first?.type, keywords: first?.ai_keywords ?? [],
  };
}

export async function analyzeSubmission(
  submission: Row,
  llm: LlmAdapter | null,
  options: { analysisTimeoutMs?: number; forceFallback?: boolean } = {},
): Promise<{ analysis: ReportAnalysis; mode: AnalysisMode }> {
  if (!options.forceFallback && llm) {
    try {
      const analysisRaw = await withTimeout(llm.invoke({
        prompt: `Classify this product feedback. Preserve uncertainty. Severity is impact, not writing tone. Never calculate priority.\n\nType selected: ${submission.type}\nDescription: ${submission.description}\nExpected behavior: ${submission.expected_behavior ?? "Not supplied"}\nReproduction steps: ${submission.reproduction_steps ?? "Not supplied"}\nPage path: ${pagePath(submission.page_url) ?? "Not supplied"}`,
        response_json_schema: ANALYSIS_JSON_SCHEMA,
      }), options.analysisTimeoutMs ?? AI_ANALYSIS_TIMEOUT_MS, "AI classification");
      const parsedAnalysis = analysisSchema.safeParse(analysisRaw);
      if (parsedAnalysis.success) return { analysis: parsedAnalysis.data, mode: AI_ANALYSIS_MODE };
    } catch {
      // Fall through to deterministic analysis.
    }
  }
  return { analysis: classifyFeedbackDeterministically(submission), mode: FALLBACK_ANALYSIS_MODE };
}

export async function decideDuplicateGrouping(
  submission: Row,
  analysis: ReportAnalysis,
  candidates: Array<DuplicateCandidate & Row>,
  llm: LlmAdapter | null,
  options: { duplicateTimeoutMs?: number; forceFallback?: boolean; preferFallbackAfterAi?: boolean } = {},
): Promise<{ outcome: DuplicateOutcome; comparison: DuplicateDecision; mode: AnalysisMode }> {
  const validIds = new Set(candidates.map((item) => item.id));
  if (!candidates.length) {
    return {
      outcome: "separate",
      comparison: { candidateIssueId: null, sameUnderlyingIssue: false, decision: "separate", confidence: 0, matchingReasons: [], conflictingEvidence: [] },
      mode: options.forceFallback || options.preferFallbackAfterAi ? FALLBACK_ANALYSIS_MODE : AI_ANALYSIS_MODE,
    };
  }

  if (!options.forceFallback && llm) {
    try {
      const raw = await withTimeout(llm.invoke({
        prompt: `Choose whether this report describes the same underlying product problem as one candidate. Different symptoms or causes must remain separate. Return one candidate id or null.\n\nNew report: ${JSON.stringify({ summary: analysis.summary, description: submission.description, expectedBehavior: submission.expected_behavior, category: analysis.category, productArea: analysis.productArea, keywords: analysis.keywords, pagePath: pagePath(submission.page_url), browser: submission.browser_name, device: submission.device_type })}\n\nCandidates: ${JSON.stringify(candidates)}`,
        response_json_schema: DUPLICATE_JSON_SCHEMA,
      }), options.duplicateTimeoutMs ?? AI_DUPLICATE_TIMEOUT_MS, "AI duplicate comparison");
      const validated = duplicateDecisionSchema.safeParse(raw);
      if (validated.success) {
        const outcome = enforceDuplicateThreshold(validated.data, validIds);
        return { outcome, comparison: validated.data, mode: AI_ANALYSIS_MODE };
      }
    } catch {
      // Fall through to deterministic duplicate scoring.
    }
  }

  const fallback = decideDeterministicDuplicate(analysis, submission, candidates);
  return { outcome: fallback.outcome, comparison: fallback.decision, mode: FALLBACK_ANALYSIS_MODE };
}

export interface ProcessFeedbackOptions {
  sr: any;
  submissionId: string;
  llm?: LlmAdapter | null;
  retry?: boolean;
  ownerEmail?: string | null;
  forceFallback?: boolean;
  analysisTimeoutMs?: number;
  duplicateTimeoutMs?: number;
  /** When true, skip owner-auth checks for retry/failed (used by trusted submit-feedback path). */
  trustedInline?: boolean;
  dispatchGate?: DispatchOptions | null;
}

export async function processFeedbackSubmission(options: ProcessFeedbackOptions): Promise<ProcessFeedbackResult> {
  const { sr, submissionId } = options;
  const llm = options.llm ?? null;
  let submission: Row | null = null;
  try {
    submission = await sr.entities.FeedbackSubmission.get(submissionId);
    if (!submission) return { success: false, idempotent: false, issueId: null, error: "Submission not found" };
    const received = submission;

    if (received.processing_status === "completed") {
      const links = await sr.entities.IssueReport.filter({ submission_id: received.id });
      return { success: true, idempotent: true, issueId: links[0]?.issue_id ?? null };
    }

    if (!options.trustedInline && (options.retry || received.processing_status === "failed")) {
      if (!options.ownerEmail || options.ownerEmail !== received.owner_id) {
        return { success: false, idempotent: false, issueId: null, error: "Only the project owner can retry processing" };
      }
    }

    if (received.processing_status === "processing") {
      const started = new Date(received.processing_started_at ?? 0).getTime();
      if (Date.now() - started < 5 * 60 * 1000) {
        return { success: false, idempotent: false, issueId: null, error: "This report is already processing" };
      }
    }

    const nowIso = new Date().toISOString();
    const locked = await sr.entities.FeedbackSubmission.updateMany({ id: received.id, processing_status: received.processing_status }, {
      $set: {
        processing_status: "processing", processing_error: "", processing_started_at: nowIso,
        processing_attempts: (received.processing_attempts ?? 0) + 1, processing_version: PROCESSING_VERSION,
      },
    });
    if (!locked.updated) return { success: false, idempotent: false, issueId: null, error: "This report is already processing" };

    const { analysis, mode: analysisMode } = await analyzeSubmission(received, llm, {
      analysisTimeoutMs: options.analysisTimeoutMs, forceFallback: options.forceFallback,
    });
    const enriched = await sr.entities.FeedbackSubmission.update(received.id, {
      ai_summary: analysis.summary, ai_category: analysis.category, ai_product_area: analysis.productArea,
      ai_severity: analysis.severity, ai_severity_reasons: analysis.severityReasons, ai_keywords: analysis.keywords,
      ai_reproducibility: analysis.reproducibility, ai_core_workflow_blocked: analysis.coreWorkflowBlocked,
      ai_confidence: analysis.confidence, ai_analysis_mode: analysisMode,
    });
    submission = enriched;

    const allIssues = await sr.entities.Issue.filter({ project_id: enriched.project_id }, "-last_seen_at", 100);
    const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const eligible = allIssues.filter((issue: Row) => ACTIVE_STATUSES.has(issue.status) || (issue.status === "resolved" && new Date(issue.resolved_at ?? 0).getTime() >= recentCutoff));
    const ranked = eligible
      .map((issue: Row) => ({
        issue,
        score: (issue.product_area === analysis.productArea ? 2 : 0) + (issue.category === analysis.category ? 1 : 0) +
          termOverlap(analysis.summary, `${issue.title} ${issue.description ?? ""}`),
      }))
      .sort((a: Row, b: Row) => b.score - a.score)
      .slice(0, 8)
      .map((entry: Row) => entry.issue);
    const candidates = await Promise.all(ranked.map((issue: Row) => candidateContext(sr, issue)));

    const { outcome, comparison, mode: duplicateMode } = await decideDuplicateGrouping(
      enriched, analysis, candidates, llm,
      { duplicateTimeoutMs: options.duplicateTimeoutMs, forceFallback: options.forceFallback || analysisMode === FALLBACK_ANALYSIS_MODE },
    );

    let issue: Row;
    const dispatchGate = options.dispatchGate ?? null;
    if (outcome === "auto_group" && comparison.candidateIssueId) {
      issue = await sr.entities.Issue.get(comparison.candidateIssueId);
      await moveSubmission(sr, enriched.id, issue.id, enriched.owner_id, "automatic", comparison, dispatchGate);
      issue = await recalculateIssue(sr, issue.id, { dispatchGate });
      await activityOnce(sr, {
        project_id: enriched.project_id, owner_id: enriched.owner_id, issue_id: issue.id, submission_id: enriched.id,
        event_type: "duplicate_auto_grouped", actor_type: "system", actor_id: "system",
        internal_message: `Automatically grouped at ${Math.round(comparison.confidence * 100)}% confidence (${duplicateMode}).`,
        metadata: {
          confidence: comparison.confidence, matchingReasons: comparison.matchingReasons,
          conflictingEvidence: comparison.conflictingEvidence, thresholdVersion: DUPLICATE_THRESHOLD_VERSION,
          analysisMode, duplicateMode,
        },
        created_at: nowIso,
      });
    } else {
      issue = await createIssueForSubmission(sr, enriched, enriched.owner_id, "unreviewed", dispatchGate);
      if (outcome === "suggest" && comparison.candidateIssueId) {
        const existingSuggestions = await sr.entities.DuplicateSuggestion.filter({
          submission_id: enriched.id, candidate_issue_id: comparison.candidateIssueId,
        });
        if (!existingSuggestions[0]) await sr.entities.DuplicateSuggestion.create({
          project_id: enriched.project_id, owner_id: enriched.owner_id, submission_id: enriched.id,
          source_issue_id: issue.id, candidate_issue_id: comparison.candidateIssueId, similarity_score: comparison.confidence,
          matching_reasons: comparison.matchingReasons, conflicting_evidence: comparison.conflictingEvidence,
          threshold_version: DUPLICATE_THRESHOLD_VERSION, status: "pending", created_at: nowIso,
        });
        await activityOnce(sr, {
          project_id: enriched.project_id, owner_id: enriched.owner_id, issue_id: issue.id, submission_id: enriched.id,
          event_type: "duplicate_suggested", actor_type: "system", actor_id: "system",
          internal_message: `Possible duplicate suggested at ${Math.round(comparison.confidence * 100)}% confidence (${duplicateMode}).`,
          metadata: {
            candidateIssueId: comparison.candidateIssueId, matchingReasons: comparison.matchingReasons,
            conflictingEvidence: comparison.conflictingEvidence, thresholdVersion: DUPLICATE_THRESHOLD_VERSION,
            analysisMode, duplicateMode,
          },
          created_at: nowIso,
        });
      }
    }

    await activityOnce(sr, {
      project_id: enriched.project_id, owner_id: enriched.owner_id, issue_id: issue.id, submission_id: enriched.id,
      event_type: "classification_completed", actor_type: "system", actor_id: "system",
      internal_message: `Classified as ${analysis.category}, ${analysis.severity} severity (${analysisMode}).`,
      metadata: {
        confidence: analysis.confidence, severityReasons: analysis.severityReasons,
        processingVersion: PROCESSING_VERSION, analysisMode, duplicateMode,
      },
      created_at: nowIso,
    });
    await sr.entities.FeedbackSubmission.update(enriched.id, {
      processing_status: "completed", processing_error: "", processing_completed_at: new Date().toISOString(),
    });
    return { success: true, idempotent: false, outcome, issueId: issue.id, analysisMode, duplicateMode };
  } catch (err) {
    if (submission) await failProcessing(sr, submission, errorMessage(err)).catch(() => {});
    return { success: false, idempotent: false, issueId: null, error: errorMessage(err) };
  }
}

export function createBase44LlmAdapter(base44: any): LlmAdapter {
  return {
    invoke: (input) => base44.integrations.Core.InvokeLLM({
      prompt: input.prompt,
      response_json_schema: input.response_json_schema,
    }),
  };
}
