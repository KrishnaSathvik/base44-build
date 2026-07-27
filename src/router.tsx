import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { OwnerRouteSkeleton, PublicRouteSkeleton } from '@/app/RouteSkeleton';
import { RouteError } from '@/app/RouteError';
import { PageMetadata } from '@/app/PageMetadata';

const AppLayout = lazy(() => import('@/app/AppLayout').then(module => ({ default: module.AppLayout })));
const LandingPage = lazy(() => import('@/pages/LandingPage').then(module => ({ default: module.LandingPage })));
const DemoPage = lazy(() => import('@/pages/DemoPage').then(module => ({ default: module.DemoPage })));
const OwnerSetupPage = lazy(() => import('@/pages/OwnerSetupPage').then(module => ({ default: module.OwnerSetupPage })));
const OwnerIssuesPage = lazy(() => import('@/pages/OwnerIssuesPage').then(module => ({ default: module.OwnerIssuesPage })));
const OwnerIssueDetailPage = lazy(() => import('@/pages/OwnerIssueDetailPage').then(module => ({ default: module.OwnerIssueDetailPage })));
const PublicPortalPage = lazy(() => import('@/pages/PublicPortalPage').then(module => ({ default: module.PublicPortalPage })));
const TrackingPage = lazy(() => import('@/pages/TrackingPage').then(module => ({ default: module.TrackingPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const OwnerOverviewPage = lazy(() => import('@/pages/OwnerOverviewPage').then(module => ({ default: module.OwnerOverviewPage })));
const PlaceholderWorkspacePage = lazy(() => import('@/pages/PlaceholderWorkspacePage').then(module => ({ default: module.PlaceholderWorkspacePage })));
const OwnerInboxPage = lazy(() => import('@/pages/OwnerInboxPage').then(module => ({ default: module.OwnerInboxPage })));
const OwnerResolvedPage = lazy(() => import('@/pages/OwnerResolvedPage').then(module => ({ default: module.OwnerResolvedPage })));
const publicView = (element: ReactNode, title='Feedback Inbox', description='Collect feedback, preserve the evidence, and understand what to fix next.') => <Suspense fallback={<PublicRouteSkeleton />}><PageMetadata title={title} description={description}/>{element}</Suspense>;
const ownerView = (element: ReactNode, title='Workspace') => <Suspense fallback={<OwnerRouteSkeleton />}><PageMetadata title={title} description="Private Feedback Inbox owner workspace."/>{element}</Suspense>;

export const router = createBrowserRouter([
  { path: '/', element: publicView(<LandingPage />), errorElement: <RouteError /> },
  { path: '/demo', element: publicView(<DemoPage />,'Representative demo'), errorElement: <RouteError /> },
  {
    path: '/app',
    element: ownerView(<AppLayout />), errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/app/overview" replace /> },
      { path: 'overview', element: ownerView(<OwnerOverviewPage />,'Overview') },
      { path: 'inbox', element: ownerView(<OwnerInboxPage />,'Inbox') },
      { path: 'setup', element: ownerView(<OwnerSetupPage />,'Set up a board') },
      { path: 'issues', element: ownerView(<OwnerIssuesPage />,'Issues') },
      { path: 'issues/:issueId', element: ownerView(<OwnerIssueDetailPage />,'Issue detail') },
      { path: 'resolved', element: ownerView(<OwnerResolvedPage />,'Resolved issues') },
      { path: 'settings', element: ownerView(<PlaceholderWorkspacePage />,'Settings') },
    ],
  },
  { path: '/f/:projectSlug', element: publicView(<PublicPortalPage />), errorElement: <RouteError /> },
  { path: '/track/:token', element: publicView(<TrackingPage />,'Track feedback','Use a private link to follow a feedback report.'), errorElement: <RouteError /> },
  { path: '*', element: publicView(<NotFoundPage />), errorElement: <RouteError /> },
]);
