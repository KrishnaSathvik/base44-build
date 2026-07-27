import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { loadTrackingContext, TrackingAccessError } from "../../shared/reporter-workflow.ts";
import { buildTrackingProjection } from "../../shared/tracking-projection.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

const schema = z.object({ token: z.string().min(1) });

Deno.serve(async (req) => {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid request", 400);
    const sr = createClientFromRequest(req).asServiceRole;
    const { grant, submission, issue } = await loadTrackingContext(sr, parsed.data.token);
    await sr.entities.ReporterAccess.update(grant.id, { last_accessed_at: new Date().toISOString() }).catch(() => {});
    const messages = await sr.entities.ReporterMessage.filter({ submission_id: submission.id });
    await Promise.all(messages.filter((message: Record<string, unknown>) => message.visibility === "public" && message.sender_type !== "reporter" && message.is_read_by_reporter !== true).map((message: Record<string, any>) => sr.entities.ReporterMessage.update(message.id, { is_read_by_reporter: true })));
    return json(await buildTrackingProjection(sr, submission, issue));
  } catch (err) {
    if (err instanceof TrackingAccessError) return error(err.message, err.status);
    return error(errorMessage(err), 500);
  }
});
