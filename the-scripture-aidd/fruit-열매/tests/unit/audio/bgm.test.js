// TASK-050 · FR-059 · FR-055 · FR-061 — 적응형 BGM 상태 전환·위기 템포·콤보 필터·덕킹 검사 (design-vision §4.11)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('tone', async () => {
  const { createFakeTone } = await import('./fake-tone.js');
  return createFakeTone();
});

const AUDIO = '../../../client/js/audio/';

async function load({ unlock = true } = {}) {
  vi.resetModules();
  (await import('tone')).__fake.reset();
  globalThis.AudioContext = function FakeAudioContext() {};
  const engine = await import(AUDIO + 'audio-engine.js');
  const bgm = await import(AUDIO + 'bgm.js');
  const Tone = await import('tone');
  Tone.__fake.reset();
  if (unlock) await engine.unlockAudio();
  return { engine, bgm, fake: Tone.__fake };
}

const activeLoops = (fake) => fake.byKind('Loop').filter((l) => l.started > 0 && !l.disposed);
const duckNode = (fake) => fake.byKind('Volume')[3];

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  delete globalThis.AudioContext;
  vi.useRealTimers();
});

describe('순수 계산', () => {
  it('comboCutoffHz: +200Hz × 콤보, 상한 +1600Hz', async () => {
    const { bgm } = await load({ unlock: false });
    const base = bgm.PAD_BASE_CUTOFF_HZ;
    expect(bgm.comboCutoffHz(0)).toBe(base);
    expect(bgm.comboCutoffHz(3)).toBe(base + 600);
    expect(bgm.comboCutoffHz(8)).toBe(base + 1600);
    expect(bgm.comboCutoffHz(20)).toBe(base + 1600);
    expect(bgm.comboCutoffHz(-2)).toBe(base);
  });
  it('bgmTempo: 대기 72 · 전투 100 · 위기 124', async () => {
    const { bgm } = await load({ unlock: false });
    expect(bgm.bgmTempo('lobby', false)).toBe(72);
    expect(bgm.bgmTempo('battle', false)).toBe(100);
    expect(bgm.bgmTempo('battle', true)).toBe(124);
    expect(bgm.bgmTempo('stopped', false)).toBeNull();
  });
  it('effectiveDuckDb: 가장 깊은 값 1개 (합산 금지)', async () => {
    const { bgm } = await load({ unlock: false });
    expect(bgm.effectiveDuckDb([])).toBe(0);
    expect(bgm.effectiveDuckDb([-6, -9])).toBe(-9);
  });
});

describe('상태 기계 (FR-059)', () => {
  it('해제 전 lobby 요청은 기억했다가 해제 시 BGM-01(72BPM) 시작', async () => {
    const { engine, bgm, fake } = await load({ unlock: false });
    bgm.setBgmState('lobby');
    expect(fake.created).toHaveLength(0);
    await engine.unlockAudio();
    expect(fake.transport.bpm.value).toBe(72);
    expect(fake.transport.state).toBe('started');
    expect(activeLoops(fake).length).toBeGreaterThan(0);
    const fade = fake.byKind('Volume')[4];
    expect(fade.volume.ramps.at(-1)).toEqual([-20, 1]);
  });

  it('lobby → battle 교차 페이드 1000ms, 이전 트랙은 페이드 후 폐기', async () => {
    const { bgm, fake } = await load();
    vi.useFakeTimers();
    bgm.setBgmState('lobby');
    const lobbyLoops = activeLoops(fake);
    const lobbyFade = fake.byKind('Volume')[4];
    bgm.setBgmState('battle');
    expect(fake.transport.bpm.value).toBe(100);
    expect(lobbyFade.volume.ramps.at(-1)[1]).toBe(1);
    const battleFade = fake.byKind('Volume')[5];
    expect(battleFade.volume.ramps.at(-1)).toEqual([-16, 1]);
    vi.advanceTimersByTime(1100);
    expect(lobbyLoops.every((l) => l.disposed)).toBe(true);
    expect(battleFade.disposed).toBe(false);
  });

  it('같은 상태 재요청은 무시, stopped는 음악 정지, 알 수 없는 상태 무시', async () => {
    const { bgm, fake } = await load();
    vi.useFakeTimers();
    bgm.setBgmState('battle');
    const count = fake.created.length;
    bgm.setBgmState('battle');
    bgm.setBgmState('party');
    expect(fake.created.length).toBe(count);
    bgm.setBgmState('stopped');
    vi.advanceTimersByTime(1100);
    expect(activeLoops(fake)).toHaveLength(0);
  });
});

describe('위기 레이어·콤보 (FR-055, FR-061)', () => {
  it('위험선 진입 2초 124BPM·심장박동 게인 1, 이탈 3초 원복', async () => {
    const { bgm, fake } = await load();
    bgm.setBgmState('battle');
    const dangerGain = fake.byKind('Gain')[0];
    expect(dangerGain.gain.value).toBe(0);
    bgm.setDanger(true);
    expect(fake.transport.bpm.ramps.at(-1)).toEqual([124, 2]);
    expect(dangerGain.gain.ramps.at(-1)).toEqual([1, 2]);
    bgm.setDanger(false);
    expect(fake.transport.bpm.ramps.at(-1)).toEqual([100, 3]);
    expect(dangerGain.gain.ramps.at(-1)).toEqual([0, 3]);
  });

  it('대기실에서는 위기 무시, 전투 시작 전 위기 상태는 전투 진입 시 반영', async () => {
    const { bgm, fake } = await load();
    bgm.setBgmState('lobby');
    bgm.setDanger(true);
    expect(fake.transport.bpm.ramps).toHaveLength(0);
    bgm.setBgmState('battle');
    expect(fake.transport.bpm.value).toBe(124);
    expect(fake.byKind('Gain')[0].gain.value).toBe(1);
  });

  it('콤보 필터 상승, 0이면 600ms 원복, 전투 이탈 시 초기화', async () => {
    const { bgm, fake } = await load();
    bgm.setBgmState('battle');
    const padFilter = fake.byKind('Filter')[0];
    bgm.setComboLevel(4);
    expect(padFilter.frequency.ramps.at(-1)[0]).toBe(bgm.comboCutoffHz(4));
    bgm.setComboLevel(0);
    expect(padFilter.frequency.ramps.at(-1)).toEqual([bgm.PAD_BASE_CUTOFF_HZ, 0.6]);
    bgm.setComboLevel(5);
    bgm.setBgmState('lobby');
    bgm.setBgmState('battle');
    expect(fake.byKind('Filter')[1].args[0].frequency).toBe(bgm.PAD_BASE_CUTOFF_HZ);
  });
});

describe('덕킹 duckMusic', () => {
  it('말씀 대결 −6, 예수님 −9 중첩 시 −9, release는 1회만', async () => {
    const { bgm, fake } = await load();
    const duck = duckNode(fake);
    expect(duck.connections[0]).toBe(fake.byKind('Volume')[2]);
    const releaseQuiz = bgm.duckMusic(-6);
    expect(duck.volume.ramps.at(-1)[0]).toBe(-6);
    const releaseJesus = bgm.duckMusic(-9);
    expect(duck.volume.ramps.at(-1)[0]).toBe(-9);
    releaseJesus();
    expect(duck.volume.ramps.at(-1)[0]).toBe(-6);
    const n = duck.volume.ramps.length;
    releaseJesus();
    expect(duck.volume.ramps.length).toBe(n);
    releaseQuiz();
    expect(duck.volume.ramps.at(-1)[0]).toBe(0);
  });
  it('해제 전에도 호출 가능 (무음 no-op, 예외 없음)', async () => {
    const { bgm } = await load({ unlock: false });
    const release = bgm.duckMusic(-6);
    expect(() => { release(); bgm.setDanger(true); bgm.setComboLevel(3); }).not.toThrow();
  });
});
