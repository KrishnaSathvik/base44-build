import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { dispatchNotificationDelivery } from "../../shared/notification-dispatch.ts";
import { ownerOwnsProject } from "../../shared/reporter-workflow.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

function automationDeliveryId(body: any): string | null {
  const values = [body?.payload?.data?.id, body?.data?.id, body?.event?.data?.id, body?.event?.entity_id, body?.event?.entityId, body?.entity?.id, body?.record?.id, body?.entity_id, body?.entityId];
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => null); const base44 = createClientFromRequest(req); const sr = base44.asServiceRole;
    let deliveryId = automationDeliveryId(body); let owner: string | null = null;
    if (!deliveryId) {
      const parsed = z.object({ deliveryId: z.string().min(1) }).safeParse(body);
      if (!parsed.success) return error("Invalid delivery request", 400);
      try { owner = (await base44.auth.me())?.email ?? null; } catch { owner = null; }
      if (!owner) return error("Authentication required", 401);
      deliveryId = parsed.data.deliveryId;
      const delivery = await sr.entities.NotificationDelivery.get(deliveryId).catch(() => null);
      const project = delivery ? await sr.entities.Project.get(delivery.project_id).catch(() => null) : null;
      if (!delivery || !ownerOwnsProject(owner, project)) return error("Delivery not found", 404);
    }
    const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? new URL(req.url).origin;
    const delivery = await dispatchNotificationDelivery(sr, deliveryId, {
      appBaseUrl, runtimeDeliveryEnabled: Deno.env.get("NOTIFICATION_INTEGRATION_ENABLED") === "true",
      emailAdapter: { send: (input) => base44.integrations.Core.SendEmail(input) },
    });
    return json({ success: true, status: delivery.status });
  } catch (err) { return error(errorMessage(err), 500); }
});
