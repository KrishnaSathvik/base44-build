import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import { discardFeedbackDraft, hasMeaningfulDraftContent, loadFeedbackDraft, saveFeedbackDraft } from '@/lib/feedbackDraft';
import { localDatabase } from '@/lib/indexedDb';

const base = {
  projectSlug: 'draft-test',
  type: 'bug' as const,
  description: 'Composer overlaps chat',
  expectedBehavior: 'Visible reply',
  pageUrl: '/chat',
  reporterEmail: '',
  emailUpdatesEnabled: false,
  includePage: true,
  includeEnvironment: true,
  context: { deviceType: 'iPhone' },
  attachments: [],
  submissionKey: 'stable-key',
  lastUpdated: Date.now(),
};

test('draft persistence preserves project scope and submission key', async () => {
  await saveFeedbackDraft(base);
  expect((await loadFeedbackDraft('draft-test'))?.submissionKey).toBe('stable-key');
  expect(await loadFeedbackDraft('different-project')).toBeNull();
});

test('expired drafts are removed', async () => {
  await saveFeedbackDraft({ ...base, projectSlug: 'expired', lastUpdated: 0 });
  expect(await loadFeedbackDraft('expired', 8 * 24 * 60 * 60 * 1000)).toBeNull();
});

test('draft discard removes the stored draft', async () => {
  await saveFeedbackDraft({ ...base, projectSlug: 'discard' });
  await discardFeedbackDraft('discard');
  expect(await loadFeedbackDraft('discard')).toBeNull();
});

test('type-only drafts are not meaningful and are discarded on load', async () => {
  expect(
    hasMeaningfulDraftContent({
      description: '',
      expectedBehavior: '',
      reporterEmail: '',
      attachments: [],
    }),
  ).toBe(false);
  await localDatabase.set('public-draft:empty-type', {
    ...base,
    projectSlug: 'empty-type',
    description: '',
    expectedBehavior: '',
    reporterEmail: '',
    attachments: [],
    type: 'bug',
  });
  expect(await loadFeedbackDraft('empty-type')).toBeNull();
});

test('whitespace-only drafts are discarded on save and load', async () => {
  await saveFeedbackDraft({
    ...base,
    projectSlug: 'whitespace',
    description: '   ',
    expectedBehavior: '\n',
    reporterEmail: '  ',
  });
  expect(await loadFeedbackDraft('whitespace')).toBeNull();
});
