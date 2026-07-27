import { assertEquals, assertThrows } from "jsr:@std/assert";
import { ISSUE_STATUSES, assertTransition, canTransition, transitionRequirementError, transitionTimestamps } from "./issue-state-machine.ts";

Deno.test("approved issue transitions are allowed and arbitrary transitions are blocked", () => {
  assertEquals(canTransition("unreviewed", "open"), true);
  assertEquals(canTransition("testing", "resolved"), true);
  assertEquals(canTransition("resolved", "open"), false);
  assertEquals(canTransition("planned", "resolved"), false);
  assertEquals(ISSUE_STATUSES.includes("unknown" as never), false);
  assertThrows(() => assertTransition("open", "testing"));
});

Deno.test("transition-specific public and internal inputs are required", () => {
  assertEquals(transitionRequirementError("needs_info", {}), "A public question is required when requesting information");
  assertEquals(transitionRequirementError("needs_info", { publicMessage: "Which browser?" }), null);
  assertEquals(transitionRequirementError("resolved", {}), "A public resolution note is required");
  assertEquals(transitionRequirementError("resolved", { publicMessage: "Fixed in 2.1" }), null);
});

Deno.test("direct resolution requires an explicit override from open or in progress", () => {
  assertEquals(canTransition("open", "resolved"), false);
  assertEquals(canTransition("open", "resolved", { directResolutionOverrideReason: "Emergency hotfix" }), true);
  assertEquals(canTransition("in_progress", "resolved", { directResolutionOverrideReason: "Verified outside testing" }), true);
});

Deno.test("first-start timestamps are preserved", () => {
  const patch = transitionTimestamps("planned", "in_progress", "2026-01-02T00:00:00.000Z", { work_started_at: "2026-01-01T00:00:00.000Z" });
  assertEquals(patch.work_started_at, undefined);
  const resolved = transitionTimestamps("testing", "resolved", "2026-01-02T00:00:00.000Z", {});
  assertEquals(resolved.resolution_confirmation_status, "pending");
});
