import { randomIssueCode } from "./crypto.ts";
import { computePriority, type Reproducibility, type Severity } from "./priority.ts";
import { normalizeTitle } from "./text.ts";
import { bestEffortEnqueue, criticalAlertReasons, notificationDedupeKey, safeExcerpt } from "./notifications.ts";
import { criticalPayload } from "./notification-reconciliation.ts";

// Base44's generated registry is available to the frontend build, while hosted
// functions expose dynamic entity collections. Keep this adapter localized.
type ServiceClient = any;
type Row = Record<string, any>;

const SEVERITY_ORDER: Severity[] = ["low", "medium", "high", "critical"];
const REPRO_ORDER: Reproducibility[] = ["unknown", "likely", "confirmed"];

function timestamp(row: Row): string {
  return row.created_at ?? row.created_date ?? new Date().toISOString();
}

export async function uniqueIssueCode(sr: ServiceClient, projectId: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomIssueCode();
    const clash = await sr.entities.Issue.filter({ project_id: projectId, public_code: code });
    if (clash.length === 0) return code;
  }
  throw new Error("Unable to allocate a unique issue code");
}

export async function createIssueForSubmission(
  sr: ServiceClient,
  submission: Row,
  ownerId: string,
  status: "unreviewed" | "open" = "unreviewed",
): Promise<Row> {
  const existingLinks = await sr.entities.IssueReport.filter({ submission_id: submission.id });
  if (existingLinks[0]) return sr.entities.Issue.get(existingLinks[0].issue_id);

  const seenAt = timestamp(submission);
  const issue = await sr.entities.Issue.create({
    project_id: submission.project_id,
    owner_id: ownerId,
    public_code: await uniqueIssueCode(sr, submission.project_id),
    title: submission.ai_summary ?? normalizeTitle(submission.description),
    description: submission.description,
    category: submission.ai_category ?? "other",
    product_area: submission.ai_product_area ?? "General",
    severity: submission.ai_severity ?? "medium",
    reproducibility: submission.ai_reproducibility ?? "unknown",
    core_workflow_blocked: submission.ai_core_workflow_blocked === true,
    priority_score: 0,
    priority_explanation: [],
    status,
    resolution_confirmation_status: "not_requested",
    report_count: 0,
    affected_user_count: 0,
    first_seen_at: seenAt,
    last_seen_at: seenAt,
  });
  await sr.entities.IssueReport.create({
    project_id: submission.project_id,
    owner_id: ownerId,
    issue_id: issue.id,
    submission_id: submission.id,
    grouping_method: "manual_initial",
    review_status: "accepted",
    similarity_score: 0,
    matching_reasons: [],
    conflicting_evidence: [],
    threshold_version: "duplicate-thresholds-v1",
    created_at: new Date().toISOString(),
  });
  return recalculateIssue(sr, issue.id);
}

export async function recalculateIssue(sr: ServiceClient, issueId: string, options: { reopened?: boolean } = {}): Promise<Row> {
  const issue = await sr.entities.Issue.get(issueId);
  const links = (await sr.entities.IssueReport.filter({ issue_id: issueId })).filter((row: Row) => row.review_status === "accepted");
  const submissions = await Promise.all(links.map((link: Row) => sr.entities.FeedbackSubmission.get(link.submission_id)));
  if (submissions.length === 0) {
    return sr.entities.Issue.update(issueId, { report_count: 0, affected_user_count: 0, priority_score: 0, priority_explanation: [] });
  }

  const severity = submissions.reduce((current: Severity, row: Row) => {
    const next = (row.ai_severity ?? issue.severity ?? "medium") as Severity;
    return SEVERITY_ORDER.indexOf(next) > SEVERITY_ORDER.indexOf(current) ? next : current;
  }, "low");
  const reproducibility = submissions.reduce((current: Reproducibility, row: Row) => {
    const next = (row.ai_reproducibility ?? "unknown") as Reproducibility;
    return REPRO_ORDER.indexOf(next) > REPRO_ORDER.indexOf(current) ? next : current;
  }, "unknown");
  const timestamps = submissions.map(timestamp).sort();
  const lastSeenAt = timestamps[timestamps.length - 1];
  const result = computePriority({
    severity,
    reportCount: submissions.length,
    reproducibility,
    reportTimestamps: timestamps,
    lastSeenAt,
    coreWorkflowBlocked: submissions.some((row: Row) => row.ai_core_workflow_blocked === true),
    reopened: issue.was_reopened === true || issue.status === "reopened",
  });
  const affected = new Set(submissions.map((row: Row) => row.reporter_email_hash || `anonymous:${row.id}`)).size;
  let updated = await sr.entities.Issue.update(issueId, {
    severity,
    reproducibility,
    core_workflow_blocked: submissions.some((row: Row) => row.ai_core_workflow_blocked === true),
    priority_score: result.score,
    priority_explanation: result.explanation,
    report_count: submissions.length,
    affected_user_count: affected,
    first_seen_at: timestamps[0],
    last_seen_at: lastSeenAt,
  });
  if ((issue.priority_score ?? 0) !== result.score) {
    await sr.entities.ActivityEvent.create({
      project_id: issue.project_id, owner_id: issue.owner_id, issue_id: issue.id,
      event_type: "priority_changed", actor_type: "system", actor_id: "system",
      internal_message: `Priority recalculated from ${issue.priority_score ?? 0} to ${result.score}.`,
      metadata: { previousScore: issue.priority_score ?? 0, score: result.score, explanation: result.explanation },
      created_at: new Date().toISOString(),
    });
  }
  const alertReasons = criticalAlertReasons(issue, updated, options.reopened === true);
  if (alertReasons.length) updated = await recordCriticalAlert(sr, updated, alertReasons.join("; "));
  return updated;
}

export async function recordCriticalAlert(sr: ServiceClient, issue: Row, reason: string): Promise<Row> {
  const nowIso = new Date().toISOString(); const version = Number(issue.critical_alert_version ?? 0) + 1;
  const updated = await sr.entities.Issue.update(issue.id, { critical_alert_version: version, last_critical_alert_at: nowIso });
  const event = await sr.entities.ActivityEvent.create({
    project_id: issue.project_id, owner_id: issue.owner_id, issue_id: issue.id, event_type: "issue_critical_alert",
    actor_type: "system", actor_id: "system", internal_message: "A critical owner alert condition was detected.",
    metadata: { criticalAlertVersion: version, reason: safeExcerpt(reason, 300) }, created_at: nowIso,
  });
  const project = await sr.entities.Project.get(issue.project_id).catch(() => null);
  if (project) await bestEffortEnqueue(sr, {
    project, issue: updated, templateKey: "owner_critical_issue", recipientType: "owner",
    dedupeKey: notificationDedupeKey("critical", [issue.id, String(version)]), activityEventId: event.id,
    payload: criticalPayload(project, updated, reason),
  });
  return updated;
}

export async function moveSubmission(
  sr: ServiceClient,
  submissionId: string,
  targetIssueId: string,
  ownerId: string,
  groupingMethod: "automatic" | "manual",
  evidence?: { confidence?: number; matchingReasons?: string[]; conflictingEvidence?: string[] },
): Promise<string[]> {
  const existing = await sr.entities.IssueReport.filter({ submission_id: submissionId });
  const impacted = new Set<string>();
  for (const link of existing) {
    impacted.add(link.issue_id);
    if (link.issue_id === targetIssueId) {
      await sr.entities.IssueReport.update(link.id, {
        review_status: "accepted", grouping_method: groupingMethod,
        similarity_score: evidence?.confidence, matching_reasons: evidence?.matchingReasons ?? [],
        conflicting_evidence: evidence?.conflictingEvidence ?? [], threshold_version: "duplicate-thresholds-v1",
      });
    } else {
      await sr.entities.IssueReport.delete(link.id);
    }
  }
  if (!existing.some((link: Row) => link.issue_id === targetIssueId)) {
    const target = await sr.entities.Issue.get(targetIssueId);
    await sr.entities.IssueReport.create({
      project_id: target.project_id, owner_id: ownerId, issue_id: targetIssueId, submission_id: submissionId,
      grouping_method: groupingMethod, review_status: "accepted", similarity_score: evidence?.confidence,
      matching_reasons: evidence?.matchingReasons ?? [], conflicting_evidence: evidence?.conflictingEvidence ?? [],
      threshold_version: "duplicate-thresholds-v1", created_at: new Date().toISOString(),
    });
  }
  impacted.add(targetIssueId);
  for (const id of impacted) await recalculateIssue(sr, id);
  return [...impacted];
}
