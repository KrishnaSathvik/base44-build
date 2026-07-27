import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { error, errorMessage, json } from "../../shared/response.ts";
import {
  ACTIVE_STATUSES,
  DUPLICATE_THRESHOLD_VERSION,
  PROCESSING_VERSION,
  analysisSchema,
  duplicateDecisionSchema,
  enforceDuplicateThreshold,
  pagePath,
  termOverlap,
} from "../../shared/feedback-intelligence.ts";
import { createIssueForSubmission, moveSubmission, recalculateIssue } from "../../shared/issue-operations.ts";

type Row = Record<string, any>;

const payloadSchema = z.object({ submissionId: z.string().min(1), retry: z.boolean().optional() });
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

async function currentUserEmail(base44: any): Promise<string | null> {
  try { return (await base44.auth.me())?.email ?? null; } catch { return null; }
}

async function failProcessing(sr: any, submission: Row, message: string) {
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

function automationSubmissionId(body: any): string | null {
  const values = [body?.payload?.data?.id, body?.data?.id, body?.event?.data?.id, body?.event?.entity_id, body?.event?.entityId, body?.entity?.id, body?.record?.id, body?.entity_id, body?.entityId];
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}

async function candidateContext(sr: any, issue: Row): Promise<Row> {
  const links = await sr.entities.IssueReport.filter({ issue_id: issue.id });
  const first = links[0] ? await sr.entities.FeedbackSubmission.get(links[0].submission_id).catch(() => null) : null;
  return {
    id: issue.id, publicCode: issue.public_code, title: issue.title, description: issue.description,
    category: issue.category, productArea: issue.product_area, status: issue.status,
    pagePath: pagePath(first?.page_url), reportCount: issue.report_count ?? links.length,
  };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;
  let submission: Row | null = null;
  try {
    const body = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    const submissionId = parsed.success ? parsed.data.submissionId : automationSubmissionId(body);
    const retry = parsed.success && parsed.data.retry === true;
    if (!submissionId) return error("Invalid processing request", 400);
    submission = await sr.entities.FeedbackSubmission.get(submissionId);
    if (!submission) return error("Submission not found", 404);
    const received = submission;

    if (received.processing_status === "completed") {
      const links = await sr.entities.IssueReport.filter({ submission_id: received.id });
      return json({ success: true, idempotent: true, issueId: links[0]?.issue_id ?? null });
    }
    if (retry || received.processing_status === "failed") {
      const email = await currentUserEmail(base44);
      if (!email || email !== received.owner_id) return error("Only the project owner can retry processing", 403);
    }
    if (received.processing_status === "processing") {
      const started = new Date(received.processing_started_at ?? 0).getTime();
      if (Date.now() - started < 5 * 60 * 1000) return error("This report is already processing", 409);
    }

    const nowIso = new Date().toISOString();
    const locked = await sr.entities.FeedbackSubmission.updateMany({ id: received.id, processing_status: received.processing_status }, {
      $set: { processing_status: "processing", processing_error: "", processing_started_at: nowIso,
        processing_attempts: (received.processing_attempts ?? 0) + 1, processing_version: PROCESSING_VERSION },
    });
    if (!locked.updated) return error("This report is already processing", 409);

    const analysisRaw = await base44.integrations.Core.InvokeLLM({
      prompt: `Classify this product feedback. Preserve uncertainty. Severity is impact, not writing tone. Never calculate priority.\n\nType selected: ${received.type}\nDescription: ${received.description}\nExpected behavior: ${received.expected_behavior ?? "Not supplied"}\nReproduction steps: ${received.reproduction_steps ?? "Not supplied"}\nPage path: ${pagePath(received.page_url) ?? "Not supplied"}`,
      response_json_schema: ANALYSIS_JSON_SCHEMA,
    });
    const parsedAnalysis = analysisSchema.safeParse(analysisRaw);
    if (!parsedAnalysis.success) throw new Error("The classifier returned an invalid structured response");
    const analysis = parsedAnalysis.data;
    const enriched = await sr.entities.FeedbackSubmission.update(received.id, {
      ai_summary: analysis.summary, ai_category: analysis.category, ai_product_area: analysis.productArea,
      ai_severity: analysis.severity, ai_severity_reasons: analysis.severityReasons, ai_keywords: analysis.keywords,
      ai_reproducibility: analysis.reproducibility, ai_core_workflow_blocked: analysis.coreWorkflowBlocked,
      ai_confidence: analysis.confidence,
    });

    submission = enriched;
    const allIssues = await sr.entities.Issue.filter({ project_id: enriched.project_id }, "-last_seen_at", 100);
    const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const eligible = allIssues.filter((issue: Row) => ACTIVE_STATUSES.has(issue.status) || (issue.status === "resolved" && new Date(issue.resolved_at ?? 0).getTime() >= recentCutoff));
    const ranked = eligible
      .map((issue: Row) => ({ issue, score: (issue.product_area === analysis.productArea ? 2 : 0) + (issue.category === analysis.category ? 1 : 0) + termOverlap(analysis.summary, `${issue.title} ${issue.description ?? ""}`) }))
      .sort((a: Row, b: Row) => b.score - a.score)
      .slice(0, 8)
      .map((entry: Row) => entry.issue);
    const candidates = await Promise.all(ranked.map((issue: Row) => candidateContext(sr, issue)));

    let outcome: "auto_group" | "suggest" | "separate" = "separate";
    let comparison = { candidateIssueId: null as string | null, confidence: 0, matchingReasons: [] as string[], conflictingEvidence: [] as string[] };
    if (candidates.length) {
      try {
        const raw = await base44.integrations.Core.InvokeLLM({
          prompt: `Choose whether this report describes the same underlying product problem as one candidate. Different symptoms or causes must remain separate. Return one candidate id or null.\n\nNew report: ${JSON.stringify({ summary: analysis.summary, description: enriched.description, expectedBehavior: enriched.expected_behavior, category: analysis.category, productArea: analysis.productArea, keywords: analysis.keywords, pagePath: pagePath(enriched.page_url), browser: enriched.browser_name, device: enriched.device_type })}\n\nCandidates: ${JSON.stringify(candidates)}`,
          response_json_schema: DUPLICATE_JSON_SCHEMA,
        });
        const validated = duplicateDecisionSchema.safeParse(raw);
        if (validated.success) {
          comparison = validated.data;
          outcome = enforceDuplicateThreshold(validated.data, new Set(candidates.map((item) => item.id)));
        }
      } catch {
        // Conservative deterministic fallback: a comparison failure never groups reports.
        outcome = "separate";
      }
    }

    let issue: Row;
    if (outcome === "auto_group" && comparison.candidateIssueId) {
      issue = await sr.entities.Issue.get(comparison.candidateIssueId);
      await moveSubmission(sr, enriched.id, issue.id, enriched.owner_id, "automatic", comparison);
      issue = await recalculateIssue(sr, issue.id);
      await activityOnce(sr, {
        project_id: enriched.project_id, owner_id: enriched.owner_id, issue_id: issue.id, submission_id: enriched.id,
        event_type: "duplicate_auto_grouped", actor_type: "system", actor_id: "system",
        internal_message: `Automatically grouped at ${Math.round(comparison.confidence * 100)}% confidence.`,
        metadata: { confidence: comparison.confidence, matchingReasons: comparison.matchingReasons, conflictingEvidence: comparison.conflictingEvidence, thresholdVersion: DUPLICATE_THRESHOLD_VERSION }, created_at: nowIso,
      });
    } else {
      issue = await createIssueForSubmission(sr, enriched, enriched.owner_id, "unreviewed");
      if (outcome === "suggest" && comparison.candidateIssueId) {
        const existingSuggestions = await sr.entities.DuplicateSuggestion.filter({ submission_id: enriched.id, candidate_issue_id: comparison.candidateIssueId });
        if (!existingSuggestions[0]) await sr.entities.DuplicateSuggestion.create({
          project_id: enriched.project_id, owner_id: enriched.owner_id, submission_id: enriched.id,
          source_issue_id: issue.id, candidate_issue_id: comparison.candidateIssueId, similarity_score: comparison.confidence,
          matching_reasons: comparison.matchingReasons, conflicting_evidence: comparison.conflictingEvidence,
          threshold_version: DUPLICATE_THRESHOLD_VERSION, status: "pending", created_at: nowIso,
        });
        await activityOnce(sr, {
          project_id: enriched.project_id, owner_id: enriched.owner_id, issue_id: issue.id, submission_id: enriched.id,
          event_type: "duplicate_suggested", actor_type: "system", actor_id: "system",
          internal_message: `Possible duplicate suggested at ${Math.round(comparison.confidence * 100)}% confidence.`,
          metadata: { candidateIssueId: comparison.candidateIssueId, matchingReasons: comparison.matchingReasons, conflictingEvidence: comparison.conflictingEvidence, thresholdVersion: DUPLICATE_THRESHOLD_VERSION }, created_at: nowIso,
        });
      }
    }

    const classificationEvents = await sr.entities.ActivityEvent.filter({ submission_id: enriched.id, event_type: "classification_completed" });
    if (!classificationEvents[0]) await sr.entities.ActivityEvent.create({
      project_id: enriched.project_id, owner_id: enriched.owner_id, issue_id: issue.id, submission_id: enriched.id,
      event_type: "classification_completed", actor_type: "system", actor_id: "system",
      internal_message: `Classified as ${analysis.category}, ${analysis.severity} severity.`,
      metadata: { confidence: analysis.confidence, severityReasons: analysis.severityReasons, processingVersion: PROCESSING_VERSION }, created_at: nowIso,
    });
    await sr.entities.FeedbackSubmission.update(enriched.id, {
      processing_status: "completed", processing_error: "", processing_completed_at: new Date().toISOString(),
    });
    return json({ success: true, idempotent: false, outcome, issueId: issue.id });
  } catch (err) {
    if (submission) await failProcessing(sr, submission, errorMessage(err)).catch(() => {});
    return error(errorMessage(err), 500);
  }
});
