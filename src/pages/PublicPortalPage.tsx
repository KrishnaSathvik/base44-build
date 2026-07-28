import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, CheckCircle2, Copy, ExternalLink, Link2, ShieldCheck, X } from 'lucide-react';
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
import { SiteFooter } from '@/components/SiteFooter';
import { ScreenshotUploader } from '@/components/ScreenshotUploader';
import { Button, Checkbox, Field, InlineError, Input, Select, Skeleton, Textarea } from '@/components/ui';
import { reporterTrackingUrl } from '@/lib/appUrls';

const TYPES: { value: FeedbackType; title: string; hint: string }[] = [
  { value: 'bug', title: 'Report a problem', hint: 'Something is broken or not working as expected.' },
  { value: 'feature', title: 'Suggest an improvement', hint: 'An idea that would make the product more useful.' },
  { value: 'general', title: 'Share general feedback', hint: 'A thought, question, or anything else.' },
];

const COPY: Record<FeedbackType, { heading: string; descriptionLabel: string; descriptionPlaceholder: string }> = {
  bug: {
    heading: 'What happened?',
    descriptionLabel: 'Describe the problem',
    descriptionPlaceholder: 'Tell us what you were doing and where things went wrong…',
  },
  feature: {
    heading: 'What would make this better?',
    descriptionLabel: 'Your feedback',
    descriptionPlaceholder: 'Share enough detail for the team to understand the idea…',
  },
  general: {
    heading: 'What would you like us to know?',
    descriptionLabel: 'Your feedback',
    descriptionPlaceholder: 'Share enough detail for the team to understand the idea…',
  },
};

const schema = z.object({
  description: z.string().min(1, 'Describe what happened so the team can investigate.').max(5000),
  expectedBehavior: z.string().max(5000).optional(),
  pageUrl: z.string().max(2000).optional().or(z.literal('')),
  reporterEmail: z.string().email('Enter a valid email address.').max(320).optional().or(z.literal('')),
  emailUpdatesEnabled: z.boolean().optional(),
  website: z.string().max(0).optional(),
});
type FormValues = z.infer<typeof schema>;

function firstEnabledType(enabled: FeedbackType[]): FeedbackType {
  return TYPES.find((option) => enabled.includes(option.value))?.value ?? 'bug';
}

export function PublicPortalPage() {
  const { projectSlug = '' } = useParams();
  const networkState = useNetworkState();
  const [type, setType] = useState<FeedbackType | null>(null);
  const [submissionKey, setSubmissionKey] = useState<string>(() => crypto.randomUUID());
  const [result, setResult] = useState<SubmitFeedbackResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<PendingScreenshot[]>([]);
  const [environment, setEnvironment] = useState(collectEnvironmentContext);
  const [includeEnvironment, setIncludeEnvironment] = useState(true);
  const [includePage, setIncludePage] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);
  const projectQuery = useQuery({
    queryKey: ['public-project', projectSlug],
    queryFn: () => getPublicProject(projectSlug),
    retry: false,
  });
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      expectedBehavior: '',
      pageUrl: environment.pageUrl ?? '',
      reporterEmail: '',
      emailUpdatesEnabled: false,
      website: '',
    },
  });
  const values = useWatch({ control });

  useEffect(() => {
    let active = true;
    void loadFeedbackDraft(projectSlug).then((draft) => {
      if (!active || !draft) return;
      setType(draft.type);
      setSubmissionKey(draft.submissionKey);
      setIncludeEnvironment(draft.includeEnvironment);
      setIncludePage(draft.includePage);
      setEnvironment(draft.context as EnvironmentContext);
      reset({
        description: draft.description,
        expectedBehavior: draft.expectedBehavior,
        pageUrl: draft.pageUrl,
        reporterEmail: draft.reporterEmail,
        emailUpdatesEnabled: draft.emailUpdatesEnabled,
        website: '',
      });
      setScreenshots(
        draft.attachments.map((attachment) => {
          const file = fileFromDraftAttachment(attachment);
          return {
            key: attachment.key,
            file,
            source: attachment.source,
            width: attachment.width,
            height: attachment.height,
            previewUrl: URL.createObjectURL(file),
            status: 'ready' as const,
            progress: 0,
          };
        }),
      );
      setDraftRestored(true);
    });
    return () => {
      active = false;
    };
  }, [projectSlug, reset]);

  useEffect(() => {
    if (!projectQuery.data) return;
    const enabled = projectQuery.data.feedbackTypesEnabled ?? ['bug', 'feature', 'general'];
    setType((current) => (current && enabled.includes(current) ? current : firstEnabledType(enabled)));
  }, [projectQuery.data]);

  useEffect(() => {
    const hasWork =
      !!values.description?.trim() ||
      !!values.expectedBehavior?.trim() ||
      !!values.reporterEmail?.trim() ||
      screenshots.length > 0;
    const timer = window.setTimeout(() => {
      if (!hasWork) {
        void discardFeedbackDraft(projectSlug);
        return;
      }
      void saveFeedbackDraft({
        projectSlug,
        type,
        description: values.description ?? '',
        expectedBehavior: values.expectedBehavior ?? '',
        pageUrl: values.pageUrl ?? '',
        reporterEmail: values.reporterEmail ?? '',
        emailUpdatesEnabled: values.emailUpdatesEnabled ?? false,
        includePage,
        includeEnvironment,
        context: environment as Record<string, string | number | undefined>,
        attachments: screenshots.map(draftAttachmentFromFile),
        submissionKey,
        lastUpdated: Date.now(),
      }).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    environment,
    includeEnvironment,
    includePage,
    projectSlug,
    screenshots,
    submissionKey,
    type,
    values.description,
    values.emailUpdatesEnabled,
    values.expectedBehavior,
    values.pageUrl,
    values.reporterEmail,
  ]);

  useEffect(() => {
    const persist = () => {
      const current = getValues();
      void saveFeedbackDraft({
        projectSlug,
        type,
        description: current.description ?? '',
        expectedBehavior: current.expectedBehavior ?? '',
        pageUrl: current.pageUrl ?? '',
        reporterEmail: current.reporterEmail ?? '',
        emailUpdatesEnabled: current.emailUpdatesEnabled ?? false,
        includePage,
        includeEnvironment,
        context: environment as Record<string, string | number | undefined>,
        attachments: screenshots.map(draftAttachmentFromFile),
        submissionKey,
        lastUpdated: Date.now(),
      }).catch(() => undefined);
    };
    window.addEventListener('feedback-inbox:before-update', persist);
    return () => window.removeEventListener('feedback-inbox:before-update', persist);
  }, [
    environment,
    getValues,
    includeEnvironment,
    includePage,
    projectSlug,
    screenshots,
    submissionKey,
    type,
  ]);

  useEffect(() => {
    if (networkState === 'reconnecting') void projectQuery.refetch();
  }, [networkState, projectQuery.refetch]);

  async function uploadOne(item: PendingScreenshot): Promise<string> {
    setScreenshots((current) =>
      current.map((entry) =>
        entry.key === item.key ? { ...entry, status: 'uploading', progress: 20, error: undefined } : entry,
      ),
    );
    try {
      const uploaded = await uploadFeedbackAttachment({
        projectSlug,
        submissionKey,
        attachmentKey: item.key,
        source: item.source,
        width: item.width,
        height: item.height,
        file: item.file,
      });
      setScreenshots((current) =>
        current.map((entry) =>
          entry.key === item.key
            ? { ...entry, status: 'uploaded', progress: 100, attachmentId: uploaded.attachmentId }
            : entry,
        ),
      );
      return uploaded.attachmentId;
    } catch (err) {
      const message = apiErrorMessage(err);
      setScreenshots((current) =>
        current.map((entry) =>
          entry.key === item.key ? { ...entry, status: 'failed', progress: 100, error: message } : entry,
        ),
      );
      throw err;
    }
  }

  async function retryUpload(key: string) {
    const item = screenshots.find((entry) => entry.key === key);
    if (!item) return;
    setSubmitError(null);
    try {
      await uploadOne(item);
    } catch {
      /* item retains an actionable error */
    }
  }

  async function onSubmit(formValues: FormValues) {
    if (!type) return;
    if (networkState !== 'online') {
      setSubmitError('You are offline. Your complete draft is saved and will be ready to submit after reconnection.');
      return;
    }
    const invalid = validateScreenshotSelection(
      0,
      screenshots.map((item) => item.file),
    );
    if (invalid) {
      setSubmitError(invalid);
      return;
    }
    setSubmitError(null);
    try {
      const attachmentIds: string[] = [];
      for (const item of screenshots) {
        attachmentIds.push(item.attachmentId ?? (await uploadOne(item)));
      }
      const submitted = await submitFeedback({
        projectSlug,
        submissionKey,
        type,
        description: formValues.description,
        expectedBehavior: type === 'bug' ? formValues.expectedBehavior || undefined : undefined,
        pageUrl: includePage ? formValues.pageUrl || undefined : undefined,
        reporterEmail: formValues.reporterEmail || undefined,
        emailUpdatesEnabled: formValues.emailUpdatesEnabled,
        website: formValues.website,
        attachmentIds,
        contextIncluded: includeEnvironment,
        browserName: includeEnvironment ? environment.browserName : undefined,
        browserVersion: includeEnvironment ? environment.browserVersion : undefined,
        operatingSystem: includeEnvironment ? environment.operatingSystem : undefined,
        deviceType: includeEnvironment ? environment.deviceType : undefined,
        screenWidth: includeEnvironment ? environment.screenWidth : undefined,
        screenHeight: includeEnvironment ? environment.screenHeight : undefined,
        viewportWidth: includeEnvironment ? environment.viewportWidth : undefined,
        viewportHeight: includeEnvironment ? environment.viewportHeight : undefined,
      });
      if (!submitted.success) throw new Error('The report was not accepted.');
      setResult(submitted);
      await discardFeedbackDraft(projectSlug);
    } catch (err) {
      setSubmitError(apiErrorMessage(err));
    }
  }

  if (projectQuery.isLoading) {
    return (
      <PortalFrame>
        <div className="mx-auto max-w-2xl py-16">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-5 h-20" />
          <Skeleton className="mt-10 h-48" />
        </div>
      </PortalFrame>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <PortalFrame>
        <State
          icon={<ExternalLink />}
          title="This feedback link is not available"
          body="The link may be incorrect, expired, or the project may have paused feedback collection."
        />
      </PortalFrame>
    );
  }

  const project = projectQuery.data;
  const enabledTypes = project.feedbackTypesEnabled ?? ['bug', 'feature', 'general'];
  const availableTypes = TYPES.filter((option) => enabledTypes.includes(option.value));
  const activeType = type && enabledTypes.includes(type) ? type : firstEnabledType(enabledTypes);
  const copy = COPY[activeType];
  const selectedMeta = TYPES.find((option) => option.value === activeType);

  if (result) {
    return (
      <PortalFrame productName={project.name}>
        <PageMetadata
          title="Feedback received"
          description={`Your feedback for ${project.name} was accepted.`}
        />
        <SubmissionConfirmation
          result={result}
          productUrl={project.productUrl}
          onSubmitAnother={() => {
            setResult(null);
            setScreenshots([]);
            setType(firstEnabledType(enabledTypes));
            setSubmissionKey(crypto.randomUUID());
            setIncludeEnvironment(true);
            setIncludePage(true);
            const next = collectEnvironmentContext();
            setEnvironment(next);
            reset({
              description: '',
              expectedBehavior: '',
              pageUrl: next.pageUrl ?? '',
              reporterEmail: '',
              emailUpdatesEnabled: false,
              website: '',
            });
            setSubmitError(null);
            setDraftRestored(false);
          }}
        />
      </PortalFrame>
    );
  }

  return (
    <PortalFrame productName={project.name}>
      <PageMetadata
        title="Submit Feedback"
        description={`Share private product feedback with the ${project.name} team.`}
      />
      <div className="mx-auto max-w-2xl py-8 sm:py-16">
        {draftRestored && (
          <div
            role="status"
            className="mb-6 flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span>Your unfinished feedback was restored.</span>
            <button
              type="button"
              className="min-h-11 shrink-0 self-start text-xs font-medium sm:self-auto"
              onClick={() => {
                void discardFeedbackDraft(projectSlug);
                screenshots.forEach((item) => URL.revokeObjectURL(item.previewUrl));
                setScreenshots([]);
                setType(firstEnabledType(enabledTypes));
                reset({
                  description: '',
                  expectedBehavior: '',
                  pageUrl: environment.pageUrl ?? '',
                  reporterEmail: '',
                  emailUpdatesEnabled: false,
                  website: '',
                });
                setSubmissionKey(crypto.randomUUID());
                setDraftRestored(false);
              }}
            >
              Discard draft
            </button>
          </div>
        )}

        <p className="fi-eyebrow break-words">Feedback for {project.name}</p>
        <h1 className="fi-display mt-3 text-[1.75rem] font-medium leading-tight sm:mt-4 sm:text-4xl">{copy.heading}</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink-muted sm:mt-4">
          {project.description ? `${project.description} ` : ''}
          Tell us what happened, what you expected, and anything else that may help the team.
        </p>
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-faint">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Screenshots are private. No account is required.
        </p>

        <form className="mt-7 space-y-5 sm:mt-8 sm:space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Field label="Feedback type" htmlFor="feedback-type">
            <Select
              id="feedback-type"
              value={activeType}
              onChange={(event) => setType(event.target.value as FeedbackType)}
              aria-label="Feedback type"
            >
              {availableTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.title}
                </option>
              ))}
            </Select>
            {selectedMeta && <p className="text-xs leading-5 text-ink-muted">{selectedMeta.hint}</p>}
          </Field>

          <Field label={copy.descriptionLabel} htmlFor="description" error={errors.description?.message}>
            <Textarea
              id="description"
              autoFocus
              placeholder={copy.descriptionPlaceholder}
              {...register('description')}
            />
          </Field>

          {activeType === 'bug' && (
            <Field label="What did you expect?" htmlFor="expectedBehavior" hint="Optional">
              <Textarea id="expectedBehavior" className="min-h-[96px]" {...register('expectedBehavior')} />
            </Field>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">
              Screenshots <span className="font-normal text-ink-faint">Optional</span>
            </p>
            <ScreenshotUploader
              screenshots={screenshots}
              onChange={setScreenshots}
              onRetry={retryUpload}
              disabled={isSubmitting}
            />
          </div>

          <section className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex items-start justify-between gap-3 border-b border-line p-4 sm:gap-4">
              <div className="min-w-0">
                <p className="fi-eyebrow">Device context</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Browser and screen details that help reproduce the issue. No IP address, precise location, or
                  fingerprinting.
                </p>
              </div>
              {includeEnvironment && (
                <button
                  type="button"
                  aria-label="Remove browser and device context"
                  onClick={() => setIncludeEnvironment(false)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-canvas hover:text-critical"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid gap-px bg-line text-xs sm:grid-cols-2">
              {includeEnvironment ? (
                <>
                  <ContextLine
                    label="Browser"
                    value={[environment.browserName, environment.browserVersion].filter(Boolean).join(' ')}
                  />
                  <ContextLine label="Device" value={environment.deviceType} />
                  <ContextLine
                    label="Screen"
                    value={dimensions(environment.screenWidth, environment.screenHeight)}
                  />
                  <ContextLine
                    label="Viewport"
                    value={dimensions(environment.viewportWidth, environment.viewportHeight)}
                  />
                </>
              ) : (
                <div className="col-span-full bg-surface p-4 text-ink-faint">Browser and device context removed.</div>
              )}
              {includePage ? (
                <div className="col-span-full bg-surface p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <label htmlFor="pageUrl" className="fi-mono text-[9px] uppercase text-ink-faint">
                      Page where this happened
                    </label>
                    <button
                      type="button"
                      className="min-h-11 self-start text-[10px] text-ink-muted hover:text-critical sm:min-h-0 sm:shrink-0"
                      onClick={() => {
                        setIncludePage(false);
                        setValue('pageUrl', '');
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <Input
                    id="pageUrl"
                    className="mt-2"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="e.g. /settings or https://yourproduct.com/checkout"
                    {...register('pageUrl')}
                  />
                  <p className="mt-2 text-[11px] leading-4 text-ink-faint">
                    Optional. Leave blank if you are unsure — do not use this feedback form’s own URL.
                  </p>
                  {errors.pageUrl && (
                    <div className="mt-2">
                      <InlineError>{errors.pageUrl.message}</InlineError>
                    </div>
                  )}
                </div>
              ) : (
                <div className="col-span-full bg-surface p-4 text-ink-faint">Page URL removed.</div>
              )}
            </div>
            {!includeEnvironment && (
              <button type="button" className="m-4 min-h-11 text-xs font-medium" onClick={() => setIncludeEnvironment(true)}>
                Restore browser/device context
              </button>
            )}
            {!includePage && (
              <button
                type="button"
                className="m-4 min-h-11 text-xs font-medium"
                onClick={() => {
                  setIncludePage(true);
                  setValue('pageUrl', environment.pageUrl ?? '');
                }}
              >
                Add page URL
              </button>
            )}
          </section>

          {project.collectReporterEmail !== false && (
            <details className="rounded-lg border border-line bg-surface">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
                <span>Contact details</span>
                <span className="text-xs font-normal text-ink-faint">Optional</span>
              </summary>
              <div className="space-y-5 border-t border-line p-4">
                <Field
                  label="Email"
                  htmlFor="reporterEmail"
                  hint="Only used for updates"
                  error={errors.reporterEmail?.message}
                >
                  <Input id="reporterEmail" type="email" autoComplete="email" {...register('reporterEmail')} />
                </Field>
                <Checkbox
                  label="Email me when the product team replies or changes this issue."
                  {...register('emailUpdatesEnabled')}
                />
                <p className="text-xs leading-5 text-ink-faint">
                  Email is optional and is never used for marketing. Your private tracking link works without email
                  consent.
                </p>
              </div>
            </details>
          )}

          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...register('website')} />
          {submitError && <InlineError>{submitError}</InlineError>}
          {networkState !== 'online' && (
            <p
              role="status"
              className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm text-warning"
            >
              You are offline. This draft is saved on this device and can be submitted deliberately after reconnection.
            </p>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || networkState !== 'online' || !type}
            className="w-full min-h-12 sm:w-auto sm:min-h-11"
          >
            {isSubmitting ? 'Uploading and sending…' : 'Send feedback'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </PortalFrame>
  );
}

function SubmissionConfirmation({
  result,
  productUrl,
  onSubmitAnother,
}: {
  result: SubmitFeedbackResult;
  productUrl?: string | null;
  onSubmitAnother: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showFullLink, setShowFullLink] = useState(false);
  const trackingLink = result.trackingToken ? reporterTrackingUrl(result.trackingToken) : null;

  async function copyLink() {
    if (!trackingLink) return;
    try {
      await navigator.clipboard.writeText(trackingLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable; URL remains selectable */
    }
  }

  return (
    <div className="confirm-in mx-auto max-w-lg py-8 sm:py-14">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-success/25 bg-success-soft text-success shadow-sm">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </span>
        <p className="fi-eyebrow mt-6">Received</p>
        <h1 className="fi-display mt-3 text-[1.75rem] font-medium leading-tight sm:text-3xl">
          Your feedback is in
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-muted">
          Save your private tracking link — it’s the only way to follow this report.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-line bg-surface text-left shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-ink-muted" aria-hidden />
            Private tracking
          </span>
          {result.publicCode && (
            <span className="fi-mono rounded bg-canvas px-2 py-1 text-[10px] uppercase tracking-wider text-ink-muted">
              {result.publicCode}
            </span>
          )}
        </div>

        {trackingLink ? (
          <div className="space-y-4 p-4 sm:p-5">
            <Button type="button" className="w-full min-h-12 sm:min-h-11" onClick={() => void copyLink()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Link copied' : 'Copy tracking link'}
            </Button>

            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="fi-mono text-[9px] uppercase tracking-wider text-ink-faint">Your private link</p>
                <button
                  type="button"
                  className="text-xs font-medium text-ink-muted hover:text-ink"
                  onClick={() => setShowFullLink((value) => !value)}
                >
                  {showFullLink ? 'Hide full link' : 'Show full link'}
                </button>
              </div>
              <div className="mt-2 rounded-lg border border-line bg-canvas px-3 py-3">
                <p className="fi-mono break-all text-[11px] leading-5 text-ink sm:text-xs">
                  {showFullLink ? trackingLink : truncateTrackingLink(trackingLink)}
                </p>
              </div>
            </div>

            <a
              href={trackingLink}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-ink sm:min-h-11"
            >
              Open tracking page
              <ArrowRight className="h-4 w-4" />
            </a>

            <p className="flex items-start gap-2 text-xs leading-5 text-ink-faint">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              This link is private. Bookmark it or copy it now — it will not appear in email unless you opted in.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <p className="text-sm text-ink-muted">This report was already received.</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="secondary"
          className="w-full min-h-12 sm:w-auto sm:min-h-11"
          onClick={onSubmitAnother}
        >
          Submit another report
        </Button>
        {productUrl ? (
          <a
            href={productUrl}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink sm:min-h-11 sm:w-auto"
          >
            Return to product
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function truncateTrackingLink(url: string) {
  try {
    const parsed = new URL(url);
    const token = parsed.pathname.split('/').filter(Boolean).pop() ?? '';
    if (token.length <= 14) return url;
    return `${parsed.origin}/track/${token.slice(0, 6)}…${token.slice(-4)}`;
  } catch {
    return url.length > 48 ? `${url.slice(0, 28)}…${url.slice(-8)}` : url;
  }
}

function dimensions(width?: number, height?: number) {
  return width && height ? `${width} × ${height}` : 'Not available';
}

function ContextLine({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-surface p-4">
      <p className="fi-mono text-[9px] uppercase text-ink-faint">{label}</p>
      <p className="mt-2 break-words text-sm text-ink-muted">{value || 'Not available'}</p>
    </div>
  );
}

function PortalFrame({ children, productName }: { children: ReactNode; productName?: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
        <div className="mx-auto flex min-h-14 max-w-4xl items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:min-h-16 sm:gap-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{productName || 'Feedback portal'}</p>
            <p className="fi-mono mt-1 text-[8px] uppercase tracking-wider text-ink-faint">Share feedback</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 text-[11px] text-ink-faint sm:text-xs">
            <BrandMark className="h-5 w-5" decorative />
            <span className="hidden sm:inline">Powered by VensaOS</span>
            <span className="sm:hidden">VensaOS</span>
          </span>
        </div>
      </header>
      <main className="flex-1 px-4 pb-10 sm:px-6 sm:pb-16">{children}</main>
      <SiteFooter />
    </div>
  );
}

function State({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-1 py-12 text-center sm:py-24">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </span>
      <h1 className="fi-display mt-6 text-2xl font-medium sm:text-3xl">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-ink-muted">{body}</p>
      {children}
    </div>
  );
}
