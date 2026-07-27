import {
  ACTIVE_STATUSES,
  normalizeTerms,
  pagePath,
  termOverlap,
  type DuplicateDecision,
  type DuplicateOutcome,
  type ReportAnalysis,
} from "./feedback-intelligence.ts";
import { normalizeTitle } from "./text.ts";

export const FALLBACK_ANALYSIS_MODE = "deterministic_fallback" as const;
export const AI_ANALYSIS_MODE = "ai" as const;
export type AnalysisMode = typeof AI_ANALYSIS_MODE | typeof FALLBACK_ANALYSIS_MODE;

/** Bounded confidence for keyword rules — never presented as model confidence. */
export const FALLBACK_CONFIDENCE = 0.42;
/** Auto-group only near-identical deterministic matches. */
export const FALLBACK_AUTO_GROUP_SCORE = 0.92;
export const FALLBACK_SUGGEST_SCORE = 0.78;

const STOP_WORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "have", "been", "were", "was", "are", "but",
  "not", "you", "your", "our", "into", "about", "when", "what", "where", "which", "while", "than",
  "then", "them", "they", "their", "there", "here", "also", "just", "like", "can", "could", "would",
  "should", "will", "able", "after", "before", "over", "under", "again", "very", "more", "most",
  "some", "any", "all", "each", "other", "only", "same", "such", "too", "out", "get", "got", "does",
  "did", "doing", "make", "made", "using", "use", "used", "via",
]);

type Row = Record<string, unknown>;

const CATEGORY_RULES: Array<{ category: ReportAnalysis["category"]; terms: string[] }> = [
  { category: "authentication", terms: ["login", "logout", "signin", "sign in", "password", "oauth", "auth", "session", "2fa", "mfa"] },
  { category: "performance", terms: ["slow", "latency", "lag", "timeout", "freeze", "perf", "hang", "loading forever"] },
  { category: "ui_ux", terms: ["layout", "mobile", "responsive", "button", "overflow", "css", "ui", "ux", "screen", "viewport", "align"] },
  { category: "data", terms: ["data", "save", "export", "import", "corrupt", "missing field", "database", "sync"] },
  { category: "content", terms: ["typo", "copy", "wording", "translation", "label", "text wrong"] },
  { category: "functionality", terms: ["broken", "crash", "error", "fail", "bug", "cannot", "can't", "unable", "does not work", "doesn't work"] },
];

const CRITICAL_TERMS = ["cannot login", "can't login", "payment failed", "data loss", "lost data", "security", "breach", "outage", "down for everyone"];
const HIGH_TERMS = ["blocker", "blocked", "cannot submit", "can't submit", "crash", "broken checkout", "production", "urgent"];
const LOW_TERMS = ["typo", "cosmetic", "nit", "minor", "nice to have", "suggestion"];

function normalizeCorpus(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function fallbackTokens(value: string): string[] {
  return [...new Set(normalizeTerms(value).filter((term) => !STOP_WORDS.has(term) && term.length > 2))];
}

function tokenOverlapScore(left: string[], right: string[]): number {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  let shared = 0;
  for (const token of left) if (rightSet.has(token)) shared += 1;
  return shared / Math.max(left.length, right.length);
}

function pickCategory(corpus: string, feedbackType: ReportAnalysis["feedbackType"]): ReportAnalysis["category"] {
  for (const rule of CATEGORY_RULES) {
    if (rule.terms.some((term) => corpus.includes(term))) return rule.category;
  }
  if (feedbackType === "feature") return "functionality";
  if (feedbackType === "general") return "other";
  return "other";
}

function pickSeverity(corpus: string, feedbackType: ReportAnalysis["feedbackType"]): {
  severity: ReportAnalysis["severity"];
  reasons: string[];
  coreWorkflowBlocked: boolean;
} {
  const reasons: string[] = [];
  if (CRITICAL_TERMS.some((term) => corpus.includes(term))) {
    reasons.push("Keyword rules detected a likely product-blocking impact.");
    return { severity: "critical", reasons, coreWorkflowBlocked: true };
  }
  if (HIGH_TERMS.some((term) => corpus.includes(term))) {
    reasons.push("Keyword rules detected a high-impact workflow disruption.");
    return { severity: "high", reasons, coreWorkflowBlocked: corpus.includes("block") };
  }
  if (feedbackType === "feature" || LOW_TERMS.some((term) => corpus.includes(term))) {
    reasons.push("Feature or low-impact wording without strong severity signals.");
    return { severity: "low", reasons, coreWorkflowBlocked: false };
  }
  reasons.push("No strong severity keywords matched; defaulting to medium impact.");
  return { severity: "medium", reasons, coreWorkflowBlocked: false };
}

function productAreaFromPath(path: string | null, category: ReportAnalysis["category"]): string {
  if (!path || path === "/") return category === "other" ? "General" : category.replaceAll("_", " ");
  const segment = path.split("/").filter(Boolean)[0];
  if (!segment) return "General";
  return segment.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 120);
}

export function classifyFeedbackDeterministically(submission: Row): ReportAnalysis {
  const feedbackType = (submission.type === "bug" || submission.type === "feature" || submission.type === "general"
    ? submission.type
    : "general") as ReportAnalysis["feedbackType"];
  const description = String(submission.description ?? "");
  const expected = String(submission.expected_behavior ?? "");
  const reproduction = String(submission.reproduction_steps ?? "");
  const path = pagePath(typeof submission.page_url === "string" ? submission.page_url : undefined);
  const corpus = normalizeCorpus([description, expected, reproduction, path ?? undefined,
    typeof submission.browser_name === "string" ? submission.browser_name : undefined,
    typeof submission.device_type === "string" ? submission.device_type : undefined]);
  const category = pickCategory(corpus, feedbackType);
  const severity = pickSeverity(corpus, feedbackType);
  const keywords = fallbackTokens(`${description} ${expected}`).slice(0, 8);
  const summaryBase = normalizeTitle(description);
  const summary = summaryBase.length > 180 ? `${summaryBase.slice(0, 179).trimEnd()}…` : summaryBase;
  const reproducibility: ReportAnalysis["reproducibility"] = reproduction.trim().length > 20
    ? "likely"
    : expected.trim().length > 0
    ? "unknown"
    : "unknown";
  return {
    summary,
    feedbackType,
    category,
    productArea: productAreaFromPath(path, category),
    severity: severity.severity,
    severityReasons: [...severity.reasons, "Deterministic free-runtime analysis (not an AI model)."],
    keywords: keywords.length ? keywords : ["feedback"],
    reproducibility,
    coreWorkflowBlocked: severity.coreWorkflowBlocked,
    confidence: FALLBACK_CONFIDENCE,
  };
}

export interface DuplicateCandidate {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  productArea?: string;
  pagePath?: string | null;
  feedbackType?: string;
  keywords?: string[];
}

export function scoreDuplicateCandidate(
  analysis: ReportAnalysis,
  submission: Row,
  candidate: DuplicateCandidate,
): { score: number; matchingReasons: string[]; conflictingEvidence: string[] } {
  const matchingReasons: string[] = [];
  const conflictingEvidence: string[] = [];
  const submissionPath = pagePath(typeof submission.page_url === "string" ? submission.page_url : undefined);
  const leftTitle = fallbackTokens(`${analysis.summary} ${String(submission.description ?? "")}`);
  const rightTitle = fallbackTokens(`${candidate.title ?? ""} ${candidate.description ?? ""}`);
  const titleScore = tokenOverlapScore(leftTitle, rightTitle);
  const keywordScore = tokenOverlapScore(analysis.keywords, candidate.keywords ?? []);
  const summaryOverlap = termOverlap(analysis.summary, `${candidate.title ?? ""} ${candidate.description ?? ""}`);
  let score = titleScore * 0.45 + summaryOverlap * 0.25 + keywordScore * 0.15;

  if (candidate.productArea && candidate.productArea.toLowerCase() === analysis.productArea.toLowerCase()) {
    score += 0.08;
    matchingReasons.push("Product area agrees.");
  }
  if (candidate.category && candidate.category === analysis.category) {
    score += 0.05;
    matchingReasons.push("Category agrees.");
  }
  if (submissionPath && candidate.pagePath && submissionPath === candidate.pagePath) {
    score += 0.07;
    matchingReasons.push("Page path agrees.");
  }
  if (candidate.feedbackType && candidate.feedbackType === analysis.feedbackType) {
    score += 0.03;
    matchingReasons.push("Feedback type agrees.");
  }
  if (titleScore >= 0.5) matchingReasons.push("Strong normalized text overlap.");
  else if (titleScore >= 0.3) matchingReasons.push("Partial token overlap.");

  if (candidate.category && candidate.category !== analysis.category) {
    score -= 0.12;
    conflictingEvidence.push("Categories differ.");
  }
  if (candidate.productArea && analysis.productArea && candidate.productArea.toLowerCase() !== analysis.productArea.toLowerCase()) {
    score -= 0.08;
    conflictingEvidence.push("Product areas differ.");
  }
  if (candidate.feedbackType && candidate.feedbackType !== analysis.feedbackType) {
    score -= 0.1;
    conflictingEvidence.push("Feedback types differ.");
  }
  if (submissionPath && candidate.pagePath && submissionPath !== candidate.pagePath) {
    conflictingEvidence.push("Page paths differ.");
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    matchingReasons: matchingReasons.slice(0, 8),
    conflictingEvidence: conflictingEvidence.slice(0, 8),
  };
}

export function decideDeterministicDuplicate(
  analysis: ReportAnalysis,
  submission: Row,
  candidates: DuplicateCandidate[],
): { outcome: DuplicateOutcome; decision: DuplicateDecision } {
  if (!candidates.length) {
    return {
      outcome: "separate",
      decision: {
        candidateIssueId: null,
        sameUnderlyingIssue: false,
        decision: "separate",
        confidence: 0,
        matchingReasons: [],
        conflictingEvidence: ["No eligible candidates."],
      },
    };
  }

  const ranked = candidates
    .map((candidate) => ({ candidate, ...scoreDuplicateCandidate(analysis, submission, candidate) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const modeNote = "Deterministic free-runtime similarity (not an AI model).";
  const matchingReasons = [...best.matchingReasons, modeNote].slice(0, 8);
  const conflictingEvidence = best.conflictingEvidence.slice(0, 8);

  if (best.score >= FALLBACK_AUTO_GROUP_SCORE && conflictingEvidence.filter((item) => !item.includes("Page paths")).length === 0) {
    return {
      outcome: "auto_group",
      decision: {
        candidateIssueId: best.candidate.id,
        sameUnderlyingIssue: true,
        decision: "auto_group",
        confidence: best.score,
        matchingReasons,
        conflictingEvidence,
      },
    };
  }
  if (best.score >= FALLBACK_SUGGEST_SCORE) {
    return {
      outcome: "suggest",
      decision: {
        candidateIssueId: best.candidate.id,
        sameUnderlyingIssue: true,
        decision: "suggest",
        confidence: best.score,
        matchingReasons,
        conflictingEvidence,
      },
    };
  }
  return {
    outcome: "separate",
    decision: {
      candidateIssueId: best.candidate.id,
      sameUnderlyingIssue: false,
      decision: "separate",
      confidence: best.score,
      matchingReasons,
      conflictingEvidence: conflictingEvidence.length ? conflictingEvidence : ["Similarity below conservative free-runtime thresholds."],
    },
  };
}

export function eligibleIssuesForDuplicateScan(issues: Row[], now = Date.now()): Row[] {
  const recentCutoff = now - 30 * 24 * 60 * 60 * 1000;
  return issues.filter((issue) => {
    const status = String(issue.status ?? "");
    if (ACTIVE_STATUSES.has(status)) return true;
    if (status === "resolved") return new Date(String(issue.resolved_at ?? 0)).getTime() >= recentCutoff;
    return false;
  });
}
