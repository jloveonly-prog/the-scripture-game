// TASK-023-1 · FR-005 · FR-009 · D-03 — 방 타이머 스케줄러: 이름 붙은 예약 여러 개를 DO alarm 1개로 묶는다.
// 단일 책임: 타이머 예약·취소·만기 추출. 실제 `ctx.storage.setAlarm` 호출은 onChange 콜백(DO 셸)이 맡는다 (devguide §3.4 의존성 주입).

/** 방 타이머 이름 (접두로 처리 모듈을 고른다 — game-room.ts alarm 분배) */
export type TimerKey =
  | 'joinTimeout' | 'auth' | 'roundGo' | 'nextRound'
  | 'quizDeadline' | 'quizResume' | 'autoQuiz' | 'botQuiz'
  | 'botTick' | 'spirits';

export interface RoomTimers {
  schedule(key: TimerKey, at: number): void;
  cancel(key: TimerKey): void;
  has(key: TimerKey): boolean;
  at(key: TimerKey): number | null;
  /** 가장 이른 예약 시각 (없으면 null) */
  nextAt(): number | null;
  /** now 이하로 만기된 예약을 시각 순으로 꺼낸다 (꺼낸 예약은 삭제) */
  takeDue(now: number): TimerKey[];
  clear(): void;
}

// FR-005·FR-009 방 타이머 (카운트다운·라운드 간격·입장 마감·말씀 대결 마감 — 수치는 호출 측이 balance/protocol에서 읽는다)
export function createRoomTimers(onChange: (nextAt: number | null) => void): RoomTimers {
  const entries = new Map<TimerKey, number>();
  let lastNotified: number | null | undefined;

  const earliest = (): number | null => {
    let min: number | null = null;
    for (const at of entries.values()) if (min === null || at < min) min = at;
    return min;
  };
  const notify = (): void => {
    const next = earliest();
    if (next === lastNotified) return;
    lastNotified = next;
    onChange(next);
  };

  return {
    schedule(key, at) {
      if (!Number.isFinite(at)) throw new RangeError(`timer ${key}: invalid time`);
      entries.set(key, Math.floor(at));
      notify();
    },
    cancel(key) {
      if (entries.delete(key)) notify();
    },
    has(key) {
      return entries.has(key);
    },
    at(key) {
      return entries.get(key) ?? null;
    },
    nextAt: earliest,
    takeDue(now) {
      const due = [...entries.entries()].filter(([, at]) => at <= now).sort((a, b) => a[1] - b[1]).map(([key]) => key);
      for (const key of due) entries.delete(key);
      // 알람이 방금 울렸으므로 다음 예약을 항상 다시 알린다
      lastNotified = undefined;
      notify();
      return due;
    },
    clear() {
      entries.clear();
      notify();
    },
  };
}
