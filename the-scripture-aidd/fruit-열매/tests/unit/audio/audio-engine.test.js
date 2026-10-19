// TASK-050 · FR-060 · FR-027 · D-24 — 음량 dB 변환·버스 음량·음소거 복원·귀신 효과음 버스 음소거·자동재생 해제 검사
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('tone', async () => {
  const { createFakeTone } = await import('./fake-tone.js');
  return createFakeTone();
});

const ENGINE = '../../../client/js/audio/audio-engine.js';

async function load({ audioContext = true } = {}) {
  vi.resetModules();
  (await import('tone')).__fake.reset();
  if (audioContext) globalThis.AudioContext = function FakeAudioContext() {};
  const engine = await import(ENGINE);
  const Tone = await import('tone');
  Tone.__fake.reset();
  return { engine, fake: Tone.__fake };
}

function buses(fake) {
  const [master, sfx, music] = fake.byKind('Volume');
  return { master, sfx, music };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  delete globalThis.AudioContext;
  vi.useRealTimers();
});

describe('volumeToDb (FR-060)', () => {
  it('0은 무음, 100은 0dB, 그 외 20·log10(v/100)', async () => {
    const { engine } = await load();
    expect(engine.volumeToDb(0)).toBe(-Infinity);
    expect(engine.volumeToDb(100)).toBe(0);
    expect(engine.volumeToDb(50)).toBeCloseTo(-6.0206, 3);
    expect(engine.volumeToDb(80)).toBeCloseTo(-1.9382, 3);
    expect(engine.volumeToDb(10)).toBeCloseTo(-20, 6);
  });
  it('범위 밖은 0~100으로 자르고 숫자 아님은 무음', async () => {
    const { engine } = await load();
    expect(engine.volumeToDb(150)).toBe(0);
    expect(engine.volumeToDb(-5)).toBe(-Infinity);
    expect(engine.volumeToDb('abc')).toBe(-Infinity);
  });
});

describe('음량·음소거 상태 (FR-060, UC-020 3a)', () => {
  it('초기값 80/80/60, 음소거 false', async () => {
    const { engine } = await load();
    expect(engine.getVolumes()).toEqual({ master: 80, sfx: 80, music: 60, muted: false });
    expect(engine.isAudioUnlocked()).toBe(false);
  });

  it('해제 시 버스 3개(마스터 ← 효과음·음악)를 만들고 초기 dB 적용', async () => {
    const { engine, fake } = await load();
    expect(await engine.unlockAudio()).toBe(true);
    expect(engine.isAudioUnlocked()).toBe(true);
    const { master, sfx, music } = buses(fake);
    expect(master.connections).toEqual(['destination']);
    expect(sfx.connections).toEqual([master]);
    expect(music.connections).toEqual([master]);
    expect(master.volume.value).toBeCloseTo(engine.volumeToDb(80), 6);
    expect(music.volume.value).toBeCloseTo(engine.volumeToDb(60), 6);
  });

  it('setVolume은 버스 dB를 바꾸고 알 수 없는 버스는 무시', async () => {
    const { engine, fake } = await load();
    await engine.unlockAudio();
    engine.setVolume('sfx', 50);
    engine.setVolume('music', 0);
    engine.setVolume('bogus', 10);
    const { sfx, music } = buses(fake);
    expect(sfx.volume.value).toBeCloseTo(-6.0206, 3);
    expect(music.volume.value).toBe(-Infinity);
    expect(engine.getVolumes()).toEqual({ master: 80, sfx: 50, music: 0, muted: false });
  });

  it('음소거는 마스터만 무음, 해제 시 이전 값(음소거 중 바꾼 값 포함) 복원', async () => {
    const { engine, fake } = await load();
    await engine.unlockAudio();
    const { master } = buses(fake);
    engine.setMuted(true);
    expect(master.volume.value).toBe(-Infinity);
    engine.setVolume('master', 40);
    expect(master.volume.value).toBe(-Infinity);
    expect(engine.getVolumes().muted).toBe(true);
    engine.setMuted(false);
    expect(master.volume.value).toBeCloseTo(engine.volumeToDb(40), 6);
  });

  it('해제 전 설정값도 해제 시 반영', async () => {
    const { engine, fake } = await load();
    engine.setVolume('sfx', 20);
    engine.setMuted(true);
    await engine.unlockAudio();
    const { master, sfx } = buses(fake);
    expect(master.volume.value).toBe(-Infinity);
    expect(sfx.volume.value).toBeCloseTo(engine.volumeToDb(20), 6);
  });
});

describe('muteSfxBusFor — 귀먹고 말 못하게 하는 귀신 (FR-027)', () => {
  it('지연 후 효과음 버스 무음, 구간 뒤 복원', async () => {
    const { engine, fake } = await load();
    await engine.unlockAudio();
    vi.useFakeTimers();
    const { sfx } = buses(fake);
    const normal = sfx.volume.value;
    engine.muteSfxBusFor(5000, 600);
    vi.advanceTimersByTime(599);
    expect(sfx.volume.value).toBe(normal);
    vi.advanceTimersByTime(1);
    expect(sfx.volume.value).toBe(-Infinity);
    vi.advanceTimersByTime(4999);
    expect(sfx.volume.value).toBe(-Infinity);
    vi.advanceTimersByTime(1);
    expect(sfx.volume.value).toBe(normal);
  });

  it('겹친 구간은 마지막 구간 끝까지 무음, 음악·마스터는 영향 없음', async () => {
    const { engine, fake } = await load();
    await engine.unlockAudio();
    vi.useFakeTimers();
    const { sfx, music, master } = buses(fake);
    engine.muteSfxBusFor(1000);
    vi.advanceTimersByTime(500);
    engine.muteSfxBusFor(1000);
    vi.advanceTimersByTime(600);
    expect(sfx.volume.value).toBe(-Infinity);
    expect(music.volume.value).toBeCloseTo(engine.volumeToDb(60), 6);
    expect(master.volume.value).toBeCloseTo(engine.volumeToDb(80), 6);
    vi.advanceTimersByTime(400);
    expect(sfx.volume.value).toBeCloseTo(engine.volumeToDb(80), 6);
  });
});

describe('unlockAudio 예외 (devguide §3.6 — 무음 진행)', () => {
  it('AudioContext 미지원이면 false, Tone.start 호출 없음', async () => {
    const { engine, fake } = await load({ audioContext: false });
    expect(await engine.unlockAudio()).toBe(false);
    expect(fake.state.startCalls).toBe(0);
    expect(engine.getTone()).toBeNull();
  });

  it('Tone.start 실패·컨텍스트 미실행이면 false, 로그 1회', async () => {
    const { engine, fake } = await load();
    fake.state.startError = new Error('blocked');
    expect(await engine.unlockAudio()).toBe(false);
    expect(await engine.unlockAudio()).toBe(false);
    expect(console.error).toHaveBeenCalledTimes(1);
    fake.state.startError = null;
    fake.state.contextState = 'suspended';
    expect(await engine.unlockAudio()).toBe(false);
    fake.state.contextState = 'running';
    expect(await engine.unlockAudio()).toBe(true);
  });

  it('동시 호출은 Tone.start 1회로 합치고 onUnlocked 콜백 실행', async () => {
    const { engine, fake } = await load();
    const cb = vi.fn();
    engine.onUnlocked(cb);
    const [a, b] = await Promise.all([engine.unlockAudio(), engine.unlockAudio()]);
    expect(a && b).toBe(true);
    expect(fake.state.startCalls).toBe(1);
    expect(cb).toHaveBeenCalledTimes(1);
    const late = vi.fn();
    engine.onUnlocked(late);
    expect(late).toHaveBeenCalledTimes(1);
  });
});
