// TASK-001 · REQ-017 · FR-075 · D-33 — Vitest 단위 테스트 설정 (순수 모듈: 엔진·판정·검증·콘텐츠, JS·TS 공통).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.{js,ts}'],
    environment: 'node',
    globals: false,
    restoreMocks: true,
    testTimeout: 10000,
  },
});
