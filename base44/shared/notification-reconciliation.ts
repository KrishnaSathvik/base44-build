import { bestEffortEnqueue, notificationDedupeKey, safeExcerpt, type NotificationTemplate, type Row } from "./notifications.ts";

function createdAt(row: Row): number { return Date.parse(row.created_at ?? row.created_date ?? "") || 0; }

export async function reconcileDuplicateDeliveries(sr: any, now = new Date(), limit = 500): Promise<{ groups: number; skipped: number }> {
  const deliveries = await sr.entities.NotificationDelivery.list("created_at", limit);
  const groups = new Map<string, Row[]>();
  for (const delivery of deliveries) {
    if (!delivery.project_id || !delivery.dedupe_key) continue;
    const key = `${delivery.project_id}\u0000${delivery.dedupe_key}`;
    groups.set(key, [...(groups.get(key) ?? []), delivery]);
  }
  let duplicateGroups = 0; let skipped = 0;
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const sent = rows.filter(row => row.status === "sent").sort((a, b) => createdAt(a) - createdAt(b));
    const unsent = rows.filter(row => row.status !== "sent" && row.status !== "skipped");
    if (unsent.length < 2 && sent.length === 0) continue;
    const canonical = sent[0] ?? [...unsent].sort((a, b) => createdAt(a) - createdAt(b))[0];
    if (!canonical) continue;
    const redundant = rows.filter(row => row.id !== canonical.id && row.status !== "sent" && row.status !== "skipped");
    if (!redundant.length) continue;
    duplicateGroups += 1;
    for (const row of redundant) {
      await sr.entities.NotificationDelivery.update(row.id, { status: "skipped", last_error_code: "duplicate_delivery", last_error_message: "Redundant delivery suppressed by reconciliation.", updated_at: now.toISOString() });
      skipped += 1;
    }
    await sr.entities.ActivityEvent.create({
      project_id: canonical.project_id, owner_id: canonical.owner_id, issue_id: canonical.issue_id,
      event_type: "notification_duplicates_reconciled", actor_type: "system", actor_id: "system",
      internal_message: "Redundant notification deliveries were suppressed.",
      metadata: { canonicalDeliveryId: canonical.id, skippedCount: redundant.length }, created_at: now.toISOString(),
    });
  }
  return { groups: duplicateGroups, skipped };
}

export async function reconcileRecentNotifications(sr: any, now = new Date(), limit = 100): Promise<number> {
  const recentAfter = now.getTime() - 48 * 60 * 60_000;
  const events = (await sr.entities.ActivityEvent.list("-created_at", limit)).filter((event: Row) => createdAt(event) >= recentAfter);
  let created = 0;
  for (const event of events) {
    const project = await sr.entities.Project.get(event.project_id).catch(() => null);
    const issue = event.issue_id ? await sr.entities.Issue.get(event.issue_id).catch(() => null) : null;
    if (!project) continue;
    if (event.event_type === "issue_critical_alert" && issue) {
      const result = await bestEffortEnqueue(sr, {
        project, issue, templateKey: "owner_critical_issue", recipientType: "owner",
        dedupeKey: notificationDedupeKey("critical", [issue.id, String(event.metadata?.criticalAlertVersion ?? issue.critical_alert_version ?? 0)]),
        activityEventId: event.id, payload: criticalPayload(project, issue, event.metadata?.reason),
      });
      if (result?.created_at === result?.updated_at) created += 1;
      continue;
    }
    if (event.event_type === "reporter_follow_up" && event.submission_id && issue) {
      const messages = await sr.entities.ReporterMessage.filter({ submission_id: event.submission_id, issue_id: issue.id });
      const message = messages.filter((row: Row) => row.sender_type === "reporter").sort((a: Row, b: Row) => createdAt(b) - createdAt(a))[0];
      if (!message) continue;
      const result = await bestEffortEnqueue(sr, {
        project, issue, templateKey: "owner_reporter_reply", recipientType: "owner",
        dedupeKey: notificationDedupeKey("reporter_reply", [message.id, project.created_by ?? project.owner_id]),
        reporterMessageId: message.id, activityEventId: event.id,
        payload: { productName: project.name, issueTitle: issue.title, status: issue.status, message: safeExcerpt(message.body) },
      });
      if (result?.created_at === result?.updated_at) created += 1;
      continue;
    }
    const template = reporterTemplate(event);
    if (!template || !issue) continue;
    const links = (await sr.entities.IssueReport.filter({ issue_id: issue.id })).filter((row: Row) => row.review_status !== "rejected");
    for (const link of links.slice(0, 100)) {
      const submission = await sr.entities.FeedbackSubmission.get(link.submission_id).catch(() => null);
      if (!submission) continue;
      const result = await bestEffortEnqueue(sr, {
        project, issue, submission, templateKey: template, recipientType: "reporter",
        dedupeKey: notificationDedupeKey("reporter_status", [event.id, submission.id]), activityEventId: event.id,
        payload: { productName: project.name, issueTitle: issue.title, status: issue.status, message: safeExcerpt(event.public_message ?? issue.public_resolution_note) },
      });
      if (result?.created_at === result?.updated_at) created += 1;
    }
  }
  return created;
}

function reporterTemplate(event: Row): NotificationTemplate | null {
  if (event.actor_type !== "owner") return null;
  if (event.event_type === "information_requested") return "reporter_information_requested";
  if (event.event_type === "issue_resolved") return "reporter_issue_resolved";
  if (event.event_type === "issue_reopened") return "reporter_issue_reopened";
  if (["public_update_added", "issue_status_changed", "work_started", "testing_started"].includes(event.event_type) && event.public_message) return "reporter_status_update";
  return null;
}

export function criticalPayload(project: Row, issue: Row, reason: unknown): Row {
  return {
    productName: project.name, issueTitle: issue.title, severity: issue.severity, priorityScore: issue.priority_score,
    priorityExplanation: issue.priority_explanation ?? [], reportCount: issue.report_count ?? 0,
    affectedUserCount: issue.affected_user_count ?? 0, alertReason: safeExcerpt(reason, 300),
  };
}
