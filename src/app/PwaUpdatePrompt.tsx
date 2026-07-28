import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '@/components/ui';

export function PwaUpdatePrompt() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [updating, setUpdating] = useState(false);
  const updateRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    updateRef.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedsRefresh(true),
      onRegisterError: (error) => {
        if (import.meta.env.DEV) console.error('Service worker registration failed', error);
      },
    });
  }, []);

  if (!needsRefresh) return null;

  const update = async () => {
    if (updating) return;
    setUpdating(true);
    window.dispatchEvent(new CustomEvent('feedback-inbox:before-update'));
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    try {
      await updateRef.current?.(true);
    } catch {
      // Fall through to an explicit reload so the user is never stuck on a waiting worker.
    }
    // workbox-window reloads on the controlling event when clientsClaim is enabled.
    // Keep a short fallback in case that event is missed in some browsers.
    window.setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="pwa-update-title"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[80] rounded-lg border border-line bg-surface p-4 shadow-sheet sm:left-auto sm:right-4 sm:max-w-sm md:bottom-4"
    >
      <p id="pwa-update-title" className="text-sm font-medium">
        A new version of VensaOS is ready.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button data-offline-safe onClick={() => void update()} disabled={updating}>
          {updating ? 'Updating…' : 'Update now'}
        </Button>
        <Button variant="ghost" onClick={() => setNeedsRefresh(false)} disabled={updating}>
          Later
        </Button>
      </div>
    </section>
  );
}
