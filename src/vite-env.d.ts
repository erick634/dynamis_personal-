/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_BASE_URL?: string;
  readonly VITE_DYNAMIS_JWT?: string;
  readonly VITE_ALLOW_EMPTY_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
