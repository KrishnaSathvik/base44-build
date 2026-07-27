// Deterministic text normalization used to derive an initial issue title from a
// report. No AI is involved in this slice.

const MAX_TITLE_LENGTH = 120;

export function normalizeTitle(description: string): string {
  const collapsed = description.replace(/\s+/g, " ").trim();
  if (collapsed.length <= MAX_TITLE_LENGTH) {
    return collapsed || "Untitled report";
  }
  return `${collapsed.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}
