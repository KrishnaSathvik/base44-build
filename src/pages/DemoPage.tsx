import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { ConvergenceDemo } from '@/pages/demo/ConvergenceDemo';

export function DemoPage() { return <div className="min-h-screen bg-canvas"><header className="border-b border-line"><div className="fi-container flex h-16 items-center justify-between"><Brand /><Link to="/app/setup" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm text-white">Create your board <ArrowRight className="h-4 w-4" /></Link></div></header><main className="fi-container py-16"><p className="fi-eyebrow">Live product preview</p><h1 className="fi-display mt-4 max-w-3xl text-5xl font-medium leading-tight">See how repeated feedback becomes one actionable issue.</h1><p className="mt-4 max-w-xl leading-7 text-ink-muted">This visual demo uses representative data only. The authenticated workspace shows your real Base44-backed issues.</p><div className="mt-12"><ConvergenceDemo /></div></main></div>; }
