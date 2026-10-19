// room-socket.js — 방 소켓 연결·송신 8종·수신 13종 콜백 분배만
// TASK-062-2 | REQ-001 REQ-005 REQ-006 FR-008 C-006 | API-006 API-011~API-031 | D-20 | OQ #18
// 기본 WebSocket — 재연결 없음(끊김 = 이탈, N-02 미승격). seq는 연결 전체에서 증가(state·clear·topout 공통 — API-012).
// 수신 처리기가 아직 없으면(대기 화면 → 대전 화면 전환 사이) 메시지를 순서대로 모아 두었다가 넘긴다.
import { wsUrl } from "./lobby-socket.js";

/** API-019~API-031 수신 13종 */
export const ROOM_IN = Object.freeze(["start", "opponentState", "attack", "garbage", "effect", "status", "reject",
  "quiz", "quizResult", "reaction", "roundEnd", "matchEnd", "error"]);

/**
 * API-006 방 소켓 연결 + API-011 ready(token·ticket — rules.net.readyTimeoutMs 안, 연결 즉시)
 * @param {{ roomId: string, token: string, ticket: string,
 *   onClose?: (info: { code: number, reason: string, error: { code: string, message: string } | null,
 *     ended: boolean }) => void }} o
 */
export function connectRoom(o) {
  const ws = new WebSocket(wsUrl(`/ws/room/${encodeURIComponent(o.roomId)}`));
  let seq = 0;
  let ended = false;
  /** @type {{ code: string, message: string } | null} */ let lastError = null;
  /** @type {((type: string, data: any) => void) | null} */ let handler = null;
  /** @type {Array<[string, any]>} */ const buffer = [];
  let onClose = o.onClose ?? null;

  /** @param {string} type @param {any} data */
  function deliver(type, data) {
    if (!handler) {
      buffer.push([type, data]);
      return;
    }
    try {
      handler(type, data);
    } catch (err) {
      console.error(`방 메시지 ${type} 처리 실패`, err);
    }
  }

  /** WS 공통 봉투 @param {string} type @param {any} data */
  function send(type, data) {
    try {
      if (ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ type, data }));
      return true;
    } catch (err) {
      console.error(`방 송신 ${type} 실패`, err);
      return false;
    }
  }

  ws.addEventListener("open", () => send("ready", { token: o.token, ticket: o.ticket }));
  ws.addEventListener("message", (ev) => {
    let msg;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    if (!msg || !ROOM_IN.includes(msg.type)) return;
    if (msg.type === "error") {
      lastError = msg.error ?? { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." };
      deliver("error", lastError);
      return;
    }
    if (msg.type === "matchEnd") ended = true;
    deliver(msg.type, msg.data);
  });
  ws.addEventListener("close", (ev) => {
    try {
      onClose?.({ code: ev.code, reason: ev.reason, error: lastError, ended });
    } catch (err) {
      console.error("방 소켓 종료 처리 실패", err);
    }
  });

  return {
    /** 수신 처리기 지정 — null이면 이후 메시지를 모아 둔다 @param {((type: string, data: any) => void) | null} fn */
    listen(fn) {
      handler = fn;
      while (handler && buffer.length) {
        const [type, data] = /** @type {[string, any]} */ (buffer.shift());
        deliver(type, data);
      }
    },
    /** 종료 콜백 교체 (대기 화면 → 대전 화면) @param {typeof onClose} fn */
    onClose(fn) {
      onClose = fn;
    },
    get open() {
      return ws.readyState === WebSocket.OPEN;
    },
    get ended() {
      return ended;
    },
    /** API-012 state (seq 자동) @param {{ board: string, active: any, hold: string | null, score: number,
     *   combo: number, pieceCount: number }} d */
    state: (d) => send("state", { seq: ++seq, ...d }),
    /** API-013 clear (seq 자동) @param {any} d */
    clear: (d) => send("clear", { seq: ++seq, ...d }),
    /** API-014 skill @param {"hero" | "angel"} kind @param {string} skillId */
    skill: (kind, skillId) => send("skill", { kind, skillId }),
    /** API-015 armor @param {string} armorId */
    armor: (armorId) => send("armor", { armorId }),
    /** API-016 answer @param {string} quizId @param {number} choice */
    answer: (quizId, choice) => send("answer", { quizId, choice }),
    /** API-017 reaction @param {string} reactionId */
    reaction: (reactionId) => send("reaction", { reactionId }),
    /** API-018 topout (seq 자동) @param {number} pieceCount @param {boolean} voluntary */
    topout: (pieceCount, voluntary) => send("topout", { seq: ++seq, pieceCount, voluntary }),
    /** 이탈 확인 [나가기] — 소켓 닫기 = 서버 이탈 판정(FR-009, D3-13) */
    close() {
      onClose = null;
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close(1000, "leave");
      } catch (err) {
        console.error("방 소켓 닫기 실패", err);
      }
    },
  };
}
