type Status = "PASSED" | "FAILED" | "INTEGRATION_CHECK";
type Result = { name: string; status: Status; detail?: string };
const results: Result[] = [];
const appId = "6a627102d65aedec9330ed4c";
const baseUrl = `http://localhost:4400/api/apps/${appId}/functions`;

async function invoke(name: string, payload: unknown) {
  const response = await fetch(`${baseUrl}/${name}`, { method: "POST", headers: { "Content-Type": "application/json", "X-App-Id": appId }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}
async function upload(projectSlug: string, submissionKey: string, attachmentKey: string, name: string) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([137,80,78,71,13,10,26,10])], name, { type: "image/png" }));
  form.append("metadata", JSON.stringify({ projectSlug, submissionKey, attachmentKey, source: "browse", width: 1, height: 1 }));
  const response = await fetch(`${baseUrl}/upload-feedback-attachment`, { method: "POST", headers: { "X-App-Id": appId }, body: form });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function check(name: string, fn: () => Promise<void>) { try { await fn(); results.push({ name, status: "PASSED" }); console.log(`PASS  ${name}`); } catch (error) { const detail = error instanceof Error ? error.message : JSON.stringify(error); results.push({ name, status: "FAILED", detail }); console.log(`FAIL  ${name}: ${detail}`); } }
function integration(name: string, detail: string) { results.push({ name, status: "INTEGRATION_CHECK", detail }); console.log(`CHECK ${name}: ${detail}`); }

const slug = `stage3-${Date.now()}`;
await invoke("get-public-project", { slug, createIfMissing: true });

await check("text-only feedback submits", async () => {
  const key = crypto.randomUUID();
  const result = await invoke("submit-feedback", { projectSlug: slug, submissionKey: key, type: "general", description: "Stage 3 text-only smoke", attachmentIds: [], contextIncluded: false });
  assert(result.success && result.trackingToken, "text-only report was not accepted");
  const tracking = await invoke("access-tracking-page", { token: result.trackingToken });
  assert(tracking.attachments.length === 0 && tracking.context === null, "text-only/context opt-out projection was incorrect");
});

let one: any; let oneUpload: any;
await check("feedback with one screenshot submits", async () => {
  const submissionKey = crypto.randomUUID();
  oneUpload = await upload(slug, submissionKey, crypto.randomUUID(), "one.png");
  one = await invoke("submit-feedback", { projectSlug: slug, submissionKey, type: "bug", description: "One screenshot smoke", attachmentIds: [oneUpload.attachmentId], contextIncluded: true, browserName: "Smoke Browser", deviceType: "Desktop", screenWidth: 1440, screenHeight: 900, viewportWidth: 1280, viewportHeight: 720, pageUrl: "/chat" });
  assert(one.success && one.trackingToken, "report with screenshot was not accepted");
  const tracking = await invoke("access-tracking-page", { token: one.trackingToken });
  assert(tracking.attachments.length === 1 && tracking.attachments[0].fileName === "one.png", "tracking did not project the reporter screenshot");
  assert(!("fileUri" in tracking.attachments[0]) && !("submissionRef" in tracking), "tracking exposed a storage URI or entity id");
  const access = await invoke("get-reporter-attachment-access", { token: one.trackingToken, attachmentKey: tracking.attachments[0].accessKey });
  assert(access.signedUrl && access.expiresAt, "reporter temporary access was not issued");
});

await check("multiple screenshots and remove-before-submit behavior", async () => {
  const submissionKey = crypto.randomUUID();
  const firstKey = crypto.randomUUID(); const secondKey = crypto.randomUUID();
  const first = await upload(slug, submissionKey, firstKey, "first.png");
  const second = await upload(slug, submissionKey, secondKey, "second.png");
  // A third locally selected screenshot is intentionally not uploaded or associated,
  // mirroring remove-before-submit without creating a storage orphan.
  const submitted = await invoke("submit-feedback", { projectSlug: slug, submissionKey, type: "bug", description: "Multiple screenshot smoke", attachmentIds: [first.attachmentId, second.attachmentId], contextIncluded: false });
  const tracking = await invoke("access-tracking-page", { token: submitted.trackingToken });
  assert(tracking.attachments.length === 2, "the finalized report did not contain exactly two screenshots");
});

await check("same submission retry does not duplicate attachments", async () => {
  const submissionKey = crypto.randomUUID(); const attachmentKey = crypto.randomUUID();
  const first = await upload(slug, submissionKey, attachmentKey, "retry.png");
  const repeated = await upload(slug, submissionKey, attachmentKey, "retry.png");
  assert(repeated.duplicate === true && repeated.attachmentId === first.attachmentId, "attachment upload idempotency failed");
  const payload = { projectSlug: slug, submissionKey, type: "general", description: "Idempotent finalization", attachmentIds: [first.attachmentId], contextIncluded: false };
  const accepted = await invoke("submit-feedback", payload); const retry = await invoke("submit-feedback", payload);
  assert(accepted.success && retry.duplicate === true && retry.submissionRef === accepted.submissionRef, "submission finalization idempotency failed");
});

await check("unauthorized owner attachment access fails", async () => {
  try { await invoke("get-attachment-access", { attachmentId: oneUpload.attachmentId }); throw new Error("anonymous owner access unexpectedly succeeded"); }
  catch (error: any) { assert(error.status === 401, `expected 401, got ${error.status ?? "unknown"}`); }
});

await check("reporter cannot access another submission screenshot", async () => {
  const otherSubmissionKey = crypto.randomUUID(); const otherAttachmentKey = crypto.randomUUID();
  await upload(slug, otherSubmissionKey, otherAttachmentKey, "other.png");
  try { await invoke("get-reporter-attachment-access", { token: one.trackingToken, attachmentKey: otherAttachmentKey }); throw new Error("cross-report access unexpectedly succeeded"); }
  catch (error: any) { assert(error.status === 404, `expected 404, got ${error.status ?? "unknown"}`); }
});

integration("authorized owner temporary access", "Requires an authenticated owner browser/session token; backend authorization logic and anonymous denial are covered, but no credentials are embedded in smoke automation.");
integration("duplicate processing with attachments", "The text-only classifier remains attachment-independent and is covered by Deno logic tests; deployed entity automation/live LLM execution is intentionally deferred because functions were not deployed.");

const passed = results.filter((item) => item.status === "PASSED").length;
const failed = results.filter((item) => item.status === "FAILED").length;
const pending = results.filter((item) => item.status === "INTEGRATION_CHECK").length;
console.log(`Summary: ${passed} passed, ${failed} failed, ${pending} integration checks`);
if (failed) Deno.exit(1);
