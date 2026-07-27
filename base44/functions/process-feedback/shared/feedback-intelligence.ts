import { z } from "npm:zod";

export const PROCESSING_VERSION = "feedback-intelligence-v1";
export const DUPLICATE_THRESHOLD_VERSION = "duplicate-thresholds-v1";
export const ACTIVE_STATUSES = new Set([
  "processing", "unreviewed", "needs_info", "open", "planned", "in_progress", "testing", "reopened",
]);

export const analysisSchema = z.object({
  summary: z.string().min(1).max(180),
  feedbackType: z.enum(["bug", "feature", "general"]),
  category: z.enum(["ui_ux", "functionality", "performance", "authentication", "data", "content", "other"]),
  productArea: z.string().min(1).max(120),
  severity: z.enum(["critical", "high", "medium", "low"]),
  severityReasons: z.array(z.string().min(1).max(240)).max(8),
  keywords: z.array(z.string().min(1).max(80)).max(8),
  reproducibility: z.enum(["confirmed", "likely", "unknown"]),
  coreWorkflowBlocked: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export const duplicateDecisionSchema = z.object({
  candidateIssueId: z.string().nullable(),
  sameUnderlyingIssue: z.boolean(),
  decision: z.enum(["auto_group", "suggest", "separate"]),
  confidence: z.number().min(0).max(1),
  matchingReasons: z.array(z.string().min(1).max(240)).max(8),
  conflictingEvidence: z.array(z.string().min(1).max(240)).max(8),
});

export type ReportAnalysis = z.infer<typeof analysisSchema>;
export type DuplicateDecision = z.infer<typeof duplicateDecisionSchema>;
export type DuplicateOutcome = "auto_group" | "suggest" | "separate";

export function enforceDuplicateThreshold(decision: DuplicateDecision, validCandidateIds: Set<string>): DuplicateOutcome {
  if (!decision.sameUnderlyingIssue || !decision.candidateIssueId || !validCandidateIds.has(decision.candidateIssueId)) return "separate";
  if (decision.confidence >= 0.85) return "auto_group";
  if (decision.confidence >= 0.65) return "suggest";
  return "separate";
}

export function normalizeTerms(value: string): string[] {
  return [...new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((term) => term.length > 2))];
}

export function termOverlap(left: string, right: string): number {
  const a = new Set(normalizeTerms(left));
  const b = new Set(normalizeTerms(right));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  return shared / Math.max(a.size, b.size);
}

export function pagePath(value?: string): string | null {
  if (!value) return null;
  try { return new URL(value).pathname; } catch { return value.startsWith("/") ? value.split(/[?#]/)[0] : null; }
}
