// TASK-010-4 · FR-036 · FR-044 · FR-045 · FR-046 · FR-047 · D-14 · D4-08 — C-SPECIAL 특수·갑주 칸 굴림 (devguide §7.3 그대로, 동형).
// 단일 책임: 라운드 시드 스트림에서 블록 n마다 굴림 2회(u1 종류, u2 위치)를 소비해 특수 칸 종류·위치를 정한다.
// 서버 room/specials.ts(에브라임)가 같은 수식으로 검증한다 — 수식을 바꾸면 양쪽이 어긋난다.
import { deriveSeed, mulberry32 } from './rng.js';
import { ARMOR_IDS, ARMOR_CELL_CODES, CELL } from '../net/protocol.js';

const CELLS_PER_PIECE = 4;

/** 특수 칸 종류 → 보드 셀 코드 (CODE-009) */
export function specialCellCode(kind, armorId = null) {
  if (kind === 'word') return CELL.WORD;
  if (kind === 'jericho') return CELL.JERICHO;
  if (kind === 'manna') return CELL.MANNA;
  if (kind === 'armor') {
    const i = ARMOR_IDS.indexOf(armorId);
    if (i >= 0) return ARMOR_CELL_CODES[i];
  }
  throw new RangeError(`specialCellCode: 알 수 없는 특수 칸 ${kind}`);
}

/** 보드 셀 코드 → 특수 칸 종류 (특수 칸이 아니면 null) */
export function specialFromCode(code) {
  if (code === CELL.WORD) return { kind: 'word' };
  if (code === CELL.JERICHO) return { kind: 'jericho' };
  if (code === CELL.MANNA) return { kind: 'manna' };
  const i = ARMOR_CELL_CODES.indexOf(code);
  return i >= 0 ? { kind: 'armor', armorId: ARMOR_IDS[i] } : null;
}

/**
 * FR-044~047 C-SPECIAL 굴림기 — 라운드마다 새로 만든다. roll()은 n = 0, 1, 2, … 순서로 블록마다 정확히 1번 부른다.
 * @param {{seed:number, mode:string, stage:0|1|2, specials:object}} opts specials = balance.json `specials`
 */
export function createSpecialRoller({ seed, mode, stage, specials }) {
  if (!specials || !specials.word || !specials.jericho || !specials.manna || !specials.armor) {
    throw new RangeError('createSpecialRoller: balance.specials가 필요합니다');
  }
  const rand = mulberry32(deriveSeed(seed, specials.seedXor));
  const battle = mode !== 'practice';
  const { minGap, maxGap } = specials.word;
  const gap = (u1) => minGap + Math.floor(u1 * (maxGap - minGap + 1));
  let expectedN = 0;
  let nextWordAt = null;

  return {
    // FR-044~047 블록 n 출현 순간의 굴림. 특수 칸이 없으면 null
    // combo = 그 순간 콤보(아니면 0), stackHeight·inDanger = 그 순간 고정 격자 (danger.js)
    roll({ n, combo = 0, stackHeight = 0, inDanger = false }) {
      if (n !== expectedN) throw new RangeError(`specials.roll: n=${n} 순서 위반 (기대 ${expectedN})`);
      expectedN += 1;
      const u1 = rand();
      const u2 = rand(); // 특수 칸이 없어도 항상 2회 소비 (D-14)
      const cellIndex = Math.floor(u2 * CELLS_PER_PIECE);

      if (battle && stage >= 1) {
        if (nextWordAt === null) nextWordAt = n + gap(u1);
        if (n === nextWordAt) {
          nextWordAt = n + gap(u1);
          return { kind: 'word', cellIndex };
        }
      }
      const { jericho, manna, armor } = specials;
      const pJ = stage >= 2
        ? Math.min(jericho.base + jericho.perCombo * Math.min(Math.max(combo, 0), jericho.comboCap), jericho.max) : 0;
      const pM = stage >= 2
        ? (inDanger ? manna.dangerChance : stackHeight >= manna.highThresholdRows ? manna.highChance : manna.lowChance) : 0;
      const pA = battle ? armor.chance : 0;
      if (u1 < pJ) return { kind: 'jericho', cellIndex };
      if (u1 < pJ + pM) return { kind: 'manna', cellIndex };
      if (u1 < pJ + pM + pA) {
        const idx = Math.min(Math.floor(((u1 - pJ - pM) / pA) * ARMOR_IDS.length), ARMOR_IDS.length - 1);
        return { kind: 'armor', cellIndex, armorId: ARMOR_IDS[idx] };
      }
      return null;
    },
  };
}
