import { computePriority, hasRapidSpike } from "./priority.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (!Object.is(actual, expected)) throw new Error(`Expected ${expected}, received ${actual}`);
}

Deno.test("locked priority formula returns documented worked example", () => {
  const now = new Date("2026-07-26T12:00:00.000Z");
  const result = computePriority({
    severity: "high", reportCount: 6, reproducibility: "confirmed",
    reportTimestamps: ["2026-07-26T11:00:00.000Z", "2026-07-26T11:20:00.000Z", "2026-07-26T11:40:00.000Z"],
    lastSeenAt: "2026-07-26T11:40:00.000Z", coreWorkflowBlocked: false, reopened: false, now,
  });
  assertEquals(result.score, 78);
});

Deno.test("rapid spike requires three reports within sixty minutes", () => {
  assertEquals(hasRapidSpike(["2026-01-01T00:00:00Z", "2026-01-01T00:30:00Z", "2026-01-01T01:00:00Z"]), true);
  assertEquals(hasRapidSpike(["2026-01-01T00:00:00Z", "2026-01-01T00:30:00Z", "2026-01-01T01:01:00Z"]), false);
});

Deno.test("reopening adds exactly twelve points without erasing historical inputs", () => {
  const input = { severity: "medium" as const, reportCount: 1, reproducibility: "unknown" as const, reportTimestamps: [], lastSeenAt: "2020-01-01T00:00:00Z", coreWorkflowBlocked: false, now: new Date("2026-01-01T00:00:00Z") };
  const before = computePriority({ ...input, reopened: false });
  const after = computePriority({ ...input, reopened: true });
  assertEquals(after.score - before.score, 12);
});
