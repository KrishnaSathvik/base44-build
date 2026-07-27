import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import { discardFeedbackDraft, loadFeedbackDraft, saveFeedbackDraft } from '@/lib/feedbackDraft';
const base={projectSlug:'draft-test',type:'bug' as const,description:'Composer overlaps chat',expectedBehavior:'Visible reply',pageUrl:'/chat',reporterEmail:'',emailUpdatesEnabled:false,includePage:true,includeEnvironment:true,context:{deviceType:'iPhone'},attachments:[],submissionKey:'stable-key',lastUpdated:Date.now()};
test('draft persistence preserves project scope and submission key',async()=>{await saveFeedbackDraft(base);expect((await loadFeedbackDraft('draft-test'))?.submissionKey).toBe('stable-key');expect(await loadFeedbackDraft('different-project')).toBeNull();});
test('expired drafts are removed',async()=>{await saveFeedbackDraft({...base,projectSlug:'expired',lastUpdated:0});expect(await loadFeedbackDraft('expired',8*24*60*60*1000)).toBeNull();});
test('draft discard removes the stored draft',async()=>{await saveFeedbackDraft({...base,projectSlug:'discard'});await discardFeedbackDraft('discard');expect(await loadFeedbackDraft('discard')).toBeNull();});
