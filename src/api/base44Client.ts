import { createClient } from '@base44/sdk';
import { frontendRuntimeConfig } from '@/lib/config';

export const base44 = createClient(
  frontendRuntimeConfig.serverUrl
    ? { appId: frontendRuntimeConfig.appId, serverUrl: frontendRuntimeConfig.serverUrl, appBaseUrl: frontendRuntimeConfig.serverUrl }
    : { appId: frontendRuntimeConfig.appId },
);
