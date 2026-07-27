import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { resolveBackendConfiguration } from "../../shared/configuration.ts";
import { dispatchNotificationDelivery } from "../../shared/notification-dispatch.ts";
import { ownerOwnsProject } from "../../shared/reporter-workflow.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => null);
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const parsed = z.object({ deliveryId: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return error("Invalid delivery request", 400);
    let owner: string | null = null;
    try { owner = (await base44.auth.me())?.email ?? null; } catch { owner = null; }
    if (!owner) return error("Authentication required", 401);
    const delivery = await sr.entities.NotificationDelivery.get(parsed.data.deliveryId).catch(() => null);
    const project = delivery ? await sr.entities.Project.get(delivery.project_id).catch(() => null) : null;
    if (!delivery || !ownerOwnsProject(owner, project)) return error("Delivery not found", 404);
    const config = resolveBackendConfiguration({
      appBaseUrl: Deno.env.get("APP_BASE_URL"),
      notificationIntegrationEnabled: Deno.env.get("NOTIFICATION_INTEGRATION_ENABLED"),
      requestUrl: req.url,
    });
    const updated = await dispatchNotificationDelivery(sr, parsed.data.deliveryId, {
      appBaseUrl: config.appBaseUrl,
      runtimeDeliveryEnabled: config.notificationIntegrationEnabled,
      emailAdapter: { send: (input) => base44.integrations.Core.SendEmail(input) },
    });
    return json({ success: true, status: updated.status });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
