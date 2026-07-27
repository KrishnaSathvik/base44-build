export interface FrontendRuntimeConfig { appId: string; serverUrl?: string; }
const LINKED_APP_ID = '6a627102d65aedec9330ed4c';

function isLocalUrl(value: string) { try { const url = new URL(value); return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); } catch { return false; } }

export function validateFrontendConfig(input: { appId?: string; injectedServerUrl?: string; development: boolean }): FrontendRuntimeConfig {
  const appId = input.appId?.trim();
  if (!appId) throw new Error('Base44 app identity is missing.');
  if (!input.development) {
    if (input.injectedServerUrl && isLocalUrl(input.injectedServerUrl)) throw new Error('Production cannot route Base44 SDK requests to localhost.');
    return { appId };
  }
  const serverUrl = input.injectedServerUrl || 'http://localhost:4400';
  if (!isLocalUrl(serverUrl)) throw new Error('Local development must use a localhost Base44 backend.');
  return { appId, serverUrl };
}

export const frontendRuntimeConfig = validateFrontendConfig({
  appId: import.meta.env.VITE_BASE44_APP_ID ?? LINKED_APP_ID,
  injectedServerUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
  development: import.meta.env.DEV,
});
