// history.js — SCR-007 DOM 구성·페이지 요청만
// TASK-067-2 | REQ-014 FR-069 FR-078 | SCR-007 | API-003 | UC-018 1~4·4a·E1·E2 | design-vision §3.7 WF-007 |
// screen-vision §2 SCR-007·§5 SCR-007 | rules.ledger.historyPageDefault (키셋 더 보기)
import { rules } from "../content.js";
import { getMatches } from "../net/api.js";
import { session } from "../store/session.js";
import { esc, emblemSvg, iconSvg } from "./shell.js";
import { BOT_LEVELS } from "./lobby.js";

const two = (n) => String(n).padStart(2, "0");
/** playedAt → 로컬 "YYYY.MM.DD HH:mm" @param {string} iso */
const when = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
};
const mss = (ms) => `${Math.floor(ms / 60000)}:${two(Math.floor((ms % 60000) / 1000))}`;

/** @param {any} m API-003 data[] 행 */
function cells(m) {
  const won = m.result === "win";
  const level = BOT_LEVELS.find(([k]) => k === m.botLevel)?.[1] ?? "";
  const opp = m.opponent.isBot ? `봇 (${level})` : m.opponent.nickname ?? "";
  // endReason=disconnect → "상대 이탈"(승)·"이탈"(패) 꼬리표
  const tag = m.endReason === "disconnect" ? `<span class="tag">${won ? "상대 이탈" : "이탈"}</span>` : "";
  const diff = m.me.ratingAfter - m.me.ratingBefore;
  const delta = m.me.ratingAfter == null || m.me.ratingBefore == null ? "—"
    : `${diff >= 0 ? "+" : ""}${diff} ${m.me.ratingAfter}`;
  return {
    badge: `<span class="badge-result ${won ? "win" : "loss"}">${won ? "승" : "패"}</span>`, opp: `${esc(opp)}${tag}`,
    heroes: `<span class="heroes-vs">${emblemSvg(m.me.heroId, 24)} vs ${emblemSvg(m.opponent.heroId, 24)}</span>`,
    rounds: `${m.me.roundsWon} : ${m.opponent.roundsWon}`, delta, time: mss(m.durationMs), date: when(m.playedAt),
  };
}

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  root.innerHTML = `<div class="scr scr-history"><header class="bar"><div class="bar-side"><button type="button"
    class="btn btn-ghost" data-back>${iconSvg("back")} 로비</button></div><h1>전적</h1><div class="bar-side"></div></header>
    <main data-body></main></div>`;
  const body = /** @type {HTMLElement} */ (root.querySelector("[data-body]"));
  /** @type {string | null} */ let nextBefore = null;
  let alive = true;
  let loaded = 0;
  const back = () => ctx.nav("#/lobby");

  function skeleton() {
    body.innerHTML = `<div aria-busy="true" style="display:grid;gap:8px">
      ${"<div class=\"skeleton\"></div>".repeat(5)}</div>`;
  }
  function frame() {
    body.innerHTML = `<table class="data-table history-table"><caption>전적</caption><thead><tr><th scope="col">결과</th>
      <th scope="col">상대</th><th scope="col" class="col-heroes">위인 (나 vs 상대)</th><th scope="col">라운드</th>
      <th scope="col">레이팅</th><th scope="col">시간</th><th scope="col" class="col-date">일시</th></tr></thead>
      <tbody data-rows></tbody></table><div class="history-cards" data-cards></div>
      <div class="more-row"><button type="button" class="btn btn-secondary" data-more hidden>더 보기</button></div>`;
  }
  /** @param {any[]} list */
  function append(list) {
    const rows = /** @type {HTMLElement} */ (body.querySelector("[data-rows]"));
    const cards = /** @type {HTMLElement} */ (body.querySelector("[data-cards]"));
    list.forEach((m, i) => {
      const c = cells(m);
      rows.insertAdjacentHTML("beforeend", `<tr tabindex="-1" data-first="${i === 0}"><td>${c.badge}</td>
        <td>${c.opp}</td>
        <td class="col-heroes">${c.heroes}</td><td class="num">${c.rounds}</td><td class="num">${c.delta}</td>
        <td class="num">${c.time}</td><td class="col-date num">${c.date}</td></tr>`);
      cards.insertAdjacentHTML("beforeend", `<article class="history-card"><div class="row">${c.badge}<b>${c.opp}</b>
        <span class="num">${c.rounds}</span></div>
        <div class="row sub">${c.heroes}<span>${c.delta} · ${c.time}</span></div>
        <div class="sub">${c.date}</div></article>`);
    });
  }
  /** API-003 limit = rules.ledger.historyPageDefault, before = meta.nextBefore @param {boolean} more */
  async function load(more) {
    if (!more) skeleton();
    const res = await getMatches(/** @type {string} */ (session.token), { limit: rules.ledger.historyPageDefault,
      before: more ? nextBefore : null });
    if (!alive) return;
    if (!res.ok) {
      if (res.status === 401) return ctx.unauthorized(); // UC-018 E2
      body.innerHTML = `<div class="retry-panel"><p>전적을 불러오지 못했습니다</p><button type="button"
        class="btn btn-primary" data-retry>다시 시도</button></div>`; // UC-018 E1
      return;
    }
    if (!more && res.data.length === 0) {
      // UC-018 4a 빈 상태
      body.innerHTML = `<div class="empty-state"><div aria-hidden="true" style="font-size:48px">📜</div>
        <p>아직 경기 기록이 없습니다</p><button type="button" class="btn btn-primary" data-back>대전하러 가기</button></div>`;
      return;
    }
    if (!more) frame();
    const before = loaded;
    append(res.data);
    loaded += res.data.length;
    nextBefore = res.meta?.nextBefore ?? null;
    /** @type {HTMLElement} */ (body.querySelector("[data-more]")).hidden = !nextBefore;
    // [더 보기] 뒤 새 첫 행으로 포커스
    if (more) /** @type {HTMLElement | null} */ (body.querySelectorAll("tbody tr")[before])?.focus();
  }
  root.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target).closest("button");
    if (!t) return;
    if (t.dataset.back !== undefined) back();
    else if (t.dataset.retry !== undefined) load(false);
    else if (t.dataset.more !== undefined) load(true);
  });
  const onKey = (e) => {
    if (e.key === "Escape") back();
  };
  document.addEventListener("keydown", onKey);
  load(false);
  return {
    unmount() {
      alive = false;
      document.removeEventListener("keydown", onKey);
    },
  };
}
