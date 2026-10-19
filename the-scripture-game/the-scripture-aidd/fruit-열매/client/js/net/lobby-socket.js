// lobby-socket.js — 로비 소켓 연결·join/cancel 송신·waiting/matched/error 수신 콜백만
// TASK-062-2 | REQ-004 REQ-005 REQ-006 FR-008 FR-018~FR-021 FR-023 C-006 | API-005 API-007~API-010 API-031 | D-20
// partysocket 자동 재연결은 로비 소켓만(OQ #18). 연결될 때마다 net.joinTimeoutMs 안에 `join`을 보낸다(연결 즉시).
// 비정상 종료 3회 연속 실패면 포기(UC-003 E1). 서버 `error`는 소켓 종료이므로 재연결하지 않는다(api-gate §4.3).
import ReconnectingWebSocket from "partysocket/ws";

/** UC-003 E1 "3회 실패 시 서버에 연결할 수 없습니다" */
const MAX_FAILURES = 3;

/** 상대 경로 → ws(s) URL (Vite 프록시 /ws — D-03) @param {string} path */
export function wsUrl(path) {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}${path}`;
}

/**
 * @param {{ join: { token: string, heroId: string, mode: string, roomCode?: string, botLevel?: string },
 *   onWaiting?: (d: any) => void, onMatched?: (d: any) => void,
 *   onError?: (e: { code: string, message: string }) => void, onFail?: () => void,
 *   onClosed?: (code: number, reason: string) => void }} o
 */
export function connectLobby(o) {
  let fatal = false;
  let finished = false;
  let failures = 0;
  const ws = new ReconnectingWebSocket(wsUrl("/ws/lobby"), undefined, {
    maxRetries: MAX_FAILURES, maxEnqueuedMessages: 0, minReconnectionDelay: 600, maxReconnectionDelay: 3000,
    // 정상 종료(1000 matched·cancelled)·서버 오류 종료(4xxx·1011)는 재연결하지 않는다
    shouldReconnectOnClose: (e) => !fatal && !finished && e.code !== 1000 && e.code < 4000 && e.code !== 1011,
  });

  /** WS 공통 봉투 {type, data} @param {string} type @param {any} data */
  function send(type, data) {
    try {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, data }));
      return ws.readyState === ws.OPEN;
    } catch (err) {
      console.error("로비 송신 실패", err);
      return false;
    }
  }

  ws.addEventListener("open", () => {
    failures = 0;
    // API-007 join — 연결마다(재연결 포함) 즉시 전송 (API-005 rules.net.joinTimeoutMs 안)
    send("join", o.join);
  });
  ws.addEventListener("message", (ev) => {
    let msg;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    try {
      if (msg.type === "waiting") o.onWaiting?.(msg.data);
      else if (msg.type === "matched") {
        finished = true;
        o.onMatched?.(msg.data);
      } else if (msg.type === "error") {
        fatal = true;
        o.onError?.(msg.error ?? { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." });
      }
    } catch (err) {
      console.error("로비 메시지 처리 실패", err);
    }
  });
  ws.addEventListener("close", (ev) => {
    if (fatal || finished || ev.code === 1000) {
      ws.close();
      o.onClosed?.(ev.code, ev.reason);
      return;
    }
    failures += 1;
    if (failures >= MAX_FAILURES) {
      finished = true;
      ws.close();
      o.onFail?.();
    }
  });

  return {
    /** API-008 cancel — 서버가 Close 1000 cancelled */
    cancel() {
      finished = true;
      if (!send("cancel", {})) ws.close();
    },
    /** 화면 이탈 — 소켓 정리(서버 webSocketClose가 대기열 정리) */
    close() {
      finished = true;
      try {
        ws.close(1000, "client_leave");
      } catch (err) {
        console.error("로비 소켓 닫기 실패", err);
      }
    },
  };
}
