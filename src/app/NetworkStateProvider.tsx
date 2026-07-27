import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type NetworkState = 'online' | 'offline' | 'reconnecting';
const NetworkContext = createContext<NetworkState>('online');
export function useNetworkState() { return useContext(NetworkContext); }

export function NetworkStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NetworkState>(() => typeof navigator === 'undefined' || navigator.onLine ? 'online' : 'offline');
  const reconnectTimer = useRef<number>();
  useEffect(() => {
    const offline = () => { window.clearTimeout(reconnectTimer.current); setState('offline'); };
    const online = () => { setState('reconnecting'); reconnectTimer.current = window.setTimeout(() => setState('online'), 1500); };
    window.addEventListener('offline', offline); window.addEventListener('online', online);
    return () => { window.removeEventListener('offline', offline); window.removeEventListener('online', online); window.clearTimeout(reconnectTimer.current); };
  }, []);
  const label = state === 'offline' ? 'Offline. Drafts remain on this device.' : state === 'reconnecting' ? 'Reconnecting…' : '';
  const value = useMemo(() => state, [state]);
  return <NetworkContext.Provider value={value}>{children}{state !== 'online' && <div role="status" aria-live="polite" className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-line bg-surface px-4 py-2 text-xs shadow-sheet">{label}</div>}<span className="sr-only" role="status" aria-live="polite">{state === 'online' ? 'Online' : label}</span></NetworkContext.Provider>;
}
