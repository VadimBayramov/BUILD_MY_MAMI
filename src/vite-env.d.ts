/// <reference types="vite/client" />

import type { FunnelStore } from '@typedefs/store';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    __store?: FunnelStore;
  }
}

export {};
