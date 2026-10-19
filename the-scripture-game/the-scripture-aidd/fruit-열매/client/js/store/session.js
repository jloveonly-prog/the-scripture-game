// session.js — 메모리 SessionStore(프로필·흐름·대전 세션·마지막 matchEnd·옵션 값)만
// TASK-061 | REQ-002 REQ-004 REQ-013 FR-012 FR-078 | API-002 API-010 API-019 API-030 |
// screen-vision 공통 셸 SessionStore·§3
// 메모리에만 둔다(새로고침하면 사라짐 — 경기 복귀 없음 N-02). 브라우저 저장은 store/guest.js의 `swt.guest` 하나뿐.
import { getSettings } from "./settings.js";

/**
 * @typedef {{ guestId: string, nickname: string, rating: number, roundsPlayed: number }} Profile
 * @typedef {{ mode: "random" | "invite" | "bot" | "practice" | null, botLevel: "easy" | "normal" | "hard",
 *   inviteAction: "create" | "join" | null, heroId: string | null }} Flow
 * @typedef {{ roomId: string, ticket: string, slot: number, mode: string, opponent: any }} Matched
 * @typedef {{ matched: Matched, room: any, start: any | null }} BattleSession
 */

/** 앱 하나의 SessionStore (screen-vision 공통 셸 "전역") */
export const session = {
  /** @type {Profile | null} API-002 응답 (경기 후 matchEnd.you.rating.after로 갱신) */
  profile: null,
  /** @type {string | null} 인증 토큰 (swt.guest — 메모리 사본) */
  token: null,
  /** @type {Flow} 흐름 상태 (로비 → 위인 → 대기) */
  flow: { mode: null, botLevel: "normal", inviteAction: null, heroId: null },
  /** @type {BattleSession | null} 대전 세션 (matched + 방 소켓 + 첫 start) */
  battle: null,
  /** @type {any | null} 마지막 matchEnd (SCR-006 진입 조건) */
  lastMatchEnd: null,
  /** @type {{ heroId: string | null, mode: string | null }} 마지막 경기의 내 위인·모드 (말씀 카드 엠블럼) */
  lastMatchMeta: { heroId: null, mode: null },
  /** 직전 메뉴 경로 (옵션 [← 뒤로]) */
  previousRoute: "#/lobby",
  /** 옵션 값 (store/settings.js 사본 — N-04 저장 안 함) */
  get options() {
    return getSettings();
  },
  /** 인증된 세션인가 (screen-vision §3) */
  get authed() {
    return !!(this.profile && this.token);
  },
};

/** API-002·API-001 결과로 프로필 저장 @param {string} token @param {any} data */
export function setProfile(token, data) {
  session.token = token;
  session.profile = {
    guestId: data.guestId, nickname: data.nickname, rating: data.rating,
    roundsPlayed: typeof data.roundsPlayed === "number" ? data.roundsPlayed : 0,
  };
}

/** 401·UNAUTHORIZED·이탈 — 세션 비움 (흐름 상태 포함) */
export function clearAuth() {
  session.token = null;
  session.profile = null;
  resetFlow();
  endBattle();
}

/** 로비에서 새 흐름 시작 */
export function resetFlow() {
  session.flow = { mode: null, botLevel: session.flow.botLevel, inviteAction: null, heroId: null };
}

/** API-010 matched 수신 → 대전 세션 시작 @param {Matched} matched @param {any} room room-socket */
export function beginBattle(matched, room) {
  session.battle = { matched, room, start: null };
}

/** 대전 세션 종료 — 방 소켓이 열려 있으면 닫는다 (이탈 = 서버가 FR-009 판정) */
export function endBattle() {
  const b = session.battle;
  session.battle = null;
  try {
    b?.room?.close();
  } catch (err) {
    console.error("방 소켓 닫기 실패", err);
  }
}

/** API-030 matchEnd 저장 + 레이팅 갱신 (SCR-006 화면 진입) @param {any} data */
export function saveMatchEnd(data) {
  session.lastMatchEnd = data;
  session.lastMatchMeta = { heroId: session.flow.heroId, mode: data?.mode ?? null };
  const after = data?.you?.rating?.after;
  if (session.profile && typeof after === "number") session.profile.rating = after;
}
