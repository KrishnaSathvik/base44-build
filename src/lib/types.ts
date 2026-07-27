import type { EntityRecord } from '@base44/sdk';

// Full record types (schema fields + server-injected id/created_date/created_by),
// sourced from the Base44-generated EntityTypeRegistry augmentation.
export type Project = EntityRecord['Project'];
export type FeedbackSubmission = EntityRecord['FeedbackSubmission'];
export type Issue = EntityRecord['Issue'];
export type IssueReport = EntityRecord['IssueReport'];
export type ActivityEvent = EntityRecord['ActivityEvent'];
export type FeedbackAttachment = EntityRecord['FeedbackAttachment'];

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

export interface TrackingView {
  reportType: FeedbackType;
  originalDescription: string;
  publicCode: string | null;
  issueTitle: string | null;
  status: string;
  publicResolutionNote: string | null;
  submittedAt: string | null;
  context: TrackingContext | null;
  attachments: TrackingAttachment[];
  activity: TrackingActivity[];
}
