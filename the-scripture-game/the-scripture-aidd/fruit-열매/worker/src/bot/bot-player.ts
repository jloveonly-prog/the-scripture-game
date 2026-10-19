// bot-player.ts — 봇 행동 루프(moveInterval·mistakeRate)·줄 삭제 결과 보고·퀴즈 응답 시각 생성만
// TASK-019 | REQ-005 FR-021 FR-022 | ARCH-013 | D-10 | API-013(같은 판정 경로) API-020 API-021 API-022 API-023 | TBL-018
// `bot`
// architecture §9.4: 봇은 GameRoom 메모리에서 엔진 인스턴스를 구동하고, 봇의 줄 삭제는 사람의 `clear`와 같은 판정 경로를 탄다.
// OQ #6: 봇은 블록을 놓고 말씀 대결에 답하기만 한다 (스킬·천사·갑주 미사용). 시각·무작위는 주입받는다.
import { Engine } from "../../../client/js/engine/index.js";
import type { QuizItem, Rules } from "../content";
import type { BotLevel, HeroId, Slot } from "../storage/adapter";
import { choosePlacement, type Placement } from "./placement";

/** 봇의 줄 삭제 1회 — API-013 `clear`와 같은 모양 (handlers가 사람과 같은 경로로 판정) */
export interface BotClear {
  seq: number;
  lines: number;
  combo: number;
  b2b: boolean;
  tspin: boolean;
  pieceCount: number;
  specials: Array<{ kind: string; pieceIndex: number; armorId?: string }>;
}

export interface BotStepResult {
  clears: BotClear[];
  /** Top-out — 라운드 패배 (API-018과 같은 처리) */
  topout: boolean;
}

/** API-019 stage */
interface Stage {
  word: boolean;
  jericho: boolean;
  manna: boolean;
}

export class BotPlayer {
  private engine: Engine | null = null;
  private plan: Placement | null = null;
  private planFor = 0;
  private lastTickAt = 0;
  private nextActionAt = 0;
  private seq = 0;
  private leadQueue: Array<{ rows: number; linesToClear: number }> = [];
  private readonly level: Rules["bot"][BotLevel];

  /**
   * @param armorIds armor.json id 순서 (엔진 특수 칸 배정 — 사람 엔진과 같은 목록)
   * @param random [0,1) 서버 무작위
   */
  constructor(
    readonly slot: Slot, readonly levelId: BotLevel, readonly heroId: HeroId, private readonly rules: Rules,
    private readonly armorIds: readonly string[], private readonly random: () => number,
  ) {
    this.level = rules.bot[levelId];
  }

  /** 라운드 시작 (API-019와 같은 seed·stage — 같은 블록 순서, FR-005). 첫 행동은 카운트다운 뒤 */
  startRound(seed: number, stage: Stage, now: number, matchElapsedMs: number): void {
    this.engine = new Engine({
      rules: this.rules, seed, stage, versus: true, armorIds: this.armorIds, matchElapsedMs,
      previewCount: this.heroId === "solomon" ? this.rules.board.previewSolomon : this.rules.board.preview,
    });
    this.engine.start();
    this.plan = null;
    this.planFor = 0;
    this.leadQueue = [];
    this.lastTickAt = now + this.rules.match.countdownMs;
    this.nextActionAt = this.lastTickAt + this.level.moveIntervalMs;
  }

  /**
   * 봇 틱 (GameRoom이 진행 중일 때만 호출 — 말씀 대결 정지 중에는 부르지 않는다).
   * moveIntervalMs마다 행동 1개(회전 → 좌우 이동 → 하드 드롭) — 조작 속도로 난이도 구분 (FR-021).
   */
  step(now: number): BotStepResult {
    const result: BotStepResult = { clears: [], topout: false };
    const engine = this.engine;
    if (!engine || engine.topOut || now < this.lastTickAt) return result;
    const events = [...engine.tick(now - this.lastTickAt)];
    this.lastTickAt = now;
    if (now >= this.nextActionAt) {
      events.push(...this.act(engine));
      this.nextActionAt = now + this.level.moveIntervalMs;
    }
    for (const e of events) {
      if (e.type === "clear") {
        const c = e as unknown as BotClear;
        this.seq += 1;
        result.clears.push({
          seq: this.seq, lines: c.lines, combo: c.combo, b2b: c.b2b, tspin: c.tspin, pieceCount: c.pieceCount,
          specials: c.specials.map((s) => ({ kind: s.kind, pieceIndex: s.pieceIndex, ...(s.armorId
            ? { armorId: s.armorId } : {}) })),
        });
      }
    }
    result.topout = engine.topOut;
    return result;
  }

  /** 말씀 대결 정지 후 재개 (FR-041) — 정지 시간 동안 낙하·행동이 쌓이지 않게 시계를 맞춘다 */
  resume(now: number): void {
    this.lastTickAt = now;
    this.nextActionAt = now + this.level.moveIntervalMs;
  }

  /** 계획한 착지점으로 한 걸음 */
  private act(engine: Engine): Array<{ type: string }> {
    const active = engine.active;
    if (!active) return [];
    if (this.planFor !== engine.drawCount || !this.plan) {
      // FR-021 착지 판단 품질 = evalNoise·mistakeRate (rules.bot)
      this.plan = choosePlacement(engine.board, active.type, this.level, this.random);
      this.planFor = engine.drawCount;
    }
    const plan = this.plan;
    if (!plan) return engine.input("hardDrop");
    if (active.rot !== plan.rot) return engine.input((plan.rot - active.rot + 4) % 4 === 3 ? "rotateCCW" : "rotateCW");
    if (active.x !== plan.x) {
      const moved = engine.input(plan.x < active.x ? "left" : "right");
      if (moved.length > 0) return moved;
    }
    return engine.input("hardDrop");
  }

  /** API-020 `opponentState`용 스냅샷 (board = CODE-009 200자, pending은 GameRoom이 채운다) */
  snapshot(): {
    slot: Slot; seq: number; board: string; active: unknown; hold: string | null; score: number; combo: number;
  } | null {
    if (!this.engine) return null;
    const s = this.engine.snapshot();
    return { slot: this.slot, seq: this.seq, board: s.cells.join(""), active: s.active, hold: s.hold, score: s.score,
      combo: s.combo };
  }

  /** API-012 위기 판정용 보드 문자열 (예수님 이벤트 조건) */
  boardString(): string {
    return this.engine ? this.engine.snapshot().cells.join("") : "";
  }

  /** API-021 봇이 받는 쪽: 보드 상태형 영 효과 (아바돈 구멍 즉시, 악 납 블록은 다음 상승과 함께 — apply-attack.js와 같은 규칙) */
  onAttack(data: { target: number; spiritId: string | null; spiritApplied: boolean; params: Record<string,
    number | string> }): void {
    if (!this.engine || data.target !== this.slot || !data.spiritApplied) return;
    if (data.spiritId === "abaddon") this.engine.punchHoles(Number(data.params.holes), Number(data.params.seed));
    if (data.spiritId === "wickedness") this.leadQueue.push({ rows: Number(data.params.rows),
      linesToClear: Number(data.params.linesToClear) });
  }

  /** API-022 쓰레기 상승 (위로 밀려 나가면 엔진 Top-out → 다음 step에서 보고) */
  onGarbage(data: { target: number; rows: number; holeColumn: number }): void {
    if (!this.engine || data.target !== this.slot) return;
    this.engine.applyGarbage(data.rows, data.holeColumn);
    for (const lead of this.leadQueue.splice(0)) this.engine.addLeadRows(lead.rows, lead.linesToClear);
    this.plan = null;
  }

  /** API-023 봇 보드가 대상인 효과: 다윗 물맷돌(상대 = 봇), 예수님 이벤트(봇에게 일어난 경우 쓰레기 절반·납 제거) */
  onEffect(data: { source: string; id: string; target: number | null; params: Record<string, unknown> }): void {
    if (!this.engine || data.target !== this.slot) return;
    if (data.source === "hero" && data.id === "sling_stone") this.engine.removeTopBlocks(Number(data.params.blocks));
    if (data.source === "jesus") {
      if (this.engine.leadLinesLeft > 0) this.engine.removeLeadRows();
      this.leadQueue = [];
      const ratio = Number(data.params.garbageRemoveRatio ?? 0);
      this.engine.removeGarbageRows(Math.floor(this.engine.garbageRowCount() * ratio));
    }
    this.plan = null;
  }

  /**
   * FR-022 봇의 말씀 대결 응답: quizAccuracy 확률로 정답, 아니면 무작위 오답 / 지연 = quizDelayMs [최소, 최대] 균등.
   * 판정은 사람과 같은 도착 순서 규칙(quiz.ts answerQuiz).
   */
  planQuizAnswer(item: QuizItem): { slot: Slot; delayMs: number; choice: number } {
    const [min, max] = this.level.quizDelayMs;
    const delayMs = Math.round(min + (max - min) * this.random());
    let choice = item.answer;
    if (this.random() >= this.level.quizAccuracy) {
      const wrong = item.choices.map((_, i) => i).filter((i) => i !== item.answer);
      choice = wrong[Math.min(wrong.length - 1, Math.floor(this.random() * wrong.length))];
    }
    return { slot: this.slot, delayMs, choice };
  }
}
