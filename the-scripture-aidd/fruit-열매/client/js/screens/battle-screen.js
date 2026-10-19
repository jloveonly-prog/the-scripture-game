// TASK-063-1 · REQ-001 · FR-023 · FR-034 · SCR-005 · API-201 · API-202 · API-210 · API-251 · API-261 · API-262 · API-290 — 대전 화면 골격·BattleUiPort
// DOM 담당(D4-15): 수치·키캡·칩·배너·토스트·라이브 영역. 보드·홀드·다음·게이지 막대는 Pixi(납달리), 입력·판정 조정은 battle-controller(유다).
import { angelsById, heroesById, spiritsById, armorById } from '../content/content-loader.js';
import { connectRoom } from '../net/room-client.js';
import { ANGEL_IDS, ARMOR_IDS, CLOSE_CODES, ERRORS, MSG_ERROR, ROOM_C2S, ROOM_S2C, angelSkillId, heroSkillId } from '../net/protocol.js';
import { clear, el, emblemSlot, formatClock, trapFocus } from '../ui/dom.js';
import { createQuizPanel } from '../ui/quiz-panel.js';
import { createReactions } from '../ui/reactions.js';
import { BOT_LEVEL_LABELS } from './lobby-screen.js';
import { requestMatch } from './matching-screen.js';
import { mountOptionsScreen } from './options-screen.js';

const ARMOR_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y']; // CODE-006 순서 (design-vision §4.3)
const CONTROLLER_REFS = new Set(['skill', 'armor', 'clear', 'state', 'topout', 'ready']); // devguide §7.8 — 유다 처리
const WARD_TO_ARMOR = { shield: 'shield_of_faith', reflect: 'sword_of_the_spirit', breastplate: 'breastplate_of_righteousness', vision: 'helmet_of_salvation', deception: 'belt_of_truth', control: 'belt_of_truth', speed: 'gospel_shoes' };
const METER_CELLS = 20; // HUD-05 20칸 눈금
const METER_PULSE_ROWS = 6; // 6줄 이상이면 맥동
const BANNER_MS = 1500; // EVT-48·51 배너
const SHAKE_MS = 200; // EVT-41~44 키캡 흔들림
const MAX_CHIPS = 2; // FR-031 동시 2개
const DROPPED_TEXT = '연결이 끊어졌습니다';

/** HUD-01 라운드 승수 ●○ (2승 선승 — balance.match.winsNeeded) */
export function winDots(wins, needed = 2) {
  const w = Math.max(0, Math.min(needed, wins || 0));
  return '●'.repeat(w) + '○'.repeat(needed - w);
}

/** HUD-07·08·09 키캡 남은 초 표시 — cooldown/sealed일 때만 */
export function keycapTimerText(state, remainingMs) {
  return (state === 'cooldown' || state === 'sealed') && remainingMs > 0 ? `${Math.ceil(remainingMs / 1000)}` : '';
}

/** HUD-10 영 효과 칩 문구 (시간형 = 남은 초 소수 1자리, 줄 단위형 = 남은 삭제 수) */
export function spiritChipText(effect) {
  const name = spiritsById.get(effect.spiritId)?.nameKo ?? effect.spiritId;
  if (effect.remainingMs !== null && effect.remainingMs !== undefined) return `${name} ${(Math.max(0, effect.remainingMs) / 1000).toFixed(1)}s`;
  return effect.clearsLeft !== null && effect.clearsLeft !== undefined ? `${name} ${effect.clearsLeft}` : name;
}

const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };

export function mountBattleScreen(host, ctx) {
  const { session } = ctx;
  const matched = session.matched;
  const mode = matched.mode;
  const heroId = session.heroId;
  const practice = mode === 'practice';
  const timers = [];
  let room = null; let scene = null; let controller = null; let fx = null; let quiz = null; let reactions = null;
  let mySlot = matched.slot; let started = false; let finished = false; let leaving = false; let lastErrorCode = null; let disposed = false;
  let pauseRelease = null;
  host.classList.add('battle', `battle--${mode}`);

  // 모듈은 진입과 동시에 불러온다 ("전장으로 들어가는 중…" 동안)
  const modules = Promise.all([ctx.load('pixi'), ctx.load('controller'), ctx.load('feedback')]);

  /* ── 골격 (§3.5 HUD) ── */
  const stage = el('div', { class: 'battle__stage', attrs: { 'aria-hidden': 'true' } });
  const fxLayer = el('div', { class: 'battle__fx', attrs: { 'aria-hidden': 'true' } });
  const hud = el('div', { class: 'battle__hud' });
  const overlay = el('div', { class: 'battle__overlay' });
  host.append(stage, fxLayer, hud, overlay);
  const n = {}; // HUD 노드
  const side = (key) => el('div', { class: `scorebar__side scorebar__side--${key}` }, [
    n[`${key}Emblem`] = el('span', { class: 'scorebar__emblem' }), n[`${key}Name`] = el('span', { class: 'scorebar__name' }),
    key === 'me' ? (n.grace = el('span', { class: 'grace', text: '✧', attrs: { 'aria-label': '은혜', 'aria-hidden': 'true' } })) : null,
    n[`${key}Wins`] = el('span', { class: 'scorebar__wins', attrs: { 'aria-label': '라운드 승수' } }),
  ]);
  const pauseButton = el('button', { class: 'keycap keycap--pause', text: 'Ⅱ Esc', attrs: { type: 'button', tabindex: '-1', 'aria-label': '일시 메뉴' }, on: { click: () => ui.openPauseMenu() } });
  hud.append(
    el('header', { class: 'scorebar' }, [side('me'), n.center = el('span', { class: 'scorebar__center num' }), side('opp'), pauseButton]),
    n.meter = el('div', { class: 'garbage-meter', attrs: { 'aria-label': '받을 쓰레기 줄' } }, [n.meterFill = el('span', { class: 'garbage-meter__fill' }), n.meterNum = el('span', { class: 'garbage-meter__num num' })]),
    n.side = el('div', { class: 'battle__side' }, [n.armor = el('div', { class: 'armor-slots', attrs: { role: 'group', 'aria-label': '전신갑주' } }), n.chips = el('ul', { class: 'spirit-chips', attrs: { 'aria-label': '영 효과' } })]),
    n.scoreBox = el('div', { class: 'score-combo' }, [n.score = el('p', { class: 'num score' }), n.combo = el('p', { class: 'combo' }), n.b2b = el('p', { class: 'b2b', text: 'BACK-TO-BACK', hidden: true, attrs: { lang: 'en' } })]),
    n.oppBox = el('div', { class: 'opponent-info' }, [n.oppScore = el('p', { class: 'num' })]),
    n.myAnchor = el('div', { class: 'bubble-anchor bubble-anchor--me' }), n.oppAnchor = el('div', { class: 'bubble-anchor bubble-anchor--opp' }),
    n.touch = el('div', { class: 'touch-surface' }),
    n.bottom = el('footer', { class: 'battle__bottom' }, [
      n.faith = el('p', { class: 'faith-num num', attrs: { 'aria-label': '믿음' } }),
      n.keys = el('div', { class: 'keys', attrs: { role: 'group', 'aria-label': '스킬·천사' } }),
      n.reactionHost = el('div', { class: 'reaction-host' }),
    ]),
  );
  const keycaps = new Map();
  function keycap(id, keyLabel, name, cost, action, parent, cls) {
    const timer = el('span', { class: 'keycap__timer num' });
    const button = el('button', { class: `keycap ${cls}`, attrs: { type: 'button', tabindex: '-1', 'aria-label': `${keyLabel} ${name}` }, on: { click: () => controller?.perform(action) } },
      [el('span', { class: 'keycap__key', text: keyLabel }), el('span', { class: 'keycap__name', text: name }), cost !== null ? el('span', { class: 'keycap__cost num', text: String(cost) }) : null, timer]);
    keycaps.set(id, { button, timer });
    parent.append(button);
  }
  const hero = heroesById.get(heroId);
  keycap(heroSkillId(heroId), 'A', hero?.skill.nameKo ?? '', hero?.skill.cost ?? null, 'skill', n.keys, 'keycap--hero');
  if (!practice) {
    ANGEL_IDS.forEach((id, i) => { const a = angelsById.get(id); keycap(angelSkillId(id), String(i + 1), a?.nameKo ?? id, a?.cost ?? null, `angel:${id}`, n.keys, 'keycap--angel'); });
    ARMOR_IDS.forEach((id, i) => keycap(id, ARMOR_KEYS[i], armorById.get(id)?.nameKo ?? id, null, `armor:${id}`, n.armor, 'keycap--armor'));
  }

  /* ── 오버레이 (§3.6) ── */
  const statusLine = el('p', { class: 'battle__status', text: '전장으로 들어가는 중…', attrs: { role: 'status' } });
  const banner = el('div', { class: 'banner', hidden: true, attrs: { role: 'status' } });
  const quizHost = el('div', { class: 'quiz-host' });
  overlay.append(statusLine, banner, quizHost);

  function showModal(build, { trap = true } = {}) {
    const box = el('div', { class: 'modal', attrs: { role: 'dialog', 'aria-modal': 'true' } });
    const backdrop = el('div', { class: 'modal-backdrop' }, [box]);
    overlay.append(backdrop);
    build(box);
    const release = trap ? trapFocus(box) : () => {};
    box.querySelector('button')?.focus();
    return () => { release(); backdrop.remove(); };
  }
  function fatalModal() { // EVT-54 BOT_FAILURE "경기를 계속할 수 없습니다" + [로비로] (모듈 로드 실패에도 재사용 — 보고서 기재)
    finished = true;
    controller?.dispose();
    showModal((box) => box.append(el('h2', { text: ERRORS.BOT_FAILURE.message }),
      el('button', { class: 'btn btn--primary', text: '로비로', attrs: { type: 'button' }, on: { click: () => ctx.navigate('lobby') } })));
  }
  function showBanner(title, line, ms) {
    clear(banner);
    banner.append(el('p', { class: 'banner__title', text: title }), line ? el('p', { class: 'banner__line num', text: line }) : null);
    banner.hidden = false;
    timers.push(setTimeout(() => { banner.hidden = true; }, ms));
  }
  const leave = (toast) => { leaving = true; ctx.navigate('lobby', toast ? { toast } : {}); };

  /* ── BattleUiPort (devguide §7.8) ── */
  const ui = {
    updateHud(state) {
      const me = state.me ?? {};
      const score = state.score ?? [0, 0];
      setText(n.meWins, practice ? '' : winDots(score[mySlot - 1]));
      setText(n.oppWins, practice || !state.opponent ? '' : winDots(score[2 - mySlot]));
      setText(n.center, practice ? `플레이 시간 ${formatClock(state.elapsedMs)}` : `ROUND ${state.round} · ${formatClock(state.elapsedMs)}`);
      if (n.grace.classList.contains('is-on') !== Boolean(me.grace)) { n.grace.classList.toggle('is-on', Boolean(me.grace)); n.grace.setAttribute('aria-hidden', me.grace ? 'false' : 'true'); }
      const pending = Math.max(0, me.pendingGarbage ?? 0);
      n.meterFill.style.transform = `scaleY(${Math.min(pending, METER_CELLS) / METER_CELLS})`;
      n.meter.classList.toggle('is-pulse', pending >= METER_PULSE_ROWS);
      setText(n.meterNum, pending ? String(pending) : '');
      setText(n.faith, `믿음 ${me.faith ?? 0}/100`);
      for (const [id, { button, timer }] of keycaps) {
        const keyState = state.keys?.[id] ?? 'missing';
        if (button.dataset.state !== keyState) button.dataset.state = keyState;
        button.hidden = keyState === 'hidden';
        const remaining = keyState === 'sealed' ? me.sealedMs : me.cooldowns?.[id];
        setText(timer, keycapTimerText(keyState, remaining ?? 0));
      }
      const warded = new Set(Object.entries(me.wards ?? {}).filter(([, v]) => v === true || v > 0).map(([k]) => WARD_TO_ARMOR[k]).filter(Boolean));
      for (const id of ARMOR_IDS) keycaps.get(id)?.button.classList.toggle('is-warded', warded.has(id));
      const chips = (me.activeSpirits ?? []).slice(0, MAX_CHIPS).map((s) => `${s.spiritId === 'deaf_dumb_spirit' ? '🔇 ' : '◐ '}${spiritChipText(s)}`);
      if (me.sealedMs > 0) chips.push(`⛓ 봉인 ${Math.ceil(me.sealedMs / 1000)}s`);
      if (n.chips.dataset.text !== chips.join('|')) {
        n.chips.dataset.text = chips.join('|');
        clear(n.chips).append(...chips.map((t) => el('li', { class: 'chip', text: t })));
      }
      setText(n.score, (me.score ?? 0).toLocaleString('en-US'));
      setText(n.combo, me.combo > 0 ? `COMBO ×${me.combo}` : '');
      n.b2b.hidden = !me.b2b;
      setText(n.oppScore, state.opponent ? `점수 ${(state.opponent.score ?? 0).toLocaleString('en-US')}` : '');
    },
    // FR-007 EVT-48 라운드 종료 배너 "ROUND 1 · 승리 / 1 : 0 / 다음 라운드 3초"
    showRoundEnd(roundEnd, slot) {
      const won = roundEnd.winnerSlot === slot;
      const s = roundEnd.score ?? [0, 0];
      const next = roundEnd.nextRoundAt ? Math.max(0, Math.round((room.toLocalTime(roundEnd.nextRoundAt) - Date.now()) / 1000)) : null;
      showBanner(`ROUND ${roundEnd.round} · ${won ? '승리' : '패배'}`, `${s[slot - 1]} : ${s[2 - slot]}${next !== null ? `  ·  다음 라운드 ${next}초` : ''}`, BANNER_MS);
      ctx.announce(`라운드 ${roundEnd.round} ${won ? '승리' : '패배'}`);
    },
    showToast: (message, opts = {}) => ctx.toast(message, opts),
    announce: (text) => ctx.announce(text),
    keycapRejected(keyId) {
      const cap = keycaps.get(keyId);
      if (!cap) return;
      cap.button.classList.add('is-shake');
      timers.push(setTimeout(() => cap.button.classList.remove('is-shake'), SHAKE_MS));
    },
    // D3-14·D3-20 일시 메뉴 — 대전·봇은 경기 계속, 연습만 엔진 정지
    openPauseMenu() {
      if (pauseRelease || finished || quiz?.isOpen()) return;
      if (practice) controller?.setPaused(true);
      const close = () => { pauseRelease?.(); pauseRelease = null; if (practice) controller?.setPaused(false); };
      const render = (box) => {
        clear(box);
        box.append(el('h2', { text: '일시 메뉴' }),
          el('button', { class: 'btn btn--primary', text: '계속', attrs: { type: 'button' }, on: { click: close } }),
          el('button', { class: 'btn btn--secondary', text: '옵션', attrs: { type: 'button' }, on: { click: () => { clear(box); const view = mountOptionsScreen(box, ctx, { modal: true, onBack: () => { view.unmount(); render(box); } }); } } }),
          practice ? el('button', { class: 'btn btn--cancel', text: '그만하기', attrs: { type: 'button' }, on: { click: () => { room.send(ROOM_C2S.QUIT, {}); close(); } } }) : null,
          el('p', { class: 'help', text: practice ? '연습: 보드가 멈춥니다' : '대전·봇: 경기는 멈추지 않습니다' }));
        box.querySelector('button')?.focus();
      };
      pauseRelease = showModal((box) => {
        render(box);
        box.addEventListener('keydown', (event) => { if (event.key === 'Escape' && box.querySelector('h2')?.textContent === '일시 메뉴') close(); });
      });
    },
    quizChoose: (index) => quiz?.choose(index),
    onReactionKey: (reactionId) => reactions?.trySend(reactionId),
  };

  /* ── 방 연결·메시지 (devguide §7.8 표의 므낫세 몫) ── */
  try {
    room = connectRoom({ roomId: matched.roomId, token: session.guest.token, heroId });
  } catch (err) {
    console.error('[battle] connect failed', err);
    timers.push(setTimeout(() => leave(ERRORS.ROOM_NOT_FOUND.message), 0));
    return { unmount() { timers.forEach(clearTimeout); } };
  }
  room.on(ROOM_S2C.JOINED, (joined) => setup(joined).catch((err) => { console.error('[battle] setup failed', err); fatalModal(); }));
  room.on(ROOM_S2C.START, () => { started = true; statusLine.hidden = true; });
  room.on(ROOM_S2C.QUIZ_START, (d) => quiz?.open(d));
  room.on(ROOM_S2C.QUIZ_LOCK, (d) => quiz?.lock(d));
  room.on(ROOM_S2C.QUIZ_RESULT, (d) => quiz?.result(d));
  room.on(ROOM_S2C.REACTION, (d) => reactions?.receive(d));
  room.on(ROOM_S2C.MATCH_END, finish);
  room.on(MSG_ERROR, onError);
  room.onClose(onClose);

  async function setup(joined) {
    mySlot = joined.slot;
    const me = joined.players.find((p) => p.slot === mySlot);
    const opp = joined.players.find((p) => p.slot !== mySlot) ?? null;
    const load = () => ctx.load('emblems');
    n.meEmblem.append(emblemSlot(load, heroesById.get(me?.heroId), 24));
    setText(n.meName, me?.nickname ?? session.profile?.nickname ?? '');
    if (opp) {
      n.oppEmblem.append(emblemSlot(load, heroesById.get(opp.heroId), 24));
      setText(n.oppName, opp.isBot ? `AI 봇 · ${BOT_LEVEL_LABELS[opp.botLevel] ?? ''}` : (opp.nickname ?? ''));
    }
    if (!practice) reactions = createReactions({ barHost: n.reactionHost, myAnchor: n.myAnchor, opponentAnchor: n.oppAnchor, room });
    const [pixi, ctrl, feedback] = await modules;
    if (disposed || finished) return;
    if (!pixi || !ctrl) { fatalModal(); return; }
    fx = feedback;
    scene = await pixi.createBattleScene({ stageHost: stage, overlayHost: fxLayer, mode, mySlot, players: joined.players });
    if (disposed) { scene.destroy(); return; }
    fx?.attachScene(scene);
    applyLayout(scene.layout());
    scene.onLayout(applyLayout);
    quiz = createQuizPanel({ host: quizHost, room, mySlot, toLocalTime: room.toLocalTime, emitFx: (e) => fx?.emitFx(e), announce: ctx.announce,
      onOpenChange: (open) => host.classList.toggle('is-quiz', open) });
    controller = ctrl.createBattleController({ room, joined, scene, ui, keyTarget: window, touchSurface: n.touch });
    controller.ready();
    if (!started) setText(statusLine, mode === 'random' || mode === 'invite' ? '상대를 기다리는 중' : '');
    statusLine.hidden = started || !statusLine.textContent;
  }

  // design-vision §5.2 — Pixi 배치(layout)에 DOM HUD 위치를 맞춘다
  function applyLayout(layout) {
    const place = (node, rect, dx = 0, dy = 0) => {
      if (!rect) return;
      Object.assign(node.style, { left: `${rect.x + dx}px`, top: `${rect.y + dy}px` });
    };
    const board = layout.myBoard;
    Object.assign(n.touch.style, { left: `${board.x}px`, top: `${board.y}px`, width: `${board.width}px`, height: `${board.height}px` });
    place(n.meter, board, -16);
    n.meter.style.height = `${board.height}px`;
    place(n.side, layout.hold, 0, layout.hold ? layout.hold.height + 8 : 0);
    place(n.scoreBox, layout.next, 0, layout.next ? layout.next.height + 8 : 0);
    place(n.myAnchor, board, board.width / 2);
    if (layout.opponentBoard) { place(n.oppAnchor, layout.opponentBoard, layout.opponentBoard.width / 2); place(n.oppBox, layout.opponentBoard, 0, layout.opponentBoard.height + 8); }
  }

  function onError(err) {
    if (CONTROLLER_REFS.has(err.ref) && err.code !== 'OPPONENT_LEFT' && err.code !== 'BOT_FAILURE') return;
    lastErrorCode = err.code;
    if (err.code === 'INVALID_TOKEN') { leaving = true; ctx.logout(ERRORS.INVALID_TOKEN.message); return; }
    if (err.code === 'BOT_FAILURE') { fatalModal(); return; } // UC-005 E2
    if (err.code === 'OPPONENT_LEFT' && !started) { reRegister(); return; } // UC-003 E2
    if (['NOT_IN_ROOM', 'HERO_MISMATCH', 'DUPLICATE_SESSION'].includes(err.code)) return; // 4003 종료에서 안내
    ctx.toast(ERRORS[err.code]?.message ?? '');
  }

  // UC-003 E2 시작 전 상대 미입장 → 같은 모드로 매칭 대기 자동 복귀 (랜덤 A / 방장 B / 친구 C)
  async function reRegister() {
    leaving = true;
    ctx.toast(ERRORS.OPPONENT_LEFT.message);
    room.close();
    session.matched = null;
    if (mode === 'invite' && session.inviteRole === 'friend') { ctx.navigate('matching'); return; }
    if (mode !== 'random' && mode !== 'invite') { ctx.navigate('lobby'); return; }
    const result = await requestMatch(ctx, { heroId, mode, inviteRole: session.inviteRole });
    if (result.ok) ctx.navigate(result.reply.type === 'matched' ? 'battle' : 'matching');
    else if (result.error.code !== 'INVALID_TOKEN') ctx.navigate('lobby', { toast: ERRORS[result.error.code]?.message || DROPPED_TEXT });
  }

  function onClose(code, reason, info) {
    if (finished || leaving || disposed) return;
    if (code === CLOSE_CODES.AUTH_FAILED) { leaving = true; ctx.logout(ERRORS.INVALID_TOKEN.message); return; }
    if (code === CLOSE_CODES.NOT_ELIGIBLE || code === CLOSE_CODES.ROOM_GONE) { leave(ERRORS[lastErrorCode]?.message || ERRORS.ROOM_NOT_FOUND.message); return; }
    if (code === CLOSE_CODES.RATE_ABUSE) { leave(ERRORS.RATE_LIMITED.message); return; }
    leave(info?.opened ? DROPPED_TEXT : ERRORS.ROOM_NOT_FOUND.message); // GameRoom은 재연결하지 않음 (api-gate §4.3)
  }

  // FR-007·009 matchEnd → 세션 저장 → SCR-006 (이탈 승리는 EVT-51 배너 먼저)
  function finish(data) {
    finished = true;
    session.matchEnd = { data, mySlot, heroId, mode };
    session.matched = null;
    quiz?.close();
    pauseRelease?.();
    const go = () => { if (!disposed) ctx.navigate('result'); };
    if (data.reason === 'disconnect' && data.winnerSlot === mySlot) {
      // EVT-51 배너·후속 EVT-49는 feedback-sync가 1회 실행 (design-vision EVT-51 "배너 1500ms → EVT-49") — 연출 모듈이 없을 때만 DOM 배너
      if (fx) { fx.emitFx([{ evt: 'EVT-51' }]); session.matchEnd.winFxPlayed = true; }
      else showBanner('상대가 나갔습니다 — 승리', null, BANNER_MS);
      ctx.announce('상대가 나갔습니다 — 승리');
      timers.push(setTimeout(go, BANNER_MS));
    } else go();
  }

  return {
    onPopState: () => ui.openPauseMenu(),
    unmount() {
      disposed = true;
      timers.forEach(clearTimeout);
      pauseRelease?.();
      try { controller?.dispose(); } catch (err) { console.error('[battle] controller dispose', err); }
      try { fx?.detachScene(); scene?.destroy(); } catch (err) { console.error('[battle] scene destroy', err); }
      quiz?.destroy();
      reactions?.destroy();
      room?.close();
    },
  };
}
