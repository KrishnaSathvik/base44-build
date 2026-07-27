import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Check, Inbox, RefreshCw, Split, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge, Button, EmptyState, InlineError, Select, Skeleton } from '@/components/ui';
import { formatTime, severityLabel, typeLabel } from '@/lib/format';
import {
  listMyDuplicateSuggestions, listMyIssueReports, listMyIssues, listMySubmissions,
  processFeedback, reviewGrouping,
} from '@/lib/api';
import type { DuplicateSuggestion, IntelligenceIssue, IntelligenceIssueReport, IntelligenceSubmission } from '@/lib/types';

type Filter = 'all' | 'unreviewed' | 'duplicates' | 'failed' | 'needs_info' | 'screenshots';
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' }, { value: 'unreviewed', label: 'Unreviewed' },
  { value: 'duplicates', label: 'Possible duplicates' }, { value: 'failed', label: 'Processing failed' },
  { value: 'needs_info', label: 'Needs information' }, { value: 'screenshots', label: 'Has screenshots' },
];

interface InboxData {
  submissions: IntelligenceSubmission[];
  issues: IntelligenceIssue[];
  links: IntelligenceIssueReport[];
  suggestions: DuplicateSuggestion[];
}

async function loadInbox(): Promise<InboxData> {
  const [submissions, issues, links, suggestions] = await Promise.all([
    listMySubmissions(), listMyIssues(), listMyIssueReports(), listMyDuplicateSuggestions(),
  ]);
  return { submissions, issues: issues as IntelligenceIssue[], links, suggestions };
}

export function OwnerInboxPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['inbox'], queryFn: loadInbox });

  useEffect(() => {
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['inbox'] }); void queryClient.invalidateQueries({ queryKey: ['issues'] }); };
    const dynamic = base44.entities as unknown as Record<string, { subscribe: (callback: () => void) => () => void }>;
    const names = ['FeedbackSubmission', 'Issue', 'IssueReport', 'DuplicateSuggestion'];
    const unsubscribers = names.map((name) => dynamic[name]?.subscribe(refresh)).filter(Boolean) as Array<() => void>;
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [queryClient]);

  const filtered = useMemo(() => {
    if (!query.data) return [];
    const { links, issues, suggestions } = query.data;
    return query.data.submissions.filter((submission) => {
      const issue = issueForSubmission(submission.id, links, issues);
      const pendingSuggestion = suggestions.some((item) => item.submission_id === submission.id && item.status === 'pending');
      if (filter === 'unreviewed') return issue?.status === 'unreviewed';
      if (filter === 'duplicates') return pendingSuggestion;
      if (filter === 'failed') return submission.processing_status === 'failed';
      if (filter === 'needs_info') return issue?.status === 'needs_info';
      if (filter === 'screenshots') return false;
      return submission.processing_status !== 'completed' || issue?.status === 'unreviewed' || pendingSuggestion;
    });
  }, [filter, query.data]);

  useEffect(() => {
    if (!selectedId || !filtered.some((item) => item.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  return <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-7 md:py-10">
    <header className="border-b border-line pb-7"><p className="fi-eyebrow">Report queue</p><h1 className="fi-display mt-3 text-4xl font-medium">Inbox</h1><p className="mt-2 text-sm text-ink-muted">Review intelligence, grouping evidence, and reports that still need a decision.</p></header>
    <div className="flex gap-2 overflow-x-auto border-b border-line py-4" aria-label="Inbox filters">{FILTERS.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`min-h-10 shrink-0 rounded-md px-3 text-xs ${filter === item.value ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface'}`}>{item.label}</button>)}</div>
    {query.isLoading ? <div className="grid gap-6 py-6 lg:grid-cols-[380px_1fr]"><Skeleton className="h-[520px]"/><Skeleton className="h-[520px]"/></div> : query.isError ? <div className="py-8"><InlineError>Inbox data could not be loaded. Check your connection and retry.</InlineError></div> : !filtered.length ? <EmptyState icon={<Inbox className="h-5 w-5"/>} title="No reports in this view" description="New, failed, and reviewable reports will appear here without exposing them outside your project."/> : <div className="grid min-h-[620px] lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="border-line lg:border-r">{filtered.map((submission) => <ReportRow key={submission.id} submission={submission} data={query.data!} selected={submission.id === selectedId} onSelect={() => setSelectedId(submission.id)}/>)}</div>
      {(filtered.find((item) => item.id === selectedId) ?? filtered[0]) && <ReportDetail submission={(filtered.find((item) => item.id === selectedId) ?? filtered[0])!} data={query.data!}/>} 
    </div>}
  </div>;
}

function ReportRow({ submission, data, selected, onSelect }: { submission: IntelligenceSubmission; data: InboxData; selected: boolean; onSelect: () => void }) {
  const issue = issueForSubmission(submission.id, data.links, data.issues);
  const suggestion = data.suggestions.find((item) => item.submission_id === submission.id && item.status === 'pending');
  return <button type="button" onClick={onSelect} className={`block w-full border-b border-line px-4 py-5 text-left transition ${selected ? 'bg-surface' : 'hover:bg-surface-subtle'}`}>
    <div className="flex items-center justify-between gap-3"><span className="fi-mono text-[9px] uppercase text-ink-faint">{typeLabel(submission.type)} · {formatTime(submission.created_at ?? submission.created_date)}</span><ProcessingBadge status={submission.processing_status}/></div>
    <p className="mt-3 line-clamp-2 text-sm font-medium">{submission.ai_summary || submission.description}</p>
    <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-muted">{submission.description}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">{submission.ai_product_area && <Badge>{submission.ai_product_area}</Badge>}{suggestion && <Badge tone="warning">Possible duplicate</Badge>}{issue && <span className="fi-mono text-[9px] text-ink-faint">{issue.public_code}</span>}</div>
  </button>;
}

function ReportDetail({ submission, data }: { submission: IntelligenceSubmission; data: InboxData }) {
  const sourceIssue = issueForSubmission(submission.id, data.links, data.issues);
  const suggestion = data.suggestions.find((item) => item.submission_id === submission.id && item.status === 'pending');
  const candidate = suggestion ? data.issues.find((item) => item.id === suggestion.candidate_issue_id) : undefined;
  const [targetId, setTargetId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (action: Parameters<typeof reviewGrouping>[0] | { action: 'retry' }) => {
      if (action.action === 'retry') return processFeedback(submission.id, true);
      return reviewGrouping(action);
    },
    onSuccess: async () => { setActionError(null); await Promise.all([queryClient.invalidateQueries({ queryKey: ['inbox'] }), queryClient.invalidateQueries({ queryKey: ['issues'] })]); },
    onError: () => setActionError('The action could not be completed. Refresh and try again.'),
  });
  const targets = data.issues.filter((issue) => issue.id !== sourceIssue?.id && issue.status !== 'duplicate' && issue.status !== 'dismissed');

  return <article className="min-w-0 px-0 py-7 lg:px-8">
    <div className="flex flex-wrap items-center gap-3"><ProcessingBadge status={submission.processing_status}/>{submission.ai_severity && <span className="fi-mono text-[10px] uppercase text-ink-muted">{severityLabel(submission.ai_severity)} severity</span>}{submission.ai_confidence !== undefined && <span className="fi-mono text-[10px] text-ink-faint">{Math.round(submission.ai_confidence * 100)}% classification confidence</span>}</div>
    <h2 className="fi-display mt-4 text-3xl font-medium">{submission.ai_summary || 'Original report'}</h2>
    <section className="mt-8 border-y border-line bg-surface px-5 py-6"><p className="fi-eyebrow">Original report</p><blockquote className="mt-4 border-l-2 border-critical pl-4 text-base leading-7">{submission.description}</blockquote>{submission.expected_behavior && <div className="mt-5 border-t border-line pt-4"><p className="fi-eyebrow">Expected behavior</p><p className="mt-2 text-sm text-ink-muted">{submission.expected_behavior}</p></div>}</section>
    {submission.processing_status === 'failed' && <section className="mt-6 rounded-lg border border-critical/30 bg-critical-soft p-5"><div className="flex items-center gap-2 text-sm font-medium text-critical"><AlertTriangle className="h-4 w-4"/>Processing failed</div><p className="mt-2 text-xs leading-5 text-critical">{submission.processing_error || 'The report could not be classified.'}</p><Button className="mt-4" variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'retry' })}><RefreshCw className="h-4 w-4"/>Retry</Button></section>}
    {submission.processing_status === 'completed' && <section className="mt-8"><p className="fi-eyebrow">AI classification</p><div className="mt-4 grid gap-px bg-line sm:grid-cols-3"><Fact label="Category" value={submission.ai_category}/><Fact label="Product area" value={submission.ai_product_area}/><Fact label="Reproducibility" value={submission.ai_reproducibility}/></div>{submission.ai_severity_reasons?.length ? <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-ink-muted">{submission.ai_severity_reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}</section>}
    {suggestion && candidate && <section className="mt-8 rounded-lg border border-warning/35 bg-warning-soft/45 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="fi-eyebrow">Possible duplicate</p><h3 className="mt-2 text-base font-medium">{candidate.public_code} · {candidate.title}</h3></div><Badge tone="warning">{Math.round((suggestion.similarity_score ?? 0) * 100)}% match</Badge></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><Evidence title="Why it may match" items={suggestion.matching_reasons}/><Evidence title="Conflicting evidence" items={suggestion.conflicting_evidence}/></div><div className="mt-5 flex flex-wrap gap-2"><Button disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'accept', suggestionId: suggestion.id })}><Check className="h-4 w-4"/>Accept grouping</Button><Button variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'reject', suggestionId: suggestion.id })}><X className="h-4 w-4"/>Keep separate</Button></div></section>}
    {submission.processing_status === 'completed' && <section className="mt-8 border-t border-line pt-7"><p className="fi-eyebrow">Manual grouping</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><Select aria-label="Target issue" value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Choose another issue</option>{targets.map((issue) => <option key={issue.id} value={issue.id}>{issue.public_code} — {issue.title}</option>)}</Select><Button variant="secondary" disabled={!targetId || mutation.isPending} onClick={() => mutation.mutate({ action: 'move', submissionId: submission.id, targetIssueId: targetId })}><ArrowRightLeft className="h-4 w-4"/>Move</Button>{sourceIssue && <Button variant="ghost" disabled={!targetId || mutation.isPending} onClick={() => mutation.mutate({ action: 'merge', sourceIssueId: sourceIssue.id, targetIssueId: targetId })}>Merge issue</Button>}</div>{sourceIssue && (sourceIssue.report_count ?? 0) > 1 && <Button className="mt-3" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'separate', submissionId: submission.id })}><Split className="h-4 w-4"/>Separate this report</Button>}</section>}
    {actionError && <div className="mt-5"><InlineError>{actionError}</InlineError></div>}
  </article>;
}

function issueForSubmission(submissionId: string, links: IntelligenceIssueReport[], issues: IntelligenceIssue[]) { const link = links.find((item) => item.submission_id === submissionId && item.review_status !== 'rejected'); return link ? issues.find((item) => item.id === link.issue_id) : undefined; }
function ProcessingBadge({ status }: { status?: string }) { if (status === 'failed') return <Badge tone="critical">Failed</Badge>; if (status === 'processing' || status === 'pending') return <Badge tone="warning">{status}</Badge>; return <Badge tone="success">Processed</Badge>; }
function Fact({ label, value }: { label: string; value?: string }) { return <div className="bg-surface p-4"><p className="fi-mono text-[9px] uppercase text-ink-faint">{label}</p><p className="mt-2 text-sm capitalize">{value?.replace('_', ' ') || 'Unknown'}</p></div>; }
function Evidence({ title, items }: { title: string; items?: string[] }) { return <div><p className="text-xs font-medium">{title}</p>{items?.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-ink-muted">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-xs text-ink-faint">None reported.</p>}</div>; }
