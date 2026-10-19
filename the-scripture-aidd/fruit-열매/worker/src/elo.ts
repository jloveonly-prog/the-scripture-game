// TASK-031-1 · FR-070 · REQ-015 · D-21 — Elo 레이팅 계산 (사람 대 사람 경기만, 이탈 = 패배). Elo 수식의 단일 원천.
// 수치(K 32·척도 400·하한 0)는 content/balance.json `elo`에서만 읽는다 (D-15).
import { balance } from './content';

export interface EloResult { newRating1: number; newRating2: number; delta1: number; delta2: number }

// D-21 기대 승률 E_a = 1 / (1 + 10^((R_b − R_a) / scale))
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / balance.elo.scale));
}

/** 0에서 먼 쪽 반올림 — 승자 +d, 패자 −d가 정확히 대칭이 되도록 크기만 반올림한다 */
const roundHalfAwayFromZero = (x: number): number => Math.sign(x) * Math.round(Math.abs(x));

// FR-070 경기 결과 레이팅 갱신 — 승자 +round(K·(1−E_w)), 패자 같은 크기 감소, 하한 floor (결과 정수)
export function computeElo(rating1: number, rating2: number, winnerSlot: 1 | 2): EloResult {
  const winner = winnerSlot === 1 ? rating1 : rating2;
  const loser = winnerSlot === 1 ? rating2 : rating1;
  const gain = roundHalfAwayFromZero(balance.elo.k * (1 - expectedScore(winner, loser)));
  const newWinner = Math.max(balance.elo.floor, winner + gain);
  const newLoser = Math.max(balance.elo.floor, loser - gain);
  const newRating1 = winnerSlot === 1 ? newWinner : newLoser;
  const newRating2 = winnerSlot === 1 ? newLoser : newWinner;
  return { newRating1, newRating2, delta1: newRating1 - rating1, delta2: newRating2 - rating2 };
}
