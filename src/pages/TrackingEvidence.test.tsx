import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { TrackingPage } from '@/pages/TrackingPage';
import { getReporterAttachmentAccess } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  accessTrackingPage: vi.fn().mockResolvedValue({
    feedbackType:'bug', originalDescription:'My report', publicIssueCode:'FI-1', issueTitle:'Issue', status:'open',
    publicResolutionNote:null, resolutionConfirmationStatus:'not_requested', createdAt:'2026-01-01T00:00:00Z', resolvedAt:null,reopenedAt:null,publicMessages:[],publicActivityEvents:[],
    originalContext:{browserName:'Safari',browserVersion:'18',operatingSystem:'iOS',deviceType:'iPhone',screenWidth:390,screenHeight:844,viewportWidth:390,viewportHeight:720,pageUrl:'/chat'},
    ownAttachments:[{accessKey:'own-key',fileName:'mine.png',mimeType:'image/png',sizeBytes:20,width:390,height:720}],
  }),
  getReporterAttachmentAccess: vi.fn().mockResolvedValue({signedUrl:'https://signed.invalid/mine',expiresAt:'2026-01-01T00:05:00Z'}),
  apiErrorMessage: vi.fn(),
  addReporterFollowUp: vi.fn(), confirmResolution: vi.fn(), uploadFollowUpAttachment: vi.fn(),
  disableReporterEmailConsent:vi.fn(),
}));

test('reporter sees only attachments projected for their tracking token', async () => {
  const queryClient=new QueryClient({defaultOptions:{queries:{retry:false}}});
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/track/private-token']}><Routes><Route path="/track/:token" element={<TrackingPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByAltText('mine.png')).toBeVisible();
  expect(screen.getByText('Safari 18')).toBeVisible();
  await waitFor(()=>expect(getReporterAttachmentAccess).toHaveBeenCalledWith('private-token','own-key'));
  expect(screen.queryByText(/other reporter/i)).not.toBeInTheDocument();
});
