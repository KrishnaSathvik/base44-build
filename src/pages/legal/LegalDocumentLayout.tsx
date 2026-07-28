import type { ReactNode } from 'react';
import { Brand } from '@/components/Brand';
import { SiteFooter } from '@/components/SiteFooter';

export function LegalDocumentLayout({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line">
        <div className="fi-container flex h-16 items-center">
          <Brand />
        </div>
      </header>
      <main className="fi-container flex-1 py-12 sm:py-16">
        <p className="fi-eyebrow">{eyebrow}</p>
        <h1 className="fi-display mt-4 max-w-3xl text-3xl font-medium leading-tight sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-ink-muted">Last updated {updated}</p>
        <div className="prose-legal mt-10 max-w-3xl space-y-8 text-[15px] leading-7 text-ink-muted">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="fi-display text-xl font-medium text-ink sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
