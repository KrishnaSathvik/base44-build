import { expect, test } from 'vitest';
import { resolveActiveProjectId } from '@/lib/activeProject';

test('prefers the stored project when it still exists', () => {
  expect(
    resolveActiveProjectId(
      [
        { id: 'p1' },
        { id: 'p2' },
      ],
      'p2',
    ),
  ).toBe('p2');
});

test('falls back to the first project when the stored id is missing', () => {
  expect(resolveActiveProjectId([{ id: 'p1' }, { id: 'p2' }], 'gone')).toBe('p1');
  expect(resolveActiveProjectId([], 'p1')).toBeUndefined();
});
