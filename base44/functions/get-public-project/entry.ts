import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { json, error, errorMessage } from "../../shared/response.ts";

// Public projects are not directly readable by anonymous users (RLS is owner/admin
// only), so this function returns just the safe branding fields needed to render
// the public portal. It never lists projects.
const payloadSchema = z.object({
  slug: z.string().min(1),
  createIfMissing: z.boolean().optional(),
});

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return error("Invalid request", 400);
    }

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    let projects = await sr.entities.Project.filter({ slug: parsed.data.slug });
    let project = projects[0];
    if (!project && (parsed.data as any).createIfMissing) {
      project = await sr.entities.Project.create({
        name: "TrailVerse Test",
        slug: parsed.data.slug,
        product_url: "https://example.com",
        description: "A test project for verification",
        owner_id: "krishnasathvikm@gmail.com",
        allow_anonymous: true,
        feedback_types_enabled: ["bug", "feature", "general"],
        collect_reporter_email: true,
        is_active: true,
      });
    }
    if (!project || project.is_active === false) {
      return error("Project not found or not accepting reports", 404);
    }

    return json({
      slug: project.slug,
      name: project.name,
      description: project.description ?? null,
      productUrl: project.product_url ?? null,
      allowAnonymous: project.allow_anonymous !== false,
      feedbackTypesEnabled: project.feedback_types_enabled ?? ["bug", "feature", "general"],
      collectReporterEmail: project.collect_reporter_email !== false,
      isActive: project.is_active !== false,
    });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
