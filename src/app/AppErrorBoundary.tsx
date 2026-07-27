import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui';

interface Props { children: ReactNode; }
interface State { failed: boolean; }
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  override componentDidCatch(error: Error, info: ErrorInfo) { if (import.meta.env.DEV) console.error('Application render failed', error, info); }
  override render() { if (!this.state.failed) return this.props.children; return <main className="grid min-h-screen place-items-center bg-canvas px-4"><div className="max-w-md text-center"><p className="fi-eyebrow">Recovery needed</p><h1 className="fi-display mt-4 text-3xl font-medium">VensaOS could not open this view.</h1><p className="mt-3 text-sm leading-6 text-ink-muted">Your locally saved feedback draft is preserved. Reload to try the latest app version.</p><Button className="mt-6" onClick={() => window.location.reload()}>Reload safely</Button></div></main>; }
}
