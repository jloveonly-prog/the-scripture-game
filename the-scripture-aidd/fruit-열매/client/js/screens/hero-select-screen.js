// TASK-062-2 · FR-013~017 · FR-074 · C-002 · C-003 · C-010 · SCR-003 · UC-002 · API-101 · API-102 — 위인 선택 (카드 4·상세·확정)
// 예수님은 선택지에 없다 (C-002). 콘텐츠는 번들(네트워크 없음 — FR-074).
import { content, getVerse, heroesById } from '../content/content-loader.js';
import { ERRORS, HERO_IDS } from '../net/protocol.js';
import { clear, el, emblemSlot, setBusy } from '../ui/dom.js';
import { BOT_LEVEL_LABELS } from './lobby-screen.js';
import { requestMatch } from './matching-screen.js';

const CONFIRM_LABEL = '확정';
const MODE_LABELS = Object.freeze({ random: '대전 · 랜덤 매칭', invite: '친구 대전 · 초대 코드', bot: 'AI 봇 대전', practice: '연습' });

// FR-013 모드 표시 "모드: AI 봇 대전 · 보통"
export function modeLabel(mode, botLevel) {
  const base = MODE_LABELS[mode] ?? '';
  return mode === 'bot' && botLevel ? `${base} · ${BOT_LEVEL_LABELS[botLevel]}` : base;
}

// FR-013 D3-18 비용·재사용 표시 "믿음 50 · 재사용 20초"
export function skillCostLabel(skill) {
  return `믿음 ${skill.cost} · 재사용 ${Math.round(skill.cooldownMs / 1000)}초`;
}

/** design-vision §5.3 엠블럼 크기 (데스크톱 128 · 태블릿 96 · 모바일 72) */
function emblemSize() {
  if (typeof matchMedia !== 'function') return 128;
  if (matchMedia('(min-width: 1024px)').matches) return 128;
  return matchMedia('(min-width: 768px)').matches ? 96 : 72;
}

export function mountHeroSelectScreen(host, ctx) {
  const { session } = ctx;
  let selected = session.heroId && heroesById.has(session.heroId) ? session.heroId : null;
  let busy = false;
  let disposed = false;
  const heroes = HERO_IDS.map((id) => heroesById.get(id)).filter(Boolean);

  const back = el('button', { class: 'btn btn--ghost', text: '← 뒤로', attrs: { type: 'button' }, on: { click: () => ctx.navigate('lobby') } });
  const heading = el('h1', { class: 'screen-title', text: '위인을 고르세요', attrs: { tabindex: '-1' } });
  host.append(el('header', { class: 'topbar' }, [back, heading, el('p', { class: 'mode-label', text: `모드: ${modeLabel(session.mode, session.botLevel)}` })]));
  if (session.mode === 'invite' && session.inviteRole === 'friend') host.append(el('p', { class: 'help', text: '확정 후 초대 코드를 입력합니다' }));

  // UC-002 E2 콘텐츠 로드 실패
  if (heroes.length !== HERO_IDS.length || !Array.isArray(content.heroes)) {
    host.append(el('div', { class: 'error-state', attrs: { role: 'alert' } }, [
      el('p', { class: 'error-text', text: '게임 데이터를 불러오지 못했습니다' }), el('p', { text: '새로고침해 주세요' }),
    ]));
    back.focus();
    return { unmount() { disposed = true; } };
  }

  const group = el('div', { class: 'hero-grid', attrs: { role: 'radiogroup', 'aria-label': '위인' } });
  const detail = el('section', { class: 'panel hero-detail', attrs: { 'aria-live': 'polite' } });
  const hint = el('p', { class: 'help', text: 'ⓘ 위인을 선택하세요' });
  const confirm = el('button', { class: 'btn btn--primary btn--lg', text: CONFIRM_LABEL, attrs: { type: 'button' }, on: { click: onConfirm } });
  const size = emblemSize();
  const cards = heroes.map((hero, index) => {
    const card = el('div', {
      class: 'hero-card', attrs: { role: 'radio', 'aria-checked': 'false', tabindex: '-1', 'aria-label': `${hero.nameKo} ${hero.nameEn}` },
      on: { click: () => select(hero.id, true), keydown: (event) => onCardKey(event, index) },
    }, [emblemSlot(() => ctx.load('emblems'), hero, size), el('p', { class: 'hero-card__ko', text: hero.nameKo }),
      el('p', { class: 'hero-card__en', text: hero.nameEn.toUpperCase(), attrs: { lang: 'en' } })]);
    group.append(card);
    return card;
  });
  host.append(group, detail, el('footer', { class: 'action-bar' }, [hint, confirm]));

  function onCardKey(event, index) {
    const moves = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (moves[event.key]) {
      event.preventDefault();
      const next = (index + moves[event.key] + heroes.length) % heroes.length;
      select(heroes[next].id, true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(heroes[index].id, true);
    }
  }

  // FR-013 카드 선택 → 선택 표시 + 상세(스킬·비용·패시브·근거 구절 C-003)
  function select(heroId, focus) {
    if (busy) return; // 응답 대기 동안 카드 변경 불가
    selected = heroId;
    cards.forEach((card, i) => {
      const on = heroes[i].id === heroId;
      card.setAttribute('aria-checked', on ? 'true' : 'false');
      card.setAttribute('tabindex', on ? '0' : '-1');
      card.classList.toggle('is-selected', on);
      if (on && focus) card.focus();
    });
    const hero = heroesById.get(heroId);
    const verse = getVerse(hero.verseRef);
    clear(detail);
    detail.append(
      el('div', { class: 'hero-detail__head' }, [el('h2', { text: `스킬 · ${hero.skill.nameKo}` }), el('p', { class: 'hero-detail__cost', text: skillCostLabel(hero.skill) })]),
      el('p', { text: hero.skill.descKo }),
      hero.passive?.type === 'previewCount' ? el('p', { text: `패시브 — 다음 블록 ${hero.passive.count}개 미리보기` }) : null,
      verse ? el('blockquote', { class: 'verse' }, [
        el('p', { class: 'verse__en', text: verse.kjv, attrs: { lang: 'en' } }),
        el('p', { class: 'verse__ko', text: verse.ko }),
        el('cite', { class: 'verse__ref', text: `— ${verse.ref}`, attrs: { lang: 'en' } }),
      ]) : null,
    );
    confirm.disabled = false;
    hint.hidden = true;
  }

  // FR-005·018·019·021·023 확정 → 모드별 join/createRoom (screen-vision SCR-003 인터랙션)
  async function onConfirm() {
    if (!selected || busy) return;
    session.heroId = selected;
    if (session.mode === 'invite' && session.inviteRole === 'friend') { ctx.navigate('matching'); return; }
    busy = true;
    setBusy(confirm, true, CONFIRM_LABEL);
    const result = await requestMatch(ctx, {
      heroId: selected, mode: session.mode, botLevel: session.botLevel, inviteRole: session.inviteRole,
    });
    if (disposed) return;
    busy = false;
    setBusy(confirm, false, CONFIRM_LABEL);
    if (result.ok) {
      ctx.navigate(result.reply.type === 'matched' ? 'battle' : 'matching');
      return;
    }
    if (result.error.code === 'INVALID_TOKEN') return; // requestMatch가 SCR-001로 보냄
    ctx.toast(result.error.code === 'DROPPED' ? '연결이 끊어졌습니다' : (ERRORS[result.error.code]?.message || ERRORS.INTERNAL_ERROR.message));
  }

  if (selected) select(selected, true);
  else {
    confirm.disabled = true;
    cards[0].setAttribute('tabindex', '0');
    cards[0].focus();
  }
  return { unmount() { disposed = true; } };
}
