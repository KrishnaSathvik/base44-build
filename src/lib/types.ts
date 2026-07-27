import type { EntityRecord } from '@base44/sdk';

// Full record types (schema fields + server-injected id/created_date/created_by),
// sourced from the Base44-generated EntityTypeRegistry augmentation.
export type Project = EntityRecord['Project'];
export type FeedbackSubmission = EntityRecord['FeedbackSubmission'];
export type Issue = EntityRecord['Issue'];
export type IssueReport = EntityRecord['IssueReport'];
export type ActivityEvent = EntityRecord['ActivityEvent'];
export type FeedbackAttachment = EntityRecord['FeedbackAttachment'];
export type IssueStatus = 'unreviewed' | 'needs_info' | 'open' | 'planned' | 'in_progress' | 'testing' | 'resolved' | 'reopened' | 'duplicate' | 'dismissed';
export type ResolutionConfirmationStatus = 'not_requested' | 'pending' | 'confirmed' | 'not_fixed';

export interface NotificationProjectSettings {
  notification_delivery_enabled?: boolean;
  critical_alerts_enabled?: boolean;
  owner_reply_alerts_enabled?: boolean;
  reporter_status_emails_enabled?: boolean;
  daily_digest_enabled?: boolean;
  daily_digest_include_empty?: boolean;
  digest_timezone?: string;
  digest_hour_local?: number;
  maintenance_last_attempt_at?: string;
  maintenance_last_success_at?: string;
  maintenance_last_summary?: {
    processed?: number;
    failed?: number;
    skipped?: number;
    digestsQueued?: number;
    emailDeliveryDisabled?: boolean;
  };
}
export type NotificationProject = Project & NotificationProjectSettings;

export interface NotificationDelivery {
  id: string;
  project_id: string;
  owner_id: string;
  issue_id?: string;
  submission_id?: string;
  activity_event_id?: string;
  reporter_message_id?: string;
  recipient_type: 'owner' | 'reporter';
  template_key: 'owner_critical_issue' | 'owner_reporter_reply' | 'reporter_information_requested' | 'reporter_status_update' | 'reporter_issue_resolved' | 'reporter_issue_reopened' | 'owner_daily_digest';
  channel: 'email';
  dedupe_key: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped' | 'dead_letter';
  attempt_count?: number;
  next_attempt_at?: string;
  last_attempt_at?: string;
  sent_at?: string;
  last_error_code?: string;
  last_error_message?: string;
  created_at?: string;
  created_date?: string;
}

export type WorkflowIssue = Issue & {
  status: IssueStatus;
  status_reason?: string;
  assignee_id?: string;
  planned_at?: string;
  work_started_at?: string;
  testing_started_at?: string;
  reopened_at?: string;
  dismissed_at?: string;
  duplicate_of_issue_id?: string;
  resolution_confirmation_status?: ResolutionConfirmationStatus;
  resolution_confirmed_at?: string;
  last_owner_activity_at?: string;
  last_reporter_activity_at?: string;
};

export interface ReporterMessage {
  id: string;
  project_id: string;
  owner_id: string;
  submission_id: string;
  issue_id: string;
  sender_type: 'owner' | 'reporter' | 'system';
  sender_user_id?: string;
  message_type: 'request_information' | 'reporter_follow_up' | 'public_update' | 'resolution_note' | 'resolution_confirmation' | 'reopen_explanation';
  body: string;
  visibility: 'public' | 'internal';
  is_read_by_owner?: boolean;
  is_read_by_reporter?: boolean;
  created_at?: string;
  created_date?: string;
}

export interface DuplicateSuggestion {
  id: string;
  project_id: string;
  owner_id: string;
  submission_id: string;
  source_issue_id: string;
  candidate_issue_id: string;
  similarity_score?: number;
  matching_reasons?: string[];
  conflicting_evidence?: string[];
  threshold_version?: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  created_date?: string;
}

export type IntelligenceSubmission = FeedbackSubmission & {
  reproduction_steps?: string;
  processing_error?: string;
  processing_attempts?: number;
  processing_started_at?: string;
  processing_completed_at?: string;
  ai_summary?: string;
  ai_category?: 'ui_ux' | 'functionality' | 'performance' | 'authentication' | 'data' | 'content' | 'other';
  ai_product_area?: string;
  ai_severity?: 'critical' | 'high' | 'medium' | 'low';
  ai_severity_reasons?: string[];
  ai_keywords?: string[];
  ai_reproducibility?: 'confirmed' | 'likely' | 'unknown';
  ai_core_workflow_blocked?: boolean;
  ai_confidence?: number;
};

export type IntelligenceIssue = Issue & {
  category?: string;
  product_area?: string;
  priority_explanation?: string[];
  reproducibility?: 'confirmed' | 'likely' | 'unknown';
  core_workflow_blocked?: boolean;
};

export type IntelligenceIssueReport = IssueReport & {
  similarity_score?: number;
  matching_reasons?: string[];
  conflicting_evidence?: string[];
  threshold_version?: string;
};

export type FeedbackType = 'bug' | 'feature' | 'general';

// ---- Backend function response shapes ----

export interface SubmitFeedbackResult {
  success: boolean;
  duplicate: boolean;
  submissionRef?: string;
  publicCode?: string | null;
  trackingToken?: string;
  trackingUrl?: string | null;
  processingCompleted?: boolean;
  analysisMode?: 'ai' | 'deterministic_fallback';
}

export interface AttachmentAccess { signedUrl: string; expiresAt: string }
export interface TrackingAttachment {
  accessKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}
export interface TrackingContext {
  browserName: string | null;
  browserVersion: string | null;
  operatingSystem: string | null;
  deviceType: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  pageUrl: string | null;
}

export interface PublicProject {
  slug: string;
  name: string;
  description: string | null;
  productUrl: string | null;
  allowAnonymous: boolean;
  feedbackTypesEnabled: FeedbackType[];
  collectReporterEmail: boolean;
  isActive: boolean;
}

export interface TrackingActivity {
  eventType: string;
  message: string;
  createdAt: string | null;
}

export interface TrackingMessage {
  senderLabel: 'Product team' | 'You' | 'System';
  messageType: ReporterMessage['message_type'];
  body: string;
  createdAt: string | null;
  ownAttachments: TrackingAttachment[];
}

export interface TrackingView {
  feedbackType: FeedbackType;
  originalDescription: string;
  publicIssueCode: string | null;
  issueTitle: string | null;
  status: IssueStatus;
  publicResolutionNote: string | null;
  resolutionConfirmationStatus: ResolutionConfirmationStatus;
  createdAt: string | null;
  resolvedAt: string | null;
  reopenedAt: string | null;
  originalContext: TrackingContext | null;
  ownAttachments: TrackingAttachment[];
  publicMessages: TrackingMessage[];
  publicActivityEvents: TrackingActivity[];
  emailUpdatesEnabled?: boolean;
  canManageEmailUpdates?: boolean;
}
