import { assert, assertEquals, assertMatch } from "jsr:@std/assert";
import { dispatchNotificationDelivery } from "./notification-dispatch.ts";

function fakeStore(overrides: Record<string, unknown> = {}) {
  const project = { id: "p1", created_by: "owner@example.com", notification_delivery_enabled: true, critical_alerts_enabled: true, reporter_status_emails_enabled: true };
  const submission = { id: "s1", project_id: "p1", reporter_email: "reporter@example.com", reporter_email_updates_enabled: true };
  const delivery: any = { id: "d1", project_id: "p1", owner_id: "owner@example.com", issue_id: "i1", submission_id: "s1", recipient_type: "reporter", template_key: "reporter_issue_resolved", status: "pending", attempt_count: 0, payload: { productName: "Test" }, ...overrides };
  const grants: any[] = []; const events: any[] = [];
  const sr = { entities: {
    NotificationDelivery: { get: () => Promise.resolve(delivery), update: (_: string, patch: any) => { Object.assign(delivery, patch); return Promise.resolve({ ...delivery }); }, updateMany: (filter:any,operation:any) => { const matches=delivery.id===filter.id&&delivery.status===filter.status&&(!("lease_expires_at" in filter)||delivery.lease_expires_at===filter.lease_expires_at);if(matches)Object.assign(delivery,operation.$set);return Promise.resolve({updated:matches?1:0}); } },
    Project: { get: () => Promise.resolve(project) }, FeedbackSubmission: { get: () => Promise.resolve(submission) }, Issue: { get: () => Promise.resolve({ id: "i1", public_code: "FI-ABC123" }) },
    ReporterAccess: { create: (row: any) => { const grant = { id: `g${grants.length + 1}`, ...row }; grants.push(grant); return Promise.resolve(grant); }, update: (id: string, patch: any) => { Object.assign(grants.find((item) => item.id === id), patch); return Promise.resolve({}); } },
    ActivityEvent: { create: (row: any) => { events.push(row); return Promise.resolve({ id: `e${events.length}`, ...row }); } },
  } };
  return { sr, project, submission, delivery, grants, events };
}

Deno.test("master disabled and missing recipient safely skip without calling email", async () => {
  const store = fakeStore(); store.project.notification_delivery_enabled = false; let sent = 0;
  const result = await dispatchNotificationDelivery(store.sr, "d1", { appBaseUrl: "https://app.test", runtimeDeliveryEnabled: true, emailAdapter: { send: async () => { sent++; return {}; } } });
  assertEquals(result.status, "skipped"); assertEquals(result.last_error_code, "delivery_disabled"); assertEquals(sent, 0);
  const missing = fakeStore({ recipient_type: "owner" }); delete (missing.project as any).created_by;
  const missingResult = await dispatchNotificationDelivery(missing.sr, "d1", { appBaseUrl: "https://app.test", runtimeDeliveryEnabled: true, emailAdapter: { send: async () => ({}) } });
  assertEquals(missingResult.last_error_code, "recipient_missing");
});

Deno.test("successful reporter send creates only a token hash and marks sent", async () => {
  const store = fakeStore(); let outgoing = "";
  const result = await dispatchNotificationDelivery(store.sr, "d1", { now: new Date("2026-07-27T12:00:00Z"), appBaseUrl: "https://vensaos.com", runtimeDeliveryEnabled: true, emailAdapter: { send: async (input) => { outgoing = input.body; return { id: "provider-1" }; } } });
  assertEquals(result.status, "sent"); assertEquals(result.provider_message_id, "provider-1"); assertEquals(store.grants.length, 1);
  assertMatch(store.grants[0].token_hash, /^[a-f0-9]{64}$/); assertEquals("raw_token" in store.grants[0], false); assert(outgoing.includes("https://vensaos.com/track/"));
});

Deno.test("owner alerts and digests use canonical VensaOS workspace links", async () => {
  const alert = fakeStore({ recipient_type: "owner", submission_id: undefined, template_key: "owner_critical_issue" }); let alertBody = "";
  await dispatchNotificationDelivery(alert.sr, "d1", { appBaseUrl: "https://vensaos.com", runtimeDeliveryEnabled: true, emailAdapter: { send: async (input) => { alertBody = input.body; return {}; } } });
  assert(alertBody.includes("https://vensaos.com/app/issues/i1"));
  const digest = fakeStore({ recipient_type: "owner", submission_id: undefined, issue_id: undefined, template_key: "owner_daily_digest" }); (digest.project as any).daily_digest_enabled = true; let digestBody = "";
  await dispatchNotificationDelivery(digest.sr, "d1", { appBaseUrl: "https://vensaos.com", runtimeDeliveryEnabled: true, emailAdapter: { send: async (input) => { digestBody = input.body; return {}; } } });
  assert(digestBody.includes("https://vensaos.com/app/overview"));
});

Deno.test("failed sends revoke grants and follow deterministic retry/dead-letter transitions", async () => {
  const store = fakeStore(); const adapter = { send: async () => { throw new Error("provider failed for reporter@example.com token=secret"); } };
  let now = new Date("2026-07-27T12:00:00Z");
  for (let attempt = 1; attempt <= 4; attempt++) {
    store.delivery.status = attempt === 1 ? "pending" : "failed"; store.delivery.next_attempt_at = undefined;
    await dispatchNotificationDelivery(store.sr, "d1", { now, appBaseUrl: "https://vensaos.com", runtimeDeliveryEnabled: true, emailAdapter: adapter });
    now = new Date(now.getTime() + 2 * 60 * 60_000);
  }
  assertEquals(store.delivery.status, "dead_letter"); assertEquals(store.delivery.attempt_count, 4); assertEquals(store.grants.length, 4);
  assertEquals(new Set(store.grants.map((grant)=>grant.token_hash)).size,4);assert(store.grants.every((grant) => !!grant.revoked_at)); assert(!store.delivery.last_error_message.includes("reporter@example.com")); assert(!store.delivery.last_error_message.includes("secret"));
});
