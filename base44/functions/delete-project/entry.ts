import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { PROJECT_CHILD_ENTITIES, projectDeleteConfirmationMatches } from "../../shared/project-delete.ts";
import { ownerOwnsProject } from "../../shared/reporter-workflow.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

const payloadSchema = z.object({
  projectId: z.string().min(1),
  confirmationName: z.string().min(1).max(80),
});

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return error("Method not allowed", 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return error("Authentication required", 401);

    const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid delete request", 400);

    const sr = base44.asServiceRole;
    const project = await sr.entities.Project.get(parsed.data.projectId).catch(() => null);
    if (!project) return error("Project not found", 404);
    if (!ownerOwnsProject(user.email, project)) {
      return error("You do not have access to this project", 403);
    }
    if (!projectDeleteConfirmationMatches(project.name, parsed.data.confirmationName)) {
      return error("Type the exact project name to confirm deletion", 400);
    }

    let removedRecords = 0;
    for (const name of PROJECT_CHILD_ENTITIES) {
      const entity = sr.entities[name];
      if (!entity?.filter || !entity?.delete) continue;
      const rows = await entity.filter({ project_id: project.id });
      for (const row of rows) {
        await entity.delete(row.id);
        removedRecords += 1;
      }
    }

    await sr.entities.Project.delete(project.id);

    return json({
      success: true,
      projectId: project.id,
      projectName: project.name,
      removedRecords,
    });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
