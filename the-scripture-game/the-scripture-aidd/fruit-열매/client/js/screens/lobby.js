// lobby.js — SCR-002 DOM 구성·이벤트 연결만
// TASK-064-1 | REQ-004 REQ-005 REQ-006 FR-019 FR-021 FR-023 FR-078 | SCR-002 | UC-002 1~2단계·UC-018~UC-020 진입 |
// design-vision §3.2 WF-002·§4.2 모드 카드·세그먼트 | screen-vision §2 SCR-002·§5 SCR-002 (←/→ 카드 이동)
import { session, resetFlow } from "../store/session.js";
import { esc, iconSvg, verseBlock } from "./shell.js";

/** CODE-002 봇 난이도 (기본 보통) */
export const BOT_LEVELS = Object.freeze([["easy", "쉬움"], ["normal", "보통"], ["hard", "어려움"]]);
/** WF-002 하단 구절 띠 — 성령의 검 근거 구절 (armor.json sword_of_the_spirit verse_ref) */
const BAND_VERSE = "Ephesians 6:17";

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  const p = session.profile;
  const prevMode = session.flow.mode;
  resetFlow();
  const level = session.flow.botLevel;
  root.innerHTML = `<div class="scr scr-lobby">
    <header class="topbar">
      <div class="profile-chip"><span class="name">${esc(p.nickname)}</span>
        <span class="rating">· 레이팅 <span class="num">${p.rating}</span></span></div>
      <nav class="nav-wide" aria-label="메뉴">
        <button type="button" class="btn btn-ghost" data-go="#/history">전적</button>
        <button type="button" class="btn btn-ghost" data-go="#/ranking">랭킹</button>
      </nav>
      <button type="button" class="btn btn-ghost btn-icon" data-go="#/options" aria-label="옵션">${iconSvg("gear")}
        <span class="nav-wide">옵션</span></button>
    </header>
    <main>
      <div class="greeting"><h1>평강하라, ${esc(p.nickname)}</h1><p>어떤 싸움을 하시겠습니까?</p></div>
      <div class="mode-grid" role="group" aria-label="싸움 방식">
        <section class="mode-card" data-card="random"><h2>⚔ 대전 · 랜덤 매칭</h2>
          <p class="grow">레이팅이 비슷한 상대를 찾습니다 · 3판 2선승</p>
          <button type="button" class="btn btn-primary" data-mode="random">상대 찾기</button></section>
        <section class="mode-card" data-card="invite"><h2>✉ 친구 초대</h2>
          <p class="grow">초대 코드로 친구와 겨룹니다 · 3판 2선승</p>
          <button type="button" class="btn btn-primary" data-mode="invite" data-action="create">방 만들기</button>
          <button type="button" class="btn btn-secondary" data-mode="invite" data-action="join">코드로 입장</button>
        </section>
        <section class="mode-card" data-card="bot"><h2>⚙ AI 봇 대전</h2>
          <p>난이도</p>
          <div class="segment" role="radiogroup" aria-label="봇 난이도">${BOT_LEVELS.map(([id, ko]) =>
            `<button type="button" role="radio" data-level="${id}" aria-checked="${id === level}">${ko}</button>`)
            .join("")}</div>
          <p class="grow">3판 2선승</p>
          <button type="button" class="btn btn-primary" data-mode="bot">봇과 싸우기</button></section>
        <section class="mode-card" data-card="practice"><h2>✦ 연습</h2>
          <p class="grow">혼자 위인 스킬을 익힙니다</p>
          <button type="button" class="btn btn-primary" data-mode="practice">연습하기</button></section>
      </div>
      <footer class="verse-band">${verseBlock(BAND_VERSE)}</footer>
    </main>
    <nav class="bottom-bar" aria-label="기록">
      <button type="button" class="btn btn-ghost" data-go="#/history">전적</button>
      <button type="button" class="btn btn-ghost" data-go="#/ranking">랭킹</button>
    </nav>
  </div>`;
  const cards = /** @type {HTMLElement[]} */ ([...root.querySelectorAll(".mode-card")]);

  root.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target).closest("button");
    if (!t) return;
    if (t.dataset.go) ctx.nav(t.dataset.go);
    else if (t.dataset.level) {
      // CODE-002 난이도 세그먼트 (radiogroup)
      session.flow.botLevel = /** @type {any} */ (t.dataset.level);
      root.querySelectorAll("[data-level]").forEach((b) => b.setAttribute("aria-checked", String(b === t)));
    } else if (t.dataset.mode) {
      // UC-002 2단계: 흐름 상태 저장 → SCR-003
      session.flow.mode = /** @type {any} */ (t.dataset.mode);
      session.flow.inviteAction = /** @type {any} */ (t.dataset.action ?? null);
      ctx.nav("#/hero");
    }
  });
  // screen-vision §5 SCR-002 ←/→ 모드 카드 사이 이동, Enter = 카드의 주 버튼(버튼 기본 동작)
  const onKey = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const tgt = /** @type {HTMLElement} */ (e.target);
    if (tgt.closest(".segment")) return; // 세그먼트 안에서는 난이도 이동
    const i = cards.findIndex((c) => c.contains(tgt));
    if (i < 0) return;
    const next = cards[(i + (e.key === "ArrowRight" ? 1 : cards.length - 1)) % cards.length];
    /** @type {HTMLElement} */ (next.querySelector(".btn-primary")).focus();
    e.preventDefault();
  };
  root.addEventListener("keydown", onKey);
  // 위인 선택에서 [← 뒤로] — 같은 모드 카드에 포커스 (screen-vision SCR-003)
  if (prevMode) /** @type {HTMLElement | null} */ (root.querySelector(`[data-card="${prevMode}"] .btn-primary`))
    ?.focus({ preventScroll: true });
  return { unmount() {} };
}
