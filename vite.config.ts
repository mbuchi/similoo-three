import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
//
// similoo-three is a React shell wrapped around a preserved imperative
// Three.js engine (src/js/**). The React plugin handles the .tsx shell;
// the engine modules are plain ESM and need no special handling. We do NOT
// enable the React Compiler here — the shell is tiny and we avoid the
// stale-node_modules compiler-runtime gotcha.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Conservative manualChunks: bucket ONLY specific heavy third-party
        // packages out of the eager entry bundle. We never chunk app code or
        // React here — app-code chunking is what triggers circular-dep TDZ
        // white-screens. Return undefined for everything else.
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          return undefined;
        },
      },
    },
  },
});
