import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { SiteFooter } from '@/components/SiteFooter';
import { InteractiveDemoWorkspace } from '@/pages/demo/InteractiveDemoWorkspace';

export function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line">
        <div className="fi-container flex h-16 items-center">
          <Brand />
        </div>
      </header>
      <main className="fi-container flex-1 py-12 sm:py-16">
        <p className="fi-eyebrow">Interactive product demo</p>
        <h1 className="fi-display mt-4 max-w-3xl text-3xl font-medium leading-tight sm:text-4xl md:text-5xl">
          Explore the real VensaOS interface using representative data.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-ink-muted">
          Nothing you do here affects a live workspace. This walkthrough uses representative fixture
          data inside the real VensaOS owner chrome—Overview, Inbox, Issues, resolve workflow, and
          reporter confirmation—without writing anything.
        </p>
        <div className="mt-10 min-w-0">
          <InteractiveDemoWorkspace />
        </div>
        <div className="mt-14 border-t border-line pt-10">
          <h2 className="fi-display text-3xl font-medium">Ready for your own workspace?</h2>
          <p className="mt-3 text-sm text-ink-muted">Open VensaOS to authenticate, create a feedback board, and share your public link.</p>
          <Link to="/app" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm text-white">
            Open workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
