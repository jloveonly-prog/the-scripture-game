// TASK-011-3 · FR-001~011 · FR-025 · FR-027~030 · FR-040 · FR-055 · FR-061 · NFR-002 — 전투 조정 (devguide §7.7·§7.8·§7.9).
// 단일 책임: 엔진 ↔ RoomConnection ↔ BattleScene·emitFx ↔ BattleUiPort 조정 (12Hz state, clear·topout 송신, 말씀 대결 정지·재개, 히트스톱).
// DOM 템플릿·Pixi 그리기 없음. 판정은 서버 (R-01·R-10) — 서버 결과만 엔진에 적용한다.
import { content, heroesById, angelsById } from '../content/content-loader.js';
import { ANGEL_IDS, ARMOR_IDS, ERRORS, MSG_ERROR, ROOM_C2S, ROOM_S2C, angelSkillId, heroSkillId } from '../net/protocol.js';
import { createGame } from '../engine/game.js';
import { decodeBoard, encodeBoard, BOARD_ROWS } from '../engine/encode.js';
import { stackHeight } from '../engine/danger.js';
import { attachScene, detachScene, emitFx } from '../fx/feedback-sync.js';
import { createKeyboardInput } from './input-keyboard.js';
import { createTouchInput, pickVibration, vibrate } from './input-touch.js';
import { createInterference } from './interference-client.js';
import { applyAttack, applyEffect } from './effect-applier.js';

const balance = content.balance;
/** 유다가 처리하는 거부 ref (devguide §7.8 표) */
const MY_ERROR_REFS = new Set(['skill', 'armor', 'clear', 'state', 'topout', 'ready']);
/** D3-12 니어미스 ② — 상대 최고 높이가 이 줄 수 이상이면 "아깝다!" */
const NEAR_MISS_OPPONENT_HEIGHT = BOARD_ROWS - 1;
/** 한 프레임 dt 상한 (탭 전환 후 복귀 시 순간 이동 방지) · DOM HUD 갱신 간격 */
const MAX_FRAME_DT_MS = 100;
const HUD_DOM_INTERVAL_MS = 100;
/** EVT-42 "(n.n초)" 표시 갱신 간격 (소수 1자리) */
const TOAST_TICK_MS = 100;
const clock = () => Date.now();

// FR-001~011 전투 컨트롤러 생성 (devguide §7.8)
export function createBattleController({ room, joined, scene, ui, keyTarget, touchSurface }) {
  const mySlot = joined.slot;
  const mode = joined.mode;
  const practice = mode === 'practice';
  const me = joined.players.find((p) => p.slot === mySlot) ?? {};
  const opp = joined.players.find((p) => p.slot !== mySlot) ?? null;
  const hero = heroesById.get(me.heroId) ?? null;
  const basePreview = hero?.passive?.type === 'previewCount' ? hero.passive.count : balance.input.nextPreviewCount;

  let game = null;
  let interference = createInterference();
  let round = 0;
  let matchScore = [0, 0];
  let grace = false;
  let startAtLocal = 0;
  let roundStartLocal = 0;
  let running = false;
  let frozen = false;
  let quizActive = false;
  let resumeAtLocal = null;
  let paused = false;
  let hitstopUntil = 0;
  let status = { faith: 0, cooldowns: {}, armor: [], wards: {}, sealedMs: 0, pendingGarbage: 0, grace: false, jesusUsed: false };
  let statusAt = 0;
  let local = { hintUntil: 0, immuneUntil: 0, revealLeft: 0, revealHint: false, revealCount: 0 };
  let opponentBoard = null;
  let opponentScore = 0;
  let lastInDanger = false;
  let lastKeyId = null;
  const armorCells = new Map();
  let pendingFx = [];
  let pendingVibes = [];
  let rafId = null;
  let lastFrame = clock();
  let lastHudDom = 0;
  let frameErrorLogged = false;
  let disposed = false;

  const ctx = (now) => ({ game, interference, mySlot, now, local, wards: status.wards ?? {} });
  const canControl = () => game && running && !frozen && !paused && !game.toppedOut;

  // FR-011 입력 → 엔진 동작 (이세벨·광명의 천사 중 좌우 반전)
  function handleAction(action) {
    if (disposed) return;
    if (action === 'pause') { ui.openPauseMenu(); return; }
    if (action.startsWith('reaction:')) { ui.onReactionKey(action.slice('reaction:'.length)); return; }
    if (action.startsWith('quiz:')) { if (quizActive) ui.quizChoose(Number(action.slice('quiz:'.length))); return; }
    if (action === 'skill' || action.startsWith('angel:') || action.startsWith('armor:')) { perform(action); return; }
    if (action === 'softDropEnd') { game?.setSoftDrop(false); return; }
    if (!canControl()) return;
    const flip = interference.isReversed(clock()) ? -1 : 1;
    if (action === 'left') game.move(-1 * flip);
    else if (action === 'right') game.move(1 * flip);
    else if (action === 'rotateCw') game.rotate(1);
    else if (action === 'rotateCcw') game.rotate(-1);
    else if (action === 'hardDrop') game.hardDrop();
    else if (action === 'hold') game.hold();
    else if (action === 'softDropStart') game.setSoftDrop(true);
  }

  // FR-034·FR-035·FR-037 키캡·키 → skill/armor 송신 (검증은 서버 — 말씀 대결 정지 중 입력 무시 UC-009 E3)
  function perform(action) {
    if (!game || !running || frozen || game.toppedOut) return;
    if (action === 'skill') {
      lastKeyId = heroSkillId(me.heroId);
      room.send(ROOM_C2S.SKILL, { skillId: lastKeyId });
    } else if (action.startsWith('angel:') && !practice) {
      const id = action.slice('angel:'.length);
      if (!ANGEL_IDS.includes(id)) return;
      lastKeyId = angelSkillId(id);
      room.send(ROOM_C2S.SKILL, { skillId: lastKeyId });
    } else if (action.startsWith('armor:') && !practice) {
      const id = action.slice('armor:'.length);
      if (!ARMOR_IDS.includes(id)) return;
      lastKeyId = id;
      room.send(ROOM_C2S.ARMOR, { armorId: id });
    }
  }

  // FR-004·FR-007·FR-061 엔진 사건 → clear·topout 송신 + EVT 묶음
  function processEngineEvents() {
    for (const e of game.drainEvents()) {
      if (e.type === 'spawn' && e.special) pendingFx.push({ evt: 'EVT-33', kind: e.special.kind, cell: e.special.cell });
      else if (e.type === 'move') pendingFx.push({ evt: 'EVT-01', active: e.active });
      else if (e.type === 'rotate') pendingFx.push({ evt: 'EVT-02', from: e.from, to: e.to });
      else if (e.type === 'softDrop') pendingFx.push({ evt: 'EVT-04' });
      else if (e.type === 'hardDrop') { pendingFx.push({ evt: 'EVT-05', active: e.active, distance: e.distance }); pendingVibes.push('hardDrop'); }
      else if (e.type === 'lock') {
        pendingFx.push({ evt: 'EVT-06', cells: e.cells });
        if (!e.hard) pendingVibes.push('land');
        if (local.revealLeft > 0) local.revealLeft -= 1;
      } else if (e.type === 'hold') pendingFx.push({ evt: 'EVT-07', type: e.holdType });
      else if (e.type === 'clear') {
        room.sendSequenced(ROOM_C2S.CLEAR, {
          lines: e.lines, combo: e.combo, b2b: e.b2b, tspin: e.tspin, pieceCount: e.pieceCount,
          specials: e.specials.map(({ kind, pieceIndex, armorId }) => (kind === 'armor' ? { kind, pieceIndex, armorId } : { kind, pieceIndex })),
        });
        for (const s of e.specials) if (s.kind === 'armor') armorCells.set(s.armorId, s.cell);
        pendingFx.push({ evt: `EVT-${String(8 + e.lines).padStart(2, '0')}`, rows: e.rows, lines: e.lines });
        if (e.combo >= 1) pendingFx.push({ evt: 'EVT-13', combo: e.combo, lines: e.lines });
        if (e.tspin) pendingFx.push({ evt: 'EVT-14', lines: e.lines });
        if (e.b2b) pendingFx.push({ evt: 'EVT-15' });
      } else if (e.type === 'jericho') pendingFx.push({ evt: 'EVT-38', center: e.center });
      else if (e.type === 'manna') pendingFx.push({ evt: 'EVT-39' });
      else if (e.type === 'nearMiss') pendingFx.push({ evt: 'EVT-16', rows: e.rows, target: 'me' });
      else if (e.type === 'garbageInserted') pendingFx.push({ evt: 'EVT-23', rows: e.rows });
      else if (e.type === 'topout') {
        room.sendSequenced(ROOM_C2S.TOPOUT, { pieceCount: e.pieceCount });
        pendingFx.push({ evt: 'EVT-47' });
        running = false;
      }
    }
    const s = game.snapshot();
    if (s.inDanger !== lastInDanger) { lastInDanger = s.inDanger; pendingFx.push({ evt: 'EVT-17', inDanger: s.inDanger }); }
    for (const spiritId of interference.syncLeadRows(s.leadRows.length)) pendingFx.push({ evt: 'EVT-28', spiritId, target: 'me' });
  }

  // FR-061 한 프레임 EVT 묶음 1회 → 히트스톱 동안 중력·고정 지연 정지, 가장 긴 진동 1회 (EVT-19)
  function flushFx(now) {
    if (pendingFx.length) {
      const batch = pendingFx;
      pendingFx = [];
      const res = emitFx(batch);
      if (res && res.hitstopMs > 0) hitstopUntil = Math.max(hitstopUntil, now + res.hitstopMs);
    }
    if (pendingVibes.length) { vibrate(pickVibration(pendingVibes)); pendingVibes = []; }
  }

  function step(now, dt) {
    if (!game) return;
    if (!running && !game.toppedOut && startAtLocal && now >= startAtLocal && roundStartLocal === 0) {
      running = true;
      roundStartLocal = now;
      game.start();
    }
    if (frozen && resumeAtLocal !== null && now >= resumeAtLocal) { frozen = false; resumeAtLocal = null; }
    keyboard.update(now);
    if (canControl()) {
      for (const spiritId of interference.expire(now)) pendingFx.push({ evt: 'EVT-28', spiritId, target: 'me' });
      for (const dx of interference.windPushes(now)) game.move(dx);
      game.setGarbageBlocked(now < local.immuneUntil);
      if (now >= hitstopUntil) game.tick(dt, { gravityMultiplier: interference.gravityMultiplier(now) });
    }
    processEngineEvents();
  }

  // FR-006·FR-015·FR-035·FR-055 렌더 입력 + HUD (devguide §7.9 BoardRenderState·HudState)
  function render(now) {
    if (!game) return;
    const s = game.snapshot();
    const hinting = now < local.hintUntil || (local.revealLeft > 0 && local.revealHint);
    scene.renderMyBoard({
      grid: s.grid, active: s.active, ghost: interference.ghostView(s.grid, s.active, s.ghost, now),
      hint: hinting ? game.landingHint() : null, inDanger: s.inDanger, leadRows: s.leadRows,
    });
    scene.renderOpponentBoard(opponentBoard);
    const hud = buildHud(now, s);
    scene.updateHud(hud);
    if (now - lastHudDom >= HUD_DOM_INTERVAL_MS) { lastHudDom = now; ui.updateHud(hud); }
  }

  function buildHud(now, s) {
    const since = Math.max(0, now - statusAt);
    const cooldowns = Object.fromEntries(Object.entries(status.cooldowns ?? {}).map(([k, v]) => [k, Math.max(0, v - since)]));
    const sealedMs = Math.max(0, (status.sealedMs ?? 0) - since);
    const owned = new Set(status.armor ?? []);
    const keyState = (id, cost) => ((cooldowns[id] ?? 0) > 0 ? 'cooldown' : status.faith < cost ? 'cost' : 'ready');
    const keys = {};
    if (hero) keys[hero.skill.id] = keyState(hero.skill.id, hero.skill.cost);
    for (const id of ANGEL_IDS) {
      const skillId = angelSkillId(id);
      keys[skillId] = practice ? 'hidden' : sealedMs > 0 ? 'sealed' : keyState(skillId, angelsById.get(id)?.cost ?? 0);
    }
    for (const id of ARMOR_IDS) keys[id] = practice ? 'hidden' : owned.has(id) ? 'ready' : 'missing';
    const previewCount = local.revealLeft > 0 ? Math.max(basePreview, local.revealCount) : basePreview;
    return {
      mode, mySlot, round, bestOf: joined.bestOf, score: matchScore, elapsedMs: running ? now - roundStartLocal : 0,
      me: {
        nickname: me.nickname ?? null, heroId: me.heroId, score: s.score, combo: s.combo, b2b: s.b2b, hold: s.hold, holdUsed: s.holdUsed,
        next: interference.nextView(game.peekNext(previewCount), now), nextHidden: interference.isNextHidden(now),
        faith: status.faith, cooldowns, sealedMs, armor: status.armor ?? [], wards: status.wards ?? {}, pendingGarbage: s.pendingGarbage,
        grace, jesusUsed: Boolean(status.jesusUsed), reversed: interference.isReversed(now), activeSpirits: interference.activeList(now, s.leadRows),
      },
      opponent: opp ? { nickname: opp.nickname, heroId: opp.heroId, isBot: opp.isBot, botLevel: opp.botLevel, score: opponentScore } : null,
      keys,
    };
  }

  function frame() {
    if (disposed) return;
    const now = clock();
    const dt = Math.min(Math.max(0, now - lastFrame), MAX_FRAME_DT_MS);
    lastFrame = now;
    try {
      step(now, dt);
      render(now);
      flushFx(now);
    } catch (err) {
      if (!frameErrorLogged) { frameErrorLogged = true; console.error('battle-frame', err?.message); }
    }
    rafId = requestAnimationFrame(frame);
  }

  /* ───── 서버 메시지 (devguide §7.8 처리 표) ───── */
  const handlers = {
    // FR-005·FR-010·FR-047·FR-062 라운드 시작 — 같은 시드, 카운트다운 후 출현
    [ROOM_S2C.START](d) {
      game = createGame({ seed: d.seed, mode, stage: d.stage, matchElapsedMs: d.matchElapsedMs, rules: balance });
      interference = createInterference();
      local = { hintUntil: 0, immuneUntil: 0, revealLeft: 0, revealHint: false, revealCount: 0 };
      round = d.round; matchScore = d.score; grace = Boolean(d.grace);
      startAtLocal = room.toLocalTime(d.startAt); roundStartLocal = 0;
      running = false; frozen = false; quizActive = false; resumeAtLocal = null; hitstopUntil = 0; lastInDanger = false; opponentBoard = null;
      pendingFx.push({ evt: 'EVT-18', round: d.round, startAtLocal, countdownMs: d.countdown });
      if (grace) pendingFx.push({ evt: 'EVT-52' });
      room.startStateStream(getSnapshot);
    },
    // FR-006 상대 보드
    [ROOM_S2C.OPPONENT_STATE](d) {
      opponentBoard = { grid: decodeBoard(d.board), active: d.active ?? null };
      opponentScore = d.score;
    },
    // FR-025·FR-027~030 받는 공격
    [ROOM_S2C.ATTACK](d) {
      if (!game) return;
      pendingFx.push(...applyAttack(d, ctx(clock())));
      if (d.garbage > 0) pendingVibes.push('attackHit');
    },
    // FR-014~017·FR-035·FR-037·FR-039 효과
    [ROOM_S2C.EFFECT](d) {
      if (!game) return;
      if (d.kind === 'angel' && d.action?.type === 'revealQueue' && d.targetSlot === mySlot) local.revealCount = d.action.count;
      pendingFx.push(...applyEffect(d, ctx(clock())));
      if (d.kind === 'attackSent' && d.bySlot === mySlot) pendingVibes.push('attackSent');
    },
    // FR-033·FR-036 서버 상태 — 대기 쓰레기는 서버 장부로 낮춰 맞춘다(상쇄·그룹), 갑주 획득 EVT-30
    [ROOM_S2C.PLAYER_STATUS](d) {
      const before = new Set(status.armor ?? []);
      for (const id of d.armor ?? []) if (!before.has(id)) pendingFx.push({ evt: 'EVT-30', armorId: id, cell: armorCells.get(id) ?? null });
      status = { ...status, ...d };
      statusAt = clock();
      if (game && Number.isInteger(d.pendingGarbage) && game.pendingGarbage() > d.pendingGarbage) {
        game.reducePending(game.pendingGarbage() - d.pendingGarbage);
      }
    },
    // FR-040 말씀 대결 — 엔진 정지, resumeAt에 재개
    [ROOM_S2C.QUIZ_START]() { frozen = true; quizActive = true; game?.setSoftDrop(false); keyboard.releaseAll(); },
    [ROOM_S2C.QUIZ_RESULT](d) { quizActive = false; resumeAtLocal = room.toLocalTime(d.resumeAt); },
    // FR-007 라운드 종료 — 승패 연출·니어미스 ②·배너
    [ROOM_S2C.ROUND_END](d) {
      running = false;
      room.stopStateStream();
      matchScore = d.score;
      const won = d.winnerSlot === mySlot;
      pendingFx.push({ evt: 'EVT-48', won });
      if (!won && opponentBoard && stackHeight(opponentBoard.grid) >= NEAR_MISS_OPPONENT_HEIGHT) {
        pendingFx.push({ evt: 'EVT-16', rows: [BOARD_ROWS - stackHeight(opponentBoard.grid)], target: 'opponent' });
      }
      ui.showRoundEnd(d, mySlot);
    },
    // NFR-003·FR-034 거부 — 키캡 흔들림·토스트 (문구는 ERRORS[code].message)
    [MSG_ERROR](err) {
      if (!err || !MY_ERROR_REFS.has(err.ref)) return;
      if ((err.ref === 'skill' || err.ref === 'armor') && lastKeyId) ui.keycapRejected(lastKeyId, err.code);
      const message = ERRORS[err.code]?.message;
      if (!message) return;
      // EVT-42 "(n.n초)" 남은 시간 갱신 · EVT-43 "(n초)" — design-vision §4.10 (여호수아 조정)
      const remainMs = Number.isInteger(err.retryAfterMs) ? err.retryAfterMs : err.code === 'ANGEL_SEALED' ? Math.max(0, (status.sealedMs ?? 0) - (clock() - statusAt)) : 0;
      if ((err.code === 'COOLDOWN' || err.code === 'ANGEL_SEALED') && remainMs > 0) countdownToast(err.code, message, clock() + remainMs);
      else ui.showToast(message, { key: err.code, untilMs: Number.isInteger(err.retryAfterMs) ? clock() + err.retryAfterMs : undefined });
    },
  };

  // EVT-42·43 남은 시간 토스트 — 같은 key로 문구를 TOAST_TICK_MS마다 갱신 (toast는 key 병합)
  let toastTimer = null;
  function countdownToast(key, message, untilLocal) {
    clearInterval(toastTimer);
    const show = () => {
      const left = untilLocal - clock();
      if (left <= 0 || disposed) { clearInterval(toastTimer); toastTimer = null; return; }
      const text = key === 'COOLDOWN' ? `${message} (${(left / 1000).toFixed(1)}초)` : `${message} (${Math.ceil(left / 1000)}초)`;
      ui.showToast(text, { key, untilMs: untilLocal });
    };
    show();
    toastTimer = setInterval(show, TOAST_TICK_MS);
  }

  // FR-006 state 12Hz 스냅샷 (null = 건너뜀)
  function getSnapshot() {
    if (!game || !running || game.toppedOut) return null;
    const s = game.snapshot();
    return { board: encodeBoard(s.grid), active: s.active, score: s.score, garbageIn: s.garbageIn };
  }

  const offs = Object.entries(handlers).map(([type, fn]) => room.on(type, (data) => {
    try {
      fn(data);
    } catch (err) {
      console.error(`battle ${type}`, err?.message);
    }
  }));
  const keyboard = createKeyboardInput({
    target: keyTarget, onAction: handleAction, dasMs: balance.input.dasMs, arrMs: balance.input.arrMs, isQuizActive: () => quizActive, clock,
  });
  const touch = touchSurface
    ? createTouchInput({ surface: touchSurface, onAction: handleAction, getCellSize: () => scene.layout().cellSize, clock })
    : null;
  attachScene(scene);
  rafId = requestAnimationFrame(frame);

  return {
    // FR-008 장면 준비 완료 → ready (API-202)
    ready() { room.send(ROOM_C2S.READY, {}); },
    // FR-034·FR-035·FR-037 화면 키캡 버튼(터치)
    perform(action) { if (typeof action === 'string') perform(action); },
    // D3-20 연습 모드 일시 메뉴만 엔진 정지 (대전·봇은 무시)
    setPaused(p) { if (practice) { paused = Boolean(p); if (paused) { game?.setSoftDrop(false); keyboard.releaseAll(); } } },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearInterval(toastTimer);
      offs.forEach((off) => { if (typeof off === 'function') off(); });
      keyboard.dispose();
      touch?.dispose();
      room.stopStateStream();
      detachScene();
    },
  };
}
