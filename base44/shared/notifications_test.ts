import { assert, assertEquals, assertMatch } from "jsr:@std/assert";
import {
  criticalAlertReasons, digestIsDue, digestShouldQueue, enqueueNotification, failurePatch, isValidIanaTimezone, localDateRangeUtc,
  notificationDedupeKey, ownerCanRetryNotification, reporterEmailEligible, retryDelayMs, safeNotificationPayload,
  sendingLeaseExpired, templateEnabled, validateDigestSettings,
} from "./notifications.ts";

Deno.test("notification eligibility requires explicit reporter consent", () => {
  const project = { reporter_status_emails_enabled: true, critical_alerts_enabled: true };
  assertEquals(reporterEmailEligible(project, { reporter_email: "r@example.com", reporter_email_updates_enabled: false }), false);
  assertEquals(reporterEmailEligible(project, { reporter_email: "r@example.com", reporter_email_updates_enabled: true }), true);
  assertEquals(templateEnabled(project, "owner_critical_issue"), true);
  assertEquals(templateEnabled({ owner_reply_alerts_enabled: true }, "owner_reporter_reply"), true);
  assertEquals(templateEnabled({ owner_reply_alerts_enabled: false }, "owner_reporter_reply"), false);
  assertEquals(templateEnabled({ critical_alerts_enabled: false }, "owner_critical_issue"), false);
});

Deno.test("dedupe keys and safe payloads are deterministic and exclude sensitive keys", () => {
  assertEquals(notificationDedupeKey("reporter_status", ["event-1", "submission-1"]), "reporter_status:event-1:submission-1");
  assertEquals(safeNotificationPayload({ issueTitle: "A", reporterEmail: "secret@example.com", rawToken: "secret", values: ["one"] }), { issueTitle: "A", values: ["one"] });
});

Deno.test("critical reasons fire only for genuine crossings", () => {
  assertEquals(criticalAlertReasons({ severity: "high", priority_score: 79 }, { severity: "critical", priority_score: 80 }), ["Severity changed to critical", "Priority crossed the critical threshold"]);
  assertEquals(criticalAlertReasons({ severity: "critical", priority_score: 90 }, { severity: "critical", priority_score: 91 }), []);
  assertEquals(criticalAlertReasons({ severity: "critical", priority_score: 90 }, { severity: "critical", priority_score: 91 }, true), ["A resolved critical issue was reopened"]);
});

Deno.test("retry backoff, dead letter, and lease expiration are deterministic", () => {
  assertEquals(retryDelayMs(1), 5 * 60_000); assertEquals(retryDelayMs(2), 15 * 60_000); assertEquals(retryDelayMs(3), 60 * 60_000); assertEquals(retryDelayMs(4), null);
  assertEquals(failurePatch(4).status, "dead_letter");
  assert(sendingLeaseExpired({ status: "sending", lease_expires_at: "2026-01-01T00:00:00.000Z" }, new Date("2026-01-01T00:01:00.000Z")));
  assert(ownerCanRetryNotification("owner@example.com",{created_by:"owner@example.com"},{status:"failed"}));assertEquals(ownerCanRetryNotification("other@example.com",{created_by:"owner@example.com"},{status:"dead_letter"}),false);assertEquals(ownerCanRetryNotification("owner@example.com",{created_by:"owner@example.com"},{status:"sent"}),false);
});

Deno.test("digest timezone and daily due calculation use project local time", () => {
  assert(isValidIanaTimezone("America/Chicago")); assertEquals(isValidIanaTimezone("Mars/Olympus"), false);
  assertEquals(validateDigestSettings("UTC", 9), null); assertMatch(validateDigestSettings("UTC", 24)!, /0 through 23/);
  assertEquals(digestIsDue({ daily_digest_enabled: true, digest_timezone: "America/Chicago", digest_hour_local: 9 }, new Date("2026-07-27T14:15:00.000Z")), { due: true, localDate: "2026-07-27" });
  const range=localDateRangeUtc("2026-07-27","America/Chicago");assertEquals(range.start.toISOString(),"2026-07-27T05:00:00.000Z");assertEquals(range.end.toISOString(),"2026-07-28T05:00:00.000Z");
  assertEquals(digestShouldQueue([0,0,0],false),false);assertEquals(digestShouldQueue([0,1,0],false),true);assertEquals(digestShouldQueue([0,0],true),true);
});

Deno.test("enqueue prevents a duplicate delivery", async () => {
  const deliveries: Record<string, unknown>[] = []; const events: Record<string, unknown>[] = [];
  const sr = { entities: {
    NotificationDelivery: { filter: ({ dedupe_key }: any) => Promise.resolve(deliveries.filter((row: any) => row.dedupe_key === dedupe_key)), create: (row: any) => { const value = { id: `d-${deliveries.length + 1}`, ...row }; deliveries.push(value); return Promise.resolve(value); } },
    ActivityEvent: { create: (row: any) => { events.push(row); return Promise.resolve({ id: `e-${events.length}`, ...row }); } },
  } };
  const input = { project: { id: "p1", created_by: "owner@example.com", critical_alerts_enabled: true }, templateKey: "owner_critical_issue" as const, recipientType: "owner" as const, dedupeKey: "critical:i1:1", issue: { id: "i1" } };
  const first = await enqueueNotification(sr, input); const second = await enqueueNotification(sr, input);
  assertEquals(first?.id, second?.id); assertEquals(deliveries.length, 1); assertEquals(events.length, 1);
});
