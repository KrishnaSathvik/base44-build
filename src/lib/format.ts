// Display helpers for status, severity, and timestamps.

const STATUS_LABELS: Record<string, string> = {
  processing: 'Processing',
  unreviewed: 'Unreviewed',
  needs_info: 'Needs info',
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In progress',
  testing: 'Testing',
  resolved: 'Resolved',
  reopened: 'Reopened',
  duplicate: 'Duplicate',
  dismissed: 'Dismissed',
};

export function statusLabel(status: string | undefined): string {
  if (!status) return 'Unknown';
  return STATUS_LABELS[status] ?? status;
}

export function severityLabel(severity: string | undefined): string {
  if (!severity) return 'Medium';
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function categoryLabel(category: string | undefined): string {
  if (!category) return 'Unknown';
  return category.replaceAll('_', ' ');
}

export function analysisModeLabel(mode: string | undefined): string {
  if (mode === 'deterministic_fallback') return 'Deterministic fallback';
  if (mode === 'owner_corrected') return 'Owner corrected';
  if (mode === 'ai') return 'AI analysis';
  return 'Analysis pending';
}

export function typeLabel(type: string | undefined): string {
  switch (type) {
    case 'bug':
      return 'Bug';
    case 'feature':
      return 'Feature request';
    case 'general':
      return 'General feedback';
    default:
      return 'Feedback';
  }
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** A short lowercase base36 suffix to reduce slug collisions in the MVP. */
export function shortSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
