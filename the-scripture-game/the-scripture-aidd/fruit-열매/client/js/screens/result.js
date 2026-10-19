// result.js — SCR-006 DOM 구성·결과 연출 이벤트 발행만
// TASK-067-1 | REQ-001 REQ-013 REQ-014 REQ-015 FR-007 FR-056 FR-063 FR-065 FR-066 FR-068 FR-070 FR-078 C-003 |
// SCR-006 |
// API-030 | UC-015 5~10·6a·6b·9a·E2·E3, UC-016 5, UC-006 6 | design-vision §3.6 WF-006·§4.6.13 AC·RT·GR·SV·§2.13.6 |
// screen-vision §2 SCR-006·§5 SCR-006
// 화면 진입은 저장된 마지막 matchEnd로만 그린다(서버 기록 결과 — 클라이언트는 기록을 만들지 않음, FR-068).
import { achievementSeal } from "../art/shapes-ui.js";
import { toSvg } from "../art/to-svg.js";
import { heroesById, rules, versesByRef } from "../content.js";
import { canShareVerseCard, drawVerseCard, saveVerseCard, shareVerseCard, verseCardFile } from "../fx/verse-card.js";
import { session } from "../store/session.js";
import { getJuice } from "./battle.js";
import { esc, iconSvg, verseBlock } from "./shell.js";

const playTime = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
const minSec = (ms) => `${Math.floor(ms / 60000)}분 ${Math.floor((ms % 60000) / 1000)}초`;

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  const d = session.lastMatchEnd;
  const you = d.you ?? {};
  const practice = d.mode === "practice";
  const win = you.result === "win";
  const heroId = session.lastMatchMeta.heroId ?? undefined;
  const rec = you.record ?? {};
  const growth = you.growth;
  const title = practice ? "연습 종료" : win ? "VICTORY" : "DEFEAT";
  const reason = d.reason === "disconnect" ? "상대가 나갔습니다" : "Top-out";
  const mine = d.wins?.[(you.slot ?? 1) - 1] ?? 0;
  const theirs = d.wins?.[2 - (you.slot ?? 1)] ?? 0;
  /** RecordTable 행: [이름, 값, 성장 키, 형식] — 연습은 퀴즈 정답률 행 숨김 */
  const rows = [["최대 콤보", rec.maxCombo, "maxCombo", (v) => String(v)],
    ["분당 공격", rec.attackPerMin, "attackPerMin", (v) => Number(v).toFixed(1)],
    ...(practice ? [] : [["퀴즈 정답률", rec.quizRate, "quizRate", (v) => `${Math.round(v * 100)}%`]]),
    ["테트리스", rec.tetrisCount, null, (v) => String(v)], ["지운 줄", rec.linesCleared, null, (v) => String(v)],
    ["플레이 시간", rec.playTimeMs, null, (v) => playTime(v)]];
  const gtext = (key, v) => {
    if (!growth || !key || typeof growth[key] !== "number") return "";
    const g = growth[key];
    const a = Math.abs(g);
    const val = key === "quizRate" ? `${Math.round(a * 100)}%p` : key === "attackPerMin" ? a.toFixed(1) : String(a);
    return `<span class="growth ${g >= 0 ? "up" : "down"}">${g >= 0 ? "▲" : "▼"} ${val}</span>`;
  };
  const v = versesByRef.get(d.verseRef);
  root.innerHTML = `<div class="scr scr-result">
    <header class="result-head"><h1 class="result-title ${practice ? "practice" : win ? "win" : "lose"}">${title}</h1>
      <p class="scoreline">${practice ? minSec(d.durationMs ?? 0)
        : `${mine} : ${theirs} · ${minSec(d.durationMs ?? 0)} · 사유: ${reason}`}</p>
      ${win && d.victoryVerseRef ? verseBlock(d.victoryVerseRef) : ""}</header>
    <div class="result-grid">
      <section><canvas class="card-preview" role="img" aria-label="${esc(v ? `${v.kjv} ${v.ko} ${v.ref}` : "")}"
        data-card></canvas><div class="card-actions"><button type="button" class="btn btn-secondary" data-save>
        ${iconSvg("save")} 이미지 저장</button><button type="button" class="btn btn-secondary" data-share hidden>
        ${iconSvg("share")} 공유</button></div></section>
      <section><table class="record-table"><caption class="sr-only">개인 기록</caption><thead><tr><th scope="col">개인 기록
        </th><th scope="col"></th>${growth ? "<th scope=\"col\">지난 경기 대비</th>" : ""}</tr></thead><tbody>
        ${rows.map(([n, val, key, fmt]) => `<tr data-row><th scope="row">${n}</th>
          <td>${val == null ? "—" : fmt(val)}</td>
          ${growth ? `<td>${gtext(key, val)}</td>` : ""}</tr>`).join("")}</tbody></table>
        ${you.rating ? `<p class="rating-line">레이팅 <span class="num">${you.rating.before}</span> → <span class="num"
          data-rating>${you.rating.before}</span> (${you.rating.after - you.rating.before >= 0 ? "+" : ""}${
          you.rating.after - you.rating.before})</p>` : ""}
        ${(you.achievements ?? []).map((id) => {
          const a = rules.achievements[id];
          const emblem = heroesById.get(a?.heroId ?? heroId ?? "")?.emblem ?? "sling";
          return `<div class="achv"><span data-seal>${toSvg(achievementSeal(emblem), 64, { label: "업적 인장" })}</span>
            <b>🏅 업적 달성 — ${esc(a?.name_ko ?? id)}</b></div>`;
        }).join("")}
        ${you.saved === false ? "<p class=\"save-fail\" role=\"alert\" data-savefail>기록 저장에 실패했습니다</p>" : ""}
      </section>
    </div>
    <footer class="result-foot"><button type="button" class="btn btn-primary" data-lobby>로비로</button></footer>
  </div>`;
  const q = (s) => /** @type {HTMLElement} */ (root.querySelector(s));
  const card = { verseRef: d.verseRef, heroId };
  const toLobby = () => ctx.nav("#/lobby");
  drawVerseCard({ ...card, canvas: /** @type {HTMLCanvasElement} */ (q("[data-card]")) }).catch((err) => console.error(
    "말씀 카드 그리기 실패", err));
  // UC-015 9a — PNG 파일로 navigator.canShare가 참일 때만 [공유]
  verseCardFile(card).then((file) => { q("[data-share]").hidden = !canShareVerseCard(file); }).catch(() => {});
  root.addEventListener("click", async (e) => {
    const t = /** @type {HTMLElement} */ (e.target).closest("button");
    if (!t) return;
    if (t.dataset.lobby !== undefined) return toLobby();
    if (t.dataset.save !== undefined) {
      const r = await saveVerseCard(card);
      if (!r.ok) ctx.shell.toast("카드를 저장하지 못했습니다", { error: true }); // UC-015 E3
    } else if (t.dataset.share !== undefined) {
      const r = await shareVerseCard(card);
      if (!r.ok && !r.cancelled) ctx.shell.toast("카드를 저장하지 못했습니다", { error: true });
    }
  });
  const onKey = (e) => {
    if (e.key === "Escape") toLobby();
  };
  document.addEventListener("keydown", onKey);
  q("[data-lobby]").focus({ preventScroll: true }); // 기본 포커스 (screen-vision §5 SCR-006)
  ctx.shell.audio.bgm.play("lobby", { fadeInSec: 2 }); // BGM-1 2초 페이드 인

  // 결과 연출 AC-01·RT-01·GR-01·SV-01 (§4.6.13) — 같은 juice 지휘자, 대전 밖이므로 바로 실행(flush)
  const juice = getJuice();
  if (juice) {
    const ratingEl = root.querySelector("[data-rating]");
    if (ratingEl && you.rating) juice.emit("RT-01", { el: ratingEl, from: you.rating.before, to: you.rating.after });
    if (growth) juice.emit("GR-01", { rows: [...root.querySelectorAll("[data-row]")] });
    root.querySelectorAll("[data-seal]").forEach((el) => juice.emit("AC-01", { el, origin: { x: 0.75, y: 0.5 } }));
    const fail = root.querySelector("[data-savefail]");
    if (fail) juice.emit("SV-01", { el: fail });
    juice.flush();
  } else if (you.rating) q("[data-rating]").textContent = String(you.rating.after);
  if (session.profile && you.rating) session.profile.rating = you.rating.after;
  return {
    unmount() {
      document.removeEventListener("keydown", onKey);
    },
  };
}
