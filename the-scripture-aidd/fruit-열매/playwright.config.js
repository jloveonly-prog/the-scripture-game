// TASK-001 · REQ-017 · FR-077 · NFR-002 · D-33 — Playwright E2E 설정 (로컬 모드, 브라우저 컨텍스트 2개는 테스트 안에서 생성).
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120000,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180000,
  },
});
