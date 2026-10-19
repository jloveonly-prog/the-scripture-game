// TASK-061 · FR-078 · screen-vision §3 · FR-075 — 해시 경로 해석·부팅 가드·화면별 진입 가드·흐름 상태 폐기
import { describe, expect, it, vi } from 'vitest';
import { ROUTES, bootTarget, createSession, guardRoute, parseRoute, resetFlow } from '../../../client/js/main.js';

const verified = (extra = {}) => ({ ...createSession(), verified: true, ...extra });

describe('parseRoute', () => {
  it('해시 9개를 화면 이름으로', () => {
    for (const [name, hash] of Object.entries(ROUTES)) expect(parseRoute(hash)).toBe(name);
    expect(Object.keys(ROUTES)).toHaveLength(9);
  });
  it.each(['', '#', '#/', '#/admin', '#/lobby/x', '#/Lobby', '#/constructor', '#/__proto__', null])('모르는 경로 → null: %s', (hash) => {
    expect(parseRoute(hash)).toBeNull();
  });
});

describe('guardRoute (screen-vision §3.2)', () => {
  it('미검증이면 어디든 SCR-001', () => {
    for (const name of Object.keys(ROUTES)) expect(guardRoute(name, createSession())).toBe('entry');
  });
  it('검증됨이면 SCR-001 진입 불가 → SCR-002', () => {
    expect(guardRoute('entry', verified())).toBe('lobby');
  });
  it('SCR-007~009·SCR-002는 인증만', () => {
    for (const name of ['lobby', 'records', 'ranking', 'options']) expect(guardRoute(name, verified())).toBe(name);
  });
  it('SCR-003은 mode 선택 필요', () => {
    expect(guardRoute('hero', verified())).toBe('lobby');
    expect(guardRoute('hero', verified({ mode: 'bot' }))).toBe('hero');
  });
  it('SCR-004는 random·invite + heroId + 소켓(친구 상태 C는 소켓 전)', () => {
    expect(guardRoute('matching', verified({ mode: 'random', heroId: 'david' }))).toBe('lobby');
    expect(guardRoute('matching', verified({ mode: 'random', heroId: 'david', lobby: {} }))).toBe('matching');
    expect(guardRoute('matching', verified({ mode: 'invite', inviteRole: 'friend', heroId: 'paul' }))).toBe('matching');
    expect(guardRoute('matching', verified({ mode: 'bot', heroId: 'paul', lobby: {} }))).toBe('lobby');
    expect(guardRoute('matching', verified({ mode: 'random', lobby: {} }))).toBe('lobby');
  });
  it('SCR-005는 matched.roomId + 경기 미종료, SCR-006은 matchEnd 데이터', () => {
    expect(guardRoute('battle', verified())).toBe('lobby');
    expect(guardRoute('battle', verified({ matched: { roomId: 'r' } }))).toBe('battle');
    expect(guardRoute('battle', verified({ matched: { roomId: 'r' }, matchEnd: {} }))).toBe('lobby');
    expect(guardRoute('result', verified())).toBe('lobby');
    expect(guardRoute('result', verified({ matchEnd: { data: {} } }))).toBe('result');
  });
  it('알 수 없는 이름 → SCR-002', () => {
    expect(guardRoute(null, verified())).toBe('lobby');
  });
});

describe('부팅 가드 (§3.1)·흐름 폐기', () => {
  it('직접 진입 허용 경로만 유지, 흐름 화면·모르는 경로는 SCR-002 (새로고침 = 세션 메모리 비움)', () => {
    expect(bootTarget('records')).toBe('records');
    expect(bootTarget('options')).toBe('options');
    for (const name of ['hero', 'matching', 'battle', 'result', 'entry', null]) expect(bootTarget(name)).toBe('lobby');
  });
  it('resetFlow는 Matchmaker 소켓을 닫고 흐름 상태를 비운다', () => {
    const close = vi.fn();
    const session = verified({ mode: 'random', heroId: 'david', lobby: { close }, matched: { roomId: 'r' }, matchEnd: {} });
    resetFlow(session);
    expect(close).toHaveBeenCalledOnce();
    expect(session).toMatchObject({ verified: true, mode: null, heroId: null, lobby: null, matched: null, matchEnd: null });
  });
});
