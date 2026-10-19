// apply-effect.js — `effect` source별(hero·angel·armor·jesus·special·grace) 내 보드/저주 상태 변경만
// TASK-011 | REQ-003 REQ-008 REQ-009 REQ-010 REQ-012 REQ-013 FR-014~FR-017 FR-035 FR-037 FR-039 FR-045 FR-046 FR-062
// C-002
// API-023 `effect` | TBL-011 TBL-012 TBL-014 | ARCH-003
// 서버가 승인한 효과만 적용한다 (D-07). `target` 쪽 클라이언트가 자기 보드에 적용하고 다른 쪽은 연출만(API-023).
// 게이지·쿨다운·보유 갑주·준비된 방어 수치는 `status`(API-024)가 원천이므로 여기서 계산하지 않는다.
import { removeCurses, removeCursesByCategory, removeAllCurses } from "./apply-spirit.js";
import { clearLeadQueue } from "./apply-attack.js";

/**
 * @typedef {import("../engine/index.js").Engine} Engine
 * @typedef {import("./apply-spirit.js").CurseState} CurseState
 * @typedef {import("./apply-attack.js").AttackState} AttackState
 * @typedef {{ basePreview: number, hintUntil: number, gabrielPiecesLeft: number, rockUntil: number, grace: boolean }}
 * EffectState
 * @typedef {{ source: string, id: string, by: number | null, target: number | null, params: Record<string, any> }}
 * EffectData
 * @typedef {{ engine: Engine, curse: CurseState, attack: AttackState, mySlot: number, nowMs: number,
 * rules: { board: { previewGabriel: number }, angels: { michael: { families: string[] } } }, armorById:
 * ReadonlyMap<string, { nullifies: string[] | null }> }} EffectContext
 */

/**
 * @param {number} basePreview API-019 `start.preview` (솔로몬 5, 그 외 3)
 * @param {boolean} grace API-019 `start.grace`
 * @returns {EffectState}
 */
export function createEffectState(basePreview, grace) {
  return { basePreview, hintUntil: 0, gabrielPiecesLeft: 0, rockUntil: 0, grace };
}

/**
 * API-023 `effect` 적용. 내가 target이 아니면 보드 변화 없음.
 * @param {EffectState} state @param {EffectData} data @param {EffectContext} ctx
 * @returns {Array<{ type: string, [key: string]: unknown }>} 엔진 이벤트 (연출용)
 */
export function applyEffect(state, data, ctx) {
  if (data.target !== ctx.mySlot) return [];
  const p = data.params ?? {};
  switch (data.source) {
    case "hero": return applyHero(state, data.id, p, ctx);
    case "angel": return applyAngel(state, data.id, p, ctx);
    case "armor": return applyArmor(data.id, p, ctx);
    case "jesus": return applyJesus(p, ctx);
    case "special": return [];
    case "grace":
      // FR-062 은혜 아이콘 표시 상태 (수치 효과는 서버 판정)
      state.grace = true;
      return [];
    default: return [];
  }
}

/** @param {EffectState} state @param {string} id @param {Record<string, any>} p @param {EffectContext} ctx */
function applyHero(state, id, p, ctx) {
  switch (id) {
    // FR-014 다윗 물맷돌: 상대(= 나에게 target) 보드 가장 높은 열의 꼭대기 블록 blocks개 (받는 쪽 클라이언트가 적용 — H-01)
    case "sling_stone": return ctx.engine.removeTopBlocks(p.blocks);
    // FR-015 솔로몬: hintMs 동안 최적 착지 위치 힌트
    case "understanding_heart": state.hintUntil = ctx.nowMs + p.hintMs; return [];
    // FR-016 베드로: durationMs 동안 반석 표시 (상승 무효 판정은 서버 — garbage.voided)
    case "upon_this_rock": state.rockUntil = ctx.nowMs + p.durationMs; return [];
    // FR-017 바울: 맨 아래 쓰레기 줄 rows줄 (UC-009 5a 있는 만큼만)
    case "prison_doors_opened": return ctx.engine.removeGarbageRows(p.rows);
    default: return [];
  }
}

/** @param {EffectState} state @param {string} id @param {Record<string, any>} p @param {EffectContext} ctx */
function applyAngel(state, id, p, ctx) {
  switch (id) {
    case "michael":
      // FR-035 용·사탄 계열 1회 완전 상쇄 — 대기 중이던 그 공격의 저주(rules.angels.michael.families)도 함께 사라진다
      if (p.canceled) removeCurses(ctx.curse, ctx.engine, ctx.rules.angels.michael.families);
      return [];
    case "gabriel":
      // FR-035 다음 pieces개 블록 순서 공개(미리보기 previewGabriel개) + 착지 힌트
      state.gabrielPiecesLeft = p.pieces;
      ctx.engine.setPreviewCount(ctx.rules.board.previewGabriel);
      return [];
    case "cherubim": return []; // FR-035 대기 공격 태움 — 서버 pending 감소, 표시는 status
    case "seraphim": return clearCursesAndLead(p.cleared ?? [], ctx);
    // FR-035 섬기는 영들: 쓰레기 줄 rows줄 제거
    case "ministering_spirits": return ctx.engine.removeGarbageRows(p.rows);
    default: return [];
  }
}

/** @param {string} id @param {Record<string, any>} p @param {EffectContext} ctx */
function applyArmor(id, p, ctx) {
  const def = ctx.armorById.get(id);
  // FR-037 nullify(허리띠·신·투구): 해당 분류 현재 효과 해제 (다음 1회 무효는 서버 판정 — OQ #8)
  if (def && Array.isArray(def.nullifies)) removeCursesByCategory(ctx.curse, ctx.engine, def.nullifies);
  // 서버가 걷은 저주 id (nullify 해제분 · 성령의 검이 되돌린 대기 공격의 저주 — 납 블록 포함)
  if (Array.isArray(p.cleared)) return clearCursesAndLead(p.cleared, ctx);
  return []; // 흉배·방패·검의 수치 판정은 서버 (status.armed·attack.blockedBy·reflected)
}

/**
 * FR-039 예수님 "세상을 이기었노라": 모든 저주·암전 제거 + 쓰레기 줄 절반(내림) 제거 (UC-012 E2 0줄이면 제거만).
 * @param {Record<string, any>} p @param {EffectContext} ctx
 */
function applyJesus(p, ctx) {
  const events = [];
  if (p.removeCurses) {
    removeAllCurses(ctx.curse, ctx.engine);
    clearLeadQueue(ctx.attack);
    if (ctx.engine.leadLinesLeft > 0) events.push(...ctx.engine.removeLeadRows());
  }
  const remove = Math.floor(ctx.engine.garbageRowCount() * (p.garbageRemoveRatio ?? 0));
  if (remove > 0) events.push(...ctx.engine.removeGarbageRows(remove));
  return events;
}

/**
 * FR-035 스랍: 걸린 저주(seal 제외 — CODE-007) 해제, 납 블록 포함.
 * @param {string[]} cleared @param {EffectContext} ctx
 */
function clearCursesAndLead(cleared, ctx) {
  removeCurses(ctx.curse, ctx.engine, cleared);
  if (!cleared.includes("wickedness")) return [];
  clearLeadQueue(ctx.attack);
  return ctx.engine.leadLinesLeft > 0 ? ctx.engine.removeLeadRows() : [];
}

/**
 * 블록 고정마다 호출 — 가브리엘 남은 블록 수 감소, 끝나면 기본 미리보기로 (FR-035 "다음 7개 블록").
 * @param {EffectState} state @param {Engine} engine
 */
export function onPieceLocked(state, engine) {
  if (state.gabrielPiecesLeft <= 0) return;
  state.gabrielPiecesLeft -= 1;
  if (state.gabrielPiecesLeft === 0) engine.setPreviewCount(state.basePreview);
}

/**
 * 착지 힌트 표시 여부 (FR-015 솔로몬 hintMs · FR-035 가브리엘 pieces).
 * @param {EffectState} state @param {number} nowMs
 * @returns {boolean}
 */
export function hintActive(state, nowMs) {
  return nowMs < state.hintUntil || state.gabrielPiecesLeft > 0;
}

/**
 * 베드로 반석 남은 ms (H-03 표시용).
 * @param {EffectState} state @param {number} nowMs
 * @returns {number}
 */
export function rockRemainingMs(state, nowMs) {
  return Math.max(0, state.rockUntil - nowMs);
}
