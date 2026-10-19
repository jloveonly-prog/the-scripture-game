// TASK-020-1 · FR-024 · FR-026 · FR-030 · FR-045 · REQ-007 · R-01 · D-15 — 서버 권한 공격력·악한 영·구멍 열·상쇄 계산 (순수 함수).
// 단일 책임: clear 줄 정보 → 공격력, 공격 등급 → 영 후보 선택, 영 매개변수 굴림, 대기 큐 상쇄. 수치는 balance.json (data-ark §8.8.1·§8.8.2).
import { balance, spiritsById, type SpiritDef } from './content';
import { BOARD_COLS } from '../../client/js/engine/encode.js';

type AttackCfg = typeof balance.attack;
type GradeCfg = typeof balance.spiritGrades;

/** 테트리스 줄 수 (FR-024 "4줄(테트리스)") */
const TETRIS_LINES = 4;
/** wind 방향 (data-ark §8.8.6 "방향 서버 무작위") */
const WIND_DIRECTIONS = ['left', 'right'] as const;

export interface AttackInput {
  lines: number;
  combo: number;
  b2b: boolean;
  tspin: boolean;
  /** 이번 삭제에서 인정된 여리고 나팔 칸 수 (FR-045) */
  jerichoCells: number;
}

// FR-024 공격력 계산 (data-ark §8.8.1): 기본 + T-Spin + 콤보 + B2B(테트리스·T-Spin) + 여리고 칸
export function computeAttack(input: AttackInput, cfg: AttackCfg = balance.attack): number {
  const lines = Math.max(0, Math.min(TETRIS_LINES, input.lines));
  let power = cfg.baseByLines[lines] ?? 0;
  if (input.tspin) power += cfg.tspinBonusByLines[lines] ?? 0;
  const combo = cfg.comboBonus.find((b) => input.combo >= b.minCombo && input.combo <= b.maxCombo);
  if (combo) power += combo.bonus;
  if (input.b2b && (lines === TETRIS_LINES || input.tspin)) power += cfg.b2bBonus;
  power += Math.max(0, input.jerichoCells) * cfg.jerichoBonusPerCell;
  return power;
}

// FR-026 B2B 테트리스 여부 (연속 B2B 테트리스 → 보스 판정 입력)
export function isB2bTetris(input: Pick<AttackInput, 'lines' | 'b2b'>): boolean {
  return input.lines === TETRIS_LINES && input.b2b;
}

// FR-026 공격 등급 → 영 후보 목록 (위에서부터 첫 일치 — data-ark §8.8.2). 후보가 없으면 [] (영 없음)
export function spiritCandidates(input: AttackInput, prevB2bTetris: boolean, cfg: GradeCfg = balance.spiritGrades): string[] {
  const tetris = input.lines === TETRIS_LINES;
  if (isB2bTetris(input) && prevB2bTetris) return [...cfg.consecutiveB2bTetris];
  if (isB2bTetris(input)) return [...cfg.b2bTetris];
  if (tetris && (input.tspin || input.combo >= cfg.tetrisBoostedComboMin)) return [...cfg.tetrisBoosted];
  if (tetris) return [...cfg.tetris];
  const byLines = (cfg.baseGradeByLines as Record<string, number>)[String(input.lines)];
  let grade = byLines ?? (input.tspin && input.lines === 1 ? cfg.tspinSingleBaseGrade : 0);
  if (grade <= 0) return [];
  if (input.tspin) grade += cfg.tspinGradeBonus;
  if (input.combo >= cfg.comboGradeBonus.minCombo) grade += cfg.comboGradeBonus.bonus;
  grade = Math.min(grade, cfg.maxGrade);
  return [...((cfg.candidatesByGrade as Record<string, string[]>)[String(grade)] ?? [])];
}

// FR-026 영 결정 (후보 균등 무작위, 서버 난수) — 잔여 공격력 0이면 호출하지 않는다
export function selectSpirit(input: AttackInput, prevB2bTetris: boolean, rand: () => number): string | null {
  const candidates = spiritCandidates(input, prevB2bTetris);
  return candidates.length === 0 ? null : candidates[Math.floor(rand() * candidates.length)];
}

// FR-025 쓰레기 구멍 열 (공격 1회마다 0~9 — 같은 공격의 줄들은 같은 열)
export function rollHoleColumn(rand: () => number, cfg: AttackCfg = balance.attack): number {
  const [min, max] = cfg.holeColumnRange;
  return min + Math.floor(rand() * (max - min + 1));
}

// FR-027~030 영 효과 매개변수 = spirits.json params + 서버가 굴린 값 (wind.direction, locustHoles.columns)
export function rollSpiritParams(spirit: SpiritDef, rand: () => number): Record<string, unknown> {
  const params: Record<string, unknown> = { ...spirit.effect.params };
  if (spirit.effect.kinds.includes('wind')) params.direction = WIND_DIRECTIONS[Math.floor(rand() * WIND_DIRECTIONS.length)];
  if (spirit.effect.kinds.includes('locustHoles')) {
    const count = Math.min(BOARD_COLS, Number(spirit.effect.params.blocks ?? 0));
    const columns: number[] = [];
    while (columns.length < count) {
      const col = Math.floor(rand() * BOARD_COLS);
      if (!columns.includes(col)) columns.push(col);
    }
    params.columns = columns.sort((a, b) => a - b);
  }
  return params;
}

// FR-030 보스(용) 쓰레기 = max(공격력, 6) (architecture §11 #8)
export function spiritGarbage(spiritId: string | null, garbage: number): number {
  if (spiritId === null) return garbage;
  const min = spiritsById.get(spiritId)?.effect.params.minGarbage;
  return typeof min === 'number' ? Math.max(garbage, min) : garbage;
}

// FR-025 상쇄: 보낸 쪽 대기 쓰레기를 먼저 줄이고 남은 공격만 상대에게 (data-ark §8.8.1)
export function offsetAttack(power: number, pendingGarbage: number): { used: number; residual: number; pending: number } {
  const used = Math.min(Math.max(0, power), Math.max(0, pendingGarbage));
  return { used, residual: Math.max(0, power) - used, pending: Math.max(0, pendingGarbage) - used };
}
