export const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;

/**
 * Private signed URLs remain valid for 45 minutes.
 *
 * This is long enough to reuse one access grant during a normal owner or
 * reporter session while keeping private-file access temporary.
 *
 * Backend functions return expiresAt using this same value, and clients refresh
 * the cached grant shortly before that timestamp.
 */
export const SIGNED_URL_TTL_SECONDS = 45 * 60;

/** Refresh cached signed URLs this far before wall-clock expiry. */
export const ATTACHMENT_ACCESS_STALE_MARGIN_MS = 60_000;

export interface AttachmentLike {
  id?: string;
  project_id: string;
  owner_id: string;
  submission_id: string;
  submission_key?: string;
  attachment_key?: string;
  upload_status: string;
}

export function validateAttachmentFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) return "Only PNG, JPEG, and WebP screenshots are supported";
  if (file.size <= 0) return "The screenshot is empty";
  if (file.size > MAX_ATTACHMENT_BYTES) return "Each screenshot must be 10 MB or smaller";
  return null;
}

export function ownerCanAccessAttachment(
  ownerEmail: string | null | undefined,
  attachment: AttachmentLike | null | undefined,
  project: { id?: string; created_by?: string; owner_id?: string } | null | undefined,
): boolean {
  return !!ownerEmail && !!attachment && !!project &&
    attachment.upload_status === "completed" &&
    attachment.project_id === project.id &&
    ownerEmail === (project.created_by ?? project.owner_id);
}

export function reporterCanAccessAttachment(
  grant: { submission_id: string } | null | undefined,
  attachment: AttachmentLike | null | undefined,
): boolean {
  return !!grant && !!attachment && attachment.upload_status === "completed" &&
    attachment.submission_id === grant.submission_id;
}

export function canAssociateAttachment(
  projectId: string,
  submissionKey: string,
  attachment: AttachmentLike,
): boolean {
  return attachment.project_id === projectId &&
    attachment.submission_key === submissionKey &&
    attachment.upload_status === "completed";
}

export function accessGrantIsExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() < now;
}

export function attachmentAccessRemainingFreshMs(expiresAt: string, now = Date.now()): number {
  return Math.max(0, new Date(expiresAt).getTime() - ATTACHMENT_ACCESS_STALE_MARGIN_MS - now);
}

export function isAttachmentAccessStale(expiresAt: string, now = Date.now()): boolean {
  return attachmentAccessRemainingFreshMs(expiresAt, now) <= 0;
}
