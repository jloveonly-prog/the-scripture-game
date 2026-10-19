// bot-driver.ts — 봇 엔진 구동만: 틱 루프(1000/net.stateHz)·봇 줄 삭제 → 사람과 같은 applyClear·판정 결과 → 봇 엔진 전달
// TASK-033 | REQ-005 FR-005 FR-021 FR-022 FR-041 | ARCH-011 ARCH-013 | API-018 API-020~API-023 | D-10
// architecture §9.4
// task-wall §3.3 #13-1 (W-02 분할: game-room.ts 실측 357줄 → DO 셸에서 봇 구동 책임 분리). cloudflare:workers 비의존.
import { BotPlayer } from "../bot/bot-player";
import { log } from "../log";
import { ROOM_OUT } from "../protocol/messages";
import type { BotLevel, HeroId, Slot } from "../storage/adapter";
import { applyClear, type RoomRuntime } from "./handlers";
import { checkJesusEvent } from "./jesus";
import { handleTopout, opponentOf, type MatchState } from "./match-flow";
import { pendingTotal, type RoomContext, type SlotState } from "./player-state";

/** 봇 구동에 필요한 방 환경 (GameRoom이 주입) */
export interface BotDriverDeps {
  /** 지금의 핸들러 실행 환경 (경기가 끝났거나 설정이 없으면 null) */
  runtime(): RoomRuntime | null;
  schedule: RoomContext["schedule"];
  rules: RoomContext["rules"];
}

function isEnded(m: MatchState): boolean {
  return m.phase === "ended";
}

export class BotDriver {
  readonly bot: BotPlayer;
  private running = false;
  private paused = false;

  constructor(slot: Slot, level: BotLevel, heroId: HeroId, armorIds: readonly string[], random: () => number,
    private readonly deps: BotDriverDeps) {
    this.bot = new BotPlayer(slot, level, heroId, deps.rules, armorIds, random);
  }

  /** FR-005 라운드 시작: 사람과 같은 seed·stage, D-18 낙하 곡선 기준 = 경기 경과 → 틱 루프 시작 */
  startRound(seed: number, stage: { word: boolean; jericho: boolean; manna: boolean }, now: number,
    matchElapsedMs: number): void {
    this.bot.startRound(seed, stage, now, matchElapsedMs);
    if (this.running) return;
    this.running = true;
    const period = 1000 / this.deps.rules.net.stateHz;
    const tick = (): void => {
      const rt = this.deps.runtime();
      if (!rt || rt.match.phase === "ended") {
        this.running = false;
        return;
      }
      this.paused = botTick(rt, this.bot, Date.now(), this.paused);
      // botTick이 Top-out으로 경기를 끝냈을 수 있다 (phase는 호출 뒤 다시 읽는다)
      if (isEnded(rt.match)) this.running = false;
      else this.deps.schedule(period, tick);
    };
    this.deps.schedule(period, tick);
  }

  /** 봇 슬롯으로 가는 판정 결과 → 봇 엔진 (API-021·API-022·API-023 — apply-*.js와 같은 규칙) */
  deliver(type: string, data: unknown): void {
    const bot = this.bot;
    if (type === ROOM_OUT.attack) bot.onAttack(data as Parameters<BotPlayer["onAttack"]>[0]);
    else if (type === ROOM_OUT.garbage) bot.onGarbage(data as Parameters<BotPlayer["onGarbage"]>[0]);
    else if (type === ROOM_OUT.effect) bot.onEffect(data as Parameters<BotPlayer["onEffect"]>[0]);
  }
}

/**
 * 봇 틱 (API-020 초당 net.stateHz회 — D-10): 진행 중이면 bot.step → 줄 삭제는 사람과 같은 applyClear → 위기 판정 →
 * Top-out은 API-018과 같은 처리. 말씀 대결 정지에서 돌아오면 bot.resume (FR-041). 상대(사람)에게 봇 보드 `opponentState`.
 * @param wasPaused 직전 틱이 정지(quiz) 중이었는가
 * @returns 이번 틱이 정지 중인가
 */
export function botTick(rt: RoomRuntime, bot: BotPlayer, now: number, wasPaused: boolean): boolean {
  const m: MatchState = rt.match;
  if (m.phase === "quiz") return true;
  if (m.phase === "active") {
    if (wasPaused) bot.resume(now);
    const step = bot.step(now);
    for (const c of step.clears) {
      const code = applyClear(rt, bot.slot, c, now);
      if (code) log.event("reject", { code });
    }
    const me = m.slots.get(bot.slot) as SlotState;
    if (m.phase === "active") checkJesusEvent(rt.ctx, me, true, bot.boardString());
    if (step.topout && m.phase === "active") handleTopout(rt.ctx, m, bot.slot, false);
  }
  const snap = bot.snapshot();
  const human = opponentOf(m, bot.slot);
  if (snap && human && (m.phase === "countdown" || m.phase === "active")) {
    const pending = pendingTotal(m.slots.get(bot.slot) as SlotState);
    rt.ctx.send(human.slot, ROOM_OUT.opponentState, { ...snap, pending });
  }
  return false;
}
