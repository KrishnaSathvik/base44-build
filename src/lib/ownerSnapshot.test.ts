import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import { clearOwnerSnapshots, loadOwnerSnapshot, saveOwnerSnapshot } from '@/lib/ownerSnapshot';
test('owner snapshots are isolated by authenticated user and project',async()=>{await saveOwnerSnapshot({userId:'a@example.com',projectId:'p1',savedAt:1,issues:[]});expect(await loadOwnerSnapshot('a@example.com','p1')).toBeTruthy();expect(await loadOwnerSnapshot('b@example.com','p1')).toBeUndefined();expect(await loadOwnerSnapshot('a@example.com','p2')).toBeUndefined();});
test('logout clearing removes only that user snapshots',async()=>{await saveOwnerSnapshot({userId:'clear@example.com',projectId:'p1',savedAt:1,issues:[]});await saveOwnerSnapshot({userId:'keep@example.com',projectId:'p1',savedAt:1,issues:[]});await clearOwnerSnapshots('clear@example.com');expect(await loadOwnerSnapshot('clear@example.com','p1')).toBeUndefined();expect(await loadOwnerSnapshot('keep@example.com','p1')).toBeTruthy();});
