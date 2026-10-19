// guest.js — localStorage `swt.guest` 읽기·쓰기·삭제만 (try/catch)
// TASK-062-1 | REQ-002 FR-012 | API-001 API-002 | data-ark §8.3 | devguide §3.3 (사생활 모드 예외 → 메모리만)
// 브라우저 저장소에는 이 키 하나만 둔다(devguide §3.5-6). 토큰은 콘솔에 출력하지 않는다(봉인 제1계명).

const KEY = "swt.guest";
/** localStorage를 쓸 수 없을 때의 메모리 사본 @type {{ guestId: string, nickname: string, token: string } | null} */
let memory = null;

/** @param {unknown} v @returns {v is { guestId: string, nickname: string, token: string }} */
function isGuest(v) {
  const g = /** @type {any} */ (v);
  return !!g && typeof g.guestId === "string" && typeof g.nickname === "string" && typeof g.token === "string";
}

/** data-ark §8.3 저장된 게스트 (없거나 형식이 깨졌으면 null) */
export function readGuest() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return memory;
    const parsed = JSON.parse(raw);
    return isGuest(parsed) ? parsed : null;
  } catch {
    return memory;
  }
}

/** API-001 201 응답의 guestId·nickname·token 저장 @param {{ guestId: string, nickname: string, token: string }} g */
export function writeGuest(g) {
  const value = { guestId: g.guestId, nickname: g.nickname, token: g.token };
  memory = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // 사생활 모드 — 메모리만 사용 (이번 접속 동안 유지)
  }
}

/** UC-001 E3 · UC-003 E3 · UC-018 E2 — 401/UNAUTHORIZED이면 삭제 */
export function clearGuest() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 저장소 접근 불가 — 메모리만 비움
  }
}
