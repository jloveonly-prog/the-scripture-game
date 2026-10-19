// TASK-064 · REQ-017 · FR-077 · NFR-002 · API-001 · API-005 · API-006 · API-204 · API-254 · SCR-001~008 — 브라우저 컨텍스트 2개 대전 E2E
// req.md A §7.1: A가 테트리스(4줄)를 지우면 B에 쓰레기 4줄·악한 영이 "즉시" 오는지, B가 믿음의 방패·미가엘·(위인 스킬)로 막는지,
// 공격 반영 지연(clear→attack ≤ 100ms, NFR-002 — 모든 표본), 경기 결과(전적)·랭킹(Elo) 저장·조회, 경기 중 콘솔 오류 0건을 확인한다.
// ※ req.md §7.1의 "다니엘"은 1차 출시 위인 4명(다윗·솔로몬·베드로·바울)에 없으므로 spec FR-077이 "베드로 스킬 등 방어 수단"으로 정했다 —
//   B는 베드로 "이 반석 위에"(쓰레기 무효)로 막는다 (testplan §2 범위 결정 D5-01).
import { test, expect } from '@playwright/test';
import {
  PIECE_GAP, collectConsoleErrors, enter, findSpecialPiece, injectClear, lastStatus, nickname, pickHero, readJson, step, tapRoom,
  topOut, waitFrame,
} from './helpers/room-tap.js';

const spirits = readJson('spirits.json');
// NFR-002 공격 반영 지연 — clear 송신(브라우저 A 소켓) → attack 수신(브라우저 B 소켓) 시각 차. 두 브라우저는 같은 PC 시계(Date.now)를 쓴다.
const NFR002_MAX_MS = 100;
const MAX_PIECE_JUMP = 90; // R-05 최근 5초 pieceCount 증가 ≤ 100
const SPIRIT_SPACING_MS = 1700; // 같은 영 1.5초 재적용 금지(FR-030)보다 길게
const ELO_INITIAL = 1000;

/** 1줄 삭제(공격력 0)로 믿음만 채운다 (+5/줄 — balance.faith.gainByLines) */
async function chargeFaith(tap, target) {
  for (let i = 0; i < 40 && (lastStatus(tap)?.faith ?? 0) < target; i += 1) {
    await injectClear(tap, { lines: 1 });
    await new Promise((r) => setTimeout(r, 250)); // 3블록/250ms = 5초 60블록 < R-05 상한 100 (150ms 간격은 상한에 닿아 거부됐다)
  }
  await expect.poll(() => lastStatus(tap)?.faith ?? 0, { timeout: 5000 }).toBeGreaterThanOrEqual(target);
}

test('브라우저 2개 대전: 테트리스 공격·영 연출·방어 3종·지연 측정·결과·전적·랭킹', async ({ browser }) => {
  test.setTimeout(240000);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const consoleErrors = collectConsoleErrors([['A', pageA], ['B', pageB]]);
  const tapA = await tapRoom(pageA);
  const tapB = await tapRoom(pageB);
  tapA.peer = tapB;
  tapB.peer = tapA;
  const nameA = nickname('A');
  const nameB = nickname('B');
  let slotB = null;
  let start = null;
  const latencies = [];

  await test.step('SCR-001~004: 입장 → 친구 초대 코드 → 짝 성사', async () => {
    await enter(pageA, nameA);
    await enter(pageB, nameB);
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

  await test.step('SCR-005: 두 방 입장·같은 시드로 라운드 시작', async () => {
    const joinedB = await waitFrame(tapB, 0, (f) => f.type === 'joined', 30000);
    slotB = joinedB.frame.data.slot;
    await waitFrame(tapA, 0, (f) => f.type === 'joined', 30000);
    start = (await waitFrame(tapB, 0, (f) => f.type === 'start', 60000)).frame.data;
    const startA = (await waitFrame(tapA, 0, (f) => f.type === 'start', 10000)).frame.data;
    expect(startA.seed).toBe(start.seed); // FR-005 같은 7-bag 시드
    await pageA.waitForTimeout(start.countdown + 500); // 카운트다운(EVT-18) 종료
  });

  await step('FR-077·NFR-002: A 테트리스 → B 쓰레기 4줄 + 악한 영', tapB, async () => {
    const since = tapB.inbound.length;
    const sentAt = await injectClear(tapA, { lines: 4, pieceCount: 12 });
    const attack = await waitFrame(tapB, since, (f) => f.type === 'attack');
    latencies.push(attack.at - sentAt);
    expect(attack.frame.data.garbage).toBe(4);
    expect(attack.frame.data.spiritId).not.toBeNull();
    await expect(pageB.locator('.garbage-meter__num')).toHaveText('4', { timeout: 3000 }); // HUD-05
    const spirit = spirits.find((s) => s.id === attack.frame.data.spiritId);
    if (spirit?.effect?.durationMs > 0) await expect(pageB.locator('.spirit-chips .chip').first()).toContainText(spirit.nameKo); // HUD-10
  });

  await step('FR-037: B 믿음의 방패 — 갑주 칸 획득 → R 사용 → 다음 공격 완전 차단', tapB, async () => {
    const { n } = findSpecialPiece({ seed: start.seed, mode: 'invite', stage: start.stage }, 'armor', tapB.lastPieceCount + 1, 'shield_of_faith');
    while (n + 1 - tapB.lastPieceCount > MAX_PIECE_JUMP) {
      await injectClear(tapB, { lines: 1, pieceCount: tapB.lastPieceCount + MAX_PIECE_JUMP });
      await pageB.waitForTimeout(5100);
    }
    await injectClear(tapB, { lines: 1, pieceCount: Math.max(n + 1, tapB.lastPieceCount + PIECE_GAP), specials: [{ kind: 'armor', pieceIndex: n, armorId: 'shield_of_faith' }] });
    await expect.poll(() => lastStatus(tapB)?.armor ?? [], { timeout: 5000 }).toContain('shield_of_faith');
    await pageB.keyboard.press('r');
    await expect.poll(() => lastStatus(tapB)?.wards?.shield ?? false, { timeout: 5000 }).toBe(true);
    await pageB.waitForTimeout(SPIRIT_SPACING_MS);
    const since = tapB.inbound.length;
    const sentAt = await injectClear(tapA, { lines: 4 });
    const attack = await waitFrame(tapB, since, (f) => f.type === 'attack');
    latencies.push(attack.at - sentAt);
    expect(attack.frame.data).toMatchObject({ garbage: 0, spiritId: null }); // EVT-24
  });

  // 입력 없는 보드는 중력만으로 약 1분 뒤 자연 Top-out한다 — 방어 시험을 두 라운드에 나눠 라운드 안에서 끝낸다 (광야: 라운드 중간 roundEnd로 시험이 끊기던 결함)
  await step('FR-007: B Top-out 1라운드 → A 1승 → 2라운드 시작', tapB, async () => {
    const since = tapB.inbound.length;
    const end = await topOut(tapB, pageB);
    expect(end.frame.data.winnerSlot).not.toBe(slotB);
    const next = await waitFrame(tapB, since, (f) => f.type === 'start' && f.data.round === 2, 20000);
    await pageB.waitForTimeout(next.frame.data.countdown + 500);
  });

  await step('FR-035·FR-016: B 미가엘 장전 + 베드로 "이 반석 위에" → 쓰레기 0·용 상쇄', tapB, async () => {
    const angelSkill = 'angel_michael';
    await chargeFaith(tapB, 80);
    await expect.poll(() => lastStatus(tapB)?.cooldowns?.[angelSkill] ?? 0, { timeout: 5000 }).toBe(0);
    await pageB.keyboard.press('1');
    await expect.poll(() => lastStatus(tapB)?.wards?.michael ?? 0, { timeout: 5000 }).toBeGreaterThanOrEqual(1);
    await chargeFaith(tapB, 50);
    const sinceHero = tapB.inbound.length;
    await pageB.keyboard.press('a');
    await waitFrame(tapB, sinceHero, (f) => f.type === 'effect' && f.data.kind === 'hero' && f.data.bySlot === slotB);
    await injectClear(tapA, { lines: 1 }); // B2B 사슬 끊기 → 다음 테트리스는 일반 테트리스
    await pageA.waitForTimeout(200);
    let since = tapB.inbound.length;
    const sentAt = await injectClear(tapA, { lines: 4 });
    const first = await waitFrame(tapB, since, (f) => f.type === 'attack');
    latencies.push(first.at - sentAt);
    expect(first.frame.data.garbage).toBe(0); // 베드로 10초 쓰레기 무효 (FR-016)
    for (let i = 0; i < 3 && (lastStatus(tapB)?.wards?.michael ?? 0) > 0; i += 1) { // B2B 테트리스 연속 → 용 (미가엘이 상쇄)
      await pageA.waitForTimeout(SPIRIT_SPACING_MS);
      since = tapB.inbound.length;
      const at = await injectClear(tapA, { lines: 4 });
      const attack = await waitFrame(tapB, since, (f) => f.type === 'attack');
      latencies.push(attack.at - at);
      expect(['dragon', 'angel_of_light']).not.toContain(attack.frame.data.spiritId);
      expect(attack.frame.data.garbage).toBe(0);
    }
    await expect.poll(() => lastStatus(tapB)?.wards?.michael ?? 0, { timeout: 5000 }).toBe(0);
  });

  await step('SCR-006 · FR-070: B Top-out 2라운드 → A 2선승·B 패배, 레이팅 변화 표시', tapB, async () => {
    await topOut(tapB, pageB);
    await waitFrame(tapB, 0, (f) => f.type === 'matchEnd', 20000);
    await expect(pageA.getByRole('heading', { name: '승리' })).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByRole('heading', { name: '패배' })).toBeVisible({ timeout: 15000 });
    await expect(pageA.locator('.rating-line')).toHaveText(/레이팅 \d+ \(\+\d+\)/); // FR-070 사람 대 사람 Elo
    await expect(pageB.locator('.rating-line')).toHaveText(/레이팅 \d+ \(−\d+\)/);
    await expect(pageA.getByRole('button', { name: '로비로' })).toBeVisible();
  });

  await step('SCR-007·008 · REQ-014·015: 저장된 전적·랭킹(Elo) 조회', tapA, async () => {
    await pageA.getByRole('button', { name: '로비로' }).click();
    await pageA.getByRole('button', { name: '전적' }).click();
    const row = pageA.locator('.records__table tbody tr').first();
    await expect(row).toContainText('승');
    await expect(row).toContainText(nameB);
    await expect(row).toContainText('2:0');
    await pageA.getByRole('button', { name: '← 로비' }).click();
    await pageA.getByRole('button', { name: '랭킹' }).click();
    const me = pageA.locator('.ranking__table tr.is-me, .my-rank').first();
    await expect(me).toContainText(nameA);
    const ratingText = (await me.textContent()) ?? '';
    const rating = Number(ratingText.trim().match(/(\d+)$/)?.[1]); // 표 행은 마지막 칸, 하단 고정 줄은 "· 1016"으로 끝난다
    expect(rating).toBeGreaterThan(ELO_INITIAL);
  });

  await test.step('NFR-002: 모든 clear→attack 표본 ≤ 100ms', async () => {
    const sorted = [...latencies].sort((x, y) => x - y);
    const summary = `n=${sorted.length} median=${sorted[Math.floor(sorted.length / 2)]} max=${sorted.at(-1)} all=${latencies.join(',')}`;
    test.info().annotations.push({ type: 'NFR-002 clear→attack ms', description: summary });
    console.log('[NFR-002 clear→attack ms]', summary);
    expect(sorted.length).toBeGreaterThanOrEqual(3);
    expect(sorted.at(-1)).toBeLessThanOrEqual(NFR002_MAX_MS);
  });

  await test.step('경기 중 콘솔 오류 0건 (CSP worker-src·Tone.js 포함)', async () => {
    // 서버가 일부러 거부한 시험 주입분(PROGRESS_REJECTED 등)은 오류 프레임이지 콘솔 오류가 아니다 — 콘솔은 0건이어야 한다.
    expect(consoleErrors).toEqual([]);
  });

  await ctxA.close();
  await ctxB.close();
});
