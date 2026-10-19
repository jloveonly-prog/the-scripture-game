// results.ts — 슬롯 통계 집계·`recordMatch`/`recordPractice` 페이로드·`matchEnd` 페이로드 조립만
// TASK-018 | REQ-001 REQ-006 REQ-013 REQ-014 FR-007 FR-009 FR-023 FR-063 FR-065 FR-066 FR-068 | ARCH-011 | API-030
// TBL-002 TBL-003 TBL-018 `verseCard`·`victoryVerse` | architecture §8.4 §9.5 §9.10 | UC-006 UC-015 UC-016
// 기록 실패여도 결과 화면은 보낸다 — you.saved = false (UC-015 E2, UC-006 E2).
import { heroesById } from "../content";
import type { MatchReport, RecordOutcome, SlotOutcome } from "../services/history-service";
import { personalRecord, type PracticeOutcome, type PracticeReport } from "../services/progress-service";
import type { BotLevel, MatchMode, Slot } from "../storage/adapter";
import { isVersus, matchDurationMs, winsArray, type MatchEnd, type MatchState } from "./match-flow";
import type { RoomContext, SlotState } from "./player-state";

/** Matchmaker 기록 RPC (D-04 — GameRoom → Matchmaker `recordMatch`·`recordPractice`) */
export interface LedgerRpc {
  recordMatch(report: MatchReport): Promise<RecordOutcome>;
  recordPractice(report: PracticeReport): Promise<PracticeOutcome>;
}

/** FR-063 말씀 카드 대표 구절 (rules.verseCard): 예수님 이벤트가 일어난 경기 → jesusEventRef, 아니면 승자(연습은 본인) 위인 구절 */
export function verseCardRef(ctx: RoomContext, m: MatchState, featuredSlot: Slot | null): string {
  if ([...m.slots.values()].some((s) => s.jesusCount > 0)) return ctx.rules.verseCard.jesusEventRef;
  const slot = featuredSlot ?? m.config.slots.find((c) => !c.isBot)?.slot ?? 1;
  const state = m.slots.get(slot);
  return (state && heroesById.get(state.heroId)?.verse_ref) || ctx.rules.victoryVerse;
}

/** TBL-003 슬롯 통계 */
function statsOf(state: SlotState) {
  const t = state.totals;
  return {
    maxCombo: t.maxCombo, linesCleared: t.linesCleared, attackSent: t.attackSent, tetrisCount: t.tetrisCount,
    piecesPlaced: t.piecesPlaced, quizCorrect: t.quizCorrect, quizAnswered: t.quizAnswered,
  };
}

/** FR-068 경기 결과 → RPC recordMatch 입력 (방 ID, 두 플레이어, 승자, 두 위인, 경기 시간, 통계, 대표 구절) */
export function buildMatchReport(ctx: RoomContext, m: MatchState, end: MatchEnd): MatchReport {
  const winnerSlot = end.winnerSlot as Slot;
  return {
    matchId: m.config.roomId,
    mode: m.config.mode as MatchMode,
    botLevel: m.config.mode === "bot" ? (m.config.botLevel as BotLevel) : null,
    winnerSlot,
    endReason: end.reason,
    roundsPlayed: Math.max(1, m.roundWinners.length),
    durationMs: matchDurationMs(m),
    verseRef: verseCardRef(ctx, m, winnerSlot),
    players: m.config.slots.map((c) => {
      const state = m.slots.get(c.slot)!;
      return {
        slot: c.slot, guestId: c.isBot ? null : c.guestId, isBot: c.isBot, heroId: c.heroId,
        roundsWon: m.wins.get(c.slot) ?? 0,
        roundResults: m.roundWinners.map((w) => (w === c.slot ? ("win" as const) : ("loss" as const))),
        stats: statsOf(state),
      };
    }),
  };
}

/** 연습 세션 → RPC recordPractice 입력 (architecture §9.5 — 누적 판 수 +1, 업적) */
export function buildPracticeReport(m: MatchState): PracticeReport | null {
  const c = m.config.slots.find((x) => !x.isBot && x.guestId);
  if (!c) return null;
  return { guestId: c.guestId as string, heroId: c.heroId, tetrisCount: m.slots.get(c.slot)!.totals.tetrisCount };
}

/**
 * API-030 `matchEnd` 슬롯별 페이로드. 연습: winnerSlot null, reason topout, growth·rating null (architecture §9.10, OQ #5),
 * you.result null (승패 없음 — 개인 기록만, UC-006 6단계).
 */
export function matchEndPayload(
  ctx: RoomContext, m: MatchState, end: MatchEnd, slot: Slot,
  outcome: { saved: boolean; slot: SlotOutcome | null; achievements: string[] },
) {
  const state = m.slots.get(slot)!;
  const durationMs = matchDurationMs(m);
  const record = personalRecord(state.totals, durationMs);
  const versus = isVersus(m);
  return {
    mode: m.config.mode,
    winnerSlot: versus ? end.winnerSlot : null,
    reason: end.reason,
    wins: winsArray(m),
    durationMs,
    verseRef: verseCardRef(ctx, m, versus ? end.winnerSlot : slot),
    victoryVerseRef: ctx.rules.victoryVerse,
    you: {
      slot,
      result: versus ? (end.winnerSlot === slot ? "win" : "loss") : null,
      record: {
        maxCombo: record.maxCombo, attackPerMin: record.attackPerMin, quizRate: record.quizRate,
        tetrisCount: state.totals.tetrisCount, linesCleared: state.totals.linesCleared, playTimeMs: durationMs,
      },
      growth: versus ? outcome.slot?.growth ?? null : null,
      rating: versus ? outcome.slot?.rating ?? null : null,
      achievements: outcome.achievements,
      saved: outcome.saved,
    },
  };
}

/**
 * 경기 끝 처리 (UC-015 5~7단계, UC-016 3~4단계, UC-006 6단계): 기록 RPC → 사람 슬롯마다 `matchEnd`.
 * 무효 경기는 기록·전송 없음 (TBL-002 "무효 경기는 행을 만들지 않는다"). RPC 예외는 saved=false로 바꾼다.
 */
export async function finishMatch(ctx: RoomContext, m: MatchState, end: MatchEnd, rpc: LedgerRpc): Promise<void> {
  if (end.voided) return;
  const humans = m.config.slots.filter((c) => !c.isBot);
  if (!isVersus(m)) {
    const report = buildPracticeReport(m);
    let practice: PracticeOutcome = { saved: false, achievements: [] };
    try {
      if (report) practice = await rpc.recordPractice(report);
    } catch {
      practice = { saved: false, achievements: [] };
    }
    for (const c of humans) ctx.send(c.slot, "matchEnd", matchEndPayload(ctx, m, end, c.slot, { saved: practice.saved,
      slot: null, achievements: practice.achievements }));
    return;
  }
  let outcome: RecordOutcome;
  try {
    outcome = await rpc.recordMatch(buildMatchReport(ctx, m, end));
  } catch {
    outcome = { saved: false, slots: [] };
  }
  for (const c of humans) {
    const slotOutcome = outcome.slots.find((s) => s.slot === c.slot) ?? null;
    ctx.send(c.slot, "matchEnd", matchEndPayload(ctx, m, end, c.slot, {
      saved: outcome.saved, slot: slotOutcome, achievements: slotOutcome?.achievements ?? [],
    }));
  }
}
