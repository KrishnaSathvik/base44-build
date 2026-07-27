import { AI_ANALYSIS_MODE, FALLBACK_ANALYSIS_MODE } from "./feedback-fallback.ts";
import { analyzeSubmission, decideDuplicateGrouping, processFeedbackSubmission, withTimeout } from "./feedback-processing.ts";
import { FALLBACK_CONFIDENCE } from "./feedback-fallback.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (!Object.is(actual, expected)) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function memoryStore() {
  const tables: Record<string, Record<string, any>[]> = {
    FeedbackSubmission: [],
    Issue: [],
    IssueReport: [],
    ActivityEvent: [],
    DuplicateSuggestion: [],
    Project: [{ id: "project-1", created_by: "owner@example.com", name: "Demo", notification_delivery_enabled: false, critical_alerts_enabled: true }],
    NotificationDelivery: [],
  };
  const id = () => crypto.randomUUID();
  const collection = (name: string) => ({
    async get(rowId: string) {
      return tables[name].find((row) => row.id === rowId) ?? null;
    },
    async filter(query: Record<string, unknown>) {
      return tables[name].filter((row) => Object.entries(query).every(([key, value]) => row[key] === value));
    },
    async list(_sort?: string, limit = 100) {
      return tables[name].slice(0, limit);
    },
    async create(row: Record<string, unknown>) {
      const created = { id: id(), ...row };
      tables[name].push(created);
      return created;
    },
    async update(rowId: string, patch: Record<string, unknown>) {
      const index = tables[name].findIndex((row) => row.id === rowId);
      tables[name][index] = { ...tables[name][index], ...patch };
      return tables[name][index];
    },
    async updateMany(filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
      const match = tables[name].find((row) => Object.entries(filter).every(([key, value]) => row[key] === value));
      if (!match) return { updated: 0 };
      Object.assign(match, update.$set);
      return { updated: 1 };
    },
    async delete(rowId: string) {
      tables[name] = tables[name].filter((row) => row.id !== rowId);
    },
  });
  return {
    tables,
    entities: {
      FeedbackSubmission: collection("FeedbackSubmission"),
      Issue: collection("Issue"),
      IssueReport: collection("IssueReport"),
      ActivityEvent: collection("ActivityEvent"),
      DuplicateSuggestion: collection("DuplicateSuggestion"),
      Project: collection("Project"),
      NotificationDelivery: collection("NotificationDelivery"),
    },
  };
}

Deno.test("withTimeout rejects slow work", async () => {
  let rejected = false;
  try {
    await withTimeout(new Promise((resolve) => setTimeout(resolve, 50)), 5, "slow");
  } catch {
    rejected = true;
  }
  assert(rejected, "timeout should reject");
});

Deno.test("analyzeSubmission falls back when AI fails", async () => {
  const result = await analyzeSubmission({
    type: "bug",
    description: "The page is slow and times out on reports",
    page_url: "https://example.com/reports",
  }, {
    invoke: async () => {
      throw new Error("plan limit");
    },
  });
  assertEquals(result.mode, FALLBACK_ANALYSIS_MODE);
  assertEquals(result.analysis.confidence, FALLBACK_CONFIDENCE);
});

Deno.test("analyzeSubmission prefers valid AI output", async () => {
  const result = await analyzeSubmission({
    type: "bug",
    description: "Anything",
  }, {
    invoke: async () => ({
      summary: "AI summary",
      feedbackType: "bug",
      category: "performance",
      productArea: "Reports",
      severity: "high",
      severityReasons: ["timeout"],
      keywords: ["slow"],
      reproducibility: "likely",
      coreWorkflowBlocked: false,
      confidence: 0.9,
    }),
  });
  assertEquals(result.mode, AI_ANALYSIS_MODE);
  assertEquals(result.analysis.summary, "AI summary");
});

Deno.test("shared processor is called with lock and survives AI failure via fallback", async () => {
  const sr = memoryStore();
  const submission = await sr.entities.FeedbackSubmission.create({
    project_id: "project-1",
    owner_id: "owner@example.com",
    type: "bug",
    description: "Mobile layout breaks on checkout",
    page_url: "https://example.com/checkout",
    processing_status: "pending",
    processing_attempts: 0,
    created_at: new Date().toISOString(),
  });
  const result = await processFeedbackSubmission({
    sr,
    submissionId: submission.id,
    trustedInline: true,
    llm: {
      invoke: async () => {
        throw new Error("AI unavailable");
      },
    },
  });
  assertEquals(result.success, true);
  assertEquals(result.analysisMode, FALLBACK_ANALYSIS_MODE);
  const refreshed = await sr.entities.FeedbackSubmission.get(submission.id);
  if (!refreshed) throw new Error("submission should still exist");
  assertEquals(refreshed.processing_status, "completed");
  assert(sr.tables.Issue.length === 1, "one issue should be created");
});

Deno.test("completed processing is idempotent", async () => {
  const sr = memoryStore();
  const submission = await sr.entities.FeedbackSubmission.create({
    project_id: "project-1",
    owner_id: "owner@example.com",
    type: "bug",
    description: "Already done",
    processing_status: "completed",
    processing_attempts: 1,
  });
  await sr.entities.Issue.create({ id: "issue-1", project_id: "project-1", public_code: "FI-1", title: "Already done" });
  await sr.entities.IssueReport.create({ submission_id: submission.id, issue_id: "issue-1", review_status: "accepted" });
  const result = await processFeedbackSubmission({ sr, submissionId: submission.id, trustedInline: true, llm: null });
  assertEquals(result.success, true);
  assertEquals(result.idempotent, true);
  assertEquals(result.issueId, "issue-1");
});

Deno.test("decideDuplicateGrouping uses deterministic path when AI times out", async () => {
  const analysis = {
    summary: "Checkout overflow on mobile",
    feedbackType: "bug" as const,
    category: "ui_ux" as const,
    productArea: "Checkout",
    severity: "medium" as const,
    severityReasons: [],
    keywords: ["checkout", "mobile", "overflow"],
    reproducibility: "unknown" as const,
    coreWorkflowBlocked: false,
    confidence: FALLBACK_CONFIDENCE,
  };
  const decided = await decideDuplicateGrouping(
    { description: "Checkout overflow on mobile", page_url: "https://example.com/checkout", type: "bug" },
    analysis,
    [{
      id: "issue-9",
      title: "Checkout overflow on mobile",
      description: "Checkout overflow on mobile",
      category: "ui_ux",
      productArea: "Checkout",
      pagePath: "/checkout",
      feedbackType: "bug",
      keywords: ["checkout", "mobile", "overflow"],
    }],
    {
      invoke: async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {};
      },
    },
    { duplicateTimeoutMs: 5 },
  );
  assertEquals(decided.mode, FALLBACK_ANALYSIS_MODE);
});
