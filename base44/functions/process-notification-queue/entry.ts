import { createClientFromRequest } from "npm:@base44/sdk";
import { resolveBackendConfiguration } from "../../shared/configuration.ts";
import { processNotificationBatch } from "../../shared/free-maintenance.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const now = new Date();
    const config = resolveBackendConfiguration({
      appBaseUrl: Deno.env.get("APP_BASE_URL"),
      notificationIntegrationEnabled: Deno.env.get("NOTIFICATION_INTEGRATION_ENABLED"),
      requestUrl: req.url,
    });
    const counts = await processNotificationBatch(sr, {
      now,
      appBaseUrl: config.appBaseUrl,
      runtimeDeliveryEnabled: config.notificationIntegrationEnabled,
      emailAdapter: { send: (input) => base44.integrations.Core.SendEmail(input) },
    });
    return json({ success: true, ...counts });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
