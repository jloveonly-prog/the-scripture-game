// TASK-032-1 · FR-012 · NFR-003 · NFR-008 · 봉인 제3계명 — 게스트 토큰 발급(256비트 base64url)·SHA-256 해시·토큰으로 게스트 확인
// 평문 토큰은 API-001 응답 1회만 존재하고, 서버는 해시만 저장·조회한다 (api-gate §5.1).
import { PATTERNS } from '../../../client/js/net/protocol.js';
import type { Profile, Store } from '../store/store';

/** 토큰 난수 바이트 수 (api-gate §5.1: 32바이트 = 256비트 → base64url 43자) */
const TOKEN_BYTES = 32;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// FR-012 게스트 토큰 발급 — crypto.getRandomValues 32바이트 → base64url 43자 (봉인 제3계명)
export function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

// FR-012 저장용 토큰 해시 — SHA-256 hex 64자 (TBL-001 token_hash)
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 토큰 형식 검사 (api-gate §2.6 token) */
export function isTokenFormat(token: unknown): token is string {
  return typeof token === 'string' && PATTERNS.TOKEN.test(token);
}

// FR-012 · NFR-003 토큰 → 프로필 (형식 오류·불일치 = null). 저장소 오류는 StoreError 그대로 던진다 (호출 측이 STORE_UNAVAILABLE 변환)
export async function resolveGuest(store: Store, token: unknown): Promise<Profile | null> {
  if (!isTokenFormat(token)) return null;
  const tokenHash = await hashToken(token);
  return store.getProfileByTokenHash(tokenHash);
}
