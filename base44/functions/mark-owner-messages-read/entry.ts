import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { error, errorMessage, json } from "../../shared/response.ts";
import { ownerOwnsProject } from "../../shared/reporter-workflow.ts";

const schema = z.object({ projectId: z.string().min(1), messageIds: z.array(z.string().min(1)).min(1).max(100) });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return error("Authentication required", 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid read request", 400);
    const sr = base44.asServiceRole;
    const project = await sr.entities.Project.get(parsed.data.projectId).catch(() => null);
    if (!ownerOwnsProject(user.email, project)) return error("Project not found or access denied", 403);
    let updated = 0;
    for (const id of [...new Set(parsed.data.messageIds)]) {
      const message = await sr.entities.ReporterMessage.get(id).catch(() => null);
      if (!message || message.project_id !== project.id || message.owner_id !== user.email) return error("Message not found or access denied", 403);
      if (!message.is_read_by_owner) { await sr.entities.ReporterMessage.update(id, { is_read_by_owner: true }); updated += 1; }
    }
    return json({ success: true, updated });
  } catch (err) { return error(errorMessage(err), 500); }
});
