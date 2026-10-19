// TASK-041-4 · FR-057 · FR-061 · FR-075 · D3-08 · D3-09 — 연출 세기 배율·섬광 초당 3회 상한·흔들림/히트스톱 토큰 검사.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FLASH_LEVELS, setShakeEnabled, setFlashLevel, getIntensity, initIntensityFromSystem, scaleFlashAlpha, scaleBrightness,
  scaleShake, tryFlash, resetIntensity, prefersReducedMotion,
} from '../../../client/js/fx/fx-intensity.js';
import { SH, comboShake, hitShake, pickLargestShake, createScreenShake } from '../../../client/js/fx/screen-shake.js';
import { comboHitstopMs, mergeHitstop, createHitstopClock, HS } from '../../../client/js/fx/hitstop.js';

beforeEach(() => resetIntensity());
afterEach(() => vi.unstubAllGlobals());

describe('fx-intensity 배율 (design-vision §2.7)', () => {
  it('기본값은 흔들림 켜기 ×1, 섬광 기본 ×1', () => {
    expect(getIntensity()).toEqual({ shake: 1, flash: 1, shakeEnabled: true, flashLevel: 'normal' });
  });

  it('섬광 3단계 100% / 50% / 20%', () => {
    expect(FLASH_LEVELS).toEqual({ normal: 1, reduced: 0.5, minimal: 0.2 });
    setFlashLevel('reduced');
    expect(getIntensity().flash).toBe(0.5);
    expect(scaleFlashAlpha(0.9)).toBeCloseTo(0.45);
    setFlashLevel('minimal');
    expect(scaleFlashAlpha(0.45)).toBeCloseTo(0.09);
  });

  it('알 수 없는 섬광 단계는 무시한다', () => {
    setFlashLevel('reduced');
    setFlashLevel('extreme');
    expect(getIntensity().flashLevel).toBe('reduced');
  });

  it('블룸·충격파 brightness는 1을 넘는 초과분만 줄인다', () => {
    expect(scaleBrightness(1.3)).toBeCloseTo(1.3);
    setFlashLevel('reduced');
    expect(scaleBrightness(1.3)).toBeCloseTo(1.15);
    setFlashLevel('minimal');
    expect(scaleBrightness(1.1)).toBeCloseTo(1.02);
  });

  it('흔들림 끄기 = ×0 (모든 SH)', () => {
    setShakeEnabled(false);
    expect(getIntensity().shake).toBe(0);
    expect(scaleShake(12)).toBe(0);
    const shake = createScreenShake(() => 0.5);
    expect(shake.start(SH.SH5, 0)).toBe(false);
    expect(shake.sample(10)).toEqual({ x: 0, y: 0 });
  });

  it('D3-08 prefers-reduced-motion: reduce → 흔들림 끄기·섬광 줄임', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(prefersReducedMotion()).toBe(true);
    expect(initIntensityFromSystem()).toMatchObject({ shake: 0, flash: 0.5, flashLevel: 'reduced' });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(initIntensityFromSystem()).toMatchObject({ shake: 1, flash: 1, flashLevel: 'normal' });
  });

  it('matchMedia가 없으면 기본값', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(initIntensityFromSystem()).toMatchObject({ shakeEnabled: true, flashLevel: 'normal' });
  });
});

describe('섬광 안전 상한 (WCAG 2.3.1 — 화면 25% 이상, 333ms 안 2번째 생략)', () => {
  it('넓은 섬광은 333ms 안에 2번째를 거절하고 이후 허용', () => {
    expect(tryFlash(1000, 1)).toBe(true);
    expect(tryFlash(1200, 0.3)).toBe(false);
    expect(tryFlash(1332, 0.25)).toBe(false);
    expect(tryFlash(1333, 0.25)).toBe(true);
  });

  it('25% 미만 섬광(줄 섬광 등)은 상한과 무관', () => {
    expect(tryFlash(0, 1)).toBe(true);
    expect(tryFlash(10, 0.1)).toBe(true);
    expect(tryFlash(20, 0.24)).toBe(true);
  });

  it('모든 섬광 단계에서 상한이 같다', () => {
    for (const level of ['normal', 'reduced', 'minimal']) {
      resetIntensity();
      setFlashLevel(level);
      expect(tryFlash(0, 0.5)).toBe(true);
      expect(tryFlash(100, 0.5)).toBe(false);
    }
  });

  it('초당 3회 미만 — 1초 동안 매 프레임 요청해도 허용은 최대 3회', () => {
    let allowed = 0;
    for (let t = 0; t < 1000; t += 16) if (tryFlash(t, 1)) allowed += 1;
    expect(allowed).toBeLessThanOrEqual(3);
  });
});

describe('흔들림·히트스톱 토큰 (design-vision §2.8)', () => {
  it('SH-COMBO = (2 + 콤보)px 상한 8, SH-HIT = (6 + 줄)px 상한 12', () => {
    expect(comboShake(1)).toEqual({ amp: 3, durationMs: 120 });
    expect(comboShake(10).amp).toBe(8);
    expect(hitShake(4)).toEqual({ amp: 10, durationMs: 250 });
    expect(hitShake(9).amp).toBe(12);
  });

  it('HS-COMBO = 50 + 10 × min(콤보 − 1, 5) → 50~100ms', () => {
    expect(comboHitstopMs(0)).toBe(0);
    expect(comboHitstopMs(1)).toBe(50);
    expect(comboHitstopMs(3)).toBe(70);
    expect(comboHitstopMs(6)).toBe(100);
    expect(comboHitstopMs(20)).toBe(100);
    expect([HS.TSPIN, HS.TETRIS, HS.B2B]).toEqual([70, 80, 90]);
  });

  it('겹치면 가장 긴 히트스톱 1회 (합산 금지)', () => {
    expect(mergeHitstop([80, 90, 60])).toBe(90);
    expect(mergeHitstop([])).toBe(0);
    const clock = createHitstopClock();
    clock.trigger(80, 0);
    clock.trigger(50, 10);
    expect(clock.isFrozen(79)).toBe(true);
    expect(clock.isFrozen(80)).toBe(false);
    expect(clock.remaining(40)).toBe(40);
  });

  it('흔들림은 감쇠하고 지속 후 0으로 돌아온다 (30Hz 계단)', () => {
    const shake = createScreenShake(() => 0);
    expect(shake.start(SH.SH2, 0)).toBe(true);
    expect(shake.sample(0).x).toBeCloseTo(4);
    expect(shake.sample(10).x).toBeCloseTo(4);
    expect(shake.sample(60).x).toBeCloseTo(2);
    expect(shake.sample(130)).toEqual({ x: 0, y: 0 });
    expect(shake.isActive()).toBe(false);
  });

  it('더 약한 흔들림은 진행 중인 강한 흔들림을 바꾸지 않는다', () => {
    const shake = createScreenShake(() => 0);
    shake.start(SH.SH5, 0);
    expect(shake.start(SH.SH1, 10)).toBe(false);
    expect(shake.start(SH.SH6, 20)).toBe(true);
    expect(pickLargestShake([SH.SH1, null, SH.SH3, SH.SH2])).toBe(SH.SH3);
  });
});
