// TASK-032-3 · NFR-003 · C-009 · R-08 · REQ-017 — parseClientFrame: 크기·JSON·봉투·type·필드 타입·범위·추가 필드 거부
import { describe, expect, it } from 'vitest';
import { parseClientFrame } from '../../../worker/src/protocol/validate';

const TOKEN = 'Qm9vayBvZiB0aGUgQ292ZW5hbnQgLSBFeG9kdXMgMjQ';
const frame = (type: string, data: unknown): string => JSON.stringify({ type, data });
const BOARD = '0'.repeat(190) + '8888888880';

describe('봉투 (api-gate §2.4)', () => {
  it('바이너리·4096바이트 초과·JSON 아님·봉투 형식 위반은 INVALID_MESSAGE', () => {
    expect(parseClientFrame('room', new ArrayBuffer(4))).toEqual({ ok: false, code: 'INVALID_MESSAGE', ref: '' });
    expect(parseClientFrame('room', frame('ready', { pad: 'x'.repeat(5000) }))).toMatchObject({ ok: false, ref: '' });
    expect(parseClientFrame('room', '{not json')).toMatchObject({ ok: false, ref: '' });
    expect(parseClientFrame('room', '[]')).toMatchObject({ ok: false });
    expect(parseClientFrame('room', JSON.stringify({ type: 'ready' }))).toMatchObject({ ok: false, ref: 'ready' });
    expect(parseClientFrame('room', JSON.stringify({ type: 'ready', data: {}, extra: 1 }))).toMatchObject({ ok: false, ref: 'ready' });
    expect(parseClientFrame('room', frame('ready', []))).toMatchObject({ ok: false, ref: 'ready' });
  });

  it('채널에 없는 type 거부 (createRoom은 room 소켓에서 불가)', () => {
    expect(parseClientFrame('room', frame('createRoom', { token: TOKEN, heroId: 'david' }))).toMatchObject({ ok: false, ref: '' });
    expect(parseClientFrame('matchmaker', frame('state', {}))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('__proto__', {}))).toMatchObject({ ok: false });
  });

  it('추가 필드 거부 (자유 텍스트 경로 차단 — C-009)', () => {
    expect(parseClientFrame('room', frame('ready', { chat: 'hi' }))).toMatchObject({ ok: false, ref: 'ready' });
    expect(parseClientFrame('room', frame('reaction', { reactionId: 'amen', text: 'hi' }))).toMatchObject({ ok: false });
  });
});

describe('Matchmaker join (API-101)', () => {
  it('random 정상 + 문자열 trim', () => {
    expect(parseClientFrame('matchmaker', frame('join', { token: TOKEN, heroId: ' david ', mode: 'random' })))
      .toEqual({ ok: true, type: 'join', data: { token: TOKEN, heroId: 'david', mode: 'random' } });
  });

  it('invite는 roomCode 필수(대문자 정규화), 다른 모드에서는 금지', () => {
    expect(parseClientFrame('matchmaker', frame('join', { token: TOKEN, heroId: 'paul', mode: 'invite', roomCode: 'k7px4q' })))
      .toMatchObject({ ok: true, data: { roomCode: 'K7PX4Q' } });
    expect(parseClientFrame('matchmaker', frame('join', { token: TOKEN, heroId: 'paul', mode: 'invite' }))).toMatchObject({ ok: false });
    expect(parseClientFrame('matchmaker', frame('join', { token: TOKEN, heroId: 'paul', mode: 'random', roomCode: 'K7PX4Q' }))).toMatchObject({ ok: false });
    expect(parseClientFrame('matchmaker', frame('join', { token: TOKEN, heroId: 'paul', mode: 'invite', roomCode: 'K7PX40' }))).toMatchObject({ ok: false });
  });

  it('bot은 botLevel 필수, 그 외 금지', () => {
    expect(parseClientFrame('matchmaker', frame('join', { token: TOKEN, heroId: 'peter', mode: 'bot', botLevel: 'hard' }))).toMatchObject({ ok: true });
    expect(parseClientFrame('matchmaker', frame('join', { token: TOKEN, heroId: 'peter', mode: 'bot' }))).toMatchObject({ ok: false });
    expect(parseClientFrame('matchmaker', frame('join', { token: TOKEN, heroId: 'peter', mode: 'practice', botLevel: 'easy' }))).toMatchObject({ ok: false });
  });

  it('토큰 형식·위인·모드 위반', () => {
    expect(parseClientFrame('matchmaker', frame('join', { token: 'x', heroId: 'david', mode: 'random' }))).toMatchObject({ ok: false, ref: 'join' });
    expect(parseClientFrame('matchmaker', frame('join', { token: TOKEN, heroId: 'moses', mode: 'random' }))).toMatchObject({ ok: false });
    expect(parseClientFrame('matchmaker', frame('join', { token: TOKEN, heroId: 'david', mode: 'ranked' }))).toMatchObject({ ok: false });
    expect(parseClientFrame('matchmaker', frame('cancel', {}))).toMatchObject({ ok: true, type: 'cancel', data: {} });
  });
});

describe('GameRoom 메시지 (API-201~210)', () => {
  it('state: 보드 200자 CODE-009, active 범위·null', () => {
    const ok = { seq: 1, board: BOARD, active: { type: 3, rot: 0, x: 4, y: -2 }, score: 100, garbageIn: 0 };
    expect(parseClientFrame('room', frame('state', ok))).toMatchObject({ ok: true, data: ok });
    expect(parseClientFrame('room', frame('state', { ...ok, active: null }))).toMatchObject({ ok: true });
    expect(parseClientFrame('room', frame('state', { ...ok, board: BOARD.slice(1) }))).toMatchObject({ ok: false, ref: 'state' });
    expect(parseClientFrame('room', frame('state', { ...ok, board: 'z' + BOARD.slice(1) }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('state', { ...ok, active: { type: 8, rot: 0, x: 0, y: 0 } }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('state', { ...ok, active: { type: 1, rot: 0, x: 0, y: 0, z: 1 } }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('state', { ...ok, seq: 1.5 }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('state', { ...ok, seq: 2 ** 31 }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('state', { ...ok, score: 100000000 }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('state', { ...ok, garbageIn: -1 }))).toMatchObject({ ok: false });
  });

  it('clear: 범위·R-08(tspin은 lines ≤ 3)·specials 형식', () => {
    const ok = { seq: 2, lines: 4, combo: 0, b2b: true, tspin: false, pieceCount: 57,
      specials: [{ kind: 'armor', pieceIndex: 51, armorId: 'shield_of_faith' }, { kind: 'word', pieceIndex: 9 }] };
    expect(parseClientFrame('room', frame('clear', ok))).toMatchObject({ ok: true, data: ok });
    expect(parseClientFrame('room', frame('clear', { ...ok, tspin: true }))).toMatchObject({ ok: false, ref: 'clear' });
    expect(parseClientFrame('room', frame('clear', { ...ok, lines: 3, tspin: true }))).toMatchObject({ ok: true });
    expect(parseClientFrame('room', frame('clear', { ...ok, lines: 0 }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('clear', { ...ok, combo: 100 }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('clear', { ...ok, b2b: 'true' }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('clear', { ...ok, specials: [{ kind: 'word', pieceIndex: 58 }] }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('clear', { ...ok, specials: [{ kind: 'armor', pieceIndex: 1 }] }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('clear', { ...ok, specials: [{ kind: 'manna', pieceIndex: 1, armorId: 'shield_of_faith' }] }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('clear', { ...ok, specials: Array(5).fill({ kind: 'word', pieceIndex: 1 }) }))).toMatchObject({ ok: false });
    const { specials: _omit, ...missing } = ok;
    expect(parseClientFrame('room', frame('clear', missing))).toMatchObject({ ok: false });
  });

  it('skill·armor·topout·quizAnswer·reaction·quit·join', () => {
    expect(parseClientFrame('room', frame('skill', { skillId: 'hero_david' }))).toMatchObject({ ok: true });
    expect(parseClientFrame('room', frame('skill', { skillId: 'angel_ministering_spirits' }))).toMatchObject({ ok: true });
    expect(parseClientFrame('room', frame('skill', { skillId: 'angel_lucifer' }))).toMatchObject({ ok: false, ref: 'skill' });
    expect(parseClientFrame('room', frame('armor', { armorId: 'helmet_of_salvation' }))).toMatchObject({ ok: true });
    expect(parseClientFrame('room', frame('armor', { armorId: 'cape' }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('topout', { seq: 9, pieceCount: 0 }))).toMatchObject({ ok: true });
    expect(parseClientFrame('room', frame('quizAnswer', { quizId: 'q001', choice: 3 }))).toMatchObject({ ok: true });
    expect(parseClientFrame('room', frame('quizAnswer', { quizId: 'q1', choice: 3 }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('quizAnswer', { quizId: 'q001', choice: 4 }))).toMatchObject({ ok: false });
    expect(parseClientFrame('room', frame('reaction', { reactionId: 'halo' }))).toMatchObject({ ok: true });
    expect(parseClientFrame('room', frame('reaction', { reactionId: 'lol' }))).toMatchObject({ ok: false, ref: 'reaction' });
    expect(parseClientFrame('room', frame('quit', {}))).toMatchObject({ ok: true });
    expect(parseClientFrame('room', frame('join', { token: TOKEN, heroId: 'solomon' }))).toMatchObject({ ok: true });
  });
});
