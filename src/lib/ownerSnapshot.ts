import type { Issue } from '@/lib/types';
import { localDatabase } from '@/lib/indexedDb';

const prefix = 'owner-snapshot:';
export interface OwnerIssueSummary { publicCode: string; title: string; status: string; severity?: string; priorityScore?: number; reportCount?: number; lastActivityTime?: string; }
export interface OwnerSnapshot { userId: string; projectId: string; savedAt: number; issues: OwnerIssueSummary[]; }
export function ownerSnapshotKey(userId: string, projectId: string) { return `${prefix}${encodeURIComponent(userId)}:${encodeURIComponent(projectId)}`; }
export function toOwnerIssueSummary(issue: Issue): OwnerIssueSummary { return { publicCode: issue.public_code, title: issue.title, status: issue.status, severity: issue.severity, priorityScore: issue.priority_score, reportCount: issue.report_count, lastActivityTime: issue.last_seen_at ?? issue.updated_date }; }
export function saveOwnerSnapshot(snapshot: OwnerSnapshot) { return localDatabase.set(ownerSnapshotKey(snapshot.userId, snapshot.projectId), snapshot); }
export function loadOwnerSnapshot(userId: string, projectId: string) { return localDatabase.get<OwnerSnapshot>(ownerSnapshotKey(userId, projectId)); }
export async function loadOwnerSnapshots(userId: string) { const match = `${prefix}${encodeURIComponent(userId)}:`; const keys = await localDatabase.keys(); const snapshots = await Promise.all(keys.filter(key => String(key).startsWith(match)).map(key => localDatabase.get<OwnerSnapshot>(String(key)))); return snapshots.filter((value): value is OwnerSnapshot => !!value && value.userId === userId); }
export async function clearOwnerSnapshots(userId: string) { const match = `${prefix}${encodeURIComponent(userId)}:`; const keys = await localDatabase.keys().catch(() => []); await Promise.all(keys.filter(key => String(key).startsWith(match)).map(key => localDatabase.delete(String(key)).catch(() => undefined))); }
