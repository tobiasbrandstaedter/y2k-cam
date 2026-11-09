import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Target is iOS Safari 17 only (QA-6). No legacy transforms, no polyfills.
export default defineConfig({
  plugins: [preact()],
  build: {
    target: 'safari17',
    sourcemap: true,
  },
});
