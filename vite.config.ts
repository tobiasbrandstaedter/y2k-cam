import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';

// Target is iOS Safari 17 only (QA-6). No legacy transforms, no polyfills.
// VITE_BASE_PATH is set by the Pages workflow (/<repo>/); locally the app runs at /.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    base: env.VITE_BASE_PATH ?? '/',
    plugins: [preact()],
    build: {
      target: 'safari17',
      sourcemap: true,
    },
  };
});
