// TASK-060-2 · FR-012 · NFR-008 · TBL-201 · FR-075 — 게스트 정보 저장·복원·형식 오류 삭제·닉네임 1차 검사
import { describe, expect, it, vi } from 'vitest';
import { GUEST_STORAGE_KEY, checkNickname, clearGuest, isValidGuest, loadGuest, saveGuest } from '../../../client/js/auth/guest-session.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    has: (k) => map.has(k),
    raw: (k) => map.get(k),
  };
}
const GUEST = { guestId: '3f6c0d2e-7a51-4b8e-9c1d-2a4f6e8b0c13', nickname: '다윗의물맷돌', token: 'Qm9vayBvZiB0aGUgQ292ZW5hbnQgLSBFeG9kdXMgMjQ' };

describe('guest-session (TBL-201 swt.guest)', () => {
  it('저장 후 복원하면 3키만 돌려준다', () => {
    const storage = memoryStorage();
    expect(saveGuest({ ...GUEST, rating: 1000 }, storage)).toBe(true);
    expect(JSON.parse(storage.raw(GUEST_STORAGE_KEY))).toEqual(GUEST); // 최소 수집 — rating 등 추가 키 저장 안 함
    expect(loadGuest(storage)).toEqual(GUEST);
  });

  it('저장된 값이 없으면 null', () => {
    expect(loadGuest(memoryStorage())).toBeNull();
  });

  it.each([
    ['JSON 아님', '{not json'],
    ['배열', '[]'],
    ['키 누락', JSON.stringify({ guestId: 'a', nickname: 'b' })],
    ['빈 문자열', JSON.stringify({ ...GUEST, token: '' })],
    ['공백만', JSON.stringify({ ...GUEST, nickname: '   ' })],
    ['문자열 아님', JSON.stringify({ ...GUEST, guestId: 7 })],
  ])('형식 오류(%s)면 삭제하고 null (UC-001 E3)', (_label, raw) => {
    const storage = memoryStorage({ [GUEST_STORAGE_KEY]: raw });
    expect(loadGuest(storage)).toBeNull();
    expect(storage.has(GUEST_STORAGE_KEY)).toBe(false);
  });

  it('clearGuest는 항목을 지운다', () => {
    const storage = memoryStorage({ [GUEST_STORAGE_KEY]: JSON.stringify(GUEST) });
    clearGuest(storage);
    expect(storage.has(GUEST_STORAGE_KEY)).toBe(false);
  });

  it('잘못된 게스트는 저장하지 않는다', () => {
    const storage = memoryStorage();
    expect(saveGuest({ guestId: 'x' }, storage)).toBe(false);
    expect(isValidGuest(null)).toBe(false);
  });

  it('저장소 접근 예외는 삼키고 null/false (사생활 모드)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
    expect(loadGuest(broken)).toBeNull();
    expect(saveGuest(GUEST, broken)).toBe(false);
    expect(() => clearGuest(broken)).not.toThrow();
    expect(loadGuest(null)).toBeNull();
  });
});

describe('checkNickname (api-gate §2.6 — 클라이언트 1차 검사)', () => {
  it.each(['다윗', 'David_7', '  바울의옥문  ', 'ab', '가나다라마바사아자차카타'])('허용: %s', (raw) => {
    const result = checkNickname(raw);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(raw.normalize('NFC').trim());
  });

  it.each(['', 'a', '가나다라마바사아자차카타파', 'hi there', '<script>', 'ㄱㄴ', 'emoji😇', null])('거부: %s', (raw) => {
    expect(checkNickname(raw).ok).toBe(false);
  });

  it('NFD 한글은 NFC로 정규화해 통과', () => {
    const nfd = '다윗'.normalize('NFD');
    expect(checkNickname(nfd)).toEqual({ ok: true, value: '다윗' });
  });
});
