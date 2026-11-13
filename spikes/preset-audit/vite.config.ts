import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Dev server for the preset audit. Same root as the other spikes, plus one endpoint that writes
// the comparison sheets the harness renders into docs/testing/preset-audit/.
const OUT = resolve(__dirname, '../../docs/testing/preset-audit');

const save: Plugin = {
  name: 'audit-save',
  configureServer(server) {
    server.middlewares.use('/__save/', (req, res) => {
      const name = decodeURIComponent((req.url ?? '').slice(1));
      if (req.method !== 'POST' || !/^[\w.-]+\.(jpg|json)$/.test(name)) {
        res.statusCode = 400;
        res.end(`Expected POST /__save/<name>.jpg or .json, got ${req.method} ${name}`);
        return;
      }
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        mkdirSync(OUT, { recursive: true });
        writeFileSync(resolve(OUT, name), Buffer.concat(chunks));
        res.end(resolve(OUT, name));
      });
    });
  },
};

export default defineConfig({
  root: resolve(__dirname, '..'),
  plugins: [save],
  server: { port: 5182 },
});
