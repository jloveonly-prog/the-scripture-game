// TASK-062-2 · FR-005 · FR-008 · FR-018~020 · C-006 · SCR-004 · UC-003 · UC-004 · API-101~103 · API-151~154 — 매칭 대기·초대 코드 (상태 A~D)
// 복사·링크 공유 버튼 없음 (spec S16 기각). 대기 중 끊김 → 로비 + "연결이 끊어졌습니다" (UC-003 E1).
import { heroesById } from '../content/content-loader.js';
import { connectLobby, startMatchmaking } from '../net/lobby-client.js';
import { ERRORS, MM_S2C, MSG_ERROR, PATTERNS, ROOM_CODE_ALPHABET } from '../net/protocol.js';
import { clear, el, emblemSlot, formatClock } from '../ui/dom.js';
import { BOT_LEVEL_LABELS } from './lobby-screen.js';

const CODE_LENGTH = 6;
const VERSUS_MS = 600; // design-vision §4.1 VS 카드 전환 600ms
const CANCEL_FALLBACK_MS = 2000;
const INLINE_ERRORS = new Set(['INVITE_NOT_FOUND', 'ROOM_FULL', 'OWN_INVITE']);
const DROPPED_TEXT = '연결이 끊어졌습니다';

// D-09 초대 코드 입력 정리 — 대문자 변환, 허용 문자(0·O·1·I 제외 32종) 외 무시
export function sanitizeCode(text) {
  return [...String(text ?? '').toUpperCase()].filter((ch) => ROOM_CODE_ALPHABET.includes(ch)).join('');
}

/** 코드 표시 aria-label "초대 코드 K 7 P X 4 Q" (screen-vision §5) */
export function codeAriaLabel(code) {
  return `초대 코드 ${[...code].join(' ')}`;
}

/**
 * FR-018·019·021·023 Matchmaker 연결 + 요청 1회 (SCR-003 확정·SCR-004 상태 C·SCR-005 OPPONENT_LEFT 재등록 공용)
 * → { ok:true, reply } | { ok:false, error }. INVALID_TOKEN·4001은 TBL-201 삭제 후 SCR-001.
 */
export async function requestMatch(ctx, request) {
  const { session } = ctx;
  session.lobby?.close();
  const lobby = connectLobby();
  session.lobby = lobby;
  try {
    const reply = await startMatchmaking(lobby, { token: session.guest.token, ...request });
    if (reply.type === MM_S2C.QUEUED) session.queued = { ...reply.data, localAt: Date.now() };
    if (reply.type === MM_S2C.ROOM_CREATED) session.invite = reply.data;
    if (reply.type === MM_S2C.MATCHED) {
      session.matched = reply.data;
      lobby.close();
      session.lobby = null;
    }
    return { ok: true, reply };
  } catch (error) {
    lobby.close();
    if (session.lobby === lobby) session.lobby = null;
    if (error?.code === 'INVALID_TOKEN') ctx.logout(ERRORS.INVALID_TOKEN.message);
    return { ok: false, error: error ?? { code: 'INTERNAL_ERROR' } };
  }
}

export function mountMatchingScreen(host, ctx) {
  const { session } = ctx;
  const hero = heroesById.get(session.heroId);
  const offs = [];
  const timers = [];
  let tick = null;
  let disposed = false;
  const panel = el('div', { class: 'panel matching__panel' });
  host.append(panel);

  const leave = (toast) => { if (!disposed) ctx.navigate('lobby', toast ? { toast } : {}); };
  const cancelButton = (onClick) => el('button', { class: 'btn btn--cancel', text: '취소', attrs: { type: 'button' }, on: { click: onClick } });
  const onEsc = (event) => { if (event.key === 'Escape') panel.querySelector('.btn--cancel')?.click(); };
  window.addEventListener('keydown', onEsc);

  // 상태 A·B 공통 — 대기 중 Matchmaker 메시지 구독
  function watchLobby() {
    const lobby = session.lobby;
    if (!lobby) return;
    offs.push(lobby.on(MM_S2C.MATCHED, (data) => {
      session.matched = data;
      lobby.close();
      session.lobby = null;
      showVersus(data);
    }));
    offs.push(lobby.on(MM_S2C.CANCELLED, (data) => leave(data?.reason === 'expired' ? '초대 코드가 만료되었습니다' : null)));
    offs.push(lobby.on(MSG_ERROR, (error) => {
      if (error.code === 'INVALID_TOKEN') ctx.logout(ERRORS.INVALID_TOKEN.message);
      else if (error.code === 'NOTHING_TO_CANCEL') leave();
      else ctx.toast(ERRORS[error.code]?.message || ERRORS.INTERNAL_ERROR.message);
    }));
    offs.push(lobby.on('dropped', () => leave(DROPPED_TEXT)));
    offs.push(lobby.on('authFailed', () => ctx.logout(ERRORS.INVALID_TOKEN.message)));
  }

  function cancelWaiting() {
    if (!session.lobby) { leave(); return; }
    session.lobby.cancel();
    timers.push(setTimeout(() => leave(), CANCEL_FALLBACK_MS));
  }

  // 상태 A — 랜덤 매칭 대기 (queued)
  function showSearching() {
    const waited = el('p', { class: 'num', text: '대기 시간 00:00' });
    const cancel = cancelButton(cancelWaiting);
    const p = session.profile ?? {};
    panel.append(
      el('h1', { class: 'screen-title', text: '상대를 찾는 중', attrs: { role: 'status', tabindex: '-1' } }),
      el('span', { class: 'ring ring--lg', attrs: { 'aria-hidden': 'true' } }),
      el('p', { text: `◈ ${p.nickname ?? ''} · ${hero?.nameKo ?? ''} · ${p.rating ?? ''}` }),
      waited, cancel,
    );
    const startedAt = session.queued?.localAt ?? Date.now();
    tick = setInterval(() => { waited.textContent = `대기 시간 ${formatClock(Date.now() - startedAt)}`; }, 1000);
    cancel.focus();
  }

  // 상태 B — 방장: 초대 코드 표시 (roomCreated)
  function showInviteCode() {
    const code = session.invite.roomCode;
    const left = el('p', { class: 'num' });
    const expiresAt = Date.parse(session.invite.expiresAt);
    const update = () => { left.textContent = `만료까지 ${formatClock(expiresAt - Date.now())}`; };
    const cancel = cancelButton(cancelWaiting);
    panel.append(
      el('h1', { class: 'screen-title', text: '친구를 기다리는 중', attrs: { role: 'status', tabindex: '-1' } }),
      el('div', { class: 'code-display', attrs: { role: 'img', 'aria-label': codeAriaLabel(code) } },
        [...code].map((ch) => el('span', { class: 'code-cell', text: ch, attrs: { 'aria-hidden': 'true' } }))),
      el('p', { text: '이 코드를 친구에게 직접 알려 주세요' }), left, cancel,
    );
    update();
    tick = setInterval(update, 1000);
    cancel.focus();
  }

  // 상태 C — 친구: 6칸 분할 입력 (design-vision §4.2)
  function showCodeInput() {
    const cells = [];
    const errorText = el('p', { class: 'error-text', attrs: { 'aria-live': 'polite', id: 'code-error' } });
    const enter = el('button', { class: 'btn btn--primary', text: '입장', attrs: { type: 'button' }, on: { click: submit } });
    const value = () => cells.map((c) => c.value).join('');
    const refresh = () => { enter.disabled = !PATTERNS.ROOM_CODE.test(value()); };
    const fill = (start, text) => {
      const chars = sanitizeCode(text);
      let i = start;
      for (const ch of chars) { if (i >= CODE_LENGTH) break; cells[i].value = ch; i += 1; }
      cells[Math.min(i, CODE_LENGTH - 1)].focus();
      refresh();
    };
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      const cell = el('input', { class: 'code-input', attrs: {
        type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters', maxlength: CODE_LENGTH,
        'aria-label': `초대 코드 ${i + 1}번째 글자`, 'aria-describedby': 'code-error' } });
      cell.addEventListener('input', () => { const text = cell.value; cell.value = ''; if (text) fill(i, text); else refresh(); });
      cell.addEventListener('paste', (event) => { event.preventDefault(); fill(0, event.clipboardData?.getData('text') ?? ''); });
      cell.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !cell.value && i > 0) { event.preventDefault(); cells[i - 1].value = ''; cells[i - 1].focus(); refresh(); }
        if (event.key === 'Enter') submit();
      });
      cells.push(cell);
    }
    async function submit() {
      if (enter.disabled) return;
      enter.disabled = true;
      errorText.textContent = '';
      const result = await requestMatch(ctx, { heroId: session.heroId, mode: 'invite', roomCode: value() });
      if (disposed) return;
      if (result.ok) { showVersus(result.reply.data); return; }
      if (result.error.code === 'INVALID_TOKEN') return;
      if (INLINE_ERRORS.has(result.error.code)) errorText.textContent = ERRORS[result.error.code].message; // 입력 유지, 첫 칸 포커스
      else ctx.toast(result.error.code === 'DROPPED' ? DROPPED_TEXT : (ERRORS[result.error.code]?.message || ERRORS.INTERNAL_ERROR.message));
      refresh();
      cells[0].focus();
    }
    panel.append(
      el('h1', { class: 'screen-title', text: '초대 코드를 입력하세요', attrs: { tabindex: '-1' } }),
      el('div', { class: 'code-display code-display--input' }, cells), errorText,
      el('div', { class: 'button-row' }, [enter, cancelButton(() => leave())]),
    );
    refresh();
    cells[0].focus();
  }

  // 상태 D — 짝 성사·전장 입장 (matched → 방 연결)
  function showVersus(matched) {
    clearInterval(tick);
    offs.splice(0).forEach((off) => off());
    clear(panel);
    const opp = matched.opponent;
    const oppHero = opp ? heroesById.get(opp.heroId) : null;
    const oppName = opp?.isBot ? `AI 봇 · ${BOT_LEVEL_LABELS[opp.botLevel] ?? ''}` : (opp?.nickname ?? '');
    const load = () => ctx.load('emblems');
    panel.append(
      el('div', { class: 'versus' }, [
        el('div', { class: 'versus__side' }, [emblemSlot(load, hero, 96), el('p', { text: session.profile?.nickname ?? '' })]),
        el('p', { class: 'versus__vs', text: 'VS', attrs: { lang: 'en' } }),
        el('div', { class: 'versus__side' }, [emblemSlot(load, oppHero, 96), el('p', { text: oppName })]),
      ]),
      el('p', { class: 'screen-title', text: '전장으로 들어가는 중…', attrs: { role: 'status', tabindex: '-1' } }),
      el('span', { class: 'ring', attrs: { 'aria-hidden': 'true' } }),
    );
    panel.querySelector('[role="status"]').focus();
    timers.push(setTimeout(() => { if (!disposed) ctx.navigate('battle'); }, VERSUS_MS));
  }

  if (session.matched) showVersus(session.matched);
  else if (session.inviteRole === 'host' && session.invite) { showInviteCode(); watchLobby(); }
  else if (session.inviteRole === 'friend') showCodeInput();
  else { showSearching(); watchLobby(); }

  return {
    unmount() {
      disposed = true;
      clearInterval(tick);
      timers.forEach(clearTimeout);
      offs.forEach((off) => off());
      window.removeEventListener('keydown', onEsc);
      if (!session.matched && session.lobby) { session.lobby.close(); session.lobby = null; }
    },
  };
}
