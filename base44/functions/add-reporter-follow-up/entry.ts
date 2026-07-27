import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { MAX_ATTACHMENTS } from "../../shared/attachment-security.ts";
import { isIssueStatus, transitionTimestamps } from "../../shared/issue-state-machine.ts";
import { recalculateIssue } from "../../shared/issue-operations.ts";
import { findIdempotentMessage, followUpAttachmentBelongsToReporter, followUpNextStatus, loadTrackingContext, TrackingAccessError } from "../../shared/reporter-workflow.ts";
import { buildTrackingProjection } from "../../shared/tracking-projection.ts";
import { error, errorMessage, json } from "../../shared/response.ts";
import { bestEffortEnqueue, notificationDedupeKey, safeExcerpt } from "../../shared/notifications.ts";

const schema = z.object({
  token: z.string().min(1), idempotencyKey: z.string().uuid(), body: z.string().trim().min(1).max(5000),
  resolvedFollowUpType: z.enum(["general", "not_fixed"]).optional(),
  attachmentIds: z.array(z.string().min(1)).max(MAX_ATTACHMENTS).default([]),
});

Deno.serve(async (req) => {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid follow-up", 400);
    const base44 = createClientFromRequest(req); const sr = base44.asServiceRole;
    const { submission, issue } = await loadTrackingContext(sr, parsed.data.token);
    if (issue.status === "resolved" && !parsed.data.resolvedFollowUpType) return error("Choose whether this is a general follow-up or the fix did not work", 400);

    const prior = findIdempotentMessage(await sr.entities.ReporterMessage.filter({ idempotency_key: parsed.data.idempotencyKey }), submission.id, parsed.data.idempotencyKey);
    if (prior) return json({ success: true, duplicate: true, tracking: await buildTrackingProjection(sr, submission, await sr.entities.Issue.get(issue.id)) });

    const uniqueIds = [...new Set(parsed.data.attachmentIds)];
    if (uniqueIds.length !== parsed.data.attachmentIds.length) return error("Duplicate attachment association", 400);
    const attachments = await Promise.all(uniqueIds.map((id) => sr.entities.FeedbackAttachment.get(id).catch(() => null)));
    if (attachments.some((item) => !followUpAttachmentBelongsToReporter(item, submission.id, parsed.data.idempotencyKey))) {
      return error("Invalid attachment association", 400);
    }

    const nowIso = new Date().toISOString();
    const rejectingFix = issue.status === "resolved" && parsed.data.resolvedFollowUpType === "not_fixed";
    const message = await sr.entities.ReporterMessage.create({
      project_id: issue.project_id, owner_id: issue.owner_id, submission_id: submission.id, issue_id: issue.id,
      sender_type: "reporter", sender_user_id: "reporter", message_type: rejectingFix ? "reopen_explanation" : "reporter_follow_up",
      body: parsed.data.body, visibility: "public", is_read_by_owner: false, is_read_by_reporter: true,
      idempotency_key: parsed.data.idempotencyKey, created_at: nowIso,
    });
    await Promise.all(attachments.filter(Boolean).map((item) => sr.entities.FeedbackAttachment.update(item.id, { reporter_message_id: message.id, attachment_purpose: "reporter_follow_up" })));

    const nextStatus = followUpNextStatus(issue.status, parsed.data.resolvedFollowUpType);
    const issuePatch: Record<string, unknown> = { last_reporter_activity_at: nowIso };
    if (nextStatus !== issue.status && isIssueStatus(issue.status) && isIssueStatus(nextStatus)) Object.assign(issuePatch, transitionTimestamps(issue.status, nextStatus, nowIso, issue));
    if (rejectingFix) Object.assign(issuePatch, { resolution_confirmation_status: "not_fixed", was_reopened: true });
    await sr.entities.Issue.update(issue.id, issuePatch);
    const followUpEvent = await sr.entities.ActivityEvent.create({
      project_id: issue.project_id, owner_id: issue.owner_id, issue_id: issue.id, submission_id: submission.id,
      event_type: "reporter_follow_up", actor_type: "reporter", actor_id: "reporter",
      public_message: rejectingFix ? "The reporter said the fix did not work." : "The reporter added a follow-up.",
      metadata: { statusChanged: nextStatus !== issue.status, toStatus: nextStatus }, created_at: nowIso,
    });
    if (nextStatus !== issue.status) await sr.entities.ActivityEvent.create({
      project_id: issue.project_id, owner_id: issue.owner_id, issue_id: issue.id, submission_id: submission.id,
      event_type: rejectingFix ? "issue_reopened" : "issue_status_changed", actor_type: "system", actor_id: "system",
      public_message: rejectingFix ? "The issue was reopened." : "The issue is open for review.", metadata: { fromStatus: issue.status, toStatus: nextStatus }, created_at: nowIso,
    });
    const project = await sr.entities.Project.get(issue.project_id).catch(() => null);
    if (project) await bestEffortEnqueue(sr, {
      project, issue, templateKey: "owner_reporter_reply", recipientType: "owner",
      dedupeKey: notificationDedupeKey("reporter_reply", [message.id, issue.owner_id]),
      activityEventId: followUpEvent.id, reporterMessageId: message.id,
      payload: { productName: project.name, issueTitle: issue.title, status: nextStatus, message: safeExcerpt(parsed.data.body) },
    });
    if (rejectingFix) await recalculateIssue(sr, issue.id, { reopened: true });
    return json({ success: true, duplicate: false, tracking: await buildTrackingProjection(sr, submission, await sr.entities.Issue.get(issue.id)) });
  } catch (err) {
    if (err instanceof TrackingAccessError) return error(err.message, err.status);
    return error(errorMessage(err), 500);
  }
});
