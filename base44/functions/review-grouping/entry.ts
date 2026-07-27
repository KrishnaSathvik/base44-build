import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { error, errorMessage, json } from "../../shared/response.ts";
import { createIssueForSubmission, moveSubmission, recalculateIssue } from "../../shared/issue-operations.ts";
import { assertTransition } from "../../shared/issue-state-machine.ts";

type Row = Record<string, any>;
const payloadSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), suggestionId: z.string().min(1) }),
  z.object({ action: z.literal("reject"), suggestionId: z.string().min(1) }),
  z.object({ action: z.literal("merge"), sourceIssueId: z.string().min(1), targetIssueId: z.string().min(1) }),
  z.object({ action: z.literal("move"), submissionId: z.string().min(1), targetIssueId: z.string().min(1) }),
  z.object({ action: z.literal("separate"), submissionId: z.string().min(1) }),
]);

async function requireOwner(base44: any): Promise<string | null> {
  try { return (await base44.auth.me())?.email ?? null; } catch { return null; }
}

async function verifyIssue(sr: any, id: string, owner: string): Promise<Row> {
  const issue = await sr.entities.Issue.get(id);
  if (!issue || issue.owner_id !== owner) throw new Error("Issue not found or access denied");
  return issue;
}

async function verifyCanonicalIssue(sr: any, id: string, owner: string): Promise<Row> {
  const issue = await verifyIssue(sr, id, owner);
  if (issue.status === "duplicate") throw new Error("Choose the canonical issue rather than another duplicate");
  return issue;
}

async function closeEmptyIssue(sr: any, issueId: string, canonicalIssueId: string) {
  const issue = await recalculateIssue(sr, issueId);
  if ((issue.report_count ?? 0) === 0) {
    assertTransition(issue.status, "duplicate");
    await sr.entities.Issue.update(issueId, { status: "duplicate", duplicate_of_issue_id: canonicalIssueId });
  }
}

async function rejectPendingSuggestions(sr: any, submissionId: string, owner: string, nowIso: string) {
  const suggestions = await sr.entities.DuplicateSuggestion.filter({ submission_id: submissionId, status: "pending" });
  for (const suggestion of suggestions) {
    await sr.entities.DuplicateSuggestion.update(suggestion.id, { status: "rejected", reviewed_by: owner, reviewed_at: nowIso });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const owner = await requireOwner(base44);
    if (!owner) return error("Authentication required", 401);
    const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid grouping action", 400);
    const input = parsed.data;
    const sr = base44.asServiceRole;
    const nowIso = new Date().toISOString();

    if (input.action === "accept" || input.action === "reject") {
      const suggestion = await sr.entities.DuplicateSuggestion.get(input.suggestionId);
      if (!suggestion || suggestion.owner_id !== owner) return error("Suggestion not found or access denied", 404);
      if (suggestion.status !== "pending") return json({ success: true, idempotent: true, suggestion });
      if (input.action === "reject") {
        const updated = await sr.entities.DuplicateSuggestion.update(suggestion.id, { status: "rejected", reviewed_by: owner, reviewed_at: nowIso });
        await sr.entities.ActivityEvent.create({
          project_id: suggestion.project_id, owner_id: owner, issue_id: suggestion.source_issue_id, submission_id: suggestion.submission_id,
          event_type: "duplicate_rejected", actor_type: "owner", actor_id: owner,
          internal_message: "Duplicate suggestion rejected; the report remains separate.", created_at: nowIso,
        });
        return json({ success: true, suggestion: updated });
      }

      await verifyCanonicalIssue(sr, suggestion.candidate_issue_id, owner);
      await moveSubmission(sr, suggestion.submission_id, suggestion.candidate_issue_id, owner, "manual", {
        confidence: suggestion.similarity_score, matchingReasons: suggestion.matching_reasons,
        conflictingEvidence: suggestion.conflicting_evidence,
      });
      await closeEmptyIssue(sr, suggestion.source_issue_id, suggestion.candidate_issue_id);
      const updated = await sr.entities.DuplicateSuggestion.update(suggestion.id, { status: "accepted", reviewed_by: owner, reviewed_at: nowIso });
      await sr.entities.ActivityEvent.create({
        project_id: suggestion.project_id, owner_id: owner, issue_id: suggestion.candidate_issue_id, submission_id: suggestion.submission_id,
        event_type: "duplicate_accepted", actor_type: "owner", actor_id: owner,
        internal_message: "Duplicate suggestion accepted and report moved to the candidate issue.", created_at: nowIso,
      });
      return json({ success: true, suggestion: updated, issueId: suggestion.candidate_issue_id });
    }

    if (input.action === "merge") {
      if (input.sourceIssueId === input.targetIssueId) return error("Choose two different issues", 400);
      const source = await verifyIssue(sr, input.sourceIssueId, owner);
      const target = await verifyCanonicalIssue(sr, input.targetIssueId, owner);
      if (source.project_id !== target.project_id) return error("Issues must belong to the same project", 400);
      const links = await sr.entities.IssueReport.filter({ issue_id: source.id });
      for (const link of links) {
        await moveSubmission(sr, link.submission_id, target.id, owner, "manual");
        await rejectPendingSuggestions(sr, link.submission_id, owner, nowIso);
      }
      assertTransition(source.status, "duplicate");
      await sr.entities.Issue.update(source.id, { status: "duplicate", duplicate_of_issue_id: target.id });
      await recalculateIssue(sr, target.id);
      await sr.entities.ActivityEvent.create({
        project_id: source.project_id, owner_id: owner, issue_id: target.id, event_type: "issues_merged",
        actor_type: "owner", actor_id: owner, internal_message: `${source.public_code} merged into ${target.public_code}.`,
        metadata: { sourceIssueId: source.id, targetIssueId: target.id }, created_at: nowIso,
      });
      return json({ success: true, issueId: target.id });
    }

    if (input.action === "move") {
      const target = await verifyCanonicalIssue(sr, input.targetIssueId, owner);
      const submission = await sr.entities.FeedbackSubmission.get(input.submissionId);
      if (!submission || submission.owner_id !== owner || submission.project_id !== target.project_id) return error("Report not found or access denied", 404);
      const oldLinks = await sr.entities.IssueReport.filter({ submission_id: submission.id });
      await moveSubmission(sr, submission.id, target.id, owner, "manual");
      await rejectPendingSuggestions(sr, submission.id, owner, nowIso);
      for (const link of oldLinks) if (link.issue_id !== target.id) await closeEmptyIssue(sr, link.issue_id, target.id);
      await sr.entities.ActivityEvent.create({
        project_id: target.project_id, owner_id: owner, issue_id: target.id, submission_id: submission.id,
        event_type: "report_moved", actor_type: "owner", actor_id: owner,
        internal_message: `Report moved to ${target.public_code}.`, created_at: nowIso,
      });
      return json({ success: true, issueId: target.id });
    }

    const submission = await sr.entities.FeedbackSubmission.get(input.submissionId);
    if (!submission || submission.owner_id !== owner) return error("Report not found or access denied", 404);
    const oldLinks = await sr.entities.IssueReport.filter({ submission_id: submission.id });
    if (!oldLinks[0]) return error("Report is not linked to an issue", 409);
    const oldIssue = await verifyIssue(sr, oldLinks[0].issue_id, owner);
    const oldIssueLinks = await sr.entities.IssueReport.filter({ issue_id: oldIssue.id });
    if (oldIssueLinks.length === 1) return json({ success: true, idempotent: true, issueId: oldIssue.id });
    for (const link of oldLinks) await sr.entities.IssueReport.delete(link.id);
    const separated = await createIssueForSubmission(sr, submission, owner, "unreviewed");
    await rejectPendingSuggestions(sr, submission.id, owner, nowIso);
    await recalculateIssue(sr, oldIssue.id);
    await sr.entities.ActivityEvent.create({
      project_id: submission.project_id, owner_id: owner, issue_id: separated.id, submission_id: submission.id,
      event_type: "report_separated", actor_type: "owner", actor_id: owner,
      internal_message: `Report separated from ${oldIssue.public_code} into ${separated.public_code}.`, created_at: nowIso,
    });
    return json({ success: true, issueId: separated.id });
  } catch (err) {
    const message = errorMessage(err);
    return error(message, message.includes("access denied") ? 403 : 500);
  }
});
