// TASK-021-6 · FR-075 · FR-039 · C-002 · FR-044~047 · FR-036 · R-09 — 예수님 이벤트 1회 조건과 특수 칸 위조 거부(C-SPECIAL) 검사.
import { describe, expect, it } from 'vitest';
import { buildJesusAction, countGarbageRows, jesusClearedCategories, shouldTriggerJesus } from '../../../worker/src/room/jesus-event.ts';
import { createSpecialsLedger, rollFor, stageForRoundsPlayed, verifySpecial, wordIndicesUpTo } from '../../../worker/src/room/specials.ts';
import { ARMOR_IDS } from '../../../client/js/net/protocol.js';
import { balance } from '../../../worker/src/content.ts';

const EMPTY_ROW = '0000000000';
const GARBAGE_ROW = '8888088888';
const board = (rows: string[]): string => rows.join('');
const DANGER = board(['0001000000', ...Array(14).fill(EMPTY_ROW), ...Array(5).fill(GARBAGE_ROW)]);
const SAFE = board([...Array(15).fill(EMPTY_ROW), ...Array(5).fill(GARBAGE_ROW)]);

describe('예수님 이벤트 (FR-039, C-002)', () => {
  it('게이지 100 + 위험선 진입 + 대전 + 경기당 1회일 때만', () => {
    expect(shouldTriggerJesus({ mode: 'random', faith: 100, jesusUsed: false, board: DANGER })).toBe(true);
    expect(shouldTriggerJesus({ mode: 'bot', faith: 100, jesusUsed: false, board: DANGER })).toBe(true);
    expect(shouldTriggerJesus({ mode: 'random', faith: 99, jesusUsed: false, board: DANGER })).toBe(false);
    expect(shouldTriggerJesus({ mode: 'random', faith: 100, jesusUsed: false, board: SAFE })).toBe(false);
    expect(shouldTriggerJesus({ mode: 'random', faith: 100, jesusUsed: true, board: DANGER })).toBe(false);
    expect(shouldTriggerJesus({ mode: 'practice', faith: 100, jesusUsed: false, board: DANGER })).toBe(false);
    expect(shouldTriggerJesus({ mode: 'random', faith: 100, jesusUsed: false, board: null })).toBe(false);
  });

  it('쓰레기 줄 절반(내림) 제거 + 저주·암전 해제 지시 (봉인 제외)', () => {
    expect(countGarbageRows(DANGER)).toBe(5);
    expect(buildJesusAction(DANGER)).toEqual({ type: 'overcome', clearCurses: true, clearVision: true, removeGarbageRows: 2 });
    expect(jesusClearedCategories()).toEqual(['vision', 'deception', 'control', 'speed', 'board']);
  });
});

describe('해금 단계 (FR-047)', () => {
  it('다음 라운드 1~3 → 0단계, 4 → 1단계, 5 이상 → 2단계', () => {
    expect([0, 1, 2, 3, 4, 50].map((n) => stageForRoundsPlayed(n))).toEqual([0, 0, 0, 1, 2, 2]);
  });
});

describe('특수 칸 서버 검증 (devguide §7.3 C-SPECIAL, R-09)', () => {
  const SEED = 2718281828;
  const cfg = balance.specials;

  it('말씀 칸 위치는 시드만으로 정해지고 간격은 7~12', () => {
    const a = wordIndicesUpTo(createSpecialsLedger(SEED, 'random', 1), 200);
    const b = wordIndicesUpTo(createSpecialsLedger(SEED, 'random', 2), 200);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(10);
    expect(a[0]).toBeGreaterThanOrEqual(cfg.word.minGap);
    for (let i = 1; i < a.length; i += 1) {
      expect(a[i] - a[i - 1]).toBeGreaterThanOrEqual(cfg.word.minGap);
      expect(a[i] - a[i - 1]).toBeLessThanOrEqual(cfg.word.maxGap);
    }
    expect(wordIndicesUpTo(createSpecialsLedger(SEED, 'practice', 2), 200)).toEqual([]);
    expect(wordIndicesUpTo(createSpecialsLedger(SEED, 'random', 0), 200)).toEqual([]);
  });

  it('말씀 칸: 수열의 n만 인정, 같은 pieceIndex 2회 금지, 수열의 n에 다른 종류 주장 거부', () => {
    const l = createSpecialsLedger(SEED, 'random', 2);
    const [w] = wordIndicesUpTo(l, 100);
    expect(verifySpecial(l, { kind: 'jericho', pieceIndex: w })).toEqual({ ok: false, reason: 'wordSlot' });
    expect(verifySpecial(l, { kind: 'word', pieceIndex: w })).toEqual({ ok: true, kind: 'word' });
    expect(verifySpecial(l, { kind: 'word', pieceIndex: w })).toEqual({ ok: false, reason: 'duplicate' });
    expect(verifySpecial(l, { kind: 'word', pieceIndex: w + 1 })).toEqual({ ok: false, reason: 'word' });
  });

  it('여리고·만나: 2단계에서 굴림값이 최대 확률 이하일 때만', () => {
    const l = createSpecialsLedger(SEED, 'random', 2);
    const words = new Set(wordIndicesUpTo(l, 2000));
    let low = -1;
    let high = -1;
    for (let n = 0; n < 2000 && (low < 0 || high < 0); n += 1) {
      if (words.has(n)) continue;
      const u1 = rollFor(l, n);
      if (low < 0 && u1 < cfg.jericho.max) low = n;
      if (high < 0 && u1 >= cfg.jericho.max + cfg.manna.dangerChance + cfg.armor.chance) high = n;
    }
    expect(verifySpecial(l, { kind: 'jericho', pieceIndex: high })).toEqual({ ok: false, reason: 'jericho' });
    expect(verifySpecial(l, { kind: 'manna', pieceIndex: high })).toEqual({ ok: false, reason: 'manna' });
    expect(verifySpecial(l, { kind: 'jericho', pieceIndex: low })).toEqual({ ok: true, kind: 'jericho' });
    const stage1 = createSpecialsLedger(SEED, 'random', 1);
    const n1 = [...Array(2000).keys()].find((n) => !wordIndicesUpTo(stage1, n).includes(n) && rollFor(stage1, n) < cfg.jericho.max)!;
    expect(verifySpecial(stage1, { kind: 'jericho', pieceIndex: n1 }).ok).toBe(false);
  });

  it('갑주 칸: 대전 전용, 굴림값 상한·종류 일치 검사 (0단계: u1 < 4% → ARMOR_IDS[floor(u1/0.04×6)])', () => {
    const l = createSpecialsLedger(SEED, 'random', 0);
    const n = [...Array(5000).keys()].find((i) => rollFor(l, i) < cfg.armor.chance)!;
    const u1 = rollFor(l, n);
    const expected = ARMOR_IDS[Math.floor((u1 / cfg.armor.chance) * ARMOR_IDS.length)];
    const wrong = ARMOR_IDS.find((id: string) => id !== expected);
    expect(verifySpecial(l, { kind: 'armor', pieceIndex: n, armorId: wrong })).toEqual({ ok: false, reason: 'armor' });
    expect(verifySpecial(l, { kind: 'armor', pieceIndex: n, armorId: expected })).toEqual({ ok: true, kind: 'armor', armorId: expected });
    const practice = createSpecialsLedger(SEED, 'practice', 0);
    expect(verifySpecial(practice, { kind: 'armor', pieceIndex: n, armorId: expected }).ok).toBe(false);
    const m = [...Array(5000).keys()].find((i) => rollFor(l, i) >= cfg.armor.chance)!;
    expect(verifySpecial(l, { kind: 'armor', pieceIndex: m, armorId: expected }).ok).toBe(false);
  });

  it('알 수 없는 종류·음수 인덱스 거부', () => {
    const l = createSpecialsLedger(SEED, 'random', 2);
    expect(verifySpecial(l, { kind: 'gold', pieceIndex: 3 }).ok).toBe(false);
    expect(verifySpecial(l, { kind: 'jericho', pieceIndex: -1 }).ok).toBe(false);
  });
});
