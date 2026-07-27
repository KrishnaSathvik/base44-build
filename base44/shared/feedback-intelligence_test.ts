import { enforceDuplicateThreshold } from "./feedback-intelligence.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (!Object.is(actual, expected)) throw new Error(`Expected ${expected}, received ${actual}`);
}

const decision = (confidence: number) => ({ candidateIssueId: "issue-1", sameUnderlyingIssue: true, decision: "separate" as const, confidence, matchingReasons: [], conflictingEvidence: [] });
Deno.test("backend thresholds override the model decision label", () => {
  const candidates = new Set(["issue-1"]);
  assertEquals(enforceDuplicateThreshold(decision(0.85), candidates), "auto_group");
  assertEquals(enforceDuplicateThreshold(decision(0.84), candidates), "suggest");
  assertEquals(enforceDuplicateThreshold(decision(0.64), candidates), "separate");
});

Deno.test("unknown candidate ids cannot be grouped", () => {
  assertEquals(enforceDuplicateThreshold(decision(0.99), new Set()), "separate");
});

Deno.test("sameUnderlyingIssue false never auto-groups even at high confidence", () => {
  assertEquals(enforceDuplicateThreshold({
    candidateIssueId: "issue-1",
    sameUnderlyingIssue: false,
    decision: "auto_group",
    confidence: 0.99,
    matchingReasons: [],
    conflictingEvidence: [],
  }, new Set(["issue-1"])), "separate");
});

Deno.test("analysis schema rejects out-of-range confidence and excess keywords", async () => {
  const { analysisSchema } = await import("./feedback-intelligence.ts");
  assertEquals(analysisSchema.safeParse({
    summary: "ok", feedbackType: "bug", category: "functionality", productArea: "Export",
    severity: "high", severityReasons: ["impact"], keywords: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    reproducibility: "likely", coreWorkflowBlocked: false, confidence: 1.2,
  }).success, false);
});
