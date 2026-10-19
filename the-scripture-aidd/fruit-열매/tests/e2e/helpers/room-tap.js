// 광야(Phase 5) · REQ-017 · FR-077 · NFR-002 — E2E 공용 도구: 페이지 안 GameRoom 소켓 계측·clear 주입·프레임 대기·입장 흐름
// 줄 삭제는 키 조작으로 재현할 수 없으므로(블록 순서는 서버 시드) 페이지 안에서 GameRoom 소켓을 감싸(addInitScript) `clear` 프레임을 주입한다.
// 주입분만큼 이후 클라이언트 seq를 밀어(R-02 엄격 증가 유지), 특수 칸은 devguide §7.3 C-SPECIAL을 같은 시드로 재계산해 실제 출현 칸만 주장한다(R-09).
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { deriveSeed, mulberry32 } from '../../../client/js/engine/rng.js';
import { ARMOR_IDS } from '../../../client/js/net/protocol.js';

export const readJson = (name) => JSON.parse(readFileSync(new URL(`../../../content/${name}`, import.meta.url), 'utf8'));
export const balance = readJson('balance.json');

export const PIECE_GAP = 3; // clear 사이 최소 블록 수 — 콤보 0 유지(R-06: 연속 블록이 아니면 콤보 0)
const BOARD_COLS = 10;
const CELLS_PER_PIECE = 4;

export const nickname = (tag) => `E2E${tag}${Date.now().toString(36).slice(-6)}`; // 2~12자 · 영문/숫자

/**
 * 페이지 안 GameRoom 소켓 계측 (광야 BUG-002 — page.routeWebSocket은 프레임마다 브라우저↔드라이버↔테스트 프로세스 왕복을 더해
 * 실측 지연이 수백 ms로 부풀었다). WebSocket을 감싸 수신 프레임을 페이지 시각으로 기록하고, 주입분만큼 이후 클라이언트 seq를 밀며
 * (R-02 엄격 증가 유지), topout pieceCount를 보정한다. 소켓 연결 자체는 브라우저가 직접 한다 (Origin 검사 그대로).
 */
function installRoomTap() {
  const Native = window.WebSocket;
  const st = { offset: 0, lastSeq: 0, lastPieceCount: 0, lastWasTetris: false, socket: null };
  const push = (entry) => { try { window.__tapPush(entry); } catch { /* 노출 전 — 기록 생략 */ } };
  const mirror = () => push({ kind: 'state', lastPieceCount: st.lastPieceCount, lastWasTetris: st.lastWasTetris });
  class TappedWebSocket extends Native {
    constructor(url, protocols) {
      super(url, protocols);
      if (/\/ws\/room\//.test(String(url))) {
        st.socket = this;
        this.addEventListener('message', (event) => {
          const at = Date.now();
          try {
            const frame = JSON.parse(String(event.data));
            // 새 라운드: 서버 진행 장부(R-03~R-07)가 새로 시작하고 엔진 pieceCount도 0부터 다시 센다 (seq만 소켓 단위로 이어짐)
            if (frame.type === 'start') { st.lastPieceCount = 0; st.lastWasTetris = false; mirror(); }
            push({ kind: 'in', at, frame });
          } catch { /* 기록 생략 */ }
        });
      }
    }
    send(text) {
      if (this === st.socket && typeof text === 'string') {
        try {
          const frame = JSON.parse(text);
          if (frame.data && Number.isInteger(frame.data.seq)) {
            frame.data.seq += st.offset;
            st.lastSeq = frame.data.seq;
            if (frame.type === 'topout') frame.data.pieceCount = Math.max(frame.data.pieceCount, st.lastPieceCount);
            if (frame.type === 'clear') { st.lastPieceCount = Math.max(st.lastPieceCount, frame.data.pieceCount); st.lastWasTetris = frame.data.lines === 4; mirror(); }
            text = JSON.stringify(frame);
          }
        } catch { /* 텍스트 그대로 */ }
      }
      return super.send(text);
    }
  }
  window.WebSocket = TappedWebSocket;
  // clear 주입 → { at(송신 시각), lastPieceCount }
  window.__tapInject = ({ lines, specials, pieceCount, gap }) => {
    const b2b = lines === 4 && st.lastWasTetris; // R-07: 직전 삭제가 테트리스일 때만
    const count = pieceCount ?? st.lastPieceCount + gap;
    st.offset += 1;
    st.lastSeq += 1;
    st.lastPieceCount = count;
    st.lastWasTetris = lines === 4;
    const at = Date.now();
    Native.prototype.send.call(st.socket, JSON.stringify({ type: 'clear', data: { seq: st.lastSeq, lines, combo: 0, b2b, tspin: false, pieceCount: count, specials } }));
    mirror();
    return { at, lastPieceCount: count };
  };
  // 클라이언트 연출 검증용: 서버→클라이언트 프레임을 앱 소켓에 그대로 전달 (서버 판정은 거치지 않는다)
  window.__tapDeliver = (frame) => { st.socket?.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(frame) })); };
}

/** 페이지에 소켓 계측 설치 → tap { page, inbound[{at, frame}], lastPieceCount, lastWasTetris } */
export async function tapRoom(page) {
  const tap = { page, inbound: [], lastPieceCount: 0, lastWasTetris: false, peer: null };
  await page.exposeFunction('__tapPush', (entry) => {
    if (entry.kind === 'in') tap.inbound.push({ at: entry.at, frame: entry.frame });
    else { tap.lastPieceCount = entry.lastPieceCount; tap.lastWasTetris = entry.lastWasTetris; }
  });
  await page.addInitScript(installRoomTap);
  return tap;
}

/** clear 주입 → 송신 시각(ms, 페이지 시계) */
export async function injectClear(tap, { lines, specials = [], pieceCount }) {
  // R-04 칸 보존: 줄 1개 = 10칸 = 블록 2.5개 — 주입마다 그 줄 수만큼의 블록을 더 놓은 것으로 보고한다 (광야: 테트리스 연속 주입이 R-04에 걸리던 시험 결함)
  const gap = Math.max(PIECE_GAP, Math.ceil((lines * BOARD_COLS) / CELLS_PER_PIECE));
  const r = await tap.page.evaluate((args) => window.__tapInject(args), { lines, specials, pieceCount: pieceCount ?? null, gap });
  tap.lastPieceCount = r.lastPieceCount;
  tap.lastWasTetris = lines === 4;
  return r.at;
}

/** 실패 현장 보존: 마지막 수신 프레임과 서버 거부 사유 (법의학적 재구성) */
export function dumpScene(tap, title) {
  const label = (f) => {
    if (f.type === 'error') return `error:${f.error?.code}/${f.error?.ref}`;
    if (f.type === 'effect') return `effect:${f.data?.kind}/${f.data?.id}`;
    if (f.type === 'attack') return `attack:${f.data?.garbage}/${f.data?.spiritId}`;
    if (f.type === 'playerStatus') return `ps(f${f.data?.faith},p${f.data?.pendingGarbage})`;
    return f.type;
  };
  const tail = (t) => t.inbound.filter((e) => e.frame.type !== 'opponentState').slice(-16).map((e) => label(e.frame)).join(' ');
  const scene = `this=[${tail(tap)}] peer=[${tap.peer ? tail(tap.peer) : ''}]`;
  test.info().annotations.push({ type: title, description: scene });
  console.log(`[${title}]`, scene);
}

export async function waitFrame(tap, since, predicate, timeout = 10000) {
  let found = null;
  try {
    await expect.poll(() => (found = tap.inbound.slice(since).find((e) => predicate(e.frame)) ?? null), { timeout }).not.toBeNull();
  } catch (err) {
    dumpScene(tap, 'waitFrame 실패 현장');
    throw err;
  }
  return found;
}

export const lastStatus = (tap) => [...tap.inbound].reverse().find((e) => e.frame.type === 'playerStatus')?.frame.data ?? null;

/** 단계 실패 시 소켓 현장을 남긴다 */
export async function step(title, tap, body) {
  await test.step(title, async () => {
    try {
      await body();
    } catch (err) {
      dumpScene(tap, `${title} 실패 현장`);
      throw err;
    }
  });
}

/**
 * devguide §7.3 C-SPECIAL — 콤보 0·낮은 쌓임 기준으로 kind('word' | 'armor') 칸이 나오는 첫 순번 n(≥ minN).
 * armor면 armorId까지 같아야 한다. 반환 { n, armorId? }
 */
export function findSpecialPiece({ seed, mode, stage }, kind, minN, armorId = null) {
  const sp = balance.specials;
  const rand = mulberry32(deriveSeed(seed, sp.seedXor));
  let nextWordAt = null;
  const gap = (u1) => sp.word.minGap + Math.floor(u1 * (sp.word.maxGap - sp.word.minGap + 1));
  for (let n = 0; n < 20000; n += 1) {
    const u1 = rand();
    rand(); // u2 (칸 번호) — 블록마다 항상 2회 소비
    if (mode !== 'practice' && stage >= 1) {
      if (nextWordAt === null) nextWordAt = n + gap(u1);
      if (n === nextWordAt) {
        nextWordAt = n + gap(u1);
        if (kind === 'word' && n >= minN) return { n };
        continue;
      }
    }
    const pJ = stage >= 2 ? Math.min(sp.jericho.base, sp.jericho.max) : 0;
    const pM = stage >= 2 ? sp.manna.lowChance : 0;
    const pA = mode !== 'practice' ? sp.armor.chance : 0;
    if (kind === 'armor' && u1 >= pJ + pM && u1 < pJ + pM + pA && n >= minN) {
      const id = ARMOR_IDS[Math.floor(((u1 - pJ - pM) / pA) * 6)];
      if (id === armorId) return { n, armorId: id };
    }
  }
  throw new Error(`${kind} piece not found`);
}

/** 콘솔 오류 수집 (CSP 위반·Tone.js·앱 오류 — 경기 중 0건이어야 한다) */
export function collectConsoleErrors(pages) {
  const errors = [];
  for (const [tag, page] of pages) {
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag}: ${m.text()}`); });
    page.on('pageerror', (e) => {
      const text = `${tag}: pageerror ${e.message} @ ${(e.stack ?? '').split('\n').slice(1, 6).map((s) => s.trim()).join(' < ')}`;
      if (!errors.includes(text)) errors.push(text); // 같은 오류가 프레임마다 반복되면 1건으로 (현장 보존)
    });
  }
  return errors;
}

export async function enter(page, name) {
  await page.goto('/');
  await page.getByLabel('닉네임').fill(name);
  await page.getByRole('button', { name: '입장하기' }).click();
  await expect(page.getByRole('heading', { name: '모드를 고르세요' })).toBeVisible();
}

export async function pickHero(page, accessibleName) {
  await page.getByRole('radio', { name: accessibleName }).click();
  await page.getByRole('button', { name: '확정' }).click();
}

/** 하드 드롭 연타로 Top-out → roundEnd 수신 */
export async function topOut(tap, page) {
  const since = tap.inbound.length;
  for (let i = 0; i < 120 && !tap.inbound.slice(since).some((e) => e.frame.type === 'roundEnd'); i += 1) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
  }
  return waitFrame(tap, since, (f) => f.type === 'roundEnd', 15000);
}
