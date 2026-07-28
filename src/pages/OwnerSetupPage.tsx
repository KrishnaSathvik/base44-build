import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Check } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { createProject } from '@/lib/api';
import { slugify, shortSuffix } from '@/lib/format';
import type { Project } from '@/lib/types';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { publicBoardUrl } from '@/lib/appUrls';

const schema = z.object({
  name: z.string().min(1, 'Product name is required').max(80),
  productUrl: z
    .string()
    .url('Enter a valid URL')
    .max(2000)
    .optional()
    .or(z.literal('')),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export function OwnerSetupPage() {
  const { user } = useCurrentUser();
  const [created, setCreated] = useState<Project | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    if (!user?.email) return;
    setSubmitError(null);
    try {
      const slug = `${slugify(values.name)}-${shortSuffix()}`;
      const project = await createProject(
        {
          name: values.name,
          slug,
          productUrl: values.productUrl || undefined,
          description: values.description || undefined,
        },
        user.email,
      );
      setCreated(project);
    } catch {
      setSubmitError('Could not create the project. Please try again.');
    }
  }

  if (created) {
    const link = publicBoardUrl(created.slug);
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
        <div className="border-b border-line pb-8">
          <p className="fi-eyebrow">Ready</p>
          <h1 className="fi-display mt-3 text-3xl font-medium sm:text-4xl">Your feedback board is live</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Share this public link to start collecting reports. They will appear in Inbox and Issues.
          </p>
        </div>
        <div className="max-w-2xl space-y-5 pt-8">
          <div>
            <p className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Public feedback URL</p>
            <div className="fi-mono mt-2 break-all rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink">
              {link}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
            >
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <a href={`/f/${created.slug}`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Open portal</Button>
            </a>
            <Link to="/app/overview">
              <Button variant="secondary">
                Go to overview
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <aside>
          <p className="fi-eyebrow">Workspace setup</p>
          <h1 className="fi-display mt-4 text-3xl font-medium leading-tight sm:text-4xl">
            Set up your VensaOS workspace
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Create your first feedback board for your product. You can change settings later.
          </p>
          <ul className="mt-8 space-y-4 border-t border-line pt-8">
            {[
              'One public link for reporters',
              'Issues grouped with original evidence',
              'Priority stays deterministic and explainable',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-ink">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div className="border-t border-line pt-8 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <Field label="Product name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" placeholder="TrailVerse" {...register('name')} />
            </Field>
            <Field
              label="Product URL"
              htmlFor="productUrl"
              hint="Optional"
              error={errors.productUrl?.message}
            >
              <Input id="productUrl" placeholder="https://example.com" {...register('productUrl')} />
            </Field>
            <Field label="Description" htmlFor="description" hint="Optional" error={errors.description?.message}>
              <Textarea id="description" placeholder="What is this product?" {...register('description')} />
            </Field>
            {submitError && <p className="text-sm text-critical">{submitError}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? 'Creating…' : 'Create your first feedback board'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
