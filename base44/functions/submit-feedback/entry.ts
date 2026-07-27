import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { json, error, errorMessage } from "../../shared/response.ts";
import { generateTrackingToken, sha256Hex } from "../../shared/crypto.ts";
import { canAssociateAttachment, MAX_ATTACHMENTS } from "../../shared/attachment-security.ts";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const payloadSchema = z.object({
  projectSlug: z.string().min(1),
  submissionKey: z.string().uuid(),
  type: z.enum(["bug", "feature", "general"]),
  description: z.string().min(1).max(5000),
  expectedBehavior: z.string().max(5000).optional(),
  reproductionSteps: z.string().max(5000).optional(),
  pageUrl: z.string().max(2000).optional(),
  reporterEmail: z.string().email().max(320).optional(),
  emailUpdatesEnabled: z.boolean().optional(),
  browserName: z.string().max(120).optional(),
  browserVersion: z.string().max(120).optional(),
  operatingSystem: z.string().max(120).optional(),
  deviceType: z.string().max(80).optional(),
  screenWidth: z.number().int().min(0).max(20000).optional(),
  screenHeight: z.number().int().min(0).max(20000).optional(),
  viewportWidth: z.number().int().min(0).max(20000).optional(),
  viewportHeight: z.number().int().min(0).max(20000).optional(),
  contextIncluded: z.boolean().optional(),
  attachmentIds: z.array(z.string().min(1)).max(MAX_ATTACHMENTS).default([]),
  // Honeypot: real users never fill this hidden field.
  website: z.string().optional(),
});

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return error("Invalid submission payload", 400);
    }
    const input = parsed.data;

    // Honeypot tripped — pretend success without creating anything.
    if (input.website && input.website.trim() !== "") {
      return json({ success: true, duplicate: true });
    }

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // 1. Validate the active project by slug.
    const projects = await sr.entities.Project.filter({ slug: input.projectSlug });
    const project = projects[0];
    if (!project || project.is_active === false) {
      return error("Project not found or not accepting reports", 404);
    }
    if (project.allow_anonymous === false) {
      return error("This project is not accepting anonymous feedback", 403);
    }
    const enabledTypes = project.feedback_types_enabled ?? ["bug", "feature", "general"];
    if (!enabledTypes.includes(input.type)) {
      return error("This feedback type is not enabled", 400);
    }

    const ownerId: string = project.created_by ?? project.owner_id ?? "";
    const projectId: string = project.id;

    const uniqueAttachmentIds = [...new Set(input.attachmentIds)];
    if (uniqueAttachmentIds.length !== input.attachmentIds.length) return error("Duplicate attachment association", 400);
    const requestedAttachments = await Promise.all(uniqueAttachmentIds.map((id) => sr.entities.FeedbackAttachment.get(id).catch(() => null)));
    if (requestedAttachments.some((item) => !item || !canAssociateAttachment(projectId, input.submissionKey, item))) {
      return error("Invalid attachment association", 400);
    }

    // 2. Idempotency: a retry with the same key must not create a second report.
    const existing = await sr.entities.FeedbackSubmission.filter({
      project_id: projectId,
      submission_key: input.submissionKey,
    });
    if (existing[0]) {
      await Promise.all(requestedAttachments.filter(Boolean).map((attachment) =>
        attachment.submission_id === existing[0].id ? Promise.resolve() : sr.entities.FeedbackAttachment.update(attachment.id, { submission_id: existing[0].id })
      ));
      const priorLinks = await sr.entities.IssueReport.filter({
        submission_id: existing[0].id,
      });
      let priorCode: string | null = null;
      if (priorLinks[0]) {
        const priorIssue = await sr.entities.Issue.get(priorLinks[0].issue_id);
        priorCode = priorIssue?.public_code ?? null;
      }
      return json({
        success: true,
        duplicate: true,
        submissionRef: existing[0].id,
        publicCode: priorCode,
        trackingUrl: null,
      });
    }

    const nowIso = new Date().toISOString();

    // 3. Create the submission (original text preserved verbatim).
    const submission = await sr.entities.FeedbackSubmission.create({
      project_id: projectId,
      owner_id: ownerId,
      submission_key: input.submissionKey,
      type: input.type,
      description: input.description,
      expected_behavior: input.expectedBehavior,
      reproduction_steps: input.reproductionSteps,
      page_url: input.pageUrl,
      reporter_email: project.collect_reporter_email === false ? undefined : input.reporterEmail,
      reporter_email_hash: input.reporterEmail ? await sha256Hex(input.reporterEmail.trim().toLowerCase()) : undefined,
      browser_name: input.browserName,
      browser_version: input.browserVersion,
      operating_system: input.operatingSystem,
      device_type: input.deviceType,
      screen_width: input.screenWidth,
      screen_height: input.screenHeight,
      viewport_width: input.viewportWidth,
      viewport_height: input.viewportHeight,
      context_included: input.contextIncluded === true,
      processing_status: "pending",
      processing_attempts: 0,
      created_at: nowIso,
    });

    // Associate only prevalidated, idempotently uploaded private files. Creation
    // of the submission is the finalization point that activates processing.
    await Promise.all(requestedAttachments.filter(Boolean).map((attachment) =>
      sr.entities.FeedbackAttachment.update(attachment.id, { submission_id: submission.id, attachment_purpose: "initial_report" })
    ));

    // 4. Create the private tracking grant (store only the hash).
    const rawToken = generateTrackingToken();
    const tokenHash = await sha256Hex(rawToken);
    await sr.entities.ReporterAccess.create({
      project_id: projectId,
      owner_id: ownerId,
      submission_id: submission.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      email_updates_enabled:
        project.collect_reporter_email !== false &&
        input.emailUpdatesEnabled === true &&
        !!input.reporterEmail,
      created_at: nowIso,
    });

    // 5. Append receipt activity. Intelligence processing adds later events.
    await sr.entities.ActivityEvent.create({
      project_id: projectId,
      owner_id: ownerId,
      submission_id: submission.id,
      event_type: "feedback_received",
      actor_type: "reporter",
      actor_id: "reporter",
      public_message: "Your feedback was received.",
      created_at: nowIso,
    });
    // 6. Return immediately. Processing is triggered independently by the client
    // and by the deployed entity automation; the reporter never waits on AI.
    return json({
      success: true,
      duplicate: false,
      submissionRef: submission.id,
      publicCode: null,
      trackingToken: rawToken,
      trackingUrl: `/track/${rawToken}`,
    });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
