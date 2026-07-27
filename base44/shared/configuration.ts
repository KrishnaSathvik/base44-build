export interface BackendConfiguration { appBaseUrl: string; notificationIntegrationEnabled: boolean; production: boolean; }
function isLocalHostname(hostname: string) { return ["localhost", "127.0.0.1", "[::1]"].includes(hostname); }
export function validateAppBaseUrl(value: string | undefined, production: boolean): string {
  if (!value) throw new Error("APP_BASE_URL is required in production.");
  let url: URL; try { url = new URL(value); } catch { throw new Error("APP_BASE_URL must be an absolute URL."); }
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
