// TASK-060-1 · FR-006 · FR-008 · FR-018~020 · D4-17 · FR-075 — 봉투 해석, RoomConnection(join·seq·12Hz·시각 오프셋), Matchmaker 요청
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSocketUrl, createEmitter, parseServerFrame } from '../../../client/js/net/socket.js';
import { connectRoom, estimateOffsetMs } from '../../../client/js/net/room-client.js';
import { buildJoinData, connectLobby, startMatchmaking } from '../../../client/js/net/lobby-client.js';

const ROOM_ID = 'c2b7e1d4-9f3a-4e6b-8d20-5a1c7f9e3b46';
const TOKEN = 'T'.repeat(43);

/** openSocket 대역 — 보낸 프레임 기록, 열기·수신·종료를 테스트가 일으킨다 */
function fakeSocketFactory() {
  const state = { sent: [], path: null, options: null, closed: false };
  const em = createEmitter();
  const factory = (path, options) => {
    state.path = path;
    state.options = options;
    return {
      send: (type, data) => { state.sent.push({ type, data }); return true; },
      onOpen: (h) => em.on('open', h),
      onMessage: (h) => em.on('message', h),
      onClose: (h) => em.on('close', h),
      close: () => { state.closed = true; },
    };
  };
  return {
    factory, state,
    open: () => em.emit('open'),
    receive: (raw) => { const f = parseServerFrame(JSON.stringify(raw)); if (f) em.emit('message', f); },
    drop: (code, info = { opened: true, errored: false }) => em.emit('close', code, '', info),
  };
}

describe('parseServerFrame (D-30 봉투)', () => {
  it('성공 봉투 → {type,data}', () => {
    expect(parseServerFrame('{"type":"queued","success":true,"data":{"mode":"random","queuedAt":1}}')).toEqual({ type: 'queued', data: { mode: 'random', queuedAt: 1 } });
  });
  it('실패 봉투 → error 객체(retryAfterMs 보존)', () => {
    const frame = parseServerFrame(JSON.stringify({ type: 'error', success: false, error: { code: 'COOLDOWN', message: 'm', ref: 'skill', retryAfterMs: 8200 } }));
    expect(frame).toEqual({ type: 'error', error: { code: 'COOLDOWN', message: 'm', ref: 'skill', retryAfterMs: 8200 } });
  });
  it.each(['nope', '[]', '{"type":1}', '{"type":"start","success":false,"data":{}}', '{"type":"error","success":false}', 42])('형식 위반 무시: %s', (raw) => {
    expect(parseServerFrame(raw)).toBeNull();
  });
  it('같은 출처 ws 주소 / VITE_SERVER_ORIGIN', () => {
    expect(buildSocketUrl('/ws/matchmaker', { protocol: 'http:', host: 'localhost:5173' }, '')).toBe('ws://localhost:5173/ws/matchmaker');
    expect(buildSocketUrl('/ws/matchmaker', { protocol: 'https:', host: 'a.b' }, '')).toBe('wss://a.b/ws/matchmaker');
    expect(buildSocketUrl('/ws/room/x', null, 'https://w.example.dev')).toBe('wss://w.example.dev/ws/room/x');
  });
  it('emitter: 처리기 여러 개·off·예외 격리', () => {
    const em = createEmitter();
    const seen = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
    em.on('x', () => { throw new Error('boom'); });
    const off = em.on('x', (v) => seen.push(v));
    em.emit('x', 1);
    off();
    em.emit('x', 2);
    expect(seen).toEqual([1]);
  });
});

describe('RoomConnection (devguide §7.7)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('roomId 형식이 아니면 던진다', () => {
    expect(() => connectRoom({ roomId: '../x', token: TOKEN, heroId: 'david', socketFactory: fakeSocketFactory().factory })).toThrow('INVALID_ROOM_ID');
  });

  it('재연결 끔 + 열리면 join(token, heroId) 자동 송신', () => {
    const fake = fakeSocketFactory();
    connectRoom({ roomId: ROOM_ID, token: TOKEN, heroId: 'peter', socketFactory: fake.factory });
    expect(fake.state.path).toBe(`/ws/room/${ROOM_ID}`);
    expect(fake.state.options).toEqual({ reconnect: false });
    fake.open();
    expect(fake.state.sent).toEqual([{ type: 'join', data: { token: TOKEN, heroId: 'peter' } }]);
  });

  it('state·clear·topout 공유 seq는 1부터 엄격 증가, 그 밖은 seq 없음', () => {
    const fake = fakeSocketFactory();
    const room = connectRoom({ roomId: ROOM_ID, token: TOKEN, heroId: 'david', socketFactory: fake.factory });
    room.sendSequenced('clear', { lines: 4 });
    room.send('topout', { pieceCount: 9 });
    room.send('skill', { skillId: 'hero_david' });
    expect(fake.state.sent.map((m) => m.data.seq)).toEqual([1, 2, undefined]);
    expect(() => room.sendSequenced('skill', {})).toThrow();
  });

  it('12Hz state 스트림: 화이트리스트 필드만, null 스냅샷은 건너뜀, stop 후 중지', () => {
    const fake = fakeSocketFactory();
    const room = connectRoom({ roomId: ROOM_ID, token: TOKEN, heroId: 'david', socketFactory: fake.factory });
    let n = 0;
    room.startStateStream(() => (++n === 2 ? null : { board: '0'.repeat(200), active: null, score: n, garbageIn: 0, extra: 'x' }));
    vi.advanceTimersByTime(83 * 3);
    const states = fake.state.sent.filter((m) => m.type === 'state');
    expect(states).toHaveLength(2);
    expect(Object.keys(states[0].data).sort()).toEqual(['active', 'board', 'garbageIn', 'score', 'seq']);
    expect(states.map((s) => s.data.seq)).toEqual([1, 2]);
    room.stopStateStream();
    vi.advanceTimersByTime(1000);
    expect(fake.state.sent.filter((m) => m.type === 'state')).toHaveLength(2);
  });

  it('start 수신 시 시각 오프셋 추정 → toLocalTime, 처리기는 오프셋 갱신 후 호출', () => {
    const fake = fakeSocketFactory();
    const room = connectRoom({ roomId: ROOM_ID, token: TOKEN, heroId: 'david', socketFactory: fake.factory, now: () => 5000 });
    let local = null;
    room.on('start', (d) => { local = room.toLocalTime(d.startAt); });
    fake.receive({ type: 'start', success: true, data: { startAt: 103000, countdown: 3000, seed: 1, round: 1 } });
    expect(estimateOffsetMs({ startAt: 103000, countdown: 3000 }, 5000)).toBe(-95000);
    expect(local).toBe(8000);
    expect(estimateOffsetMs(null, 1)).toBeNull();
  });

  it('error는 error 객체로, 종료는 onClose(code, reason, info)로 전달하고 스트림을 멈춘다', () => {
    const fake = fakeSocketFactory();
    const room = connectRoom({ roomId: ROOM_ID, token: TOKEN, heroId: 'david', socketFactory: fake.factory });
    const errors = [];
    const closes = [];
    room.on('error', (e) => errors.push(e.code));
    room.on('error', (e) => errors.push(e.ref));
    room.onClose((code, _reason, info) => closes.push([code, info.opened]));
    room.startStateStream(() => ({ board: '', active: null, score: 0, garbageIn: 0 }));
    fake.receive({ type: 'error', success: false, error: { code: 'OPPONENT_LEFT', message: '상대가 나갔습니다.', ref: 'join' } });
    fake.drop(4003);
    vi.advanceTimersByTime(500);
    expect(errors).toEqual(['OPPONENT_LEFT', 'join']);
    expect(closes).toEqual([[4003, true]]);
    expect(fake.state.sent.filter((m) => m.type === 'state')).toHaveLength(0);
  });
});

describe('Matchmaker 클라이언트', () => {
  it('buildJoinData — roomCode는 invite만(대문자), botLevel은 bot만', () => {
    expect(buildJoinData({ token: TOKEN, heroId: 'david', mode: 'random', botLevel: 'easy', roomCode: 'abc' })).toEqual({ token: TOKEN, heroId: 'david', mode: 'random' });
    expect(buildJoinData({ token: TOKEN, heroId: 'paul', mode: 'invite', roomCode: 'k7px4q' })).toEqual({ token: TOKEN, heroId: 'paul', mode: 'invite', roomCode: 'K7PX4Q' });
    expect(buildJoinData({ token: TOKEN, heroId: 'paul', mode: 'bot', botLevel: 'hard' })).toEqual({ token: TOKEN, heroId: 'paul', mode: 'bot', botLevel: 'hard' });
  });

  it('자동 재연결 소켓 + 열리기 전 요청은 열린 뒤 송신', () => {
    const fake = fakeSocketFactory();
    const lobby = connectLobby({ socketFactory: fake.factory });
    expect(fake.state.options).toEqual({ reconnect: true });
    lobby.join({ token: TOKEN, heroId: 'david', mode: 'practice' });
    expect(fake.state.sent).toHaveLength(0);
    fake.open();
    expect(fake.state.sent).toEqual([{ type: 'join', data: { token: TOKEN, heroId: 'david', mode: 'practice' } }]);
  });

  it('startMatchmaking: queued로 resolve / 방장은 createRoom', async () => {
    const fake = fakeSocketFactory();
    const lobby = connectLobby({ socketFactory: fake.factory });
    fake.open();
    const pending = startMatchmaking(lobby, { token: TOKEN, heroId: 'david', mode: 'random' });
    fake.receive({ type: 'queued', success: true, data: { mode: 'random', queuedAt: 1 } });
    await expect(pending).resolves.toEqual({ type: 'queued', data: { mode: 'random', queuedAt: 1 } });
    const host = startMatchmaking(lobby, { token: TOKEN, heroId: 'paul', mode: 'invite', inviteRole: 'host' });
    expect(fake.state.sent[1]).toEqual({ type: 'createRoom', data: { token: TOKEN, heroId: 'paul' } });
    fake.receive({ type: 'roomCreated', success: true, data: { roomCode: 'K7PX4Q', roomId: ROOM_ID, expiresAt: 'x' } });
    await expect(host).resolves.toMatchObject({ type: 'roomCreated' });
  });

  it('startMatchmaking: error·끊김·4001은 reject', async () => {
    const fake = fakeSocketFactory();
    const lobby = connectLobby({ socketFactory: fake.factory });
    fake.open();
    const p1 = startMatchmaking(lobby, { token: TOKEN, heroId: 'david', mode: 'invite', roomCode: 'AAAAAA' });
    fake.receive({ type: 'error', success: false, error: { code: 'INVITE_NOT_FOUND', message: 'm', ref: 'join' } });
    await expect(p1).rejects.toMatchObject({ code: 'INVITE_NOT_FOUND' });
    const p2 = startMatchmaking(lobby, { token: TOKEN, heroId: 'david', mode: 'random' });
    fake.drop(1006, { opened: true, errored: true });
    await expect(p2).rejects.toMatchObject({ code: 'DROPPED' });
    const p3 = startMatchmaking(lobby, { token: TOKEN, heroId: 'david', mode: 'random' });
    fake.drop(4001);
    await expect(p3).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('사용자가 닫은 뒤에는 dropped를 알리지 않는다', () => {
    const fake = fakeSocketFactory();
    const lobby = connectLobby({ socketFactory: fake.factory });
    const seen = vi.fn();
    lobby.on('dropped', seen);
    fake.open();
    lobby.close();
    fake.drop(1000, { opened: true, errored: false, byUser: true });
    expect(seen).not.toHaveBeenCalled();
    expect(fake.state.closed).toBe(true);
  });
});
