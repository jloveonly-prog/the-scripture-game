// TASK-041-3 · FR-061 · FR-052 · FR-058 · FR-059 · NFR-006 · D4-16 — 같은 프레임 동시 피드백: EVT 묶음 → 시각·효과음·BGM·히트스톱·흔들림 (EVT-19 규칙).
// 사건 → 효과음·BGM 큐 맵(design-vision §2.9)의 정본 실행 위치 (devguide §7.9). 오디오는 스불론 §7.10 API를 지연 import — 미지원·실패는 무음으로 진행.
import { HS, comboHitstopMs, mergeHitstop } from './hitstop.js';
import { SH, comboShake, hitShake, pickLargestShake } from './screen-shake.js';
import { createFilterFx, FILTER_PRESETS, FLASHES } from './filters.js';
import { createProjectiles } from './projectiles.js';
import { createOverlayFx } from './overlay-fx.js';
import { createTextPop } from './text-pop.js';
import { playRoundEnd, resetRoundEnd, playMatchWin, playMatchLose } from './victory-fx.js';
import { burst } from './particle-pool.js';
import { COLORS, cellColor } from '../render/piece-skin.js';
import { absoluteCells } from '../engine/pieces.js';
import { heroesById, angelsById, spiritsById, armorById, getVerse } from '../content/content-loader.js';
import { playSpiritEffect } from '../render/spirits-art.js';
import { playAngel } from '../render/angels-art.js';
import { playHeroArt } from '../render/emblems.js';
import { playJesus } from '../render/jesus-light.js';
import { Graphics, Sprite } from 'pixi.js';
import { gsap } from 'gsap';

/** design-vision §2.9 · EVT-19 */
export const FEEDBACK = Object.freeze({ maxSounds: 4, softDropMinGapMs: 50, spiritDroneMaxMs: 6000, spiritDroneShortMs: 3000, muteDelayMs: 600,
  duckQuizDb: -6, duckJesusDb: -9, jesusMs: 4000, endLobbyDelayMs: 3000, roundWinSfxMs: 1200, jerichoSfxMs: 500, countdownTickMs: 100,
  armorGainVolume: 0.5, armorGainMs: 400, comboSemitoneCap: 12 });

const S = (id, opts = {}) => ({ id, opts });
const bare = (id) => String(id ?? '').replace(/^(hero|angel)_/, '');
const lineSfx = (p) => S('SFX-07', { lines: p.lines });
const lineShake = { 'EVT-10': SH.SH1, 'EVT-11': SH.SH2, 'EVT-12': SH.SH5 };

/** EVT → { sfx[], hs, sh, bgm[], deferred } (design-vision §2.8·§2.9·§4.5~§4.10 표 그대로) */
const CUES = {
  'EVT-01': () => ({ sfx: [S('SFX-01')] }),
  'EVT-02': () => ({ sfx: [S('SFX-02')] }),
  'EVT-04': () => ({ sfx: [S('SFX-03')] }),
  'EVT-05': () => ({ sfx: [S('SFX-04')], sh: SH.SH2 }),
  'EVT-06': () => ({ sfx: [S('SFX-05')] }),
  'EVT-07': () => ({ sfx: [S('SFX-06')] }),
  'EVT-09': (p) => ({ sfx: [lineSfx(p)] }),
  'EVT-10': (p) => ({ sfx: [lineSfx(p)], sh: lineShake['EVT-10'] }),
  'EVT-11': (p) => ({ sfx: [lineSfx(p)], sh: lineShake['EVT-11'] }),
  'EVT-12': (p) => ({ sfx: [lineSfx(p)], hs: HS.TETRIS, sh: lineShake['EVT-12'] }),
  'EVT-13': (p) => ({ sfx: [S('SFX-08', { combo: p.combo, semitones: Math.min(Math.max(0, p.combo - 1), FEEDBACK.comboSemitoneCap) }), lineSfx(p)],
    hs: comboHitstopMs(p.combo), sh: comboShake(p.combo), bgm: [['setComboLevel', p.combo]] }),
  'EVT-14': () => ({ sfx: [S('SFX-09')], hs: HS.TSPIN, sh: SH.SH3 }),
  'EVT-15': () => ({ sfx: [S('SFX-09', { semitones: 5 })], hs: HS.B2B }),
  'EVT-17': (p) => ({ bgm: [['setDanger', Boolean(p.inDanger)]] }),
  'EVT-18': () => ({ sfx: [S('SFX-15')] }),
  'EVT-20': () => ({ sfx: [S('SFX-10')] }),
  'EVT-21': (p) => (p.garbage >= 1 ? { deferred: { sfx: [S('SFX-11')], sh: hitShake(p.garbage) } } : {}),
  'EVT-22': () => ({ sfx: [S('SFX-10', { semitones: -7 })] }),
  'EVT-24': () => ({ sfx: [S('SFX-14', { semitones: -5 })] }),
  'EVT-25': () => ({ sfx: [S('SFX-10')] }),
  'EVT-27': (p) => ({ sfx: [S('SFX-12', { durationMs: p.durationMs > 0 && p.durationMs <= FEEDBACK.spiritDroneMaxMs ? p.durationMs : FEEDBACK.spiritDroneShortMs })],
    mute: p.target === 'me' && p.spiritId === 'deaf_dumb_spirit' ? p.durationMs : 0 }),
  'EVT-29': (p) => {
    const id = bare(p.id);
    const hit = p.target === 'me' ? (id === 'david' ? SH.SH3 : id === 'paul' ? SH.SH6 : null) : null;
    return { sfx: [S(p.kind === 'angel' ? 'SFX-13' : 'SFX-14')], sh: hit };
  },
  'EVT-30': () => ({ sfx: [S('SFX-14', { volumeScale: FEEDBACK.armorGainVolume, durationMs: FEEDBACK.armorGainMs })] }),
  'EVT-31': () => ({ sfx: [S('SFX-14')] }),
  'EVT-32': () => ({ sfx: [S('SFX-13', { durationMs: FEEDBACK.jesusMs })], bgm: [['duck', FEEDBACK.duckJesusDb, FEEDBACK.jesusMs]] }),
  'EVT-34': () => ({ sfx: [S('SFX-15', { durationMs: FEEDBACK.countdownTickMs })], bgm: [['duck', FEEDBACK.duckQuizDb, null]] }),
  'EVT-36': (p) => (p.won ? { sfx: [S('SFX-08', { combo: 1 })] } : {}),
  'EVT-37': () => ({ bgm: [['unduck']] }),
  'EVT-38': () => ({ sfx: [S('SFX-16', { durationMs: FEEDBACK.jerichoSfxMs })], sh: SH.SH3 }),
  'EVT-39': () => ({ sfx: [S('SFX-08', { combo: 1 })] }),
  'EVT-48': (p) => ({ sfx: [p.won ? S('SFX-16', { durationMs: FEEDBACK.roundWinSfxMs }) : S('SFX-17')] }),
  'EVT-49': () => ({ sfx: [S('SFX-16')], bgm: [['matchEnd']] }),
  'EVT-50': () => ({ sfx: [S('SFX-17')], bgm: [['matchEnd']] }),
};

// FR-061 EVT-19 한 프레임 묶음 계획 (순수 함수) — 가장 긴 HS 1회, 가장 큰 SH 1회, 소리 동시 최대 4음(같은 큐는 1번, 변주 병합)
export function planFx(events) {
  const list = Array.isArray(events) ? events.filter((e) => e && typeof e.evt === 'string') : [];
  const hs = [];
  const shakes = [];
  const sounds = new Map();
  const bgm = [];
  const deferred = [];
  let muteMs = 0;
  for (const e of list) {
    const cue = CUES[e.evt]?.(e) ?? {};
    if (cue.hs) hs.push(cue.hs);
    if (cue.sh) shakes.push(cue.sh);
    for (const s of cue.sfx ?? []) sounds.set(s.id, { id: s.id, opts: { ...(sounds.get(s.id)?.opts ?? {}), ...s.opts } });
    if (cue.bgm) bgm.push(...cue.bgm);
    if (cue.deferred) deferred.push({ evt: e.evt, ...cue.deferred });
    if (cue.mute) muteMs = Math.max(muteMs, cue.mute);
  }
  return { hitstopMs: mergeHitstop(hs), shake: pickLargestShake(shakes), sounds: [...sounds.values()].slice(0, FEEDBACK.maxSounds), bgm, deferred, muteMs, events: list };
}

/* ───────────── 오디오 (스불론 §7.10 — 지연 로드) ───────────── */
let audio = null;
let audioLoading = null;
function loadAudio() {
  if (!audioLoading) {
    audioLoading = Promise.all([import('../audio/sfx-play.js'), import('../audio/sfx-battle.js'), import('../audio/bgm.js'), import('../audio/audio-engine.js')])
      .then(([play, battle, bgm, engine]) => { audio = audio ?? { ...play, ...battle, ...bgm, ...engine }; })
      .catch((err) => console.error('[feedback-sync] 오디오 모듈을 불러오지 못했습니다 — 무음으로 진행', err));
  }
  return audioLoading;
}
function withAudio(fn) {
  const run = () => {
    if (!audio) return;
    try { fn(audio); } catch (err) { console.error('[feedback-sync] 오디오 호출 실패 — 해당 소리 생략', err); }
  };
  if (audio) run();
  else loadAudio().then(run);
}
/** 테스트·통합용 오디오 포트 주입 (§7.10 함수 이름 그대로인 객체) */
export function setAudioPort(port) {
  audio = port;
  audioLoading = Promise.resolve();
}

let lastSoftDropAt = Number.NEGATIVE_INFINITY;
let quizDuck = null;
function playSound(s, now) {
  if (s.id === 'SFX-03') {
    if (now - lastSoftDropAt < FEEDBACK.softDropMinGapMs) return;
    lastSoftDropAt = now;
  }
  const n = Number(s.id.slice(4));
  withAudio((a) => (n <= 9 ? a.playControlSfx(s.id, s.opts) : a.playBattleSfx(s.id, s.opts)));
}
function runBgm([op, a, b]) {
  withAudio((au) => {
    if (op === 'setComboLevel') au.setComboLevel(a);
    else if (op === 'setDanger') au.setDanger(a);
    else if (op === 'setBgmState') au.setBgmState(a);
    else if (op === 'duck') {
      const release = au.duckMusic(a);
      if (b) setTimeout(() => release?.(), b);
      else { quizDuck?.(); quizDuck = release; }
    } else if (op === 'unduck') { quizDuck?.(); quizDuck = null; }
    else if (op === 'matchEnd') {
      au.setBgmState('stopped');
      setTimeout(() => withAudio((x) => x.setBgmState('lobby')), FEEDBACK.endLobbyDelayMs);
    }
  });
}

/* ───────────── 장면 연결 ───────────── */
let kit = null;
let docOverlay = null;

// FR-061 devguide §7.9 장면 연결 — 연출 실행기(필터·투사체·DOM 오버레이·글자)를 만든다
export function attachScene(scene) {
  detachScene();
  const rt = scene?._rt;
  if (!rt) throw new TypeError('feedback-sync: createBattleScene이 만든 장면이 아닙니다');
  loadAudio();
  const filterFx = createFilterFx(rt);
  const overlay = createOverlayFx(rt.overlayHost ?? rt.stageHost, rt.layout);
  kit = { rt, filterFx, overlay, projectiles: createProjectiles(rt, filterFx), text: createTextPop(overlay.layer, rt.layout), spiritEnds: new Map(),
    playSound: (s) => playSound(s, performance.now()), shake: (sh) => rt.shake.start(sh, performance.now()), runBgm,
    roundEnd: (won) => playRoundEnd(rt, filterFx, won), resetRound: () => resetRoundEnd(rt, filterFx), presets: FILTER_PRESETS, flashes: FLASHES };
  kit.visuals = createVisualHandlers(kit);
  const onCombo = () => { rt.views.me.setComboGlow(0); rt.background?.setComboLight(0); runBgm(['setComboLevel', 0]); };
  rt.hooks.comboEnd.add(onCombo);
  rt.hooks.destroy.add(detachScene);
}

// devguide §7.9 연결 해제 (컨트롤러 dispose·장면 파괴)
export function detachScene() {
  if (!kit) return;
  const k = kit;
  kit = null;
  for (const end of k.spiritEnds.values()) end();
  k.rt.hooks.destroy.delete(detachScene);
  for (const fn of [() => k.projectiles.destroy(), () => k.overlay.destroy(), () => k.filterFx.destroy()]) {
    try { fn(); } catch (err) { console.error('[feedback-sync] 연출 정리 오류', err); }
  }
}

const failedEvts = new Set();

// FR-061 · devguide §7.9 한 프레임 묶음 1회 → { hitstopMs } (유다는 hitstopMs 동안 중력·고정 지연을 멈춘다)
export function emitFx(events) {
  const plan = planFx(events);
  const now = performance.now();
  try {
    if (kit) {
      kit.rt.hitstop.trigger(plan.hitstopMs, now);
      if (plan.shake) kit.rt.shake.start(plan.shake, now);
    }
    for (const s of plan.sounds) playSound(s, now);
    for (const op of plan.bgm) runBgm(op);
    if (plan.muteMs > 0) withAudio((a) => a.muteSfxBusFor(plan.muteMs, FEEDBACK.muteDelayMs));
    runVisuals(plan);
  } catch (err) {
    console.error('[feedback-sync] 연출 묶음 처리 오류 — 해당 연출 건너뜀', err);
  }
  return { hitstopMs: plan.hitstopMs };
}

function runVisuals(plan) {
  const impact = (d) => {
    for (const s of d.sfx) playSound(s, performance.now());
    if (kit && d.sh) kit.rt.shake.start(d.sh, performance.now());
  };
  for (const d of plan.deferred) if (!kit) impact(d);
  for (const e of plan.events) {
    if (e.evt === 'EVT-49') { playMatchWin(); continue; }
    if (e.evt === 'EVT-50') { playMatchLose(); continue; }
    if (e.evt === 'EVT-51') { showLeaveBanner(); continue; }
    if (!kit || kit.rt.destroyed) continue;
    const handler = kit.visuals[e.evt];
    if (!handler || failedEvts.has(e.evt)) continue;
    try {
      handler(e, plan.deferred.find((d) => d.evt === e.evt) ? () => impact(plan.deferred.find((d) => d.evt === e.evt)) : null);
    } catch (err) {
      failedEvts.add(e.evt);
      console.error(`[feedback-sync] ${e.evt} 연출 오류 — 이후 이 연출은 건너뜀`, err);
    }
  }
  const texts = kit ? plan.events.filter((e) => ['EVT-12', 'EVT-13', 'EVT-14', 'EVT-15'].includes(e.evt)) : [];
  if (texts.length) kit.visuals.textStack(texts);
}

/** EVT-51 이탈 승리 — 배너 1500ms → EVT-49 (장면이 없어도 문서 위에) */
function showLeaveBanner() {
  const overlay = kit?.overlay ?? (docOverlay ??= createOverlayFx(globalThis.document.body));
  overlay.banner('상대가 나갔습니다 — 승리');
  setTimeout(() => emitFx([{ evt: 'EVT-49' }]), FEEDBACK.endLobbyDelayMs / 2);
}

/* ───────────── EVT → 시각 (design-vision §4.5~§4.10) — 장면 연결 시 1회 생성 ───────────── */
const VIS = Object.freeze({ perRow: Object.freeze({ 1: 24, 2: 36, 3: 48, 4: 80 }), rowFlashMs: 60, lockAlpha: 0.5, lockMs: 100, dust: 6, holdMs: 120,
  nearPulseMs: 600, nearPulses: 2, sparkleMs: 200, flyMs: 600, armorFlyMs: 500, armorUseMs: 600, armorFrom: 0.5, armorTo: 1.3, wingParticles: 40,
  unfoldMs: 350, mannaParticles: 20, subtitleVignetteMs: 2500 });
const SHARD_COLORS = [COLORS.blockBlueSky, COLORS.blockGold, COLORS.blockPurple, COLORS.blockSilver, COLORS.blockScarlet, COLORS.blockScarletLight];
const TEXT_KIND = { 'EVT-12': 'tetris', 'EVT-13': 'combo', 'EVT-14': 'tspin', 'EVT-15': 'b2b' };

function createVisualHandlers(kit) {
  const { rt, filterFx, overlay, projectiles, text } = kit;
  const me = () => rt.views.me;
  const cellRect = (v, r, c) => ({ x: v.root.x + c * v.cell, y: v.root.y + r * v.cell, width: v.cell, height: v.cell });
  const rowRect = (v, r) => ({ x: v.root.x, y: v.root.y + r * v.cell, width: v.width, height: v.cell });
  const centerOf = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  const fade = (g, ms, from = g.alpha) => { g.alpha = from; rt.fx.addChild(g); gsap.to(g, { alpha: 0, duration: ms / 1000, onComplete: () => g.destroy() }); };
  const flyTo = (from, to, count, color, ms) => {
    if (!from || !to) return;
    for (let i = 0; i < count; i += 1) {
      rt.particles.spawn({ x: from.x + (Math.random() - 0.5) * 24, y: from.y + (Math.random() - 0.5) * 24, toX: to.x, toY: to.y, lifeMs: ms, delayMs: i * 12,
        color, alpha0: 1, alpha1: 0.6, scale0: 0.5, scale1: 0.3 });
    }
  };
  const sparkle = (p, count = 8, color = COLORS.lightGoldBright) => burst(rt.particles, { x: p.x, y: p.y, count, color, speed: 90, lifeMs: VIS.sparkleMs * 2, gravity: 0, size: 0.35 });
  const faithCenter = () => (rt.layout().faith ? centerOf(rt.layout().faith) : null);
  const lineClear = (e) => {
    const v = me();
    const n = VIS.perRow[Math.max(1, Math.min(4, e.lines ?? (e.rows ?? []).length))];
    for (const r of e.rows ?? []) {
      filterFx.flash(rowRect(v, r), kit.flashes.white);
      gsap.delayedCall(VIS.rowFlashMs / 1000, () => SHARD_COLORS.forEach((color) => burst(rt.particles, { ...centerOf(rowRect(v, r)), width: v.width,
        count: Math.round(n / SHARD_COLORS.length), color, speed: 320, lifeMs: 450, size: 0.6, texture: rt.shardTexture })));
    }
    if (e.evt === 'EVT-12') {
      filterFx.shockwave(centerOf(v.rect()), kit.presets.tetrisWave);
      filterFx.bloom();
    }
  };
  return {
    'EVT-02': (e) => me().rotateAfterimage(e.from),
    'EVT-05': (e) => {
      if (!e.active) return;
      const v = me();
      const cells = absoluteCells(e.active);
      const rows = cells.map((c) => c[0]);
      const cols = cells.map((c) => c[1]);
      const [r0, r1, c0, c1] = [Math.min(...rows), Math.max(...rows), Math.min(...cols), Math.max(...cols)];
      const d = Math.max(0, e.distance | 0);
      if (d > 0) filterFx.trail(v.root.x + c0 * v.cell, v.root.y + (r0 - d) * v.cell, (c1 - c0 + 1) * v.cell, d * v.cell, cellColor(String(e.active.type)) ?? COLORS.lightWhite);
      filterFx.shockwave(v.cellCenter((r0 + r1) / 2, (c0 + c1) / 2), kit.presets.hardDropWave);
    },
    'EVT-06': (e) => {
      const v = me();
      const cells = (e.cells ?? []).filter(([r]) => r >= 0);
      for (const [r, c] of cells) fade(new Graphics().rect(cellRect(v, r, c).x, cellRect(v, r, c).y, v.cell, v.cell).fill(COLORS.lightWhite), VIS.lockMs, VIS.lockAlpha);
      if (cells.length) burst(rt.particles, { ...v.cellCenter(cells[cells.length - 1][0] + 0.5, cells[cells.length - 1][1]), count: VIS.dust, color: COLORS.lightGoldBright, speed: 50, lifeMs: 400, gravity: -30, size: 0.3 });
    },
    'EVT-07': () => {
      const b = me().rect();
      const h = centerOf(rt.layout().hold);
      flyTo({ x: b.x + b.width / 2, y: b.y + me().cell * 2 }, h, 6, COLORS.lightWhite, VIS.holdMs);
      gsap.delayedCall(VIS.holdMs / 1000, () => sparkle(h));
    },
    'EVT-09': lineClear, 'EVT-10': lineClear, 'EVT-11': lineClear, 'EVT-12': lineClear,
    'EVT-13': (e) => { me().setComboGlow(e.combo); rt.background?.setComboLight(e.combo); },
    'EVT-14': () => filterFx.flash(me().rect(), kit.flashes.gold),
    'EVT-15': () => filterFx.flash(me().rect(), kit.flashes.gold),
    'EVT-16': (e) => {
      const v = rt.boardOf(e.target === 'opponent' ? 'opponent' : 'me');
      if (!v) return;
      text.nearMiss(v.rect());
      for (const r of e.rows ?? []) {
        const rr = rowRect(v, r);
        const g = new Graphics().rect(rr.x, rr.y, rr.width, rr.height).stroke({ width: 2, color: COLORS.lightGold });
        rt.fx.addChild(g);
        gsap.fromTo(g, { alpha: 0 }, { alpha: 1, duration: VIS.nearPulseMs / VIS.nearPulses / 2000, yoyo: true, repeat: VIS.nearPulses * 2 - 1, onComplete: () => g.destroy() });
      }
    },
    'EVT-18': (e) => { kit.resetRound(); text.countdown(e, () => runBgm(['setBgmState', 'battle'])); },
    'EVT-20': (e) => projectiles.attackSent(e.garbage),
    'EVT-21': (e, impact) => projectiles.attackReceived(e.garbage, () => { filterFx.flash(me().rect(), kit.flashes.red); rt.background?.hitTint(); impact?.(); }),
    'EVT-22': () => projectiles.offset(),
    'EVT-23': (e) => me().garbageRise(e.rows),
    'EVT-24': () => projectiles.shieldBlock(),
    'EVT-25': (e) => projectiles.reflect(e.side === 'opponent' ? 'opponent' : 'me'),
    'EVT-26': (e) => { if (e.kind === 'breastplate') projectiles.breastplate(); },
    'EVT-27': (e) => {
      const sp = spiritsById.get(e.spiritId);
      if (!sp) return;
      const key = `${e.target}:${e.spiritId}`;
      kit.spiritEnds.get(key)?.();
      if (e.target === 'me') {
        overlay.vignette(VIS.subtitleVignetteMs);
        overlay.subtitle({ title: sp.nameKo, titleEn: sp.nameKjv, verse: getVerse(sp.verseRef) });
      }
      kit.spiritEnds.set(key, playSpiritEffect(rt, overlay, filterFx, e));
    },
    'EVT-28': (e) => { const key = `${e.target}:${e.spiritId}`; kit.spiritEnds.get(key)?.(); kit.spiritEnds.delete(key); },
    'EVT-29': (e) => {
      const target = e.target === 'opponent' ? 'opponent' : 'me';
      const v = rt.boardOf(target);
      if (!v) return;
      const b = v.rect();
      const id = bare(e.id);
      filterFx.pillar(b);
      burst(rt.particles, { x: b.x + b.width / 2, y: b.y + b.height * 0.3, width: b.width * 0.6, count: VIS.wingParticles, color: COLORS.angelHalo, speed: 160, lifeMs: 900, gravity: -60, size: 0.5 });
      if (e.kind === 'angel') {
        playAngel(rt, id, target);
        const a = angelsById.get(id);
        if (a) overlay.subtitle({ title: a.nameKo, titleEn: a.nameEn, verse: getVerse(a.verseRef) });
        return;
      }
      playHeroArt(rt, id, target);
      if (id === 'david') projectiles.stone(target, rt.mode === 'practice');
      const h = heroesById.get(id);
      if (h) overlay.subtitle({ title: `${h.nameKo} — ${h.skill.nameKo}`, titleEn: h.nameEn, verse: getVerse(h.verseRef) });
    },
    'EVT-30': (e) => {
      const v = me();
      const from = Array.isArray(e.cell) ? v.cellCenter(e.cell[0], e.cell[1]) : centerOf(v.rect());
      const to = rt.hud.armorSlotCenter(e.armorId) ?? centerOf(rt.layout().hold);
      flyTo(from, to, 10, COLORS.lightGold, VIS.armorFlyMs);
      gsap.delayedCall(VIS.armorFlyMs / 1000, () => sparkle(to));
    },
    'EVT-31': (e) => {
      const armor = armorById.get(e.armorId);
      if (!armor) return;
      const b = me().rect();
      const size = Math.round(b.width * 0.4);
      const s = new Sprite(rt.skin.getTexture(armor.cellCode, size));
      s.anchor.set(0.5);
      s.position.set(b.x + b.width / 2, b.y + b.height / 2);
      rt.fx.addChild(s);
      gsap.timeline({ onComplete: () => s.destroy() }).fromTo(s, { alpha: 1 }, { duration: VIS.armorUseMs / 1000 }).fromTo(s.scale, { x: VIS.armorFrom, y: VIS.armorFrom },
        { x: VIS.armorTo, y: VIS.armorTo, duration: VIS.armorUseMs / 1000, ease: 'power2.out' }, 0).to(s, { alpha: 0, duration: 0.25 });
      if (e.armorId === 'belt_of_truth') fade(new Graphics().rect(b.x - 4, b.y + b.height * 0.45, b.width + 8, me().cell).fill(COLORS.lightGold), VIS.armorUseMs, 0.6);
      if (e.armorId === 'gospel_shoes') burst(rt.particles, { x: b.x + b.width / 2, y: b.y + b.height, width: b.width, count: 20, color: COLORS.angelHalo, speed: 80, lifeMs: 500, gravity: -80, size: 0.4 });
      if (e.armorId === 'helmet_of_salvation') { overlay.clearDarkness(); burst(rt.particles, { x: b.x + b.width / 2, y: b.y, width: b.width, count: 20, color: COLORS.angelCore, speed: 80, lifeMs: 500, gravity: 60, size: 0.4 }); }
      overlay.subtitle({ title: armor.nameKo, verse: getVerse(armor.verseRef) });
    },
    'EVT-32': (e) => {
      const target = e.target === 'opponent' ? 'opponent' : 'me';
      for (const [key, end] of kit.spiritEnds) if (key.startsWith(`${target}:`)) { end(); kit.spiritEnds.delete(key); }
      playJesus(rt, filterFx, overlay, target);
    },
    'EVT-33': (e) => { if (Array.isArray(e.cell)) sparkle(me().cellCenter(e.cell[0], e.cell[1]), 8, e.kind === 'word' ? COLORS.cellWord : COLORS.lightGoldBright); },
    'EVT-34': (e) => {
      filterFx.dimBoards(true);
      const b = me().rect();
      const g = new Graphics().rect(0, 0, b.width, b.height).fill(COLORS.cellWord);
      g.alpha = 0.25;
      g.position.set(b.x, e.trigger === 'timer' ? b.y : b.y + b.height / 2);
      g.pivot.set(0, e.trigger === 'timer' ? 0 : b.height / 2);
      g.scale.y = 0;
      rt.fx.addChild(g);
      gsap.timeline({ onComplete: () => g.destroy() }).to(g.scale, { y: 1, duration: VIS.unfoldMs / 1000, ease: 'power2.out' }).to(g, { alpha: 0, duration: 0.2 });
    },
    'EVT-36': (e) => {
      if (!e.won) return;
      const to = e.reward?.armorId ? rt.hud.armorSlotCenter(e.reward.armorId) : faithCenter();
      flyTo(centerOf(me().rect()), to, 16, COLORS.lightGold, VIS.flyMs);
    },
    'EVT-37': () => filterFx.dimBoards(false),
    'EVT-38': (e) => {
      if (!Array.isArray(e.center)) return;
      const v = me();
      const [r, c] = e.center;
      const p = v.cellCenter(r, c);
      filterFx.shockwave(p, kit.presets.jerichoWave);
      for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
        if (r + dr < 0 || r + dr > 19 || c + dc < 0 || c + dc > 9) continue;
        burst(rt.particles, { ...v.cellCenter(r + dr, c + dc), count: 6, color: COLORS.cellJericho, speed: 200, lifeMs: 400, size: 0.5, texture: rt.shardTexture });
      }
      text.plusOne(p.x, p.y);
    },
    'EVT-39': () => flyTo(centerOf(me().rect()), faithCenter(), VIS.mannaParticles, COLORS.cellManna, VIS.flyMs),
    'EVT-48': (e) => kit.roundEnd(Boolean(e.won)),
    'EVT-52': () => rt.hud.setGrace(true),
    textStack(evts) { text.showStack(evts.map((e) => ({ kind: TEXT_KIND[e.evt], lines: e.lines, combo: e.combo }))); },
  };
}