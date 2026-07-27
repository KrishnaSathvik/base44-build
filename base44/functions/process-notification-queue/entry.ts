import { createClientFromRequest } from "npm:@base44/sdk";
import { dispatchNotificationDelivery } from "./shared/notification-dispatch.ts";
import { reconcileDuplicateDeliveries, reconcileRecentNotifications } from "./shared/notification-reconciliation.ts";
import { sendingLeaseExpired, type Row } from "./shared/notifications.ts";
import { error, errorMessage, json } from "./shared/response.ts";
import { resolveBackendConfiguration } from "./shared/configuration.ts";

const BATCH_SIZE = 20;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req); const sr = base44.asServiceRole; const now = new Date();
    const config = resolveBackendConfiguration({ appBaseUrl: Deno.env.get("APP_BASE_URL"), notificationIntegrationEnabled: Deno.env.get("NOTIFICATION_INTEGRATION_ENABLED"), requestUrl: req.url });
    const reconciled = await reconcileRecentNotifications(sr, now, 100);
    const duplicateReconciliation = await reconcileDuplicateDeliveries(sr, now, 500);
    const rows = await sr.entities.NotificationDelivery.list("created_at", 100);
    const eligible = rows.filter((row: Row) => {
      if (row.status === "pending") return !row.next_attempt_at || Date.parse(row.next_attempt_at) <= now.getTime();
      if (row.status === "failed") return !row.next_attempt_at || Date.parse(row.next_attempt_at) <= now.getTime();
      return sendingLeaseExpired(row, now);
    }).slice(0, BATCH_SIZE);
    const counts: Row = { processed: 0, sent: 0, failed: 0, skipped: 0, deadLettered: 0, reconciled, duplicateReconciliation };
    for (const row of eligible) {
      const result = await dispatchNotificationDelivery(sr, row.id, {
        now, appBaseUrl: config.appBaseUrl,
        runtimeDeliveryEnabled: config.notificationIntegrationEnabled,
        emailAdapter: { send: (input) => base44.integrations.Core.SendEmail(input) },
      });
      counts.processed += 1;
      if (result.status === "sent") counts.sent += 1;
      else if (result.status === "failed") counts.failed += 1;
      else if (result.status === "skipped") counts.skipped += 1;
      else if (result.status === "dead_letter") counts.deadLettered += 1;
    }
    return json({ success: true, ...counts });
  } catch (err) { return error(errorMessage(err), 500); }
});
