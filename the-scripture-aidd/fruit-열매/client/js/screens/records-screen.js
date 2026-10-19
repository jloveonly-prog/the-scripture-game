// TASK-062-3 · FR-069 · REQ-014 · SCR-007 · UC-018 · API-003 — 전적 (최신순 표·20건 페이지·로딩/빈/오류 상태)
import { heroesById } from '../content/content-loader.js';
import { getMatches, isAuthFailure } from '../net/http-api.js';
import { ERRORS, LIMITS } from '../net/protocol.js';
import { clear, el, emblemSlot, formatClock } from '../ui/dom.js';
import { BOT_LEVEL_LABELS } from './lobby-screen.js';

const ICON_PX = 24;
const pad2 = (n) => String(n).padStart(2, '0');

// FR-069 createdAt(ISO UTC) → 브라우저 현지 시각 "YYYY-MM-DD HH:mm" (D3-16)
export function formatLocalDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

// FR-069 전적 1행 표시 모델 (순수)
export function matchRowView(item) {
  const opponent = item.opponent?.isBot ? `AI 봇 · ${BOT_LEVEL_LABELS[item.opponent.botLevel] ?? ''}` : (item.opponent?.nickname ?? '');
  return {
    win: item.result === 'win',
    resultText: item.result === 'win' ? '승' : '패',
    opponent,
    myHero: heroesById.get(item.myHero) ?? null,
    opponentHero: heroesById.get(item.opponentHero) ?? null,
    rounds: Array.isArray(item.rounds) ? `${item.rounds[0]}:${item.rounds[1]}` : '',
    duration: formatClock(item.durationMs),
    createdAt: formatLocalDateTime(item.createdAt),
  };
}

export function mountRecordsScreen(host, ctx) {
  const { session } = ctx;
  let page = 1;
  let disposed = false;
  const body = el('div', { class: 'records__body' });
  const heading = el('h1', { class: 'screen-title', text: '전적', attrs: { tabindex: '-1' } });
  const back = el('button', { class: 'btn btn--ghost', text: '← 로비', attrs: { type: 'button' }, on: { click: () => ctx.navigate('lobby') } });
  host.append(el('header', { class: 'topbar' }, [back, heading]), body);
  const loadEmblems = () => ctx.load('emblems');

  const heroCell = (view) => el('span', { class: 'hero-pair' }, [
    emblemSlot(loadEmblems, view.myHero, ICON_PX), view.myHero?.nameKo ?? '', ' vs ',
    emblemSlot(loadEmblems, view.opponentHero, ICON_PX), view.opponentHero?.nameKo ?? '',
  ]);

  function renderTable(items, meta) {
    const head = el('tr', {}, ['결과', '상대', '위인 (나 vs 상대)', '라운드', '경기 시간', '일시'].map((t) => el('th', { text: t, attrs: { scope: 'col' } })));
    const rows = items.map((item) => {
      const v = matchRowView(item);
      const cells = [
        ['결과', el('span', { class: `badge ${v.win ? 'badge--win' : 'badge--loss'}`, text: v.resultText })],
        ['상대', v.opponent], ['위인', heroCell(v)], ['라운드', v.rounds], ['경기 시간', v.duration], ['일시', v.createdAt],
      ];
      return el('tr', {}, cells.map(([label, content]) => el('td', { dataset: { label } }, [content])));
    });
    const prev = el('button', { class: 'btn btn--secondary', text: '‹ 이전', attrs: { type: 'button' }, on: { click: () => load(page - 1) } });
    const next = el('button', { class: 'btn btn--secondary', text: '다음 ›', attrs: { type: 'button' }, on: { click: () => load(page + 1) } });
    prev.disabled = meta.page <= 1;
    next.disabled = meta.page >= meta.totalPages;
    body.append(
      el('table', { class: 'table records__table' }, [el('caption', { class: 'sr-only', text: '전적, 최신순' }), el('thead', {}, [head]), el('tbody', {}, rows)]),
      el('nav', { class: 'pagination', attrs: { 'aria-label': '페이지' } }, [prev, el('span', { class: 'num', text: `${meta.page} / ${meta.totalPages}` }), next]),
    );
  }

  // FR-069 API-003 조회 (page ±1 재조회)
  async function load(target) {
    page = Math.max(LIMITS.PAGE_MIN, target);
    clear(body);
    body.append(el('div', { class: 'loading', attrs: { role: 'status' } }, [el('span', { class: 'ring', attrs: { 'aria-hidden': 'true' } }), el('span', { class: 'sr-only', text: '불러오는 중' })]));
    const result = await getMatches(session.guest.token, { page, size: LIMITS.SIZE_DEFAULT });
    if (disposed) return;
    clear(body);
    if (isAuthFailure(result)) { ctx.logout(ERRORS.INVALID_TOKEN.message); return; } // UC-018 E2
    if (!result.ok) {
      const retry = el('button', { class: 'btn btn--secondary', text: '다시 시도', attrs: { type: 'button' }, on: { click: () => load(page) } });
      body.append(el('div', { class: 'error-state', attrs: { role: 'alert' } }, [el('p', { class: 'error-text', text: '전적을 불러오지 못했습니다' }), retry]));
      return;
    }
    const meta = result.meta ?? { page, totalPages: 0, totalCount: 0 };
    if (!meta.totalCount || !Array.isArray(result.data) || result.data.length === 0) {
      body.append(el('p', { class: 'empty-state', text: '아직 경기 기록이 없습니다' })); // UC-018 4a
      return;
    }
    renderTable(result.data, meta);
  }

  const onKey = (event) => { if (event.key === 'Escape') ctx.navigate('lobby'); };
  host.addEventListener('keydown', onKey);
  heading.focus();
  load(1);
  return { unmount() { disposed = true; host.removeEventListener('keydown', onKey); } };
}
