import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Serves the spike pages to a phone on the same WLAN. HTTPS with a self signed
// cert because WebCodecs and navigator.share only exist in secure contexts.
// `--mode http` turns the cert off for local checks on the PC, where localhost
// counts as secure anyway.
export default defineConfig(({ mode }) => ({
  root: 'spikes',
  plugins: mode === 'http' ? [] : [basicSsl()],
  server: { host: true, port: 5180 },
}));
