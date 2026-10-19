// TASK-060-1 · FR-018~021 · FR-023 · API-005 · API-101~154 — Matchmaker 소켓 (자동 재연결 — api-gate §4.3)
// 대기 중 끊기면 서버가 이미 대기열에서 제거하므로 화면은 로비로 돌아간다 (UC-003 E1) — `dropped` 이벤트로 알린다.
import { CLOSE_CODES, MM_C2S, MM_S2C, MSG_ERROR } from './protocol.js';
import { createEmitter, openSocket } from './socket.js';

// FR-008 join(API-101) data 구성 — roomCode는 invite에서만, botLevel은 bot에서만 (그 외 모드에서 금지 — api-gate §3)
export function buildJoinData({ token, heroId, mode, botLevel, roomCode }) {
  const data = { token, heroId, mode };
  if (mode === 'invite') data.roomCode = String(roomCode ?? '').toUpperCase();
  if (mode === 'bot') data.botLevel = botLevel;
  return data;
}

// FR-018~020 Matchmaker 연결 → LobbyConnection
export function connectLobby({ socketFactory = openSocket } = {}) {
  const emitter = createEmitter();
  const socket = socketFactory('/ws/matchmaker', { reconnect: true });
  const pending = [];
  let open = false;
  let finished = false;

  socket.onOpen(() => {
    open = true;
    while (pending.length) {
      const [type, data] = pending.shift();
      socket.send(type, data);
    }
  });
  socket.onMessage((frame) => {
    if (frame.type === MSG_ERROR) emitter.emit(MSG_ERROR, frame.error);
    else emitter.emit(frame.type, frame.data);
  });
  socket.onClose((code, reason, info) => {
    const wasOpen = open;
    open = false;
    if (finished || info?.byUser) return;
    if (code === CLOSE_CODES.AUTH_FAILED) emitter.emit('authFailed', code);
    else if (wasOpen || info?.errored || code !== CLOSE_CODES.NORMAL) emitter.emit('dropped', code);
  });

  function sendWhenOpen(type, data) {
    if (open) socket.send(type, data);
    else pending.push([type, data]);
  }

  return {
    on: (type, handler) => emitter.on(type, handler),
    join: (request) => sendWhenOpen(MM_C2S.JOIN, buildJoinData(request)),
    createRoom: ({ token, heroId }) => sendWhenOpen(MM_C2S.CREATE_ROOM, { token, heroId }),
    cancel: () => sendWhenOpen(MM_C2S.CANCEL, {}),
    close() {
      finished = true;
      pending.length = 0;
      socket.close(CLOSE_CODES.NORMAL);
      emitter.clear();
    },
  };
}

/**
 * FR-018·019·021·023 매칭 요청 1회 → 첫 응답까지 기다린다.
 * request.inviteRole === 'host'면 createRoom(API-102), 그 밖은 join(API-101).
 * resolve { type: 'queued'|'roomCreated'|'matched', data } / reject { code, message } (error 또는 연결 끊김 'DROPPED'·'AUTH')
 */
export function startMatchmaking(lobby, request) {
  return new Promise((resolve, reject) => {
    const offs = [];
    const done = (fn, value) => {
      offs.forEach((off) => off());
      fn(value);
    };
    for (const type of [MM_S2C.QUEUED, MM_S2C.ROOM_CREATED, MM_S2C.MATCHED]) {
      offs.push(lobby.on(type, (data) => done(resolve, { type, data })));
    }
    offs.push(lobby.on(MSG_ERROR, (error) => done(reject, error)));
    offs.push(lobby.on('dropped', () => done(reject, { code: 'DROPPED', message: '' })));
    offs.push(lobby.on('authFailed', () => done(reject, { code: 'INVALID_TOKEN', message: '' })));
    if (request.inviteRole === 'host') lobby.createRoom(request);
    else lobby.join(request);
  });
}
