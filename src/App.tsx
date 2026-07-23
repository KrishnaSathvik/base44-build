import { Base44Logo } from '@/components/Base44Logo';

// Placeholder shell only. The Feedback Inbox vertical slice (routes, screens,
// entities, functions) is implemented in the next stage — see docs/03 §23/§30.
export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 text-slate-900">
          <Base44Logo className="w-9 h-9" />
          <span className="text-2xl font-semibold tracking-tight">Feedback Inbox</span>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Scaffold ready. Vertical slice next.
        </p>
      </div>
    </div>
  );
}
