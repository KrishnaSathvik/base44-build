import { assertEquals } from "jsr:@std/assert";
import { findIdempotentMessage, followUpAttachmentBelongsToReporter, followUpNextStatus, ownerOwnsProject, publicMessagesForSubmission, resolutionConfirmationPatch, senderLabel, validateDuplicateTarget } from "./reporter-workflow.ts";

Deno.test("public message projection isolates a reporter and hides internal content", () => {
  const rows = [
    { submission_id: "own", visibility: "public", body: "Own", created_at: "2026-01-02" },
    { submission_id: "other", visibility: "public", body: "Other", created_at: "2026-01-01" },
    { submission_id: "own", visibility: "internal", body: "Secret", created_at: "2026-01-03" },
  ];
  assertEquals(publicMessagesForSubmission(rows, "own").map((row) => row.body), ["Own"]);
  assertEquals(senderLabel("owner"), "Product team");
});

Deno.test("needs-info replies open the issue and not-fixed confirmation reopens it", () => {
  assertEquals(followUpNextStatus("needs_info"), "open");
  assertEquals(followUpNextStatus("resolved", "general"), "resolved");
  assertEquals(followUpNextStatus("resolved", "not_fixed"), "reopened");
  assertEquals(resolutionConfirmationPatch("not_fixed", "2026-01-01T00:00:00Z").status, "reopened");
  assertEquals(resolutionConfirmationPatch("fixed", "2026-01-01T00:00:00Z").resolution_confirmation_status, "confirmed");
});

Deno.test("follow-up and confirmation idempotency is scoped to the token submission", () => {
  const messages = [{ submission_id: "submission-a", idempotency_key: "request-1", id: "message-1" }];
  assertEquals(findIdempotentMessage(messages, "submission-a", "request-1")?.id, "message-1");
  assertEquals(findIdempotentMessage(messages, "submission-b", "request-1"), undefined);
});

Deno.test("follow-up attachments cannot cross submission boundaries", () => {
  const attachment = { submission_id: "submission-a", submission_key: "request-1", upload_status: "completed" };
  assertEquals(followUpAttachmentBelongsToReporter(attachment, "submission-a", "request-1"), true);
  assertEquals(followUpAttachmentBelongsToReporter(attachment, "submission-b", "request-1"), false);
});

Deno.test("owner authorization checks the project owner", () => {
  assertEquals(ownerOwnsProject("owner@example.com", { created_by: "owner@example.com" }), true);
  assertEquals(ownerOwnsProject("other@example.com", { created_by: "owner@example.com" }), false);
});

Deno.test("duplicate targets reject self, cross-project, and duplicate chains", () => {
  const issue = { id: "source", project_id: "p1" };
  assertEquals(validateDuplicateTarget(issue, { id: "source", project_id: "p1", status: "open" }), "An issue cannot duplicate itself");
  assertEquals(validateDuplicateTarget(issue, { id: "other", project_id: "p2", status: "open" }), "The canonical issue must exist in the same project");
  assertEquals(validateDuplicateTarget(issue, { id: "other", project_id: "p1", status: "duplicate" }), "Choose the canonical issue rather than another duplicate");
  assertEquals(validateDuplicateTarget(issue, { id: "other", project_id: "p1", status: "open" }), null);
});
