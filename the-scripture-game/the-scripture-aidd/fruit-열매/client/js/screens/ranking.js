// ranking.js — SCR-008 DOM 구성만
// TASK-067-2 | REQ-015 FR-070 FR-071 FR-078 | SCR-008 | API-004 | UC-019 1~3·3a·E1 | design-vision §3.8 WF-008 |
// screen-vision §2 SCR-008·§5 SCR-008 (내 행 aria-current, 메달 배지 aria-label)
import { getLeaderboard } from "../net/api.js";
import { session } from "../store/session.js";
import { esc, iconSvg } from "./shell.js";

/** 1~3위 성막 재료 메달(금·은·놋) — 코드 그래픽 원형 배지 (이모지 아님) @param {number} rank */
const medal = (rank) => (rank <= 3 ? `<span class="medal m${rank}" aria-label="${rank}위">${rank}</span>`
  : `<span class="num">${rank}</span>`);

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  root.innerHTML = `<div class="scr scr-ranking"><header class="bar"><div class="bar-side"><button type="button"
    class="btn btn-ghost" data-back>${iconSvg("back")} 로비</button></div><h1>랭킹 (레이팅 상위 100)</h1>
    <div class="bar-side"></div></header><main data-body></main></div>`;
  const body = /** @type {HTMLElement} */ (root.querySelector("[data-body]"));
  let alive = true;
  const back = () => ctx.nav("#/lobby");

  async function load() {
    body.innerHTML = `<div aria-busy="true" style="display:grid;gap:8px">
      ${"<div class=\"skeleton\"></div>".repeat(8)}</div>`;
    const res = await getLeaderboard(/** @type {string} */ (session.token));
    if (!alive) return;
    if (!res.ok) {
      if (res.status === 401) return ctx.unauthorized();
      body.innerHTML = `<div class="retry-panel"><p>랭킹을 불러오지 못했습니다</p><button type="button" class="btn btn-primary"
        data-retry>다시 시도</button></div>`; // UC-019 E1
      return;
    }
    const { top, me } = res.data;
    if (!top.length) {
      body.innerHTML = "<div class=\"empty-state\"><p>아직 순위가 없습니다</p></div>";
      return;
    }
    const inTop = top.some((r) => r.isMe);
    body.innerHTML = `<table class="data-table"><caption>랭킹</caption><thead><tr><th scope="col">순위</th>
      <th scope="col">닉네임</th><th scope="col">레이팅</th></tr></thead><tbody>${top.map((r) => `<tr${r.isMe
        ? " class=\"is-me\" aria-current=\"true\"" : ""}><td>${medal(r.rank)}</td>
        <td class="nick">${esc(r.nickname)}${r.isMe ? " (나)" : ""}</td><td class="num">${r.rating}</td></tr>`).join("")}
      </tbody></table>
      ${!inTop && me ? `<div class="my-rank-bar">내 순위: ${me.rank}위 · ${esc(me.nickname)} · ${me.rating}</div>` : ""}`;
    // 내 행이 있으면 그 행으로 스크롤(가운데)
    body.querySelector("tr.is-me")?.scrollIntoView({ block: "center" });
  }
  root.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target).closest("button");
    if (t?.dataset.back !== undefined) back();
    else if (t?.dataset.retry !== undefined) load();
  });
  const onKey = (e) => {
    if (e.key === "Escape") back();
  };
  document.addEventListener("keydown", onKey);
  load();
  return {
    unmount() {
      alive = false;
      document.removeEventListener("keydown", onKey);
    },
  };
}
