import { createClientFromRequest } from "npm:@base44/sdk";
import { z } from "npm:zod";
import { error, errorMessage, json } from "../../shared/response.ts";
import { sha256Hex } from "../../shared/crypto.ts";
import { accessGrantIsExpired, reporterCanAccessAttachment, SIGNED_URL_TTL_SECONDS } from "../../shared/attachment-security.ts";

const schema = z.object({ token: z.string().min(1), attachmentKey: z.string().min(1) });

Deno.serve(async (req) => {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Invalid request", 400);
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const tokenHash = await sha256Hex(parsed.data.token);
    const grant = (await sr.entities.ReporterAccess.filter({ token_hash: tokenHash }))[0] as { project_id: string; submission_id: string; expires_at?: string; revoked_at?: string } | undefined;
    if (!grant) return error("Invalid or unknown tracking link", 404);
    if (grant.revoked_at) return error("This tracking link has been revoked", 410);
    if (accessGrantIsExpired(grant.expires_at)) return error("This tracking link has expired", 410);
    const attachment = (await sr.entities.FeedbackAttachment.filter({ attachment_key: parsed.data.attachmentKey, project_id: grant.project_id }))[0] as {
      project_id: string; owner_id: string; submission_id: string; upload_status: string; file_uri: string;
    } | undefined;
    if (!attachment || !reporterCanAccessAttachment(grant, attachment)) return error("Attachment unavailable", 404);
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
