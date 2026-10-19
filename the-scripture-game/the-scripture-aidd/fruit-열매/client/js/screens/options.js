// options.js — SCR-009 옵션 컴포넌트(화면·모달 공용) 구성·값 반영만
// TASK-067-2 | REQ-013 FR-057 FR-058 FR-059 FR-060 C-007 | SCR-009 | UC-020 1~4·3a·E1 | design-vision §3.9 WF-009·
// §3.5.5 (c)·§4.7.1·§6.3 | screen-vision §2 SCR-009·§5 SCR-009 | D3-07 D3-08 D3-09 | N-04 (저장 안 함)
// 값은 세션 메모리(store/settings.js)에만 — 바꾸는 즉시 믹서·연출에 반영(구독자), 효과음·마스터는 SFX-01 1회 미리 듣기.
import { getSettings, setSetting } from "../store/settings.js";
import { iconSvg } from "./shell.js";

const VOLUMES = [["master", "마스터"], ["sfx", "효과음"], ["music", "음악"]];
const FLASH = [["strong", "강"], ["medium", "중"], ["weak", "약"]];
/** UC-020 range 0~100 step 5 */
const STEP = 5;

/**
 * SCR-009 컴포넌트 — 화면과 대전 중 모달 공용 (UC-020 통합 — screen-vision §6)
 * @param {{ shell: any, modal?: boolean, onClose: () => void, onLeaveMatch?: () => void }} o
 * @returns {HTMLElement}
 */
export function createOptionsPanel(o) {
  const s = getSettings();
  const el = document.createElement("div");
  el.className = "options-panel";
  const seg = (key, items, cur) => `<div class="segment" role="radiogroup" aria-label="${key === "shake" ? "화면 흔들림"
    : key === "muted" ? "음소거" : "섬광 세기"}">${items.map(([v, t]) => `<button type="button" role="radio" data-seg="${key}"
    data-v="${v}" aria-checked="${String(v) === String(cur)}">${t}</button>`).join("")}</div>`;
  el.innerHTML = `<header class="bar"><div class="bar-side"><button type="button" class="btn btn-ghost" data-close>
    ${o.modal ? "닫기 <span class=\"key\">Esc</span>" : `${iconSvg("back")} 뒤로`}</button></div><h1>옵션</h1>
    <div class="bar-side"></div></header>
    ${o.modal ? "<p class=\"match-warning\">대전은 멈추지 않습니다</p>" : ""}
    <fieldset><legend>소리</legend>${VOLUMES.map(([k, t]) => `<div class="opt-row"><label for="vol-${k}">${t}</label>
      <input id="vol-${k}" class="slider" type="range" min="0" max="100" step="${STEP}" value="${s[k]}" data-vol="${k}"
      aria-valuetext="${s[k]}" /><span class="val" data-val="${k}">${s[k]}</span></div>`).join("")}
      <div class="opt-row seg"><span>음소거</span>${seg("muted", [["false", "끔"], ["true", "켬"]], s.muted)}</div>
    </fieldset>
    <fieldset><legend>연출 (광과민성 배려)</legend>
      <div class="opt-row seg"><span>화면 흔들림</span>${seg("shake", [["true", "켬"], ["false", "끔"]], s.shake)}</div>
      <div class="opt-row seg"><span>섬광 세기</span>${seg("flash", FLASH, s.flash)}</div>
    </fieldset>
    <p class="notice">ⓘ 설정은 이번 접속 동안만 유지됩니다.</p>
    ${o.modal && o.onLeaveMatch ? `<div class="actions"><button type="button" class="btn btn-secondary" data-leave>
      경기 나가기</button></div>` : ""}`;
  const fill = (input) => input.style.setProperty("--fill", `${input.value}%`);

  el.addEventListener("input", (e) => {
    const t = /** @type {HTMLInputElement} */ (e.target);
    const key = t.dataset.vol;
    if (!key) return;
    const v = Number(t.value);
    setSetting(/** @type {any} */ (key), v); // 해당 버스 rampTo 0.05s (settings 구독자 = 믹서)
    t.setAttribute("aria-valuetext", String(v));
    /** @type {HTMLElement} */ (el.querySelector(`[data-val="${key}"]`)).textContent = String(v);
    fill(t);
  });
  el.addEventListener("change", (e) => {
    const key = /** @type {HTMLInputElement} */ (e.target).dataset.vol;
    // 바꾼 순간 SFX-01을 새 음량으로 1회 (효과음·마스터 슬라이더만 — WF-009)
    if (key === "sfx" || key === "master") o.shell.audio.sfx.play("SFX-01");
  });
  el.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target).closest("button");
    if (!t) return;
    // UC-020 E1 오디오 미시작이면 이 화면에서의 첫 클릭으로 Tone.start()
    if (!o.shell.audio.mixer.started) o.shell.audio.mixer.start();
    if (t.dataset.close !== undefined) return o.onClose();
    if (t.dataset.leave !== undefined) return o.onLeaveMatch?.();
    const key = t.dataset.seg;
    if (!key) return;
    const v = key === "flash" ? t.dataset.v : t.dataset.v === "true";
    setSetting(/** @type {any} */ (key), /** @type {any} */ (v)); // 흔들림 끔 = 모든 SHK 0·진동 끔 즉시, 섬광 = FL 배율
    el.querySelectorAll(`[data-seg="${key}"]`).forEach((b) => b.setAttribute("aria-checked", String(b === t)));
  });
  el.querySelectorAll("input.slider").forEach((i) => fill(/** @type {HTMLInputElement} */ (i)));
  return el;
}

/** SCR-009 화면 (#/options) @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  const back = () => ctx.nav(ctx.session.previousRoute || "#/lobby"); // [← 뒤로] / Esc → 직전 경로
  const main = document.createElement("main");
  main.className = "scr scr-options";
  main.appendChild(createOptionsPanel({ shell: ctx.shell, onClose: back }));
  root.appendChild(main);
  const onKey = (e) => {
    if (e.key === "Escape") back();
  };
  document.addEventListener("keydown", onKey);
  return {
    unmount() {
      document.removeEventListener("keydown", onKey);
    },
  };
}
