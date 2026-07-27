import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { ownerOwnsProject } from "../../shared/reporter-workflow.ts";
import { ownerCanRetryNotification } from "../../shared/notifications.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req); let owner: string | null = null;
    try { owner = (await base44.auth.me())?.email ?? null; } catch { owner = null; }
    if (!owner) return error("Authentication required", 401);
    const parsed = z.object({ deliveryId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid retry request", 400);
    const sr = base44.asServiceRole; const delivery = await sr.entities.NotificationDelivery.get(parsed.data.deliveryId).catch(() => null);
    const project = delivery ? await sr.entities.Project.get(delivery.project_id).catch(() => null) : null;
    if (!delivery || !ownerOwnsProject(owner, project)) return error("Delivery not found", 404);
    if (!ownerCanRetryNotification(owner, project, delivery)) return error("Only failed or dead-letter deliveries can be retried", 409);
    const nowIso = new Date().toISOString();
    const updated = await sr.entities.NotificationDelivery.update(delivery.id, {
      status: "pending", next_attempt_at: nowIso, last_error_code: undefined, last_error_message: undefined,
      sending_started_at: undefined, lease_expires_at: undefined, updated_at: nowIso,
    });
    await sr.entities.ActivityEvent.create({
      project_id: delivery.project_id, owner_id: owner, issue_id: delivery.issue_id, submission_id: delivery.submission_id,
      event_type: "notification_retried", actor_type: "owner", actor_id: owner,
      metadata: { deliveryId: delivery.id, preservedAttemptCount: delivery.attempt_count ?? 0 }, created_at: nowIso,
    });
    return json({ success: true, delivery: updated });
  } catch (err) { return error(errorMessage(err), 500); }
});
