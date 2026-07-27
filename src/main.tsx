import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/router';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { NetworkStateProvider } from '@/app/NetworkStateProvider';
import { PwaUpdatePrompt } from '@/app/PwaUpdatePrompt';
import '@/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <AppErrorBoundary><NetworkStateProvider><QueryClientProvider client={queryClient}>
    <RouterProvider router={router} /><PwaUpdatePrompt />
  </QueryClientProvider></NetworkStateProvider></AppErrorBoundary>,
);
