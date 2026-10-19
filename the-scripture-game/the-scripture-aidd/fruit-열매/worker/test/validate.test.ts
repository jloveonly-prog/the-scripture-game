// validate.test.ts — 잘못된 메시지·토큰 없는 join/ready 거부 단위 테스트만 (D-16, NFR-003)
// TASK-030 | REQ-001 REQ-007 FR-008 FR-032 NFR-003 | ARCH-015 | API-007 API-011~API-018 API-031 | TBL-018 `rateLimit`
import { describe, expect, it } from "vitest";
import { rules } from "../src/content";
import { errorEnvelope, rejectData, WS_ERRORS } from "../src/protocol/messages";
import { SocketRateLimiter, TokenBucket } from "../src/protocol/rate-limit";
import {
  parseEnvelope, validateAnswer, validateArmor, validateClear, validateJoin, validateReaction, validateReady,
  validateSkill, validateState, validateTopout,
} from "../src/protocol/validate";

const TOKEN = "q8ZJ0v3Yb7rT1mXo2LkP9sW4nE6hD5cA0uGfR8yIzQw";
const TICKET = "Xr4mT9pL2vQ8cN1sB6hZ0kWy";
const BOARD = "0".repeat(200);
const code = (r: { ok: boolean; code?: string }) => (r.ok ? "OK" : r.code);

describe("봉투 파싱 (D-20, api-gate §2 메시지 크기)", () => {
  it("정상 봉투는 type·data를 돌려준다", () => {
    const r = parseEnvelope(JSON.stringify({ type: "cancel", data: {} }), rules);
    expect(r).toEqual({ ok: true, value: { type: "cancel", data: {} } });
  });
  it("바이너리·JSON 아님·type 없음·data 객체 아님·4,096바이트 초과는 BAD_MESSAGE", () => {
    expect(code(parseEnvelope(new ArrayBuffer(4), rules))).toBe("BAD_MESSAGE");
    expect(code(parseEnvelope("{not json", rules))).toBe("BAD_MESSAGE");
    expect(code(parseEnvelope(JSON.stringify({ data: {} }), rules))).toBe("BAD_MESSAGE");
    expect(code(parseEnvelope(JSON.stringify({ type: "join", data: [1] }), rules))).toBe("BAD_MESSAGE");
    expect(code(parseEnvelope(JSON.stringify({ type: "join" }), rules))).toBe("BAD_MESSAGE");
    const big = JSON.stringify({ type: "state", data: { pad: "가".repeat(1400) } });
    expect(big.length).toBeLessThan(rules.rateLimit.maxMessageBytes);
    expect(code(parseEnvelope(big, rules))).toBe("BAD_MESSAGE");
  });
});

describe("API-007 join 거부 (NFR-003 토큰 없는 join)", () => {
  const base = { token: TOKEN, heroId: "david", mode: "random" };
  it("토큰 없음·형식 오류는 UNAUTHORIZED", () => {
    expect(code(validateJoin({ heroId: "david", mode: "random" }, rules))).toBe("UNAUTHORIZED");
    expect(code(validateJoin({ ...base, token: "short" }, rules))).toBe("UNAUTHORIZED");
    expect(code(validateJoin({ ...base, token: 42 }, rules))).toBe("UNAUTHORIZED");
  });
  it("위인 4명 밖은 HERO_INVALID, 타입 위반은 BAD_MESSAGE", () => {
    expect(code(validateJoin({ ...base, heroId: "moses" }, rules))).toBe("HERO_INVALID");
    expect(code(validateJoin({ ...base, heroId: 1 }, rules))).toBe("BAD_MESSAGE");
  });
  it("mode·botLevel·roomCode 조합 위반은 MODE_INVALID", () => {
    expect(code(validateJoin({ ...base, mode: "ranked" }, rules))).toBe("MODE_INVALID");
    expect(code(validateJoin({ ...base, mode: "bot" }, rules))).toBe("MODE_INVALID");
    expect(code(validateJoin({ ...base, mode: "bot", botLevel: "insane" }, rules))).toBe("MODE_INVALID");
    expect(code(validateJoin({ ...base, botLevel: "easy" }, rules))).toBe("MODE_INVALID");
    expect(code(validateJoin({ ...base, roomCode: "K7QM2X" }, rules))).toBe("MODE_INVALID");
  });
  it("형식이 틀린 초대 코드는 INVITE_NOT_FOUND, 소문자는 대문자로 비교", () => {
    expect(code(validateJoin({ ...base, mode: "invite", roomCode: "K7QM2" }, rules))).toBe("INVITE_NOT_FOUND");
    expect(code(validateJoin({ ...base, mode: "invite", roomCode: "K7QM2O" }, rules))).toBe("INVITE_NOT_FOUND");
    const r = validateJoin({ ...base, mode: "invite", roomCode: "k7qm2x" }, rules);
    expect(r.ok && r.value.roomCode).toBe("K7QM2X");
  });
  it("정상 join (추가 필드 무시)", () => {
    const r = validateJoin({ ...base, mode: "bot", botLevel: "hard", extra: "ignored" }, rules);
    expect(r).toEqual({ ok: true, value: { token: TOKEN, heroId: "david", mode: "bot", roomCode: null,
      botLevel: "hard" } });
  });
});

describe("API-011 ready 거부 (NFR-003 토큰 없는 ready)", () => {
  it("토큰 없음 UNAUTHORIZED, 티켓 형식 오류 TICKET_INVALID, 정상 통과", () => {
    expect(code(validateReady({ ticket: TICKET }))).toBe("UNAUTHORIZED");
    expect(code(validateReady({ token: TOKEN }))).toBe("TICKET_INVALID");
    expect(code(validateReady({ token: TOKEN, ticket: "x".repeat(23) }))).toBe("TICKET_INVALID");
    expect(code(validateReady({ token: TOKEN, ticket: TICKET }))).toBe("OK");
  });
});

describe("API-012 state 스키마", () => {
  const ok = { seq: 1, board: BOARD, active: { type: "T", x: 4, y: 0, rot: 0 }, hold: null, score: 0, combo: -1,
    pieceCount: 0 };
  it("정상 스냅샷 통과", () => expect(code(validateState(ok, rules))).toBe("OK"));
  it("보드 길이·문자, active 범위, hold, combo −2, 음수 점수는 거부", () => {
    for (const bad of [
      { board: "0".repeat(199) }, { board: `${"0".repeat(199)}x` }, { active: { type: "X", x: 0, y: 0, rot: 0 } },
      { active: { type: "T", x: 12, y: 0, rot: 0 } }, { active: { type: "T", x: 0, y: 0, rot: 4 } }, { hold: "Q" },
      { combo: -2 }, { score: -1 }, { seq: 1.5 }, { pieceCount: "3" },
    ]) expect(code(validateState({ ...ok, ...bad }, rules))).toBe("BAD_MESSAGE");
  });
});

describe("API-013 clear 스키마", () => {
  const ok = { seq: 2, lines: 4, combo: 0, b2b: false, tspin: false, pieceCount: 10,
    specials: [{ kind: "armor", pieceIndex: 3, armorId: "shield_of_faith" }] };
  it("정상 통과", () => expect(code(validateClear(ok))).toBe("OK"));
  it("lines 0·5, combo −1, b2b 비Boolean, specials 5개·종류 위반·pieceIndex 0은 BAD_MESSAGE", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ kind: "jericho", pieceIndex: i + 1 }));
    for (const bad of [
      { lines: 0 }, { lines: 5 }, { combo: -1 }, { b2b: "yes" }, { specials: five }, { specials: "word" },
      { specials: [{ kind: "gold", pieceIndex: 1 }] }, { specials: [{ kind: "word", pieceIndex: 0 }] },
    ]) expect(code(validateClear({ ...ok, ...bad }))).toBe("BAD_MESSAGE");
  });
});

describe("API-014~API-018 스키마", () => {
  it("skill: kind hero·angel만", () => {
    expect(code(validateSkill({ kind: "hero", skillId: "sling_stone" }))).toBe("OK");
    expect(code(validateSkill({ kind: "jesus", skillId: "overcome_the_world" }))).toBe("BAD_MESSAGE");
    expect(code(validateSkill({ kind: "angel" }))).toBe("BAD_MESSAGE");
  });
  it("armor·answer: 필수·범위", () => {
    expect(code(validateArmor({}))).toBe("BAD_MESSAGE");
    expect(code(validateAnswer({ quizId: "Q017", choice: 4 }))).toBe("BAD_MESSAGE");
    expect(code(validateAnswer({ quizId: "Q017", choice: 3 }))).toBe("OK");
  });
  it("reaction: 정의된 3종만 (C-009 자유 텍스트 없음) → REACTION_INVALID", () => {
    expect(code(validateReaction({ reactionId: "amen" }, rules))).toBe("OK");
    expect(code(validateReaction({ reactionId: "hello world" }, rules))).toBe("REACTION_INVALID");
  });
  it("topout: voluntary Boolean 필수", () => {
    expect(code(validateTopout({ seq: 3, pieceCount: 9, voluntary: false }))).toBe("OK");
    expect(code(validateTopout({ seq: 3, pieceCount: 9 }))).toBe("BAD_MESSAGE");
  });
});

describe("속도 제한 (api-gate §2, TBL-018 rateLimit — DCL-002)", () => {
  it("state 초당 20개, 21번째 거부 후 1초 뒤 회복", () => {
    const limiter = new SocketRateLimiter(rules, 0);
    for (let i = 0; i < rules.rateLimit.state.tokens; i += 1) expect(limiter.check("state", 0).allowed).toBe(true);
    const over = limiter.check("state", 0);
    expect(over.allowed).toBe(false);
    expect(over.allowed === false && over.fatal).toBe(false);
    expect(limiter.check("state", rules.rateLimit.state.perMs).allowed).toBe(true);
  });
  it("reaction 2초에 1회 — retryInMs는 다음 토큰까지 남은 ms", () => {
    const limiter = new SocketRateLimiter(rules, 0);
    expect(limiter.check("reaction", 0).allowed).toBe(true);
    const r = limiter.check("reaction", 500);
    expect(r.allowed === false && r.retryInMs).toBe(1500);
  });
  it("전체 한도를 totalViolationMs 동안 연속 초과하면 fatal (error RATE_LIMITED 4429)", () => {
    const limiter = new SocketRateLimiter(rules, 0);
    for (let i = 0; i < rules.rateLimit.total.tokens; i += 1) limiter.check(null, 0);
    const first = limiter.check(null, 0);
    expect(first.allowed === false && first.fatal).toBe(false);
    // 같은 시각에 계속 보내면 토큰이 보충되지 않는다 — 3초 동안 매 순간 초과
    let t = 0;
    let last = first;
    while (t < rules.rateLimit.totalViolationMs) {
      t += 10;
      for (let k = 0; k < 2; k += 1) last = limiter.check(null, t);
    }
    expect(last.allowed === false && last.fatal).toBe(true);
    expect(WS_ERRORS.RATE_LIMITED.close).toBe(4429);
  });
  it("초과가 한 주기(1초) 넘게 끊기면 연속 초과가 새로 시작된다 — 짧은 폭주는 종료하지 않음", () => {
    const limiter = new SocketRateLimiter(rules, 0);
    for (let i = 0; i <= rules.rateLimit.total.tokens; i += 1) limiter.check(null, 0);
    // 2.5초 쉬고 다시 폭주 → 새 초과는 지금부터 셈
    const t = 2500;
    for (let i = 0; i <= rules.rateLimit.total.tokens; i += 1) limiter.check(null, t);
    const r = limiter.check(null, rules.rateLimit.totalViolationMs + 1);
    expect(r.allowed === false && r.fatal).toBe(false);
  });
  it("게스트 생성 버킷 5회/60초 (TokenBucket)", () => {
    const bucket = new TokenBucket(rules.rateLimit.guestCreate, 0);
    for (let i = 0; i < rules.rateLimit.guestCreate.tokens; i += 1) expect(bucket.take(0).ok).toBe(true);
    expect(bucket.take(0).ok).toBe(false);
    expect(bucket.take(rules.rateLimit.guestCreate.perMs / rules.rateLimit.guestCreate.tokens).ok).toBe(true);
  });
});

describe("봉투 생성 (api-gate §4.2·§4.3)", () => {
  it("error 봉투는 {type:'error', error:{code, message}}", () => {
    expect(JSON.parse(errorEnvelope("UNAUTHORIZED"))).toEqual({ type: "error",
      error: { code: "UNAUTHORIZED", message: "입장 정보가 올바르지 않습니다." } });
    expect(WS_ERRORS.UNAUTHORIZED.close).toBe(4001);
    expect(WS_ERRORS.TICKET_INVALID.close).toBe(4003);
  });
  it("reject 데이터는 action·code·message·retryInMs", () => {
    expect(rejectData("clear", "CLEAR_REJECTED")).toEqual({ action: "clear", code: "CLEAR_REJECTED",
      message: "진행 기록이 올바르지 않아 공격이 취소되었습니다.", retryInMs: null });
  });
});
