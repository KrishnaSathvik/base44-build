import { createClient } from '@base44/sdk';
import { createBase44ClientOptions, frontendRuntimeConfig } from '@/lib/config';

export const base44 = createClient(createBase44ClientOptions(frontendRuntimeConfig));
