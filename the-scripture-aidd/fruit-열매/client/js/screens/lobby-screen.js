// TASK-062-1 · FR-019 · FR-021 · FR-023 · FR-078 · C-001 · C-008 · SCR-002 · UC-002 — 로비 (모드 카드 4종·봇 난이도·메뉴)
// 로그인·스토리 모드·상점 버튼 없음 (C-001, C-008). 진입 시 흐름 상태(모드·소켓·결과)를 폐기한다.
import { BOT_LEVELS } from '../net/protocol.js';
import { el, svgIcon } from '../ui/dom.js';

/** CODE-002 표시 (data-ark §4) */
export const BOT_LEVEL_LABELS = Object.freeze({ easy: '쉬움', normal: '보통', hard: '어려움' });
/** design-vision §2.10 아이콘 (24px 2px 선) */
const ICONS = Object.freeze({
  battle: ['M4 4l10 10M14 14l2 2M18 4L8 14M8 14l-2 2M4 18l2 2M20 18l-2 2'],
  friends: ['M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5', 'M16 11a3 3 0 1 0 0-6M17 15c3 0 5 2 5 5'],
  bot: ['M12 3l2 3 3.5.5-1 3.5 1 3.5L14 14l-2 3-2-3-3.5-.5 1-3.5-1-3.5L10 6z', 'M12 8l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z'],
  practice: ['M12 3c1.5 2 2 3 0 5-2-2-1.5-3 0-5z', 'M9 10h6v10H9z'],
  records: ['M6 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6', 'M6 4a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2zM9 9h6M9 13h6'],
  ranking: ['M12 20V12M6 4c-2 4-1 8 6 8M18 4c2 4 1 8-6 8M8 20h8'],
  options: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2'],
});

export function mountLobbyScreen(host, ctx) {
  const { session } = ctx;
  ctx.resetFlow(); // 흐름 상태 폐기 (main.js resetFlow — 순환 import 없이 ctx로 전달)
  let botLevel = null;

  const choose = (mode, extra = {}) => {
    Object.assign(session, { mode, inviteRole: null, botLevel: null, heroId: null, ...extra });
    ctx.navigate('hero');
  };
  const card = (icon, titleText, desc, actions, extraClass = '') => el('article', { class: `mode-card ${extraClass}` }, [
    el('h2', { class: 'mode-card__title' }, [svgIcon(ICONS[icon]), titleText]),
    desc ? el('p', { class: 'mode-card__desc', text: desc }) : null,
    el('div', { class: 'mode-card__actions' }, actions),
  ]);
  const button = (text, onClick, cls = 'btn btn--primary') => el('button', { class: cls, text, attrs: { type: 'button' }, on: { click: onClick } });

  const botStart = button('시작', () => { if (botLevel) choose('bot', { botLevel }); });
  botStart.disabled = true; // 난이도 선택 전 비활성 (UC-002 2)
  const radios = el('div', { class: 'radio-group', attrs: { role: 'radiogroup', 'aria-label': '봇 난이도' } });
  BOT_LEVELS.forEach((level) => {
    const id = `bot-level-${level}`;
    const input = el('input', { attrs: { type: 'radio', name: 'bot-level', id, value: level } });
    input.addEventListener('change', () => { botLevel = level; botStart.disabled = false; });
    radios.append(el('label', { class: 'radio', attrs: { for: id } }, [input, el('span', { text: BOT_LEVEL_LABELS[level] })]));
  });

  const profile = session.profile ?? { nickname: '', rating: '' };
  const heading = el('h1', { class: 'screen-title', text: '모드를 고르세요', attrs: { tabindex: '-1' } });
  host.append(
    el('header', { class: 'topbar' }, [
      el('p', { class: 'title__en title__en--sm', text: 'SPIRITUAL WARFARE TETRIS', attrs: { lang: 'en' } }),
      el('p', { class: 'profile-badge', text: `◈ ${profile.nickname} · ${profile.rating}` }), // D3-22
    ]),
    heading,
    el('div', { class: 'mode-grid' }, [
      card('battle', '대전 · 랜덤 매칭', '비슷한 레이팅 상대와 대전', [button('시작', () => choose('random'))]),
      card('friends', '친구 대전 · 초대 코드', null, [
        button('방 만들기', () => choose('invite', { inviteRole: 'host' }), 'btn btn--secondary'),
        button('코드로 입장', () => choose('invite', { inviteRole: 'friend' }), 'btn btn--secondary'),
      ]),
      card('bot', 'AI 봇 대전', null, [radios, botStart]),
      card('practice', '연습', '혼자 위인 스킬 익히기', [button('시작', () => choose('practice'))]),
    ]),
    el('nav', { class: 'menu-row', attrs: { 'aria-label': '메뉴' } }, [
      el('button', { class: 'btn btn--ghost', attrs: { type: 'button' }, on: { click: () => ctx.navigate('records') } }, [svgIcon(ICONS.records), '전적']),
      el('button', { class: 'btn btn--ghost', attrs: { type: 'button' }, on: { click: () => ctx.navigate('ranking') } }, [svgIcon(ICONS.ranking), '랭킹']),
      el('button', { class: 'btn btn--ghost', attrs: { type: 'button' }, on: { click: () => ctx.navigate('options') } }, [svgIcon(ICONS.options), '옵션']),
    ]),
  );
  heading.focus();
  return { unmount() {} };
}
