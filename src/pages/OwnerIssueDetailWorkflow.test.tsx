import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { OwnerIssueDetailPage } from '@/pages/OwnerIssueDetailPage';

vi.mock('@/api/base44Client',()=>({base44:{entities:{Issue:{subscribe:vi.fn(()=>()=>undefined)},ReporterMessage:{subscribe:vi.fn(()=>()=>undefined)},ActivityEvent:{subscribe:vi.fn(()=>()=>undefined)}}}}));
vi.mock('@/lib/api',()=>({
 getIssue:vi.fn().mockResolvedValue({id:'issue-1',project_id:'p1',owner_id:'owner',public_code:'FI-DETAIL',title:'Workflow issue',status:'open',severity:'high',report_count:1,affected_user_count:1,priority_score:30}),
 getReportsForIssue:vi.fn().mockResolvedValue([]),getActivityForIssue:vi.fn().mockResolvedValue([]),listMyIssues:vi.fn().mockResolvedValue([]),
 getReporterMessagesForIssue:vi.fn().mockResolvedValue([
  {id:'public',project_id:'p1',owner_id:'owner',submission_id:'s1',issue_id:'issue-1',sender_type:'owner',message_type:'public_update',body:'Reporter-visible update',visibility:'public',is_read_by_owner:true},
  {id:'internal',project_id:'p1',owner_id:'owner',submission_id:'s1',issue_id:'issue-1',sender_type:'owner',message_type:'public_update',body:'Owner-only investigation',visibility:'internal',is_read_by_owner:true},
  {id:'reply',project_id:'p1',owner_id:'owner',submission_id:'s1',issue_id:'issue-1',sender_type:'reporter',message_type:'reporter_follow_up',body:'Unread reply',visibility:'public',is_read_by_owner:false},
 ]),
 getAttachmentAccess:vi.fn(),getAttachmentsForSubmission:vi.fn(),getSubmission:vi.fn(),markOwnerMessagesRead:vi.fn(),updateIssueStatus:vi.fn(),
}));

test('distinguishes public, internal, and unread reporter messages',async()=>{
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/app/issues/issue-1']}><Routes><Route path="/app/issues/:issueId" element={<OwnerIssueDetailPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
 expect(await screen.findByText('Reporter-visible update')).toBeVisible();expect(screen.getByText('Owner-only investigation')).toBeVisible();expect(screen.getByText('Unread reply')).toBeVisible();
 expect(screen.getAllByText('Internal note')[0]).toBeVisible();expect(screen.getByText('Reporter message')).toBeVisible();expect(screen.getByLabelText('Unread')).toBeVisible();
});
