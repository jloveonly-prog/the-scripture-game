// TASK-064 · REQ-017 · FR-077 · NFR-002 · API-001 · API-005 · API-006 · API-204 · API-254 · SCR-001~006 — 브라우저 컨텍스트 2개 대전 E2E
// A가 테트리스(4줄)를 지우면 B에 쓰레기 4줄·악한 영이 오는지, B가 믿음의 방패·베드로·미가엘로 막는지, 공격 반영 지연(clear→attack ≤ 100ms)을 잰다.
// 줄 삭제는 키 조작으로 재현할 수 없으므로(블록 순서는 서버 시드) GameRoom 소켓을 page.routeWebSocket으로 중계하며 `clear` 프레임을 주입한다.
// 주입분만큼 이후 클라이언트 seq를 밀어(R-02 엄격 증가 유지), 갑주 칸은 devguide §7.3 C-SPECIAL을 같은 시드로 재계산해 실제 출현 칸만 주장한다(R-09).
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { deriveSeed, mulberry32 } from '../../client/js/engine/rng.js';
import { ARMOR_IDS } from '../../client/js/net/protocol.js';

const readJson = (name) => JSON.parse(readFileSync(new URL(`../../content/${name}`, import.meta.url), 'utf8'));
const balance = readJson('balance.json');
const spirits = readJson('spirits.json');
const NFR002_MAX_MS = 100;
const PIECE_GAP = 3; // clear 사이 고정 블록 수 — 콤보 0 유지(R-06), 칸 보존(R-04)
const MAX_PIECE_JUMP = 90; // R-05 최근 5초 pieceCount 증가 ≤ 100
const SPIRIT_SPACING_MS = 1700; // 같은 영 1.5초 재적용 금지(FR-030)보다 길게

const nickname = (tag) => `E2E${tag}${Date.now().toString(36).slice(-6)}`; // 2~12자 · 영문/숫자

/** GameRoom 소켓 중계 — 프레임 기록, 주입 후 seq 재번호, topout pieceCount 보정 */
async function tapRoom(page) {
  const tap = { inbound: [], lastSeq: 0, offset: 0, lastPieceCount: 0, lastWasTetris: false, toServer: null };
  await page.routeWebSocket(/\/ws\/room\//, (ws) => {
    const server = ws.connectToServer();
    tap.toServer = (frame) => server.send(JSON.stringify(frame));
    ws.onMessage((message) => {
      let text = String(message);
      try {
        const frame = JSON.parse(text);
        if (frame.data && Number.isInteger(frame.data.seq)) {
          frame.data.seq += tap.offset;
          tap.lastSeq = frame.data.seq;
          if (frame.type === 'topout') frame.data.pieceCount = Math.max(frame.data.pieceCount, tap.lastPieceCount);
          if (frame.type === 'clear') { tap.lastPieceCount = Math.max(tap.lastPieceCount, frame.data.pieceCount); tap.lastWasTetris = frame.data.lines === 4; }
          text = JSON.stringify(frame);
        }
      } catch { /* 텍스트 그대로 중계 */ }
      server.send(text);
    });
    server.onMessage((message) => {
      const text = String(message);
      try { tap.inbound.push({ at: Date.now(), frame: JSON.parse(text) }); } catch { /* 기록 생략 */ }
      ws.send(text);
    });
  });
  return tap;
}

/** clear 주입 → 송신 시각(ms) */
function injectClear(tap, { lines, specials = [], pieceCount }) {
  const b2b = lines === 4 && tap.lastWasTetris; // R-07: 직전 삭제가 테트리스일 때만
  const count = pieceCount ?? tap.lastPieceCount + PIECE_GAP;
  tap.offset += 1;
  tap.lastSeq += 1;
  tap.lastPieceCount = count;
  tap.lastWasTetris = lines === 4;
  const at = Date.now();
  tap.toServer({ type: 'clear', data: { seq: tap.lastSeq, lines, combo: 0, b2b, tspin: false, pieceCount: count, specials } });
  return at;
}

async function waitFrame(tap, since, predicate, timeout = 10000) {
  let found = null;
  await expect.poll(() => (found = tap.inbound.slice(since).find((e) => predicate(e.frame)) ?? null), { timeout }).not.toBeNull();
  return found;
}
const lastStatus = (tap) => [...tap.inbound].reverse().find((e) => e.frame.type === 'playerStatus')?.frame.data ?? null;

/** devguide §7.3 C-SPECIAL — 콤보 0·낮은 쌓임 기준으로 armorId 갑주 칸이 나오는 첫 순번 n(≥ minN) */
function findArmorPiece({ seed, mode, stage }, armorId, minN) {
  const sp = balance.specials;
  const rand = mulberry32(deriveSeed(seed, sp.seedXor));
  let nextWordAt = null;
  const gap = (u1) => sp.word.minGap + Math.floor(u1 * (sp.word.maxGap - sp.word.minGap + 1));
  for (let n = 0; n < 20000; n += 1) {
    const u1 = rand();
    rand(); // u2 (칸 번호) — 블록마다 항상 2회 소비
    if (mode !== 'practice' && stage >= 1) {
      if (nextWordAt === null) nextWordAt = n + gap(u1);
      if (n === nextWordAt) { nextWordAt = n + gap(u1); continue; }
    }
    const pJ = stage >= 2 ? Math.min(sp.jericho.base, sp.jericho.max) : 0;
    const pM = stage >= 2 ? sp.manna.lowChance : 0;
    const pA = mode !== 'practice' ? sp.armor.chance : 0;
    if (u1 >= pJ + pM && u1 < pJ + pM + pA && n >= minN && ARMOR_IDS[Math.floor(((u1 - pJ - pM) / pA) * 6)] === armorId) return n;
  }
  throw new Error('armor piece not found');
}

/** 1줄 삭제(공격력 0)로 믿음만 채운다 (+5/줄 — balance.faith.gainByLines) */
async function chargeFaith(tap, target) {
  for (let i = 0; i < 40 && (lastStatus(tap)?.faith ?? 0) < target; i += 1) {
    injectClear(tap, { lines: 1 });
    await new Promise((r) => setTimeout(r, 150));
  }
  await expect.poll(() => lastStatus(tap)?.faith ?? 0, { timeout: 5000 }).toBeGreaterThanOrEqual(target);
}

async function enter(page, name) {
  await page.goto('/');
  await page.getByLabel('닉네임').fill(name);
  await page.getByRole('button', { name: '입장하기' }).click();
  await expect(page.getByRole('heading', { name: '모드를 고르세요' })).toBeVisible();
}
async function pickHero(page, accessibleName) {
  await page.getByRole('radio', { name: accessibleName }).click();
  await page.getByRole('button', { name: '확정' }).click();
}

test('브라우저 2개 대전: 테트리스 공격·영 연출·방어 3종·지연 측정·결과 화면', async ({ browser }) => {
  test.setTimeout(240000);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const tapA = await tapRoom(pageA);
  const tapB = await tapRoom(pageB);
  let slotB = null;
  let start = null;

  await test.step('SCR-001~004: 입장 → 친구 초대 코드 → 짝 성사', async () => {
    await enter(pageA, nickname('A'));
    await enter(pageB, nickname('B'));
    await pageA.getByRole('button', { name: '방 만들기' }).click();
    await pickHero(pageA, '다윗 David');
    const display = pageA.locator('.code-display[aria-label^="초대 코드"]');
    await expect(display).toBeVisible();
    const code = (await display.getAttribute('aria-label')).replace('초대 코드', '').replace(/\s+/g, '');
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    await pageB.getByRole('button', { name: '코드로 입장' }).click();
    await pickHero(pageB, '베드로 Peter');
    await pageB.getByLabel('초대 코드 1번째 글자').fill(code);
    await pageB.getByRole('button', { name: '입장' }).click();
  });

  await test.step('SCR-005: 두 방 입장·라운드 시작', async () => {
    const joinedB = await waitFrame(tapB, 0, (f) => f.type === 'joined', 30000);
    slotB = joinedB.frame.data.slot;
    await waitFrame(tapA, 0, (f) => f.type === 'joined', 30000);
    start = (await waitFrame(tapB, 0, (f) => f.type === 'start', 60000)).frame.data;
    await waitFrame(tapA, 0, (f) => f.type === 'start', 10000);
    await pageA.waitForTimeout(start.countdown + 500); // 카운트다운(EVT-18) 종료
  });

  await test.step('FR-077·NFR-002: A 테트리스 → B 쓰레기 4줄 + 악한 영, 지연 ≤ 100ms', async () => {
    const since = tapB.inbound.length;
    const sentAt = injectClear(tapA, { lines: 4, pieceCount: 12 });
    const attack = await waitFrame(tapB, since, (f) => f.type === 'attack');
    const latency = attack.at - sentAt;
    test.info().annotations.push({ type: 'NFR-002 clear→attack ms', description: String(latency) });
    expect(latency).toBeLessThanOrEqual(NFR002_MAX_MS);
    expect(attack.frame.data.garbage).toBe(4);
    expect(attack.frame.data.spiritId).not.toBeNull();
    await expect(pageB.locator('.garbage-meter__num')).toHaveText('4', { timeout: 3000 }); // HUD-05
    const spirit = spirits.find((s) => s.id === attack.frame.data.spiritId);
    if (spirit?.effect?.durationMs > 0) await expect(pageB.locator('.spirit-chips .chip').first()).toContainText(spirit.nameKo); // HUD-10
  });

  await test.step('FR-037: B 믿음의 방패 — 갑주 칸 획득 → R 사용 → 다음 공격 완전 차단', async () => {
    const n = findArmorPiece({ seed: start.seed, mode: 'invite', stage: start.stage }, 'shield_of_faith', tapB.lastPieceCount + 1);
    while (n + 1 - tapB.lastPieceCount > MAX_PIECE_JUMP) {
      injectClear(tapB, { lines: 1, pieceCount: tapB.lastPieceCount + MAX_PIECE_JUMP });
      await pageB.waitForTimeout(5100);
    }
    injectClear(tapB, { lines: 1, pieceCount: Math.max(n + 1, tapB.lastPieceCount + PIECE_GAP), specials: [{ kind: 'armor', pieceIndex: n, armorId: 'shield_of_faith' }] });
    await expect.poll(() => lastStatus(tapB)?.armor ?? [], { timeout: 5000 }).toContain('shield_of_faith');
    await pageB.keyboard.press('r');
    await expect.poll(() => lastStatus(tapB)?.wards?.shield ?? false, { timeout: 5000 }).toBe(true);
    await pageB.waitForTimeout(SPIRIT_SPACING_MS);
    const since = tapB.inbound.length;
    injectClear(tapA, { lines: 4 });
    const attack = await waitFrame(tapB, since, (f) => f.type === 'attack');
    expect(attack.frame.data).toMatchObject({ garbage: 0, spiritId: null }); // EVT-24
  });

  await test.step('FR-035·FR-016: B 미가엘 장전 + 베드로 "이 반석 위에" → 쓰레기 0·용 상쇄', async () => {
    const angelSkill = 'angel_michael';
    await chargeFaith(tapB, 80);
    await expect.poll(() => lastStatus(tapB)?.cooldowns?.[angelSkill] ?? 0, { timeout: 5000 }).toBe(0);
    await pageB.keyboard.press('1');
    await expect.poll(() => lastStatus(tapB)?.wards?.michael ?? 0, { timeout: 5000 }).toBeGreaterThanOrEqual(1);
    await chargeFaith(tapB, 50);
    const sinceHero = tapB.inbound.length;
    await pageB.keyboard.press('a');
    await waitFrame(tapB, sinceHero, (f) => f.type === 'effect' && f.data.kind === 'hero' && f.data.bySlot === slotB);
    injectClear(tapA, { lines: 1 }); // B2B 사슬 끊기 → 다음 테트리스는 일반 테트리스
    await pageA.waitForTimeout(200);
    let since = tapB.inbound.length;
    injectClear(tapA, { lines: 4 });
    const first = await waitFrame(tapB, since, (f) => f.type === 'attack');
    expect(first.frame.data.garbage).toBe(0); // 베드로 10초 쓰레기 무효 (FR-016)
    for (let i = 0; i < 3 && (lastStatus(tapB)?.wards?.michael ?? 0) > 0; i += 1) { // B2B 테트리스 연속 → 용 (미가엘이 상쇄)
      await pageA.waitForTimeout(SPIRIT_SPACING_MS);
      since = tapB.inbound.length;
      injectClear(tapA, { lines: 4 });
      const attack = await waitFrame(tapB, since, (f) => f.type === 'attack');
      expect(['dragon', 'angel_of_light']).not.toContain(attack.frame.data.spiritId);
      expect(attack.frame.data.garbage).toBe(0);
    }
    await expect.poll(() => lastStatus(tapB)?.wards?.michael ?? 0, { timeout: 5000 }).toBe(0);
  });

  await test.step('SCR-006: B Top-out 2라운드 → A 승리·B 패배 결과 화면', async () => {
    for (let round = 0; round < 2; round += 1) {
      const since = tapB.inbound.length;
      for (let i = 0; i < 120 && !tapB.inbound.slice(since).some((e) => e.frame.type === 'roundEnd'); i += 1) {
        await pageB.keyboard.press('Space');
        await pageB.waitForTimeout(120);
      }
      await waitFrame(tapB, since, (f) => f.type === 'roundEnd', 15000);
      if (round === 0) {
        const next = await waitFrame(tapB, since, (f) => f.type === 'start', 20000);
        tapB.lastWasTetris = false;
        await pageB.waitForTimeout(next.frame.data.countdown + 500);
      }
    }
    await waitFrame(tapB, 0, (f) => f.type === 'matchEnd', 20000);
    await expect(pageA.getByRole('heading', { name: '승리' })).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByRole('heading', { name: '패배' })).toBeVisible({ timeout: 15000 });
    await expect(pageA.getByRole('button', { name: '로비로' })).toBeVisible();
  });

  await ctxA.close();
  await ctxB.close();
});
