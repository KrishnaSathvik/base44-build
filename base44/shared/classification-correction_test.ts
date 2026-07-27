import { applyOwnerClassificationCorrection } from "./classification-correction.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (!Object.is(actual, expected)) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

function memoryStore() {
  const tables: Record<string, Record<string, any>[]> = {
    FeedbackSubmission: [],
    Issue: [],
    IssueReport: [],
    ActivityEvent: [],
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
  });
  return {
    tables,
    entities: {
      FeedbackSubmission: collection("FeedbackSubmission"),
      Issue: collection("Issue"),
      IssueReport: collection("IssueReport"),
      ActivityEvent: collection("ActivityEvent"),
      Project: collection("Project"),
      NotificationDelivery: collection("NotificationDelivery"),
    },
  };
}

Deno.test("owner classification correction updates issue and linked submissions", async () => {
  const sr = memoryStore();
  const submission = await sr.entities.FeedbackSubmission.create({
    project_id: "project-1",
    owner_id: "owner@example.com",
    type: "bug",
    description: "Export button does nothing",
    ai_category: "other",
    ai_product_area: "General",
    ai_severity: "low",
    ai_analysis_mode: "ai",
    ai_confidence: 0.9,
  });
  const issue = await sr.entities.Issue.create({
    project_id: "project-1",
    owner_id: "owner@example.com",
    public_code: "FI-TEST01",
    title: "Export broken",
    category: "other",
    product_area: "General",
    severity: "low",
    status: "open",
    report_count: 1,
    priority_score: 10,
  });
  await sr.entities.IssueReport.create({
    project_id: "project-1",
    owner_id: "owner@example.com",
    issue_id: issue.id,
    submission_id: submission.id,
    review_status: "accepted",
  });

  const result = await applyOwnerClassificationCorrection(sr, "owner@example.com", {
    issueId: issue.id,
    feedbackType: "bug",
    category: "functionality",
    productArea: "Export",
    severity: "high",
  });

  assertEquals(result.issue.category, "functionality");
  assertEquals(result.issue.product_area, "Export");
  assertEquals(result.issue.severity, "high");
  const refreshed = await sr.entities.FeedbackSubmission.get(submission.id);
  assertEquals(refreshed?.ai_category, "functionality");
  assertEquals(refreshed?.ai_product_area, "Export");
  assertEquals(refreshed?.ai_severity, "high");
  assertEquals(refreshed?.ai_analysis_mode, "owner_corrected");
  assertEquals(refreshed?.ai_confidence, 0.9);
  assertEquals(sr.tables.ActivityEvent.some((event) => event.event_type === "classification_corrected"), true);
});
