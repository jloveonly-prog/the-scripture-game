// TASK-011-2 · FR-027 · FR-028 · FR-029 · FR-030 · FR-031 · FR-035 · FR-037 · FR-039 — 악한 영 효과의 클라이언트 상태·만료.
// 단일 책임: 받은 영 효과(API-254)를 시간·줄 단위로 들고 있다가 조작 반전·바람·가짜/틀린 고스트·미리보기 숨김/가짜를 계산한다.
// 적용 여부·상한(FR-031)은 서버가 정한다 — 여기서는 서버가 보낸 것만 그대로 들고 만료시킨다. 그리기는 납달리(EVT-27 payload·HUD).
import { spiritsById } from '../content/content-loader.js';
import { fits, ghostOf } from '../engine/board.js';
import { PIECE_TYPES } from '../engine/pieces.js';

/** 줄 단위 효과(납 줄) — 남은 수는 엔진 leadRows가 원본 */
const LINE_BASED_KINDS = Object.freeze(['leadRow']);
/** 즉시형 보드 효과 (적용 순간만 — 들고 있지 않는다) */
const INSTANT_KINDS = Object.freeze(['locustHoles']);
/** 가짜 고스트 열 어긋남 후보 (거짓말하는 영 — 실제와 다른 위치) · 가짜 미리보기 길이(가브리엘 7개까지 덮음) */
const FAKE_GHOST_OFFSETS = Object.freeze([-3, -2, -1, 1, 2, 3]);
const FAKE_QUEUE_LENGTH = 7;
const WIND_DIR = Object.freeze({ left: -1, right: 1 });

/**
 * FR-027~030 영 효과 상태 생성 (라운드마다 새로).
 * @param {{ rand?: () => number, spirits?: Map<string, object> }} [opts] rand = 가짜 표시용 (판정과 무관 — 연출 전용)
 */
export function createInterference({ rand = Math.random, spirits = spiritsById } = {}) {
  let active = []; // { spiritId, category, kinds, startAt, endAt|null, params, fakeQueue, ghostOffset, nextPushAt }

  const live = (now) => active.filter((e) => e.endAt === null || now < e.endAt);
  const carries = (e, kind) => e.kinds.includes(kind) || (e.kinds.includes('falseAngel') && (e.params.curseKinds ?? []).includes(kind));
  const hasKind = (kind, now) => live(now).some((e) => carries(e, kind) && kindActive(e, kind, now));
  function kindActive(e, kind, now) {
    if (!e.kinds.includes('falseAngel')) return true;
    // 광명의 천사: disguiseMs 동안 천사 모습 → 그 뒤 curseKinds 저주
    const curse = e.params.curseKinds ?? [];
    return now >= e.startAt + (e.params.disguiseMs ?? 0) && (kind === 'falseAngel' || curse.includes(kind));
  }
  const removeWhere = (pred) => {
    const removed = active.filter(pred);
    active = active.filter((e) => !pred(e));
    return removed.map((e) => e.spiritId);
  };

  return {
    // FR-027~030 공격의 영 효과 시작. 보드 조작이 필요한 즉시형·줄 단위형은 board 요청으로 돌려준다
    // @returns {{ spiritId, category, board: null | {type:'locustHoles', columns:number[]} | {type:'leadRow', rows:number, clearsToExpire:number} }}
    applySpirit(attack, now) {
      const def = spirits.get(attack?.spiritId);
      if (!def) return null;
      const params = { ...(def.effect.params ?? {}), ...(attack.params ?? {}) };
      const kinds = def.effect.kinds.slice();
      let board = null;
      if (kinds.includes('locustHoles')) board = { type: 'locustHoles', columns: Array.isArray(params.columns) ? params.columns : [] };
      if (kinds.includes('leadRow')) board = { type: 'leadRow', rows: params.rows ?? 1, clearsToExpire: params.clearsToExpire ?? 0 };
      const lineBased = kinds.some((k) => LINE_BASED_KINDS.includes(k));
      const instant = kinds.every((k) => INSTANT_KINDS.includes(k));
      if (!instant) {
        const duration = Number.isInteger(attack.duration) && attack.duration > 0 ? attack.duration : def.effect.durationMs;
        active = active.filter((e) => e.spiritId !== def.id); // 같은 효과는 겹치지 않는다 (FR-031 — 새 것으로 교체)
        active.push({
          spiritId: def.id, category: def.category, kinds, startAt: now, endAt: lineBased ? null : now + duration, params,
          fakeQueue: Array.from({ length: FAKE_QUEUE_LENGTH }, () => 1 + Math.floor(rand() * PIECE_TYPES.length)),
          ghostOffset: kinds.includes('wrongGhost')
            ? (rand() < 0.5 ? -1 : 1) * (params.columnOffset ?? 0)
            : FAKE_GHOST_OFFSETS[Math.floor(rand() * FAKE_GHOST_OFFSETS.length)],
          nextPushAt: now + (params.pushIntervalMs ?? 0),
        });
      }
      return { spiritId: def.id, category: def.category, board };
    },
    // FR-031 시간 만료 — 끝난 spiritId 목록 (EVT-28)
    expire(now) {
      return removeWhere((e) => e.endAt !== null && now >= e.endAt);
    },
    // API-255 spiritEnd — 서버가 끝을 알림
    end(spiritId) {
      return removeWhere((e) => e.spiritId === spiritId).length > 0;
    },
    // FR-035 스랍·FR-037 허리띠/신/투구 clearActive — 범주별 해제. 해제된 spiritId 목록
    clearCategories(categories) {
      const set = new Set(Array.isArray(categories) ? categories : []);
      return removeWhere((e) => set.has(e.category));
    },
    // FR-029 납 줄이 엔진에서 사라지면(4줄 삭제·스랍) 줄 단위 항목 정리
    syncLeadRows(leadCount) {
      return leadCount > 0 ? [] : removeWhere((e) => e.endAt === null);
    },
    // FR-029 이세벨·광명의 천사 — 좌우 반전
    isReversed(now) { return hasKind('reverseLR', now); },
    // FR-028 공중 권세 잡은 자 — 중력 배율
    gravityMultiplier(now) {
      const wind = live(now).find((e) => e.kinds.includes('wind'));
      return wind ? (wind.params.gravityMultiplier ?? 1) : 1;
    },
    // FR-028 바람 — 이번 프레임에 밀어야 할 칸 [dx, …] (pushIntervalMs마다 1칸, 방향은 서버 params.direction)
    windPushes(now) {
      const out = [];
      for (const e of live(now)) {
        const dx = WIND_DIR[e.params.direction];
        if (!e.kinds.includes('wind') || !dx || !(e.params.pushIntervalMs > 0)) continue;
        while (now >= e.nextPushAt) { out.push(dx); e.nextPushAt += e.params.pushIntervalMs; }
      }
      return out;
    },
    // FR-027 귀먹고 말 못하게 하는 귀신 — 미리보기 숨김
    isNextHidden(now) { return hasKind('hideNext', now); },
    // FR-027 거짓말하는 영 — 가짜 다음 블록 (표식 없음)
    nextView(realNext, now) {
      const liar = live(now).find((e) => e.kinds.includes('fakeNext'));
      return liar ? liar.fakeQueue.slice(0, realNext.length) : realNext;
    },
    // FR-027 가짜 고스트(거짓말하는 영)·틀린 고스트(점치는 귀신 ±2열) — 표시용 고스트
    ghostView(grid, activePiece, realGhost, now) {
      if (!activePiece) return realGhost;
      const liar = live(now).find((e) => e.kinds.includes('fakeGhost') || e.kinds.includes('wrongGhost'));
      if (!liar || !liar.ghostOffset) return realGhost;
      for (const off of [liar.ghostOffset, -liar.ghostOffset]) {
        const shifted = { ...activePiece, x: activePiece.x + off };
        if (fits(grid, shifted)) return ghostOf(grid, shifted);
      }
      return realGhost;
    },
    // HUD-10 칩 — HudState.me.activeSpirits
    activeList(now, leadRows = []) {
      return live(now).map((e) => ({
        spiritId: e.spiritId, category: e.category,
        remainingMs: e.endAt === null ? null : Math.max(0, e.endAt - now),
        clearsLeft: e.endAt === null ? (leadRows[0]?.clearsLeft ?? 0) : null,
      }));
    },
  };
}
