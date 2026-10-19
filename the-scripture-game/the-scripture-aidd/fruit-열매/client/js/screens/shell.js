// shell.js — 공통 셸 DOM 컴포넌트(배경·오디오 안내·토스트·장막·라이브 영역)만
// TASK-061 | REQ-013 FR-050 FR-058 FR-059 FR-060 FR-078 NFR-005 | screen-vision 공통 셸 | design-vision §4.1 토스트·장막·
// §4.7.1 오디오 시작·§6.4 알림 영역 | D-14 | UC-020 E1
// 오디오(믹서·SFX·AUX·BGM)는 앱에 1벌 — 첫 사용자 입력에 Tone.start()(D-14), 시작되면 안내를 닫고 BGM-1.
import { gsap } from "gsap";
import * as Tone from "tone";
import { createMixer } from "../audio/mixer.js";
import { createSfx } from "../audio/sfx.js";
import { createAuxSfx } from "../audio/aux-sfx.js";
import { createBgm } from "../audio/bgm.js";
import { getSettings, onSettings } from "../store/settings.js";
import { versesByRef, heroesById } from "../content.js";
import { escapeHtml } from "../fx/subtitle.js";
import { toSvg } from "../art/to-svg.js";
import { EMBLEMS } from "../art/shapes-heroes-armor.js";
import { UI_ICONS } from "../art/shapes-ui.js";

/** 화면 템플릿 공용: HTML 이스케이프 */
export const esc = escapeHtml;
/** §3.4 7점 원형 회전 표시 (블록 7색 — design-vision §2.2) @param {string} [cls] */
export function spinnerHtml(cls = "") {
  const colors = ["#3D7BFF", "#F2C14E", "#9B4DFF", "#A9B4C4", "#E8304A", "#EFE6D0", "#D2873A"];
  return `<div class="spinner ${cls}" aria-hidden="true">${colors.map((c, k) => `<i style="--k:${k};color:${c}"></i>`)
    .join("")}</div>`;
}
/** C-003 구절 3줄 (KJV 원문 lang=en · 직접 번역 · 출처) — verses.json에서만 @param {string} ref */
export function verseBlock(ref) {
  const v = versesByRef.get(ref);
  if (!v) return "";
  return `<div class="verse"><p class="v-en" lang="en">${esc(v.kjv)}</p><p class="v-ko">${esc(v.ko)}</p>`
    + `<p class="v-ref">${esc(v.ref)} · ${esc(v.ref_ko)}</p></div>`;
}
/** §2.13.1 위인 엠블럼 인라인 SVG (role=img + aria-label) @param {string} heroId @param {number} size */
export function emblemSvg(heroId, size) {
  const h = heroesById.get(heroId);
  const shape = h && EMBLEMS[h.emblem];
  return shape ? toSvg(shape, size, { label: shape.label_ko, className: "emblem" }) : "";
}
/** §2.13.6 UI 아이콘 24px (선 2px currentColor) @param {keyof typeof UI_ICONS} name @param {boolean} [labelled] */
export function iconSvg(name, labelled = false) {
  const shape = UI_ICONS[name];
  return toSvg(shape, 24, labelled ? { label: shape.label_ko } : {});
}

/** §4.1 토스트 2,400ms 유지(오류 4,000ms), 동시에 최대 2개 */
const TOAST_MS = 2400;
const TOAST_ERROR_MS = 4000;
const MAX_TOASTS = 2;
/** §6.4 polite 알림은 1초에 1개로 묶음 */
const POLITE_BATCH_MS = 1000;

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

/**
 * [D-03C 2026-10-19 — fruit-열매/history 기록] Tone 기본 컨텍스트(standardized-audio-context 래퍼)는
 * 노드를 연결·해제할 때마다
 * 그래프의 모든 경로를 훑어 순환을 검사한다(detectCycles) — 대전 중 합성 음이 쌓이면 메인 스레드를 수 초 막았다(E2E 실측:
 * CDP 일시정지 스택 87단계 detectCycles). 첫 사용자 입력에서(오디오 정책 — 경고 없이) 브라우저 AudioContext를 만들어
 * Tone에 넘긴다. 믹서의 Tone.start()보다 먼저 실행되도록 같은 입력 이벤트의 capture 단계에 먼저 등록한다.
 */
function useNativeAudioContext() {
  const events = ["pointerdown", "keydown", "touchend"]; // audio/mixer.js 첫 입력 이벤트와 같은 목록
  const once = () => {
    events.forEach((e) => window.removeEventListener(e, once, true));
    try {
      if (typeof AudioContext === "function") Tone.setContext(new AudioContext({ latencyHint: "interactive" }));
    } catch (err) {
      console.error("오디오 컨텍스트 준비 실패", err); // 실패하면 Tone 기본 컨텍스트로 계속
    }
  };
  events.forEach((e) => window.addEventListener(e, once, true));
}

export function createShell() {
  const toasts = $("toasts");
  const audioToast = $("audio-toast");
  const veil = $("veil");
  const polite = $("live-polite");
  const assertive = $("live-assertive");
  const reduced = () => getSettings().reducedMotion;

  // §4.7.1 버스 구조·첫 입력 시작 (오디오 실패해도 게임은 계속 — devguide §3.3)
  const mixer = createMixer();
  const sfx = createSfx(mixer);
  const aux = createAuxSfx(mixer);
  const bgm = createBgm(mixer);
  audioToast.hidden = false;
  useNativeAudioContext();
  mixer.unlock(window);
  mixer.onStart(() => {
    gsap.to(audioToast, { opacity: 0, duration: 0.2, onComplete: () => { audioToast.hidden = true; } });
    applyVolumes(getSettings());
    bgm.play(document.body.dataset.scene === "battle" ? "battle" : "lobby");
  });
  /** FR-060 옵션 → 버스 음량·음소거 (UC-020 즉시 반영) @param {ReturnType<typeof getSettings>} s */
  function applyVolumes(s) {
    mixer.setVolume("master", s.master);
    mixer.setVolume("sfx", s.sfx);
    mixer.setVolume("music", s.music);
    mixer.setMuted(s.muted);
  }
  applyVolumes(getSettings());
  onSettings((s) => applyVolumes(s));

  // 메뉴 화면 버튼 = AUX-14 (화면 전환·카드 선택 — design-vision §4.1)
  $("screen").addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    if (t.closest("button, [role=radio]") && mixer.started) aux.play("AUX-14");
  });

  /** @type {string[]} */ let pending = [];
  let politeTimer = 0;
  function flushPolite() {
    politeTimer = 0;
    if (!pending.length) return;
    polite.textContent = pending.length === 1 ? pending[0] : pending.join(" · ");
    pending = [];
  }

  return {
    audio: { mixer, sfx, aux, bgm },
    /**
     * 토스트 (`role="status"` 호스트) @param {string} text
     * @param {{ error?: boolean }} [o] error = 4,000ms 유지·붉은 테두리
     */
    toast(text, o = {}) {
      while (toasts.children.length >= MAX_TOASTS) toasts.firstElementChild?.remove();
      const el = document.createElement("div");
      el.className = `toast${o.error ? " is-error" : ""}`;
      el.textContent = text;
      toasts.appendChild(el);
      const dy = reduced() ? 0 : 16;
      gsap.fromTo(el, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" });
      gsap.to(el, { opacity: 0, duration: 0.16, delay: (o.error ? TOAST_ERROR_MS : TOAST_MS) / 1000,
        onComplete: () => el.remove() });
    },
    /**
     * §6.4 스크린리더 알림 — polite(1초에 1개로 묶음) / assertive(즉시)
     * @param {string} text @param {{ assertive?: boolean }} [o]
     */
    announce(text, o = {}) {
      if (o.assertive) {
        assertive.textContent = "";
        requestAnimationFrame(() => { assertive.textContent = text; });
        return;
      }
      pending.push(text);
      if (!politeTimer) politeTimer = window.setTimeout(flushPolite, POLITE_BATCH_MS);
    },
    /**
     * §4.1 매칭 대기 → 대전: 금빛 장막이 위에서 아래로 덮었다 걷힘 360ms + 360ms (감소 모드: 투명도 교차 300ms)
     * @returns {Promise<void>} 덮인 순간에 resolve
     */
    veilCover() {
      return new Promise((resolve) => {
        gsap.killTweensOf(veil);
        if (reduced()) {
          gsap.fromTo(veil, { opacity: 0, yPercent: 0 }, { opacity: 1, duration: 0.15, onComplete: resolve });
          return;
        }
        gsap.fromTo(veil, { opacity: 1, yPercent: -100 }, { yPercent: 0, duration: 0.36, ease: "power2.in",
          onComplete: resolve });
      });
    },
    veilReveal() {
      if (reduced()) gsap.to(veil, { opacity: 0, duration: 0.15 });
      else gsap.to(veil, { yPercent: 100, duration: 0.36, ease: "power2.out", onComplete: () => gsap.set(veil,
        { opacity: 0, yPercent: 0 }) });
    },
    /** 대전 화면 표시 전환 (메뉴 DOM 배경 ↔ Pixi 배경) @param {boolean} on */
    setBattleScene(on) {
      document.body.dataset.scene = on ? "battle" : "menu";
      $("battle").hidden = !on;
      $("screen").hidden = on;
      $("backdrop").hidden = on;
    },
  };
}
