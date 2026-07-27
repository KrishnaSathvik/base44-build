import { useEffect, useRef, useState } from 'react';
import { runFreeMaintenance, type FreeMaintenanceResult } from '@/lib/api';
import { useNetworkState } from '@/app/NetworkStateProvider';

const SESSION_KEY = 'fi.free-maintenance.last-run';
const CLIENT_INTERVAL_MS = 5 * 60_000;

export interface FreeMaintenanceHookState {
  lastResult: FreeMaintenanceResult | null;
  warning: string | null;
  running: boolean;
  runNow: (options?: { bypassThrottle?: boolean; projectId?: string }) => Promise<FreeMaintenanceResult | null>;
}

function readSessionStamp(): number {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeSessionStamp(value: number) {
  try {
    sessionStorage.setItem(SESSION_KEY, String(value));
  } catch {
    // Ignore storage failures; backend lease still protects concurrency.
  }
}

export function useFreeMaintenance(enabled: boolean): FreeMaintenanceHookState {
  const networkState = useNetworkState();
  const [lastResult, setLastResult] = useState<FreeMaintenanceResult | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const failureStreak = useRef(0);
  const inFlight = useRef(false);

  async function runNow(options: { bypassThrottle?: boolean; projectId?: string } = {}): Promise<FreeMaintenanceResult | null> {
    if (!enabled || networkState === 'offline') return null;
    if (inFlight.current) return lastResult;
    if (!options.bypassThrottle) {
      const last = readSessionStamp();
      if (last && Date.now() - last < CLIENT_INTERVAL_MS) return lastResult;
    }
    inFlight.current = true;
    setRunning(true);
    try {
      const result = await runFreeMaintenance({
        projectId: options.projectId,
        bypassThrottle: options.bypassThrottle === true,
      });
      setLastResult(result);
      if (result.status === 'ran') writeSessionStamp(Date.now());
      failureStreak.current = 0;
      setWarning(null);
      return result;
    } catch {
      failureStreak.current += 1;
      if (failureStreak.current >= 2) {
        setWarning('Background maintenance could not run. Notification queue work may wait until the next successful attempt.');
      }
      return null;
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }

  useEffect(() => {
    if (!enabled || networkState === 'offline') return;
    void runNow();
    // Automatic opportunistic run once when the owner shell becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, networkState]);

  return { lastResult, warning, running, runNow };
}
