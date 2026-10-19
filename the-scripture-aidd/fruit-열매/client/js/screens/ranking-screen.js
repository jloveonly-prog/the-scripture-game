// TASK-062-3 · FR-070 · FR-071 · REQ-015 · SCR-008 · UC-019 · API-004 — 랭킹 (레이팅 상위 100·내 순위 하단 고정)
import { getRankings, isAuthFailure } from '../net/http-api.js';
import { ERRORS } from '../net/protocol.js';
import { clear, el } from '../ui/dom.js';

// FR-071 내 순위 줄은 me가 있고 top에 내 행이 없을 때만 (UC-019 3a)
export function shouldPinMyRank(data) {
  return Boolean(data?.me) && !(data.top ?? []).some((row) => row.isMe);
}

export function mountRankingScreen(host, ctx) {
  const { session } = ctx;
  let disposed = false;
  const body = el('div', { class: 'ranking__body' });
  const heading = el('h1', { class: 'screen-title', text: '랭킹 · 레이팅 상위 100', attrs: { tabindex: '-1' } });
  const back = el('button', { class: 'btn btn--ghost', text: '← 로비', attrs: { type: 'button' }, on: { click: () => ctx.navigate('lobby') } });
  host.append(el('header', { class: 'topbar' }, [back, heading]), body);

  function renderTable(data) {
    const rows = (data.top ?? []).map((row) => el('tr', { class: row.isMe ? 'is-me' : '', attrs: { 'aria-current': row.isMe ? 'true' : false } }, [
      el('td', { class: 'num', text: String(row.rank) }),
      el('td', {}, [row.nickname, row.isMe ? el('span', { class: 'me-mark', text: ' ◀ 나' }) : null]),
      el('td', { class: 'num', text: String(row.rating) }),
    ]));
    if (rows.length === 0) body.append(el('p', { class: 'empty-state', text: '아직 랭킹이 없습니다' }));
    else {
      body.append(el('table', { class: 'table ranking__table' }, [
        el('caption', { class: 'sr-only', text: '랭킹, 레이팅 상위 100' }),
        el('thead', {}, [el('tr', {}, ['순위', '닉네임', '레이팅'].map((t) => el('th', { text: t, attrs: { scope: 'col' } })))]),
        el('tbody', {}, rows),
      ]));
    }
    if (shouldPinMyRank(data)) {
      body.append(el('p', { class: 'my-rank', text: `내 순위: ${data.me.rank}위 · ${data.me.nickname} · ${data.me.rating}` }));
    }
  }

  // FR-071 API-004 조회
  async function load() {
    clear(body);
    body.append(el('div', { class: 'loading', attrs: { role: 'status' } }, [el('span', { class: 'ring', attrs: { 'aria-hidden': 'true' } }), el('span', { class: 'sr-only', text: '불러오는 중' })]));
    const result = await getRankings(session.guest.token);
    if (disposed) return;
    clear(body);
    if (isAuthFailure(result)) { ctx.logout(ERRORS.INVALID_TOKEN.message); return; }
    if (!result.ok) {
      const retry = el('button', { class: 'btn btn--secondary', text: '다시 시도', attrs: { type: 'button' }, on: { click: load } });
      body.append(el('div', { class: 'error-state', attrs: { role: 'alert' } }, [el('p', { class: 'error-text', text: '랭킹을 불러오지 못했습니다' }), retry]));
      return;
    }
    renderTable(result.data ?? {});
  }

  const onKey = (event) => { if (event.key === 'Escape') ctx.navigate('lobby'); };
  host.addEventListener('keydown', onKey);
  heading.focus();
  load();
  return { unmount() { disposed = true; host.removeEventListener('keydown', onKey); } };
}
