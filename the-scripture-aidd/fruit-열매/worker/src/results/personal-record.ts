// TASK-031-1 · FR-066 · FR-067 · REQ-013 · architecture §11 #13 — 개인 기록(최대 콤보·분당 공격·퀴즈 정답률) 집계와 직전 기록 대비 성장 수치
// 성장 비교 단위 = 직전에 끝난 경기/연습 세션의 기록 (player_progress.last_record). 첫 기록이면 성장 null (API-262).
import type { MatchMode, PersonalRecord, SlotStats } from '../store/store';

export interface Growth { maxCombo: number; attackPerMin: number; quizAccuracy: number }

/** TBL-002 stats.attackPerMin = 소수 1자리, 정답률은 0~1 소수 2자리 (data-ark TBL-003 예시 0.67) */
const ATTACK_DECIMALS = 1;
const ACCURACY_DECIMALS = 2;

const roundTo = (value: number, decimals: number): number => {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
};

// FR-066 퀴즈 정답률 — 응답 0회면 0
export function quizAccuracy(stats: Pick<SlotStats, 'quizCorrect' | 'quizAnswered'>): number {
  if (stats.quizAnswered <= 0) return 0;
  return roundTo(stats.quizCorrect / stats.quizAnswered, ACCURACY_DECIMALS);
}

// FR-066 슬롯 통계 → 개인 기록 (연습은 playTimeMs 포함 — API-262 record)
export function buildPersonalRecord(stats: SlotStats, mode: MatchMode | 'practice', playTimeMs?: number): PersonalRecord {
  const record: PersonalRecord = {
    maxCombo: stats.maxCombo,
    attackPerMin: roundTo(stats.attackPerMin, ATTACK_DECIMALS),
    quizAccuracy: quizAccuracy(stats),
    mode,
  };
  if (mode === 'practice' && playTimeMs !== undefined) record.playTimeMs = playTimeMs;
  return record;
}

// FR-066 성장 수치 = 이번 기록 − 직전 기록 (직전 없음 → null)
export function computeGrowth(current: PersonalRecord, previous: PersonalRecord | null | undefined): Growth | null {
  if (!previous) return null;
  return {
    maxCombo: current.maxCombo - previous.maxCombo,
    attackPerMin: roundTo(current.attackPerMin - previous.attackPerMin, ATTACK_DECIMALS),
    quizAccuracy: roundTo(current.quizAccuracy - previous.quizAccuracy, ACCURACY_DECIMALS),
  };
}
