// TASK-041-4 · FR-061 · FR-052 · FR-075 · NFR-006 — EVT-19 동시 피드백 병합(최대 HS·SH 1회·소리 4음)·사건→큐 맵·emitFx 반환값·글자 쌓기 순서.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { planFx, emitFx, setAudioPort, FEEDBACK } from '../../../client/js/fx/feedback-sync.js';
import { SH } from '../../../client/js/fx/screen-shake.js';
import { resetIntensity } from '../../../client/js/fx/fx-intensity.js';
import { sortStack, comboStyle, tspinLabel } from '../../../client/js/fx/text-pop.js';
import { arrowCount, quadPoint, arrowPath } from '../../../client/js/fx/projectiles.js';
import { confettiBursts } from '../../../client/js/fx/victory-fx.js';
import { createFilterBudget, FILTER_PRESETS } from '../../../client/js/fx/filters.js';

function fakeAudio() {
  return {
    playControlSfx: vi.fn(), playBattleSfx: vi.fn(), setComboLevel: vi.fn(), setDanger: vi.fn(), setBgmState: vi.fn(),
    duckMusic: vi.fn(() => vi.fn()), muteSfxBusFor: vi.fn(),
  };
}

beforeEach(() => resetIntensity());

describe('planFx — EVT-19 동시 피드백 규칙', () => {
  it('B2B 테트리스 + 콤보 3: 가장 긴 히트스톱 1회(90ms), 가장 큰 흔들림 1회(SH-5)', () => {
    const plan = planFx([{ evt: 'EVT-12', rows: [16, 17, 18, 19], lines: 4 }, { evt: 'EVT-13', combo: 3, lines: 4 }, { evt: 'EVT-15' }]);
    expect(plan.hitstopMs).toBe(90);
    expect(plan.shake).toBe(SH.SH5);
  });

  it('히트스톱은 합산하지 않는다 — T-Spin(70) + 콤보 6(100) = 100', () => {
    expect(planFx([{ evt: 'EVT-14', lines: 2 }, { evt: 'EVT-13', combo: 6, lines: 2 }]).hitstopMs).toBe(100);
    expect(planFx([{ evt: 'EVT-14', lines: 1 }]).hitstopMs).toBe(70);
    expect(planFx([{ evt: 'EVT-12', lines: 4 }]).hitstopMs).toBe(80);
  });

  it('같은 큐는 1번만, 변주 옵션은 병합 (SFX-07 줄 삭제음 + SFX-09 B2B +5반음)', () => {
    const plan = planFx([{ evt: 'EVT-11', rows: [17, 18, 19], lines: 3 }, { evt: 'EVT-13', combo: 2, lines: 3 }, { evt: 'EVT-14', lines: 3 }, { evt: 'EVT-15' }]);
    const ids = plan.sounds.map((s) => s.id);
    expect(ids.filter((id) => id === 'SFX-07')).toHaveLength(1);
    expect(plan.sounds.find((s) => s.id === 'SFX-07').opts.lines).toBe(3);
    expect(plan.sounds.find((s) => s.id === 'SFX-09').opts.semitones).toBe(5);
    expect(plan.sounds.find((s) => s.id === 'SFX-08').opts).toMatchObject({ combo: 2, semitones: 1 });
  });

  it('소리는 동시 최대 4음', () => {
    const plan = planFx([{ evt: 'EVT-05', distance: 10 }, { evt: 'EVT-06', cells: [] }, { evt: 'EVT-12', lines: 4 }, { evt: 'EVT-13', combo: 1, lines: 4 },
      { evt: 'EVT-14', lines: 1 }, { evt: 'EVT-20', garbage: 4 }]);
    expect(plan.sounds.length).toBeLessThanOrEqual(FEEDBACK.maxSounds);
  });

  it('줄 수별 흔들림 — 1줄 없음 · 2줄 SH-1 · 3줄 SH-2 · 하드 드롭 SH-2', () => {
    expect(planFx([{ evt: 'EVT-09', lines: 1 }]).shake).toBeNull();
    expect(planFx([{ evt: 'EVT-10', lines: 2 }]).shake).toBe(SH.SH1);
    expect(planFx([{ evt: 'EVT-11', lines: 3 }]).shake).toBe(SH.SH2);
    expect(planFx([{ evt: 'EVT-05', distance: 3 }]).shake).toBe(SH.SH2);
  });

  it('공격 받음(EVT-21)은 착탄 순간으로 미룬다 — SFX-11 + SH-HIT(6+줄, 상한 12), 0줄이면 없음', () => {
    const plan = planFx([{ evt: 'EVT-21', garbage: 4, fromSlot: 2 }]);
    expect(plan.sounds).toHaveLength(0);
    expect(plan.deferred).toEqual([{ evt: 'EVT-21', sfx: [{ id: 'SFX-11', opts: {} }], sh: { amp: 10, durationMs: 250 } }]);
    expect(planFx([{ evt: 'EVT-21', garbage: 0 }]).deferred).toHaveLength(0);
  });

  it('영 등장: 드론 길이(지속형 ≤6000 그대로, 봉인·즉시형 3000) + 귀먹은 귀신은 내 보드일 때 효과음 버스 음소거', () => {
    expect(planFx([{ evt: 'EVT-27', spiritId: 'jezebel', target: 'me', durationMs: 6000 }]).sounds[0].opts.durationMs).toBe(6000);
    expect(planFx([{ evt: 'EVT-27', spiritId: 'prince_of_persia', target: 'me', durationMs: 21000 }]).sounds[0].opts.durationMs).toBe(3000);
    expect(planFx([{ evt: 'EVT-27', spiritId: 'abaddon', target: 'me', durationMs: 0 }]).sounds[0].opts.durationMs).toBe(3000);
    expect(planFx([{ evt: 'EVT-27', spiritId: 'deaf_dumb_spirit', target: 'me', durationMs: 5000 }]).muteMs).toBe(5000);
    expect(planFx([{ evt: 'EVT-27', spiritId: 'deaf_dumb_spirit', target: 'opponent', durationMs: 5000 }]).muteMs).toBe(0);
  });

  it('스킬: 위인 SFX-14 / 천사 SFX-13, 맞는 쪽만 흔들림(다윗 SH-3, 바울 SH-6)', () => {
    expect(planFx([{ evt: 'EVT-29', kind: 'angel', id: 'angel_michael', target: 'me' }]).sounds[0].id).toBe('SFX-13');
    expect(planFx([{ evt: 'EVT-29', kind: 'hero', id: 'hero_david', target: 'me' }]).shake).toBe(SH.SH3);
    expect(planFx([{ evt: 'EVT-29', kind: 'hero', id: 'hero_david', target: 'opponent' }]).shake).toBeNull();
    expect(planFx([{ evt: 'EVT-29', kind: 'hero', id: 'paul', target: 'me' }]).shake).toBe(SH.SH6);
  });

  it('예수님: SFX-13 4000ms 유지 + BGM −9dB, 흔들림·히트스톱 없음', () => {
    const plan = planFx([{ evt: 'EVT-32', target: 'me' }]);
    expect(plan.hitstopMs).toBe(0);
    expect(plan.shake).toBeNull();
    expect(plan.sounds).toEqual([{ id: 'SFX-13', opts: { durationMs: 4000 } }]);
    expect(plan.bgm).toEqual([['duck', -9, 4000]]);
  });

  it('무연출 사건·잘못된 입력은 무시 (EVT-03·08·40, null, 문자열)', () => {
    const plan = planFx([{ evt: 'EVT-03' }, { evt: 'EVT-08' }, { evt: 'EVT-40' }, null, 'EVT-12', { evt: 12 }]);
    expect(plan).toMatchObject({ hitstopMs: 0, shake: null, sounds: [], bgm: [] });
    expect(planFx(undefined).events).toEqual([]);
  });

  it('BGM 제어: 콤보 고조 · 위기 레이어 · 말씀 대결 덕킹/해제 · 경기 종료', () => {
    expect(planFx([{ evt: 'EVT-13', combo: 4, lines: 1 }]).bgm).toEqual([['setComboLevel', 4]]);
    expect(planFx([{ evt: 'EVT-17', inDanger: true }]).bgm).toEqual([['setDanger', true]]);
    expect(planFx([{ evt: 'EVT-34', trigger: 'wordBlock' }]).bgm).toEqual([['duck', -6, null]]);
    expect(planFx([{ evt: 'EVT-37' }]).bgm).toEqual([['unduck']]);
    expect(planFx([{ evt: 'EVT-50' }]).bgm).toEqual([['matchEnd']]);
  });
});

describe('emitFx — 장면 없이도 안전, { hitstopMs } 반환, 오디오 포트 호출', () => {
  it('효과음 01~09는 playControlSfx, 10~17은 playBattleSfx', () => {
    const audio = fakeAudio();
    setAudioPort(audio);
    const out = emitFx([{ evt: 'EVT-12', rows: [16, 17, 18, 19], lines: 4 }, { evt: 'EVT-20', garbage: 4 }]);
    expect(out).toEqual({ hitstopMs: 80 });
    expect(audio.playControlSfx).toHaveBeenCalledWith('SFX-07', { lines: 4 });
    expect(audio.playBattleSfx).toHaveBeenCalledWith('SFX-10', {});
  });

  it('장면이 없으면 미룬 착탄 피드백을 즉시 낸다', () => {
    const audio = fakeAudio();
    setAudioPort(audio);
    emitFx([{ evt: 'EVT-21', garbage: 2, fromSlot: 2 }]);
    expect(audio.playBattleSfx).toHaveBeenCalledWith('SFX-11', {});
  });

  it('귀먹고 말 못하게 하는 귀신 → muteSfxBusFor(5000, 600)', () => {
    const audio = fakeAudio();
    setAudioPort(audio);
    emitFx([{ evt: 'EVT-27', spiritId: 'deaf_dumb_spirit', target: 'me', durationMs: 5000, params: {} }]);
    expect(audio.muteSfxBusFor).toHaveBeenCalledWith(5000, 600);
  });

  it('오디오 호출이 던져도 emitFx는 계속된다', () => {
    const audio = fakeAudio();
    audio.playControlSfx.mockImplementation(() => { throw new Error('no audio'); });
    setAudioPort(audio);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(emitFx([{ evt: 'EVT-14', lines: 1 }])).toEqual({ hitstopMs: 70 });
    expect(spy).toHaveBeenCalled();
  });

  it('소프트 드롭 소리는 최소 50ms 간격', () => {
    const audio = fakeAudio();
    setAudioPort(audio);
    emitFx([{ evt: 'EVT-04' }]);
    emitFx([{ evt: 'EVT-04' }]);
    expect(audio.playControlSfx.mock.calls.filter(([id]) => id === 'SFX-03').length).toBeLessThanOrEqual(1);
  });
});

describe('글자·투사체·콘페티·필터 예산 (순수 부분)', () => {
  it('글자 세로 쌓기: BACK-TO-BACK → TETRIS/T-SPIN → COMBO', () => {
    expect(sortStack([{ kind: 'combo' }, { kind: 'tetris' }, { kind: 'b2b' }]).map((i) => i.kind)).toEqual(['b2b', 'tetris', 'combo']);
  });

  it('COMBO ×n 규격 — 크기 32+6n(상한 72)·색 단계·떨림 0.5n(상한 4)', () => {
    expect(comboStyle(1)).toMatchObject({ sizePx: 38, color: '#F5F0E1', jitterPx: 0.5 });
    expect(comboStyle(3).color).toBe('#F2C14E');
    expect(comboStyle(5).color).toBe('#F27A45');
    expect(comboStyle(7)).toMatchObject({ sizePx: 72, color: '#FFFFFF', jitterPx: 3.5 });
    expect(comboStyle(12)).toMatchObject({ sizePx: 72, jitterPx: 4 });
    expect([tspinLabel(1), tspinLabel(2), tspinLabel(3)]).toEqual(['T-SPIN SINGLE', 'T-SPIN DOUBLE', 'T-SPIN TRIPLE']);
  });

  it('빛의 화살 수 = min(쓰레기, 6)', () => {
    expect([arrowCount(0), arrowCount(1), arrowCount(4), arrowCount(9)]).toEqual([0, 1, 4, 6]);
    const path = arrowPath({ x: 0, y: 100, width: 100, height: 200 }, { x: 300, y: 120, width: 60, height: 120 }, { x: 150, y: 100, width: 90, height: 200 });
    expect(quadPoint(path.p0, path.p1, path.p2, 0)).toEqual({ x: 50, y: 100 });
    expect(quadPoint(path.p0, path.p1, path.p2, 1)).toEqual({ x: 330, y: 120 });
    expect(path.p1.x).toBe(195);
  });

  it('경기 승리 콘페티 2회 — 160개, spread 90, 금·밝은 금·흰색, 두 번째 400ms 뒤 반대쪽', () => {
    const [a, b] = confettiBursts();
    expect(a.options).toMatchObject({ particleCount: 160, spread: 90, colors: ['#F4C430', '#FFE08A', '#FFFFFF'] });
    expect(b.delayMs).toBe(400);
    expect(a.options.origin.x).toBeLessThan(0.5);
    expect(b.options.origin.x).toBeGreaterThan(0.5);
  });

  it('동시 필터 = 화면 전체 2 + 국소 2, 반납 후 재사용', () => {
    const budget = createFilterBudget();
    expect([budget.acquire('screen'), budget.acquire('screen'), budget.acquire('screen')]).toEqual([true, true, false]);
    expect([budget.acquire('local'), budget.acquire('local'), budget.acquire('local')]).toEqual([true, true, false]);
    budget.release('screen');
    expect(budget.acquire('screen')).toBe(true);
    expect(FILTER_PRESETS.tetrisWave).toMatchObject({ amplitude: 40, wavelength: 160, speed: 900, radius: 600, brightness: 1.3, ms: 600 });
  });
});
