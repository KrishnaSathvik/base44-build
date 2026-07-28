import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LockKeyhole,
  MessageSquareText,
  Quote,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getActivityForIssue,
  getAttachmentAccess,
  getAttachmentsForSubmission,
  getIssue,
  getReporterMessagesForIssue,
  getReportsForIssue,
  getSubmission,
  listMyIssues,
  markOwnerMessagesRead,
  reviewGrouping,
  updateIssueStatus,
} from '@/lib/api';
import {
  analysisModeLabel,
  categoryLabel,
  formatTime,
  severityLabel,
  statusLabel,
  typeLabel,
} from '@/lib/format';
import {
  Badge,
  Button,
  EmptyState,
  InlineError,
  Select,
  SeverityBadge,
  Skeleton,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { AttachmentGallery, type GalleryAttachment } from '@/components/AttachmentGallery';
import type { AttachmentAccessScope } from '@/lib/attachmentAccess';
import { aggregateEvidence } from '@/lib/evidence';
import type { IntelligenceSubmission, IssueStatus, ReporterMessage, WorkflowIssue } from '@/lib/types';
import { allowedTransitions } from '../../base44/shared/issue-state-machine';
import { PageMetadata } from '@/app/PageMetadata';

export function OwnerIssueDetailPage() {
  const { issueId = '' } = useParams();
  const queryClient = useQueryClient();
  const [targetStatus, setTargetStatus] = useState<IssueStatus | null>(null);
  const [publicMessage, setPublicMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [reason, setReason] = useState('');
  const [duplicateTarget, setDuplicateTarget] = useState('');
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [showUnderstanding, setShowUnderstanding] = useState(false);
  const [showEnvironment, setShowEnvironment] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const issueQuery = useQuery({ queryKey: ['issue', issueId], queryFn: () => getIssue(issueId) });
  const reportQuery = useQuery({
    queryKey: ['issue-report', issueId],
    queryFn: async () => {
      const links = await getReportsForIssue(issueId);
      return Promise.all(
        links
          .filter((link) => link.review_status !== 'rejected')
          .map(async (link) => {
            const submission = await getSubmission(link.submission_id);
            const attachments = await getAttachmentsForSubmission(submission.id);
            return {
              link,
              submission,
              attachments: attachments.filter((item) => item.upload_status === 'completed'),
            };
          }),
      );
    },
  });
  const activityQuery = useQuery({
    queryKey: ['activity', issueId],
    queryFn: () => getActivityForIssue(issueId),
  });
  const messagesQuery = useQuery({
    queryKey: ['reporter-messages', issueId],
    queryFn: () => getReporterMessagesForIssue(issueId),
  });
  const issuesQuery = useQuery({ queryKey: ['issues'], queryFn: listMyIssues });

  const mutation = useMutation({
    mutationFn: () => {
      const current = issueQuery.data as WorkflowIssue;
      return updateIssueStatus({
        issueId,
        status: targetStatus ?? current.status,
        publicMessage: publicMessage.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
        reason: reason.trim() || undefined,
        directResolutionOverrideReason:
          targetStatus === 'resolved' && ['open', 'in_progress'].includes(current.status)
            ? reason.trim() || undefined
            : undefined,
        duplicateOfIssueId: duplicateTarget || undefined,
      });
    },
    onSuccess: async () => {
      setPublicMessage('');
      setInternalNote('');
      setReason('');
      setDuplicateTarget('');
      setTargetStatus(null);
      setWorkflowError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['issue', issueId] }),
        queryClient.invalidateQueries({ queryKey: ['activity', issueId] }),
        queryClient.invalidateQueries({ queryKey: ['reporter-messages', issueId] }),
        queryClient.invalidateQueries({ queryKey: ['issues'] }),
      ]);
    },
    onError: () =>
      setWorkflowError(
        'The workflow update could not be completed. Review the required fields and try again.',
      ),
  });

  const attachmentScopeFor = useCallback(
    (item: GalleryAttachment): AttachmentAccessScope => ({ kind: 'owner', attachmentId: item.id ?? '' }),
    [],
  );
  const fetchAttachmentAccess = useCallback(async (scope: AttachmentAccessScope) => {
    switch (scope.kind) {
      case 'owner':
        return getAttachmentAccess(scope.attachmentId);
      case 'reporter':
        throw new Error('Owner attachment scope required');
      default: {
        const _exhaustive: never = scope;
        throw new Error(`Unhandled attachment scope: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }, []);

  if (issueQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-7">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (issueQuery.isError || !issueQuery.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Issue not found"
          description="This issue may have been removed or does not belong to your project."
          icon={<Quote className="h-5 w-5" />}
          action={
            <Link to="/app/issues">
              <Button variant="secondary">Back to issues</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const issue = issueQuery.data as WorkflowIssue & {
    priority_explanation?: string[];
    category?: string;
    product_area?: string;
    reproducibility?: string;
    core_workflow_blocked?: boolean;
  };
  const reports = reportQuery.data ?? [];
  const breakdown = aggregateEvidence(reports.map((item) => item.submission));
  const messages = messagesQuery.data ?? [];
  const unread = messages.filter(
    (message) => message.sender_type === 'reporter' && !message.is_read_by_owner,
  );
  const transitions = allowedTransitions(issue.status);
  const selectedStatus = targetStatus ?? issue.status;
  const primarySubmission = reports[0]?.submission as IntelligenceSubmission | undefined;
  const analysisMode = primarySubmission?.ai_analysis_mode;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-7 md:py-8">
      <PageMetadata
        title={issue.public_code}
        description={issue.description || 'Evidence-backed issue in VensaOS.'}
      />
      <Link
        to="/app/issues"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All issues
      </Link>

      <header className="border-b border-line pb-8 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="fi-mono text-[10px] text-ink-faint">{issue.public_code}</span>
          <SeverityBadge severity={issue.severity ?? 'medium'} label={severityLabel(issue.severity)} />
          <StatusBadge status={issue.status} label={statusLabel(issue.status)} />
        </div>
        <h1 className="fi-display mt-4 text-[1.75rem] font-medium leading-tight sm:text-3xl md:text-[40px]">
          {issue.title}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink-muted">
          {issue.description || 'A normalized issue created from the original report below.'}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
          <Metric value={String(issue.report_count ?? 0)} label="Reports" />
          <Metric value={String(issue.affected_user_count ?? 0)} label="Affected" />
          <Metric value={String(Math.round(issue.priority_score ?? 0))} label="Priority" />
          <Metric value={formatTime(issue.last_seen_at)} label="Last seen" />
        </div>
      </header>

      <div className="space-y-10 py-8 sm:space-y-12 sm:py-10">
        <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <p className="fi-eyebrow">Workflow</p>
          <h2 className="fi-display mt-2 text-xl font-medium sm:text-2xl">Update this issue</h2>
          <p className="mt-2 text-sm text-ink-muted">Only approved transitions are available.</p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setWorkflowError(null);
              mutation.mutate();
            }}
          >
            <label htmlFor="issue-status" className="text-sm font-medium">
              Status transition
            </label>
            <Select
              id="issue-status"
              value={selectedStatus}
              onChange={(event) => setTargetStatus(event.target.value as IssueStatus)}
            >
              <option value={issue.status}>{statusLabel(issue.status)} — current</option>
              {transitions.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </Select>
            {selectedStatus === 'duplicate' && (
              <Select
                aria-label="Canonical issue"
                value={duplicateTarget}
                onChange={(event) => setDuplicateTarget(event.target.value)}
              >
                <option value="">Choose canonical issue</option>
                {issuesQuery.data
                  ?.filter(
                    (candidate) =>
                      candidate.id !== issue.id &&
                      candidate.project_id === issue.project_id &&
                      candidate.status !== 'duplicate',
                  )
                  .map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.public_code} — {candidate.title}
                    </option>
                  ))}
              </Select>
            )}
            <label htmlFor="public-message" className="flex items-center gap-2 text-sm font-medium">
              <MessageSquareText className="h-4 w-4" />
              Public message
            </label>
            <Textarea
              id="public-message"
              value={publicMessage}
              onChange={(event) => setPublicMessage(event.target.value)}
              placeholder={
                selectedStatus === 'needs_info'
                  ? 'Ask the reporter a specific question…'
                  : selectedStatus === 'resolved'
                    ? 'Explain what changed…'
                    : 'Optional reporter-visible update…'
              }
            />
            <label htmlFor="internal-note" className="flex items-center gap-2 text-sm font-medium">
              <LockKeyhole className="h-4 w-4" />
              Internal note
            </label>
            <Textarea
              id="internal-note"
              className="min-h-20"
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              placeholder="Visible only to the product team…"
            />
            <label htmlFor="status-reason" className="text-sm font-medium">
              Owner reason
            </label>
            <Textarea
              id="status-reason"
              className="min-h-20"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Required for dismissing, reopening, or direct resolution override…"
            />
            {workflowError && <InlineError>{workflowError}</InlineError>}
            <Button
              className="w-full sm:w-auto"
              type="submit"
              disabled={
                mutation.isPending ||
                (!targetStatus && !publicMessage.trim() && !internalNote.trim())
              }
            >
              {mutation.isPending
                ? 'Updating…'
                : selectedStatus === 'needs_info'
                  ? 'Request more information'
                  : 'Apply workflow update'}
            </Button>
          </form>
          {issue.status === 'resolved' && (
            <div className="mt-5 rounded-lg border border-success/25 bg-success-soft p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                Resolved
              </div>
              <p className="mt-3 text-sm leading-6">{issue.public_resolution_note}</p>
              <p className="fi-mono mt-3 text-[9px] text-ink-faint">
                {formatTime(issue.resolved_at)} · {confirmationText(issue)}
              </p>
            </div>
          )}
        </section>

        <Section
          eyebrow="Source evidence"
          title={`${reports.length || ''} user report${reports.length === 1 ? '' : 's'}`}
        >
          <div className="border-t border-line">
            {reportQuery.isLoading ? (
              <Skeleton className="h-28" />
            ) : reports.length ? (
              reports.map(({ link, submission: rawItem, attachments }) => {
                const item = rawItem as IntelligenceSubmission;
                return (
                  <div
                    key={item.id}
                    className="border-b border-line bg-surface px-4 py-5 sm:px-6 sm:py-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="fi-mono text-[10px] uppercase text-ink-faint">
                        {typeLabel(item.type)} · {link.grouping_method?.replace('_', ' ')}
                      </span>
                      <span className="fi-mono text-[10px] text-ink-faint">
                        {formatTime(item.created_at ?? item.created_date)}
                      </span>
                    </div>
                    <blockquote className="mt-5 break-words border-l-2 border-critical pl-4 text-base leading-7 sm:text-lg sm:leading-8">
                      {item.description}
                    </blockquote>
                    {item.expected_behavior && (
                      <div className="mt-5 border-t border-line pt-4">
                        <p className="fi-eyebrow">Expected behavior</p>
                        <p className="mt-2 text-sm leading-6 text-ink-muted">
                          {item.expected_behavior}
                        </p>
                      </div>
                    )}
                    <div className="mt-5">
                      {attachments.length ? (
                        <AttachmentGallery
                          attachments={attachments}
                          scopeFor={attachmentScopeFor}
                          fetchAccess={fetchAttachmentAccess}
                        />
                      ) : (
                        <p className="text-sm text-ink-muted">No screenshots — text evidence only.</p>
                      )}
                    </div>
                    {(link.matching_reasons?.length || link.conflicting_evidence?.length) && (
                      <div className="mt-5 rounded-md bg-surface-subtle p-4">
                        <p className="fi-eyebrow">
                          {groupingEvidenceLabel(link.grouping_method, item.ai_analysis_mode)} ·{' '}
                          {Math.round((link.similarity_score ?? 0) * 100)}%
                        </p>
                        {link.matching_reasons?.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink-muted">
                            {link.matching_reasons.map((itemReason) => (
                              <li key={itemReason}>{itemReason}</li>
                            ))}
                          </ul>
                        ) : null}
                        {link.conflicting_evidence?.length ? (
                          <div className="mt-3">
                            <p className="text-xs font-medium">Conflicting evidence</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-ink-muted">
                              {link.conflicting_evidence.map((itemReason) => (
                                <li key={itemReason}>{itemReason}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="border-b border-line py-6 text-sm text-ink-muted">
                No linked source report was found.
              </p>
            )}
          </div>
        </Section>

        <Section eyebrow="Reporter conversation" title="Public updates and private notes">
          <div className="flex items-center justify-between gap-4">
            {unread.length ? (
              <p className="text-sm text-critical">
                {unread.length} unread reporter message{unread.length === 1 ? '' : 's'}
              </p>
            ) : (
              <p className="text-sm text-ink-muted">All reporter messages read</p>
            )}
            {unread.length > 0 && (
              <Button
                variant="secondary"
                onClick={() =>
                  void markOwnerMessagesRead(
                    issue.project_id,
                    unread.map((item) => item.id),
                  ).then(() =>
                    queryClient.invalidateQueries({ queryKey: ['reporter-messages', issueId] }),
                  )
                }
              >
                Mark read
              </Button>
            )}
          </div>
          <div className="mt-5 space-y-3">
            {messages.length ? (
              messages.map((message) => (
                <ConversationMessage key={message.id} message={message} />
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-line p-6 text-sm text-ink-muted">
                No reporter conversation yet.
              </p>
            )}
          </div>
        </Section>

        <Collapsible
          open={showUnderstanding}
          onToggle={() => setShowUnderstanding((value) => !value)}
          eyebrow="Understanding"
          title="How VensaOS understood this"
          summary={`${categoryLabel(issue.category ?? primarySubmission?.ai_category)} · ${severityLabel(issue.severity ?? primarySubmission?.ai_severity)} · ${analysisModeLabel(analysisMode)}`}
        >
          <div className="grid gap-px bg-line sm:grid-cols-2">
            <EvidenceFact
              label="Category"
              value={categoryLabel(issue.category ?? primarySubmission?.ai_category)}
            />
            <EvidenceFact
              label="Product area"
              value={issue.product_area ?? primarySubmission?.ai_product_area}
            />
            <EvidenceFact
              label="Severity"
              value={severityLabel(issue.severity ?? primarySubmission?.ai_severity)}
            />
            <EvidenceFact
              label="Reproducibility"
              value={(issue.reproducibility ?? primarySubmission?.ai_reproducibility)?.replaceAll(
                '_',
                ' ',
              )}
            />
            <EvidenceFact
              label="Core workflow impact"
              value={
                (issue.core_workflow_blocked ?? primarySubmission?.ai_core_workflow_blocked)
                  ? 'Blocked'
                  : 'Not blocked'
              }
            />
            <EvidenceFact label="Analysis method" value={analysisModeLabel(analysisMode)} />
            <EvidenceFact
              label="Classification confidence"
              value={
                primarySubmission?.ai_confidence !== undefined
                  ? `${Math.round(primarySubmission.ai_confidence * 100)}%`
                  : undefined
              }
            />
            <EvidenceFact
              label="Keywords"
              value={primarySubmission?.ai_keywords?.join(', ')}
            />
          </div>
          {primarySubmission?.ai_severity_reasons?.length ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-ink-muted">
              {primarySubmission.ai_severity_reasons.map((itemReason) => (
                <li key={itemReason}>{itemReason}</li>
              ))}
            </ul>
          ) : null}
          <ClassificationCorrectionForm
            issueId={issue.id}
            submission={primarySubmission}
            category={issue.category}
            productArea={issue.product_area}
            severity={issue.severity}
            onSaved={() =>
              Promise.all([
                queryClient.invalidateQueries({ queryKey: ['issue', issueId] }),
                queryClient.invalidateQueries({ queryKey: ['issue-report', issueId] }),
                queryClient.invalidateQueries({ queryKey: ['activity', issueId] }),
              ])
            }
          />
        </Collapsible>

        <Collapsible
          open={showEnvironment}
          onToggle={() => setShowEnvironment((value) => !value)}
          eyebrow="Environment"
          title="Evidence across reports"
          summary={`${breakdown.devices.length} devices · ${breakdown.browsers.length} browsers · ${breakdown.pages.length} pages`}
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <Breakdown title="Devices" values={breakdown.devices} />
            <Breakdown title="Browsers" values={breakdown.browsers} />
            <Breakdown title="Pages" values={breakdown.pages} />
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Counts represent source reports, not deduplicated affected users.
          </p>
          {reports.map(({ submission: rawItem }) => {
            const item = rawItem as IntelligenceSubmission;
            if (!item.context_included) return null;
            return (
              <div key={`env-${item.id}`} className="mt-5 grid gap-px bg-line sm:grid-cols-2">
                <EvidenceFact
                  label="Browser"
                  value={[item.browser_name, item.browser_version].filter(Boolean).join(' ')}
                />
                <EvidenceFact
                  label="Device"
                  value={[item.device_type, item.operating_system].filter(Boolean).join(' · ')}
                />
                <EvidenceFact label="Screen" value={size(item.screen_width, item.screen_height)} />
                <EvidenceFact
                  label="Viewport"
                  value={size(item.viewport_width, item.viewport_height)}
                />
                <EvidenceFact label="Page" value={item.page_url} />
                <EvidenceFact label="Processing" value={item.processing_status} />
              </div>
            );
          })}
        </Collapsible>

        <Collapsible
          open={showActivity}
          onToggle={() => setShowActivity((value) => !value)}
          eyebrow="History"
          title="Priority and activity"
          summary={
            issue.priority_explanation?.length
              ? `Score ${Math.round(issue.priority_score ?? 0)} · ${activityQuery.data?.length ?? 0} events`
              : `${activityQuery.data?.length ?? 0} activity events`
          }
        >
          {issue.priority_explanation?.length ? (
            <div className="mb-6">
              <p className="text-sm font-medium">Why this priority</p>
              <p className="mt-1 text-sm text-ink-muted">
                Deterministic score: {Math.round(issue.priority_score ?? 0)}
              </p>
              <ul className="mt-3 space-y-2 text-xs text-ink-muted">
                {issue.priority_explanation.map((item) => (
                  <li key={item} className="border-b border-line pb-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="border-l border-line pl-5">
            {activityQuery.data?.length ? (
              activityQuery.data.map((event) => (
                <div key={event.id} className="relative pb-6 last:pb-0">
                  <span className="absolute -left-[27px] top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-line bg-canvas">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
                  </span>
                  <p className="text-sm leading-6">
                    {event.public_message ?? event.internal_message ?? event.event_type}
                  </p>
                  <p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">
                    {formatTime(event.created_at ?? event.created_date)}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex gap-3 text-sm text-ink-muted">
                <Clock3 className="h-4 w-4" />
                No activity yet.
              </div>
            )}
          </div>
        </Collapsible>
      </div>
    </div>
  );
}

function ClassificationCorrectionForm({
  issueId,
  submission,
  category,
  productArea,
  severity,
  onSaved,
}: {
  issueId: string;
  submission?: IntelligenceSubmission;
  category?: string;
  productArea?: string;
  severity?: string;
  onSaved: () => Promise<unknown>;
}) {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>(
    submission?.type ?? 'bug',
  );
  const [nextCategory, setNextCategory] = useState(
    category ?? submission?.ai_category ?? 'other',
  );
  const [nextProductArea, setNextProductArea] = useState(
    productArea ?? submission?.ai_product_area ?? '',
  );
  const [nextSeverity, setNextSeverity] = useState(
    severity ?? submission?.ai_severity ?? 'medium',
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFeedbackType(submission?.type ?? 'bug');
    setNextCategory(category ?? submission?.ai_category ?? 'other');
    setNextProductArea(productArea ?? submission?.ai_product_area ?? '');
    setNextSeverity(severity ?? submission?.ai_severity ?? 'medium');
  }, [
    submission?.type,
    submission?.ai_category,
    submission?.ai_product_area,
    submission?.ai_severity,
    category,
    productArea,
    severity,
  ]);

  const mutation = useMutation({
    mutationFn: () =>
      reviewGrouping({
        action: 'correct_classification',
        issueId,
        feedbackType,
        category: nextCategory as
          | 'ui_ux'
          | 'functionality'
          | 'performance'
          | 'authentication'
          | 'data'
          | 'content'
          | 'other',
        productArea: nextProductArea.trim(),
        severity: nextSeverity as 'critical' | 'high' | 'medium' | 'low',
      }),
    onSuccess: async () => {
      setError(null);
      await onSaved();
    },
    onError: () => setError('Classification could not be updated. Refresh and try again.'),
  });

  return (
    <form
      className="mt-6 space-y-3 border-t border-line pt-5"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <p className="text-xs text-ink-muted">
        Correct type, category, product area, or severity. Confidence stays system-owned.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="fi-mono text-[9px] uppercase text-ink-faint">Feedback type</span>
          <Select
            className="mt-1"
            value={feedbackType}
            onChange={(event) =>
              setFeedbackType(event.target.value as 'bug' | 'feature' | 'general')
            }
          >
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="general">General</option>
          </Select>
        </label>
        <label className="text-sm">
          <span className="fi-mono text-[9px] uppercase text-ink-faint">Category</span>
          <Select
            className="mt-1"
            value={nextCategory}
            onChange={(event) => setNextCategory(event.target.value)}
          >
            <option value="ui_ux">UI UX</option>
            <option value="functionality">Functionality</option>
            <option value="performance">Performance</option>
            <option value="authentication">Authentication</option>
            <option value="data">Data</option>
            <option value="content">Content</option>
            <option value="other">Other</option>
          </Select>
        </label>
        <label className="text-sm">
          <span className="fi-mono text-[9px] uppercase text-ink-faint">Product area</span>
          <input
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
            value={nextProductArea}
            onChange={(event) => setNextProductArea(event.target.value)}
            maxLength={120}
          />
        </label>
        <label className="text-sm">
          <span className="fi-mono text-[9px] uppercase text-ink-faint">Severity</span>
          <Select
            className="mt-1"
            value={nextSeverity}
            onChange={(event) => setNextSeverity(event.target.value)}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </label>
      </div>
      {error && <InlineError>{error}</InlineError>}
      <Button type="submit" variant="secondary" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save classification correction'}
      </Button>
    </form>
  );
}

function Collapsible({
  open,
  onToggle,
  eyebrow,
  title,
  summary,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  eyebrow: string;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-8">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="min-w-0">
          <p className="fi-eyebrow">{eyebrow}</p>
          <h2 className="fi-display mt-2 text-xl font-medium sm:text-2xl">{title}</h2>
          {!open && <p className="mt-2 text-sm text-ink-muted">{summary}</p>}
        </span>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-ink-muted transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="mt-5">{children}</div>}
    </section>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="fi-eyebrow">{eyebrow}</p>
      <h2 className="fi-display mb-5 mt-2 text-2xl font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="fi-display text-xl font-medium">{value}</p>
      <p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">{label}</p>
    </div>
  );
}

function EvidenceFact({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-surface-subtle p-3">
      <p className="fi-mono text-[9px] uppercase text-ink-faint">{label}</p>
      <p className="mt-1 break-all text-xs text-ink-muted">{value || 'Not submitted'}</p>
    </div>
  );
}

function Breakdown({
  title,
  values,
}: {
  title: string;
  values: Array<[string, number]>;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      {values.length ? (
        <ul className="mt-2 space-y-1">
          {values.map(([label, count]) => (
            <li
              key={label}
              className="flex justify-between border-b border-line py-1 text-xs text-ink-muted"
            >
              <span>{label}</span>
              <span>{count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-ink-faint">No submitted data</p>
      )}
    </div>
  );
}

function size(width?: number, height?: number) {
  return width && height ? `${width} × ${height}` : undefined;
}

function groupingEvidenceLabel(method?: string, mode?: string) {
  if (method === 'manual') return 'Owner grouping evidence';
  if (mode === 'deterministic_fallback') return 'Deterministic grouping evidence';
  return 'Grouping evidence';
}

function ConversationMessage({ message }: { message: ReporterMessage }) {
  const tone =
    message.visibility === 'internal'
      ? 'warning'
      : message.sender_type === 'reporter'
        ? 'info'
        : 'neutral';
  return (
    <article className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>
          {message.visibility === 'internal'
            ? 'Internal note'
            : message.sender_type === 'reporter'
              ? 'Reporter message'
              : 'Public message'}
        </Badge>
        {message.sender_type === 'reporter' && !message.is_read_by_owner && (
          <span aria-label="Unread" className="h-2 w-2 rounded-full bg-critical" />
        )}
        <span className="fi-mono ml-auto text-[9px] text-ink-faint">
          {formatTime(message.created_at ?? message.created_date)}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
    </article>
  );
}

function confirmationText(issue: WorkflowIssue) {
  if (issue.resolution_confirmation_status === 'confirmed') return 'Reporter confirmed';
  if (issue.resolution_confirmation_status === 'not_fixed') return 'Reporter says not fixed';
  return 'Awaiting reporter confirmation';
}

export function deliveryIndicator(status: string, errorCode?: string) {
  if (status === 'pending' || status === 'sending') return 'Email queued';
  if (status === 'sent') return 'Email sent';
  if (status === 'failed' || status === 'dead_letter') return 'Email failed';
  if (status === 'skipped' && errorCode === 'preference_disabled') return 'Reporter did not opt in';
  return 'Email skipped';
}
