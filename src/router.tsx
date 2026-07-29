import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { OwnerRouteSkeleton, PublicRouteSkeleton } from '@/app/RouteSkeleton';
import { RouteError } from '@/app/RouteError';
import { PageMetadata } from '@/app/PageMetadata';
import { getPublicRouteMetadata } from '@/lib/publicRouteMetadata';

const AppLayout = lazy(() => import('@/app/AppLayout').then(module => ({ default: module.AppLayout })));
const AppIndexRedirect = lazy(() => import('@/app/AppIndexRedirect').then(module => ({ default: module.AppIndexRedirect })));
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
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('@/pages/TermsPage').then(module => ({ default: module.TermsPage })));
const SecurityPage = lazy(() => import('@/pages/SecurityPage').then(module => ({ default: module.SecurityPage })));
const publicView = (element: ReactNode, title = 'VensaOS', description = 'VensaOS', canonicalPath?: string) => <Suspense fallback={<PublicRouteSkeleton />}><PageMetadata title={title} description={description} canonicalPath={canonicalPath} indexable={!!canonicalPath}/>{element}</Suspense>;
const ownerView = (element: ReactNode, title='Overview') => <Suspense fallback={<OwnerRouteSkeleton />}><PageMetadata title={title} description="Private VensaOS owner workspace."/>{element}</Suspense>;
const publicIndexed = (path: '/' | '/demo' | '/privacy' | '/terms' | '/security', element: ReactNode) => {
  const meta = getPublicRouteMetadata(path)!;
  return publicView(element, meta.title, meta.description, meta.path);
};

export const router = createBrowserRouter([
  { path: '/', element: publicIndexed('/', <LandingPage />), errorElement: <RouteError /> },
  { path: '/demo', element: publicIndexed('/demo', <DemoPage />), errorElement: <RouteError /> },
  { path: '/privacy', element: publicIndexed('/privacy', <PrivacyPage />), errorElement: <RouteError /> },
  { path: '/terms', element: publicIndexed('/terms', <TermsPage />), errorElement: <RouteError /> },
  { path: '/security', element: publicIndexed('/security', <SecurityPage />), errorElement: <RouteError /> },
  {
    path: '/app',
    element: ownerView(<AppLayout />), errorElement: <RouteError />,
    children: [
      { index: true, element: ownerView(<AppIndexRedirect />) },
      { path: 'overview', element: ownerView(<OwnerOverviewPage />,'Overview') },
      { path: 'inbox', element: ownerView(<OwnerInboxPage />,'Inbox') },
      { path: 'setup', element: ownerView(<OwnerSetupPage />,'Set Up Your Workspace') },
      { path: 'issues', element: ownerView(<OwnerIssuesPage />,'Issues') },
      { path: 'issues/:issueId', element: ownerView(<OwnerIssueDetailPage />,'Issues') },
      { path: 'resolved', element: ownerView(<OwnerResolvedPage />,'Resolved') },
      { path: 'settings', element: ownerView(<PlaceholderWorkspacePage />,'Settings') },
    ],
  },
  { path: '/f/:projectSlug', element: publicView(<PublicPortalPage />,'Submit Feedback'), errorElement: <RouteError /> },
  { path: '/track/:token', element: publicView(<TrackingPage />,'Track Your Feedback','Use a private link to follow a feedback report.'), errorElement: <RouteError /> },
  { path: '*', element: publicView(<NotFoundPage />), errorElement: <RouteError /> },
]);
