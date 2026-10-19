// playwright.config.js — Playwright 설정만 (testDir client/e2e, chromium, webServer=npm run dev, baseURL :5173)
// TASK-001-5 | REQ-017 FR-077 | ARCH-018 | D-17 (설치된 chromium-1194 — PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers)
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

export default defineConfig({
  testDir: "client/e2e",
  // FR-077: 브라우저 2개가 한 방에서 대전 — 테스트끼리 원장·대기열을 공유하므로 직렬 실행
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // FR-073: Vite(5173) + wrangler dev(8787)를 한 번에 띄운다
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180000,
  },
});
