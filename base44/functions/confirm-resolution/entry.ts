import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { resolveBackendConfiguration } from "../../shared/configuration.ts";
import { recalculateIssue } from "../../shared/issue-operations.ts";
import { bestEffortEnqueueAndDispatch } from "../../shared/notification-dispatch.ts";
import { notificationDedupeKey, safeExcerpt } from "../../shared/notifications.ts";
import { findIdempotentMessage, loadTrackingContext, resolutionConfirmationPatch, TrackingAccessError } from "../../shared/reporter-workflow.ts";
import { buildTrackingProjection } from "../../shared/tracking-projection.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

const schema = z.object({ token: z.string().min(1), idempotencyKey: z.string().uuid(), choice: z.enum(["fixed", "not_fixed"]), explanation: z.string().trim().max(5000).optional() });

Deno.serve(async (req) => {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid confirmation", 400);
    if (parsed.data.choice === "not_fixed" && !parsed.data.explanation) return error("An explanation is required when the fix did not work", 400);
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const config = resolveBackendConfiguration({
      appBaseUrl: Deno.env.get("APP_BASE_URL"),
      notificationIntegrationEnabled: Deno.env.get("NOTIFICATION_INTEGRATION_ENABLED"),
      requestUrl: req.url,
    });
    const dispatchGate = {
      appBaseUrl: config.appBaseUrl,
      runtimeDeliveryEnabled: config.notificationIntegrationEnabled,
      emailAdapter: { send: (emailInput: { to: string; subject: string; body: string; from_name: string }) => base44.integrations.Core.SendEmail(emailInput) },
    };
    const { submission, issue } = await loadTrackingContext(sr, parsed.data.token);
    const prior = findIdempotentMessage(await sr.entities.ReporterMessage.filter({ idempotency_key: parsed.data.idempotencyKey }), submission.id, parsed.data.idempotencyKey);
    if (prior) return json({ success: true, duplicate: true, tracking: await buildTrackingProjection(sr, submission, await sr.entities.Issue.get(issue.id)) });
    if (issue.status !== "resolved" || issue.resolution_confirmation_status !== "pending") return error("This resolution is not awaiting confirmation", 409);

    const nowIso = new Date().toISOString(); const fixed = parsed.data.choice === "fixed";
    const body = fixed ? "I confirm this is fixed." : parsed.data.explanation!;
    const message = await sr.entities.ReporterMessage.create({
      project_id: issue.project_id, owner_id: issue.owner_id, submission_id: submission.id, issue_id: issue.id,
      sender_type: "reporter", sender_user_id: "reporter", message_type: fixed ? "resolution_confirmation" : "reopen_explanation",
      body, visibility: "public", is_read_by_owner: false, is_read_by_reporter: true,
      idempotency_key: parsed.data.idempotencyKey, created_at: nowIso,
    });
    await sr.entities.Issue.update(issue.id, resolutionConfirmationPatch(parsed.data.choice, nowIso));
    const confirmationEvent = await sr.entities.ActivityEvent.create({
      project_id: issue.project_id, owner_id: issue.owner_id, issue_id: issue.id, submission_id: submission.id,
      event_type: fixed ? "resolution_confirmed" : "resolution_rejected", actor_type: "reporter", actor_id: "reporter",
      public_message: fixed ? "The reporter confirmed the fix." : "The reporter said the fix did not work.", created_at: nowIso,
    });
    if (!fixed) {
      await sr.entities.ActivityEvent.create({ project_id: issue.project_id, owner_id: issue.owner_id, issue_id: issue.id, submission_id: submission.id, event_type: "issue_reopened", actor_type: "system", actor_id: "system", public_message: "The issue was reopened.", metadata: { fromStatus: "resolved", toStatus: "reopened" }, created_at: nowIso });
      await recalculateIssue(sr, issue.id, { reopened: true, dispatchGate });
    }
    const project = await sr.entities.Project.get(issue.project_id).catch(() => null);
    if (project) await bestEffortEnqueueAndDispatch(sr, {
      project, issue, templateKey: "owner_reporter_reply", recipientType: "owner",
      dedupeKey: notificationDedupeKey("reporter_reply", [message.id, issue.owner_id]),
      activityEventId: confirmationEvent.id, reporterMessageId: message.id,
      payload: { productName: project.name, issueTitle: issue.title, status: fixed ? "resolved" : "reopened", message: safeExcerpt(body) },
    }, dispatchGate);
    return json({ success: true, duplicate: false, tracking: await buildTrackingProjection(sr, submission, await sr.entities.Issue.get(issue.id)) });
  } catch (err) {
    if (err instanceof TrackingAccessError) return error(err.message, err.status);
    return error(errorMessage(err), 500);
  }
});
