import { generateTrackingToken, sha256Hex } from "./crypto.ts";

export const NOTIFICATION_TEMPLATES = [
  "owner_critical_issue", "owner_reporter_reply", "reporter_information_requested",
  "reporter_status_update", "reporter_issue_resolved", "reporter_issue_reopened", "owner_daily_digest",
] as const;
export type NotificationTemplate = typeof NOTIFICATION_TEMPLATES[number];
export type RecipientType = "owner" | "reporter";
export type Row = Record<string, any>;

export interface EnqueueInput {
  project: Row;
  templateKey: NotificationTemplate;
  recipientType: RecipientType;
  dedupeKey: string;
  issue?: Row;
  submission?: Row;
  activityEventId?: string;
  reporterMessageId?: string;
  payload?: Row;
}

export function reporterEmailEligible(project: Row, submission?: Row | null): boolean {
  return project.reporter_status_emails_enabled !== false &&
    submission?.reporter_email_updates_enabled === true && !!submission?.reporter_email;
}

export function templateEnabled(project: Row, template: NotificationTemplate, submission?: Row | null): boolean {
  if (template === "owner_critical_issue") return project.critical_alerts_enabled !== false;
  if (template === "owner_reporter_reply") return project.owner_reply_alerts_enabled !== false;
  if (template === "owner_daily_digest") return project.daily_digest_enabled === true;
  return reporterEmailEligible(project, submission);
}

export function notificationDedupeKey(kind: "reporter_status" | "reporter_reply" | "critical" | "digest", values: string[]): string {
  return `${kind}:${values.join(":")}`;
}

export function safeExcerpt(value: unknown, max = 240): string {
  const text = typeof value === "string" ? value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email hidden]").replace(/\s+/g, " ").trim() : "";
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

export function safeNotificationPayload(value: Row = {}): Row {
  const forbidden = /(email|token|storage|uri|internal|provider)/i;
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => !forbidden.test(key) &&
    (["string", "number", "boolean"].includes(typeof item) || Array.isArray(item))).map(([key,item])=>[
      key, typeof item === "string" ? safeExcerpt(item, 2000) : Array.isArray(item) ? item.filter((entry)=>["string","number","boolean"].includes(typeof entry)).map((entry)=>typeof entry === "string"?safeExcerpt(entry,1000):entry) : item,
    ]));
}

export function isValidIanaTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; } catch { return false; }
}

export function validateDigestSettings(timezone: unknown, hour: unknown): string | null {
  if (typeof timezone !== "string" || !isValidIanaTimezone(timezone)) return "Choose a valid IANA timezone";
  if (!Number.isInteger(hour) || Number(hour) < 0 || Number(hour) > 23) return "Digest hour must be an integer from 0 through 23";
  return null;
}

export function localDateAndHour(date: Date, timezone: string): { localDate: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { localDate: `${value("year")}-${value("month")}-${value("day")}`, hour: Number(value("hour")) };
}

export function digestIsDue(project: Row, now = new Date()): { due: boolean; localDate: string | null } {
  const timezone = project.digest_timezone ?? "UTC";
  const hour = project.digest_hour_local ?? 9;
  if (project.daily_digest_enabled !== true || validateDigestSettings(timezone, hour)) return { due: false, localDate: null };
  const local = localDateAndHour(now, timezone);
  // A project remains due after its configured hour until the per-local-date
  // dedupe record exists. This lets bounded rotating batches catch up safely.
  return { due: local.hour >= hour, localDate: local.localDate };
}

function localParts(date: Date, timezone: string): number[] {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return [value("year"), value("month"), value("day"), value("hour"), value("minute"), value("second")];
}

function zonedMidnightUtc(year: number, month: number, day: number, timezone: string): Date {
  const desired = Date.UTC(year, month - 1, day); let guess = desired;
  for (let pass = 0; pass < 4; pass += 1) {
    const [y, m, d, h, minute, second] = localParts(new Date(guess), timezone);
    guess += desired - Date.UTC(y, m - 1, d, h, minute, second);
  }
  return new Date(guess);
}

export function localDateRangeUtc(localDate: string, timezone: string): { start: Date; end: Date } {
  const [year, month, day] = localDate.split("-").map(Number); const next = new Date(Date.UTC(year, month - 1, day + 1));
  return { start: zonedMidnightUtc(year, month, day, timezone), end: zonedMidnightUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), timezone) };
}

export function digestShouldQueue(counts: number[], includeEmpty: boolean): boolean {
  return includeEmpty || counts.some((count) => count > 0);
}

export function criticalAlertReasons(before: Row, after: Row, reopened = false): string[] {
  const reasons: string[] = [];
  if (before.severity !== "critical" && after.severity === "critical") reasons.push("Severity changed to critical");
  if (Number(before.priority_score ?? 0) < 80 && Number(after.priority_score ?? 0) >= 80) reasons.push("Priority crossed the critical threshold");
  if (reopened && after.severity === "critical") reasons.push("A resolved critical issue was reopened");
  return reasons;
}

export function retryDelayMs(attemptCount: number): number | null {
  return [5, 15, 60][attemptCount - 1] != null ? [5, 15, 60][attemptCount - 1] * 60_000 : null;
}

export function failurePatch(attemptCount: number, now = new Date()): Row {
  const delay = retryDelayMs(attemptCount);
  return delay == null
    ? { status: "dead_letter", attempt_count: attemptCount, next_attempt_at: undefined }
    : { status: "failed", attempt_count: attemptCount, next_attempt_at: new Date(now.getTime() + delay).toISOString() };
}

export function sendingLeaseExpired(delivery: Row, now = new Date()): boolean {
  return delivery.status === "sending" && !!delivery.lease_expires_at && Date.parse(delivery.lease_expires_at) <= now.getTime();
}

export function ownerCanRetryNotification(owner: string | null, project: Row | null, delivery: Row | null): boolean {
  return !!owner && !!project && !!delivery && (project.created_by ?? project.owner_id) === owner && ["failed", "dead_letter"].includes(delivery.status);
}

export function sanitizeDeliveryError(error: unknown): { code: string; message: string } {
  const raw = error instanceof Error ? error.message : String(error ?? "Delivery failed");
  const message = raw
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/(?:token|authorization|bearer|api[_ -]?key)[=: ]+[^\s,;]+/gi, "$1=[redacted]")
    .slice(0, 500);
  return { code: error instanceof Error ? error.name.slice(0, 80) || "delivery_error" : "delivery_error", message };
}

export async function enqueueNotification(sr: any, input: EnqueueInput): Promise<Row | null> {
  if (!templateEnabled(input.project, input.templateKey, input.submission)) return null;
  const existing = await sr.entities.NotificationDelivery.filter({ project_id: input.project.id, dedupe_key: input.dedupeKey });
  if (existing[0]) return existing[0];
  const nowIso = new Date().toISOString();
  const delivery = await sr.entities.NotificationDelivery.create({
    project_id: input.project.id,
    owner_id: input.project.created_by ?? input.project.owner_id,
    issue_id: input.issue?.id,
    submission_id: input.submission?.id,
    activity_event_id: input.activityEventId,
    reporter_message_id: input.reporterMessageId,
    recipient_type: input.recipientType,
    template_key: input.templateKey,
    channel: "email",
    dedupe_key: input.dedupeKey,
    status: "pending",
    attempt_count: 0,
    payload: safeNotificationPayload(input.payload),
    created_at: nowIso,
    updated_at: nowIso,
  });
  await sr.entities.ActivityEvent.create({
    project_id: input.project.id, owner_id: input.project.created_by ?? input.project.owner_id,
    issue_id: input.issue?.id, submission_id: input.submission?.id, event_type: input.templateKey === "owner_daily_digest" ? "digest_queued" : "notification_queued",
    actor_type: "system", actor_id: "system", internal_message: input.templateKey === "owner_daily_digest" ? "Daily digest queued" : "Email queued",
    metadata: { templateKey: input.templateKey, deliveryId: delivery.id }, created_at: nowIso,
  });
  return delivery;
}

export async function bestEffortEnqueue(sr: any, input: EnqueueInput): Promise<Row | null> {
  try { return await enqueueNotification(sr, input); }
  catch (error) {
    const sanitized = sanitizeDeliveryError(error);
    await sr.entities.ActivityEvent.create({
      project_id: input.project.id, owner_id: input.project.created_by ?? input.project.owner_id,
      issue_id: input.issue?.id, submission_id: input.submission?.id, event_type: "notification_queue_failed",
      actor_type: "system", actor_id: "system", internal_message: "Notification queueing failed.",
      metadata: { templateKey: input.templateKey, errorCode: sanitized.code }, created_at: new Date().toISOString(),
    }).catch(() => undefined);
    return null;
  }
}

export async function createEmailTrackingGrant(sr: any, delivery: Row, submission: Row, now = new Date()): Promise<{ grant: Row; rawToken: string }> {
  const rawToken = generateTrackingToken();
  const grant = await sr.entities.ReporterAccess.create({
    project_id: delivery.project_id, owner_id: delivery.owner_id, submission_id: submission.id,
    token_hash: await sha256Hex(rawToken), purpose: "email_notification", notification_delivery_id: delivery.id,
    expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60_000).toISOString(), created_at: now.toISOString(),
  });
  return { grant, rawToken };
}
