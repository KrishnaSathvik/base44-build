import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { runFreeMaintenance, sanitizeMaintenanceSummary } from "../../shared/free-maintenance.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

const payloadSchema = z.object({
  projectId: z.string().min(1).optional(),
  bypassThrottle: z.boolean().optional(),
}).optional();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let owner: string | null = null;
    try { owner = (await base44.auth.me())?.email ?? null; } catch { owner = null; }
    if (!owner) return error("Authentication required", 401);

    const parsed = payloadSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return error("Invalid maintenance request", 400);

    const summary = await runFreeMaintenance({
      sr: base44.asServiceRole,
      ownerEmail: owner,
      projectId: parsed.data?.projectId,
      bypassThrottle: parsed.data?.bypassThrottle === true,
      emailAdapter: { send: (input) => base44.integrations.Core.SendEmail(input) },
      appBaseUrl: Deno.env.get("APP_BASE_URL"),
      notificationIntegrationEnabled: Deno.env.get("NOTIFICATION_INTEGRATION_ENABLED"),
      requestUrl: req.url,
    });

    if (summary.status === "unauthorized") return error("You do not have access to run maintenance", 403);
    if (summary.status === "no_project") return error("No owned project was found", 404);

    return json({ success: true, ...sanitizeMaintenanceSummary(summary) });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
