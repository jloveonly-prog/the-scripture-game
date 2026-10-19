// apply-spirit.js — 악한 영 14종 저주 상태 모델(반전·바람·가짜 다음/고스트·미리보기 숨김·음소거·가림 수치·봉인 표시) 적용·만료만
// TASK-011 | REQ-007 FR-027 FR-028 FR-029 FR-030 FR-031 | API-021 `attack` · API-024 `status.effects`·`sealedMs` |
// TBL-013 | ARCH-003
// 시간·지속은 서버가 정한다(`attack.duration`, `status.effects[].remainingMs` — FR-031 상한은 서버 판정). 이 파일은 받은 값을
// 내 화면·조작 상태로 바꾸고 만료시킬 뿐이다. 가림 수치(opacity·coverage·blur 등)는 spirits.json 그대로 (D3-09 공정성).
// 보드 상태형(아바돈 구멍·악 납 블록)은 apply-attack.js. 시간은 호출자가 nowMs로 준다.

/**
 * @typedef {import("../engine/index.js").Engine} Engine
 * @typedef {{ id: string, effect: string, category: string, duration_ms: number, params: Record<string, any> }}
 * SpiritDef
 * @typedef {{ spiritId: string, effect: string, category: string, startedAt: number, until: number,
 *   params: Record<string, any>, nextPushAt: number }} Curse
 * @typedef {{ curses: Map<string, Curse>, sealedUntil: number }} CurseState
 */

/** @returns {CurseState} */
export function createCurseState() {
  return { curses: new Map(), sealedUntil: 0 };
}

/**
 * API-021 `attack`에서 시간형 저주를 건다 (내가 target이고 spiritApplied일 때만).
 * @param {CurseState} state
 * @param {{ target: number, spiritId: string | null, spiritApplied: boolean, duration: number, params: Record<string,
 * any> }} data
 * @param {SpiritDef | undefined} spirit spirits.json 정의 (content.js spiritsById)
 * @param {number} mySlot @param {number} nowMs
 * @returns {Curse | null}
 */
export function applySpiritCurse(state, data, spirit, mySlot, nowMs) {
  if (data.target !== mySlot || !data.spiritApplied || !spirit || data.duration <= 0) return null;
  const curse = {
    spiritId: spirit.id, effect: spirit.effect, category: spirit.category,
    startedAt: nowMs, until: nowMs + data.duration,
    params: { ...spirit.params, ...(data.params ?? {}) },
    nextPushAt: nowMs + (spirit.params.pushEveryMs ?? 0),
  };
  state.curses.set(spirit.id, curse);
  // FR-028 바사 왕국의 군주: 천사 소환 봉인 표시 (21초 — rules.effects.sealMs는 서버가 duration으로 보냄)
  if (spirit.effect === "seal_angels") state.sealedUntil = curse.until;
  return curse;
}

/**
 * 저주 해제 — id 목록 (스랍·갑주 nullify·미가엘·예수님의 `effect.params.cleared` 등).
 * @param {CurseState} state @param {Engine} engine @param {readonly string[]} spiritIds
 * @returns {string[]} 실제로 풀린 id
 */
export function removeCurses(state, engine, spiritIds) {
  const removed = [];
  for (const id of spiritIds) {
    const curse = state.curses.get(id);
    if (!curse) continue;
    state.curses.delete(id);
    endCurse(state, engine, curse);
    removed.push(id);
  }
  return removed;
}

/**
 * 분류(CODE-007)로 해제 — 갑주 nullify (`armor.json nullifies`).
 * @param {CurseState} state @param {Engine} engine @param {readonly string[]} categories
 * @returns {string[]}
 */
export function removeCursesByCategory(state, engine, categories) {
  const ids = [...state.curses.values()].filter((c) => categories.includes(c.category)).map((c) => c.spiritId);
  return removeCurses(state, engine, ids);
}

/**
 * 전부 해제 (FR-039 예수님 "모든 저주와 암전 제거").
 * @param {CurseState} state @param {Engine} engine
 * @returns {string[]}
 */
export function removeAllCurses(state, engine) {
  return removeCurses(state, engine, [...state.curses.keys()]);
}

/** @param {CurseState} state @param {Engine} engine @param {Curse} curse */
function endCurse(state, engine, curse) {
  // FR-028 바람 해제 → 낙하 속도 원래대로
  if (curse.effect === "wind") engine.setGravityMultiplier(1);
  if (curse.effect === "seal_angels") state.sealedUntil = 0;
}

/**
 * 시간 진행: 만료 처리 + 공중 권세 잡은 자 효과(낙하 ×gravityMultiplier, pushEveryMs마다 pushDir로 한 칸 밀림).
 * @param {CurseState} state @param {Engine} engine @param {number} nowMs
 * @returns {Array<{ type: string, [key: string]: unknown }>}
 */
export function tickCurses(state, engine, nowMs) {
  const events = [];
  for (const curse of [...state.curses.values()]) {
    if (nowMs >= curse.until) {
      state.curses.delete(curse.spiritId);
      endCurse(state, engine, curse);
      events.push({ type: "curseEnd", spiritId: curse.spiritId });
      continue;
    }
    if (curse.effect === "wind") {
      // FR-028 "낙하 속도 2배 + 블록이 한쪽으로 밀림" (params.gravityMultiplier, pushEveryMs, 서버 pushDir)
      engine.setGravityMultiplier(curse.params.gravityMultiplier);
      while (curse.params.pushEveryMs > 0 && nowMs >= curse.nextPushAt) {
        curse.nextPushAt += curse.params.pushEveryMs;
        events.push(...engine.nudge(curse.params.pushDir >= 0 ? 1 : -1));
      }
    }
  }
  return events;
}

/**
 * API-024 `status`가 HUD의 유일한 원천 — 서버 목록에 없는 저주는 끝낸다(남은 시간 동기화).
 * @param {CurseState} state @param {Engine} engine
 * @param {{ effects: Array<{ spiritId: string, remainingMs: number }>, sealedMs: number }} status
 * @param {number} nowMs
 */
export function syncCursesWithStatus(state, engine, status, nowMs) {
  const live = new Map(status.effects.map((e) => [e.spiritId, e.remainingMs]));
  for (const curse of [...state.curses.values()]) {
    if (curse.effect === "seal_angels") continue;
    const remaining = live.get(curse.spiritId);
    if (remaining === undefined) removeCurses(state, engine, [curse.spiritId]);
    else curse.until = nowMs + remaining;
  }
  state.sealedUntil = status.sealedMs > 0 ? nowMs + status.sealedMs : 0;
}

/**
 * 조작 반전 (FR-029 이세벨의 영 — 좌우 반전).
 * @param {CurseState} state @param {string} command 엔진 명령
 * @returns {string}
 */
export function transformCommand(state, command) {
  const reversed = [...state.curses.values()].some((c) => c.effect === "reverse_controls");
  if (!reversed) return command;
  if (command === "left") return "right";
  if (command === "right") return "left";
  return command;
}

/**
 * 고스트 표시 위치 (FR-027 거짓말하는 영 가짜 고스트·점치는 귀신 틀린 고스트 — design-vision S-04·S-05).
 * @param {CurseState} state @param {{ type: string, x: number, y: number, rot: number } | null} ghost
 * @param {number} boardWidth
 * @returns {{ type: string, x: number, y: number, rot: number } | null}
 */
export function displayGhost(state, ghost, boardWidth) {
  if (!ghost) return null;
  const curses = [...state.curses.values()];
  const lying = curses.find((c) => c.effect === "fake_next_ghost");
  if (lying) {
    // S-04 실제 착지와 다른 열 — 저주 시작 시각으로 고정한 표시용 열 (판정과 무관)
    const fake = Math.floor(lying.startedAt) % (boardWidth - 2);
    return { ...ghost, x: fake === ghost.x ? (fake + 3) % (boardWidth - 2) : fake };
  }
  const divination = curses.find((c) => c.effect === "wrong_ghost");
  if (divination) {
    // S-05 벽에서 먼 쪽으로 offset칸, 보드 밖이면 반대쪽
    const offset = divination.params.offset;
    const towardRight = ghost.x < boardWidth / 2;
    const x = towardRight ? ghost.x + offset : ghost.x - offset;
    return { ...ghost, x: x >= -1 && x < boardWidth - 1 ? x : towardRight ? ghost.x - offset : ghost.x + offset };
  }
  return ghost;
}

/**
 * 렌더·오디오가 읽을 저주 표시 상태 (계산 없이 spirits.json 수치를 그대로 노출 — D3-09).
 * @param {CurseState} state @param {number} nowMs
 */
export function curseView(state, nowMs) {
  const view = {
    darkenOpacity: 0, hideNext: false, mute: false, fakeNext: false, swarmCoverage: 0, flies: 0,
    blur: 0, waveAmplitude: 0, blackout: false, reversed: false, wind: 0, falseAngelDisguise: false,
    sealedMs: Math.max(0, state.sealedUntil - nowMs),
    chips: /** @type {Array<{ spiritId: string, remainingMs: number }>} */ ([]),
  };
  for (const c of state.curses.values()) {
    view.chips.push({ spiritId: c.spiritId, remainingMs: Math.max(0, c.until - nowMs) });
    const p = c.params;
    switch (c.effect) {
      case "darken": view.darkenOpacity = Math.max(view.darkenOpacity, p.opacity); break;
      case "mute_hide_next": view.hideNext = true; view.mute = true; break;
      case "shadow_swarm": view.swarmCoverage = p.coverage; break;
      case "fake_next_ghost": view.fakeNext = true; break;
      case "fly_swarm": view.flies = p.particles; break;
      case "wind": view.wind = p.pushDir >= 0 ? 1 : -1; break;
      case "reverse_controls": view.reversed = true; break;
      case "drunken_blur": view.blur = p.blur; view.waveAmplitude = p.waveAmplitude; break;
      case "blackout": view.blackout = true; break;
      case "false_angel":
        // FR-030 천사처럼 나타나 도와주는 척(disguiseMs) → 저주(darken_hide_next: 어둠 opacity + 다음 블록 숨김)
        if (nowMs - c.startedAt < p.disguiseMs) view.falseAngelDisguise = true;
        else { view.darkenOpacity = Math.max(view.darkenOpacity, p.opacity); view.hideNext = true; }
        break;
      default: break;
    }
  }
  return view;
}
