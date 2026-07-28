import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { PwaUpdatePrompt } from '@/app/PwaUpdatePrompt';

let refresh: () => void = () => undefined;
const update = vi.fn(() => Promise.resolve());

vi.mock('virtual:pwa-register', () => ({
  registerSW: (options: { onNeedRefresh: () => void; immediate?: boolean }) => {
    refresh = options.onNeedRefresh;
    expect(options.immediate).toBe(true);
    return update;
  },
}));

afterEach(() => {
  update.mockClear();
  vi.useRealTimers();
});

test('VensaOS update prompt is restrained, accessible, and deferrable', () => {
  render(<PwaUpdatePrompt />);
  act(() => refresh());
  expect(screen.getByRole('dialog', { name: 'A new version of VensaOS is ready.' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Later' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('Update now asks the waiting service worker to activate and reloads as a fallback', async () => {
  vi.useFakeTimers();
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });

  render(<PwaUpdatePrompt />);
  act(() => refresh());
  fireEvent.click(screen.getByRole('button', { name: 'Update now' }));

  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
  expect(update).toHaveBeenCalledWith(true);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
  expect(reload).toHaveBeenCalled();
});
