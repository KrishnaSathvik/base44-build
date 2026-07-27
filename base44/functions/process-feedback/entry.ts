import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { resolveBackendConfiguration } from "../../shared/configuration.ts";
import { createBase44LlmAdapter, processFeedbackSubmission } from "../../shared/feedback-processing.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

const payloadSchema = z.object({ submissionId: z.string().min(1), retry: z.boolean().optional(), forceFallback: z.boolean().optional() });

function legacyAutomationSubmissionId(body: any): string | null {
  // Kept for transitional payloads only. Free runtime does not register entity Workflows.
  const values = [body?.payload?.data?.id, body?.data?.id, body?.event?.data?.id, body?.event?.entity_id, body?.event?.entityId, body?.entity?.id, body?.record?.id, body?.entity_id, body?.entityId];
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}

async function currentUserEmail(base44: any): Promise<string | null> {
  try { return (await base44.auth.me())?.email ?? null; } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    const submissionId = parsed.success ? parsed.data.submissionId : legacyAutomationSubmissionId(body);
    if (!submissionId) return error("Invalid processing request", 400);
    const config = resolveBackendConfiguration({
      appBaseUrl: Deno.env.get("APP_BASE_URL"),
      notificationIntegrationEnabled: Deno.env.get("NOTIFICATION_INTEGRATION_ENABLED"),
      requestUrl: req.url,
    });
    const result = await processFeedbackSubmission({
      sr,
      submissionId,
      llm: createBase44LlmAdapter(base44),
      retry: parsed.success && parsed.data.retry === true,
      forceFallback: parsed.success && parsed.data.forceFallback === true,
      ownerEmail: await currentUserEmail(base44),
      dispatchGate: {
        appBaseUrl: config.appBaseUrl,
        runtimeDeliveryEnabled: config.notificationIntegrationEnabled,
        emailAdapter: { send: (input) => base44.integrations.Core.SendEmail(input) },
      },
    });
    if (!result.success) {
      const status = result.error === "Submission not found" ? 404
        : result.error?.includes("already processing") ? 409
        : result.error?.includes("Only the project owner") ? 403
        : 500;
      return error(result.error ?? "Processing failed", status);
    }
    return json({
      success: true,
      idempotent: result.idempotent,
      outcome: result.outcome,
      issueId: result.issueId,
      analysisMode: result.analysisMode,
      duplicateMode: result.duplicateMode,
    });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
