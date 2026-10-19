// apply-attack.js — `attack`·`garbage` → 대기 공격·쓰레기 상승·납 블록·아바돈 구멍 적용만
// TASK-011 | REQ-007 FR-025 FR-029 FR-053 | API-021 `attack` · API-022 `garbage` | TBL-013 | ARCH-003 | D-07 D-08
// 서버가 판정한 결과만 내 엔진에 적용한다 (D-07 보드 = 클라이언트, 판정 = 서버). 상승 시점은 서버 `garbage`가 정한다 (D-08).
// 시간형 저주(반전·바람·가림 등)는 apply-spirit.js가 맡는다 — 이 파일은 보드 상태형(아바돈·악)만.

/**
 * @typedef {import("../engine/index.js").Engine} Engine
 * @typedef {{ pending: number, leadQueue: Array<{ rows: number, linesToClear: number }> }} AttackState
 */

/** @returns {AttackState} */
export function createAttackState() {
  return { pending: 0, leadQueue: [] };
}

/**
 * API-021 `attack` 수신. 내가 받는 쪽(target)이면 대기 공격 표시값 갱신 + 보드 상태형 영 효과 준비.
 * 보낸 쪽이면 보드 변화 없음(빛의 화살 연출만 — 03 fx).
 * @param {AttackState} state @param {Engine} engine
 * @param {{ target: number, pending: number, spiritId: string | null, spiritApplied: boolean,
 *   params: Record<string, number> }} data
 * @param {number} mySlot
 * @returns {Array<{ type: string, [key: string]: unknown }>} 엔진 이벤트 (연출용)
 */
export function applyAttack(state, engine, data, mySlot) {
  if (data.target !== mySlot) return [];
  // FR-025 경고 게이지 = 서버가 알려 준 대기 합계 (HUD는 서버 값만 — D-07)
  state.pending = data.pending;
  if (!data.spiritApplied || !data.spiritId) return [];
  const params = data.params ?? {};
  // FR-029 아바돈/아볼루온: 쌓인 블록에 구멍 — 위치는 서버가 준 seed로 엔진이 결정 (design-vision S-09)
  if (data.spiritId === "abaddon") return engine.punchHoles(params.holes, params.seed);
  // FR-029 악(에바 속의 여인): 납 블록 줄은 다음 `garbage` 상승 때 함께 오른다 (API-022 설명)
  if (data.spiritId === "wickedness") state.leadQueue.push({ rows: params.rows, linesToClear: params.linesToClear });
  return [];
}

/**
 * API-022 `garbage` 수신. 내가 target이면 구멍 1칸 쓰레기 `rows`줄 상승(베드로 무효분은 서버가 rows에서 이미 뺌),
 * 대기 중인 납 블록 줄을 함께 올린다. 위로 밀려 나가면 엔진이 topout 이벤트를 낸다 (UC-007 E3).
 * @param {AttackState} state @param {Engine} engine
 * @param {{ target: number, rows: number, holeColumn: number, voided: number, pending: number }} data
 * @param {number} mySlot
 * @returns {Array<{ type: string, [key: string]: unknown }>}
 */
export function applyGarbage(state, engine, data, mySlot) {
  if (data.target !== mySlot) return [];
  state.pending = data.pending;
  const events = engine.applyGarbage(data.rows, data.holeColumn);
  while (state.leadQueue.length > 0 && !engine.topOut) {
    const lead = /** @type {{ rows: number, linesToClear: number }} */ (state.leadQueue.shift());
    events.push(...engine.addLeadRows(lead.rows, lead.linesToClear));
  }
  return events;
}

/**
 * 대기 중인 납 블록 줄 취소 (FR-035 스랍·FR-039 예수님 "저주 제거" — 아직 오르지 않은 것 포함).
 * @param {AttackState} state
 */
export function clearLeadQueue(state) {
  state.leadQueue.length = 0;
}

/**
 * API-024 `status.pending`으로 대기 표시값 동기화 (그룹 태움·흉배 경감·미가엘 상쇄 후).
 * @param {AttackState} state @param {number} pending
 */
export function syncPending(state, pending) {
  state.pending = pending;
}
