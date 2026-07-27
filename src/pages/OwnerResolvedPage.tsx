import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArrowRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { listMyIssues } from '@/lib/api';
import { formatTime, statusLabel } from '@/lib/format';
import { Badge, EmptyState, Skeleton, StatusBadge } from '@/components/ui';
import type { WorkflowIssue } from '@/lib/types';

type Filter = 'all'|'confirmed'|'pending'|'reopened';
const FILTERS: Array<{value:Filter;label:string}>=[{value:'all',label:'All'},{value:'confirmed',label:'Confirmed'},{value:'pending',label:'Awaiting confirmation'},{value:'reopened',label:'Reopened'}];

export function OwnerResolvedPage(){
 const queryClient=useQueryClient(); const [filter,setFilter]=useState<Filter>('all');
 const query=useQuery({queryKey:['issues'],queryFn:listMyIssues});
 useEffect(()=>base44.entities.Issue.subscribe(()=>{void queryClient.invalidateQueries({queryKey:['issues']});}),[queryClient]);
 const issues=useMemo(()=>((query.data??[]) as WorkflowIssue[]).filter(issue=>filter==='reopened'?issue.status==='reopened':issue.status==='resolved'&&(filter==='all'||issue.resolution_confirmation_status===filter)),[filter,query.data]);
 return <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10"><header className="border-b border-line pb-7"><p className="fi-eyebrow">Closed loop</p><h1 className="fi-display mt-3 text-4xl font-medium">Resolved</h1><p className="mt-2 text-sm text-ink-muted">Resolution outcomes and reporter confirmation, without erasing historical priority.</p></header><div className="flex gap-2 overflow-x-auto border-b border-line py-4" aria-label="Resolved filters">{FILTERS.map(item=><button key={item.value} type="button" onClick={()=>setFilter(item.value)} className={`min-h-10 rounded-md px-3 text-xs ${filter===item.value?'bg-ink text-white':'text-ink-muted hover:bg-surface'}`}>{item.label}</button>)}</div>
  {query.isLoading?<div className="space-y-2 py-5"><Skeleton className="h-28"/><Skeleton className="h-28"/></div>:!issues.length?<EmptyState icon={<Archive className="h-5 w-5"/>} title={filter==='reopened'?'No reopened issues':'No resolved issues yet'} description={filter==='reopened'?'Issues rejected by a reporter will appear here for explicit review.':'Issues resolved with a public note will remain here as a record.'}/>:<div>{issues.map(issue=><Link key={issue.id} to={`/app/issues/${issue.id}`} className="group grid gap-4 border-b border-line px-2 py-5 hover:bg-surface sm:grid-cols-[minmax(0,1fr)_140px_150px_90px_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="fi-mono text-[10px] text-ink-faint">{issue.public_code}</span><StatusBadge status={issue.status} label={statusLabel(issue.status)}/></div><p className="mt-2 font-medium">{issue.title}</p><p className="mt-2 line-clamp-1 text-xs text-ink-muted">{issue.public_resolution_note||'No public resolution note'}</p></div><Fact label="Resolution date" value={formatTime(issue.resolved_at)}/><div><p className="text-xs">{confirmationLabel(issue)}</p><Badge tone={issue.resolution_confirmation_status==='confirmed'?'success':issue.status==='reopened'?'critical':'warning'}>{issue.status==='reopened'?'Not fixed':issue.resolution_confirmation_status==='confirmed'?'Reporter confirmed':'Waiting'}</Badge></div><Fact label="Reports" value={String(issue.report_count??0)}/><ArrowRight className="h-4 w-4 text-ink-faint transition group-hover:translate-x-1"/></Link>)}</div>}
 </div>;
}
function confirmationLabel(issue:WorkflowIssue){if(issue.status==='reopened'||issue.resolution_confirmation_status==='not_fixed')return'Reporter says not fixed';if(issue.resolution_confirmation_status==='confirmed')return'Reporter confirmed';return'Awaiting confirmation';}
function Fact({label,value}:{label:string;value:string}){return <div><p className="text-xs text-ink-muted">{value}</p><p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">{label}</p></div>;}
