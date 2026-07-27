import type { FeedbackSubmission } from '@/lib/types';

export interface EvidenceBreakdown { devices: Array<[string, number]>; browsers: Array<[string, number]>; pages: Array<[string, number]> }
function count(values: Array<string | undefined>): Array<[string, number]> {
  const map = new Map<string, number>();
  values.filter(Boolean).forEach((value) => map.set(value!, (map.get(value!) ?? 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
export function pagePath(value?: string): string | undefined {
  if (!value) return undefined;
  try { return new URL(value, 'https://local.invalid').pathname; } catch { return value.startsWith('/') ? value.split('?')[0] : undefined; }
}
export function aggregateEvidence(submissions: FeedbackSubmission[]): EvidenceBreakdown {
  return {
    devices: count(submissions.map((item) => item.device_type)),
    browsers: count(submissions.map((item) => item.browser_name)),
    pages: count(submissions.map((item) => pagePath(item.page_url))),
  };
}
