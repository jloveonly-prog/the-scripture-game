// TASK-012 · REQ-005 · FR-021 · D-11 · OQ #6 — 서버 내 봇 보드 진행·입력 속도 (devguide §7.4 BotPlayer).
// 단일 책임: 클라이언트와 같은 엔진(game.js)으로 봇 보드를 진행해 사람과 같은 형식의 state·clear·topout(API-203·204·207)을 만든다.
// 봇은 스킬·천사·갑주를 쓰지 않는다 (OQ #6). 출력은 GameRoom이 사람 clear와 같은 판정 파이프라인에 넣는다.
import { createGame } from '../../../../client/js/engine/game.js';
import { encodeBoard } from '../../../../client/js/engine/encode.js';
import { destroyTopBlocks, removeBottomGarbage, removeColumnTops } from '../../../../client/js/engine/board.js';
import { deriveSeed, mulberry32 } from '../../../../client/js/engine/rng.js';
import { TIMING } from '../../../../client/js/net/protocol.js';
import { balance, spiritsById } from '../../content';
import { nextStep, planPlacement, type Placement } from './bot-planner';

export interface BotInit { level: 'easy' | 'normal' | 'hard'; seed: number; stage: 0 | 1 | 2; startAt: number; matchElapsedMs: number }
export interface BotOutput { type: 'state' | 'clear' | 'topout'; data: Record<string, unknown> }
export interface BotPlayer {
  tick(now: number): BotOutput[];
  receiveAttack(attack: { garbage: number; holeColumn: number; spiritId: string | null; duration: number; params: Record<string, unknown> }): void;
  applyEffect(effect: { kind: string; id: string; action: { type: string; [k: string]: unknown } }): void;
  freeze(now: number): void;
  resume(now: number): void;
  readonly toppedOut: boolean;
}

/** 봇 실수 판단용 난수 스트림 (블록 순서·특수 칸 스트림과 분리) */
const BOT_SEED_XOR = 0x0b07b07;
const int = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : fallback);

// FR-021 봇 생성 — 라운드마다 1개 (start와 같은 seed·stage·startAt)
export function createBotPlayer(init: BotInit): BotPlayer {
  const cfg = balance.bots[init.level];
  if (!cfg) throw new RangeError('createBotPlayer: 알 수 없는 봇 난이도');
  const game = createGame({ seed: init.seed, mode: 'bot', stage: init.stage, matchElapsedMs: init.matchElapsedMs, rules: balance });
  const rand = mulberry32(deriveSeed(init.seed, BOT_SEED_XOR));
  let started = false;
  let frozen = false;
  let frozenAt = 0;
  let toppedOut = false;
  let seq = 0;
  let lastTick = init.startAt;
  let nextStateAt = init.startAt;
  let thinkUntil = init.startAt;
  let nextActionAt = init.startAt;
  let target: Placement | null = null;
  let planned = false;

  function act(now: number): void {
    const snap = game.snapshot();
    if (!snap.active) return;
    if (!planned) {
      if (now < thinkUntil) return;
      target = planPlacement(snap.grid, snap.active.type, cfg.mistakeRate, rand);
      planned = true;
    }
    if (now < nextActionAt) return;
    nextActionAt = now + cfg.actionIntervalMs;
    const step = target ? nextStep(snap.active, target) : 'drop';
    const ok = step === 'rotateCw' ? game.rotate(1)
      : step === 'rotateCcw' ? game.rotate(-1)
        : step === 'left' ? game.move(-1)
          : step === 'right' ? game.move(1) : false;
    if (step === 'drop' || !ok) game.hardDrop(); // 막히면 그 자리에 놓는다
  }

  function collect(now: number, out: BotOutput[]): void {
    for (const e of game.drainEvents() as Array<Record<string, any>>) {
      if (e.type === 'spawn') { planned = false; target = null; thinkUntil = now + cfg.thinkMs; nextActionAt = thinkUntil; }
      else if (e.type === 'clear') {
        seq += 1;
        const specials = (e.specials as Array<Record<string, unknown>>).map(({ kind, pieceIndex, armorId }) => (kind === 'armor' ? { kind, pieceIndex, armorId } : { kind, pieceIndex }));
        out.push({ type: 'clear', data: { seq, lines: e.lines, combo: e.combo, b2b: e.b2b, tspin: e.tspin, pieceCount: e.pieceCount, specials } });
      } else if (e.type === 'topout') {
        seq += 1;
        toppedOut = true;
        out.push({ type: 'topout', data: { seq, pieceCount: e.pieceCount } });
      }
    }
  }

  return {
    // FR-021 GameRoom이 ≤ 50ms 간격으로 호출 — 조작·중력 진행, state는 83ms(12Hz)마다 1건
    tick(now: number): BotOutput[] {
      const out: BotOutput[] = [];
      if (toppedOut || frozen || now < init.startAt) return out;
      try {
        if (!started) { started = true; lastTick = now; game.start(); }
        collect(now, out);
        if (!toppedOut) act(now);
        const dt = Math.max(0, now - lastTick);
        lastTick = now;
        if (!toppedOut) game.tick(dt);
        collect(now, out);
        if (!toppedOut && now >= nextStateAt) {
          nextStateAt += TIMING.STATE_INTERVAL_MS;
          if (nextStateAt <= now) nextStateAt = now + TIMING.STATE_INTERVAL_MS; // 크게 밀렸으면 몰아 보내지 않는다
          const s = game.snapshot();
          seq += 1;
          out.push({ type: 'state', data: { seq, board: encodeBoard(s.grid), active: s.active, score: s.score, garbageIn: s.garbageIn } });
        }
      } catch {
        throw new Error('bot-tick-failed'); // 내부 정보 미포함 — GameRoom이 BOT_FAILURE로 처리 (봉인 제1계명)
      }
      return out;
    },
    // FR-025·FR-029 받은 공격 — 쓰레기 대기 큐 + 보드형 영 효과(아바돈·악). 시야·조작형은 봇에 영향 없음
    receiveAttack(attack): void {
      if (toppedOut || !attack) return;
      game.queueGarbage(int(attack.garbage), int(attack.holeColumn));
      const def = attack.spiritId ? spiritsById.get(attack.spiritId) : undefined;
      if (!def) return;
      const params = { ...def.effect.params, ...(attack.params ?? {}) } as Record<string, unknown>;
      if (def.effect.kinds.includes('locustHoles')) {
        const columns = Array.isArray(params.columns) ? (params.columns as number[]) : [];
        game.applyBoardOp((g: string[][], m: unknown) => removeColumnTops(g, m, columns));
      }
      if (def.effect.kinds.includes('leadRow')) game.insertLeadRow(int(params.clearsToExpire));
    },
    // FR-014·FR-025·FR-039 봇 보드가 대상인 effect (다윗 물맷돌·상쇄·예수님)
    applyEffect(effect): void {
      if (toppedOut || !effect || !effect.action) return;
      const a = effect.action;
      if (a.type === 'destroyTopBlocks') game.applyBoardOp((g: string[][], m: unknown) => destroyTopBlocks(g, m, int(a.count)));
      else if (a.type === 'removeBottomGarbage' || a.type === 'removeGarbageRow') {
        game.applyBoardOp((g: string[][], m: unknown) => removeBottomGarbage(g, m, int(a.rows)));
      } else if (a.type === 'offset') game.reducePending(int(a.rows));
      else if (a.type === 'overcome') {
        if (a.clearCurses) game.removeLeadRows();
        game.applyBoardOp((g: string[][], m: unknown) => removeBottomGarbage(g, m, int(a.removeGarbageRows)));
      }
    },
    // FR-040 말씀 대결 정지
    freeze(now: number): void {
      if (frozen) return;
      frozen = true;
      frozenAt = now;
      game.setSoftDrop(false);
    },
    // FR-040 resumeAt 도달 — 정지한 시간만큼 예약 시각을 미룬다
    resume(now: number): void {
      if (!frozen) return;
      frozen = false;
      const pausedMs = Math.max(0, now - frozenAt);
      lastTick = now;
      thinkUntil += pausedMs;
      nextActionAt += pausedMs;
      nextStateAt = now;
    },
    get toppedOut(): boolean { return toppedOut; },
  };
}
