export interface BackendConfiguration { appBaseUrl: string; notificationIntegrationEnabled: boolean; production: boolean; }
export const CANONICAL_APP_ORIGIN = "https://vensaos.com";
export const SECONDARY_APP_ORIGIN = "https://www.vensaos.com";
function isLocalHostname(hostname: string) { return ["localhost", "127.0.0.1", "[::1]"].includes(hostname); }

function buildUrl(origin: string, path: string, allowSearchAndHash = false): string {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Application URL paths must be same-origin absolute paths.");
  const url = new URL(path, `${origin}/`);
  if (url.origin !== origin) throw new Error("Application URL paths cannot change origin.");
  if (!allowSearchAndHash && (url.search || url.hash)) throw new Error("Application URL paths cannot include a query string or fragment.");
  return url.toString();
}

export function buildCanonicalUrl(path: string, options: { allowSearchAndHash?: boolean } = {}): string {
  return buildUrl(CANONICAL_APP_ORIGIN, path, options.allowSearchAndHash === true);
}

export function buildAppUrl(path: string, options: { development: boolean; currentOrigin?: string }): string {
  if (!options.development) return buildCanonicalUrl(path);
  if (!options.currentOrigin) throw new Error("Local application origin is required in development.");
  const current = new URL(options.currentOrigin);
  if (!["http:", "https:"].includes(current.protocol) || !isLocalHostname(current.hostname) || current.origin !== options.currentOrigin) throw new Error("Development application origin must be an exact localhost origin.");
  return buildUrl(current.origin, path);
}

export function buildPublicBoardUrl(projectSlug: string, options?: { development: boolean; currentOrigin?: string }): string {
  const path = `/f/${encodeURIComponent(projectSlug)}`;
  return options ? buildAppUrl(path, options) : buildCanonicalUrl(path);
}

export function buildTrackingUrl(rawToken: string, options?: { development: boolean; currentOrigin?: string }): string {
  const path = `/track/${encodeURIComponent(rawToken)}`;
  return options ? buildAppUrl(path, options) : buildCanonicalUrl(path);
}

export function buildOwnerIssueUrl(issueId: string): string {
  return buildCanonicalUrl(`/app/issues/${encodeURIComponent(issueId)}`);
}

export function buildSameOriginReturnUrl(currentOrigin: string, internalPath: string): string {
  const origin = new URL(currentOrigin);
  if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== currentOrigin) throw new Error("Authentication return origin is invalid.");
  if (!internalPath.startsWith("/") || internalPath.startsWith("//")) throw new Error("Authentication return path must be same-origin.");
  const path = new URL(internalPath, `${origin.origin}/`).pathname;
  return `${origin.origin}${path}`;
}
export function validateAppBaseUrl(value: string | undefined, production: boolean): string {
  if (!value) throw new Error("APP_BASE_URL is required in production.");
  let url: URL; try { url = new URL(value); } catch { throw new Error("APP_BASE_URL must be an absolute URL."); }
  if (production && value !== CANONICAL_APP_ORIGIN) throw new Error("APP_BASE_URL must be the approved canonical production origin.");
  if (production && url.protocol !== "https:") throw new Error("APP_BASE_URL must use HTTPS in production.");
  if (production && isLocalHostname(url.hostname)) throw new Error("APP_BASE_URL cannot use localhost in production.");
  if (!production && !["http:", "https:"].includes(url.protocol)) throw new Error("APP_BASE_URL must use HTTP or HTTPS.");
  return url.origin;
}
export function resolveBackendConfiguration(input: { appBaseUrl?: string; notificationIntegrationEnabled?: string; requestUrl: string }): BackendConfiguration {
  const request = new URL(input.requestUrl); const production = !isLocalHostname(request.hostname);
  const appBaseUrl = validateAppBaseUrl(input.appBaseUrl ?? (production ? undefined : request.origin), production);
  return { appBaseUrl, production, notificationIntegrationEnabled: input.notificationIntegrationEnabled === "true" };
}
