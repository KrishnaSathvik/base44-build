import { buildAppUrl, buildOwnerIssueUrl, buildPublicBoardUrl, buildSameOriginReturnUrl, buildTrackingUrl } from '../../base44/shared/configuration';

export interface BrowserUrlRuntime { development: boolean; currentOrigin: string }

function browserRuntime(): BrowserUrlRuntime {
  return { development: import.meta.env.DEV, currentOrigin: window.location.origin };
}

export function publicBoardUrl(projectSlug: string, runtime = browserRuntime()): string {
  return buildPublicBoardUrl(projectSlug, runtime);
}

export function reporterTrackingUrl(rawToken: string, runtime = browserRuntime()): string {
  return buildTrackingUrl(rawToken, runtime);
}

export function ownerIssueUrl(issueId: string): string {
  return buildOwnerIssueUrl(issueId);
}

export function authenticationReturnUrl(internalPath = window.location.pathname, currentOrigin = window.location.origin): string {
  return buildSameOriginReturnUrl(currentOrigin, internalPath);
}

export function runtimeAppUrl(path: string, runtime = browserRuntime()): string {
  return buildAppUrl(path, runtime);
}
