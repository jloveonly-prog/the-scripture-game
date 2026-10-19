// entry.js — SCR-001 DOM 구성·이벤트 연결만
// TASK-064-1 | REQ-002 FR-012 FR-078 NFR-003 NFR-008 | SCR-001 | API-001 API-002 | UC-001 1·1a·E1~E4 |
// design-vision §3.1 WF-001·§4.2 입력칸 오류 | screen-vision §2 SCR-001·§5 SCR-001 | 봉인 제5계명(공개 안내)
import { gsap } from "gsap";
import { rules } from "../content.js";
import { createGuest, getMe } from "../net/api.js";
import { readGuest, writeGuest, clearGuest } from "../store/guest.js";
import { setProfile } from "../store/session.js";
import { esc, spinnerHtml, verseBlock } from "./shell.js";

/** rules.nickname.pattern (trim 후 검사 — UC-001 E1) */
const NICK = new RegExp(rules.nickname.pattern);
const RULE_TEXT = `${rules.nickname.min}~${rules.nickname.max}자 · 한글·영문·숫자·_`;
/** 429 RATE_LIMITED → 버튼 5초 비활성 (screen-vision SCR-001) */
const RATE_LOCK_MS = 5000;
const TITLE_VERSE = "Ephesians 6:12";

/**
 * @param {HTMLElement} root @param {any} ctx
 * @param {{ boot?: { guest: { token: string } | null, target: string } }} [opts]
 */
export function mount(root, ctx, opts = {}) {
  root.innerHTML = `<main class="scr scr-entry">
    <p class="title-en" lang="en">SPIRITUAL WARFARE TETRIS</p>
    <h1>영적 전쟁 테트리스</h1>
    <div class="divider" aria-hidden="true">✦</div>
    ${verseBlock(TITLE_VERSE)}
    <div class="boot" data-boot hidden aria-busy="true">${spinnerHtml()}<p>입장 정보를 확인하는 중…</p></div>
    <div class="card retry-panel" data-retry hidden><p data-retry-msg></p>
      <button type="button" class="btn btn-primary" data-retry-btn>다시 시도</button></div>
    <form class="card entry-card" data-form hidden novalidate>
      <label for="nick">닉네임</label>
      <input id="nick" class="input" name="nickname" maxlength="${rules.nickname.max}" autocomplete="off"
        autocapitalize="off" spellcheck="false" aria-describedby="nick-help nick-err" required />
      <p id="nick-help" class="field-help">${esc(RULE_TEXT)}</p>
      <p id="nick-err" class="field-error" role="alert"></p>
      <p class="notice">ⓘ 닉네임은 랭킹에 공개됩니다.</p>
      <button type="submit" class="btn btn-primary btn-block" aria-disabled="true">입장하기</button>
    </form>
  </main>`;
  const q = (s) => /** @type {any} */ (root.querySelector(s));
  const form = q("[data-form]");
  const input = q("#nick");
  const err = q("#nick-err");
  const btn = form.querySelector("button");
  const boot = q("[data-boot]");
  const retry = q("[data-retry]");
  let busy = false;
  let lockedUntil = 0;
  let alive = true;
  input.setAttribute("pattern", rules.nickname.pattern);

  /** @param {"form" | "boot" | "retry"} which @param {string} [msg] @param {() => void} [again] */
  function show(which, msg = "", again) {
    form.hidden = which !== "form";
    boot.hidden = which !== "boot";
    retry.hidden = which !== "retry";
    if (which === "retry") {
      q("[data-retry-msg]").textContent = msg;
      q("[data-retry-btn]").onclick = again;
    }
    if (which === "form") input.focus({ preventScroll: true });
  }
  const valid = () => NICK.test(input.value.trim());
  function refreshButton() {
    const ok = valid() && !busy && Date.now() >= lockedUntil;
    btn.setAttribute("aria-disabled", String(!ok));
  }
  /** UC-001 E1 오류 문장 + aria-invalid + 칸 좌우 흔들림 6px 2회 200ms (§4.2) @param {string} text */
  function fail(text) {
    err.textContent = text;
    input.setAttribute("aria-invalid", text ? "true" : "false");
    if (!text) return;
    gsap.fromTo(input, { x: -6 }, { x: 6, duration: 0.05, yoyo: true, repeat: 3,
      onComplete: () => gsap.set(input, { x: 0 }) });
  }

  input.addEventListener("input", () => {
    if (err.textContent && valid()) fail("");
    refreshButton();
  });
  input.addEventListener("blur", () => {
    if (input.value.trim() && !valid()) fail("닉네임 규칙(2~12자, 한글·영문·숫자·_)을 확인하세요.");
  });
  // screen-vision §4 SCR-001: 가상 키보드가 올라오면 입력칸이 보이도록
  input.addEventListener("focus", () => setTimeout(() => input.scrollIntoView({ block: "center" }), 300));

  /** API-001 입장 (Enter / 입장하기) */
  async function submit() {
    if (!valid()) {
      fail("닉네임 규칙(2~12자, 한글·영문·숫자·_)을 확인하세요.");
      return;
    }
    if (busy || Date.now() < lockedUntil) return;
    busy = true;
    btn.classList.add("is-loading");
    btn.insertAdjacentHTML("beforeend", spinnerHtml("small"));
    refreshButton();
    const res = await createGuest(input.value.trim());
    if (!alive) return;
    busy = false;
    btn.classList.remove("is-loading");
    btn.querySelector(".spinner")?.remove();
    if (res.ok) {
      writeGuest(res.data); // data-ark §8.3 swt.guest = guestId·nickname·token
      setProfile(res.data.token, { ...res.data, roundsPlayed: 0 });
      ctx.booted("#/lobby");
      return;
    }
    const code = res.error?.code;
    if (code === "NICKNAME_TAKEN") {
      fail("이미 사용 중인 닉네임입니다.");
      input.select();
    } else if (code === "NICKNAME_INVALID") fail(res.error.message);
    else if (code === "RATE_LIMITED") {
      fail(res.error.message);
      lockedUntil = Date.now() + RATE_LOCK_MS;
      setTimeout(refreshButton, RATE_LOCK_MS);
    } else show("retry", "서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요", () => show("form")); // 입력값 유지
    refreshButton();
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit();
  });

  /** UC-001 1·1a·E3·E4 저장 게스트 토큰 확인 (API-002) @param {{ token: string }} guest @param {string} target */
  async function verify(guest, target) {
    show("boot");
    const res = await getMe(guest.token);
    if (!alive) return;
    if (res.ok) {
      setProfile(guest.token, res.data);
      ctx.booted(target === "#/entry" || !target ? "#/lobby" : target);
    } else if (res.status === 401) {
      clearGuest();
      ctx.shell.toast("입장 정보가 올바르지 않습니다.", { error: true });
      ctx.booted("#/entry");
      show("form");
    } else {
      show("retry", "서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요", () => verify(readGuest() ?? guest, target));
    }
  }

  const bootInfo = opts.boot;
  if (bootInfo?.guest) verify(bootInfo.guest, bootInfo.target);
  else {
    if (bootInfo) ctx.booted("#/entry");
    show("form");
  }
  refreshButton();
  return {
    unmount() {
      alive = false;
    },
  };
}
