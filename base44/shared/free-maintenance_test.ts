import {
  MAINTENANCE_MIN_INTERVAL_MS,
  acquireMaintenanceLease,
  prepareDueDigests,
  runFreeMaintenance,
  sanitizeMaintenanceSummary,
} from "./free-maintenance.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (!Object.is(actual, expected)) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function projectStore(seed: Record<string, unknown>[] = []) {
  const projects = [...seed];
  const deliveries: Record<string, unknown>[] = [];
  const activities: Record<string, unknown>[] = [];
  return {
    deliveries,
    entities: {
      Project: {
        async get(id: string) { return projects.find((row) => row.id === id) ?? null; },
        async filter(query: Record<string, unknown>) {
          return projects.filter((row) => Object.entries(query).every(([key, value]) => row[key] === value));
        },
        async list(_sort?: string, limit = 25) { return projects.slice(0, limit); },
        async update(id: string, patch: Record<string, unknown>) {
          const index = projects.findIndex((row) => row.id === id);
          projects[index] = { ...projects[index], ...patch };
          return projects[index];
        },
        async updateMany(filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
          const match = projects.find((row) => Object.entries(filter).every(([key, value]) => row[key] === value));
          if (!match) return { updated: 0 };
          Object.assign(match, update.$set);
          return { updated: 1 };
        },
      },
      NotificationDelivery: {
        async filter(query: Record<string, unknown>) {
          return deliveries.filter((row) => Object.entries(query).every(([key, value]) => row[key] === value));
        },
        async list() { return deliveries; },
        async create(row: Record<string, unknown>) {
          const created = { id: crypto.randomUUID(), ...row };
          deliveries.push(created);
          return created;
        },
        async get(id: string) { return deliveries.find((row) => row.id === id) ?? null; },
        async update(id: string, patch: Record<string, unknown>) {
          const index = deliveries.findIndex((row) => row.id === id);
          deliveries[index] = { ...deliveries[index], ...patch };
          return deliveries[index];
        },
        async updateMany() { return { updated: 0 }; },
      },
      FeedbackSubmission: { async filter() { return []; } },
      Issue: { async filter() { return []; } },
      DuplicateSuggestion: { async filter() { return []; } },
      ReporterMessage: { async filter() { return []; } },
      FeedbackAttachment: { async filter() { return []; } },
      ActivityEvent: {
        async create(row: Record<string, unknown>) { activities.push(row); return row; },
        async filter() { return []; },
      },
    },
  };
}

Deno.test("maintenance lease acquisition blocks concurrent and recent runs", async () => {
  const now = new Date("2026-07-27T15:00:00.000Z");
  const sr = projectStore([{
    id: "p1", created_by: "owner@example.com", name: "Demo",
    notification_delivery_enabled: false, daily_digest_enabled: false,
  }]);
  const project = await sr.entities.Project.get("p1");
  if (!project) throw new Error("seed project required");
  const first = await acquireMaintenanceLease(sr, project, now);
  assertEquals(first.acquired, true);
  const concurrent = await acquireMaintenanceLease(sr, first.project, now);
  assertEquals(concurrent.acquired, false);
  assertEquals(concurrent.reason, "already_running");

  const afterRelease = await sr.entities.Project.update("p1", {
    maintenance_lease_expires_at: new Date(now.getTime() - 1).toISOString(),
    maintenance_last_attempt_at: now.toISOString(),
  });
  const throttled = await acquireMaintenanceLease(sr, afterRelease, new Date(now.getTime() + 60_000));
  assertEquals(throttled.acquired, false);
  assertEquals(throttled.reason, "recently_run");

  const ready = await sr.entities.Project.update("p1", {
    maintenance_lease_expires_at: new Date(now.getTime() - 1).toISOString(),
    maintenance_last_attempt_at: new Date(now.getTime() - MAINTENANCE_MIN_INTERVAL_MS - 1).toISOString(),
  });
  const recovered = await acquireMaintenanceLease(
    sr,
    ready,
    new Date(now.getTime() + MAINTENANCE_MIN_INTERVAL_MS + 1),
  );
  assertEquals(recovered.acquired, true);
});

Deno.test("runFreeMaintenance denies cross-owner project ids", async () => {
  const sr = projectStore([{ id: "p1", created_by: "owner@example.com", name: "Demo", notification_delivery_enabled: false }]);
  const summary = await runFreeMaintenance({
    sr,
    ownerEmail: "other@example.com",
    projectId: "p1",
    emailAdapter: { send: async () => { throw new Error("SendEmail must not be called"); } },
    notificationIntegrationEnabled: false,
    appBaseUrl: "https://vensaos.com",
  });
  assertEquals(summary.status, "unauthorized");
});

Deno.test("activity-driven digest due calculation dedupes per local date and never marks sent", async () => {
  const now = new Date("2026-07-27T16:00:00.000Z");
  const sr = projectStore([{
    id: "p1", created_by: "owner@example.com", name: "Demo",
    daily_digest_enabled: true, daily_digest_include_empty: true,
    digest_timezone: "UTC", digest_hour_local: 9, notification_delivery_enabled: false,
  }]);
  const first = await prepareDueDigests(sr, now);
  assertEquals(first.queued, 1);
  const second = await prepareDueDigests(sr, now);
  assertEquals(second.duplicate, 1);
  assertEquals(sr.deliveries[0].status, "pending");
  assert(!("sent_at" in (sr.deliveries[0] as Record<string, unknown>) && (sr.deliveries[0] as Record<string, unknown>).sent_at), "digest must not be marked sent");
});

Deno.test("sanitizeMaintenanceSummary strips private payload fields", () => {
  const sanitized = sanitizeMaintenanceSummary({
    status: "ran",
    processed: 2,
    sent: 0,
    failed: 0,
    skipped: 2,
    deadLettered: 0,
    reconciled: 1,
    duplicateReconciliation: 0,
    digestsQueued: 1,
    digestsSkippedEmpty: 0,
    digestsDuplicate: 0,
    projectsChecked: 1,
    orphanAttachments: 0,
    emailDeliveryDisabled: true,
    lastAttemptAt: "2026-07-27T15:00:00.000Z",
    lastSuccessAt: "2026-07-27T15:00:01.000Z",
  });
  assertEquals(sanitized.sent, 0);
  assertEquals(sanitized.emailDeliveryDisabled, true);
  assert(!("payload" in sanitized), "no payload field");
});
