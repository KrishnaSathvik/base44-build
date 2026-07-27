import { OWNER_CORRECTED_MODE } from "./feedback-fallback.ts";
import { recalculateIssue } from "./issue-operations.ts";

type Row = Record<string, any>;

export const CATEGORY_VALUES = [
  "ui_ux", "functionality", "performance", "authentication", "data", "content", "other",
] as const;
export const SEVERITY_VALUES = ["critical", "high", "medium", "low"] as const;
export const FEEDBACK_TYPE_VALUES = ["bug", "feature", "general"] as const;

export interface ClassificationCorrectionInput {
  issueId: string;
  feedbackType?: (typeof FEEDBACK_TYPE_VALUES)[number];
  category?: (typeof CATEGORY_VALUES)[number];
  productArea?: string;
  severity?: (typeof SEVERITY_VALUES)[number];
}

export async function applyOwnerClassificationCorrection(
  sr: any,
  owner: string,
  input: ClassificationCorrectionInput,
): Promise<{ issue: Row; previous: Row }> {
  const issue = await sr.entities.Issue.get(input.issueId);
  if (!issue || issue.owner_id !== owner) throw new Error("Issue not found or access denied");

  const productArea = input.productArea?.trim();
  if (productArea !== undefined && (productArea.length < 1 || productArea.length > 120)) {
    throw new Error("Product area must be 1–120 characters");
  }

  const previous = {
    category: issue.category,
    product_area: issue.product_area,
    severity: issue.severity,
  };

  const issuePatch: Row = {};
  if (input.category) issuePatch.category = input.category;
  if (productArea !== undefined) issuePatch.product_area = productArea;
  if (input.severity) issuePatch.severity = input.severity;
  if (Object.keys(issuePatch).length) await sr.entities.Issue.update(issue.id, issuePatch);

  const links = (await sr.entities.IssueReport.filter({ issue_id: issue.id }))
    .filter((link: Row) => link.review_status !== "rejected");
  for (const link of links) {
    const submission = await sr.entities.FeedbackSubmission.get(link.submission_id).catch(() => null);
    if (!submission || submission.owner_id !== owner) continue;
    const submissionPatch: Row = { ai_analysis_mode: OWNER_CORRECTED_MODE };
    if (input.feedbackType) submissionPatch.type = input.feedbackType;
    if (input.category) submissionPatch.ai_category = input.category;
    if (productArea !== undefined) submissionPatch.ai_product_area = productArea;
    if (input.severity) {
      submissionPatch.ai_severity = input.severity;
      submissionPatch.ai_severity_reasons = [
        "Owner corrected classification. Original automated reasons retained in activity history.",
      ];
    }
    await sr.entities.FeedbackSubmission.update(submission.id, submissionPatch);
  }

  const updated = await recalculateIssue(sr, issue.id);
  await sr.entities.ActivityEvent.create({
    project_id: issue.project_id,
    owner_id: owner,
    issue_id: issue.id,
    event_type: "classification_corrected",
    actor_type: "owner",
    actor_id: owner,
    internal_message: "Owner corrected classification fields.",
    metadata: {
      previous,
      next: {
        feedbackType: input.feedbackType,
        category: input.category ?? updated.category,
        productArea: productArea ?? updated.product_area,
        severity: input.severity ?? updated.severity,
      },
      analysisMode: OWNER_CORRECTED_MODE,
    },
    created_at: new Date().toISOString(),
  });
  return { issue: updated, previous };
}
