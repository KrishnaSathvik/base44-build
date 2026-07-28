export const ISSUE_STATUSES = [
  "unreviewed", "needs_info", "open", "planned", "in_progress", "testing",
  "resolved", "reopened", "duplicate", "dismissed",
] as const;

export type IssueStatus = typeof ISSUE_STATUSES[number];

const ALLOWED: Readonly<Record<IssueStatus, readonly IssueStatus[]>> = {
  unreviewed: ["open", "needs_info", "duplicate", "dismissed"],
  needs_info: ["open", "dismissed"],
  open: ["planned", "in_progress", "needs_info", "dismissed", "duplicate"],
  planned: ["in_progress", "open", "dismissed"],
  in_progress: ["testing", "open", "dismissed"],
  testing: ["resolved", "in_progress"],
  resolved: ["reopened"],
  reopened: ["in_progress", "open", "needs_info"],
  duplicate: ["reopened"],
  dismissed: ["reopened"],
};

export interface TransitionOptions { directResolutionOverrideReason?: string | null }

export function isIssueStatus(value: unknown): value is IssueStatus {
  return typeof value === "string" && (ISSUE_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: IssueStatus, to: IssueStatus, options: TransitionOptions = {}): boolean {
  if ((from === "unreviewed" || from === "open" || from === "in_progress") && to === "resolved") {
    return !!options.directResolutionOverrideReason?.trim();
  }
  return ALLOWED[from].includes(to);
}

export function allowedTransitions(from: IssueStatus): readonly IssueStatus[] {
  const next = [...ALLOWED[from]];
  // Direct resolve is allowed from triage/active states when an owner override reason
  // is supplied (see canTransition). Surface it in the owner UI so resolve is reachable.
  if ((from === "unreviewed" || from === "open" || from === "in_progress") && !next.includes("resolved")) {
    next.push("resolved");
  }
  return next;
}

export function assertTransition(from: unknown, to: unknown, options: TransitionOptions = {}): asserts to is IssueStatus {
  if (!isIssueStatus(from) || !isIssueStatus(to)) throw new Error("Unsupported issue status");
  if (!canTransition(from, to, options)) throw new Error(`Transition from ${from} to ${to} is not allowed`);
}

export function transitionTimestamps(from: IssueStatus, to: IssueStatus, nowIso: string, current: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = { status: to };
  if (to === "planned" && !current.planned_at) patch.planned_at = nowIso;
  if (to === "in_progress" && !current.work_started_at) patch.work_started_at = nowIso;
  if (to === "testing" && !current.testing_started_at) patch.testing_started_at = nowIso;
  if (to === "resolved") {
    patch.resolved_at = nowIso;
    patch.resolution_confirmation_status = "pending";
  }
  if (to === "reopened") {
    patch.reopened_at = nowIso;
    patch.was_reopened = true;
  }
  if (to === "dismissed") patch.dismissed_at = nowIso;
  if (from === "resolved" && to === "reopened") patch.resolution_confirmation_status = "not_fixed";
  return patch;
}

export function transitionEventType(from: IssueStatus, to: IssueStatus): string {
  if (to === "needs_info") return "information_requested";
  if (to === "in_progress" && !["in_progress", "testing"].includes(from)) return "work_started";
  if (to === "testing") return "testing_started";
  if (to === "resolved") return "issue_resolved";
  if (to === "reopened") return "issue_reopened";
  if (to === "dismissed") return "issue_dismissed";
  if (to === "duplicate") return "issue_marked_duplicate";
  return "issue_status_changed";
}

export interface TransitionInput {
  publicMessage?: string | null;
  reason?: string | null;
  duplicateOfIssueId?: string | null;
}

export function transitionRequirementError(to: IssueStatus, input: TransitionInput): string | null {
  if (to === "needs_info" && !input.publicMessage?.trim()) return "A public question is required when requesting information";
  if (to === "resolved" && !input.publicMessage?.trim()) return "A public resolution note is required";
  if (to === "dismissed" && !input.reason?.trim()) return "An internal owner reason is required when dismissing an issue";
  if (to === "reopened" && !input.reason?.trim()) return "A reason is required when reopening an issue";
  if (to === "duplicate" && !input.duplicateOfIssueId) return "A canonical issue is required";
  return null;
}
