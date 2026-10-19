// battle-hud.js — HUD DOM(게이지·스킬·천사·갑주·효과 칩·대기 공격·리액션 버튼) 구성·`status` 바인딩만
// TASK-066 | REQ-003 REQ-007~REQ-010 REQ-013 FR-006 FR-025 FR-031 FR-033~FR-037 FR-062 FR-064 C-009 | SCR-005 |
// API-020 API-024 API-025 | design-vision §3.5.1~§3.5.4·§4.4 HUD 바인딩·§4.5 거부 피드백·§6.4·§6.5 | D-07
// 게이지·쿨다운·봉인·갑주·준비·대기 공격·걸린 효과는 `status`만 — 클라이언트가 계산하지 않는다. 유일한 예외는
// "서버가 준 남은 ms를 화면에서 줄여 보이는 것"(§4.4 금지 문단). 비용·이름은 rules·content에서 읽는다.
import { angels, armor, heroesById, rules, spiritsById } from "../content.js";
import { toSvg } from "../art/to-svg.js";
import { ANGEL_SHAPES } from "../art/shapes-angels.js";
import { ARMOR_ICONS } from "../art/shapes-heroes-armor.js";
import { GRACE_DOVE, JESUS_USED_STAR } from "../art/shapes-ui.js";
import { bindLongPress } from "../input/touch.js";
import { esc, emblemSvg, iconSvg } from "./shell.js";

const [ANGEL_KEY, ARMOR_KEY, REACT_KEY] = ["12345", "QWERTY", "890"];
/** §4.5 RATE_LIMITED 토스트는 3초에 1회만 */
const [RATE_TOAST_MS, BUBBLE_MS] = [3000, 1200];
const sec1 = (ms) => (Math.max(0, ms) / 1000).toFixed(1);
const now = () => performance.now();

/**
 * @param {{ root: HTMLElement, versus: boolean, modeText: string, heroId: string, opponent: any,
 *   onAction: (a: { kind: string, id?: string, el: HTMLElement }) => void, onMenu: () => void,
 *   shell: any }} o
 */
export function createHud(o) {
  const hero = heroesById.get(o.heroId);
  const skill = rules.heroSkills[hero.skill_id];
  const opp = o.opponent;
  const oppName = opp ? (opp.isBot ? `봇 (${{ easy: "쉬움", normal: "보통", hard: "어려움" }[opp.botLevel] ?? ""})`
    : opp.nickname) : "";
  const wrap = document.createElement("div");
  wrap.className = "hud-root";
  wrap.innerHTML = `
  <div class="hud hud-top"><span class="mb-mode" data-mode></span><span class="wins versus-only" data-wins-me></span>
    <span class="mb-time" data-time>00:00</span><span class="mb-opp versus-only">상대
    <span class="wins" data-wins-opp></span>
    </span><button type="button" class="mb-menu" data-menu aria-label="${o.versus ? "옵션" : "일시정지"}">
    ${o.versus ? iconSvg("gear") : "❚❚"}</button></div>
  <div class="hud hud-hold box" data-hold><span class="lbl">HOLD</span></div>
  <div class="hud hud-skill"><button type="button" class="act live" data-act="skill">${emblemSvg(o.heroId, 64)}
    <span class="txt"><span class="nm">${esc(hero.skill_name_ko)}</span>
    <span class="cost">믿음 ${skill.cost}</span></span>
    <span class="wipe"></span><span class="cd"></span><span class="key">A</span></button></div>
  <div class="hud hud-angels grp versus-only"><span class="lbl">천사</span>${angels.map((a, i) => `<button type="button"
    class="act" data-act="angel" data-id="${a.id}" title="${esc(`${a.name_ko} — ${a.effect_ko}`)}"><span class="icon">
    ${toSvg(ANGEL_SHAPES[a.visual], 28)}</span><span class="nm-s">${esc(a.name_ko)}</span>
    <span class="cost">${rules.angels[a.id].cost}</span><span class="wipe"></span><span class="cd"></span>
    <span class="seal">${iconSvg("chain")}<b data-seal>
    </b></span><span class="key">${ANGEL_KEY[i]}</span></button>`).join("")}</div>
  <div class="hud hud-armor grp versus-only"><span class="lbl">전신갑주</span>${armor.map((a, i) => `<button type="button"
    class="act is-missing" data-act="armor" data-id="${a.id}" title="${esc(`${a.name_ko} — ${a.effect_ko}`)}"><span
    class="icon">${toSvg(ARMOR_ICONS[a.id], 30)}</span><span class="nm-s">${esc(a.name_ko.split(" ").pop())}</span>
    <span class="count" data-count></span><span class="key">${ARMOR_KEY[i]}</span></button>`).join("")}</div>
  <div class="hud hud-chips chips" data-chips aria-label="걸린 효과"></div>
  <div class="hud hud-ready" data-ready aria-label="준비된 방어"></div>
  <div class="hud hud-gauge bar-v" data-gauge role="meter" aria-label="믿음 게이지" aria-valuemin="0"
    aria-valuemax="${rules.gauge.max}"><div class="fill"></div><div class="tick" data-tick></div></div>
  <div class="hud hud-pending bar-v versus-only" data-pending aria-label="받을 공격"><div class="fill"></div>
    <div class="sweep"></div></div>
  <div class="hud hud-next box"><span class="lbl">NEXT</span></div>
  <div class="hud hud-stats versus-only"><div class="row"><span class="lbl">점수</span><span class="num" data-score>0
    </span></div><div class="row"><span class="lbl">줄</span><span class="num" data-lines>0</span></div><div class="row">
    <span class="lbl">콤보</span><span class="num" data-combo>0</span></div></div>
  <div class="hud hud-record box practice-only"><h3>개인 기록</h3>${["줄:lines", "최대 콤보:maxCombo",
    "분당 공격:apm", "테트리스:tetris", "점수:score"].map((r) => `<div class="row"><span class="lbl">${r.split(":")[0]}
    </span><span class="num" data-rec="${r.split(":")[1]}">0</span></div>`).join("")}</div>
  <div class="hud hud-react versus-only">${rules.reactions.map((r, i) => `<button type="button" class="act" data-act=
    "reaction" data-id="${r.id}" aria-label="${esc(r.label_ko)}">${r.emoji}<span class="key">${REACT_KEY[i]}</span>
    </button>`).join("")}</div>
  <div class="hud hud-opp-head box versus-only">${opp ? emblemSvg(opp.heroId, 48) : ""}
    <span class="nm">${esc(oppName ?? "")}
    </span>${opp && !opp.isBot ? `<span class="rt">${opp.rating}</span>` : ""}</div>
  <div class="hud hud-opp-hold box versus-only portrait-hide"></div>
  <div class="hud hud-opp-stats versus-only portrait-hide"><span>점수 <b data-oscore>0</b></span>
    <span>콤보 <b data-ocombo>0</b></span></div>
  <div class="hud hud-opp-pending bar-v versus-only" data-opending><div class="fill"></div></div>
  <div class="hud hud-opp-chips chips versus-only" data-ochips></div>`;
  o.root.appendChild(wrap);
  const q = (s) => /** @type {HTMLElement} */ (wrap.querySelector(s));
  const qa = (s) => /** @type {HTMLElement[]} */ ([...wrap.querySelectorAll(s)]);
  const skillBtn = q("[data-act=skill]");
  const angelBtns = qa("[data-act=angel]");
  const armorBtns = qa("[data-act=armor]");
  /** @type {any} */ let st = { gauge: 0, gaugeMax: rules.gauge.max, cooldowns: {}, armors: [], armed: [], sealedMs: 0,
    pending: 0, effects: [], grace: false, jesusUsed: false };
  let stAt = now();
  /** @type {Array<{ id: string, until: number, total: number }>} */ let oppChips = [];
  let [wasReady, lastRateToast, lastPressed, tickAcc] = [false, 0, skillBtn, 0];
  q("[data-tick]").style.bottom = `${(skill.cost / rules.gauge.max) * 100}%`; // §4.4 게이지 비용 눈금

  wrap.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    if (t.closest("[data-menu]")) return o.onMenu();
    const b = /** @type {HTMLElement | null} */ (t.closest("[data-act]"));
    if (!b) return;
    lastPressed = b;
    o.onAction({ kind: /** @type {string} */ (b.dataset.act), id: b.dataset.id, el: b });
  });
  // §4.3 행동 버튼 길게 누르기 = 사용하지 않고 이름·효과·비용 말풍선만
  for (const b of [skillBtn, ...angelBtns, ...armorBtns]) {
    bindLongPress(b, () => bubble(b, b.title || hero.skill_effect_ko));
  }

  /** 누른 버튼 위 말풍선 1,200ms (§4.5) @param {HTMLElement} target @param {string} text */
  function bubble(target, text) {
    const el = document.createElement("div");
    el.className = "toast hud";
    el.textContent = text;
    const r = rectOf(target);
    const cx = Math.min(Math.max(r.x + r.w / 2, 168), o.root.offsetWidth - 168); // 화면 밖으로 나가지 않게
    Object.assign(el.style, { left: `${cx}px`, top: `${r.y - 8}px`, translate: "-50% -100%",
      width: "max-content",
      maxWidth: "320px", zIndex: "450", position: "absolute", height: "auto" });
    o.root.appendChild(el);
    setTimeout(() => el.remove(), BUBBLE_MS);
  }
  /** 요소의 가상 좌표 사각형 (오버레이 루트 기준) @param {HTMLElement} el */
  function rectOf(el) {
    let x = 0;
    let y = 0;
    for (let n = /** @type {HTMLElement | null} */ (el); n && n !== o.root; n = /** @type {any} */ (n.offsetParent)) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }
  const remain = (ms) => Math.max(0, ms - (now() - stAt));

  /** 행동 버튼 상태 그림 (준비 / 부족 / 쿨다운 / 봉인) — 화면에서만 남은 ms 감소 */
  function paintButtons() {
    const cd = remain(st.cooldowns[hero.skill_id] ?? 0);
    paint(skillBtn, skill.cost, cd, skill.cooldownMs, 0, hero.skill_name_ko);
    const sealed = remain(st.sealedMs);
    angelBtns.forEach((b) => {
      const a = rules.angels[/** @type {string} */ (b.dataset.id)];
      paint(b, a.cost, remain(st.cooldowns[b.dataset.id] ?? 0), a.cooldownMs, sealed, b.title.split(" — ")[0]);
    });
    const left = (ms) => `${Math.ceil(ms / 1000)}`;
    for (const c of qa("[data-chips] .chip, [data-ochips] .chip")) {
      const ms = c.dataset.until ? Number(c.dataset.until) - now() : remain(Number(c.dataset.ms));
      /** @type {HTMLElement} */ (c.querySelector(".t")).textContent = `${left(Math.max(0, ms))}초`;
      const bar = /** @type {HTMLElement} */ (c.querySelector(".left"));
      bar.style.width = `${Math.max(0, ms / Number(c.dataset.total)) * 100}%`;
    }
    const live = oppChips.filter((c) => c.until > now());
    if (live.length !== oppChips.length) chips(q("[data-ochips]"), (oppChips = live)); // 끝난 영은 칩에서 내림
  }
  /** @param {HTMLElement} b @param {number} cost @param {number} cd @param {number} cdTotal @param {number} sealed
   *  @param {string} name */
  function paint(b, cost, cd, cdTotal, sealed, name) {
    const low = st.gauge < cost;
    b.classList.toggle("is-low", low);
    b.classList.toggle("is-ready", !low && cd <= 0 && sealed <= 0);
    b.classList.toggle("is-sealed", sealed > 0);
    const wipe = /** @type {HTMLElement} */ (b.querySelector(".wipe"));
    wipe.style.setProperty("--cd", `${cd > 0 ? (cd / cdTotal) * 100 : 0}%`);
    /** @type {HTMLElement} */ (b.querySelector(".cd")).textContent = cd > 0 ? sec1(cd) : "";
    const seal = b.querySelector("[data-seal]");
    if (seal) seal.textContent = sealed > 0 ? sec1(sealed) : "";
    const state = sealed > 0 ? `봉인 ${sec1(sealed)}초` : cd > 0 ? `쿨다운 ${sec1(cd)}초` : low ? "게이지 부족" : "준비";
    b.setAttribute("aria-label", `${name}, 믿음 ${cost} 필요, ${state}`);
  }
  /** @param {HTMLElement} host @param {Array<{ id: string, ms?: number, until?: number, total: number }>} list */
  function chips(host, list) {
    host.innerHTML = list.slice(0, rules.effects.maxConcurrent).map((c) => `<div class="chip" data-ms="${c.ms ?? ""}"
      data-until="${c.until ?? ""}" data-total="${c.total}"><span>${esc(spiritsById.get(c.id)?.name_ko ?? c.id)}</span>
      <span class="t"></span><i class="left"></i></div>`).join("");
  }

  return {
    el: wrap,
    /** juice 03-B hud 찾기 (§4.6 행이 GSAP 모션을 거는 요소) */
    find: {
      hold: () => q("[data-hold]"), pending: () => q("[data-pending] .fill"), gauge: () => q("[data-gauge]"),
      skill: () => skillBtn, armorSlot: (id) => q(`[data-act=armor][data-id="${id}"]`),
    },
    /** 가상 좌표 가운데 (투사체·아이콘 비행 기준점) @param {string} name skill | armor:<id> */
    center(name) {
      const el = name === "skill" ? skillBtn : q(`[data-act=armor][data-id="${name.split(":")[1]}"]`);
      if (!el || !el.offsetParent) return undefined;
      const r = rectOf(el);
      return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    },
    /** @param {string} text */
    setModeText(text) { q("[data-mode]").textContent = text; },
    /** API-029 roundEnd.wins · 3판 2선승 @param {number[]} wins @param {number} mySlot */
    setWins(wins, mySlot) {
      const dots = (n) => Array.from({ length: rules.match.roundsToWin },
        (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
      q("[data-wins-me]").innerHTML = dots(wins[mySlot - 1] ?? 0);
      q("[data-wins-opp]").innerHTML = dots(wins[2 - mySlot] ?? 0);
    },
    /** 경기 시간 mm:ss (start.matchElapsedMs + 로컬 시계) @param {number} ms */
    setTime(ms) {
      const s = Math.floor(ms / 1000);
      const two = (n) => String(n).padStart(2, "0");
      q("[data-time]").textContent = `${two(Math.floor(s / 60))}:${two(s % 60)}`;
    },
    /** 로컬 엔진 값 (D-07 — 점수·줄·콤보) @param {any} s */
    setStats(s) {
      q("[data-score]").textContent = String(s.score);
      q("[data-lines]").textContent = String(s.lines);
      q("[data-combo]").textContent = String(s.combo);
      const rec = { lines: s.lines, maxCombo: s.maxCombo, apm: s.attackPerMin.toFixed(1), tetris: s.tetris,
        score: s.score };
      for (const [k, v] of Object.entries(rec)) q(`[data-rec=${k}]`).textContent = String(v);
    },
    /** API-024 status 바인딩 → 전이(스킬 준비·게이지 가득) 반환 @param {any} d */
    setStatus(d) {
      const prevGauge = st.gauge;
      st = d;
      stAt = now();
      const g = q("[data-gauge]");
      /** @type {HTMLElement} */ (g.querySelector(".fill")).style.height = `${(d.gauge / d.gaugeMax) * 100}%`;
      g.setAttribute("aria-valuenow", String(d.gauge));
      this.setPending(d.pending);
      for (const b of armorBtns) {
        const n = d.armors.filter((id) => id === b.dataset.id).length;
        b.classList.toggle("is-missing", n === 0);
        /** @type {HTMLElement} */ (b.querySelector("[data-count]")).textContent = n > 1 ? `×${n}` : "";
      }
      chips(q("[data-chips]"), d.effects.map((e) => ({ id: e.spiritId, ms: e.remainingMs,
        total: spiritsById.get(e.spiritId)?.duration_ms || e.remainingMs || 1 })));
      q("[data-ready]").innerHTML = d.armed.map((id) => (ARMOR_ICONS[id]
        ? toSvg(ARMOR_ICONS[id], 24, { label: `준비: ${ARMOR_ICONS[id].label_ko}` })
        : id === "michael" ? toSvg(ANGEL_SHAPES.wings_light, 24, { label: "준비: 미가엘" }) : "")).join("")
        + (d.grace ? toSvg(GRACE_DOVE, 28, { label: GRACE_DOVE.label_ko }) : "")
        + (d.jesusUsed ? toSvg(JESUS_USED_STAR, 10, { label: JESUS_USED_STAR.label_ko }) : "");
      paintButtons();
      const ready = d.gauge >= skill.cost && remain(d.cooldowns[hero.skill_id] ?? 0) <= 0;
      const out = { skillReady: ready && !wasReady, gaugeFull: d.gauge >= d.gaugeMax && prevGauge < d.gaugeMax };
      wasReady = ready;
      return out;
    },
    /** 받을 공격 막대 — status.pending (attack·garbage의 pending이 먼저 오면 그 값) @param {number} n */
    setPending(n) {
      const bar = q("[data-pending]");
      bar.style.setProperty("--cell", `${bar.offsetHeight / rules.board.height || 30}px`);
      const fill = /** @type {HTMLElement} */ (bar.querySelector(".fill"));
      fill.style.height = `${Math.min(1, n / rules.board.height) * 100}%`;
    },
    /** A-02 막대 위 흰 선이 delayMs 동안 위→아래로 훑음 @param {number} ms */
    pendingSweep(ms) {
      const s = q("[data-pending] .sweep");
      s.animate([{ top: "0%", opacity: 1 }, { top: "100%", opacity: 0.4 }], { duration: ms, easing: "linear" });
    },
    /** API-020 상대 점수·콤보·받을 공격 @param {{ score: number, combo: number, pending: number }} d */
    setOpponent(d) {
      q("[data-oscore]").textContent = String(d.score);
      q("[data-ocombo]").textContent = String(d.combo);
      const bar = q("[data-opending]");
      bar.style.setProperty("--cell", `${bar.offsetHeight / rules.board.height || 22}px`);
      const fill = /** @type {HTMLElement} */ (bar.querySelector(".fill"));
      fill.style.height = `${Math.min(1, d.pending / rules.board.height) * 100}%`;
    },
    /** 내가 보낸 영 + 남은 시간 (attack.duration 기준 클라이언트 계산) @param {string} id @param {number} ms */
    addOppChip(id, ms) {
      oppChips = oppChips.filter((c) => c.id !== id).concat({ id, until: now() + ms, total: ms });
      chips(q("[data-ochips]"), oppChips);
    },
    /** FR-003 홀드 불가 표시 @param {boolean} locked */
    setHoldLocked(locked) { q("[data-hold]").classList.toggle("is-locked", locked); },
    /** design-vision §4.5 거부 피드백 @param {{ code: string, message: string, retryInMs: number | null }} d */
    reject(d) {
      const aux = o.shell.audio.aux;
      const s = d.retryInMs ? ` ${sec1(d.retryInMs)}초` : "";
      const vib = () => { try { if (navigator.vibrate) navigator.vibrate(20); } catch { /* 진동 없음 */ } };
      switch (d.code) {
        case "GAUGE_LOW":
          bubble(lastPressed, d.message);
          q("[data-gauge]").classList.remove("is-low");
          void q("[data-gauge]").offsetWidth;
          q("[data-gauge]").classList.add("is-low");
          setTimeout(() => q("[data-gauge]").classList.remove("is-low"), 400); // 섬광 1회
          aux.play("AUX-11"); vib(); break;
        case "COOLDOWN": case "NO_ARMOR": bubble(lastPressed, `${d.message}${s}`); aux.play("AUX-11"); vib(); break;
        case "ANGEL_SEALED":
          bubble(angelBtns[2], `${d.message}${s}`); aux.play("AUX-11"); o.shell.audio.sfx.play("SFX-12", { tier: 3,
            short: true }); vib(); break;
        case "NOT_ACTIVE": bubble(lastPressed, d.message); break;
        case "RATE_LIMITED":
          if (now() - lastRateToast > RATE_TOAST_MS) { lastRateToast = now(); o.shell.toast(d.message); }
          break;
        case "SKILL_INVALID": case "MODE_FORBIDDEN": o.shell.toast(d.message); aux.play("AUX-11"); break;
        default: o.shell.toast(d.message); // CLEAR_REJECTED · REACTION_INVALID (토스트만 — 진행은 계속)
      }
      o.shell.announce(d.message);
    },
    /** 매 프레임 — 쿨다운·칩 남은 시간 화면 감소 (100ms마다) @param {number} dtMs */
    tick(dtMs) {
      tickAcc += dtMs;
      if (tickAcc < 100) return;
      tickAcc = 0;
      paintButtons();
    },
    destroy() { wrap.remove(); },
  };
}
