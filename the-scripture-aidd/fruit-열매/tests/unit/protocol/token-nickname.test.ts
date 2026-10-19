// TASK-032-3 · FR-012 · NFR-003 · NFR-008 · REQ-017 — 토큰 발급·해시·검증, 닉네임 규칙 (봉인 제3계명)
import { describe, expect, it, vi } from 'vitest';
import { generateToken, hashToken, resolveGuest } from '../../../worker/src/auth/token';
import { normalizeNickname } from '../../../worker/src/auth/nickname';
import type { Store } from '../../../worker/src/store/store';

describe('게스트 토큰', () => {
  it('43자 base64url, 매번 다름', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it('SHA-256 hex 64자 (알려진 값)', async () => {
    expect(await hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('resolveGuest: 형식 오류는 저장소 조회 없이 null, 정상 토큰은 해시로 조회', async () => {
    const profile = { id: 'g1', nickname: 'ab', rating: 1000, createdAt: '', lastSeenAt: '' };
    const store = { getProfileByTokenHash: vi.fn(async () => profile) } as unknown as Store;
    expect(await resolveGuest(store, 'short')).toBeNull();
    expect(await resolveGuest(store, 42)).toBeNull();
    expect(store.getProfileByTokenHash).not.toHaveBeenCalled();
    const token = generateToken();
    expect(await resolveGuest(store, token)).toBe(profile);
    expect(store.getProfileByTokenHash).toHaveBeenCalledWith(await hashToken(token));
  });
});

describe('닉네임 규칙 (FR-012)', () => {
  it('NFC·trim 후 2~12자 한글 완성형·영문·숫자·밑줄, 키는 소문자', () => {
    expect(normalizeNickname('  David_7 ')).toEqual({ ok: true, nickname: 'David_7', nicknameKey: 'david_7' });
    expect(normalizeNickname('다윗의물맷돌')).toMatchObject({ ok: true, nickname: '다윗의물맷돌' });
    // 자모 분리형(NFD) 입력도 NFC로 합쳐 허용
    expect(normalizeNickname('다윗'.normalize('NFD'))).toMatchObject({ ok: true, nickname: '다윗' });
  });

  it('길이·문자 위반·빈 문자열·문자열 아님은 거부', () => {
    for (const bad of ['a', 'abcdefghijklm', '   ', '', 'ab cd', 'ab<script>', 'ㄱㄴ', '😇😇', null, 12]) {
      expect(normalizeNickname(bad)).toEqual({ ok: false });
    }
  });
});
