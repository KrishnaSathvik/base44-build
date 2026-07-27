import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { error, errorMessage, json } from "../../shared/response.ts";
import { ownerCanAccessAttachment, SIGNED_URL_TTL_SECONDS } from "../../shared/attachment-security.ts";

const schema = z.object({ attachmentId: z.string().min(1) });

Deno.serve(async (req) => {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid request", 400);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return error("Unauthorized", 401);
    const sr = base44.asServiceRole;
    const attachment = await sr.entities.FeedbackAttachment.get(parsed.data.attachmentId).catch(() => null);
    if (!attachment) return error("Attachment unavailable", 404);
    const project = await sr.entities.Project.get(attachment.project_id).catch(() => null);
    if (!ownerCanAccessAttachment(user.email, attachment, project)) return error("Forbidden", 403);
    const access = await sr.integrations.Core.CreateFileSignedUrl({
      file_uri: attachment.file_uri,
      expires_in: SIGNED_URL_TTL_SECONDS,
    }) as { signed_url?: string };
    if (!access?.signed_url) throw new Error("Temporary attachment access could not be created");
    return json({ signedUrl: access.signed_url, expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString() });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
