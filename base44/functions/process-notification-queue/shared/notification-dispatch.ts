import { createEmailTrackingGrant, failurePatch, sanitizeDeliveryError, sendingLeaseExpired, templateEnabled, type Row } from "./notifications.ts";
import { renderNotification } from "./notification-templates.ts";
import { buildCanonicalUrl, buildOwnerIssueUrl, buildTrackingUrl, validateAppBaseUrl } from "./configuration.ts";

export interface EmailAdapter {
  send(input: { to: string; subject: string; body: string; from_name: string }): Promise<Row>;
}
export interface DispatchOptions {
  now?: Date;
  appBaseUrl: string;
  runtimeDeliveryEnabled: boolean;
  emailAdapter: EmailAdapter;
}

function terminal(status: unknown): boolean { return ["sent", "skipped", "dead_letter"].includes(String(status)); }

async function activity(sr: any, delivery: Row, eventType: string, metadata: Row, nowIso: string) {
  const label = eventType === "notification_sent" ? "Email sent" : eventType === "notification_failed" || eventType === "notification_dead_lettered" ? "Email failed" : eventType === "notification_skipped" && metadata.reason === "preference_disabled" ? "Reporter did not opt in" : "Email skipped";
  await sr.entities.ActivityEvent.create({
    project_id: delivery.project_id, owner_id: delivery.owner_id, issue_id: delivery.issue_id, submission_id: delivery.submission_id,
    event_type: eventType, actor_type: "system", actor_id: "system", internal_message: label, metadata, created_at: nowIso,
  });
}

async function skip(sr: any, delivery: Row, reason: string, nowIso: string): Promise<Row> {
  const updated = await sr.entities.NotificationDelivery.update(delivery.id, {
    status: "skipped", last_error_code: reason, last_error_message: undefined, lease_expires_at: undefined, updated_at: nowIso,
  });
  await activity(sr, delivery, "notification_skipped", { templateKey: delivery.template_key, reason }, nowIso);
  return updated;
}

export async function dispatchNotificationDelivery(sr: any, deliveryId: string, options: DispatchOptions): Promise<Row> {
  const now = options.now ?? new Date(); const nowIso = now.toISOString();
  let delivery = await sr.entities.NotificationDelivery.get(deliveryId);
  if (terminal(delivery.status)) return delivery;
  if (delivery.status === "sending" && !sendingLeaseExpired(delivery, now)) return delivery;
  if (delivery.next_attempt_at && Date.parse(delivery.next_attempt_at) > now.getTime()) return delivery;

  const project = await sr.entities.Project.get(delivery.project_id).catch(() => null);
  if (!project) return skip(sr, delivery, "project_missing", nowIso);
  const submission = delivery.submission_id ? await sr.entities.FeedbackSubmission.get(delivery.submission_id).catch(() => null) : null;
  if (!templateEnabled(project, delivery.template_key, submission)) return skip(sr, delivery, "preference_disabled", nowIso);
  if (project.notification_delivery_enabled !== true) return skip(sr, delivery, "delivery_disabled", nowIso);
  // This environment gate defaults off. It prevents local forwarded calls from
  // reaching the hosted integration even if a project switch is changed during development.
  if (!options.runtimeDeliveryEnabled) return skip(sr, delivery, "runtime_delivery_disabled", nowIso);

  const recipient = delivery.recipient_type === "owner"
    ? project.created_by ?? project.owner_id
    : submission?.reporter_email;
  if (!recipient) return skip(sr, delivery, "recipient_missing", nowIso);
  validateAppBaseUrl(options.appBaseUrl, true);

  const attempt = Number(delivery.attempt_count ?? 0) + 1;
  const leasePatch = { status: "sending", attempt_count: attempt, last_attempt_at: nowIso, sending_started_at: nowIso,
    lease_expires_at: new Date(now.getTime() + 3 * 60_000).toISOString(), updated_at: nowIso };
  const leaseFilter = delivery.status === "sending"
    ? { id: delivery.id, status: "sending", lease_expires_at: delivery.lease_expires_at }
    : { id: delivery.id, status: delivery.status };
  const locked = await sr.entities.NotificationDelivery.updateMany(leaseFilter, { $set: leasePatch });
  if (!locked.updated) return sr.entities.NotificationDelivery.get(delivery.id);
  delivery = await sr.entities.NotificationDelivery.get(delivery.id);

  let grant: Row | null = null;
  try {
    let trackingUrl: string | undefined;
    if (delivery.recipient_type === "reporter") {
      if (!submission) return skip(sr, delivery, "recipient_missing", nowIso);
      const created = await createEmailTrackingGrant(sr, delivery, submission, now);
      grant = created.grant;
      trackingUrl = buildTrackingUrl(created.rawToken);
    }
    const issue = delivery.issue_id ? await sr.entities.Issue.get(delivery.issue_id).catch(() => null) : null;
    const ownerUrl = delivery.recipient_type === "owner"
      ? delivery.template_key === "owner_daily_digest" ? buildCanonicalUrl("/app/overview") : issue ? buildOwnerIssueUrl(issue.id) : buildCanonicalUrl("/app/inbox")
      : undefined;
    const rendered = renderNotification({
      templateKey: delivery.template_key, payload: delivery.payload ?? {}, publicCode: issue?.public_code,
      trackingUrl, ownerUrl,
    });
    const provider = await options.emailAdapter.send({ to: recipient, subject: rendered.subject, body: rendered.html, from_name: "VensaOS" });
    // Provider acceptance and this update cannot be one atomic transaction. A
    // crash between them can cause a retry to send twice; external email is at-least-once.
    const sent = await sr.entities.NotificationDelivery.update(delivery.id, {
      status: "sent", sent_at: nowIso, provider_message_id: provider?.id ?? provider?.message_id,
      lease_expires_at: undefined, next_attempt_at: undefined, last_error_code: undefined, last_error_message: undefined, updated_at: nowIso,
    });
    await activity(sr, delivery, "notification_sent", { templateKey: delivery.template_key, attempt }, nowIso);
    return sent;
  } catch (error) {
    if (grant) await sr.entities.ReporterAccess.update(grant.id, { revoked_at: nowIso }).catch(() => undefined);
    const sanitized = sanitizeDeliveryError(error); const failed = failurePatch(attempt, now);
    const updated = await sr.entities.NotificationDelivery.update(delivery.id, {
      ...failed, last_error_code: sanitized.code, last_error_message: sanitized.message,
      lease_expires_at: undefined, updated_at: nowIso,
    });
    await activity(sr, delivery, failed.status === "dead_letter" ? "notification_dead_lettered" : "notification_failed", {
      templateKey: delivery.template_key, attempt, errorCode: sanitized.code,
    }, nowIso);
    return updated;
  }
}
