import { createClientFromRequest } from "npm:@base44/sdk";
import { bestEffortEnqueue, digestIsDue, digestShouldQueue, localDateRangeUtc, notificationDedupeKey, type Row } from "../../shared/notifications.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

const PROJECT_BATCH_SIZE = 25;
const occurredSince = (row: Row, since: number) => (Date.parse(row.created_at ?? row.created_date ?? "") || 0) >= since;

Deno.serve(async (req) => {
  try {
    const sr = createClientFromRequest(req).asServiceRole; const now = new Date();
    // Sorting by the persisted scan time rotates bounded batches instead of
    // repeatedly scanning only the earliest projects within the 3-minute limit.
    const projects = await sr.entities.Project.list("last_digest_scan_at", PROJECT_BATCH_SIZE);
    let queued = 0, skippedEmpty = 0, duplicate = 0;
    for (const project of projects) {
      await sr.entities.Project.update(project.id, { last_digest_scan_at: now.toISOString() }).catch(() => undefined);
      if (project.daily_digest_enabled !== true) continue;
      const due = digestIsDue(project, now); if (!due.due || !due.localDate) continue;
      const range = localDateRangeUtc(due.localDate, project.digest_timezone ?? "UTC"); const since = range.start.getTime(); const until = range.end.getTime();
      const dedupeKey = notificationDedupeKey("digest", [project.id, due.localDate]);
      if ((await sr.entities.NotificationDelivery.filter({ project_id: project.id, dedupe_key: dedupeKey }))[0]) { duplicate += 1; continue; }
      const [submissions, issues, suggestions, messages] = await Promise.all([
        sr.entities.FeedbackSubmission.filter({ project_id: project.id }), sr.entities.Issue.filter({ project_id: project.id }),
        sr.entities.DuplicateSuggestion.filter({ project_id: project.id }), sr.entities.ReporterMessage.filter({ project_id: project.id }),
      ]);
      const inWindow = (row: Row) => occurredSince(row, since) && (Date.parse(row.created_at ?? row.created_date ?? "") || 0) < until;
      const newSubmissions = submissions.filter(inWindow);
      const newIssues = issues.filter(inWindow);
      const activeHigh = issues.filter((row: Row) => !["resolved", "dismissed", "duplicate"].includes(row.status) && ["critical", "high"].includes(row.severity));
      const pendingDuplicates = suggestions.filter((row: Row) => row.status === "pending");
      const failedProcessing = submissions.filter((row: Row) => row.processing_status === "failed");
      const unreadReplies = messages.filter((row: Row) => row.sender_type === "reporter" && row.is_read_by_owner !== true);
      const resolved = issues.filter((row: Row) => inWindow({ created_at: row.resolved_at }));
      const attentionCount = activeHigh.length + pendingDuplicates.length + failedProcessing.length + unreadReplies.length;
      if (!digestShouldQueue([attentionCount, newSubmissions.length, newIssues.length, resolved.length], project.daily_digest_include_empty === true)) {
        skippedEmpty += 1;
        await sr.entities.ActivityEvent.create({ project_id: project.id, owner_id: project.created_by ?? project.owner_id, event_type: "digest_skipped_empty", actor_type: "system", actor_id: "system", metadata: { localDate: due.localDate }, created_at: now.toISOString() });
        continue;
      }
      const topIssues = activeHigh.sort((a: Row, b: Row) => Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0)).slice(0, 5);
      const summary = `${newSubmissions.length} new submissions · ${newIssues.length} new issues · ${activeHigh.length} critical/high active · ${pendingDuplicates.length} duplicate suggestions · ${failedProcessing.length} processing failures · ${unreadReplies.length} unread replies · ${resolved.length} resolved`;
      const delivery = await bestEffortEnqueue(sr, { project, templateKey: "owner_daily_digest", recipientType: "owner", dedupeKey, payload: { productName: project.name, attentionCount, summary, topIssues: topIssues.map((issue: Row) => `${issue.public_code}: ${issue.title}`) } });
      if (delivery) queued += 1;
    }
    return json({ success: true, projectsChecked: projects.length, queued, skippedEmpty, duplicate });
  } catch (err) { return error(errorMessage(err), 500); }
});
