import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { TrackingPage } from '@/pages/TrackingPage';
import { addReporterFollowUp, confirmResolution } from '@/lib/api';

const baseView={feedbackType:'bug' as const,originalDescription:'Checkout freezes',publicIssueCode:'FI-123ABC',issueTitle:'Checkout freeze',status:'resolved' as const,publicResolutionNote:'Released a fix.',resolutionConfirmationStatus:'pending' as const,createdAt:'2026-01-01T00:00:00Z',resolvedAt:'2026-01-02T00:00:00Z',reopenedAt:null,originalContext:null,ownAttachments:[],publicActivityEvents:[],publicMessages:[{senderLabel:'Product team' as const,messageType:'resolution_note' as const,body:'Released a fix.',createdAt:'2026-01-02T00:00:00Z',ownAttachments:[]}]};
vi.mock('@/lib/api',()=>({accessTrackingPage:vi.fn(()=>Promise.resolve(baseView)),getReporterAttachmentAccess:vi.fn(),uploadFollowUpAttachment:vi.fn(),addReporterFollowUp:vi.fn(),confirmResolution:vi.fn(),apiErrorMessage:vi.fn((error:Error)=>error.message)}));

function renderPage(){const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/track/token-a']}><Routes><Route path="/track/:token" element={<TrackingPage/>}/></Routes></MemoryRouter></QueryClientProvider>);}

test('displays the public conversation and submits a general follow-up',async()=>{
 vi.mocked(addReporterFollowUp).mockResolvedValue(baseView);
 renderPage(); expect((await screen.findAllByText('Released a fix.'))[0]).toBeVisible();
 fireEvent.change(screen.getByLabelText('Follow-up message'),{target:{value:'I have one more detail.'}});
 fireEvent.click(screen.getByRole('button',{name:'Send follow-up'}));
 await waitFor(()=>expect(addReporterFollowUp).toHaveBeenCalledWith(expect.objectContaining({token:'token-a',body:'I have one more detail.',resolvedFollowUpType:'general'})));
});

test('confirms a fixed resolution',async()=>{
 vi.mocked(confirmResolution).mockResolvedValue({...baseView,resolutionConfirmationStatus:'confirmed'});
 renderPage(); await screen.findByText('Did this fix the problem?'); fireEvent.click(screen.getByRole('button',{name:'Fixed'}));
 await waitFor(()=>expect(confirmResolution).toHaveBeenCalledWith(expect.objectContaining({token:'token-a',choice:'fixed'})));
});

test('requires an explanation and reopens a not-fixed resolution',async()=>{
 vi.mocked(confirmResolution).mockResolvedValue({...baseView,status:'reopened',resolutionConfirmationStatus:'not_fixed',reopenedAt:'2026-01-03T00:00:00Z'});
 renderPage(); await screen.findByText('Did this fix the problem?');
 fireEvent.change(screen.getByLabelText('If it is not fixed, what happened?'),{target:{value:'The button still hangs.'}});
 fireEvent.click(screen.getByRole('button',{name:'Reopen as not fixed'}));
 await waitFor(()=>expect(confirmResolution).toHaveBeenCalledWith(expect.objectContaining({choice:'not_fixed',explanation:'The button still hangs.'})));
});
