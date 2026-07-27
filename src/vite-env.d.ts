/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Injected by `base44 dev`; falls back to the built-in app id in production builds. */
  readonly VITE_BASE44_APP_ID?: string;
  /** Injected by `base44 dev`; the local backend base URL (e.g. http://localhost:4400). Undefined in production builds. */
  readonly VITE_BASE44_APP_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
