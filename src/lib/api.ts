import { base44 } from '@/api/base44Client';
import type {
  ActivityEvent,
  DuplicateSuggestion,
  FeedbackSubmission,
  FeedbackType,
  Issue,
  IntelligenceSubmission,
  IntelligenceIssueReport,
  Project,
  PublicProject,
  SubmitFeedbackResult,
  TrackingView,
} from '@/lib/types';

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
}

export type GroupingAction =
  | { action: 'accept'; suggestionId: string }
  | { action: 'reject'; suggestionId: string }
  | { action: 'merge'; sourceIssueId: string; targetIssueId: string }
  | { action: 'move'; submissionId: string; targetIssueId: string }
  | { action: 'separate'; submissionId: string };

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

export async function processFeedback(submissionId: string, retry = false): Promise<void> {
  await stageFunctions.invoke('process-feedback', { submissionId, retry });
}

// ---- Authenticated owner: backend function ----

export async function resolveIssue(
  issueId: string,
  publicResolutionNote: string,
): Promise<Issue> {
  const res = await base44.functions.invoke('resolve-issue', {
    issueId,
    publicResolutionNote,
  });
  return res.data.issue as Issue;
}

export async function reviewGrouping(action: GroupingAction): Promise<void> {
  await stageFunctions.invoke('review-grouping', action);
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
  });
}

export interface UpdateProjectSettingsInput {
  name: string;
  productUrl?: string;
  description?: string;
  feedbackTypesEnabled: FeedbackType[];
  allowAnonymous: boolean;
  collectReporterEmail: boolean;
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
  });
}

export async function listMyProjects(): Promise<Project[]> {
  return base44.entities.Project.list('-created_date');
}

export async function listMyIssues(): Promise<Issue[]> {
  return base44.entities.Issue.list('-created_date', 200);
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
