import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { json, error, errorMessage } from "../../shared/response.ts";

const payloadSchema = z.object({
  issueId: z.string().min(1),
  publicResolutionNote: z.string().min(1).max(2000),
});

// Statuses from which an issue may transition to "resolved".
const RESOLVABLE_FROM = new Set([
  "open",
  "unreviewed",
  "needs_info",
  "planned",
  "in_progress",
  "testing",
  "reopened",
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Require an authenticated user.
    let user: { email?: string } | null = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    if (!user?.email) {
      return error("Authentication required", 401);
    }

    const body = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return error("A non-empty public resolution note is required", 400);
    }

    const sr = base44.asServiceRole;

    // 2. Load the issue and verify the caller owns its project.
    const issue = await sr.entities.Issue.get(parsed.data.issueId);
    if (!issue) {
      return error("Issue not found", 404);
    }
    const project = await sr.entities.Project.get(issue.project_id);
    if (!project) {
      return error("Project not found", 404);
    }
    const projectOwner: string = project.created_by ?? project.owner_id ?? "";
    if (projectOwner !== user.email) {
      return error("You do not have access to this issue", 403);
    }

    // 3. Validate the transition.
    if (!RESOLVABLE_FROM.has(issue.status)) {
      return error(`An issue with status "${issue.status}" cannot be resolved`, 409);
    }

    const nowIso = new Date().toISOString();

    // 4. Update the issue.
    const updated = await sr.entities.Issue.update(issue.id, {
      status: "resolved",
      public_resolution_note: parsed.data.publicResolutionNote,
      resolved_at: nowIso,
      last_seen_at: nowIso,
    });

    // 5. Append a public activity event.
    await sr.entities.ActivityEvent.create({
      project_id: issue.project_id,
      owner_id: projectOwner,
      issue_id: issue.id,
      event_type: "issue_resolved",
      actor_type: "owner",
      actor_id: user.email,
      public_message: parsed.data.publicResolutionNote,
      internal_message: `Resolved by ${user.email}.`,
      created_at: nowIso,
    });

    return json({ success: true, issue: updated });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
