import type { AttachmentSource } from '@/lib/attachments';
import type { FeedbackType } from '@/lib/types';
import { localDatabase } from '@/lib/indexedDb';

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const prefix = 'public-draft:';

export interface DraftAttachment {
  key: string;
  file: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  source: AttachmentSource;
  width?: number;
  height?: number;
}

export interface FeedbackDraft {
  projectSlug: string;
  type: FeedbackType | null;
  description: string;
  expectedBehavior: string;
  pageUrl: string;
  reporterEmail: string;
  emailUpdatesEnabled: boolean;
  includePage: boolean;
  includeEnvironment: boolean;
  context: Record<string, string | number | undefined>;
  attachments: DraftAttachment[];
  submissionKey: string;
  lastUpdated: number;
}

export function draftKey(projectSlug: string) { return `${prefix}${projectSlug}`; }
export function isDraftExpired(draft: FeedbackDraft, now = Date.now()) { return now - draft.lastUpdated > DRAFT_TTL_MS; }

export async function loadFeedbackDraft(projectSlug: string, now = Date.now()): Promise<FeedbackDraft | null> {
  const draft = await localDatabase.get<FeedbackDraft>(draftKey(projectSlug)).catch(() => undefined);
  if (!draft || draft.projectSlug !== projectSlug) return null;
  if (isDraftExpired(draft, now)) { await discardFeedbackDraft(projectSlug); return null; }
  return draft;
}

export function saveFeedbackDraft(draft: FeedbackDraft) { return localDatabase.set(draftKey(draft.projectSlug), draft); }
export function discardFeedbackDraft(projectSlug: string) { return localDatabase.delete(draftKey(projectSlug)).catch(() => undefined); }

export function draftAttachmentFromFile(input: { key: string; file: File; source: AttachmentSource; width?: number; height?: number }): DraftAttachment {
  return { key: input.key, file: input.file, fileName: input.file.name, mimeType: input.file.type, size: input.file.size, source: input.source, width: input.width, height: input.height };
}

export function fileFromDraftAttachment(attachment: DraftAttachment): File {
  return new File([attachment.file], attachment.fileName, { type: attachment.mimeType, lastModified: Date.now() });
}
