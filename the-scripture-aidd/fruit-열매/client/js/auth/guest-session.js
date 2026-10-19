// TASK-060-2 · FR-012 · NFR-008 · TBL-201 — 브라우저 게스트 정보 `swt.guest` 저장·복원·형식 검사·삭제 (localStorage 1건만)
// 옵션 값은 저장하지 않는다 (N-04 보존). 닉네임 1차 검사는 api-gate §2.6 규칙의 클라이언트 측 방어 1층이다 (보안 경계는 서버).
import { PATTERNS } from '../net/protocol.js';

export const GUEST_STORAGE_KEY = 'swt.guest';
const GUEST_KEYS = ['guestId', 'nickname', 'token'];

/** 기본 저장소 — 사생활 모드 등으로 접근이 막히면 null */
function defaultStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (err) {
    console.error('[guest-session] storage unavailable', err.name);
    return null;
  }
}

/** TBL-201 제약: JSON 객체이고 3키가 모두 비어 있지 않은 문자열 */
export function isValidGuest(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && GUEST_KEYS.every((key) => typeof value[key] === 'string' && value[key].trim().length > 0);
}

// FR-012 저장된 게스트 복원 — 형식 오류면 삭제하고 null (UC-001 E3, screen-vision §3.1 부팅 가드 1단계)
export function loadGuest(storage = defaultStorage()) {
  if (!storage) return null;
  let raw = null;
  try {
    raw = storage.getItem(GUEST_STORAGE_KEY);
  } catch (err) {
    console.error('[guest-session] read failed', err.name);
    return null;
  }
  if (raw === null) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!isValidGuest(parsed)) {
    clearGuest(storage);
    return null;
  }
  return { guestId: parsed.guestId, nickname: parsed.nickname, token: parsed.token };
}

// FR-012 API-001 성공 응답의 guestId·nickname·token 저장 (3키만 — 봉인 제4계명 최소 수집)
export function saveGuest(guest, storage = defaultStorage()) {
  if (!storage || !isValidGuest(guest)) return false;
  try {
    storage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ guestId: guest.guestId, nickname: guest.nickname, token: guest.token }));
    return true;
  } catch (err) {
    console.error('[guest-session] write failed', err.name);
    return false;
  }
}

// FR-012 토큰 무효(401·4001) 시 삭제 (api-gate §4.3)
export function clearGuest(storage = defaultStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(GUEST_STORAGE_KEY);
  } catch (err) {
    console.error('[guest-session] remove failed', err.name);
  }
}

// FR-012 닉네임 1차 검사 — NFC·trim 후 2~12자, 한글 완성형·영문·숫자·밑줄 (api-gate §2.6, UC-001 E1)
export function checkNickname(raw) {
  if (typeof raw !== 'string') return { ok: false };
  const value = raw.normalize('NFC').trim();
  return PATTERNS.NICKNAME.test(value) ? { ok: true, value } : { ok: false };
}
