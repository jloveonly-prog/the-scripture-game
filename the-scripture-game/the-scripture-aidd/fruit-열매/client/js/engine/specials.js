// specials.js — 특수·갑주 칸 결정론적 배정 + 종류별 최대 확률 함수만 (서버 재계산 공용)
// TASK-010-3 | REQ-009 REQ-012 FR-036 FR-044 FR-045 FR-046 FR-047 C-001 | ARCH-002 | D-09 | architecture §9.3
// TBL-018 `specials`·`armor` | CODE-013 (word · jericho · manna · armor)
// (시드, 조각 번호, 해금 단계, 콤보, 위기) → 특수 칸 종류·칸 위치. 같은 시드 → 두 플레이어의 말씀·갑주 칸이 같은 조각에 나온다.
// 서버(worker/src/room/specials.ts)는 이 파일의 같은 함수로 clear.specials를 재계산 검증한다.
// 조각 번호(pieceIndex)는 1부터 — API-013 pieceCount("이 삭제를 만든 블록 번호")와 같은 셈.
// 순수 모듈 (D-12): 갑주 id 목록·rules는 인자로 받는다.
import { STREAM, rollAt } from "./rng.js";

/** 같은 조각 안의 굴림 번호 — 종류마다 독립 굴림 (D-09 "독립 PRNG 스트림") */
const ROLL = Object.freeze({ JERICHO: 0, MANNA: 1, ARMOR: 2, CELL: 3, ARMOR_PICK: 4, WORD_INTERVAL: 5 });

/**
 * @typedef {{ word: boolean, jericho: boolean, manna: boolean }} Stage API-019 `start.stage`
 * @typedef {{ wordIntervalMin: number, wordIntervalMax: number,
 *   jericho: { base: number, perCombo: number, max: number, radius: number },
 *   manna: { base: number, crisis: number, max: number }, priority: string[] }} SpecialsRules rules.specials
 * @typedef {{ spawnChancePerPiece: number }} ArmorRules rules.armor
 * @typedef {{ kind: string, cellIndex: number, armorId?: string }} SpecialAssignment
 */

/**
 * 조각별 굴림값 (콤보·위기와 무관 — 서버 상한 검증의 원천).
 * @param {number} seed @param {number} pieceIndex
 * @returns {{ jericho: number, manna: number, armor: number, cell: number, armorPick: number }}
 */
export function rollsFor(seed, pieceIndex) {
  return {
    jericho: rollAt(seed, STREAM.SPECIALS, pieceIndex, ROLL.JERICHO),
    manna: rollAt(seed, STREAM.SPECIALS, pieceIndex, ROLL.MANNA),
    armor: rollAt(seed, STREAM.SPECIALS, pieceIndex, ROLL.ARMOR),
    cell: rollAt(seed, STREAM.SPECIALS, pieceIndex, ROLL.CELL),
    armorPick: rollAt(seed, STREAM.SPECIALS, pieceIndex, ROLL.ARMOR_PICK),
  };
}

/**
 * 말씀 블록 조각인가 (FR-044 "블록 7~12개마다 무작위로 1개" — 간격 [min, max] 정수를 시드로 연속 굴림).
 * @param {number} seed @param {number} pieceIndex 1부터 @param {SpecialsRules} specials
 * @returns {boolean}
 */
export function isWordPiece(seed, pieceIndex, specials) {
  const span = specials.wordIntervalMax - specials.wordIntervalMin + 1;
  let at = 0;
  for (let k = 0; at < pieceIndex; k += 1) {
    at += specials.wordIntervalMin + Math.floor(rollAt(seed, STREAM.SPECIALS, k, ROLL.WORD_INTERVAL) * span);
  }
  return at === pieceIndex;
}

/**
 * 여리고 나팔 확률 (FR-045 "낮은 확률(콤보 중 확률 상승)") — base + perCombo × 콤보, 상한 max.
 * @param {number} combo 현재 콤보 (−1 = 없음, 0 = 첫 삭제)
 * @param {SpecialsRules} specials
 * @returns {number}
 */
export function jerichoChance(combo, specials) {
  return Math.min(specials.jericho.max, specials.jericho.base + specials.jericho.perCombo * Math.max(0, combo));
}

/**
 * 만나 확률 (FR-046 "위기 상황일수록 확률 상승" — 위기 = 위험선 진입, rules.specials.manna).
 * @param {boolean} crisis @param {SpecialsRules} specials
 * @returns {number}
 */
export function mannaChance(crisis, specials) {
  return Math.min(specials.manna.max, crisis ? specials.manna.crisis : specials.manna.base);
}

/**
 * 종류별 최대 확률 — 서버는 클라이언트 상태(콤보·위기)를 모르므로 굴림값 ≤ 최대 확률이면 인정 (architecture §9.3).
 * @param {string} kind CODE-013 @param {SpecialsRules} specials @param {ArmorRules} armor
 * @returns {number}
 */
export function maxChance(kind, specials, armor) {
  if (kind === "jericho") return specials.jericho.max;
  if (kind === "manna") return specials.manna.max;
  if (kind === "armor") return armor.spawnChancePerPiece;
  return 0;
}

/**
 * 갑주 칸이면 갑주 id (FR-036 무작위 출현 — 시드 굴림이므로 두 플레이어 같은 조각·같은 갑주).
 * @param {number} seed @param {number} pieceIndex @param {readonly string[]} armorIds armor.json id 순서
 * @returns {string}
 */
export function armorIdFor(seed, pieceIndex, armorIds) {
  return armorIds[Math.floor(rollsFor(seed, pieceIndex).armorPick * armorIds.length)];
}

/**
 * 조각 1개의 특수 칸 배정 (한 조각에 특수 칸 최대 1개 — rules.specials.priority 순서).
 * - 말씀: 해금(stage.word)·대전에서만 (UC-014 1c 연습 없음, FR-040 "대전(사람·봇) 전용")
 * - 여리고·만나: 해금 단계에 따라 (FR-047)
 * - 갑주: 대전만 (rules.armor.spawnChancePerPiece, OQ #4)
 * @param {{ seed: number, pieceIndex: number, stage: Stage, versus: boolean, combo: number, crisis: boolean,
 *   specials: SpecialsRules, armor: ArmorRules, armorIds: readonly string[] }} input
 * @returns {SpecialAssignment | null}
 */
export function assignSpecial(input) {
  const { seed, pieceIndex, stage, versus, combo, crisis, specials, armor, armorIds } = input;
  const rolls = rollsFor(seed, pieceIndex);
  const cellIndex = Math.floor(rolls.cell * 4);
  for (const kind of specials.priority) {
    if (kind === "word" && stage.word && versus && isWordPiece(seed, pieceIndex, specials)) return { kind, cellIndex };
    if (kind === "jericho" && stage.jericho && rolls.jericho < jerichoChance(combo, specials)) return { kind,
      cellIndex };
    if (kind === "manna" && stage.manna && rolls.manna < mannaChance(crisis, specials)) return { kind, cellIndex };
    if (kind === "armor" && versus && armorIds.length > 0 && rolls.armor < armor.spawnChancePerPiece) {
      return { kind, cellIndex, armorId: armorIdFor(seed, pieceIndex, armorIds) };
    }
  }
  return null;
}
