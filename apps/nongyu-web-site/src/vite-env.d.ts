/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRACK_WEB_URL?: string;
  readonly VITE_TRACK_WEB_SITE_KEY?: string;
  readonly VITE_SITE_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
