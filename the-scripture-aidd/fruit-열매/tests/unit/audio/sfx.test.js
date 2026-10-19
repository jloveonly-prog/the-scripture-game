// TASK-050 · FR-058 · FR-061 — 효과음 17종 큐 매핑·음 높이 진행(줄 수·콤보·B2B)·길이 변주·무음 no-op 검사
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
  const play = await import(AUDIO + 'sfx-play.js');
  const battle = await import(AUDIO + 'sfx-battle.js');
  const Tone = await import('tone');
  Tone.__fake.reset();
  if (unlock) await engine.unlockAudio();
  return { engine, play, battle, fake: Tone.__fake };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  delete globalThis.AudioContext;
  vi.useRealTimers();
});

describe('음 계산 (공통)', () => {
  it('transposeNote·noteToMidi', async () => {
    const { play } = await load({ unlock: false });
    expect(play.noteToMidi('C4')).toBe(60);
    expect(play.noteToMidi('A4')).toBe(69);
    expect(play.noteToMidi('Bb3')).toBe(58);
    expect(play.transposeNote('A5', 5)).toBe('D6');
    expect(play.transposeNote('C4', -7)).toBe('F3');
    expect(play.transposeNote('G3', -5)).toBe('D3');
    expect(play.transposeNote('xx', 3)).toBe('xx');
  });
  it('scaleDb: 배율 0.5 ≈ −6dB, 0은 무음, 미지정은 그대로', async () => {
    const { play } = await load({ unlock: false });
    expect(play.scaleDb(-12, 0.5)).toBeCloseTo(-18.0206, 3);
    expect(play.scaleDb(-12, 0)).toBe(-Infinity);
    expect(play.scaleDb(-12)).toBe(-12);
  });
});

describe('조작 효과음 SFX-01~09 (FR-058)', () => {
  it('9종 큐가 표 그대로 정의', async () => {
    const { play } = await load({ unlock: false });
    expect(Object.keys(play.CONTROL_CUES)).toEqual(['SFX-01', 'SFX-02', 'SFX-03', 'SFX-04', 'SFX-05', 'SFX-06', 'SFX-07', 'SFX-08', 'SFX-09']);
    expect(play.resolveControlCue('SFX-01')).toMatchObject({ db: -18, durationMs: 60, notes: ['G5'] });
    expect(play.resolveControlCue('SFX-04')).toMatchObject({ db: -8, durationMs: 180 });
    expect(play.resolveControlCue('SFX-10')).toBeNull();
  });
  it('SFX-07 줄 수마다 다른 음·길이', async () => {
    const { play } = await load({ unlock: false });
    expect(play.resolveControlCue('SFX-07', { lines: 1 })).toMatchObject({ notes: ['C5'], durationMs: 300 });
    expect(play.resolveControlCue('SFX-07', { lines: 2 })).toMatchObject({ notes: ['C5', 'E5'], durationMs: 350 });
    expect(play.resolveControlCue('SFX-07', { lines: 3 })).toMatchObject({ notes: ['C5', 'E5', 'G5'], durationMs: 400 });
    expect(play.resolveControlCue('SFX-07', { lines: 4 })).toMatchObject({ notes: ['C5', 'E5', 'G5', 'C6'], durationMs: 700 });
    expect(play.resolveControlCue('SFX-07', { lines: 9 }).notes).toHaveLength(4);
  });
  it('SFX-08 콤보 상승음: D5에서 콤보마다 +1반음, 상한 +12', async () => {
    const { play } = await load({ unlock: false });
    const note = (combo) => play.resolveControlCue('SFX-08', { combo }).notes[0];
    expect(note(1)).toBe('D5');
    expect(note(2)).toBe('D#5');
    expect(note(5)).toBe('F#5');
    expect(note(13)).toBe('D6');
    expect(note(40)).toBe('D6');
    expect(play.resolveControlCue('SFX-08').notes[0]).toBe('D5');
  });
  it('SFX-09 T-Spin A5, B2B 변주 +5반음', async () => {
    const { play } = await load({ unlock: false });
    expect(play.resolveControlCue('SFX-09').notes).toEqual(['A5']);
    expect(play.resolveControlCue('SFX-09', { semitones: 5 }).notes).toEqual(['D6']);
  });
  it('재생: 효과음 버스에 연결된 음색으로 트리거, 해제 전에는 무음 false', async () => {
    const pre = await load({ unlock: false });
    expect(pre.play.playControlSfx('SFX-01')).toBe(false);
    const { play, fake } = await load();
    for (const id of Object.keys(play.CONTROL_CUES)) expect(play.playControlSfx(id, { lines: 4, combo: 3 })).toBe(true);
    expect(play.playControlSfx('SFX-99')).toBe(false);
    const sfxBus = fake.byKind('Volume')[1];
    const move = fake.byKind('Synth').find((s) => s.triggers.some((t) => t[1] === 'G5'));
    expect(move.connections).toEqual([sfxBus]);
    expect(move.volume.value).toBe(-18);
  });
  it('SFX-03 소프트 드롭 최소 간격 50ms', async () => {
    const { play, fake } = await load();
    expect(play.playControlSfx('SFX-03')).toBe(true);
    fake.state.now += 0.03;
    expect(play.playControlSfx('SFX-03')).toBe(false);
    fake.state.now += 0.03;
    expect(play.playControlSfx('SFX-03')).toBe(true);
  });
});

describe('전투 효과음 SFX-10~17 (FR-058)', () => {
  it('8종 큐 정의, 17종 전체 id가 겹치지 않음', async () => {
    const { play, battle } = await load({ unlock: false });
    const ids = [...Object.keys(play.CONTROL_CUES), ...Object.keys(battle.BATTLE_CUES)];
    expect(ids).toHaveLength(17);
    expect(new Set(ids).size).toBe(17);
    expect(battle.resolveBattleCue('SFX-11')).toMatchObject({ db: -6, durationMs: 300 });
    expect(battle.resolveBattleCue('SFX-01')).toBeNull();
  });
  it('SFX-10 상쇄 변주 −7반음 (C4→C6 글라이드도 함께)', async () => {
    const { battle } = await load({ unlock: false });
    const e = battle.resolveBattleCue('SFX-10', { semitones: -7 }).events[0];
    expect(e.notes).toEqual(['F3']);
    expect(e.glideTo).toBe('F5');
  });
  it('SFX-12 드론 유지: 영 지속 ≤6000ms 그대로, 봉인 21초·즉시형은 3000ms + 1s 페이드', async () => {
    const { battle } = await load({ unlock: false });
    expect(battle.droneHoldMs(5000)).toBe(5000);
    expect(battle.droneHoldMs(6000)).toBe(6000);
    expect(battle.droneHoldMs(21000)).toBe(3000);
    expect(battle.droneHoldMs(0)).toBe(3000);
    expect(battle.resolveBattleCue('SFX-12', { durationMs: 4000 }).durationMs).toBe(5000);
  });
  it('SFX-13 예수님 4000ms 유지, SFX-14 갑주 획득 50%·400ms, 방어 −5반음', async () => {
    const { battle } = await load({ unlock: false });
    expect(battle.resolveBattleCue('SFX-13', { durationMs: 4000 }).events[0].ms).toBe(4000);
    const pickup = battle.resolveBattleCue('SFX-14', { volumeScale: 0.5, durationMs: 400 });
    expect(pickup.db).toBeCloseTo(-18.0206, 3);
    expect(pickup.events.every((e) => e.ms <= 400)).toBe(true);
    expect(battle.resolveBattleCue('SFX-14', { semitones: -5 }).events[0].notes).toEqual(['D3', 'A3', 'D4', 'F#4']);
  });
  it('SFX-15 카운트다운 3틱 + A5, 첫 틱만(100ms)', async () => {
    const { battle } = await load({ unlock: false });
    const full = battle.resolveBattleCue('SFX-15');
    expect(full.events.map((e) => [e.notes[0], e.at])).toEqual([['A4', 0], ['A4', 1000], ['A4', 2000], ['A5', 3000]]);
    expect(full.durationMs).toBe(3300);
    expect(battle.resolveBattleCue('SFX-15', { durationMs: 100 }).events).toHaveLength(1);
  });
  it('SFX-16 팡파르 4음 + 화음, 첫 2음(500ms)·첫 소절(1200ms) 절단', async () => {
    const { battle } = await load({ unlock: false });
    expect(battle.resolveBattleCue('SFX-16').events.map((e) => e.notes.join())).toEqual(['C5', 'E5', 'G5', 'C6', 'C5,E5,G5,C6']);
    expect(battle.resolveBattleCue('SFX-16', { durationMs: 500 }).events).toHaveLength(2);
    expect(battle.resolveBattleCue('SFX-16', { durationMs: 1200 }).events).toHaveLength(5);
  });
  it('SFX-17 패배 E4·D4·C4·A3, 2200ms 안', async () => {
    const { battle } = await load({ unlock: false });
    const cue = battle.resolveBattleCue('SFX-17');
    expect(cue.events.map((e) => e.notes[0])).toEqual(['E4', 'D4', 'C4', 'A3']);
    const last = cue.events[3];
    expect(last.at + last.ms).toBeCloseTo(2200, 6);
  });
  it('재생: 8종 모두 true, SFX-12 드론은 재생 뒤 폐기', async () => {
    const { battle, fake } = await load();
    vi.useFakeTimers();
    for (const id of Object.keys(battle.BATTLE_CUES)) expect(battle.playBattleSfx(id)).toBe(true);
    const osc = fake.byKind('FatOscillator')[0];
    expect(osc.args[0]).toMatchObject({ frequency: 'A1', type: 'sawtooth', count: 3 });
    vi.advanceTimersByTime(4300);
    expect(osc.disposed).toBe(true);
  });
  it('음색 오류는 잡아서 false + 로그 1회 (게임 진행 계속)', async () => {
    const { battle, fake } = await load();
    const synths = fake.byKind('PolySynth');
    for (const s of synths) s.triggerAttackRelease = () => { throw new Error('boom'); };
    expect(battle.playBattleSfx('SFX-13')).toBe(false);
    expect(battle.playBattleSfx('SFX-13')).toBe(false);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
