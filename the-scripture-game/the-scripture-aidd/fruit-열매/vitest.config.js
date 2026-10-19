// vitest.config.js — Vitest test.projects 3종(client·worker·content) Node 환경 설정만
// TASK-001-5 | REQ-017 FR-075 FR-076 | ARCH-018 | devguide §1.3 (`npm test` = `vitest run`)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // ARCH-002·ARCH-003 순수 엔진·보드 효과 단위 테스트 (DOM 없이 Node — devguide §3.4)
        test: {
          name: "client",
          environment: "node",
          include: ["client/test/**/*.test.js"],
        },
      },
      {
        // ARCH-011~ARCH-015 판정·원장·프로토콜 단위 테스트 (cloudflare:workers 비의존 모듈만 — devguide §3.4)
        test: {
          name: "worker",
          environment: "node",
          include: ["worker/test/**/*.test.ts"],
        },
      },
      {
        // ARCH-016 공용 콘텐츠 JSON 검사 (FR-076)
        test: {
          name: "content",
          environment: "node",
          include: ["content/**/*.test.{js,mjs}"],
        },
      },
    ],
    // 지역별로 테스트 파일이 순차 추가되므로 아직 파일이 없는 project가 있어도 실패로 보지 않는다
    passWithNoTests: true,
  },
});
