import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { PublicPortalPage } from '@/pages/PublicPortalPage';
import { NetworkStateProvider } from '@/app/NetworkStateProvider';

vi.mock('@/lib/api', () => ({
  getPublicProject: vi.fn().mockResolvedValue({ slug:'acme', name:'Acme', description:null, productUrl:null, allowAnonymous:true, feedbackTypesEnabled:['bug','feature','general'], collectReporterEmail:true, isActive:true }),
  submitFeedback: vi.fn(),
  uploadFeedbackAttachment: vi.fn(),
  processFeedback: vi.fn(),
  apiErrorMessage: vi.fn(() => 'Something went wrong'),
}));

test('reveals the bug form after selecting report a problem', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/f/acme']}><Routes><Route path="/f/:projectSlug" element={<PublicPortalPage />} /></Routes></MemoryRouter></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: /report a problem/i }));
  expect(screen.getByRole('heading', { name: 'What happened?' })).toBeVisible();
  expect(screen.getByLabelText('Describe the problem')).toHaveFocus();
  expect(screen.getByText('Context attached')).toBeVisible();
  expect(screen.getByLabelText('Email me when the product team replies or changes this issue.')).not.toBeChecked();
});

test('allows browser context and page URL to be removed before submission', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/f/acme']}><Routes><Route path="/f/:projectSlug" element={<PublicPortalPage />} /></Routes></MemoryRouter></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: /report a problem/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove browser and device context' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove page' }));
  expect(screen.getByText('Browser and device context removed.')).toBeVisible();
  expect(screen.getByText('Page URL removed.')).toBeVisible();
});

test('blocks submission honestly while offline and keeps the deliberate submit control disabled',async()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});const queryClient=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<NetworkStateProvider><QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/f/acme']}><Routes><Route path="/f/:projectSlug" element={<PublicPortalPage/>}/></Routes></MemoryRouter></QueryClientProvider></NetworkStateProvider>);fireEvent.click(await screen.findByRole('button',{name:/report a problem/i}));expect(screen.getByRole('button',{name:/send feedback/i})).toBeDisabled();expect(screen.getByText(/draft is saved on this device/i)).toBeVisible();Object.defineProperty(navigator,'onLine',{configurable:true,value:true});});
