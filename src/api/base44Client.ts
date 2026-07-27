import { createClient } from '@base44/sdk';

// `base44 dev` injects VITE_BASE44_APP_ID for local development; the literal is
// the deployed app id used by production builds.
const appId = import.meta.env.VITE_BASE44_APP_ID ?? '6a627102d65aedec9330ed4c';

// `base44 dev` also injects VITE_BASE44_APP_BASE_URL pointing at the local
// backend (http://localhost:4400). `serverUrl` sets the entities/functions API
// host; `appBaseUrl` sets login/logout redirect URLs. Without them the SDK
// targets production base44.app, so local entity/function/RLS changes would
// never be exercised. In production builds the var is undefined and the SDK
// falls back to its default host.
const localBaseUrl = import.meta.env.VITE_BASE44_APP_BASE_URL;

export const base44 = createClient(
  localBaseUrl
    ? { appId, serverUrl: localBaseUrl, appBaseUrl: localBaseUrl }
    : { appId },
);
