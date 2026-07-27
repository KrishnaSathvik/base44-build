import { accessGrantIsExpired } from "./attachment-security.ts";
import { sha256Hex } from "./crypto.ts";

type Row = Record<string, any>;

export async function loadTrackingContext(sr: any, token: string): Promise<{ grant: Row; submission: Row; issue: Row }> {
  const tokenHash = await sha256Hex(token);
  const grant = (await sr.entities.ReporterAccess.filter({ token_hash: tokenHash }))[0];
  if (!grant) throw new TrackingAccessError("Invalid or unknown tracking link", 404);
  if (accessGrantIsExpired(grant.expires_at)) throw new TrackingAccessError("This tracking link has expired", 410);
  const submission = await sr.entities.FeedbackSubmission.get(grant.submission_id).catch(() => null);
  if (!submission || submission.project_id !== grant.project_id) throw new TrackingAccessError("Report not found", 404);
  const link = (await sr.entities.IssueReport.filter({ submission_id: submission.id }))
    .find((row: Row) => row.review_status !== "rejected");
  if (!link) throw new TrackingAccessError("Issue is still processing", 409);
  const issue = await sr.entities.Issue.get(link.issue_id).catch(() => null);
  if (!issue || issue.project_id !== submission.project_id) throw new TrackingAccessError("Issue not found", 404);
  return { grant, submission, issue };
}

export class TrackingAccessError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function publicMessagesForSubmission(messages: Row[], submissionId: string): Row[] {
  return messages
    .filter((message) => message.submission_id === submissionId && message.visibility === "public")
    .sort((a, b) => `${a.created_at ?? a.created_date ?? ""}`.localeCompare(`${b.created_at ?? b.created_date ?? ""}`));
}

export function senderLabel(senderType: string): "Product team" | "You" | "System" {
  return senderType === "owner" ? "Product team" : senderType === "reporter" ? "You" : "System";
}

export function validateDuplicateTarget(issue: Row, target: Row | null | undefined): string | null {
  if (!target || target.project_id !== issue.project_id) return "The canonical issue must exist in the same project";
  if (target.id === issue.id) return "An issue cannot duplicate itself";
  if (target.status === "duplicate") return "Choose the canonical issue rather than another duplicate";
  return null;
}

export function ownerOwnsProject(ownerEmail: string | null | undefined, project: Row | null | undefined): boolean {
  return !!ownerEmail && !!project && (project.created_by ?? project.owner_id) === ownerEmail;
}

export function findIdempotentMessage(messages: Row[], submissionId: string, idempotencyKey: string): Row | undefined {
  return messages.find((message) => message.submission_id === submissionId && message.idempotency_key === idempotencyKey);
}

export function followUpAttachmentBelongsToReporter(attachment: Row | null | undefined, submissionId: string, idempotencyKey: string): boolean {
  return !!attachment && attachment.submission_id === submissionId && attachment.submission_key === idempotencyKey &&
    attachment.upload_status === "completed" && !attachment.reporter_message_id;
}

export function followUpNextStatus(status: string, resolvedFollowUpType?: "general" | "not_fixed"): string {
  if (status === "needs_info") return "open";
  if (status === "resolved" && resolvedFollowUpType === "not_fixed") return "reopened";
  return status;
}

export function resolutionConfirmationPatch(choice: "fixed" | "not_fixed", nowIso: string): Row {
  return choice === "fixed" ? {
    resolution_confirmation_status: "confirmed", resolution_confirmed_at: nowIso, last_reporter_activity_at: nowIso,
  } : {
    status: "reopened", resolution_confirmation_status: "not_fixed", reopened_at: nowIso,
    was_reopened: true, last_reporter_activity_at: nowIso,
  };
}
