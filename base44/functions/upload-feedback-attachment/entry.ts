import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { error, errorMessage, json } from "../../shared/response.ts";
import { validateAttachmentFile } from "../../shared/attachment-security.ts";

const metadataSchema = z.object({
  projectSlug: z.string().min(1),
  submissionKey: z.string().uuid(),
  attachmentKey: z.string().uuid(),
  source: z.enum(["browse", "paste", "camera", "library"]),
  width: z.number().int().min(0).max(30000).optional(),
  height: z.number().int().min(0).max(30000).optional(),
});

Deno.serve(async (req) => {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const rawMetadata = form.get("metadata");
    if (!(file instanceof File) || typeof rawMetadata !== "string") return error("A screenshot and metadata are required", 400);
    const parsed = metadataSchema.safeParse(JSON.parse(rawMetadata));
    if (!parsed.success) return error("Invalid attachment metadata", 400);
    const validationError = validateAttachmentFile(file);
    if (validationError) return error(validationError, 400);

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const projects = await sr.entities.Project.filter({ slug: parsed.data.projectSlug });
    const project = projects[0];
    if (!project || project.is_active === false) return error("Project not found or not accepting reports", 404);
    if (project.allow_anonymous === false) return error("This project is not accepting anonymous feedback", 403);

    const existing = await sr.entities.FeedbackAttachment.filter({
      project_id: project.id,
      submission_key: parsed.data.submissionKey,
      attachment_key: parsed.data.attachmentKey,
    });
    if (existing[0]?.upload_status === "completed") {
      return json({ success: true, duplicate: true, attachmentId: existing[0].id });
    }

    const uploaded = await sr.integrations.Core.UploadPrivateFile({ file }) as { file_uri?: string };
    if (!uploaded?.file_uri) throw new Error("Private storage did not return a file URI");
    const attachment = await sr.entities.FeedbackAttachment.create({
      project_id: project.id,
      owner_id: project.created_by ?? project.owner_id ?? "",
      submission_id: parsed.data.submissionKey,
      submission_key: parsed.data.submissionKey,
      attachment_key: parsed.data.attachmentKey,
      file_uri: uploaded.file_uri,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      size_bytes: file.size,
      width: parsed.data.width,
      height: parsed.data.height,
      source: parsed.data.source,
      upload_status: "completed",
      created_at: new Date().toISOString(),
    });
    return json({ success: true, duplicate: false, attachmentId: attachment.id });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
