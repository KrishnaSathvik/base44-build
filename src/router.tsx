import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/AppLayout';
import { OwnerSetupPage } from '@/pages/OwnerSetupPage';
import { OwnerIssuesPage } from '@/pages/OwnerIssuesPage';
import { OwnerIssueDetailPage } from '@/pages/OwnerIssueDetailPage';
import { PublicPortalPage } from '@/pages/PublicPortalPage';
import { TrackingPage } from '@/pages/TrackingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { LandingPage } from '@/pages/LandingPage';
import { OwnerOverviewPage } from '@/pages/OwnerOverviewPage';
import { PlaceholderWorkspacePage } from '@/pages/PlaceholderWorkspacePage';
import { DemoPage } from '@/pages/DemoPage';
import { OwnerInboxPage } from '@/pages/OwnerInboxPage';
import { OwnerResolvedPage } from '@/pages/OwnerResolvedPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/demo', element: <DemoPage /> },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/app/overview" replace /> },
      { path: 'overview', element: <OwnerOverviewPage /> },
      { path: 'inbox', element: <OwnerInboxPage /> },
      { path: 'setup', element: <OwnerSetupPage /> },
      { path: 'issues', element: <OwnerIssuesPage /> },
      { path: 'issues/:issueId', element: <OwnerIssueDetailPage /> },
      { path: 'resolved', element: <OwnerResolvedPage /> },
      { path: 'settings', element: <PlaceholderWorkspacePage /> },
    ],
  },
  { path: '/f/:projectSlug', element: <PublicPortalPage /> },
  { path: '/track/:token', element: <TrackingPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
