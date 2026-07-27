import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Inbox } from 'lucide-react';
import { Button, Checkbox, EmptyState, Field, InlineError, Input, Skeleton, Switch, Textarea, Toast } from '@/components/ui';
import { listMyProjects, updateProjectSettings } from '@/lib/api';
import type { FeedbackType } from '@/lib/types';

export function PlaceholderWorkspacePage() {
  const settings = useLocation().pathname.includes('settings');
  return settings ? <ProjectSettings /> : <InboxState />;
}

function InboxState() {
  return <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-7 md:py-10"><p className="fi-eyebrow">Report queue</p><h1 className="fi-display mt-3 text-4xl font-medium">Inbox</h1><p className="mt-2 text-sm text-ink-muted">Reports that still need a decision.</p><div className="mt-10"><EmptyState icon={<Inbox className="h-5 w-5" />} title="No unreviewed reports" description="New submissions and grouping suggestions will appear here." action={<Link to="/app/issues"><Button variant="secondary">View current issues</Button></Link>} /></div></div>;
}

function ProjectSettings() {
  const queryClient = useQueryClient();
  const projects = useQuery({ queryKey: ['projects'], queryFn: listMyProjects });
  const project = projects.data?.[0];
  const [name,setName]=useState(''); const [productUrl,setProductUrl]=useState(''); const [description,setDescription]=useState('');
  const [types,setTypes]=useState<FeedbackType[]>(['bug','feature','general']); const [allowAnonymous,setAllowAnonymous]=useState(true); const [collectEmail,setCollectEmail]=useState(true);
  const [copied,setCopied]=useState(false); const [saved,setSaved]=useState(false); const [error,setError]=useState<string|null>(null);

  useEffect(()=>{ if(!project)return; setName(project.name); setProductUrl(project.product_url ?? ''); setDescription(project.description ?? ''); setTypes(project.feedback_types_enabled ?? ['bug','feature','general']); setAllowAnonymous(project.allow_anonymous !== false); setCollectEmail(project.collect_reporter_email !== false); },[project]);
  const mutation=useMutation({mutationFn:()=>{if(!project)throw new Error('No project');return updateProjectSettings(project.id,{name:name.trim(),productUrl:productUrl.trim()||undefined,description:description.trim()||undefined,feedbackTypesEnabled:types,allowAnonymous,collectReporterEmail:collectEmail});},onSuccess:async()=>{setSaved(true);setError(null);await queryClient.invalidateQueries({queryKey:['projects']});},onError:()=>setError('Settings could not be saved. Check your connection and try again.')});

  if(projects.isLoading)return <SettingsFrame><Skeleton className="h-12 w-full"/><Skeleton className="mt-8 h-80 w-full"/></SettingsFrame>;
  if(!project)return <SettingsFrame><EmptyState title="Create a project first" description="Project settings become available after your first feedback board is created." action={<Link to="/app/setup"><Button>Create a project</Button></Link>} /></SettingsFrame>;
  const publicLink=`${window.location.origin}/f/${project.slug}`;
  const toggleType=(type:FeedbackType,checked:boolean)=>setTypes(current=>checked?[...current,type]:current.filter(item=>item!==type));
  return <SettingsFrame><form className="max-w-3xl" onSubmit={event=>{event.preventDefault();setSaved(false);setError(null);mutation.mutate();}}><section className="border-t border-line py-8"><p className="fi-eyebrow">Project identity</p><div className="mt-6 grid gap-6"><Field label="Product name" htmlFor="settings-name"><Input id="settings-name" value={name} onChange={event=>setName(event.target.value)} required maxLength={80}/></Field><Field label="Product URL" htmlFor="settings-url" hint="Optional"><Input id="settings-url" type="url" value={productUrl} onChange={event=>setProductUrl(event.target.value)} placeholder="https://example.com"/></Field><Field label="Description" htmlFor="settings-description" hint="Optional"><Textarea id="settings-description" className="min-h-24" value={description} onChange={event=>setDescription(event.target.value)} maxLength={500}/></Field></div></section>
    <section className="border-t border-line py-8"><p className="fi-eyebrow">Public feedback link</p><div className="mt-5 flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center"><code className="fi-mono min-w-0 flex-1 break-all text-xs">{publicLink}</code><Button type="button" variant="secondary" onClick={async()=>{await navigator.clipboard.writeText(publicLink);setCopied(true);}}><Copy className="h-4 w-4"/>Copy link</Button></div></section>
    <section className="border-t border-line py-8"><p className="fi-eyebrow">Feedback types</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><Checkbox label="Bug reports" checked={types.includes('bug')} onChange={event=>toggleType('bug',event.target.checked)}/><Checkbox label="Feature requests" checked={types.includes('feature')} onChange={event=>toggleType('feature',event.target.checked)}/><Checkbox label="General feedback" checked={types.includes('general')} onChange={event=>toggleType('general',event.target.checked)}/></div>{types.length===0&&<div className="mt-4"><InlineError>Enable at least one feedback type.</InlineError></div>}</section>
    <section className="border-y border-line py-8"><div className="flex items-start justify-between gap-5"><div><h2 className="text-sm font-medium">Allow anonymous submissions</h2><p className="mt-1 max-w-lg text-xs leading-5 text-ink-muted">When disabled, the public portal stops accepting unauthenticated reports.</p></div><Switch label="Allow anonymous submissions" checked={allowAnonymous} onChange={setAllowAnonymous}/></div><div className="mt-7 flex items-start justify-between gap-5 border-t border-line pt-7"><div><h2 className="text-sm font-medium">Collect optional reporter email</h2><p className="mt-1 max-w-lg text-xs leading-5 text-ink-muted">Offer an optional email field so reporters can request status updates.</p></div><Switch label="Collect optional reporter email" checked={collectEmail} onChange={setCollectEmail}/></div></section>
    {error&&<div className="mt-5"><InlineError>{error}</InlineError></div>}<div className="sticky bottom-[72px] -mx-4 mt-8 flex border-t border-line bg-canvas/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0"><Button type="submit" disabled={mutation.isPending||!name.trim()||types.length===0}>{mutation.isPending?'Saving…':'Save settings'}</Button></div></form>{copied&&<Toast>Feedback link copied</Toast>}{saved&&<Toast>Settings saved</Toast>}</SettingsFrame>;
}

function SettingsFrame({children}:{children:React.ReactNode}) { return <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-7 md:py-10"><p className="fi-eyebrow">Workspace preferences</p><h1 className="fi-display mt-3 text-4xl font-medium">Settings</h1><p className="mt-2 mb-10 text-sm text-ink-muted">Control how your project appears and what reporters can submit.</p>{children}</div>; }
