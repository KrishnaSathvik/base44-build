import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { assertTransition, isIssueStatus, transitionEventType, transitionRequirementError, transitionTimestamps } from "../../shared/issue-state-machine.ts";
import { recalculateIssue } from "../../shared/issue-operations.ts";
import { bestEffortEnqueue, notificationDedupeKey, reporterEmailEligible, safeExcerpt, type NotificationTemplate } from "../../shared/notifications.ts";
import { ownerOwnsProject, validateDuplicateTarget } from "../../shared/reporter-workflow.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

type Row = Record<string, any>;
const payloadSchema = z.object({
  issueId: z.string().min(1),
  status: z.string().min(1),
  publicMessage: z.string().trim().min(1).max(4000).optional(),
  internalNote: z.string().trim().min(1).max(4000).optional(),
  reason: z.string().trim().min(1).max(2000).optional(),
  directResolutionOverrideReason: z.string().trim().min(1).max(2000).optional(),
  duplicateOfIssueId: z.string().min(1).optional(),
  assigneeId: z.string().max(320).optional(),
});

async function ownerEmail(base44: any): Promise<string | null> {
  try { return (await base44.auth.me())?.email ?? null; } catch { return null; }
}

async function createMessageForSubmissions(sr: any, issue: Row, owner: string, body: string, messageType: string, visibility: "public" | "internal", nowIso: string): Promise<Row[]> {
  const links = (await sr.entities.IssueReport.filter({ issue_id: issue.id })).filter((row: Row) => row.review_status !== "rejected");
  const targets = visibility === "public" ? links : links.slice(0, 1);
  const messages: Row[] = [];
  for (const link of targets) messages.push(await sr.entities.ReporterMessage.create({
    project_id: issue.project_id, owner_id: owner, submission_id: link.submission_id, issue_id: issue.id,
    sender_type: "owner", sender_user_id: owner, message_type: messageType, body, visibility,
    is_read_by_owner: true, is_read_by_reporter: false, created_at: nowIso,
  }));
  return messages;
}

function reporterTemplate(status: string): NotificationTemplate | null {
  if (status === "needs_info") return "reporter_information_requested";
  if (status === "resolved") return "reporter_issue_resolved";
  if (status === "reopened") return "reporter_issue_reopened";
  if (["planned", "in_progress", "testing"].includes(status)) return "reporter_status_update";
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const owner = await ownerEmail(base44);
    if (!owner) return error("Authentication required", 401);
    const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid issue update", 400);
    const input = parsed.data;
    if (!isIssueStatus(input.status)) return error("Invalid issue update", 400);
    const targetStatus = input.status;
    const sr = base44.asServiceRole;
    const issue = await sr.entities.Issue.get(input.issueId).catch(() => null);
    if (!issue) return error("Issue not found", 404);
    const project = await sr.entities.Project.get(issue.project_id).catch(() => null);
    if (!ownerOwnsProject(owner, project)) return error("You do not have access to this issue", 403);

    const noteOnly = issue.status === targetStatus && !!(input.publicMessage || input.internalNote);
    if (!noteOnly) {
      try { assertTransition(issue.status, targetStatus, { directResolutionOverrideReason: input.directResolutionOverrideReason }); }
      catch (transitionError) { return error(errorMessage(transitionError), 409); }
    } else if (!isIssueStatus(issue.status)) return error("Unsupported issue status", 409);

    const requirementError = transitionRequirementError(targetStatus, input);
    if (!noteOnly && requirementError) return error(requirementError, 400);

    let duplicateTarget: Row | null = null;
    if (targetStatus === "duplicate") {
      if (!input.duplicateOfIssueId) return error("A canonical issue is required", 400);
      duplicateTarget = await sr.entities.Issue.get(input.duplicateOfIssueId).catch(() => null);
      const duplicateError = validateDuplicateTarget(issue, duplicateTarget);
      if (duplicateError) return error(duplicateError, 400);
    }

    const nowIso = new Date().toISOString();
    let updated = issue;
    let sourceEvent: Row | null = null;
    if (!noteOnly) {
      const patch = transitionTimestamps(issue.status, targetStatus, nowIso, issue);
      Object.assign(patch, {
        status_reason: input.reason ?? input.directResolutionOverrideReason,
        last_owner_activity_at: nowIso,
        assignee_id: input.assigneeId ?? issue.assignee_id,
      });
      if (targetStatus === "resolved") patch.public_resolution_note = input.publicMessage;
      if (targetStatus === "duplicate") patch.duplicate_of_issue_id = duplicateTarget!.id;
      updated = await sr.entities.Issue.update(issue.id, patch);
      sourceEvent = await sr.entities.ActivityEvent.create({
        project_id: issue.project_id, owner_id: owner, issue_id: issue.id,
        event_type: transitionEventType(issue.status, targetStatus), actor_type: "owner", actor_id: owner,
        public_message: targetStatus === "resolved" ? input.publicMessage : undefined,
        internal_message: `Status changed from ${issue.status} to ${targetStatus}.`,
        metadata: { fromStatus: issue.status, toStatus: targetStatus, canonicalPublicCode: duplicateTarget?.public_code }, created_at: nowIso,
      });
      if (["resolved", "reopened"].includes(targetStatus)) updated = await recalculateIssue(sr, issue.id, { reopened: targetStatus === "reopened" });
    }

    if (input.publicMessage) {
      const messageType = targetStatus === "needs_info" ? "request_information" : targetStatus === "resolved" ? "resolution_note" : "public_update";
      const messages = await createMessageForSubmissions(sr, issue, owner, input.publicMessage, messageType, "public", nowIso);
      if (!noteOnly && ["needs_info", "resolved"].includes(targetStatus)) {
        // The transition event already represents this deliberate public message.
      } else sourceEvent = await sr.entities.ActivityEvent.create({ project_id: issue.project_id, owner_id: owner, issue_id: issue.id, event_type: "public_update_added", actor_type: "owner", actor_id: owner, public_message: input.publicMessage, created_at: nowIso });
      const template = reporterTemplate(targetStatus);
      if (template && sourceEvent) for (const message of messages) {
        const submission = await sr.entities.FeedbackSubmission.get(message.submission_id).catch(() => null);
        if (submission) {
          const delivery = await bestEffortEnqueue(sr, {
          project, issue: updated, submission, templateKey: template, recipientType: "reporter",
          dedupeKey: notificationDedupeKey("reporter_status", [sourceEvent.id, submission.id]),
          activityEventId: sourceEvent.id, reporterMessageId: message.id,
          payload: { productName: project.name, issueTitle: updated.title, status: updated.status, message: safeExcerpt(input.publicMessage) },
          });
          if (!delivery && !reporterEmailEligible(project, submission)) await sr.entities.ActivityEvent.create({
            project_id: issue.project_id, owner_id: owner, issue_id: issue.id, submission_id: submission.id,
            event_type: "notification_skipped", actor_type: "system", actor_id: "system",
            internal_message: "Reporter did not opt in", metadata: { templateKey: template, reason: "reporter_consent_missing" }, created_at: nowIso,
          });
        }
      }
    }
    if (input.internalNote) {
      await createMessageForSubmissions(sr, issue, owner, input.internalNote, "public_update", "internal", nowIso);
      await sr.entities.ActivityEvent.create({ project_id: issue.project_id, owner_id: owner, issue_id: issue.id, event_type: "internal_note_added", actor_type: "owner", actor_id: owner, internal_message: "Internal note added.", created_at: nowIso });
    }
    return json({ success: true, issue: updated });
  } catch (err) { return error(errorMessage(err), 500); }
});
