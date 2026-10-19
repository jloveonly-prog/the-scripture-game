// vite.config.js — Vite 개발 서버 설정만 (포트 5173 strictPort, /api·/ws 프록시, content/ 상대 import 허용·비밀 파일 차단)
// TASK-001-2 (+ TASK-071 DCL-011) | REQ-016 FR-073 NFR-004 | ARCH-017 | D-03 | architecture §4·§5.2·§10
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
      // RTM §5 DCL-011 (TASK-071 봉인 SEC-001~003): `..` 허용 범위 안의 비밀·서버 전용 파일은 /@fs/로 내주지 않는다.
      // 배열을 지정하면 Vite 기본 차단 목록이 대체되므로 기본 6개를 그대로 다시 적는다 (vite 8.3.2).
      deny: [
        ".env", ".env.*", "*.{crt,pem,key,p12,pfx,cer,der}", ".npmrc", ".yarnrc.yml", "**/.git/**",
        "**/.dev.vars", // 봉인 제2계명·NFR-004: Supabase 키는 Worker 환경에만
        "**/.wrangler/**", // 봉인 제1·7계명: 로컬 원장(token_hash·닉네임)
        "**/content/quiz.json", // api-gate §5·TBL-017: 말씀 대결 정답은 서버만
      ],
    },
  },
});
