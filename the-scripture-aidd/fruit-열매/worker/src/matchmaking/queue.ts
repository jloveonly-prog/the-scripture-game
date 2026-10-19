// TASK-034-1 · FR-018 · FR-020 · UC-003 — 랜덤 대기열 짝 선택 규칙 (상태 없는 순수 함수)
// 대기열 자체는 Matchmaker 소켓 첨부 상태에서 복원한다 (api-gate API-151 "테이블 아님", Hibernation).

export interface QueueEntry {
  guestId: string;
  rating: number;
  /** 서버 epoch ms — 동률이면 먼저 기다린 사람 */
  queuedAt: number;
}

// FR-018 새 대기자의 짝 — |Ra − Rb| 최소, 동률은 먼저 온 순. 대기자 1명이면 차이와 무관하게 그 사람 (UC-003 3a). 없으면 null
export function pickOpponent<T extends QueueEntry>(waiting: readonly T[], newcomer: Pick<QueueEntry, 'guestId' | 'rating'>): T | null {
  let best: T | null = null;
  for (const entry of waiting) {
    if (entry.guestId === newcomer.guestId) continue; // 자기 자신과는 짝짓지 않는다
    if (!best) {
      best = entry;
      continue;
    }
    const diff = Math.abs(entry.rating - newcomer.rating);
    const bestDiff = Math.abs(best.rating - newcomer.rating);
    if (diff < bestDiff || (diff === bestDiff && entry.queuedAt < best.queuedAt)) best = entry;
  }
  return best;
}

// FR-018 중복 대기 거부 판정 (같은 게스트가 이미 대기 중 — 다른 소켓 포함)
export function isQueued(waiting: readonly Pick<QueueEntry, 'guestId'>[], guestId: string): boolean {
  return waiting.some((e) => e.guestId === guestId);
}

// FR-020 대기열에서 게스트 제거 (취소·연결 끊김)
export function removeFromQueue<T extends Pick<QueueEntry, 'guestId'>>(waiting: readonly T[], guestId: string): T[] {
  return waiting.filter((e) => e.guestId !== guestId);
}
