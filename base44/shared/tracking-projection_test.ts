import { buildTrackingProjection } from "./tracking-projection.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("tracking projection excludes internal AI fields", async () => {
  const sr = {
    entities: {
      ReporterMessage: { filter: async () => [] },
      FeedbackAttachment: { filter: async () => [] },
      ActivityEvent: {
        filter: async () => [{
          event_type: "classification_completed",
          public_message: null,
          internal_message: "Classified as functionality",
          created_at: "2026-07-27T00:00:00.000Z",
        }, {
          event_type: "feedback_received",
          public_message: "Your feedback was received.",
          created_at: "2026-07-27T00:00:00.000Z",
        }],
      },
    },
  };
  const projection = await buildTrackingProjection(sr, {
    id: "sub-1",
    type: "bug",
    description: "Export broken",
    ai_confidence: 0.99,
    ai_severity_reasons: ["secret"],
    ai_analysis_mode: "ai",
    processing_error: "InvokeLLM failed",
    reporter_email: "reporter@example.com",
  }, {
    id: "issue-1",
    public_code: "FI-1",
    title: "Export broken",
    status: "open",
    public_resolution_note: null,
  });
  const serialized = JSON.stringify(projection);
  assert(!serialized.includes("ai_confidence"), "must not expose confidence");
  assert(!serialized.includes("severity_reasons"), "must not expose severity reasons");
  assert(!serialized.includes("InvokeLLM"), "must not expose processing errors");
  assert(!serialized.includes("reporter@example.com"), "must not expose reporter email");
  assert(!serialized.includes("classification_completed"), "must not expose internal-only activity");
  assert(projection.publicIssueCode === "FI-1", "public code remains");
  assert(Array.isArray(projection.publicActivityEvents) && (projection.publicActivityEvents as unknown[]).length === 1, "only public activity");
});
