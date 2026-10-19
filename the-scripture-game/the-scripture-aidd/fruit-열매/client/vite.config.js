// vite.config.js — Vite 개발 서버 설정만 (포트 5173 strictPort, /api·/ws 프록시, content/ 상대 import 허용)
// TASK-001-2 | REQ-016 FR-073 | ARCH-017 | D-03 | architecture §4·§5.2
import { defineConfig } from "vite";

// D-03: 클라이언트는 상대 경로 /api, /ws만 쓰고 Vite가 wrangler dev(127.0.0.1:8787)로 전달한다
const WORKER_HTTP = "http://127.0.0.1:8787";
const WORKER_WS = "ws://127.0.0.1:8787";

export default defineConfig({
  server: {
    port: 5173,
    // UC-021 E1: 포트가 점유되면 다른 포트로 넘어가지 않고 실패한다
    strictPort: true,
    proxy: {
      "/api": { target: WORKER_HTTP, changeOrigin: false },
      "/ws": { target: WORKER_WS, ws: true, changeOrigin: false },
    },
    fs: {
      // architecture §5.2: content/ JSON은 client/ 밖(상위 폴더)에서 상대 경로로 import
      allow: [".."],
    },
  },
});
