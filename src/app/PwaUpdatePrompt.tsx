import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '@/components/ui';

export function PwaUpdatePrompt() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const updateRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  useEffect(() => {
    updateRef.current = registerSW({ onNeedRefresh: () => setNeedsRefresh(true), onRegisterError: error => { if (import.meta.env.DEV) console.error('Service worker registration failed', error); } });
  }, []);
  if (!needsRefresh) return null;
  const update = async () => {
    window.dispatchEvent(new CustomEvent('feedback-inbox:before-update'));
    await new Promise(resolve => window.setTimeout(resolve, 250));
    await updateRef.current?.(true);
  };
  return <section role="dialog" aria-modal="false" aria-labelledby="pwa-update-title" className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-lg border border-line bg-surface p-4 shadow-sheet">
    <p id="pwa-update-title" className="text-sm font-medium">A new version of VensaOS is ready.</p>
    <div className="mt-4 flex gap-2"><Button onClick={() => void update()}>Update now</Button><Button variant="ghost" onClick={() => setNeedsRefresh(false)}>Later</Button></div>
  </section>;
}
