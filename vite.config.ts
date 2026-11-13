import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// Target is iOS Safari 17 only (QA-6). No legacy transforms, no polyfills.
// VITE_BASE_PATH is set by the Pages workflow (/<repo>/); locally the app runs at /.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    base: env.VITE_BASE_PATH ?? '/',
    plugins: [
      preact(),
      // UX-7, UX-8: precache the whole build so the installed app opens offline.
      // 'prompt' keeps a new service worker waiting until every tab is closed, so an
      // update never swaps code under a running edit. It applies on the next launch.
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'inline',
        manifest: {
          name: 'y2k',
          short_name: 'y2k',
          description: 'Retro Kamera Editor',
          lang: 'de',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0c0c0e',
          theme_color: '#0c0c0e',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,woff2}'],
          // the VT323 woff fallbacks are never requested by Safari 17, skip them
          globIgnores: ['**/*.woff', '**/*.map'],
        },
      }),
    ],
    build: {
      target: 'safari17',
      sourcemap: true,
    },
  };
});
