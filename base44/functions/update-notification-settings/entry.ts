import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { validateDigestSettings } from "../../shared/notifications.ts";
import { ownerOwnsProject } from "../../shared/reporter-workflow.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

const schema = z.object({
  projectId: z.string().min(1), notificationDeliveryEnabled: z.boolean(), criticalAlertsEnabled: z.boolean(),
  ownerReplyAlertsEnabled: z.boolean(), reporterStatusEmailsEnabled: z.boolean(), dailyDigestEnabled: z.boolean(),
  dailyDigestIncludeEmpty: z.boolean(), digestTimezone: z.string().min(1).max(120), digestHourLocal: z.number().int().min(0).max(23),
});

Deno.serve(async (req) => {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return error("Invalid notification settings", 400);
    const validation = validateDigestSettings(parsed.data.digestTimezone, parsed.data.digestHourLocal); if (validation) return error(validation, 400);
    const base44 = createClientFromRequest(req); let owner: string | null = null;
    try { owner = (await base44.auth.me())?.email ?? null; } catch { owner = null; }
    if (!owner) return error("Authentication required", 401);
    const sr = base44.asServiceRole; const project = await sr.entities.Project.get(parsed.data.projectId).catch(() => null);
    if (!ownerOwnsProject(owner, project)) return error("Project not found", 404);
    const updated = await sr.entities.Project.update(project.id, {
      notification_delivery_enabled: parsed.data.notificationDeliveryEnabled,
      critical_alerts_enabled: parsed.data.criticalAlertsEnabled,
      owner_reply_alerts_enabled: parsed.data.ownerReplyAlertsEnabled,
      reporter_status_emails_enabled: parsed.data.reporterStatusEmailsEnabled,
      daily_digest_enabled: parsed.data.dailyDigestEnabled,
      daily_digest_include_empty: parsed.data.dailyDigestIncludeEmpty,
      digest_timezone: parsed.data.digestTimezone,
      digest_hour_local: parsed.data.digestHourLocal,
    });
    return json({ success: true, project: updated });
  } catch (err) { return error(errorMessage(err), 500); }
});
