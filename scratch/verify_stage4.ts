import { assertEquals } from "jsr:@std/assert";
import { canTransition, transitionTimestamps } from "../base44/shared/issue-state-machine.ts";
import { computePriority } from "../base44/shared/priority.ts";
import { findIdempotentMessage, followUpNextStatus, ownerOwnsProject, publicMessagesForSubmission, resolutionConfirmationPatch } from "../base44/shared/reporter-workflow.ts";

const now = "2026-07-27T12:00:00.000Z";
const ownerPath = ["unreviewed", "open", "planned", "in_progress", "testing", "resolved"] as const;
for (let index = 0; index < ownerPath.length - 1; index += 1) {
  assertEquals(canTransition(ownerPath[index]!, ownerPath[index + 1]!), true);
}
assertEquals(followUpNextStatus("needs_info"), "open");
assertEquals(transitionTimestamps("testing", "resolved", now, {}).resolution_confirmation_status, "pending");
assertEquals(resolutionConfirmationPatch("fixed", now).resolution_confirmation_status, "confirmed");
assertEquals(resolutionConfirmationPatch("not_fixed", now).status, "reopened");

const before = computePriority({ severity: "high", reportCount: 2, reproducibility: "confirmed", reportTimestamps: [], lastSeenAt: "2020-01-01T00:00:00Z", coreWorkflowBlocked: false, reopened: false, now: new Date(now) });
const reopened = computePriority({ severity: "high", reportCount: 2, reproducibility: "confirmed", reportTimestamps: [], lastSeenAt: "2020-01-01T00:00:00Z", coreWorkflowBlocked: false, reopened: true, now: new Date(now) });
assertEquals(reopened.score - before.score, 12);

const messages = [
  { id: "own-public", submission_id: "submission-a", idempotency_key: "request-a", visibility: "public", body: "Own reply" },
  { id: "other-public", submission_id: "submission-b", visibility: "public", body: "Other reporter" },
  { id: "own-internal", submission_id: "submission-a", visibility: "internal", body: "Owner only" },
];
assertEquals(publicMessagesForSubmission(messages, "submission-a").map((message) => message.id), ["own-public"]);
assertEquals(findIdempotentMessage(messages, "submission-a", "request-a")?.id, "own-public");
assertEquals(findIdempotentMessage(messages, "submission-b", "request-a"), undefined);
assertEquals(ownerOwnsProject("owner-a@example.com", { created_by: "owner-a@example.com" }), true);
assertEquals(ownerOwnsProject("owner-b@example.com", { created_by: "owner-a@example.com" }), false);

console.log("Stage 4 deterministic smoke checks passed: lifecycle, reply opening, resolution confirmation/reopen, priority, token projection, idempotency, owner isolation.");
