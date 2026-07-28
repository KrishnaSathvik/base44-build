import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock3,
  Link2Off,
  LockKeyhole,
  MessageSquareText,
  Monitor,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  accessTrackingPage,
  addReporterFollowUp,
  apiErrorMessage,
  confirmResolution,
  disableReporterEmailConsent,
  getReporterAttachmentAccess,
  uploadFollowUpAttachment,
} from '@/lib/api';
import { formatTime, statusLabel, typeLabel } from '@/lib/format';
import { BrandMark } from '@/components/Brand';
import { SiteFooter } from '@/components/SiteFooter';
import { AttachmentGallery, type GalleryAttachment } from '@/components/AttachmentGallery';
import { ScreenshotUploader } from '@/components/ScreenshotUploader';
import { Button, InlineError, Skeleton, Spinner, StatusBadge, Textarea } from '@/components/ui';
import type { PendingScreenshot } from '@/lib/attachments';

const TRACKING_POLL_MS = 20_000;

type TrackingToast = { tone: 'info' | 'success'; message: string };

function trackingSignature(data: {
  status: string;
  publicMessages: unknown[];
  publicActivityEvents: Array<{ createdAt?: string | null; message: string }>;
  publicResolutionNote?: string | null;
  resolutionConfirmationStatus?: string | null;
}) {
  return [
    data.status,
    data.resolutionConfirmationStatus ?? '',
    data.publicResolutionNote ?? '',
    String(data.publicMessages.length),
    ...data.publicActivityEvents.map((event) => `${event.createdAt ?? ''}:${event.message}`),
  ].join('|');
}

export function TrackingPage() {
  const { token = '' } = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, error, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['tracking', token],
    queryFn: () => accessTrackingPage(token),
    retry: false,
    refetchInterval: (query) =>
      typeof document !== 'undefined' && document.visibilityState === 'visible' && query.state.data
        ? TRACKING_POLL_MS
        : false,
    refetchOnWindowFocus: true,
  });
  const access = useCallback(
    (attachment: GalleryAttachment) => getReporterAttachmentAccess(token, attachment.accessKey ?? ''),
    [token],
  );
  const [body, setBody] = useState('');
  const [screenshots, setScreenshots] = useState<PendingScreenshot[]>([]);
  const [followUpKind, setFollowUpKind] = useState<'general' | 'not_fixed'>('general');
  const [notFixedExplanation, setNotFixedExplanation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<TrackingToast | null>(null);
  const [checking, setChecking] = useState(false);
  const signatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;
    signatureRef.current = trackingSignature(data);
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const followUp = useMutation({
    mutationFn: async () => {
      const idempotencyKey = crypto.randomUUID();
      const attachmentIds: string[] = [];
      for (const item of screenshots) {
        const uploaded = await uploadFollowUpAttachment({
          token,
          followUpKey: idempotencyKey,
          attachmentKey: item.key,
          source: item.source,
          width: item.width,
          height: item.height,
          file: item.file,
        });
        attachmentIds.push(uploaded.attachmentId);
      }
      return addReporterFollowUp({
        token,
        idempotencyKey,
        body: body.trim(),
        resolvedFollowUpType: data?.status === 'resolved' ? followUpKind : undefined,
        attachmentIds,
      });
    },
    onSuccess: (tracking) => {
      queryClient.setQueryData(['tracking', token], tracking);
      setBody('');
      setScreenshots([]);
      setFormError(null);
    },
    onError: (err) => setFormError(apiErrorMessage(err)),
  });

  const confirmation = useMutation({
    mutationFn: (choice: 'fixed' | 'not_fixed') =>
      confirmResolution({
        token,
        idempotencyKey: crypto.randomUUID(),
        choice,
        explanation: choice === 'not_fixed' ? notFixedExplanation.trim() : undefined,
      }),
    onSuccess: (tracking) => {
      queryClient.setQueryData(['tracking', token], tracking);
      setNotFixedExplanation('');
      setFormError(null);
    },
    onError: (err) => setFormError(apiErrorMessage(err)),
  });

  const optOut = useMutation({
    mutationFn: () => disableReporterEmailConsent(token),
    onSuccess: (tracking) => queryClient.setQueryData(['tracking', token], tracking),
    onError: (err) => setFormError(apiErrorMessage(err)),
  });

  async function checkForUpdates() {
    if (checking) return;
    setChecking(true);
    const previous = signatureRef.current;
    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['tracking', token],
        queryFn: () => accessTrackingPage(token),
      });
      const next = trackingSignature(result);
      signatureRef.current = next;
      if (previous && previous === next) {
        setToast({ tone: 'info', message: 'No new updates' });
      } else {
        setToast({ tone: 'success', message: 'Updated' });
      }
    } catch {
      setToast({ tone: 'info', message: 'Could not check for updates' });
    } finally {
      setChecking(false);
    }
  }

  if (isLoading) {
    return (
      <Frame>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-8 h-40" />
        <Skeleton className="mt-6 h-60" />
      </Frame>
    );
  }

  if (error || !data) {
    const message = apiErrorMessage(error);
    const expired = /expir/i.test(message);
    return (
      <Frame>
        <div className="py-20 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted">
            {expired ? <Clock3 className="h-5 w-5" /> : <Link2Off className="h-5 w-5" />}
          </span>
          <h1 className="fi-display mt-6 text-3xl font-medium">
            {expired ? 'This tracking link has expired' : 'This tracking link is not valid'}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-muted">
            {expired
              ? 'The private access window has ended. Contact the product team if you still need an update.'
              : 'Check that the entire private link was copied. Tracking links cannot be searched or recovered publicly.'}
          </p>
        </div>
      </Frame>
    );
  }

  const needsInfo = data.status === 'needs_info';
  const pendingConfirmation = data.status === 'resolved' && data.resolutionConfirmationStatus === 'pending';
  const latestActivity = data.publicActivityEvents[0];

  return (
    <Frame>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 mx-auto max-w-sm rounded-lg border px-4 py-3 text-center text-sm shadow-sheet sm:left-1/2 sm:right-auto sm:-translate-x-1/2 ${
            toast.tone === 'success'
              ? 'border-success/30 bg-success-soft text-success'
              : 'border-line bg-surface text-ink'
          }`}
        >
          {toast.message}
        </div>
      )}

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              {data.publicIssueCode && (
                <span className="fi-mono text-[10px] text-ink-faint">{data.publicIssueCode}</span>
              )}
              <StatusBadge status={data.status} label={statusLabel(data.status)} />
              {(isFetching || checking) && <Spinner className="h-4 w-4" />}
            </div>
            <p className="mt-3 text-sm leading-6 text-ink">
              {latestActivity?.message ?? 'Your feedback was received. Public updates will appear here.'}
            </p>
            <p className="fi-mono mt-2 text-[9px] uppercase text-ink-faint">
              {latestActivity ? formatTime(latestActivity.createdAt) : formatTime(data.createdAt)}
              {dataUpdatedAt ? ` · Checked ${formatTime(new Date(dataUpdatedAt).toISOString())}` : ''}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full min-h-11 sm:w-auto"
            disabled={checking}
            onClick={() => void checkForUpdates()}
          >
            {checking ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            {checking ? 'Checking…' : 'Check for updates'}
          </Button>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <p className="fi-eyebrow">Public activity</p>
          <div className="mt-4 border-l border-line pl-5">
            {data.publicActivityEvents.length ? (
              data.publicActivityEvents.map((event, index) => (
                <div
                  key={`${event.createdAt}-${index}`}
                  className="relative pb-5 last:pb-0"
                  style={{ animation: 'activity-in .35s both', animationDelay: `${Math.min(index, 4) * 40}ms` }}
                >
                  <span className="absolute -left-[27px] top-0 h-3.5 w-3.5 rounded-full border-4 border-surface bg-ink-muted" />
                  <p className="text-sm leading-6">{event.message}</p>
                  <p className="fi-mono mt-1 text-[9px] text-ink-faint">{formatTime(event.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="flex gap-2 text-sm leading-6 text-ink-muted">
                <MessageSquareText className="mt-1 h-4 w-4 shrink-0" />
                The team has your report. Public updates will appear here.
              </p>
            )}
          </div>
        </div>

        {data.canManageEmailUpdates && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs text-ink-muted">Email updates: {data.emailUpdatesEnabled ? 'On' : 'Off'}</p>
            {data.emailUpdatesEnabled && (
              <Button
                className="mt-2"
                variant="ghost"
                disabled={optOut.isPending}
                onClick={() => optOut.mutate()}
              >
                Disable email updates
              </Button>
            )}
          </div>
        )}
      </section>

      <header className="mt-10 border-b border-line pb-8">
        <h1 className="fi-display break-words text-3xl font-medium leading-tight sm:text-4xl">
          {data.issueTitle ?? 'Your report'}
        </h1>
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-faint sm:items-center">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0" />
          Only someone with this private link can view this report and its evidence.
        </p>
      </header>

      {needsInfo && (
        <div className="mt-7 rounded-lg border border-warning/35 bg-warning-soft p-5">
          <p className="font-medium">The product team needs more information</p>
          <p className="mt-1 text-sm text-ink-muted">
            Review their latest question below, then reply with any details or screenshots that may help.
          </p>
        </div>
      )}
      {data.status === 'reopened' && (
        <div className="mt-7 rounded-lg border border-critical/25 bg-critical-soft p-5">
          <p className="flex items-center gap-2 font-medium text-critical">
            <RotateCcw className="h-4 w-4" />
            This issue has been reopened
          </p>
          <p className="mt-1 text-sm text-ink-muted">The product team can now review the latest explanation.</p>
        </div>
      )}

      <div className="space-y-10 py-8 sm:py-10">
        <section>
          <p className="fi-eyebrow">Original report</p>
          <blockquote className="mt-4 break-words border-y border-line bg-surface px-4 py-6 text-base leading-7 sm:px-6 sm:py-7 sm:text-lg sm:leading-8">
            {data.originalDescription}
          </blockquote>
          <p className="fi-mono mt-3 text-[9px] uppercase text-ink-faint">
            {typeLabel(data.feedbackType)} · {formatTime(data.createdAt)}
          </p>
        </section>

        <section>
          <p className="fi-eyebrow">Your screenshots</p>
          <h2 className="fi-display mb-4 mt-2 text-2xl font-medium">Private evidence</h2>
          <AttachmentGallery attachments={data.ownAttachments} getAccess={access} />
        </section>

        <section>
          <p className="fi-eyebrow">Submitted context</p>
          <h2 className="fi-display mb-4 mt-2 text-2xl font-medium">Environment</h2>
          {data.originalContext ? (
            <div className="grid gap-px bg-line sm:grid-cols-2">
              <Context
                label="Browser"
                value={[data.originalContext.browserName, data.originalContext.browserVersion]
                  .filter(Boolean)
                  .join(' ')}
              />
              <Context
                label="Device"
                value={[data.originalContext.deviceType, data.originalContext.operatingSystem]
                  .filter(Boolean)
                  .join(' · ')}
              />
              <Context
                label="Screen"
                value={size(data.originalContext.screenWidth, data.originalContext.screenHeight)}
              />
              <Context
                label="Viewport"
                value={size(data.originalContext.viewportWidth, data.originalContext.viewportHeight)}
              />
              <Context label="Page" value={data.originalContext.pageUrl ?? 'Not submitted'} wide />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line p-6 text-center">
              <Monitor className="mx-auto h-5 w-5 text-ink-faint" />
              <p className="mt-2 text-sm">Context was removed before submission</p>
            </div>
          )}
        </section>

        <section>
          <p className="fi-eyebrow">Conversation</p>
          <h2 className="fi-display mb-4 mt-2 text-2xl font-medium">Updates with the product team</h2>
          {data.publicMessages.length ? (
            <div className="space-y-3">
              {data.publicMessages.map((message, index) => (
                <article
                  key={`${message.createdAt}-${index}`}
                  className={`rounded-lg border p-5 ${
                    message.senderLabel === 'You'
                      ? 'border-info/25 bg-info-soft/35'
                      : 'border-line bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium">{message.senderLabel}</p>
                    <p className="fi-mono text-[9px] text-ink-faint">{formatTime(message.createdAt)}</p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                  {message.ownAttachments.length > 0 && (
                    <div className="mt-4">
                      <AttachmentGallery attachments={message.ownAttachments} getAccess={access} />
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-line p-6 text-sm text-ink-muted">
              No conversation yet. Public updates will appear here.
            </p>
          )}
        </section>

        {data.publicResolutionNote && (
          <section className="rounded-lg border border-success/25 bg-success-soft p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              Resolution note
            </p>
            <p className="mt-3 text-[15px] leading-7">{data.publicResolutionNote}</p>
            <p className="fi-mono mt-3 text-[9px] text-ink-faint">{formatTime(data.resolvedAt)}</p>
          </section>
        )}

        {pendingConfirmation && (
          <section className="rounded-lg border border-info/25 bg-info-soft/30 p-6">
            <h2 className="fi-display text-2xl font-medium">Did this fix the problem?</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Your answer closes the loop or reopens the issue for the team.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button disabled={confirmation.isPending} onClick={() => confirmation.mutate('fixed')}>
                Fixed
              </Button>
              <Button
                variant="secondary"
                disabled={confirmation.isPending}
                onClick={() => document.getElementById('not-fixed-explanation')?.focus()}
              >
                Not fixed
              </Button>
            </div>
            <label className="mt-5 block text-sm font-medium" htmlFor="not-fixed-explanation">
              If it is not fixed, what happened?
            </label>
            <Textarea
              id="not-fixed-explanation"
              className="mt-2"
              value={notFixedExplanation}
              onChange={(event) => setNotFixedExplanation(event.target.value)}
              placeholder="Tell the team what still fails."
            />
            <Button
              className="mt-3"
              variant="danger"
              disabled={confirmation.isPending || !notFixedExplanation.trim()}
              onClick={() => confirmation.mutate('not_fixed')}
            >
              Reopen as not fixed
            </Button>
          </section>
        )}

        {data.status === 'resolved' && data.resolutionConfirmationStatus === 'confirmed' && (
          <div className="rounded-lg border border-success/25 bg-success-soft p-5 text-sm text-success">
            You confirmed that this issue is fixed.
          </div>
        )}

        <section className="border-t border-line pt-8">
          <p className="fi-eyebrow">Follow up</p>
          <h2 className="fi-display mt-2 text-2xl font-medium">
            {needsInfo ? 'Reply to the product team' : 'Add more information'}
          </h2>
          {data.status === 'resolved' && (
            <div className="mt-4 flex gap-4 text-sm">
              <label>
                <input
                  type="radio"
                  name="follow-up-kind"
                  checked={followUpKind === 'general'}
                  onChange={() => setFollowUpKind('general')}
                />{' '}
                General follow-up
              </label>
              <label>
                <input
                  type="radio"
                  name="follow-up-kind"
                  checked={followUpKind === 'not_fixed'}
                  onChange={() => setFollowUpKind('not_fixed')}
                />{' '}
                Fix did not work
              </label>
            </div>
          )}
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError(null);
              followUp.mutate();
            }}
          >
            <Textarea
              aria-label="Follow-up message"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                needsInfo
                  ? 'Share the requested details…'
                  : 'Add context, reproduction details, or an update…'
              }
              required
            />
            <ScreenshotUploader
              screenshots={screenshots}
              onChange={setScreenshots}
              disabled={followUp.isPending}
            />
            {formError && <InlineError>{formError}</InlineError>}
            <Button type="submit" disabled={followUp.isPending || !body.trim()}>
              {followUp.isPending ? 'Sending…' : 'Send follow-up'}
            </Button>
          </form>
        </section>
      </div>
    </Frame>
  );
}

function size(width: number | null, height: number | null) {
  return width && height ? `${width} × ${height}` : 'Not submitted';
}

function Context({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`bg-surface p-4 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="fi-mono text-[9px] uppercase text-ink-faint">{label}</p>
      <p className="mt-2 break-all text-sm text-ink-muted">{value || 'Not submitted'}</p>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
        <div className="mx-auto flex min-h-14 max-w-3xl items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:min-h-16 sm:px-6">
          <div className="min-w-0">
            <p className="text-sm font-medium">Track your feedback</p>
            <p className="mt-1 text-xs text-ink-faint">Updates are securely provided through VensaOS.</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 text-[11px] text-ink-faint sm:text-xs">
            <BrandMark className="h-5 w-5" decorative />
            <span className="hidden sm:inline">Powered by VensaOS</span>
            <span className="sm:hidden">VensaOS</span>
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}
