import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { loadTrackingContext, TrackingAccessError } from "../../shared/reporter-workflow.ts";
import { buildTrackingProjection } from "../../shared/tracking-projection.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

Deno.serve(async (req) => {
  try {
    const parsed = z.object({ token: z.string().min(1) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid request", 400);
    const sr = createClientFromRequest(req).asServiceRole;
    const { submission, issue } = await loadTrackingContext(sr, parsed.data.token);
    if (submission.reporter_email_updates_enabled === true) {
      const nowIso = new Date().toISOString();
      await sr.entities.FeedbackSubmission.update(submission.id, { reporter_email_updates_enabled: false });
      await sr.entities.ActivityEvent.create({
        project_id: submission.project_id, owner_id: submission.owner_id, issue_id: issue.id, submission_id: submission.id,
        event_type: "email_consent_disabled", actor_type: "reporter", actor_id: "reporter",
        public_message: "Email updates were disabled for this report.", created_at: nowIso,
      });
    }
    const updated = await sr.entities.FeedbackSubmission.get(submission.id);
    return json({ success: true, tracking: await buildTrackingProjection(sr, updated, issue) });
  } catch (err) {
    if (err instanceof TrackingAccessError) return error(err.message, err.status);
    return error(errorMessage(err), 500);
  }
});
