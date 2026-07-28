import { base44 } from '@/api/base44Client';
import type {
  ActivityEvent,
  DuplicateSuggestion,
  FeedbackSubmission,
  FeedbackAttachment,
  FeedbackType,
  Issue,
  IntelligenceSubmission,
  IntelligenceIssueReport,
  Project,
  PublicProject,
  SubmitFeedbackResult,
  TrackingView,
  AttachmentAccess,
  IssueStatus,
  ReporterMessage,
  WorkflowIssue,
  NotificationDelivery,
} from '@/lib/types';
import type { AttachmentSource } from '@/lib/attachments';

// Stage resources exist in the local schemas before the generated Base44
// registry is refreshed during the eventual deployment workflow.
const stageFunctions = base44.functions as unknown as {
  invoke: (name: string, payload: unknown) => Promise<{ data: unknown }>;
};

/** Extract a human-readable error message from a thrown functions.invoke error. */
export function apiErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
    return anyErr.response?.data?.error ?? anyErr.message ?? 'Something went wrong';
  }
  return 'Something went wrong';
}

// ---- Public (anonymous) backend functions ----

export interface SubmitFeedbackPayload {
  projectSlug: string;
  submissionKey: string;
  type: FeedbackType;
  description: string;
  expectedBehavior?: string;
  pageUrl?: string;
  reporterEmail?: string;
  emailUpdatesEnabled?: boolean;
  /** Honeypot — left empty by real users; a value signals a bot. */
  website?: string;
  browserName?: string;
  browserVersion?: string;
  operatingSystem?: string;
  deviceType?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  contextIncluded?: boolean;
  attachmentIds?: string[];
}

export interface UploadFeedbackAttachmentPayload {
  projectSlug: string;
  submissionKey: string;
  attachmentKey: string;
  source: AttachmentSource;
  width?: number;
  height?: number;
  file: File;
}

export interface UploadFollowUpAttachmentPayload {
  token: string;
  followUpKey: string;
  attachmentKey: string;
  source: AttachmentSource;
  width?: number;
  height?: number;
  file: File;
}

export type GroupingAction =
  | { action: 'accept'; suggestionId: string }
  | { action: 'reject'; suggestionId: string }
  | { action: 'merge'; sourceIssueId: string; targetIssueId: string }
  | { action: 'move'; submissionId: string; targetIssueId: string }
  | { action: 'separate'; submissionId: string }
  | {
      action: 'correct_classification';
      issueId: string;
      feedbackType?: 'bug' | 'feature' | 'general';
      category?: 'ui_ux' | 'functionality' | 'performance' | 'authentication' | 'data' | 'content' | 'other';
      productArea?: string;
      severity?: 'critical' | 'high' | 'medium' | 'low';
    };

export async function submitFeedback(
  payload: SubmitFeedbackPayload,
): Promise<SubmitFeedbackResult> {
  const res = await base44.functions.invoke('submit-feedback', payload);
  return res.data as SubmitFeedbackResult;
}

export async function getPublicProject(slug: string): Promise<PublicProject> {
  const res = await base44.functions.invoke('get-public-project', { slug });
  return res.data as PublicProject;
}

export async function accessTrackingPage(token: string): Promise<TrackingView> {
  const res = await base44.functions.invoke('access-tracking-page', { token });
  return res.data as TrackingView;
}

export async function uploadFeedbackAttachment(payload: UploadFeedbackAttachmentPayload): Promise<{ attachmentId: string; duplicate: boolean }> {
  const { file, ...metadata } = payload;
  const res = await stageFunctions.invoke('upload-feedback-attachment', { file, metadata: { ...metadata, purpose: 'initial_report' } });
  return res.data as { attachmentId: string; duplicate: boolean };
}

export async function uploadFollowUpAttachment(payload: UploadFollowUpAttachmentPayload): Promise<{ attachmentId: string; duplicate: boolean }> {
  const { file, ...metadata } = payload;
  const res = await stageFunctions.invoke('upload-feedback-attachment', { file, metadata: { ...metadata, purpose: 'reporter_follow_up' } });
  return res.data as { attachmentId: string; duplicate: boolean };
}

export async function addReporterFollowUp(input: { token: string; idempotencyKey: string; body: string; resolvedFollowUpType?: 'general' | 'not_fixed'; attachmentIds?: string[] }): Promise<TrackingView> {
  const res = await stageFunctions.invoke('add-reporter-follow-up', input);
  return (res.data as { tracking: TrackingView }).tracking;
}

export async function confirmResolution(input: { token: string; idempotencyKey: string; choice: 'fixed' | 'not_fixed'; explanation?: string }): Promise<TrackingView> {
  const res = await stageFunctions.invoke('confirm-resolution', input);
  return (res.data as { tracking: TrackingView }).tracking;
}

export async function disableReporterEmailConsent(token: string): Promise<TrackingView> {
  const res = await stageFunctions.invoke('disable-reporter-email-consent', { token });
  return (res.data as { tracking: TrackingView }).tracking;
}

export async function getReporterAttachmentAccess(token: string, attachmentKey: string): Promise<AttachmentAccess> {
  const res = await stageFunctions.invoke('get-reporter-attachment-access', { token, attachmentKey });
  return res.data as AttachmentAccess;
}

export async function processFeedback(submissionId: string, retry = false): Promise<void> {
  await stageFunctions.invoke('process-feedback', { submissionId, retry });
}

export interface FreeMaintenanceResult {
  success: boolean;
  status: 'ran' | 'already_running' | 'recently_run' | 'unauthorized' | 'no_project';
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  deadLettered: number;
  reconciled: number;
  digestsQueued: number;
  digestsSkippedEmpty: number;
  digestsDuplicate: number;
  projectsChecked: number;
  orphanAttachments: number;
  lastAttemptAt?: string | null;
  lastSuccessAt?: string | null;
  leaseExpiresAt?: string | null;
  emailDeliveryDisabled: boolean;
}

export async function runFreeMaintenance(input: { projectId?: string; bypassThrottle?: boolean } = {}): Promise<FreeMaintenanceResult> {
  const res = await stageFunctions.invoke('run-free-maintenance', input);
  return res.data as FreeMaintenanceResult;
}

// ---- Authenticated owner: backend function ----

export interface UpdateIssueStatusInput {
  issueId: string;
  status: IssueStatus;
  publicMessage?: string;
  internalNote?: string;
  reason?: string;
  directResolutionOverrideReason?: string;
  duplicateOfIssueId?: string;
  assigneeId?: string;
}

export async function updateIssueStatus(input: UpdateIssueStatusInput): Promise<WorkflowIssue> {
  const res = await stageFunctions.invoke('update-issue-status', input);
  return (res.data as { issue: WorkflowIssue }).issue;
}

export async function reviewGrouping(action: GroupingAction): Promise<void> {
  await stageFunctions.invoke('review-grouping', action);
}

export async function getAttachmentAccess(attachmentId: string): Promise<AttachmentAccess> {
  const res = await stageFunctions.invoke('get-attachment-access', { attachmentId });
  return res.data as AttachmentAccess;
}

// ---- Authenticated owner: direct entity access (RLS-scoped to the owner) ----

export interface CreateProjectInput {
  name: string;
  slug: string;
  productUrl?: string;
  description?: string;
}

export async function createProject(
  input: CreateProjectInput,
  ownerEmail: string,
): Promise<Project> {
  return base44.entities.Project.create({
    name: input.name,
    slug: input.slug,
    product_url: input.productUrl,
    description: input.description,
    owner_id: ownerEmail,
    allow_anonymous: true,
    feedback_types_enabled: ['bug', 'feature', 'general'],
    collect_reporter_email: true,
    is_active: true,
    notification_delivery_enabled: false,
    critical_alerts_enabled: true,
    owner_reply_alerts_enabled: true,
    reporter_status_emails_enabled: true,
    daily_digest_enabled: false,
    daily_digest_include_empty: false,
    digest_timezone: 'UTC',
    digest_hour_local: 9,
  } as Parameters<typeof base44.entities.Project.create>[0]);
}

export interface UpdateProjectSettingsInput {
  name: string;
  productUrl?: string;
  description?: string;
  feedbackTypesEnabled: FeedbackType[];
  allowAnonymous: boolean;
  collectReporterEmail: boolean;
}

export interface UpdateNotificationSettingsInput {
  notificationDeliveryEnabled: boolean;
  criticalAlertsEnabled: boolean;
  ownerReplyAlertsEnabled: boolean;
  reporterStatusEmailsEnabled: boolean;
  dailyDigestEnabled: boolean;
  dailyDigestIncludeEmpty: boolean;
  digestTimezone: string;
  digestHourLocal: number;
}

export async function updateProjectSettings(
  projectId: string,
  input: UpdateProjectSettingsInput,
): Promise<Project> {
  return base44.entities.Project.update(projectId, {
    name: input.name,
    product_url: input.productUrl,
    description: input.description,
    feedback_types_enabled: input.feedbackTypesEnabled,
    allow_anonymous: input.allowAnonymous,
    collect_reporter_email: input.collectReporterEmail,
  } as Parameters<typeof base44.entities.Project.update>[1]);
}

export interface DeleteProjectResult {
  success: boolean;
  projectId: string;
  projectName: string;
  removedRecords: number;
}

export async function deleteProject(
  projectId: string,
  confirmationName: string,
): Promise<DeleteProjectResult> {
  const res = await stageFunctions.invoke('delete-project', { projectId, confirmationName });
  return res.data as DeleteProjectResult;
}

export async function updateNotificationSettings(
  projectId: string,
  input: UpdateNotificationSettingsInput,
): Promise<void> {
  await stageFunctions.invoke('update-notification-settings', {
    projectId,
    notificationDeliveryEnabled: input.notificationDeliveryEnabled,
    criticalAlertsEnabled: input.criticalAlertsEnabled,
    ownerReplyAlertsEnabled: input.ownerReplyAlertsEnabled,
    reporterStatusEmailsEnabled: input.reporterStatusEmailsEnabled,
    dailyDigestEnabled: input.dailyDigestEnabled,
    dailyDigestIncludeEmpty: input.dailyDigestIncludeEmpty,
    digestTimezone: input.digestTimezone,
    digestHourLocal: input.digestHourLocal,
  });
}

export async function listMyProjects(): Promise<Project[]> {
  return base44.entities.Project.list('-created_date');
}

export async function listMyNotificationDeliveries(): Promise<NotificationDelivery[]> {
  const entities = base44.entities as unknown as { NotificationDelivery: { list: (sort?: string, limit?: number) => Promise<NotificationDelivery[]> } };
  return entities.NotificationDelivery.list('-created_at', 200);
}

export async function retryNotification(deliveryId: string): Promise<NotificationDelivery> {
  const res = await stageFunctions.invoke('retry-notification', { deliveryId });
  return (res.data as { delivery: NotificationDelivery }).delivery;
}

export async function listMyIssues(): Promise<Issue[]> {
  return base44.entities.Issue.list('-created_date', 200);
}

export async function listMyReporterMessages(): Promise<ReporterMessage[]> {
  const entities = base44.entities as unknown as { ReporterMessage: { list: (sort?: string, limit?: number) => Promise<ReporterMessage[]> } };
  return entities.ReporterMessage.list('-created_at', 500);
}

export async function getReporterMessagesForIssue(issueId: string): Promise<ReporterMessage[]> {
  const entities = base44.entities as unknown as { ReporterMessage: { filter: (query: Record<string, unknown>, sort?: string) => Promise<ReporterMessage[]> } };
  return entities.ReporterMessage.filter({ issue_id: issueId }, 'created_at');
}

export async function markOwnerMessagesRead(projectId: string, messageIds: string[]): Promise<void> {
  await stageFunctions.invoke('mark-owner-messages-read', { projectId, messageIds });
}

export async function listMySubmissions(): Promise<IntelligenceSubmission[]> {
  return base44.entities.FeedbackSubmission.list('-created_date', 200) as Promise<IntelligenceSubmission[]>;
}

export async function listMyIssueReports(): Promise<IntelligenceIssueReport[]> {
  return base44.entities.IssueReport.list('-created_date', 500) as Promise<IntelligenceIssueReport[]>;
}

export async function listMyDuplicateSuggestions(): Promise<DuplicateSuggestion[]> {
  const entities = base44.entities as unknown as {
    DuplicateSuggestion: { list: (sort?: string, limit?: number) => Promise<DuplicateSuggestion[]> };
  };
  return entities.DuplicateSuggestion.list('-created_date', 200);
}

export async function listMyAttachments(): Promise<FeedbackAttachment[]> {
  return base44.entities.FeedbackAttachment.list('-created_date', 500);
}

export async function getAttachmentsForSubmission(submissionId: string): Promise<FeedbackAttachment[]> {
  return base44.entities.FeedbackAttachment.filter({ submission_id: submissionId }, 'created_date');
}

export async function getIssue(id: string): Promise<Issue> {
  return base44.entities.Issue.get(id);
}

export async function getReportsForIssue(issueId: string): Promise<IntelligenceIssueReport[]> {
  return base44.entities.IssueReport.filter({ issue_id: issueId }) as Promise<IntelligenceIssueReport[]>;
}

export async function getSubmission(id: string): Promise<FeedbackSubmission> {
  return base44.entities.FeedbackSubmission.get(id);
}

export async function getActivityForIssue(issueId: string): Promise<ActivityEvent[]> {
  return base44.entities.ActivityEvent.filter({ issue_id: issueId }, 'created_date');
}
