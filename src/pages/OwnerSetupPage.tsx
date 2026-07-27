import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { createProject } from '@/lib/api';
import { slugify, shortSuffix } from '@/lib/format';
import type { Project } from '@/lib/types';
import { Button, Field, Input, Panel, Textarea } from '@/components/ui';

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
    const link = `${window.location.origin}/f/${created.slug}`;
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-7">
        <h1 className="fi-display text-2xl font-semibold text-ink">Your project is ready</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Share this public link to start collecting feedback.
        </p>
        <Panel className="mt-6 p-5 space-y-4">
          <div className="fi-mono text-sm break-all rounded-md bg-surface-subtle px-3 py-2 text-ink">
            {link}
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
            <Link to="/app/issues">
              <Button variant="secondary">Go to issues</Button>
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-7">
      <h1 className="fi-display text-2xl font-semibold text-ink">Set up your VensaOS workspace</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Create a feedback board for your product.
      </p>
      <Panel className="mt-6 p-5">
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create project'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
