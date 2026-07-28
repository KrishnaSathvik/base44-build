import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Copy, Inbox, Plus } from 'lucide-react';
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  InlineError,
  Input,
  Skeleton,
  Textarea,
  Toast,
} from '@/components/ui';
import { NoProjectOnboarding } from '@/components/NoProjectOnboarding';
import { apiErrorMessage, deleteProject, listMyProjects, updateProjectSettings } from '@/lib/api';
import { clearStoredActiveProjectId } from '@/lib/activeProject';
import { useActiveProject } from '@/lib/useActiveProject';
import { publicBoardUrl } from '@/lib/appUrls';
import type { FeedbackType } from '@/lib/types';

const DEFAULT_TYPES: FeedbackType[] = ['bug', 'feature', 'general'];

export function PlaceholderWorkspacePage() {
  const settings = useLocation().pathname.includes('settings');
  return settings ? <ProjectSettings /> : <InboxState />;
}

function InboxState() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-7 md:py-10">
      <p className="fi-eyebrow">Report queue</p>
      <h1 className="fi-display mt-3 text-4xl font-medium">Inbox</h1>
      <p className="mt-2 text-sm text-ink-muted">Reports that still need a decision.</p>
      <div className="mt-10">
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="No unreviewed reports"
          description="New submissions and grouping suggestions will appear here."
          action={
            <Link to="/app/issues">
              <Button variant="secondary">View current issues</Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}

function ProjectSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { project, setActiveProjectId, isLoading } = useActiveProject();
  const [name, setName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmationName, setConfirmationName] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setProductUrl(project.product_url ?? '');
    setDescription(project.description ?? '');
  }, [project]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error('No project');
      return updateProjectSettings(project.id, {
        name: name.trim(),
        productUrl: productUrl.trim() || undefined,
        description: description.trim() || undefined,
        feedbackTypesEnabled: (project.feedback_types_enabled as FeedbackType[] | undefined) ?? DEFAULT_TYPES,
        allowAnonymous: project.allow_anonymous !== false,
        collectReporterEmail: project.collect_reporter_email !== false,
      });
    },
    onSuccess: async () => {
      setSaved(true);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => setError('Settings could not be saved. Try again in a moment.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error('No project');
      return deleteProject(project.id, confirmationName);
    },
    onSuccess: async () => {
      const deletedId = project?.id;
      setDeleteOpen(false);
      setConfirmationName('');
      setDeleteError(null);
      clearStoredActiveProjectId();
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['issues'] });
      await queryClient.invalidateQueries({ queryKey: ['inbox'] });
      await queryClient.invalidateQueries({ queryKey: ['notification-deliveries'] });
      const remaining = (
        await queryClient.fetchQuery({
          queryKey: ['projects'],
          queryFn: listMyProjects,
        })
      ).filter((item) => item.id !== deletedId);
      if (remaining[0]) {
        setActiveProjectId(remaining[0].id);
        navigate('/app/overview');
      } else {
        navigate('/app/setup');
      }
    },
    onError: (err) => setDeleteError(apiErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <SettingsFrame>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="mt-8 h-80 w-full" />
      </SettingsFrame>
    );
  }

  if (!project) {
    return (
      <NoProjectOnboarding
        eyebrow="VensaOS workspace"
        title="Create your first feedback board"
        description="Project settings become available after your first feedback board is created."
      />
    );
  }

  const publicLink = publicBoardUrl(project.slug);
  const confirmationMatches = confirmationName.trim() === project.name.trim();

  return (
    <SettingsFrame>
      <form
        className="max-w-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(false);
          setError(null);
          mutation.mutate();
        }}
      >
        <section className="border-t border-line py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="fi-eyebrow">Project identity</p>
              <p className="mt-2 text-sm text-ink-muted">
                Editing <span className="font-medium text-ink">{project.name}</span>. Switch boards from the sidebar.
              </p>
            </div>
            <Link to="/app/setup" className="w-full sm:w-auto">
              <Button type="button" variant="secondary" className="w-full justify-center sm:w-auto">
                <Plus className="h-4 w-4" />
                New project
              </Button>
            </Link>
          </div>
          <div className="mt-6 grid gap-6">
            <Field label="Product name" htmlFor="settings-name">
              <Input
                id="settings-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={80}
              />
            </Field>
            <Field label="Product URL" htmlFor="settings-url" hint="Optional">
              <Input
                id="settings-url"
                type="url"
                value={productUrl}
                onChange={(event) => setProductUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </Field>
            <Field label="Description" htmlFor="settings-description" hint="Optional">
              <Textarea
                id="settings-description"
                className="min-h-24"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
              />
            </Field>
          </div>
        </section>

        <section className="border-t border-line py-8">
          <p className="fi-eyebrow">Public feedback link</p>
          <p className="mt-3 text-sm text-ink-muted">
            Share this link so people can report bugs, request features, or leave general feedback.
          </p>
          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center">
            <code className="fi-mono min-w-0 flex-1 break-all text-xs">{publicLink}</code>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(publicLink);
                setCopied(true);
              }}
            >
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
          </div>
        </section>

        {error && (
          <div className="mt-5">
            <InlineError>{error}</InlineError>
          </div>
        )}
        <div className="sticky bottom-[72px] -mx-4 mt-8 flex border-t border-line bg-canvas/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
          <Button type="submit" disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </form>

      <section className="mt-4 max-w-3xl border-t border-critical/25 py-8">
        <p className="fi-eyebrow text-critical">Danger zone</p>
        <h2 className="fi-display mt-2 text-2xl font-medium">Delete this project</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
          Permanently deletes <span className="font-medium text-ink">{project.name}</span> and all of its
          issues, reports, messages, and attachments. Other projects are not affected. This cannot be undone.
        </p>
        <div className="mt-5">
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              setDeleteError(null);
              setConfirmationName('');
              setDeleteOpen(true);
            }}
          >
            Delete project…
          </Button>
        </div>
      </section>

      <Dialog
        open={deleteOpen}
        title="Delete project"
        onClose={() => {
          if (deleteMutation.isPending) return;
          setDeleteOpen(false);
          setConfirmationName('');
          setDeleteError(null);
        }}
      >
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-critical/30 bg-critical-soft p-4 text-sm leading-6 text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" aria-hidden />
            <p>
              This removes the board and every report tied to it. Type{' '}
              <span className="font-medium">{project.name}</span> to confirm.
            </p>
          </div>
          <Field label="Project name" htmlFor="delete-confirmation-name">
            <Input
              id="delete-confirmation-name"
              value={confirmationName}
              onChange={(event) => setConfirmationName(event.target.value)}
              placeholder={project.name}
              autoComplete="off"
              disabled={deleteMutation.isPending}
            />
          </Field>
          {deleteError && <InlineError>{deleteError}</InlineError>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={() => {
                setDeleteOpen(false);
                setConfirmationName('');
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!confirmationMatches || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete project'}
            </Button>
          </div>
        </div>
      </Dialog>

      {copied && <Toast>Feedback link copied</Toast>}
      {saved && <Toast>Settings saved</Toast>}
    </SettingsFrame>
  );
}

function SettingsFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-7 md:py-10">
      <p className="fi-eyebrow">VensaOS workspace</p>
      <h1 className="fi-display mt-3 text-4xl font-medium">Settings</h1>
      <p className="mt-2 mb-10 text-sm text-ink-muted">
        Update how the active project appears and copy its public feedback link.
      </p>
      {children}
    </div>
  );
}
