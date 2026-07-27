import { resolveBackendConfiguration } from "./configuration.ts";
import { dispatchNotificationDelivery, type DispatchOptions, type EmailAdapter } from "./notification-dispatch.ts";
import { reconcileDuplicateDeliveries, reconcileRecentNotifications } from "./notification-reconciliation.ts";
import {
  bestEffortEnqueue,
  digestIsDue,
  digestShouldQueue,
  localDateRangeUtc,
  notificationDedupeKey,
  sendingLeaseExpired,
  type Row,
} from "./notifications.ts";
import { identifyOrphanAttachments } from "./orphan-attachments.ts";
import { ownerOwnsProject } from "./reporter-workflow.ts";

export const MAINTENANCE_BATCH_SIZE = 20;
export const MAINTENANCE_PROJECT_BATCH_SIZE = 25;
export const MAINTENANCE_MIN_INTERVAL_MS = 5 * 60_000;
export const MAINTENANCE_LEASE_MS = 3 * 60_000;
export const MAINTENANCE_RECONCILE_LIMIT = 100;
export const MAINTENANCE_DUPLICATE_LIMIT = 500;

export type MaintenanceStatus =
  | "ran"
  | "already_running"
  | "recently_run"
  | "unauthorized"
  | "no_project";

export interface MaintenanceSummary {
  status: MaintenanceStatus;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  deadLettered: number;
  reconciled: number;
  duplicateReconciliation: { groups: number; skipped: number } | number;
  digestsQueued: number;
  digestsSkippedEmpty: number;
  digestsDuplicate: number;
  projectsChecked: number;
  orphanAttachments: number;
  lastAttemptAt?: string | null;
  lastSuccessAt?: string | null;
  leaseExpiresAt?: string | null;
  emailDeliveryDisabled: boolean;
}

function emptySummary(partial: Partial<MaintenanceSummary> & Pick<MaintenanceSummary, "status">): MaintenanceSummary {
  return {
    processed: 0, sent: 0, failed: 0, skipped: 0, deadLettered: 0, reconciled: 0,
    duplicateReconciliation: 0, digestsQueued: 0, digestsSkippedEmpty: 0, digestsDuplicate: 0,
    projectsChecked: 0, orphanAttachments: 0, emailDeliveryDisabled: true, ...partial,
  };
}

export function sanitizeMaintenanceSummary(summary: MaintenanceSummary): MaintenanceSummary {
  return {
    status: summary.status,
    processed: summary.processed,
    sent: summary.sent,
    failed: summary.failed,
    skipped: summary.skipped,
    deadLettered: summary.deadLettered,
    reconciled: summary.reconciled,
    duplicateReconciliation: summary.duplicateReconciliation,
    digestsQueued: summary.digestsQueued,
    digestsSkippedEmpty: summary.digestsSkippedEmpty,
    digestsDuplicate: summary.digestsDuplicate,
    projectsChecked: summary.projectsChecked,
    orphanAttachments: summary.orphanAttachments,
    lastAttemptAt: summary.lastAttemptAt ?? null,
    lastSuccessAt: summary.lastSuccessAt ?? null,
    leaseExpiresAt: summary.leaseExpiresAt ?? null,
    emailDeliveryDisabled: summary.emailDeliveryDisabled,
  };
}

export async function acquireMaintenanceLease(
  sr: any,
  project: Row,
  now = new Date(),
  options: { bypassThrottle?: boolean; leaseHolder?: string } = {},
): Promise<{ acquired: boolean; reason?: "already_running" | "recently_run"; project: Row }> {
  const nowMs = now.getTime();
  const leaseExpires = project.maintenance_lease_expires_at ? Date.parse(project.maintenance_lease_expires_at) : 0;
  if (leaseExpires > nowMs) return { acquired: false, reason: "already_running", project };

  const lastAttempt = project.maintenance_last_attempt_at ? Date.parse(project.maintenance_last_attempt_at) : 0;
  if (!options.bypassThrottle && lastAttempt && nowMs - lastAttempt < MAINTENANCE_MIN_INTERVAL_MS) {
    return { acquired: false, reason: "recently_run", project };
  }

  const leaseHolder = options.leaseHolder ?? `maintenance:${crypto.randomUUID()}`;
  const leaseExpiresAt = new Date(nowMs + MAINTENANCE_LEASE_MS).toISOString();
  const attemptAt = now.toISOString();
  const filter = project.maintenance_lease_expires_at
    ? { id: project.id, maintenance_lease_expires_at: project.maintenance_lease_expires_at }
    : { id: project.id };
  const locked = await sr.entities.Project.updateMany(filter, {
    $set: {
      maintenance_lease_holder: leaseHolder,
      maintenance_lease_expires_at: leaseExpiresAt,
      maintenance_last_attempt_at: attemptAt,
    },
  });
  if (!locked.updated) {
    const fresh = await sr.entities.Project.get(project.id);
    const freshExpiry = fresh?.maintenance_lease_expires_at ? Date.parse(fresh.maintenance_lease_expires_at) : 0;
    return { acquired: false, reason: freshExpiry > nowMs ? "already_running" : "recently_run", project: fresh ?? project };
  }
  const updated = await sr.entities.Project.get(project.id);
  return { acquired: true, project: updated ?? { ...project, maintenance_lease_holder: leaseHolder, maintenance_lease_expires_at: leaseExpiresAt, maintenance_last_attempt_at: attemptAt } };
}

export async function releaseMaintenanceLease(sr: any, projectId: string, summary: MaintenanceSummary, now = new Date()) {
  const nowIso = now.toISOString();
  await sr.entities.Project.update(projectId, {
    maintenance_lease_holder: "",
    maintenance_lease_expires_at: nowIso,
    maintenance_last_success_at: summary.status === "ran" ? nowIso : undefined,
    maintenance_last_summary: sanitizeMaintenanceSummary(summary),
  });
}

const occurredSince = (row: Row, since: number) => (Date.parse(row.created_at ?? row.created_date ?? "") || 0) >= since;

export async function prepareDueDigests(sr: any, now = new Date(), projectBatchSize = MAINTENANCE_PROJECT_BATCH_SIZE) {
  const projects = await sr.entities.Project.list("last_digest_scan_at", projectBatchSize);
  let queued = 0, skippedEmpty = 0, duplicate = 0;
  for (const project of projects) {
    await sr.entities.Project.update(project.id, { last_digest_scan_at: now.toISOString() }).catch(() => undefined);
    if (project.daily_digest_enabled !== true) continue;
    const due = digestIsDue(project, now);
    if (!due.due || !due.localDate) continue;
    const range = localDateRangeUtc(due.localDate, project.digest_timezone ?? "UTC");
    const since = range.start.getTime();
    const until = range.end.getTime();
    const dedupeKey = notificationDedupeKey("digest", [project.id, due.localDate]);
    if ((await sr.entities.NotificationDelivery.filter({ project_id: project.id, dedupe_key: dedupeKey }))[0]) {
      duplicate += 1;
      continue;
    }
    const [submissions, issues, suggestions, messages] = await Promise.all([
      sr.entities.FeedbackSubmission.filter({ project_id: project.id }),
      sr.entities.Issue.filter({ project_id: project.id }),
      sr.entities.DuplicateSuggestion.filter({ project_id: project.id }),
      sr.entities.ReporterMessage.filter({ project_id: project.id }),
    ]);
    const inWindow = (row: Row) => occurredSince(row, since) && (Date.parse(row.created_at ?? row.created_date ?? "") || 0) < until;
    const newSubmissions = submissions.filter(inWindow);
    const newIssues = issues.filter(inWindow);
    const activeHigh = issues.filter((row: Row) => !["resolved", "dismissed", "duplicate"].includes(row.status) && ["critical", "high"].includes(row.severity));
    const pendingDuplicates = suggestions.filter((row: Row) => row.status === "pending");
    const failedProcessing = submissions.filter((row: Row) => row.processing_status === "failed");
    const unreadReplies = messages.filter((row: Row) => row.sender_type === "reporter" && row.is_read_by_owner !== true);
    const resolved = issues.filter((row: Row) => inWindow({ created_at: row.resolved_at }));
    const attentionCount = activeHigh.length + pendingDuplicates.length + failedProcessing.length + unreadReplies.length;
    if (!digestShouldQueue([attentionCount, newSubmissions.length, newIssues.length, resolved.length], project.daily_digest_include_empty === true)) {
      skippedEmpty += 1;
      await sr.entities.ActivityEvent.create({
        project_id: project.id, owner_id: project.created_by ?? project.owner_id, event_type: "digest_skipped_empty",
        actor_type: "system", actor_id: "system", metadata: { localDate: due.localDate }, created_at: now.toISOString(),
      });
      continue;
    }
    const topIssues = activeHigh.sort((a: Row, b: Row) => Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0)).slice(0, 5);
    const summary = `${newSubmissions.length} new submissions · ${newIssues.length} new issues · ${activeHigh.length} critical/high active · ${pendingDuplicates.length} duplicate suggestions · ${failedProcessing.length} processing failures · ${unreadReplies.length} unread replies · ${resolved.length} resolved`;
    const delivery = await bestEffortEnqueue(sr, {
      project, templateKey: "owner_daily_digest", recipientType: "owner", dedupeKey,
      payload: { productName: project.name, attentionCount, summary, topIssues: topIssues.map((issue: Row) => `${issue.public_code}: ${issue.title}`) },
    });
    if (delivery) queued += 1;
  }
  return { projectsChecked: projects.length, queued, skippedEmpty, duplicate };
}

export async function processNotificationBatch(
  sr: any,
  dispatchOptions: Omit<DispatchOptions, "emailAdapter"> & { emailAdapter: EmailAdapter },
  batchSize = MAINTENANCE_BATCH_SIZE,
) {
  const now = dispatchOptions.now ?? new Date();
  const reconciled = await reconcileRecentNotifications(sr, now, MAINTENANCE_RECONCILE_LIMIT);
  const duplicateReconciliation = await reconcileDuplicateDeliveries(sr, now, MAINTENANCE_DUPLICATE_LIMIT);
  const rows = await sr.entities.NotificationDelivery.list("created_at", 100);
  const eligible = rows.filter((row: Row) => {
    if (row.status === "pending") return !row.next_attempt_at || Date.parse(row.next_attempt_at) <= now.getTime();
    if (row.status === "failed") return !row.next_attempt_at || Date.parse(row.next_attempt_at) <= now.getTime();
    return sendingLeaseExpired(row, now);
  }).slice(0, batchSize);
  const counts = { processed: 0, sent: 0, failed: 0, skipped: 0, deadLettered: 0, reconciled, duplicateReconciliation };
  for (const row of eligible) {
    const result = await dispatchNotificationDelivery(sr, row.id, dispatchOptions);
    counts.processed += 1;
    if (result.status === "sent") counts.sent += 1;
    else if (result.status === "failed") counts.failed += 1;
    else if (result.status === "skipped") counts.skipped += 1;
    else if (result.status === "dead_letter") counts.deadLettered += 1;
  }
  return counts;
}

export async function countOrphanAttachments(sr: any, projectId: string, now = new Date()): Promise<number> {
  const [attachments, submissions] = await Promise.all([
    sr.entities.FeedbackAttachment.filter({ project_id: projectId }),
    sr.entities.FeedbackSubmission.filter({ project_id: projectId }),
  ]);
  return identifyOrphanAttachments(attachments, submissions, now).length;
}

export async function runFreeMaintenance(options: {
  sr: any;
  ownerEmail: string;
  projectId?: string;
  bypassThrottle?: boolean;
  emailAdapter: EmailAdapter;
  appBaseUrl?: string;
  notificationIntegrationEnabled?: string | boolean | null;
  requestUrl?: string;
  now?: Date;
}): Promise<MaintenanceSummary> {
  const now = options.now ?? new Date();
  const config = resolveBackendConfiguration({
    appBaseUrl: options.appBaseUrl ?? "https://vensaos.com",
    notificationIntegrationEnabled: options.notificationIntegrationEnabled == null
      ? undefined
      : String(options.notificationIntegrationEnabled),
    requestUrl: options.requestUrl ?? "https://vensaos.com",
  });

  if (options.projectId) {
    const project = await options.sr.entities.Project.get(options.projectId).catch(() => null);
    if (!project) return emptySummary({ status: "no_project", emailDeliveryDisabled: !config.notificationIntegrationEnabled });
    if (!ownerOwnsProject(options.ownerEmail, project)) {
      return emptySummary({ status: "unauthorized", emailDeliveryDisabled: !config.notificationIntegrationEnabled });
    }
  }

  const projects = options.projectId
    ? [await options.sr.entities.Project.get(options.projectId).catch(() => null)].filter(Boolean)
    : await options.sr.entities.Project.filter({ created_by: options.ownerEmail });
  const owned = projects.filter((project: Row) => ownerOwnsProject(options.ownerEmail, project));
  if (!owned.length) return emptySummary({ status: "no_project", emailDeliveryDisabled: !config.notificationIntegrationEnabled });

  const project = owned[0];
  const lease = await acquireMaintenanceLease(options.sr, project, now, { bypassThrottle: options.bypassThrottle });
  if (!lease.acquired) {
    const prior = lease.project.maintenance_last_summary && typeof lease.project.maintenance_last_summary === "object"
      ? lease.project.maintenance_last_summary as Partial<MaintenanceSummary>
      : {};
    return emptySummary({
      ...prior,
      status: lease.reason === "already_running" ? "already_running" : "recently_run",
      lastAttemptAt: lease.project.maintenance_last_attempt_at,
      lastSuccessAt: lease.project.maintenance_last_success_at,
      leaseExpiresAt: lease.project.maintenance_lease_expires_at,
      emailDeliveryDisabled: project.notification_delivery_enabled !== true || !config.notificationIntegrationEnabled,
    });
  }

  try {
    const queue = await processNotificationBatch(options.sr, {
      now,
      appBaseUrl: config.appBaseUrl,
      runtimeDeliveryEnabled: config.notificationIntegrationEnabled,
      emailAdapter: options.emailAdapter,
    });
    const digests = await prepareDueDigests(options.sr, now);
    const orphanAttachments = await countOrphanAttachments(options.sr, project.id, now);
    const summary = sanitizeMaintenanceSummary({
      status: "ran",
      processed: queue.processed,
      sent: queue.sent,
      failed: queue.failed,
      skipped: queue.skipped,
      deadLettered: queue.deadLettered,
      reconciled: queue.reconciled,
      duplicateReconciliation: queue.duplicateReconciliation,
      digestsQueued: digests.queued,
      digestsSkippedEmpty: digests.skippedEmpty,
      digestsDuplicate: digests.duplicate,
      projectsChecked: digests.projectsChecked,
      orphanAttachments,
      lastAttemptAt: lease.project.maintenance_last_attempt_at,
      lastSuccessAt: now.toISOString(),
      leaseExpiresAt: lease.project.maintenance_lease_expires_at,
      emailDeliveryDisabled: project.notification_delivery_enabled !== true || !config.notificationIntegrationEnabled,
    });
    await releaseMaintenanceLease(options.sr, project.id, summary, now);
    return summary;
  } catch (error) {
    const failed = emptySummary({
      status: "ran",
      failed: 1,
      lastAttemptAt: lease.project.maintenance_last_attempt_at,
      emailDeliveryDisabled: project.notification_delivery_enabled !== true || !config.notificationIntegrationEnabled,
    });
    await releaseMaintenanceLease(options.sr, project.id, failed, now).catch(() => undefined);
    throw error;
  }
}
