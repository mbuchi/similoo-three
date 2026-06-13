/// <reference types="vite/client" />

// The preserved imperative engine lives in src/js/** as plain ESM. We expose
// a single typed boundary (bootScene) so the React shell can mount it without
// pulling the whole untyped engine into the type checker.
declare module './js/bootScene.js' {
  export interface BootSceneHandle {
    dispose: () => void;
  }
  export function bootScene(): BootSceneHandle;
  export function applyEngineTranslations(): void;
}

interface ImportMetaEnv {
  readonly VITE_MAPBOX_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
