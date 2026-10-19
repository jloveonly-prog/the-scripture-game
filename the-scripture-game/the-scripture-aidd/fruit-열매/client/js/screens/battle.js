// battle.js — SCR-005 화면 조립·변형 분기·수명주기만
// TASK-066 | REQ-001 REQ-005~REQ-013 FR-005~FR-011 FR-023 FR-033 FR-034 FR-040~FR-042 FR-048 FR-055 FR-056 FR-064
// FR-078 NFR-001 NFR-002 C-009 | SCR-005 | API-006 API-011~API-031 | design-vision §3.5·§4.3·§4.4·§4.8·§5.2 | D3-13
// 변형: 사람 대 사람·봇(상대 머리글 "봇 (난이도)", 리액션은 내 화면만)·연습(상대 영역·천사·갑주·리액션·말씀 대결 없음).
// Pixi Application은 앱에 1개(D-13) — 첫 대전 때 만들고 다음 대전에 재사용, 대전 밖에서는 ticker를 멈춘다.
import { createPixiApp } from "../render/pixi-app.js";
import { createLayout, BATTLE_GEOMETRY } from "../render/layout.js";
import { createBlockTextures } from "../render/block-textures.js";
import { BoardView } from "../render/board-view.js";
import { PiecePreview } from "../render/piece-preview.js";
import { createParticles } from "../render/particles.js";
import { createFilters } from "../render/filters.js";
import { createBackground } from "../render/background.js";
import { createSpiritFx } from "../render/spirit-fx.js";
import { createHolyFx } from "../render/holy-fx.js";
import { createQualityMonitor } from "../render/quality.js";
import { createArtBaker } from "../art/to-pixi.js";
import { ARMOR_ICONS } from "../art/shapes-heroes-armor.js";
import { createShake } from "../fx/shake.js";
import { createHitstop } from "../fx/hitstop.js";
import { createFlash } from "../fx/flash.js";
import { createArrows } from "../fx/arrows.js";
import { createConfetti } from "../fx/confetti.js";
import { createOverlay } from "../fx/overlay.js";
import { createReactions } from "../fx/reactions.js";
import { createJuice } from "../fx/juice.js";
import { curseView } from "../game/apply-spirit.js";
import { createLocalPlayer } from "../game/local-player.js";
import { createServerEvents } from "../game/server-events.js";
import { createKeyboard } from "../input/keyboard.js";
import { createTouch } from "../input/touch.js";
import { heroesById, rules } from "../content.js";
import { session, endBattle, saveMatchEnd } from "../store/session.js";
import { getSettings, juiceOptions, onSettings } from "../store/settings.js";
import { createHud } from "./battle-hud.js";
import { createOverlays } from "./battle-overlays.js";

export const battleScreen = true;
const MODE_KO = { random: "랜덤 매칭", invite: "친구 초대", bot: "AI 봇 대전", practice: "연습" };
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
/** 대전 한 판의 현재 그림 (juice·spirit·holy가 함수로 읽는 자리) */
const cur = { active: false, variant: "versus", fit: /** @type {any} */ (null), me: /** @type {any} */ (null),
  opp: /** @type {any} */ (null), preview: /** @type {any} */ (null), oppPreview: /** @type {any} */ (null),
  hud: /** @type {any} */ (null), onUi: (n, d) => {}, onLayout: () => {}, confirm: () => {} };
/** @type {Promise<any> | null} */ let stagePromise = null;
/** @type {any} */ let juiceRef = null;
/** 결과 화면 연출(AC·RT·GR·SV)이 쓰는 같은 지휘자 — 대전을 한 번도 하지 않았으면 null */
export const getJuice = () => juiceRef;

/** 보드·미리보기 정리 — 스테이지에서 떼고 다음 그리기 뒤에 파괴(그리기 중 묶인 텍스처 파괴 경고 방지) @param {any} v */
function retire(v) {
  v.root.parent?.removeChild(v.root);
  setTimeout(() => v.destroy(), 250);
}

/** Pixi 스택 1벌 (03-A 렌더 + 03-B 타격감 — 인계 문서의 조립 순서) */
async function createStage(shell) {
  const overlayRoot = $("overlay");
  const pixi = await createPixiApp({ mount: $("stage") });
  const textures = createBlockTextures(pixi.renderer);
  const baker = createArtBaker(pixi.renderer);
  const particles = createParticles({ renderer: pixi.renderer, layer: pixi.layers.particle });
  const filters = createFilters(pixi);
  const spiritFx = createSpiritFx({ pixi, particles, filters });
  const s = { pixi, textures, particles, filters, spiritFx, armorIcon: (id) => baker.bake(ARMOR_ICONS[id], 48),
    background: /** @type {any} */ (null), holyFx: /** @type {any} */ (null) };
  const layout = createLayout({ pixi, overlayRoot, onChange: (fit) => {
    cur.fit = fit;
    if (!s.background) s.background = createBackground({ renderer: pixi.renderer, layer: pixi.layers.background,
      screen: fit.screen });
    else s.background.resize(fit.screen);
    if (cur.active) cur.onLayout();
  } });
  s.holyFx = createHolyFx({ pixi, particles, filters, background: s.background });
  const geometry = () => ({ kind: cur.fit.kind, screen: cur.fit.screen,
    ...BATTLE_GEOMETRY[cur.fit.kind][cur.variant] });
  const overlay = createOverlay({ root: overlayRoot, geometry });
  const shake = createShake({ pixi, domRoot: overlayRoot, screen: cur.fit, scale: () => layout.current.scale });
  const flash = createFlash({ pixi, screen: cur.fit.screen });
  const juice = createJuice({ pixi, particles, filters, background: s.background, spiritFx, holyFx: s.holyFx,
    boards: () => ({ me: cur.me, opp: cur.opp }), geometry, overlay, reactions: createReactions({ root: overlayRoot,
      geometry }), confetti: createConfetti({ container: $("confetti") }),
    arrows: createArrows({ pixi, particles, filters, holy: s.holyFx }),
    shake, hitstop: createHitstop({ ticker: pixi.app.ticker, onTick: pixi.onTick }), flash, ...shell.audio,
    hud: { hold: () => cur.hud?.find.hold(), pending: () => cur.hud?.find.pending(), gauge: () => cur.hud?.find.gauge(),
      armorSlot: (id) => cur.hud?.find.armorSlot(id) },
    onUi: (n, d) => cur.onUi(n, d) });
  juiceRef = juice;
  const quality = createQualityMonitor({ onChange: (mode) => {
    particles.setLimit(mode === "light" ? 300 : 600); // §4.9 가벼운 그리기 풀 300
    filters.setLight(mode === "light");
    s.background?.setLight(mode === "light");
    for (const b of [cur.me, cur.opp]) b?.setQuality(mode);
  } });
  return { ...s, layout, juice, overlay, quality, overlayRoot, shake, flash };
}

/** @param {HTMLElement} _root @param {any} ctx */
export function mount(_root, ctx) {
  const b = /** @type {any} */ (session.battle);
  const m = b.matched;
  const versus = m.mode !== "practice";
  const mySlot = m.slot;
  const hero = heroesById.get(/** @type {string} */ (session.flow.heroId));
  cur.variant = versus ? "versus" : "practice";
  cur.active = true;
  let alive = true;
  let ended = false;
  let leaving = false;
  /** @type {any} */ let st = null;
  let timeBase = 0;
  let timeAt = performance.now();
  let lastReaction = -Infinity;
  /** @type {Array<() => void>} */ const offs = [];
  const shell = ctx.shell;
  ctx.shell.setBattleScene(true);
  shell.veilReveal();

  stagePromise ??= createStage(shell);
  stagePromise.then((stage) => alive && start(stage)).catch((err) => {
    console.error("대전 화면 준비 실패", err);
    $("overlay").textContent = "그래픽을 시작할 수 없습니다";
  });

  /** @param {any} stage */
  function start(stage) {
    const { pixi, juice, layout, overlayRoot } = stage;
    pixi.app.ticker.start();
    const hud = createHud({ root: overlayRoot, versus, heroId: hero.id, opponent: m.opponent, shell,
      onMenu: () => overlays.escape(), onAction: (a) => action(a.kind, a.id, a.el) });
    cur.hud = hud;
    const overlays = createOverlays({ root: overlayRoot, juice, room: b.room, shell, versus,
      onLeave: () => leave(), onQuit: () => lp.quit(), onPause: (on) => { lp.setPaused(on); kb.setEnabled(!on); } });
    const lp = createLocalPlayer({ room: b.room, juice, boards: () => ({ me: cur.me, opp: cur.opp }), mySlot, versus,
      preview: () => cur.preview, onStats: (s) => hud.setStats(s), onTopout: () => {}, onCrisis: () =>
        stage.background?.setPressure({ pending: lp.attack.pending, crisis: lp.crisis }) });
    const kb = createKeyboard({ quizOpen: () => overlays.quizOpen, onCommand: (c) => {
      if (c.kind === "escape") return overlays.escape();
      if (overlays.menuOpen || overlays.fatal) return;
      if (c.kind === "engine") lp.command(c.cmd);
      else if (c.kind === "quiz") overlays.answer(c.choice);
      else action(c.kind, c.kind === "skill" ? undefined : c.id);
    } });
    /** 행동 (API-014·API-015·API-017) — 서버 effect 전에는 효과를 적용하지 않음(버튼 눌림만) */
    function action(kind, id, el) {
      if (overlays.quizOpen || overlays.fatal) return;
      if (kind === "skill") b.room.skill("hero", hero.skill_id);
      else if (!versus) return; // 연습: 천사·갑주·리액션 없음 (OQ #4 — 키도 동작 안 함)
      else if (kind === "angel") b.room.skill("angel", id);
      else if (kind === "armor") b.room.armor(id);
      else if (kind === "reaction" && performance.now() - lastReaction >= rules.rateLimit.reaction.perMs) {
        lastReaction = performance.now(); // UC-017 E2 2초에 1회 (초과는 서버가 조용히 버림)
        b.room.reaction(id);
        juice.emit("RX-01", { reactionId: id, el });
      }
    }

    /** §5.2 배치 종류 변경 → 보드·미리보기·HUD 다시 배치 (게임 상태 유지) */
    let builtKind = "";
    function relayout() {
      const fit = cur.fit;
      const g = BATTLE_GEOMETRY[fit.kind][cur.variant];
      overlays.setRotate(fit.rotatePrompt);
      overlays.setPrep(fit.tooSmall ? "창을 키워 주세요" : "");
      if (builtKind === fit.kind && cur.me) return; // 같은 배치 — 배율만 바뀜(layout이 처리), 보드는 그대로
      builtKind = fit.kind;
      for (const v of [cur.me, cur.opp, cur.preview, cur.oppPreview]) if (v) retire(v);
      const mk = (geo, role) => new BoardView({ textures: stage.textures, geometry: geo, cols: rules.board.width,
        rows: rules.board.height, dangerRows: rules.board.dangerRows, role, armorIcon: stage.armorIcon });
      cur.me = mk(g.myBoard, "me");
      cur.opp = g.oppBoard ? mk(g.oppBoard, "opponent") : null;
      cur.preview = new PiecePreview({ textures: stage.textures, holdRect: g.hold, nextRect: g.next,
        maxCell: g.myBoard.cell, armorIcon: stage.armorIcon });
      const oh = g.oppHold;
      cur.oppPreview = oh ? new PiecePreview({ textures: stage.textures, holdRect: oh, maxCell: g.oppBoard.cell })
        : null;
      for (const v of [cur.me, cur.opp, cur.preview, cur.oppPreview]) if (v) pixi.layers.boards.addChild(v.root);
      stage.spiritFx.setTargets({ me: cur.me, opp: cur.opp, nextRect: g.next, screen: fit.screen });
      stage.holyFx.setTargets({ me: cur.me, opp: cur.opp, screen: fit.screen });
      stage.flash.setScreen(fit.screen);
      stage.shake.setScreen(fit);
      overlayRoot.dataset.layout = `${fit.kind[0]}${versus ? "v" : "p"}`;
      if (fit.coarse) overlayRoot.dataset.touch = ""; else delete overlayRoot.dataset.touch;
      juice.refresh();
      lp.boardChanged();
    }
    cur.onLayout = relayout;
    cur.confirm = () => overlays.confirmLeave();
    layout.refresh();
    relayout();

    // §4.3 터치 제스처 영역 = 내 보드 + 제스처 패드 (가로형 태블릿은 내 보드만)
    const areas = ["gesture-board", "gesture-pad"].map((c) => {
      const el = document.createElement("div");
      el.className = `hud gesture ${c}${c === "gesture-pad" ? " portrait-only" : ""}`;
      if (c === "gesture-pad") el.innerHTML = `<p class="guide">← 끌기 → 이동 · 탭 회전(왼쪽 반=반시계, 오른쪽 반=시계)<br>
        ↓ 빠르게 튕기기 = 하드 드롭 · 천천히 끌기 = 소프트 드롭<br>↑ 튕기기 = 홀드</p><p class="guide keys">← → 이동 · ↑ 회전 ·
        Space 드롭 · C 홀드 · A 스킬</p>`;
      hud.el.appendChild(el);
      return el;
    });
    setTimeout(() => areas[1].classList.add("is-faded"), 10000); // 안내 글자 0.35 → 첫 10초 후 0.15
    const touch = createTouch({ areas, onCommand: (c) => !overlays.menuOpen && lp.command(c) });

    juice.setOptions(juiceOptions(getSettings()));
    const applyReduced = () => { if (juice.options.reduced) overlayRoot.dataset.reduced = ""; else delete overlayRoot
      .dataset.reduced; };
    applyReduced();
    offs.push(onSettings((s) => { juice.setOptions(juiceOptions(s)); applyReduced(); }));
    cur.onUi = (name, d) => {
      if (name === "pendingSweep") hud.pendingSweep(d.ms);
      else if (name === "toResult") setTimeout(() => alive && ctx.nav("#/result", { force: true }), d.afterMs + 400);
    };

    /** API-019 start — 엔진 초기화·HUD (연출은 server-events) @param {any} d @returns {number} 남은 카운트다운 */
    function roundStart(d) {
      juice.reset();
      timeBase = d.matchElapsedMs;
      timeAt = performance.now();
      const remain = Math.max(300, d.countdownMs - (d.receivedAt ? performance.now() - d.receivedAt : 0));
      lp.startRound(d, remain);
      hud.setModeText(versus ? `${MODE_KO[d.mode]} · ROUND ${d.round}` : `연습 · ${hero.name_ko}`);
      if (d.round === 1) hud.setWins([0, 0], mySlot);
      overlays.setPrep("");
      return remain;
    }
    const onMessage = createServerEvents({ lp, juice, mySlot, versus, boards: () => ({ me: cur.me, opp: cur.opp }),
      oppPreview: () => cur.oppPreview, hud, overlays, background: () => stage.background, announce: shell.announce,
      roundsPlayed: session.profile?.roundsPlayed ?? 0, onRoundStart: roundStart,
      onMatchEnd: (d) => {
        ended = true;
        saveMatchEnd(d); // SCR-006 진입 조건 + 레이팅 갱신
      },
      onError: (e) => fatal(e) });
    /** API-031 치명 오류 / 방 소켓 비정상 종료 (§3.5.5 g) @param {{ code: string, message: string }} e */
    function fatal(e) {
      if (ended || leaving) return;
      lp.stop();
      if (e.code === "UNAUTHORIZED") return ctx.unauthorized();
      overlays.showFatal(e.message);
    }
    b.room.onClose((info) => {
      if (!alive || info.ended || ended) return;
      fatal(info.error ?? { code: "DISCONNECTED", message: "연결이 끊어졌습니다" });
    });
    if (!b.room.open) fatal({ code: "DISCONNECTED", message: "연결이 끊어졌습니다" });
    onMessage("start", b.start);
    b.room.listen(onMessage);

    offs.push(pixi.onTick((dt, raw) => {
      kb.update(dt);
      lp.tick(dt);
      stage.particles.update(dt);
      stage.background?.update(dt);
      cur.me?.update(dt);
      cur.opp?.update(dt);
      stage.spiritFx.sync(curseView(lp.curse, performance.now()));
      stage.spiritFx.update(dt);
      stage.holyFx.update(dt);
      hud.tick(dt);
      hud.setHoldLocked(!!lp.engine?.holdUsed);
      if (!ended) hud.setTime(timeBase + performance.now() - timeAt);
      stage.quality.sample(raw);
    }));
    offs.push(() => { kb.destroy(); touch.destroy(); lp.destroy(); overlays.destroy(); hud.destroy(); juice.reset(); });
    offs.push(() => pixi.app.ticker.stop());
  }

  /** 이탈 확인 [나가기] / 치명 오류 [로비로] — 방 소켓 닫기 = 서버 이탈 판정 (FR-009, D3-13) */
  function leave() {
    leaving = true;
    endBattle();
    ctx.nav("#/lobby", { force: true });
  }

  return {
    /** D3-13 경로 이탈 시도 → 이탈 확인 모달 (경기 종료 후·치명 오류 후에는 그대로) @param {string} next */
    canLeave(next) {
      if (ended || leaving || !session.battle?.room?.open) return true;
      if (next !== "#/battle") cur.confirm();
      return next === "#/battle";
    },
    unmount() {
      alive = false;
      cur.active = false;
      for (const off of offs.splice(0)) {
        try { off(); } catch (err) { console.error("대전 정리 실패", err); }
      }
      for (const v of [cur.me, cur.opp, cur.preview, cur.oppPreview]) if (v) retire(v);
      Object.assign(cur, { me: null, opp: null, preview: null, oppPreview: null, hud: null, confirm: () => {} });
      if (!ended) endBattle();
      else session.battle = null;
    },
  };
}
