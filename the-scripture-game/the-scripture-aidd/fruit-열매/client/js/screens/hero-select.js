// hero-select.js — SCR-003 DOM 구성·선택 이벤트만
// TASK-064-2 | REQ-003 FR-013 FR-015 C-003 C-008 C-010 | SCR-003 | UC-002 3~5단계·4a·E1·E2 |
// design-vision §3.3 WF-003·§4.2 위인 카드 | screen-vision §2 SCR-003·§5 SCR-003 (radiogroup)
// 비용·쿨다운은 rules.heroSkills, 문장은 heroes.json, 구절은 verse_ref → verses.json (화면 하드코딩 0)
import { heroes, rules } from "../content.js";
import { session } from "../store/session.js";
import { esc, emblemSvg, iconSvg, verseBlock } from "./shell.js";
import { BOT_LEVELS } from "./lobby.js";

/** ModeSummary 문구 */
const MODE_KO = { random: "랜덤 매칭", invite: "친구 초대", bot: "AI 봇 대전", practice: "연습" };

/** @param {any} h heroes.json 행 */
function costText(h) {
  const s = rules.heroSkills[h.skill_id];
  return `믿음 ${s.cost} · ${Math.round(s.cooldownMs / 1000)}초`;
}

/** @param {any} h @param {boolean} full 상세(효과·구절) 포함 */
function detailHtml(h, full) {
  return `<p class="skill-label">── 스킬 ──</p><p class="skill-name">${esc(h.skill_name_ko)}</p>
    <p class="effect" id="eff-${h.id}">${esc(h.skill_effect_ko)}</p><p class="cost">${costText(h)}</p>
    ${h.passive_ko ? `<p class="passive">패시브: ${esc(h.passive_ko)}</p>` : ""}${full ? verseBlock(h.verse_ref) : ""}`;
}

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  const f = session.flow;
  const level = BOT_LEVELS.find(([id]) => id === f.botLevel)?.[1] ?? "";
  const summary = `모드: ${MODE_KO[f.mode] ?? ""}${f.mode === "bot" ? ` · ${level}` : ""}`;
  if (!heroes.length) {
    // UC-002 E2 콘텐츠 색인 실패
    root.innerHTML = `<main class="scr"><div class="retry-panel"><h1>게임 데이터를 불러오지 못했습니다</h1>
      <button type="button" class="btn btn-primary" data-reload>새로고침</button></div></main>`;
    root.querySelector("[data-reload]")?.addEventListener("click", () => location.reload());
    return { unmount() {} };
  }
  root.innerHTML = `<div class="scr scr-hero">
    <header class="bar"><div class="bar-side"><button type="button" class="btn btn-ghost" data-back>${iconSvg("back")}
      뒤로</button></div><h1>위인을 고르십시오</h1><div class="bar-side mode-summary">${esc(summary)}</div></header>
    <div class="hero-grid" role="radiogroup" aria-label="위인">
      ${heroes.map((h) => `<div class="hero-card" role="radio" aria-checked="false" tabindex="-1" data-hero="${h.id}"
        aria-label="${esc(h.name_ko)} ${esc(h.name_en)}" aria-describedby="eff-${h.id}">
        ${emblemSvg(h.id, 128)}<p class="names">${esc(h.name_ko)}
        <span lang="en">${esc(h.name_en.toUpperCase())}</span></p>
        <div class="detail-only">${detailHtml(h, true)}</div>
        <p class="skill-name mobile-only">${esc(h.skill_name_ko)}</p></div>`).join("")}
    </div>
    <section class="hero-detail" aria-live="polite" data-detail></section>
    <footer class="hero-footer"><p class="hint" data-hint>위인을 선택하세요</p>
      <button type="button" class="btn btn-primary" data-confirm aria-disabled="true">이 위인으로 싸우기</button></footer>
  </div>`;
  const grid = /** @type {HTMLElement} */ (root.querySelector(".hero-grid"));
  const cards = /** @type {HTMLElement[]} */ ([...root.querySelectorAll(".hero-card")]);
  const confirm = /** @type {HTMLElement} */ (root.querySelector("[data-confirm]"));
  let chosen = /** @type {string | null} */ (f.heroId);

  /** 선택 (aria-checked, 다른 카드 투명도 0.7, 모바일 상세 시트 갱신) @param {string} id @param {boolean} focus */
  function choose(id, focus) {
    chosen = id;
    grid.classList.add("has-choice");
    for (const c of cards) {
      const on = c.dataset.hero === id;
      c.setAttribute("aria-checked", String(on));
      c.tabIndex = on ? 0 : -1;
      if (on && focus) c.focus();
    }
    const h = heroes.find((x) => x.id === id);
    /** @type {HTMLElement} */ (root.querySelector("[data-detail]")).innerHTML = h ? detailHtml(h, true) : "";
    confirm.setAttribute("aria-disabled", "false");
    /** @type {HTMLElement} */ (root.querySelector("[data-hint]")).hidden = true;
  }
  function submit() {
    if (!chosen) {
      ctx.shell.toast("위인을 선택하세요"); // UC-002 E1
      return;
    }
    f.heroId = chosen; // UC-002 5단계 → SCR-004
    ctx.nav("#/waiting");
  }
  const back = () => ctx.nav("#/lobby"); // UC-002 4a (흐름 상태 유지 — 로비가 같은 카드에 포커스)

  root.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    const card = /** @type {HTMLElement | null} */ (t.closest(".hero-card"));
    if (card) choose(/** @type {string} */ (card.dataset.hero), false);
    else if (t.closest("[data-confirm]")) submit();
    else if (t.closest("[data-back]")) back();
  });
  const onKey = (e) => {
    if (e.key === "Escape") return back();
    const inGrid = grid.contains(/** @type {Node} */ (e.target));
    if (inGrid && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      const i = Math.max(0, cards.findIndex((c) => c.dataset.hero === chosen));
      const step = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
      choose(/** @type {string} */ (cards[(i + step + cards.length) % cards.length].dataset.hero), true);
      e.preventDefault();
    } else if (inGrid && e.key === " ") {
      choose(/** @type {string} */ (/** @type {HTMLElement} */ (e.target).dataset.hero ?? cards[0].dataset.hero), true);
      e.preventDefault();
    } else if (inGrid && e.key === "Enter") submit();
  };
  document.addEventListener("keydown", onKey);
  cards[0].tabIndex = 0;
  if (chosen) choose(chosen, false);
  return {
    unmount() {
      document.removeEventListener("keydown", onKey);
    },
  };
}
