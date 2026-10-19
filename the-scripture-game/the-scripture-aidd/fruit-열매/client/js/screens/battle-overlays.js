// battle-overlays.js — 퀴즈 모달·일시정지·이탈 확인·회전 안내·치명 오류 모달 DOM만
// TASK-066 | REQ-011 REQ-013 FR-009 FR-040~FR-042 FR-057 C-003 | SCR-005 덧씌움 | API-016 API-018 API-025~API-027
// API-031 | design-vision §3.5.5 (a)~(g)·§4.5 퀴즈 거부·§4.6.9 Q-01~Q-11·§6.1 2.1.2 | D3-07 D3-13 D3-14 | UC-006 6a
// 퀴즈 정답은 서버만 안다(TBL-017 — quiz.json은 번들에 없음). 모달 안 연출(Q-*)은 juice 표 행에 요소를 넘긴다.
import { gsap } from "gsap";
import { esc, iconSvg, verseBlock } from "./shell.js";
import { createOptionsPanel } from "./options.js";

/** CODE-012 퀴즈 유형 */
const QUIZ_TYPE = { person: "인물", event: "사건", verse_blank: "구절 빈칸" };
/** Q-11 남은 시간 3초부터 매초 */
const WARN_FROM_S = 3;

/**
 * @param {{ root: HTMLElement, juice: any, room: any, shell: any, versus: boolean, onLeave: () => void,
 *   onQuit: () => void, onPause: (on: boolean) => void }} o
 */
export function createOverlays(o) {
  /** @type {null | { el: HTMLElement, quizId: string, timer: number, lockedUntil: number, done: boolean }} */
  let quiz = null;
  /** @type {HTMLElement | null} */ let menu = null;
  /** @type {HTMLElement | null} */ let confirmEl = null;
  /** @type {HTMLElement | null} */ let fatalEl = null;
  const prep = document.createElement("p");
  prep.className = "prep";
  prep.setAttribute("role", "status");
  o.root.appendChild(prep);
  const rotate = document.createElement("div");
  rotate.className = "rotate-prompt";
  rotate.hidden = true;
  rotate.innerHTML = `<div aria-hidden="true" style="font-size:64px">📱↻</div><p>기기를 세로로 돌려 주세요</p>`;
  document.body.appendChild(rotate);

  /** 가상 좌표 모달 (§3.5.5) @param {string} cls @param {string} html */
  function modal(cls, html) {
    const back = document.createElement("div");
    back.className = `ov-modal ${cls}`;
    back.innerHTML = `<div class="ov-box" role="dialog" aria-modal="true">${html}</div>`;
    o.root.appendChild(back);
    const box = /** @type {HTMLElement} */ (back.firstElementChild);
    gsap.fromTo(box, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.26, ease: "back.out(1.4)" });
    // §6.1 2.1.2 모달 안 Tab 순환
    back.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const f = /** @type {HTMLElement[]} */ ([...box.querySelectorAll("button, input")]);
      if (!f.length) return;
      const i = f.indexOf(/** @type {HTMLElement} */ (document.activeElement));
      const n = f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length];
      n.focus();
      e.preventDefault();
    });
    return back;
  }
  const closeEl = (el) => {
    if (!el) return;
    gsap.to(el, { opacity: 0, duration: 0.16, ease: "power2.in", onComplete: () => el.remove() });
  };

  /** API-016 answer + Q-02 @param {number} choice */
  function answer(choice) {
    if (!quiz || quiz.done || performance.now() < quiz.lockedUntil) return;
    const btn = /** @type {HTMLElement} */ (quiz.el.querySelectorAll("[data-choice]")[choice]);
    if (!btn) return;
    o.room.answer(quiz.quizId, choice);
    o.juice.emit("Q-02", { el: btn });
    quiz.el.dataset.last = String(choice);
  }

  const api = {
    get quizOpen() { return !!quiz && !quiz.done; },
    get menuOpen() { return !!menu || !!confirmEl; },
    answer,
    /** API-026 quiz → 두 보드 정지 + 모달 Q-01 (10초 원형 타이머) @param {any} d */
    openQuiz(d) {
      api.closeQuiz();
      const stars = "★".repeat(d.difficulty ?? 1);
      const el = modal("ov-quiz", `<div class="quiz-head">
        <div class="quiz-timer" data-timer><span data-left>10</span></div>
        <span>유형: ${esc(QUIZ_TYPE[d.type] ?? d.type)} · ${stars}</span></div><h2>말씀 대결</h2>
        <p class="quiz-q" role="alert">${esc(d.question)}</p>
        <div class="quiz-choices">${d.choices.map((c, i) => `<button type="button" class="btn btn-secondary"
          data-choice="${i}">
          <span class="key">${i + 1}</span> ${esc(c)}</button>`).join("")}</div>
        <div class="lockbar" data-lock hidden><i></i></div><div class="quiz-result" data-result></div>`);
      const t0 = performance.now();
      const limit = d.timeLimitMs;
      let warned = WARN_FROM_S + 1;
      quiz = { el, quizId: d.quizId, lockedUntil: 0, done: false, timer: window.setInterval(() => {
        const left = Math.max(0, limit - (performance.now() - t0));
        const s = Math.ceil(left / 1000);
        /** @type {HTMLElement} */ (el.querySelector("[data-left]")).textContent = String(s);
        const ring = /** @type {HTMLElement} */ (el.querySelector("[data-timer]"));
        ring.style.setProperty("--t", `${(left / limit) * 100}%`);
        if (s <= WARN_FROM_S && s < warned && s > 0) { // Q-11 남은 3초 매초 AUX-03
          warned = s;
          o.juice.emit("Q-11", { el: el.querySelector("[data-left]") });
        }
      }, 100) };
      el.addEventListener("click", (e) => {
        const b = /** @type {HTMLElement} */ (e.target).closest("[data-choice]");
        if (b) answer(Number(/** @type {HTMLElement} */ (b).dataset.choice));
      });
      o.juice.emit("Q-01", { modal: el.firstElementChild });
      /** @type {HTMLElement} */ (el.querySelector("[data-choice]")).focus();
    },
    /** §4.5 QUIZ_WRONG(3초 잠금 막대)·QUIZ_LOCKED·QUIZ_CLOSED @param {any} d */
    quizReject(d) {
      if (!quiz) return;
      const res = /** @type {HTMLElement} */ (quiz.el.querySelector("[data-result]"));
      res.textContent = d.message;
      if (d.code === "QUIZ_WRONG") {
        const btn = quiz.el.querySelectorAll("[data-choice]")[Number(quiz.el.dataset.last ?? 0)];
        btn?.classList.add("is-wrong");
        o.juice.emit("Q-03", { el: btn });
        const ms = d.retryInMs ?? 3000;
        quiz.lockedUntil = performance.now() + ms;
        const bar = /** @type {HTMLElement} */ (quiz.el.querySelector("[data-lock]"));
        bar.hidden = false;
        gsap.fromTo(bar.firstElementChild, { scaleX: 1 }, { scaleX: 0, duration: ms / 1000, ease: "none",
          onComplete: () => {
          bar.hidden = true;
          if (quiz) o.juice.emit("Q-04", { els: [...quiz.el.querySelectorAll("[data-choice]")] });
        } });
      } else if (d.code === "QUIZ_LOCKED") o.shell.audio.aux.play("AUX-11");
    },
    /** API-027 quizResult → Q-05~Q-08 + 해설 구절 3줄 + 재개 막대, resumeInMs 뒤 Q-10 @param {any} d @param {number} mySlot
     *  @param {() => void} onResume */
    quizResult(d, mySlot, onResume) {
      if (!quiz) return void setTimeout(onResume, d.resumeInMs);
      const q = quiz;
      q.done = true;
      clearInterval(q.timer);
      q.el.querySelectorAll("[data-choice]").forEach((b, i) => b.classList.toggle("is-correct", i === d.correctIndex));
      const res = /** @type {HTMLElement} */ (q.el.querySelector("[data-result]"));
      const won = d.winnerSlot === mySlot;
      const head = d.winnerSlot === null ? "아무도 맞히지 못했습니다" : won ? `✦ 말씀의 승리!${d.reward?.kind === "gauge"
        ? ` (+${d.reward.amount} 믿음)` : ""}` : "상대가 먼저 맞혔습니다";
      res.innerHTML = `<p class="quiz-q">${esc(head)}</p>${verseBlock(d.verseRef)}<div class="resumebar"><i></i></div>`;
      gsap.fromTo(res.querySelector(".resumebar i"), { scaleX: 0 },
        { scaleX: 1, duration: d.resumeInMs / 1000, ease: "none" });
      // 모달 가운데 위 (§3.5.5 b — 가로형 (300,140) 680 / 세로형 (20,280) 680)
      const at = o.root.dataset.layout?.startsWith("p") ? { x: 360, y: 300 } : { x: 640, y: 160 };
      if (d.winnerSlot === null) o.juice.emit("Q-08", { at });
      else if (won) o.juice.emit("Q-05", { reward: d.reward, at });
      else o.juice.emit("Q-06", { at });
      if (typeof d.gapMs === "number" && !won) o.juice.emit("Q-07", { gapMs: d.gapMs, at }); // FR-042 늦게 맞힌 쪽에만
      o.shell.announce(head + (typeof d.gapMs === "number" ? ` ${(d.gapMs / 1000).toFixed(2)}초 차이!` : ""),
        { assertive: true });
      setTimeout(() => {
        o.juice.emit("Q-10", { modal: q.el.firstElementChild });
        if (quiz === q) api.closeQuiz();
        onResume();
      }, d.resumeInMs);
    },
    closeQuiz() {
      if (!quiz) return;
      clearInterval(quiz.timer);
      closeEl(quiz.el);
      quiz = null;
    },
    /** §3.5.5 (c) 옵션 모달 (사람·봇 — 게임 계속) */
    openOptions() {
      if (menu) return;
      menu = modal("ov-menu", "");
      const box = /** @type {HTMLElement} */ (menu.firstElementChild);
      box.appendChild(createOptionsPanel({ shell: o.shell, modal: true, onClose: api.closeMenu,
        onLeaveMatch: () => api.confirmLeave() }));
      /** @type {HTMLElement} */ (box.querySelector("button")).focus();
    },
    /** §3.5.5 (d) 일시정지 (연습 — 로컬 엔진 정지, 서버 쿨다운 시계는 계속) */
    openPause() {
      if (menu) return;
      o.onPause(true);
      menu = modal("ov-menu", `<h2>일시정지</h2><div class="menu-list">
        <button type="button" class="btn btn-primary" data-resume>계속하기 <span class="key">Esc</span></button>
        <button type="button" class="btn btn-secondary" data-opts>옵션</button>
        <button type="button" class="btn btn-ghost" data-quit>그만하기</button></div>`);
      menu.addEventListener("click", (e) => {
        const t = /** @type {HTMLElement} */ (e.target).closest("button");
        if (!t) return;
        if (t.dataset.resume !== undefined) api.closeMenu();
        else if (t.dataset.quit !== undefined) { api.closeMenu(false); o.onQuit(); } // UC-006 6a topout voluntary
        else if (t.dataset.opts !== undefined) {
          const box = /** @type {HTMLElement} */ (menu?.firstElementChild);
          box.replaceChildren(createOptionsPanel({ shell: o.shell, modal: true, onClose: api.closeMenu }));
        }
      });
      /** @type {HTMLElement} */ (menu.querySelector("[data-resume]")).focus();
    },
    /** @param {boolean} [resume] */
    closeMenu(resume = true) {
      closeEl(menu);
      menu = null;
      if (!o.versus && resume) o.onPause(false);
    },
    /** §3.5.5 (e) 이탈 확인 (D3-13) — [머무르기] 기본 포커스 / [나가기] = 방 소켓 닫기 → 로비 (FR-009) */
    confirmLeave() {
      if (confirmEl) return;
      confirmEl = modal("ov-menu", `<h2>경기 나가기</h2><p>경기를 나가면 패배로 기록됩니다. 나가시겠습니까?</p>
        <div class="actions"><button type="button" class="btn btn-primary" data-stay>머무르기</button>
        <button type="button" class="btn btn-secondary" data-go>나가기</button></div>`);
      confirmEl.style.zIndex = "420";
      confirmEl.addEventListener("click", (e) => {
        const t = /** @type {HTMLElement} */ (e.target).closest("button");
        if (t?.dataset.stay !== undefined) api.closeConfirm();
        else if (t?.dataset.go !== undefined) o.onLeave();
      });
      /** @type {HTMLElement} */ (confirmEl.querySelector("[data-stay]")).focus();
    },
    closeConfirm() {
      closeEl(confirmEl);
      confirmEl = null;
    },
    /** §3.5.5 (g) 연결 끊김 / 경기 중단 — error.message + [로비로] @param {string} message */
    showFatal(message) {
      if (fatalEl) return;
      api.closeQuiz();
      fatalEl = modal("ov-menu fatal", `<h2>${iconSvg("lock")} 경기 중단</h2><p role="alert">${esc(message)}</p>
        <div class="actions"><button type="button" class="btn btn-primary" data-lobby>로비로</button></div>`);
      fatalEl.querySelector("[data-lobby]")?.addEventListener("click", o.onLeave);
      /** @type {HTMLElement} */ (fatalEl.querySelector("[data-lobby]")).focus();
    },
    get fatal() { return !!fatalEl; },
    /** §3.5.5 (f) 세로 회전 안내 (D3-14) @param {boolean} on */
    setRotate(on) { rotate.hidden = !on; },
    /** 로딩 "전장을 준비하는 중…" / 다음 라운드 안내 @param {string} text */
    setPrep(text) { prep.textContent = text; },
    /** Esc — 열린 모달 닫기, 없으면 옵션(사람·봇) / 일시정지(연습) */
    escape() {
      if (fatalEl || quiz) return;
      if (confirmEl) return api.closeConfirm();
      if (menu) return api.closeMenu();
      if (o.versus) api.openOptions();
      else api.openPause();
    },
    destroy() {
      api.closeQuiz();
      rotate.remove();
      prep.remove();
      menu?.remove();
      confirmEl?.remove();
      fatalEl?.remove();
    },
  };
  return api;
}
