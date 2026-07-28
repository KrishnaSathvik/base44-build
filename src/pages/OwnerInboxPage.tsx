import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRightLeft, Check, ChevronDown, Inbox, Monitor, RefreshCw, Split, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, EmptyState, InlineError, Select, Skeleton } from '@/components/ui';
import { NoProjectOnboarding } from '@/components/NoProjectOnboarding';
import { analysisModeLabel, formatTime, severityLabel, typeLabel } from '@/lib/format';
import {
  listMyDuplicateSuggestions, listMyIssueReports, listMyIssues, listMySubmissions,
  getAttachmentAccess, listMyAttachments, listMyReporterMessages, markOwnerMessagesRead, processFeedback, reviewGrouping,
} from '@/lib/api';
import { useActiveProject } from '@/lib/useActiveProject';
import type { DuplicateSuggestion, FeedbackAttachment, IntelligenceIssue, IntelligenceIssueReport, IntelligenceSubmission, ReporterMessage } from '@/lib/types';
import { AttachmentGallery, type GalleryAttachment } from '@/components/AttachmentGallery';
import type { AttachmentAccessScope } from '@/lib/attachmentAccess';

type Filter = 'all' | 'duplicates' | 'failed' | 'needs_info' | 'reporter_replied';
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All attention' },
  { value: 'duplicates', label: 'Possible duplicates' },
  { value: 'failed', label: 'Processing failed' },
  { value: 'needs_info', label: 'Needs information' },
  { value: 'reporter_replied', label: 'Reporter replied' },
];

type AttentionReason = 'Processing failed' | 'Reporter replied' | 'Possible duplicate' | 'Needs information';

interface InboxData {
  submissions: IntelligenceSubmission[];
  issues: IntelligenceIssue[];
  links: IntelligenceIssueReport[];
  suggestions: DuplicateSuggestion[];
  attachments: FeedbackAttachment[];
  messages: ReporterMessage[];
}

function hasUnreadReporterReply(submissionId: string, messages: ReporterMessage[]) {
  return messages.some(
    (item) => item.submission_id === submissionId && item.sender_type === 'reporter' && !item.is_read_by_owner,
  );
}

function attentionForSubmission(
  submission: IntelligenceSubmission,
  data: Pick<InboxData, 'links' | 'issues' | 'suggestions' | 'messages'>,
): AttentionReason | null {
  const issue = issueForSubmission(submission.id, data.links, data.issues);
  const pendingSuggestion = data.suggestions.some(
    (item) => item.submission_id === submission.id && item.status === 'pending',
  );
  if (submission.processing_status === 'failed') return 'Processing failed';
  if (hasUnreadReporterReply(submission.id, data.messages)) return 'Reporter replied';
  if (pendingSuggestion) return 'Possible duplicate';
  if (issue?.status === 'needs_info') return 'Needs information';
  return null;
}

async function loadInbox(): Promise<InboxData> {
  const [submissions, issues, links, suggestions, attachments, messages] = await Promise.all([
    listMySubmissions(), listMyIssues(), listMyIssueReports(), listMyDuplicateSuggestions(), listMyAttachments(), listMyReporterMessages(),
  ]);
  return { submissions, issues: issues as IntelligenceIssue[], links, suggestions, attachments, messages };
}

export function OwnerInboxPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const { project, isLoading: projectsLoading } = useActiveProject();
  const query = useQuery({ queryKey: ['inbox'], queryFn: loadInbox, enabled: !!project });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobileLayout(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const filtered = useMemo(() => {
    if (!query.data || !project) return [];
    return query.data.submissions.filter((submission) => {
      if (submission.project_id !== project.id) return false;
      const reason = attentionForSubmission(submission, query.data);
      if (!reason) return false;
      switch (filter) {
        case 'duplicates':
          return reason === 'Possible duplicate';
        case 'failed':
          return reason === 'Processing failed';
        case 'needs_info':
          return reason === 'Needs information';
        case 'reporter_replied':
          return reason === 'Reporter replied';
        case 'all':
          return true;
        default: {
          const _exhaustive: never = filter;
          return _exhaustive;
        }
      }
    });
  }, [filter, project, query.data]);

  useEffect(() => {
    if (!selectedId || !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
      setMobileShowDetail(false);
    }
  }, [filtered, selectedId]);

  useEffect(() => { setMobileShowDetail(false); }, [filter]);

  const selectedSubmission = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const showList = !isMobileLayout || !mobileShowDetail;
  const showDetail = !isMobileLayout || mobileShowDetail;

  if (projectsLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-7 md:py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-10 h-80 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <NoProjectOnboarding
        eyebrow="Exceptions"
        title="Create your first feedback board"
        description="Inbox shows failed processing, duplicates, and reporter replies. Everyday unreviewed work lives in Issues after you share the public feedback link."
      />
    );
  }

  return <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-7 md:py-10">
    <header className="border-b border-line pb-7"><p className="fi-eyebrow">Exceptions</p><h1 className="fi-display mt-3 text-3xl font-medium sm:text-4xl">Inbox</h1><p className="mt-2 text-sm text-ink-muted">Failed processing, duplicate matches, and reporter replies that need a decision. Everyday unreviewed work lives in Issues.</p></header>
    <div className="flex gap-2 overflow-x-auto border-b border-line py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Inbox filters">{FILTERS.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`min-h-10 shrink-0 rounded-md px-3 text-xs ${filter === item.value ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface'}`}>{item.label}</button>)}</div>
    {query.isLoading ? <div className="grid gap-6 py-6 lg:grid-cols-[380px_1fr]"><Skeleton className="h-[520px]"/><Skeleton className="h-[520px]"/></div> : query.isError ? <div className="py-8"><InlineError>Inbox data could not be loaded. Check your connection and retry.</InlineError></div> : !filtered.length ? <div className="mt-6"><EmptyState icon={<Inbox className="h-5 w-5"/>} title={filter === 'all' ? 'Inbox is clear' : 'No reports in this view'} description={filter === 'all' ? 'No exceptions need attention. New unreviewed issues are in Issues.' : 'Nothing matches this filter right now.'}/></div> : <div className="grid min-h-0 lg:min-h-[620px] lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className={`border-line lg:border-r ${showList ? '' : 'hidden'}`}>{filtered.map((submission) => <ReportRow key={submission.id} submission={submission} data={query.data!} selected={submission.id === selectedId} onSelect={() => { setSelectedId(submission.id); setMobileShowDetail(true); }}/>)}</div>
      {selectedSubmission && showDetail ? <div><button type="button" onClick={() => setMobileShowDetail(false)} className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-ink lg:hidden"><ArrowLeft className="h-4 w-4"/>Back to inbox</button><ReportDetail submission={selectedSubmission} data={query.data!}/></div> : null}
    </div>}
  </div>;
}

function ReportRow({ submission, data, selected, onSelect }: { submission: IntelligenceSubmission; data: InboxData; selected: boolean; onSelect: () => void }) {
  const issue = issueForSubmission(submission.id, data.links, data.issues);
  const latestReply = data.messages.find((item) => item.submission_id === submission.id && item.sender_type === 'reporter');
  const attentionReason = attentionForSubmission(submission, data);
  if (!attentionReason) return null;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full border-b border-line px-4 py-5 text-left transition ${selected ? 'bg-surface' : 'hover:bg-surface-subtle'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="fi-mono text-[9px] uppercase text-ink-faint">
          {typeLabel(submission.type)} · {formatTime(latestReply?.created_at ?? submission.created_at ?? submission.created_date)}
        </span>
        <span className="flex items-center gap-2">
          {latestReply && !latestReply.is_read_by_owner && (
            <span aria-label="Unread reporter message" className="h-2 w-2 rounded-full bg-critical" />
          )}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-medium">
        {submission.ai_summary || submission.description}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge
          tone={
            attentionReason === 'Processing failed'
              ? 'critical'
              : attentionReason === 'Reporter replied'
                ? 'info'
                : 'warning'
          }
        >
          {attentionReason}
        </Badge>
        {issue?.public_code && (
          <span className="fi-mono text-[9px] text-ink-faint">{issue.public_code}</span>
        )}
      </div>
    </button>
  );
}

function ReportDetail({ submission, data }: { submission: IntelligenceSubmission; data: InboxData }) {
  const sourceIssue = issueForSubmission(submission.id, data.links, data.issues);
  const suggestion = data.suggestions.find((item) => item.submission_id === submission.id && item.status === 'pending');
  const candidate = suggestion ? data.issues.find((item) => item.id === suggestion.candidate_issue_id) : undefined;
  const attentionReason = attentionForSubmission(submission, data);
  const [targetId, setTargetId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const queryClient = useQueryClient();
  const attachments = data.attachments.filter((item) => item.submission_id === submission.id && item.upload_status === 'completed');
  const unreadMessages = data.messages.filter((item) => item.submission_id === submission.id && item.sender_type === 'reporter' && !item.is_read_by_owner);
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
  const mutation = useMutation({
    mutationFn: async (action: Parameters<typeof reviewGrouping>[0] | { action: 'retry' }) => {
      if (action.action === 'retry') return processFeedback(submission.id, true);
      return reviewGrouping(action);
    },
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inbox'] }),
        queryClient.invalidateQueries({ queryKey: ['issues'] }),
      ]);
    },
    onError: () => setActionError('The action could not be completed. Refresh and try again.'),
  });
  const targets = data.issues.filter(
    (issue) => issue.id !== sourceIssue?.id && issue.status !== 'duplicate' && issue.status !== 'dismissed',
  );
  const readMutation = useMutation({
    mutationFn: () =>
      sourceIssue && unreadMessages.length
        ? markOwnerMessagesRead(
            sourceIssue.project_id,
            unreadMessages.map((item) => item.id),
          )
        : Promise.resolve(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inbox'] }),
  });

  return (
    <article className="min-w-0 px-0 py-7 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        {attentionReason ? (
          <Badge
            tone={
              attentionReason === 'Processing failed'
                ? 'critical'
                : attentionReason === 'Reporter replied'
                  ? 'info'
                  : 'warning'
            }
          >
            {attentionReason}
          </Badge>
        ) : null}
        {submission.ai_severity && (
          <span className="fi-mono text-[10px] uppercase text-ink-muted">
            {severityLabel(submission.ai_severity)} severity
          </span>
        )}
      </div>
      <h2 className="fi-display mt-4 break-words text-2xl font-medium sm:text-3xl">
        {submission.ai_summary || 'Original report'}
      </h2>
      {sourceIssue && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to={`/app/issues/${sourceIssue.id}`}>
            <Button>Review in Issues</Button>
          </Link>
          {unreadMessages.length > 0 && (
            <Button variant="secondary" disabled={readMutation.isPending} onClick={() => readMutation.mutate()}>
              Mark read
            </Button>
          )}
        </div>
      )}

      {unreadMessages.length > 0 && (
        <section className="mt-6 rounded-lg border border-info/25 bg-info-soft/30 p-5">
          <p className="fi-eyebrow">Unread reporter reply</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{unreadMessages[0]?.body}</p>
        </section>
      )}

      <section className="mt-8 border-y border-line bg-surface px-5 py-6">
        <p className="fi-eyebrow">Original report</p>
        <blockquote className="mt-4 border-l-2 border-critical pl-4 text-base leading-7">
          {submission.description}
        </blockquote>
        {submission.expected_behavior && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="fi-eyebrow">Expected behavior</p>
            <p className="mt-2 text-sm text-ink-muted">{submission.expected_behavior}</p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <p className="fi-eyebrow">Evidence</p>
        {attachments.length ? (
          <div className="mt-4">
            <AttachmentGallery
              attachments={attachments}
              scopeFor={attachmentScopeFor}
              fetchAccess={fetchAttachmentAccess}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">No screenshots — text evidence only.</p>
        )}
      </section>

      {submission.processing_status === 'failed' && (
        <section className="mt-6 rounded-lg border border-critical/30 bg-critical-soft p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-critical">
            <AlertTriangle className="h-4 w-4" />
            Processing failed
          </div>
          <p className="mt-2 text-xs leading-5 text-critical">
            {submission.processing_error || 'The report could not be classified.'}
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ action: 'retry' })}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </section>
      )}

      <section className="mt-8 border-t border-line pt-6">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={showInsights}
          onClick={() => setShowInsights((value) => !value)}
        >
          <span>
            <p className="fi-eyebrow">Insights</p>
            <p className="mt-1 text-sm text-ink-muted">Analysis and device context</p>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition ${showInsights ? 'rotate-180' : ''}`} />
        </button>
        {showInsights && (
          <div className="mt-5 space-y-6">
            {submission.processing_status === 'completed' && (
              <div>
                <p className="fi-mono text-[9px] uppercase text-ink-faint">
                  {analysisModeLabel(submission.ai_analysis_mode)}
                </p>
                <div className="mt-3 grid gap-px bg-line sm:grid-cols-3">
                  <Fact label="Category" value={submission.ai_category} />
                  <Fact label="Product area" value={submission.ai_product_area} />
                  <Fact label="Reproducibility" value={submission.ai_reproducibility} />
                  <Fact label="Core workflow" value={submission.ai_core_workflow_blocked ? 'Blocked' : 'Not blocked'} />
                  <Fact label="Keywords" value={submission.ai_keywords?.join(', ')} />
                  <Fact
                    label="Confidence"
                    value={
                      submission.ai_confidence !== undefined
                        ? `${Math.round(submission.ai_confidence * 100)}%`
                        : undefined
                    }
                  />
                </div>
                {submission.ai_severity_reasons?.length ? (
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-ink-muted">
                    {submission.ai_severity_reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
            {submission.context_included ? (
              <div className="grid gap-px bg-line sm:grid-cols-2">
                <Fact label="Browser" value={[submission.browser_name, submission.browser_version].filter(Boolean).join(' ')} />
                <Fact label="Device" value={[submission.device_type, submission.operating_system].filter(Boolean).join(' · ')} />
                <Fact label="Screen" value={dimension(submission.screen_width, submission.screen_height)} />
                <Fact label="Viewport" value={dimension(submission.viewport_width, submission.viewport_height)} />
                <Fact label="Page" value={submission.page_url} />
                <Fact label="Submitted" value={formatTime(submission.created_at ?? submission.created_date)} />
              </div>
            ) : (
              <p className="flex items-center gap-2 text-xs text-ink-faint">
                <Monitor className="h-4 w-4" />
                Reporter removed optional context.
              </p>
            )}
          </div>
        )}
      </section>

      {suggestion && candidate && (
        <section className="mt-8 rounded-lg border border-warning/35 bg-warning-soft/45 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="fi-eyebrow">Possible duplicate</p>
              <h3 className="mt-2 text-base font-medium">
                {candidate.public_code} · {candidate.title}
              </h3>
            </div>
            <Badge tone="warning">{Math.round((suggestion.similarity_score ?? 0) * 100)}% match</Badge>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Evidence title="Why it may match" items={suggestion.matching_reasons} />
            <Evidence title="Conflicting evidence" items={suggestion.conflicting_evidence} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'accept', suggestionId: suggestion.id })}>
              <Check className="h-4 w-4" />
              Accept grouping
            </Button>
            <Button
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ action: 'reject', suggestionId: suggestion.id })}
            >
              <X className="h-4 w-4" />
              Keep separate
            </Button>
          </div>
        </section>
      )}

      {submission.processing_status === 'completed' && (
        <section className="mt-8 border-t border-line pt-7">
          <p className="fi-eyebrow">Manual grouping</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Select aria-label="Target issue" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
              <option value="">Choose another issue</option>
              {targets.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  {issue.public_code} — {issue.title}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              disabled={!targetId || mutation.isPending}
              onClick={() => mutation.mutate({ action: 'move', submissionId: submission.id, targetIssueId: targetId })}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Move
            </Button>
            {sourceIssue && (
              <Button
                variant="ghost"
                disabled={!targetId || mutation.isPending}
                onClick={() =>
                  mutation.mutate({ action: 'merge', sourceIssueId: sourceIssue.id, targetIssueId: targetId })
                }
              >
                Merge issue
              </Button>
            )}
          </div>
          {sourceIssue && (sourceIssue.report_count ?? 0) > 1 && (
            <Button
              className="mt-3"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ action: 'separate', submissionId: submission.id })}
            >
              <Split className="h-4 w-4" />
              Separate this report
            </Button>
          )}
        </section>
      )}

      {actionError && (
        <div className="mt-5">
          <InlineError>{actionError}</InlineError>
        </div>
      )}
    </article>
  );
}

function issueForSubmission(submissionId: string, links: IntelligenceIssueReport[], issues: IntelligenceIssue[]) { const link = links.find((item) => item.submission_id === submissionId && item.review_status !== 'rejected'); return link ? issues.find((item) => item.id === link.issue_id) : undefined; }
function Fact({ label, value }: { label: string; value?: string }) { return <div className="bg-surface p-4"><p className="fi-mono text-[9px] uppercase text-ink-faint">{label}</p><p className="mt-2 text-sm capitalize">{value?.replace('_', ' ') || 'Unknown'}</p></div>; }
function Evidence({ title, items }: { title: string; items?: string[] }) { return <div><p className="text-xs font-medium">{title}</p>{items?.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-ink-muted">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-xs text-ink-faint">None reported.</p>}</div>; }
function dimension(width?: number, height?: number) { return width && height ? `${width} × ${height}` : undefined; }
