// main.js — 해시 라우터·가드·화면 전환·@fontsource import만
// TASK-061 | REQ-002 REQ-013 FR-050 FR-078 NFR-005 | ARCH-001 | screen-vision §1·§3 라우팅 가드 | design-vision §2.6 로딩·
// §3.0 화면 흐름·§4.1 화면 전환 | D3-12 (해시 라우팅) | UC-001 1·1a·E3·E4
// 글꼴은 번들(@fontsource — 외부 CDN 0, NFR-005). document.fonts.ready 뒤 첫 화면(§2.6 글꼴 깜빡임 방지).
import "@fontsource/cinzel/400.css";
import "@fontsource/cinzel/700.css";
import "@fontsource/cinzel/900.css";
import "@fontsource/noto-serif-kr/400.css";
import "@fontsource/noto-serif-kr/700.css";
import "@fontsource/noto-serif-kr/900.css";
import { gsap } from "gsap";
import { createShell } from "./screens/shell.js";
import { session, clearAuth } from "./store/session.js";
import { readGuest, clearGuest } from "./store/guest.js";
import { getSettings } from "./store/settings.js";
import * as entry from "./screens/entry.js";
import * as lobby from "./screens/lobby.js";
import * as heroSelect from "./screens/hero-select.js";
import * as waiting from "./screens/waiting.js";
import * as battle from "./screens/battle.js";
import * as result from "./screens/result.js";
import * as historyScreen from "./screens/history.js";
import * as ranking from "./screens/ranking.js";
import * as options from "./screens/options.js";

/** screen-vision §1 화면 9개 (SCR-001~SCR-009) */
const ROUTES = {
  "#/entry": entry, "#/lobby": lobby, "#/hero": heroSelect, "#/waiting": waiting, "#/battle": battle,
  "#/result": result, "#/history": historyScreen, "#/ranking": ranking, "#/options": options,
};
/** §2.6 미리 불러올 6개 굵기 (한국어 표본 글자로 한글 부분 집합까지) */
const FONT_LOADS = ["400 16px Cinzel", "700 16px Cinzel", "900 16px Cinzel", "400 16px 'Noto Serif KR'",
  "700 16px 'Noto Serif KR'", "900 16px 'Noto Serif KR'"];
const FONT_SAMPLE = "영적 전쟁 테트리스 SPIRITUAL WARFARE 0123";
const FONT_WAIT_MS = 4000;

const screenEl = /** @type {HTMLElement} */ (document.getElementById("screen"));
const shell = createShell();
/** @type {{ route: string, mod: any, inst: any } | null} */
let current = null;
let booted = false;
let navigating = Promise.resolve();

/**
 * screen-vision §3 라우팅 가드 — 들어갈 수 있는 경로로 바꾼다.
 * @param {string} hash @returns {string}
 */
function guard(hash) {
  const authed = session.authed;
  if (!ROUTES[hash]) return authed ? "#/lobby" : "#/entry";
  if (hash === "#/entry") return authed ? "#/lobby" : hash;
  if (!authed) return "#/entry";
  const f = session.flow;
  if (hash === "#/hero" && !f.mode) return "#/lobby";
  if (hash === "#/waiting" && !(f.mode && f.heroId)) return "#/lobby";
  // 활성 대전 세션(방 소켓 열림 + 첫 start) — 새로고침으로 들어오면 로비 (경기 복귀 없음, N-02)
  if (hash === "#/battle" && !(session.battle?.start && session.battle.room?.open)) return "#/lobby";
  if (hash === "#/result" && !session.lastMatchEnd) return "#/lobby";
  return hash;
}

/** 화면에 넘기는 공용 문맥 */
const ctx = {
  session, shell,
  /** @param {string} route @param {{ force?: boolean }} [o] force = 이탈 확인을 거친 이동 */
  nav(route, o = {}) {
    if (o.force && current) current.forced = true;
    if (location.hash === route) render(route);
    else location.hash = route;
  },
  /** 진행 중 401·UNAUTHORIZED (screen-vision §3 마지막 행) */
  unauthorized() {
    clearGuest();
    clearAuth();
    shell.toast("입장 정보가 올바르지 않습니다.", { error: true });
    ctx.nav("#/entry", { force: true });
  },
  /** 부팅 완료 (SCR-001 토큰 확인 끝) @param {string} target */
  booted(target) {
    booted = true;
    const t = guard(target);
    // 이미 그 화면(입장 폼)이면 다시 그리지 않는다 — 입력 중인 칸 유지
    if (current?.route === t) history.replaceState(null, "", t);
    else ctx.nav(t);
  },
};

/** §4.1 메뉴 ↔ 메뉴: 나가는 화면 120ms power2.in, 들어오는 화면 200ms power2.out (감소 모드: 투명도만) */
async function swap(next, route, opts) {
  const reduced = getSettings().reducedMotion;
  if (current) {
    if (!current.mod.battleScreen) {
      await gsap.to(screenEl, { opacity: 0, y: reduced ? 0 : -12, duration: 0.12, ease: "power2.in" });
    }
    try {
      current.inst?.unmount?.();
    } catch (err) {
      console.error("화면 정리 실패", err);
    }
  }
  screenEl.replaceChildren();
  shell.setBattleScene(!!next.battleScreen);
  window.scrollTo(0, 0);
  current = { route, mod: next, inst: null, forced: false };
  current.inst = next.mount(screenEl, ctx, opts);
  if (!next.battleScreen) {
    gsap.fromTo(screenEl, { opacity: 0, y: reduced ? 0 : 12 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" });
    // §4.2 화면 전환 후 포커스는 제목(h1, tabindex=-1)으로
    const h1 = /** @type {HTMLElement | null} */ (screenEl.querySelector("h1"));
    h1?.setAttribute("tabindex", "-1");
    if (!screenEl.contains(document.activeElement)) h1?.focus({ preventScroll: true });
  }
}

/** @param {string} hash */
function render(hash) {
  navigating = navigating.then(async () => {
    const target = booted ? guard(hash) : hash;
    if (target !== location.hash) history.replaceState(null, "", target);
    if (!booted) {
      // UC-001 1단계: 어느 경로로 들어와도 1회 저장 게스트 확인 (BootSplash)
      await swap(entry, "#/entry", { boot: { guest: readGuest(), target: hash || "#/lobby" } });
      return;
    }
    if (current && current.route !== "#/options" && target !== current.route) session.previousRoute = current.route;
    await swap(ROUTES[target], target, {});
  }).catch((err) => console.error("화면 전환 실패", err));
}

window.addEventListener("hashchange", () => {
  const next = location.hash;
  // D3-13 대전 화면 이탈 시도 → 이탈 확인 모달, [머무르기]면 해시 복원
  if (current && !current.forced && current.inst?.canLeave && current.inst.canLeave(next) === false) {
    history.replaceState(null, "", current.route);
    return;
  }
  render(next);
});

/** §2.6 로딩: 6개 굵기를 미리 불러오고 document.fonts.ready 뒤 첫 화면 */
async function loadFonts() {
  try {
    const loads = Promise.all(FONT_LOADS.map((f) => document.fonts.load(f, FONT_SAMPLE)));
    await Promise.race([loads.then(() => document.fonts.ready), new Promise((r) => setTimeout(r, FONT_WAIT_MS))]);
  } catch (err) {
    console.error("글꼴 불러오기 실패", err);
  }
}

loadFonts().then(() => render(location.hash));
