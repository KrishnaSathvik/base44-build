export const PRODUCT_NAME = 'VensaOS';
export const PRODUCT_TAGLINE = 'Feedback intelligence for product teams.';
export const DEFAULT_TITLE = 'VensaOS — Feedback Intelligence for Product Teams';
export const DEFAULT_DESCRIPTION = 'Turn scattered user feedback into grouped, evidence-backed issues your team can prioritize and resolve.';
export const OG_TITLE = 'VensaOS — Know What Users Need Fixed Next';
export const TWITTER_TITLE = 'VensaOS — Feedback Intelligence';

export function pageTitle(title: string) {
  const value = title.trim();
  return value.includes(PRODUCT_NAME) ? value : `${value} — ${PRODUCT_NAME}`;
}
