import { assertEquals } from "jsr:@std/assert";
import {
  canAssociateAttachment,
  accessGrantIsExpired,
  ownerCanAccessAttachment,
  reporterCanAccessAttachment,
  validateAttachmentFile,
} from "./attachment-security.ts";

const attachment = {
  id: "a1", project_id: "p1", owner_id: "owner@example.com", submission_id: "s1",
  submission_key: "key", attachment_key: "public-key", upload_status: "completed",
};

Deno.test("attachment-project ownership requires the project owner", () => {
  assertEquals(ownerCanAccessAttachment("owner@example.com", attachment, { id: "p1", created_by: "owner@example.com" }), true);
  assertEquals(ownerCanAccessAttachment("other@example.com", attachment, { id: "p1", created_by: "owner@example.com" }), false);
});

Deno.test("reporter token cannot cross submission boundaries", () => {
  assertEquals(reporterCanAccessAttachment({ submission_id: "s1" }, attachment), true);
  assertEquals(reporterCanAccessAttachment({ submission_id: "s2" }, attachment), false);
});

Deno.test("deleted attachment access is denied", () => {
  assertEquals(reporterCanAccessAttachment({ submission_id: "s1" }, { ...attachment, upload_status: "deleted" }), false);
});

Deno.test("association requires matching project and submission key", () => {
  assertEquals(canAssociateAttachment("p1", "key", attachment), true);
  assertEquals(canAssociateAttachment("p2", "key", attachment), false);
  assertEquals(canAssociateAttachment("p1", "wrong", attachment), false);
});

Deno.test("file validation rejects MIME and size violations", () => {
  assertEquals(validateAttachmentFile({ type: "image/png", size: 100 }), null);
  assertEquals(validateAttachmentFile({ type: "image/svg+xml", size: 100 }), "Only PNG, JPEG, and WebP screenshots are supported");
  assertEquals(validateAttachmentFile({ type: "image/png", size: 10 * 1024 * 1024 + 1 }), "Each screenshot must be 10 MB or smaller");
});

Deno.test("expired signed-access grant behavior is deterministic", () => {
  assertEquals(accessGrantIsExpired("2026-01-01T00:00:00.000Z", new Date("2026-01-02T00:00:00.000Z").getTime()), true);
  assertEquals(accessGrantIsExpired("2026-01-03T00:00:00.000Z", new Date("2026-01-02T00:00:00.000Z").getTime()), false);
});
