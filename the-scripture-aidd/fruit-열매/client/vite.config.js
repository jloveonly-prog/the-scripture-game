// TASK-002 · REQ-016 · FR-073 · FR-074 · D-27 — Vite 개발 서버(:5173)와 같은 출처 프록시(/api·/ws → wrangler dev :8787).
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/** fruit-열매/ 루트 — content/*.json을 클라이언트가 import 할 수 있도록 허용한다 (architecture §4.6). */
const WORKSPACE_ROOT = fileURLToPath(new URL('..', import.meta.url));
const WORKER_ORIGIN = 'http://127.0.0.1:8787';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  envPrefix: 'VITE_',
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [WORKSPACE_ROOT] },
    proxy: {
      '/api': { target: WORKER_ORIGIN },
      '/ws': { target: WORKER_ORIGIN.replace('http:', 'ws:'), ws: true },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
});
