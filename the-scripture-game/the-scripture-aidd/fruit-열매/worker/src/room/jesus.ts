// jesus.ts — 예수님 이벤트 조건 판정·효과(저주·암전 제거 + 쓰레기 절반 내림 제거)만 — `by: null`
// TASK-015-1 | REQ-010 FR-039 C-002 | ARCH-011 | API-012 API-023 | TBL-018 `jesus`·`board.dangerRows`·`verseCard` | OQ
// #1 #7 #20 | UC-012
// C-002: 선택 캐릭터가 아니고, 플레이어가 부르지 않으며(by = null), 경기당 rules.jesus.perMatch회. 게이지를 소모하지 않는다(OQ #20).
import type { Rules } from "../content";
import { clearEffects } from "./effects";
import type { EffectPayload } from "./hero-skills";
import { gaugeValue, sendStatus, type RoomContext, type SlotState } from "./player-state";

/** FR-039 효과 id (API-023 표) */
const EVENT_ID = "overcome_the_world";

/**
 * 위기 판정 — `state.board`(CODE-009 200자, 위→아래)의 상단 dangerRows줄에 블록이 있는가 (FR-055, OQ #7, D-07).
 */
export function isCrisisBoard(board: string, rules: Rules): boolean {
  const top = board.slice(0, rules.board.dangerRows * rules.board.width);
  return /[1-9]/.test(top);
}

/**
 * `state` 수신마다 호출 (API-012 "위기 + 게이지 가득이면 API-023 effect source=jesus").
 * 조건: 대전(연습 제외 — UC-012 전제) · 이번 경기 perMatch회 미만 · 게이지 = gauge.max · 위기.
 * 효과: 걸린 저주 전부 해제(서버 판정 상태) → `effect` 양측(params: removeCurses, garbageRemoveRatio — 보드 쓰레기 줄
 * 절반 내림 제거는 받는 클라이언트가 적용, UC-012 E2 0줄이면 저주만).
 * @param versus 대전(사람·봇)인가
 * @returns 발동했으면 effect 페이로드
 */
export function checkJesusEvent(ctx: RoomContext, state: SlotState, versus: boolean,
  board: string): EffectPayload | null {
  const rules = ctx.rules;
  state.crisis = isCrisisBoard(board, rules);
  if (!versus || state.jesusCount >= rules.jesus.perMatch) return null;
  if (gaugeValue(state) < rules.gauge.max || !state.crisis) return null;
  state.jesusCount += 1;
  state.jesusUsed = state.jesusCount >= rules.jesus.perMatch;
  // FR-039 "내 보드의 모든 저주와 암전 제거"
  clearEffects(state, ctx.now(), () => true);
  const effect: EffectPayload = {
    source: "jesus", id: EVENT_ID, by: null, target: state.slot,
    params: { removeCurses: true, garbageRemoveRatio: rules.jesus.garbageRemoveRatio },
    verseRef: rules.verseCard.jesusEventRef,
  };
  ctx.broadcast("effect", effect);
  sendStatus(ctx, state);
  return effect;
}
