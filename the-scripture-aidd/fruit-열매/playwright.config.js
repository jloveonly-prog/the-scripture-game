// TASK-001 · REQ-017 · FR-077 · NFR-002 · D-33 — Playwright E2E 설정 (로컬 모드, 브라우저 컨텍스트 2개는 테스트 안에서 생성).
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
// 광야 BUG-001: headless 기본 SwiftShader(소프트웨어 GL)에서는 PixiJS 배경·보드가 2~3fps로 떨어져 메인 스레드가 막힌다.
// 실제 GPU(ANGLE)를 쓰게 해 NFR-001(60fps) 조건에서 시험한다 — 단언은 그대로, 실행 환경만 바로잡는다.
const GPU_ARGS = process.platform === 'win32'
  ? ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu']
  : ['--ignore-gpu-blocklist', '--enable-gpu'];

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120000,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'off', // 광야: 2컨텍스트 × 12Hz 프레임 trace 저장이 teardown 120초를 넘겼다 — 실패 현장은 시험 안의 dumpScene 주석으로 남긴다
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: GPU_ARGS } } },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180000,
  },
});
