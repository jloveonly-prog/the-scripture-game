// TASK-021-5 · FR-036 · FR-044 · FR-045 · FR-046 · FR-047 · R-09 · D-14 · D4-08 — 특수·갑주 칸 서버 검증 (devguide §7.3 C-SPECIAL).
// 단일 책임: 라운드 시드로 블록별 굴림(u1·u2)과 말씀 칸 수열을 재계산하고, clear.specials[] 주장을 상한 검사로 인정/거부한다.
import { ARMOR_IDS } from '../../../client/js/net/protocol.js';
import { deriveSeed, mulberry32 } from '../../../client/js/engine/rng.js';
import { balance } from '../content';
import type { RoomMode } from '../env';

type SpecialsCfg = typeof balance.specials;

export interface SpecialClaim { kind: string; pieceIndex: number; armorId?: string }
export type SpecialVerdict = { ok: true; kind: 'word' | 'jericho' | 'manna' | 'armor'; armorId?: string } | { ok: false; reason: string };

export interface SpecialsLedger {
  mode: RoomMode;
  stage: 0 | 1 | 2;
  rand: () => number;
  /** n → u1 (u2는 칸 위치라 서버 검증에 쓰지 않지만 스트림 정렬을 위해 소비한다) */
  u1: number[];
  wordAt: Set<number>;
  nextWordAt: number | null;
  accepted: Set<number>;
}

const wordEnabled = (l: SpecialsLedger): boolean => l.mode !== 'practice' && l.stage >= 1;
const armorEnabled = (l: SpecialsLedger, cfg: SpecialsCfg): boolean => !(cfg.armor.battleOnly && l.mode === 'practice');

// FR-047 다음 라운드 번호(roundsPlayed + 1) → 해금 단계 (CODE-012)
export function stageForRoundsPlayed(roundsPlayed: number, cfg: SpecialsCfg = balance.specials): 0 | 1 | 2 {
  const next = roundsPlayed + 1;
  const row = cfg.stageByNextRound.find((r) => next >= r.fromRound && (r.toRound === null || next <= r.toRound));
  return (row?.stage ?? 0) as 0 | 1 | 2;
}

// FR-044~047 라운드 시작 시 장부 생성 (스트림은 라운드마다 새로 — §7.3)
export function createSpecialsLedger(seed: number, mode: RoomMode, stage: 0 | 1 | 2, cfg: SpecialsCfg = balance.specials): SpecialsLedger {
  return { mode, stage, rand: mulberry32(deriveSeed(seed, cfg.seedXor)), u1: [], wordAt: new Set(), nextWordAt: null, accepted: new Set() };
}

function wordGap(u1: number, cfg: SpecialsCfg): number {
  return cfg.word.minGap + Math.floor(u1 * (cfg.word.maxGap - cfg.word.minGap + 1));
}

/** n번 블록까지 굴림을 채운다 (블록마다 항상 rollsPerPiece = 2회 소비 — D-14) */
function rollUpTo(l: SpecialsLedger, n: number, cfg: SpecialsCfg): void {
  while (l.u1.length <= n) {
    const index = l.u1.length;
    const rolls: number[] = [];
    for (let i = 0; i < cfg.rollsPerPiece; i += 1) rolls.push(l.rand());
    const u1 = rolls[0];
    l.u1.push(u1);
    if (!wordEnabled(l)) continue;
    if (l.nextWordAt === null) l.nextWordAt = index + wordGap(u1, cfg);
    if (index === l.nextWordAt) {
      l.wordAt.add(index);
      l.nextWordAt = index + wordGap(u1, cfg);
    }
  }
}

/** 갑주 종류 후보: 가능한 (pJ, pM) 조합마다 u1이 갑주 구간에 들면 ARMOR_IDS[floor((u1 − pJ − pM) / pA × 6)] */
function possibleArmorIds(u1: number, stage: number, cfg: SpecialsCfg): Set<string> {
  const pJs = [0];
  const pMs = [0];
  if (stage >= 2) {
    pJs.length = 0;
    for (let k = 0; k <= cfg.jericho.comboCap; k += 1) pJs.push(Math.min(cfg.jericho.base + cfg.jericho.perCombo * k, cfg.jericho.max));
    pMs.length = 0;
    pMs.push(cfg.manna.lowChance, cfg.manna.highChance, cfg.manna.dangerChance);
  }
  const pA = cfg.armor.chance;
  const ids = new Set<string>();
  for (const pJ of pJs) {
    for (const pM of pMs) {
      if (u1 < pJ + pM || u1 >= pJ + pM + pA) continue;
      const index = Math.floor(((u1 - pJ - pM) / pA) * ARMOR_IDS.length);
      ids.add(ARMOR_IDS[Math.min(index, ARMOR_IDS.length - 1)]);
    }
  }
  return ids;
}

// FR-044~046·FR-036 R-09 특수 칸 1개 검증 → 인정하면 같은 pieceIndex 재인정 금지
export function verifySpecial(l: SpecialsLedger, claim: SpecialClaim, cfg: SpecialsCfg = balance.specials): SpecialVerdict {
  const n = claim.pieceIndex;
  if (!Number.isInteger(n) || n < 0) return { ok: false, reason: 'index' };
  if (l.accepted.has(n)) return { ok: false, reason: 'duplicate' };
  rollUpTo(l, n, cfg);
  const u1 = l.u1[n];
  const isWord = l.wordAt.has(n);
  let verdict: SpecialVerdict;
  if (claim.kind === 'word') {
    verdict = isWord ? { ok: true, kind: 'word' } : { ok: false, reason: 'word' };
  } else if (isWord) {
    verdict = { ok: false, reason: 'wordSlot' };
  } else if (claim.kind === 'jericho') {
    verdict = l.stage >= 2 && u1 < cfg.jericho.max ? { ok: true, kind: 'jericho' } : { ok: false, reason: 'jericho' };
  } else if (claim.kind === 'manna') {
    verdict = l.stage >= 2 && u1 < cfg.jericho.max + cfg.manna.dangerChance ? { ok: true, kind: 'manna' } : { ok: false, reason: 'manna' };
  } else if (claim.kind === 'armor') {
    const limit = (l.stage >= 2 ? cfg.jericho.max + cfg.manna.dangerChance : 0) + cfg.armor.chance;
    const ok = armorEnabled(l, cfg) && u1 < limit && typeof claim.armorId === 'string' && possibleArmorIds(u1, l.stage, cfg).has(claim.armorId);
    verdict = ok ? { ok: true, kind: 'armor', armorId: claim.armorId } : { ok: false, reason: 'armor' };
  } else {
    verdict = { ok: false, reason: 'kind' };
  }
  if (verdict.ok) l.accepted.add(n);
  return verdict;
}

/** 테스트·디버그용: n번까지의 말씀 칸 위치 (시드만으로 결정 — §7.3) */
export function wordIndicesUpTo(l: SpecialsLedger, n: number, cfg: SpecialsCfg = balance.specials): number[] {
  rollUpTo(l, n, cfg);
  return [...l.wordAt].filter((i) => i <= n).sort((a, b) => a - b);
}

/** 테스트용: n번 블록의 u1 */
export function rollFor(l: SpecialsLedger, n: number, cfg: SpecialsCfg = balance.specials): number {
  rollUpTo(l, n, cfg);
  return l.u1[n];
}
