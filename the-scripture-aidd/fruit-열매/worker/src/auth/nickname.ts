// TASK-032-1 · FR-012 · NFR-003 · NFR-008 — 닉네임 정규화(NFC·trim)·규칙 검사·중복 판정 키(소문자) 생성
// SQLite에는 정규식 CHECK가 없으므로 이 모듈이 2층 방어로 같은 규칙을 강제한다 (data-ark TBL-001 제약조건).
import { PATTERNS } from '../../../client/js/net/protocol.js';

export type NicknameResult = { ok: true; nickname: string; nicknameKey: string } | { ok: false };

// FR-012 닉네임 검사 — NFC·trim 후 ^[가-힣A-Za-z0-9_]{2,12}$, 키 = 소문자 (대소문자 무시 중복 — TBL-001 nickname_key)
export function normalizeNickname(raw: unknown): NicknameResult {
  if (typeof raw !== 'string') return { ok: false };
  const nickname = raw.normalize('NFC').trim();
  if (!PATTERNS.NICKNAME.test(nickname)) return { ok: false };
  return { ok: true, nickname, nicknameKey: nickname.toLowerCase() };
}
