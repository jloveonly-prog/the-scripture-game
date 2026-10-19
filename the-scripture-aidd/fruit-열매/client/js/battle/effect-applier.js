// TASK-011-2 · FR-014~017 · FR-025 · FR-027~030 · FR-035 · FR-037 · FR-039 · FR-045 · FR-046 — 서버 attack·effect를 내 엔진 보드에 적용.
// 단일 책임: API-254 `attack`·API-255 `effect`의 action.type별 보드 조작 + 그 결과의 EVT 묶음(emitFx 입력) 생성 (devguide §7.2·§7.9).
// 판정(공격력·영·방어·게이지)은 서버만 한다 (R-01·R-10) — 여기서는 서버가 정한 결과를 내 보드에 옮길 뿐이다.
import { destroyTopBlocks, removeBottomGarbage, removeColumnTops } from '../engine/board.js';

/** 스랍 정화·예수님 clearCurses 범주 (data-ark §8.8.6 저주 = 시야 이외) · clearVision 범주 */
const CURSE_CATEGORIES = Object.freeze(['deception', 'control', 'speed', 'board']);
const VISION_CATEGORIES = Object.freeze(['vision']);

const int = (v, fallback = 0) => (Number.isInteger(v) && v >= 0 ? v : fallback);

/**
 * @typedef {object} ApplyContext
 * @property {object} game engine/game.js 인스턴스
 * @property {object} interference battle/interference-client.js 인스턴스
 * @property {number} mySlot 내 슬롯
 * @property {number} now 로컬 epoch ms
 * @property {{hintUntil:number, immuneUntil:number, revealLeft:number, revealHint:boolean}} local 컨트롤러 시간 상태 (이 함수가 갱신)
 * @property {object} [wards] 직전 playerStatus.wards (§7.12) — 방패·흉배 연출 판정
 */

/**
 * FR-025·FR-027~030 받은 공격(API-254) 적용 → EVT 목록.
 * 쓰레기는 대기 큐로(다음 비삭제 고정 때 삽입 — EVT-23은 엔진), 영 효과는 즉시.
 * @param {object} attack API-254 data
 * @param {ApplyContext} ctx
 */
export function applyAttack(attack, ctx) {
  const fx = [];
  if (!attack || typeof attack !== 'object') return fx;
  const garbage = int(attack.garbage);
  const wards = ctx.wards ?? {};
  if (garbage > 0) {
    ctx.game.queueGarbage(garbage, int(attack.holeColumn));
    fx.push({ evt: 'EVT-21', garbage, fromSlot: attack.fromSlot });
    if (wards.breastplate) fx.push({ evt: 'EVT-26', kind: 'breastplate' });
  } else if (wards.shield && !attack.spiritId) {
    fx.push({ evt: 'EVT-24' });
  }
  if (attack.reflected) fx.push({ evt: 'EVT-25', side: 'opponent' });
  if (typeof attack.spiritId === 'string' && attack.spiritId) {
    const started = ctx.interference.applySpirit(attack, ctx.now);
    if (started) {
      applySpiritBoard(started.board, ctx);
      fx.push({ evt: 'EVT-27', spiritId: started.spiritId, target: 'me', durationMs: int(attack.duration), params: attack.params ?? {} });
    }
  }
  return fx;
}

/** FR-029 아바돈(열 최상단 제거)·악(납 줄) 보드 조작 */
function applySpiritBoard(board, ctx) {
  if (!board) return;
  if (board.type === 'locustHoles') ctx.game.applyBoardOp((g, m) => removeColumnTops(g, m, board.columns));
  if (board.type === 'leadRow') for (let i = 0; i < Math.max(1, int(board.rows, 1)); i += 1) ctx.game.insertLeadRow(int(board.clearsToExpire));
}

/** FR-035·FR-037 범주 해제 + 납 줄 제거('board') → EVT-28 목록 */
function cleanse(categories, ctx) {
  const list = Array.isArray(categories) ? categories : [];
  const removed = ctx.interference.clearCategories(list);
  if (list.includes('board')) ctx.game.removeLeadRows();
  return removed.map((spiritId) => ({ evt: 'EVT-28', spiritId, target: 'me' }));
}

/**
 * FR-014~017·FR-035·FR-037·FR-039 action.type별 내 보드 적용 (대상이 나일 때만 호출). 서버 전용 지시는 무시한다.
 * @returns {object[]} 추가 EVT
 */
export function applyAction(action, ctx) {
  if (!action || typeof action.type !== 'string') return [];
  const { game, local, now } = ctx;
  switch (action.type) {
    case 'destroyTopBlocks': // FR-014 다윗
      game.applyBoardOp((g, m) => destroyTopBlocks(g, m, int(action.count)));
      return [];
    case 'landingHint': // FR-015 솔로몬
      local.hintUntil = now + int(action.durationMs);
      return [];
    case 'garbageImmune': // FR-016 베드로 — 서버가 쓰레기를 0으로, 클라이언트는 대기분 상승 보류
      local.immuneUntil = now + int(action.durationMs);
      return [];
    case 'removeBottomGarbage': // FR-017 바울
    case 'removeGarbageRow': // FR-035 섬기는 영들
      game.applyBoardOp((g, m) => removeBottomGarbage(g, m, int(action.rows)));
      return [];
    case 'revealQueue': // FR-035 가브리엘 — 공개된 count개를 놓을 때까지 미리보기 확장 + 힌트
      local.revealLeft = int(action.count);
      local.revealHint = Boolean(action.landingHint);
      return [];
    case 'cleanseCurses': // FR-035 스랍
      return cleanse(action.categories, ctx);
    case 'wardCategories': // FR-037 허리띠·신·투구 — 진행 중 효과 즉시 해제 (다음 1회 무효는 서버)
      return action.clearActive ? cleanse(action.categories, ctx) : [];
    case 'overcome': { // FR-039 예수님 — 저주·암전 제거 + 쓰레기 줄 제거
      const fx = [];
      if (action.clearCurses) fx.push(...cleanse(CURSE_CATEGORIES, ctx));
      if (action.clearVision) fx.push(...cleanse(VISION_CATEGORIES, ctx));
      game.applyBoardOp((g, m) => removeBottomGarbage(g, m, int(action.removeGarbageRows)));
      return fx;
    }
    // 서버 전용 판정 (미가엘·그룹·흉배·방패·검·상쇄) — 대기 장부는 playerStatus.pendingGarbage로 맞춘다
    // 특수 칸(여리고 폭파·만나)은 줄 삭제 순간 엔진이 이미 적용·연출했다 (EVT-38·39)
    default:
      return [];
  }
}

/**
 * API-255 `effect` 적용 → EVT 목록 (devguide §7.9 EVT 표).
 * @param {object} effect API-255 data {kind, id, bySlot, targetSlot, action, verseRef, durationMs}
 * @param {ApplyContext} ctx
 */
export function applyEffect(effect, ctx) {
  if (!effect || typeof effect.kind !== 'string') return [];
  const toMe = effect.targetSlot === ctx.mySlot;
  const byMe = effect.bySlot === ctx.mySlot;
  const target = toMe ? 'me' : 'opponent';
  const action = effect.action ?? {};
  switch (effect.kind) {
    case 'hero':
    case 'angel': {
      const fx = [{ evt: 'EVT-29', kind: effect.kind, id: effect.id, target, action }];
      if (toMe) fx.push(...applyAction(action, ctx));
      return fx;
    }
    case 'armor': {
      const fx = toMe ? applyAction(action, ctx) : [];
      if (byMe) fx.unshift({ evt: 'EVT-31', armorId: effect.id });
      return fx;
    }
    case 'jesus': {
      const fx = [{ evt: 'EVT-32', target }];
      if (toMe) fx.push(...applyAction(action, ctx));
      return fx;
    }
    case 'spiritEnd':
      if (toMe && !ctx.interference.end(effect.id)) return [];
      return [{ evt: 'EVT-28', spiritId: effect.id, target }];
    case 'offset':
      return toMe ? [{ evt: 'EVT-22', rows: int(action.rows) }] : [];
    case 'attackSent': {
      if (!byMe) return [];
      const fx = [{ evt: 'EVT-20', garbage: int(action.garbage ?? action.rows) }];
      if (typeof action.spiritId === 'string' && action.spiritId) {
        fx.push({ evt: 'EVT-27', spiritId: action.spiritId, target: 'opponent', durationMs: int(effect.durationMs), params: action.params ?? {} });
      }
      return fx;
    }
    case 'reflect':
      return [{ evt: 'EVT-25', side: byMe ? 'me' : 'opponent' }];
    case 'special': // 여리고·만나 — 엔진이 줄 삭제 순간 적용 (보드 위치는 클라이언트만 안다 — R-15)
    default:
      return [];
  }
}
