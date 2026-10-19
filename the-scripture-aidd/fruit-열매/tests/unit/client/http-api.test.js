// TASK-060-1 · FR-012 · FR-069 · FR-071 · API-001~004 · FR-075 — HTTP 클라이언트 요청 형식·성공/실패 봉투·네트워크 실패
import { describe, expect, it, vi } from 'vitest';
import { apiUrl, createGuest, getMatches, getMe, getRankings, isAuthFailure } from '../../../client/js/net/http-api.js';

function fakeFetch(status, body, { invalidJson = false } = {}) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => { if (invalidJson) throw new SyntaxError('bad'); return body; },
  }));
}
const TOKEN = 'A'.repeat(43);

describe('http-api', () => {
  it('API-001 POST /api/guest 본문은 nickname 1개 (봉인 제4계명)', async () => {
    const fetchImpl = fakeFetch(201, { success: true, data: { guestId: 'g', nickname: '다윗', token: TOKEN, rating: 1000 } });
    const result = await createGuest('다윗', { fetchImpl });
    expect(result).toMatchObject({ ok: true, status: 201, data: { nickname: '다윗' } });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/guest');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ nickname: '다윗' });
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('API-002 Bearer 토큰 헤더', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: { guestId: 'g', nickname: 'n', rating: 1016 } });
    await getMe(TOKEN, { fetchImpl });
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('API-003 page·size 쿼리와 meta 전달', async () => {
    const meta = { page: 2, size: 20, totalCount: 37, totalPages: 2 };
    const fetchImpl = fakeFetch(200, { success: true, data: [], meta });
    const result = await getMatches(TOKEN, { page: 2, size: 20 }, { fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/matches?page=2&size=20');
    expect(result.meta).toEqual(meta);
  });

  it('409 NICKNAME_TAKEN → 사용자 문구는 protocol ERRORS 표', async () => {
    const fetchImpl = fakeFetch(409, { success: false, error: { code: 'NICKNAME_TAKEN', message: 'server text' } });
    const result = await createGuest('다윗', { fetchImpl });
    expect(result).toEqual({ ok: false, status: 409, code: 'NICKNAME_TAKEN', message: '이미 사용 중인 닉네임입니다.', network: false });
  });

  it('모르는 코드·JSON 아님 → INTERNAL_ERROR 문구', async () => {
    const r1 = await getRankings(TOKEN, { fetchImpl: fakeFetch(500, { success: false, error: { code: 'WHAT' } }) });
    expect(r1.code).toBe('INTERNAL_ERROR');
    const r2 = await getRankings(TOKEN, { fetchImpl: fakeFetch(502, null, { invalidJson: true }) });
    expect(r2).toMatchObject({ ok: false, status: 502, code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도하세요.' });
  });

  it('네트워크 실패 → network: true (ConnectionError 표시용)', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await getMe(TOKEN, { fetchImpl });
    expect(result).toMatchObject({ ok: false, status: 0, network: true });
  });

  it('401은 인증 실패로 판정', async () => {
    const result = await getMe(TOKEN, { fetchImpl: fakeFetch(401, { success: false, error: { code: 'INVALID_TOKEN', message: '' } }) });
    expect(isAuthFailure(result)).toBe(true);
    expect(isAuthFailure({ ok: false, status: 503 })).toBe(false);
  });

  it('VITE_SERVER_ORIGIN이 있으면 앞에 붙인다', () => {
    expect(apiUrl('/api/rankings', 'https://swt.example.workers.dev/')).toBe('https://swt.example.workers.dev/api/rankings');
    expect(apiUrl('/api/rankings', '')).toBe('/api/rankings');
  });
});
