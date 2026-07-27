import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useFreeMaintenance } from '@/lib/useFreeMaintenance';

const runFreeMaintenance = vi.fn();
vi.mock('@/lib/api', () => ({
  runFreeMaintenance: (...args: unknown[]) => runFreeMaintenance(...args),
}));

vi.mock('@/app/NetworkStateProvider', () => ({
  useNetworkState: () => mockNetwork,
}));

let mockNetwork: 'online' | 'offline' = 'online';

beforeEach(() => {
  mockNetwork = 'online';
  runFreeMaintenance.mockReset();
  sessionStorage.clear();
});

test('free-maintenance hook runs once and throttles rapid repeats', async () => {
  runFreeMaintenance.mockResolvedValue({
    success: true, status: 'ran', processed: 1, sent: 0, failed: 0, skipped: 1, deadLettered: 0,
    reconciled: 0, digestsQueued: 0, digestsSkippedEmpty: 0, digestsDuplicate: 0, projectsChecked: 1,
    orphanAttachments: 0, emailDeliveryDisabled: true,
  });
  const { result } = renderHook(() => useFreeMaintenance(true));
  await waitFor(() => expect(runFreeMaintenance).toHaveBeenCalledTimes(1));
  await result.current.runNow();
  expect(runFreeMaintenance).toHaveBeenCalledTimes(1);
});

test('offline maintenance suppression', async () => {
  mockNetwork = 'offline';
  const { result } = renderHook(() => useFreeMaintenance(true));
  await expect(result.current.runNow()).resolves.toBeNull();
  expect(runFreeMaintenance).not.toHaveBeenCalled();
});

test('manual bypassThrottle still invokes the backend', async () => {
  runFreeMaintenance.mockResolvedValue({
    success: true, status: 'ran', processed: 0, sent: 0, failed: 0, skipped: 0, deadLettered: 0,
    reconciled: 0, digestsQueued: 0, digestsSkippedEmpty: 0, digestsDuplicate: 0, projectsChecked: 1,
    orphanAttachments: 0, emailDeliveryDisabled: true,
  });
  const { result } = renderHook(() => useFreeMaintenance(true));
  await waitFor(() => expect(runFreeMaintenance).toHaveBeenCalledTimes(1));
  await result.current.runNow({ bypassThrottle: true, projectId: 'p1' });
  expect(runFreeMaintenance).toHaveBeenLastCalledWith({ bypassThrottle: true, projectId: 'p1' });
});
