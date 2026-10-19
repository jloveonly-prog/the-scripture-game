// TASK-060-1 · FR-006 · FR-008 · API-006 · API-201~262 · D4-17 — GameRoom 소켓 (RoomConnection — devguide §7.7)
// 자동 재연결하지 않는다 (대전 중 끊김 = 이탈, api-gate §4.3·N-02). seq는 state·clear·topout 공유 카운터로 1부터 엄격 증가.
import { MSG_ERROR, PATTERNS, ROOM_C2S, ROOM_S2C, TIMING } from './protocol.js';
import { createEmitter, openSocket } from './socket.js';

/** sendSequenced 대상 (api-gate §2.6 seq 공유 카운터) */
const SEQUENCED_TYPES = new Set([ROOM_C2S.STATE, ROOM_C2S.CLEAR, ROOM_C2S.TOPOUT]);
/** state 스냅샷 필드 화이트리스트 (API-203 — 추가 필드는 서버가 INVALID_MESSAGE로 거부) */
const STATE_FIELDS = ['board', 'active', 'score', 'garbageIn'];

/** start 수신 시 서버↔로컬 시각 오프셋 추정: (startAt − countdown) ≈ 서버 송신 시각 (devguide §7.7) */
export function estimateOffsetMs(start, localNow) {
  if (!start || !Number.isFinite(start.startAt) || !Number.isFinite(start.countdown)) return null;
  return localNow - (start.startAt - start.countdown);
}

// FR-008 API-006 연결 + 열리면 join(API-201) 자동 송신 → RoomConnection
export function connectRoom({ roomId, token, heroId, socketFactory = openSocket, now = () => Date.now() }) {
  if (typeof roomId !== 'string' || !PATTERNS.UUID_V4.test(roomId)) throw new Error('INVALID_ROOM_ID');
  const emitter = createEmitter();
  const socket = socketFactory(`/ws/room/${roomId}`, { reconnect: false });
  let seq = 0;
  let offsetMs = 0;
  let streamTimer = null;

  socket.onOpen(() => socket.send(ROOM_C2S.JOIN, { token, heroId }));
  socket.onMessage((frame) => {
    if (frame.type === MSG_ERROR) {
      emitter.emit(MSG_ERROR, frame.error);
      return;
    }
    if (frame.type === ROOM_S2C.START) {
      const offset = estimateOffsetMs(frame.data, now());
      if (offset !== null) offsetMs = offset;
    }
    emitter.emit(frame.type, frame.data);
  });
  socket.onClose((code, reason, info) => {
    stopStream();
    emitter.emit('__close', code, reason, info);
  });

  function stopStream() {
    if (streamTimer !== null) clearInterval(streamTimer);
    streamTimer = null;
  }

  function sendSequenced(type, data = {}) {
    if (!SEQUENCED_TYPES.has(type)) throw new Error(`NOT_SEQUENCED:${type}`);
    seq += 1;
    return socket.send(type, { ...data, seq });
  }

  return {
    /** type: ROOM_S2C 값 또는 'error' — handler(data) / handler(errorObj) */
    on: (type, handler) => emitter.on(type, handler),
    onClose: (handler) => emitter.on('__close', handler),
    send(type, data = {}) {
      if (SEQUENCED_TYPES.has(type)) return sendSequenced(type, data);
      return socket.send(type, data);
    },
    sendSequenced,
    // FR-006 12Hz state 스트림 (TIMING.STATE_INTERVAL_MS) — getSnapshot()이 null이면 그 회차 건너뜀
    startStateStream(getSnapshot) {
      stopStream();
      streamTimer = setInterval(() => {
        try {
          const snap = getSnapshot();
          if (!snap) return;
          const data = {};
          for (const key of STATE_FIELDS) data[key] = snap[key];
          sendSequenced(ROOM_C2S.STATE, data);
        } catch (err) {
          console.error('[room-client] state snapshot failed', err);
        }
      }, TIMING.STATE_INTERVAL_MS);
    },
    stopStateStream: stopStream,
    toLocalTime: (serverEpochMs) => serverEpochMs + offsetMs,
    close() {
      stopStream();
      socket.close();
    },
  };
}
