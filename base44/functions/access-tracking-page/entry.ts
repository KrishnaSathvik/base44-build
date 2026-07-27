import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { json, error, errorMessage } from "../../shared/response.ts";
import { sha256Hex } from "../../shared/crypto.ts";

const payloadSchema = z.object({
  token: z.string().min(1),
});

interface PublicActivity {
  eventType: string;
  message: string;
  createdAt: string | null;
}

// The Base44 SDK's dynamic entity access is untyped in the Deno function context
// (the generated registry augmentation applies to the frontend tsconfig only), so
// we narrow the query result to the known ActivityEvent fields we read.
interface EventRow {
  event_type: string;
  public_message?: string;
  created_at?: string;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return error("Invalid request", 400);
    }

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // Look the grant up by token hash — the raw token is never stored.
    const tokenHash = await sha256Hex(parsed.data.token);
    const grants = await sr.entities.ReporterAccess.filter({ token_hash: tokenHash });
    const grant = grants[0];
    if (!grant) {
      return error("Invalid or unknown tracking link", 404);
    }
    if (grant.expires_at && new Date(grant.expires_at).getTime() < Date.now()) {
      return error("This tracking link has expired", 410);
    }

    // Touch last-accessed (best effort; never block the read on it).
    await sr.entities.ReporterAccess.update(grant.id, {
      last_accessed_at: new Date().toISOString(),
    }).catch(() => {});

    const submission = await sr.entities.FeedbackSubmission.get(grant.submission_id);
    if (!submission) {
      return error("Report not found", 404);
    }

    const links = await sr.entities.IssueReport.filter({ submission_id: submission.id });
    const issue = links[0] ? await sr.entities.Issue.get(links[0].issue_id) : null;

    // Only events carrying a reporter-safe public_message are surfaced.
    const submissionEvents = (await sr.entities.ActivityEvent.filter(
      { submission_id: submission.id }, "created_date",
    )) as EventRow[];
    const issueEvents = issue ? (await sr.entities.ActivityEvent.filter(
      { issue_id: issue.id }, "created_date",
    )) as EventRow[] : [];
    const seen = new Set<string>();
    const activity: PublicActivity[] = [...submissionEvents, ...issueEvents]
      .filter((e) => !!e.public_message)
      .filter((e) => { const key = `${e.event_type}:${e.created_at}:${e.public_message}`; if (seen.has(key)) return false; seen.add(key); return true; })
      .map((e) => ({ eventType: e.event_type, message: e.public_message as string, createdAt: e.created_at ?? null }))
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

    // Safe projection only. No reporter email, owner identity, internal notes,
    // token hash, or internal IDs beyond the public reference.
    return json({
      submissionRef: submission.id,
      reportType: submission.type,
      originalDescription: submission.description,
      publicCode: issue?.public_code ?? null,
      issueTitle: issue?.title ?? null,
      status: issue?.status ?? "processing",
      publicResolutionNote: issue?.public_resolution_note ?? null,
      activity,
    });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
