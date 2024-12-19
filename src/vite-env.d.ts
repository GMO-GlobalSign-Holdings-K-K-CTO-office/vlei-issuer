/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_VUETIFY_THEME: string;
  readonly VITE_REMOTE_DWN_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
