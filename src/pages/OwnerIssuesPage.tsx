import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Archive, ListFilter, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { listMyIssues } from '@/lib/api';
import { formatTime, severityLabel, statusLabel } from '@/lib/format';
import { Button, EmptyState, SeverityBadge, Skeleton, StatusBadge } from '@/components/ui';

export function OwnerIssuesPage() {
  const queryClient = useQueryClient();
  const resolvedOnly = useLocation().pathname.endsWith('/resolved');
  const { data: allIssues, isLoading, isError } = useQuery({ queryKey: ['issues'], queryFn: listMyIssues });
  useEffect(() => { const unsubscribe = base44.entities.Issue.subscribe(() => { void queryClient.invalidateQueries({ queryKey: ['issues'] }); }); return () => unsubscribe(); }, [queryClient]);
  const issues = allIssues?.filter(issue => resolvedOnly ? issue.status === 'resolved' : !['resolved','dismissed','duplicate'].includes(issue.status));
  return <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
    <div className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="fi-eyebrow">{resolvedOnly ? 'Closed loop' : 'Working queue'}</p><h1 className="fi-display mt-3 text-4xl font-medium">{resolvedOnly ? 'Resolved' : 'Issues'}</h1><p className="mt-2 text-sm text-ink-muted">{resolvedOnly ? 'Issues closed with a public explanation.' : 'Normalized problems, ordered by the work they demand.'}</p></div><div className="flex items-center gap-2"><Button variant="ghost"><ListFilter className="h-4 w-4" />Filter</Button><Link to="/app/setup"><Button variant="secondary"><Plus className="h-4 w-4" />New project</Button></Link></div></div>
    <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto] border-b border-line pb-3"><span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Issue</span><span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Status</span></div>
    {isLoading ? <div className="space-y-1 py-2">{[1,2,3,4].map(x => <Skeleton key={x} className="h-24" />)}</div> : isError ? <div className="border-b border-critical/30 py-8 text-sm text-critical">Issues could not be loaded. Check your connection and try again.</div> : !issues?.length ? <EmptyState icon={<Archive className="h-5 w-5" />} title={resolvedOnly ? 'No resolved issues yet' : 'No issues yet'} description={resolvedOnly ? 'When an issue is resolved with a public note, it will remain here as a record.' : 'Share your public feedback link. The first submitted report will become an issue here.'} action={!resolvedOnly ? <Link to="/app/setup"><Button>Create a feedback project</Button></Link> : undefined} /> : <div>{issues.map(issue =>
      <Link key={issue.id} to={`/app/issues/${issue.id}`} className="group relative block min-h-[124px] border-b border-line px-1 py-5 transition hover:bg-surface/65 sm:grid sm:min-h-[104px] sm:grid-cols-[110px_minmax(220px,1fr)_110px_140px_90px_auto] sm:items-center sm:gap-4 sm:px-3">
        <div className="flex items-center gap-3 pr-20 sm:flex-col sm:items-start sm:gap-2 sm:pr-0"><span className="fi-mono text-[10px] text-ink-faint">{issue.public_code}</span><SeverityBadge severity={issue.severity ?? 'medium'} label={severityLabel(issue.severity)} /></div>
        <div className="mt-4 min-w-0 sm:mt-0"><p className="line-clamp-2 text-[15px] font-medium sm:truncate">{issue.title}</p><p className="fi-mono mt-2 text-[9px] uppercase text-ink-faint sm:hidden">{issue.report_count ?? 0} reports · {issue.affected_user_count ?? 0} affected</p></div>
        <Stat value={String(issue.report_count ?? 0)} label="reports" />
        <Stat value={String(issue.affected_user_count ?? 0)} label="affected" />
        <div className="hidden sm:block"><p className="text-xs text-ink-muted">{formatTime(issue.last_seen_at)}</p><p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">last seen</p></div>
        <div className="absolute right-1 top-5 flex items-center gap-3 sm:static"><StatusBadge status={issue.status} label={statusLabel(issue.status)} /><ArrowRight className="hidden h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1 sm:block" /></div>
      </Link>)}</div>}
  </div>;
}
function Stat({value,label}:{value:string;label:string}) { return <div className="hidden sm:block"><p className="fi-display text-lg font-medium">{value}</p><p className="fi-mono text-[9px] uppercase text-ink-faint">{label}</p></div>; }
