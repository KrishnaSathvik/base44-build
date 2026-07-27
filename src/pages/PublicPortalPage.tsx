import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Bug, CheckCircle2, ExternalLink, Lightbulb, MessageSquareText, ShieldCheck, X } from 'lucide-react';
import { apiErrorMessage, getPublicProject, submitFeedback, uploadFeedbackAttachment } from '@/lib/api';
import type { FeedbackType, SubmitFeedbackResult } from '@/lib/types';
import type { PendingScreenshot } from '@/lib/attachments';
import { collectEnvironmentContext } from '@/lib/environment';
import type { EnvironmentContext } from '@/lib/environment';
import { discardFeedbackDraft, draftAttachmentFromFile, fileFromDraftAttachment, loadFeedbackDraft, saveFeedbackDraft } from '@/lib/feedbackDraft';
import { validateScreenshotSelection } from '@/lib/attachments';
import { useNetworkState } from '@/app/NetworkStateProvider';
import { PageMetadata } from '@/app/PageMetadata';
import { BrandMark } from '@/components/Brand';
import { ScreenshotUploader } from '@/components/ScreenshotUploader';
import { Button, Checkbox, Field, InlineError, Input, Skeleton, Textarea } from '@/components/ui';
import { reporterTrackingUrl } from '@/lib/appUrls';

const TYPES: {value:FeedbackType;title:string;hint:string;icon:typeof Bug}[] = [
  {value:'bug',title:'Report a problem',hint:'Something is broken or not working as expected.',icon:Bug},
  {value:'feature',title:'Suggest an improvement',hint:'An idea that would make the product more useful.',icon:Lightbulb},
  {value:'general',title:'Share general feedback',hint:'A thought, question, or anything else.',icon:MessageSquareText},
];
const schema=z.object({description:z.string().min(1,'Describe what happened so the team can investigate.').max(5000),expectedBehavior:z.string().max(5000).optional(),pageUrl:z.string().max(2000).optional().or(z.literal('')),reporterEmail:z.string().email('Enter a valid email address.').max(320).optional().or(z.literal('')),emailUpdatesEnabled:z.boolean().optional(),website:z.string().max(0).optional()});
type FormValues=z.infer<typeof schema>;

export function PublicPortalPage(){
  const {projectSlug=''}=useParams();
  const networkState=useNetworkState();
  const [type,setType]=useState<FeedbackType|null>(null);
  const [submissionKey,setSubmissionKey]=useState<string>(()=>crypto.randomUUID());
  const [result,setResult]=useState<SubmitFeedbackResult|null>(null);
  const [submitError,setSubmitError]=useState<string|null>(null);
  const [screenshots,setScreenshots]=useState<PendingScreenshot[]>([]);
  const [environment,setEnvironment]=useState(collectEnvironmentContext);
  const [includeEnvironment,setIncludeEnvironment]=useState(true);
  const [includePage,setIncludePage]=useState(true);
  const [draftRestored,setDraftRestored]=useState(false);
  const projectQuery=useQuery({queryKey:['public-project',projectSlug],queryFn:()=>getPublicProject(projectSlug),retry:false});
  const {register,handleSubmit,setValue,reset,control,getValues,formState:{errors,isSubmitting}}=useForm<FormValues>({resolver:zodResolver(schema),defaultValues:{description:'',expectedBehavior:'',pageUrl:environment.pageUrl ?? '',reporterEmail:'',emailUpdatesEnabled:false,website:''}});
  const values=useWatch({control});

  useEffect(()=>{let active=true;void loadFeedbackDraft(projectSlug).then(draft=>{if(!active||!draft)return;setType(draft.type);setSubmissionKey(draft.submissionKey);setIncludeEnvironment(draft.includeEnvironment);setIncludePage(draft.includePage);setEnvironment(draft.context as EnvironmentContext);reset({description:draft.description,expectedBehavior:draft.expectedBehavior,pageUrl:draft.pageUrl,reporterEmail:draft.reporterEmail,emailUpdatesEnabled:draft.emailUpdatesEnabled,website:''});setScreenshots(draft.attachments.map(attachment=>{const file=fileFromDraftAttachment(attachment);return{key:attachment.key,file,source:attachment.source,width:attachment.width,height:attachment.height,previewUrl:URL.createObjectURL(file),status:'ready' as const,progress:0};}));setDraftRestored(true);});return()=>{active=false;};},[projectSlug,reset]);

  useEffect(()=>{const hasWork=!!type||!!values.description||!!values.expectedBehavior||!!values.reporterEmail||screenshots.length>0;if(!hasWork)return;const timer=window.setTimeout(()=>{void saveFeedbackDraft({projectSlug,type,description:values.description??'',expectedBehavior:values.expectedBehavior??'',pageUrl:values.pageUrl??'',reporterEmail:values.reporterEmail??'',emailUpdatesEnabled:values.emailUpdatesEnabled??false,includePage,includeEnvironment,context:environment as Record<string,string|number|undefined>,attachments:screenshots.map(draftAttachmentFromFile),submissionKey,lastUpdated:Date.now()}).catch(()=>undefined);},400);return()=>window.clearTimeout(timer);},[environment,includeEnvironment,includePage,projectSlug,screenshots,submissionKey,type,values.description,values.emailUpdatesEnabled,values.expectedBehavior,values.pageUrl,values.reporterEmail]);

  useEffect(()=>{const persist=()=>{const current=getValues();void saveFeedbackDraft({projectSlug,type,description:current.description??'',expectedBehavior:current.expectedBehavior??'',pageUrl:current.pageUrl??'',reporterEmail:current.reporterEmail??'',emailUpdatesEnabled:current.emailUpdatesEnabled??false,includePage,includeEnvironment,context:environment as Record<string,string|number|undefined>,attachments:screenshots.map(draftAttachmentFromFile),submissionKey,lastUpdated:Date.now()}).catch(()=>undefined);};window.addEventListener('feedback-inbox:before-update',persist);return()=>window.removeEventListener('feedback-inbox:before-update',persist);},[environment,getValues,includeEnvironment,includePage,projectSlug,screenshots,submissionKey,type]);

  useEffect(()=>{if(networkState==='reconnecting')void projectQuery.refetch();},[networkState,projectQuery.refetch]);

  async function uploadOne(item:PendingScreenshot):Promise<string>{
    setScreenshots(current=>current.map(entry=>entry.key===item.key?{...entry,status:'uploading',progress:20,error:undefined}:entry));
    try{
      const uploaded=await uploadFeedbackAttachment({projectSlug,submissionKey,attachmentKey:item.key,source:item.source,width:item.width,height:item.height,file:item.file});
      setScreenshots(current=>current.map(entry=>entry.key===item.key?{...entry,status:'uploaded',progress:100,attachmentId:uploaded.attachmentId}:entry));
      return uploaded.attachmentId;
    }catch(err){
      const message=apiErrorMessage(err);
      setScreenshots(current=>current.map(entry=>entry.key===item.key?{...entry,status:'failed',progress:100,error:message}:entry));
      throw err;
    }
  }

  async function retryUpload(key:string){const item=screenshots.find(entry=>entry.key===key);if(!item)return;setSubmitError(null);try{await uploadOne(item);}catch{/* item retains an actionable error */}}

  async function onSubmit(values:FormValues){
    if(!type)return;
    if(networkState!=='online'){setSubmitError('You are offline. Your complete draft is saved and will be ready to submit after reconnection.');return;}
    const invalid=validateScreenshotSelection(0,screenshots.map(item=>item.file));if(invalid){setSubmitError(invalid);return;}
    setSubmitError(null);
    try{
      const attachmentIds:string[]=[];
      for(const item of screenshots){attachmentIds.push(item.attachmentId ?? await uploadOne(item));}
      const submitted=await submitFeedback({
        projectSlug,submissionKey,type,description:values.description,expectedBehavior:values.expectedBehavior||undefined,
        pageUrl:includePage?(values.pageUrl||undefined):undefined,reporterEmail:values.reporterEmail||undefined,
        emailUpdatesEnabled:values.emailUpdatesEnabled,website:values.website,attachmentIds,
        contextIncluded:includeEnvironment,
        browserName:includeEnvironment?environment.browserName:undefined,browserVersion:includeEnvironment?environment.browserVersion:undefined,
        operatingSystem:includeEnvironment?environment.operatingSystem:undefined,deviceType:includeEnvironment?environment.deviceType:undefined,
        screenWidth:includeEnvironment?environment.screenWidth:undefined,screenHeight:includeEnvironment?environment.screenHeight:undefined,
        viewportWidth:includeEnvironment?environment.viewportWidth:undefined,viewportHeight:includeEnvironment?environment.viewportHeight:undefined,
      });
      if(!submitted.success)throw new Error('The report was not accepted.');
      setResult(submitted);
      await discardFeedbackDraft(projectSlug);
    }catch(err){setSubmitError(apiErrorMessage(err));}
  }

  if(projectQuery.isLoading)return <PortalFrame><div className="mx-auto max-w-2xl py-16"><Skeleton className="h-8 w-56"/><Skeleton className="mt-5 h-20"/><Skeleton className="mt-10 h-48"/></div></PortalFrame>;
  if(projectQuery.isError||!projectQuery.data)return <PortalFrame><State icon={<ExternalLink/>} title="This feedback link is not available" body="The link may be incorrect, expired, or the project may have paused feedback collection." /></PortalFrame>;
  const project=projectQuery.data;

  if(result){
    const trackingLink=result.trackingToken?reporterTrackingUrl(result.trackingToken):null;
    return <PortalFrame productName={project.name}><State icon={<CheckCircle2/>} title="Your feedback is in" body="The report and private evidence were accepted. Keep the private link below to follow what happens next."><div className="mt-7 rounded-lg border border-line bg-surface-subtle p-4 text-left"><div className="flex items-center justify-between"><span className="fi-eyebrow">Private tracking</span>{result.publicCode&&<span className="fi-mono text-[10px] text-ink-faint">{result.publicCode}</span>}</div>{trackingLink?<><p className="fi-mono mt-3 break-all text-xs leading-5">{trackingLink}</p><a href={trackingLink} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium">Open tracking page <ArrowRight className="h-4 w-4"/></a></>:<p className="mt-3 text-sm text-ink-muted">This report was already received.</p>}</div></State></PortalFrame>;
  }

  const enabledTypes=project.feedbackTypesEnabled ?? ['bug','feature','general'];
  return <PortalFrame productName={project.name}><PageMetadata title="Submit Feedback" description={`Share private product feedback with the ${project.name} team.`}/><div className="mx-auto max-w-2xl py-10 sm:py-16">{draftRestored&&<div role="status" className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4 text-sm"><span>Your unfinished feedback was restored.</span><button type="button" className="min-h-11 text-xs font-medium" onClick={()=>{void discardFeedbackDraft(projectSlug);screenshots.forEach(item=>URL.revokeObjectURL(item.previewUrl));setScreenshots([]);setType(null);reset({description:'',expectedBehavior:'',pageUrl:environment.pageUrl??'',reporterEmail:'',emailUpdatesEnabled:false,website:''});setSubmissionKey(crypto.randomUUID());setDraftRestored(false);}}>Discard draft</button></div>}{!type ? <>
    <p className="fi-eyebrow">Feedback for {project.name}</p><h1 className="fi-display mt-4 text-3xl font-medium leading-tight sm:text-4xl md:text-5xl">Share feedback</h1>
    <p className="mt-5 max-w-xl text-[15px] leading-7 text-ink-muted">{project.description ? `${project.description} ` : ''}Tell us what happened, what you expected, and anything else that may help the team understand the issue.</p>
    <div className="mt-10 border-t border-line">{TYPES.filter(option=>enabledTypes.includes(option.value)).map(({value,title,hint,icon:Icon})=><button key={value} type="button" onClick={()=>setType(value)} className="group grid min-h-[104px] w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-4 text-left sm:gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted group-hover:border-ink group-hover:text-ink"><Icon className="h-5 w-5"/></span><span className="min-w-0"><span className="block text-[15px] font-medium">{title}</span><span className="mt-1 block text-sm leading-5 text-ink-muted">{hint}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-1"/></button>)}</div>
    <p className="mt-6 flex items-center gap-2 text-xs text-ink-faint"><ShieldCheck className="h-4 w-4"/>Screenshots are private. No account is required.</p>
  </> : <>
    <button type="button" onClick={()=>setType(null)} className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4"/>Choose another type</button>
    <p className="fi-eyebrow mt-5">{TYPES.find(option=>option.value===type)?.title}</p><h1 className="fi-display mt-3 text-3xl font-medium sm:text-4xl">{type==='bug'?'What happened?':type==='feature'?'What would make this better?':'What would you like us to know?'}</h1>
    <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <Field label={type==='bug'?'Describe the problem':'Your feedback'} htmlFor="description" error={errors.description?.message}><Textarea id="description" autoFocus placeholder={type==='bug'?'Tell us what you were doing and where things went wrong…':'Share enough detail for the team to understand the idea…'} {...register('description')}/></Field>
      {type==='bug'&&<Field label="What did you expect?" htmlFor="expectedBehavior" hint="Optional"><Textarea id="expectedBehavior" className="min-h-[96px]" {...register('expectedBehavior')}/></Field>}
      <div><p className="mb-2 text-sm font-medium">Screenshots <span className="font-normal text-ink-faint">Optional</span></p><ScreenshotUploader screenshots={screenshots} onChange={setScreenshots} onRetry={retryUpload} disabled={isSubmitting}/></div>
      <section className="rounded-lg border border-line bg-surface"><div className="flex items-start justify-between gap-4 border-b border-line p-4"><div><p className="fi-eyebrow">Context attached</p><p className="mt-1 text-xs leading-5 text-ink-muted">Useful reproduction details only. No IP address, precise location, or fingerprinting identifiers.</p></div>{includeEnvironment&&<button type="button" aria-label="Remove browser and device context" onClick={()=>setIncludeEnvironment(false)} className="p-2 text-ink-muted hover:text-critical"><X className="h-4 w-4"/></button>}</div>
        <div className="grid gap-px bg-line text-xs sm:grid-cols-2">{includeEnvironment?<><ContextLine label="Browser" value={[environment.browserName,environment.browserVersion].filter(Boolean).join(' ')}/><ContextLine label="Device" value={environment.deviceType}/><ContextLine label="Screen" value={dimensions(environment.screenWidth,environment.screenHeight)}/><ContextLine label="Viewport" value={dimensions(environment.viewportWidth,environment.viewportHeight)}/></>:<div className="col-span-2 bg-surface p-4 text-ink-faint">Browser and device context removed.</div>}
          {includePage?<div className="col-span-2 bg-surface p-4"><div className="flex items-center justify-between"><label htmlFor="pageUrl" className="fi-mono text-[9px] uppercase text-ink-faint">Page</label><button type="button" className="text-[10px] text-ink-muted hover:text-critical" onClick={()=>{setIncludePage(false);setValue('pageUrl','');}}>Remove page</button></div><Input id="pageUrl" className="mt-2" placeholder="/chat or https://product.example/chat" {...register('pageUrl')}/>{errors.pageUrl&&<div className="mt-2"><InlineError>{errors.pageUrl.message}</InlineError></div>}</div>:<div className="col-span-2 bg-surface p-4 text-ink-faint">Page URL removed.</div>}
        </div>{!includeEnvironment&&<button type="button" className="m-4 text-xs font-medium" onClick={()=>setIncludeEnvironment(true)}>Restore browser/device context</button>}{!includePage&&<button type="button" className="m-4 text-xs font-medium" onClick={()=>{setIncludePage(true);setValue('pageUrl',environment.pageUrl??'');}}>Restore page URL</button>}</section>
      {project.collectReporterEmail !== false && <details className="rounded-lg border border-line bg-surface"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium">Contact details <span className="text-xs font-normal text-ink-faint">Optional</span></summary><div className="space-y-5 border-t border-line p-4"><Field label="Email" htmlFor="reporterEmail" hint="Only used for updates" error={errors.reporterEmail?.message}><Input id="reporterEmail" type="email" autoComplete="email" {...register('reporterEmail')}/></Field><Checkbox label="Email me when the product team replies or changes this issue." {...register('emailUpdatesEnabled')}/><p className="text-xs leading-5 text-ink-faint">Email is optional and is never used for marketing. Your private tracking link works without email consent.</p></div></details>}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...register('website')}/>
      {submitError&&<InlineError>{submitError}</InlineError>}
      {networkState!=='online'&&<p role="status" className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm text-warning">You are offline. This draft is saved on this device and can be submitted deliberately after reconnection.</p>}
      <Button type="submit" disabled={isSubmitting||networkState!=='online'} className="w-full sm:w-auto">{isSubmitting?'Uploading and sending…':'Send feedback'}<ArrowRight className="h-4 w-4"/></Button>
    </form>
  </>}</div></PortalFrame>;
}

function dimensions(width?:number,height?:number){return width&&height?`${width} × ${height}`:'Not available';}
function ContextLine({label,value}:{label:string;value?:string}){return <div className="bg-surface p-4"><p className="fi-mono text-[9px] uppercase text-ink-faint">{label}</p><p className="mt-2 text-sm text-ink-muted">{value||'Not available'}</p></div>;}
function PortalFrame({children,productName}:{children:ReactNode;productName?:string}){return <div className="min-h-screen bg-canvas"><header className="border-b border-line"><div className="mx-auto flex min-h-16 max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6"><div className="min-w-0"><p className="truncate text-sm font-medium">{productName||'Feedback portal'}</p><p className="fi-mono mt-1 text-[8px] uppercase tracking-wider text-ink-faint">Share feedback</p></div><span className="inline-flex shrink-0 items-center gap-2 text-[11px] text-ink-faint sm:text-xs"><BrandMark className="h-5 w-5" decorative/><span className="hidden sm:inline">Powered by VensaOS</span><span className="sm:hidden">VensaOS</span></span></div></header><main className="px-4 sm:px-6">{children}</main></div>}
function State({icon,title,body,children}:{icon:ReactNode;title:string;body:string;children?:ReactNode}){return <div className="mx-auto max-w-lg py-16 text-center sm:py-24"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted [&>svg]:h-5 [&>svg]:w-5">{icon}</span><h1 className="fi-display mt-6 text-2xl font-medium sm:text-3xl">{title}</h1><p className="mt-3 text-sm leading-6 text-ink-muted">{body}</p>{children}</div>}
