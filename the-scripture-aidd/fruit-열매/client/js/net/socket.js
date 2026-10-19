// TASK-060-1 · FR-008 · C-006 · D-30 — partysocket 래퍼·봉투 직렬화/해석·종료 코드 전달 (Matchmaker·GameRoom 공용)
// 재연결 정책은 호출자가 고른다: Matchmaker = 자동 재연결, GameRoom = 끔 (api-gate §4.3).
import ReconnectingWebSocket from 'partysocket/ws';
import { CLOSE_CODES, LIMITS, MSG_ERROR, encodeClientMessage } from './protocol.js';

/** 재연결하지 않는 서버 종료 코드 (정상 종료·인증 실패·자격 없음·방 없음·빈도 위반) */
const NO_RECONNECT_CODES = new Set([
  CLOSE_CODES.NORMAL, CLOSE_CODES.AUTH_FAILED, CLOSE_CODES.NOT_ELIGIBLE, CLOSE_CODES.ROOM_GONE, CLOSE_CODES.RATE_ABUSE,
]);

/** 이벤트 분배기 — 같은 type에 처리기 여러 개, 처리기 예외는 격리 (devguide §3.6) */
export function createEmitter() {
  const handlers = new Map();
  return {
    on(type, handler) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(handler);
      return () => handlers.get(type)?.delete(handler);
    },
    emit(type, ...args) {
      for (const handler of [...(handlers.get(type) ?? [])]) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[socket] handler for "${type}" failed`, err);
        }
      }
    },
    clear() { handlers.clear(); },
  };
}

// FR-008 같은 출처 WS 주소 (Vite 프록시 — devguide §7.11). 빌드 변수 VITE_SERVER_ORIGIN이 있으면 그 출처를 쓴다.
export function buildSocketUrl(path, loc = globalThis.location, serverOrigin = import.meta.env?.VITE_SERVER_ORIGIN) {
  if (serverOrigin) return `${String(serverOrigin).replace(/^http/, 'ws').replace(/\/$/, '')}${path}`;
  const scheme = loc?.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${loc?.host ?? 'localhost'}${path}`;
}

// D-30 S→C 봉투 해석 → { type, data } | { type:'error', error } | null(형식 위반 — 무시)
export function parseServerFrame(raw) {
  if (typeof raw !== 'string') return null;
  let frame = null;
  try {
    frame = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!frame || typeof frame !== 'object' || typeof frame.type !== 'string') return null;
  if (frame.type === MSG_ERROR) {
    const error = frame.error;
    if (!error || typeof error.code !== 'string') return null;
    return { type: MSG_ERROR, error: { code: error.code, message: String(error.message ?? ''), ref: String(error.ref ?? ''),
      ...(Number.isInteger(error.retryAfterMs) ? { retryAfterMs: error.retryAfterMs } : {}) } };
  }
  if (frame.success !== true || !frame.data || typeof frame.data !== 'object') return null;
  return { type: frame.type, data: frame.data };
}

/**
 * FR-008 소켓 열기 → { send(type,data), onOpen, onMessage, onClose, close(code), isOpen }.
 * onClose(handler(code, reason, { opened, errored })) — partysocket은 연결 오류를 합성 close(1000)로 알리므로
 * `errored`로 비정상 종료를 구별한다.
 */
export function openSocket(path, { reconnect = false, WebSocketImpl } = {}) {
  const emitter = createEmitter();
  let opened = false;
  let errored = false;
  let closedByUser = false;
  const options = {
    maxRetries: reconnect ? Number.POSITIVE_INFINITY : 0,
    shouldReconnectOnClose: (event) => reconnect && !closedByUser && !NO_RECONNECT_CODES.has(event.code),
    ...(WebSocketImpl ? { WebSocket: WebSocketImpl } : {}),
  };
  const ws = new ReconnectingWebSocket(buildSocketUrl(path), [], options);

  ws.addEventListener('open', () => {
    opened = true;
    errored = false;
    emitter.emit('open');
  });
  ws.addEventListener('message', (event) => {
    const frame = parseServerFrame(event.data);
    if (frame) emitter.emit('message', frame);
  });
  ws.addEventListener('error', () => { errored = true; });
  ws.addEventListener('close', (event) => {
    emitter.emit('close', event.code, event.reason ?? '', { opened, errored, byUser: closedByUser });
  });

  return {
    // D-30 C→S 봉투 `{type, data}` — 4096바이트 초과는 보내지 않는다 (api-gate §2.4)
    send(type, data = {}) {
      const text = encodeClientMessage(type, data);
      if (new TextEncoder().encode(text).length > LIMITS.MAX_FRAME_BYTES) {
        console.error(`[socket] frame "${type}" exceeds ${LIMITS.MAX_FRAME_BYTES} bytes — dropped`);
        return false;
      }
      try {
        ws.send(text);
        return true;
      } catch (err) {
        console.error(`[socket] send "${type}" failed`, err);
        return false;
      }
    },
    onOpen: (handler) => emitter.on('open', handler),
    onMessage: (handler) => emitter.on('message', handler),
    onClose: (handler) => emitter.on('close', handler),
    close(code = CLOSE_CODES.NORMAL) {
      closedByUser = true;
      try {
        ws.close(code);
      } catch (err) {
        console.error('[socket] close failed', err);
      }
    },
    get isOpen() { return ws.readyState === 1; },
  };
}
