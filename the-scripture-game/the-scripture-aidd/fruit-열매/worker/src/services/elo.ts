// elo.ts — Elo 기대 승률·갱신 순수 함수만
// TASK-020-1 | REQ-015 FR-070 | ARCH-014 | TBL-001 `rating` · TBL-018 `elo` | OQ #5 #19
// OQ #19 표준 Elo: 기대 승률 = 1 / (1 + 10^((상대 − 나)/400)), K = rules.elo.k(32), 기본값 rules.elo.base(1000).
// OQ #5 사람 대 사람 경기만 갱신 — 호출자(history-service)가 판단한다.

/** Elo 표준 로지스틱 척도 (레이팅 400점 차 = 기대 승률 10배) */
const ELO_SCALE = 400;

/** 기대 승률 E_A */
export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / ELO_SCALE));
}

/**
 * 경기 1건 갱신 — 결과는 정수 반올림, 0 미만 금지 (TBL-001 CHECK rating >= 0).
 * @param scoreA A 기준 실제 점수 (승 1, 패 0)
 */
export function updateRatings(ratingA: number, ratingB: number, scoreA: 0 | 1, k: number): { a: number; b: number } {
  const deltaA = k * (scoreA - expectedScore(ratingA, ratingB));
  return {
    a: Math.max(0, Math.round(ratingA + deltaA)),
    b: Math.max(0, Math.round(ratingB - deltaA)),
  };
}
