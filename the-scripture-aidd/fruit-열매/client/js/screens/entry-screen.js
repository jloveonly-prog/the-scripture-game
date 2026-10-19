// TASK-062-1 · FR-012 · FR-078 · NFR-003 · NFR-008 · SCR-001 · UC-001 · API-001 · API-002 — 닉네임 입장 (고지 문구 — 봉인 제5계명)
import { checkNickname, clearGuest, saveGuest } from '../auth/guest-session.js';
import { createGuest, getMe } from '../net/http-api.js';
import { ERRORS, LIMITS } from '../net/protocol.js';
import { clear, el, setBusy } from '../ui/dom.js';

export const PRIVACY_NOTICE = '닉네임과 경기 기록이 이 게임 서버에 저장됩니다.';
export const CONNECTION_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요';
const ENTER_LABEL = '입장하기';
/** HTML pattern 속성 (api-gate §2.6 nickname 규칙 — architecture §9 방어 1층) */
const NICKNAME_PATTERN = '[가-힣A-Za-z0-9_]{2,12}';

// FR-012 API-001 실패 → 화면 문구 (screen-vision SCR-001 "서버 거부"). 네트워크 실패는 null → ConnectionError
export function entryErrorMessage(result) {
  if (result.network) return null;
  if (result.code === 'INVALID_NICKNAME' || result.code === 'INVALID_BODY') return ERRORS.INVALID_NICKNAME.message;
  return result.message;
}

export function mountEntryScreen(host, ctx) {
  const { session } = ctx;
  let lastAction = null;
  let disposed = false;

  const title = el('header', { class: 'title' }, [
    el('h1', { class: 'title__en', text: 'SPIRITUAL WARFARE TETRIS', attrs: { lang: 'en', tabindex: '-1' } }),
    el('p', { class: 'title__ko', text: '영적 전쟁 테트리스' }),
  ]);
  const panel = el('div', { class: 'panel entry__panel' });
  host.append(title, panel);

  // UC-001 1a TokenCheckState
  function showChecking() {
    clear(panel);
    panel.append(el('div', { class: 'loading', attrs: { role: 'status' } }, [
      el('span', { class: 'ring', attrs: { 'aria-hidden': 'true' } }), el('p', { text: '입장 정보를 확인하는 중' }),
    ]));
  }

  // UC-001 E4 ConnectionError + [다시 시도]
  function showConnectionError(container) {
    const retry = el('button', { class: 'btn btn--secondary', text: '다시 시도', attrs: { type: 'button' }, on: { click: () => lastAction?.() } });
    container.append(el('div', { class: 'error-state', attrs: { role: 'alert' } }, [el('p', { class: 'error-text', text: CONNECTION_ERROR }), retry]));
    return retry;
  }

  function showForm({ value = '', error = null, connection = false } = {}) {
    clear(panel);
    const input = el('input', {
      class: 'input', attrs: {
        id: 'nickname', type: 'text', name: 'nickname', autocomplete: 'off', spellcheck: 'false', required: true,
        minlength: LIMITS.NICKNAME_MIN, maxlength: LIMITS.NICKNAME_MAX, pattern: NICKNAME_PATTERN,
        placeholder: '2~12자 · 한글/영문/숫자/밑줄', 'aria-describedby': 'nickname-help nickname-error',
      },
    });
    input.value = value;
    const errorText = el('p', { class: 'error-text', attrs: { id: 'nickname-error', 'aria-live': 'polite' } });
    const button = el('button', { class: 'btn btn--primary btn--lg', text: ENTER_LABEL, attrs: { type: 'submit' } });
    const form = el('form', { class: 'entry__form', attrs: { novalidate: true } }, [
      el('label', { class: 'label', text: '닉네임', attrs: { for: 'nickname' } }),
      input,
      el('p', { class: 'help', text: '2~12자 · 한글/영문/숫자/밑줄', attrs: { id: 'nickname-help' } }),
      errorText,
      el('p', { class: 'notice', text: `ⓘ ${PRIVACY_NOTICE}` }),
      button,
    ]);
    const setError = (message) => {
      errorText.textContent = message ?? '';
      input.classList.toggle('is-error', Boolean(message));
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const check = checkNickname(input.value);
      if (!check.ok) {
        setError(ERRORS.INVALID_NICKNAME.message); // UC-001 E1
        input.focus();
        return;
      }
      setError(null);
      submit(check.value, input.value, button);
    });
    panel.append(form);
    if (error) setError(error);
    if (connection) showConnectionError(panel);
    input.focus();
  }

  // FR-012 API-001 입장 → TBL-201 저장 → SCR-002
  async function submit(nickname, rawValue, button) {
    lastAction = () => submit(nickname, rawValue, panel.querySelector('button[type="submit"]'));
    if (button) setBusy(button, true, ENTER_LABEL);
    const result = await createGuest(nickname);
    if (disposed) return;
    if (result.ok) {
      const guest = { guestId: result.data.guestId, nickname: result.data.nickname, token: result.data.token };
      saveGuest(guest);
      session.guest = guest;
      session.profile = { guestId: guest.guestId, nickname: result.data.nickname, rating: result.data.rating };
      session.verified = true;
      ctx.navigate(session.bootTarget);
      return;
    }
    const message = entryErrorMessage(result);
    showForm({ value: rawValue, error: message, connection: message === null }); // 입력값 보존·포커스 입력 칸
  }

  // FR-012 API-002 저장된 토큰 확인 (screen-vision §3.1)
  async function verify() {
    lastAction = verify;
    showChecking();
    const result = await getMe(session.guest.token);
    if (disposed) return;
    if (result.ok) {
      session.profile = { guestId: result.data.guestId, nickname: result.data.nickname, rating: result.data.rating };
      session.verified = true;
      ctx.navigate(session.bootTarget);
    } else if (result.status === 401) {
      clearGuest(); // UC-001 E3
      session.guest = null;
      showForm();
    } else {
      clear(panel);
      showConnectionError(panel).focus();
    }
  }

  if (session.guest) verify();
  else showForm();

  return { unmount() { disposed = true; } };
}
