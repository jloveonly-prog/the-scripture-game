// 광야(Phase 5) · REQ-002~006 · REQ-011 · REQ-013 · FR-012·013·021~023·040~042·057·060·070 · SCR-001~009 — req.md "이번 실행 범위" 핵심 동사 E2E
// 게스트 입장 · 위인 4명 선택(예수님 없음) · 옵션(음량·연출 세기) · 연습 모드 · AI 봇 3단계 · 말씀 대결(KJV 4지선다) · EVT-43 봉인 칩 섬광.
import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors, enter, findSpecialPiece, injectClear, lastStatus, nickname, pickHero, readJson, step, tapRoom, topOut, waitFrame,
} from './helpers/room-tap.js';

const quiz = readJson('quiz.json');
const heroes = readJson('heroes.json');
const HERO_NAMES = ['다윗 David', '솔로몬 Solomon', '베드로 Peter', '바울 Paul'];

/** 봇 대전 시작 (로비 → 난이도 → 위인 → VS → 대전) → start 프레임 */
async function startBotMatch(page, tap, level, heroName) {
  await page.getByLabel(level).check();
  await page.getByRole('button', { name: '시작' }).nth(1).click(); // 모드 카드 순서: 대전 · (친구) · 봇 · 연습 — 봇 카드의 [시작]
  await pickHero(page, heroName);
  const since = tap.inbound.length;
  const start = await waitFrame(tap, since, (f) => f.type === 'start', 30000);
  return start.frame.data;
}

/** 대전 화면에서 결과 화면까지 (2라운드 연속 Top-out) */
async function loseMatch(page, tap, rounds = 2) {
  const matchSince = tap.inbound.length;
  for (let round = 0; round < rounds; round += 1) {
    const since = tap.inbound.length;
    await topOut(tap, page);
    if (round < rounds - 1) {
      const next = await waitFrame(tap, since, (f) => f.type === 'start', 20000);
      await page.waitForTimeout(next.frame.data.countdown + 300);
    }
  }
  await waitFrame(tap, matchSince, (f) => f.type === 'matchEnd', 20000);
  await expect(page.getByRole('heading', { name: '패배' })).toBeVisible({ timeout: 15000 });
}

test('SCR-001·002·003·009: 게스트 입장 → 위인 4명(예수님 없음) → 옵션 음량·연출 세기', async ({ page }) => {
  const errors = collectConsoleErrors([['P', page]]);
  const name = nickname('G');
  const external = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol !== 'data:' && u.protocol !== 'blob:') external.push(r.url()); });

  await test.step('FR-012 UC-001 E1 · 봉인 제5계명: 저장 고지 → 잘못된 닉네임 거부 → 올바른 닉네임 입장', async () => {
    await page.goto('/');
    await expect(page.getByText('ⓘ 닉네임과 경기 기록이 이 게임 서버에 저장됩니다.')).toBeVisible();
    await page.getByLabel('닉네임').fill('a'); // 2자 미만
    await page.getByRole('button', { name: '입장하기' }).click();
    await expect(page.locator('#nickname-error')).not.toHaveText('');
    await page.getByLabel('닉네임').fill(name);
    await page.getByRole('button', { name: '입장하기' }).click();
    await expect(page.getByRole('heading', { name: '모드를 고르세요' })).toBeVisible();
    await expect(page.locator('.profile-badge')).toContainText(`${name} · 1000`);
  });

  await test.step('FR-013 · C-002: 위인 카드는 정확히 4명, 예수님은 선택지에 없음, 상세에 스킬·KJV 근거', async () => {
    await page.getByRole('button', { name: '시작' }).last().click(); // 연습
    const cards = page.getByRole('radio');
    await expect(cards).toHaveCount(4);
    for (const label of HERO_NAMES) await expect(page.getByRole('radio', { name: label })).toBeVisible();
    await expect(page.getByText(/예수|Jesus/)).toHaveCount(0);
    expect(heroes.map((h) => h.id).sort()).toEqual(['david', 'paul', 'peter', 'solomon']);
    await page.getByRole('radio', { name: '솔로몬 Solomon' }).click();
    await expect(page.locator('.hero-detail')).toContainText('지혜로운 마음');
    await expect(page.locator('.hero-detail .verse__ref')).toContainText('1 Kings 3:9');
    await page.getByRole('button', { name: '← 뒤로' }).click();
  });

  await test.step('FR-057·FR-060 UC-020: 옵션 — 흔들림 끄기·섬광 최소·마스터 음량·음소거가 실제 모듈 상태에 반영', async () => {
    await page.mouse.click(5, 5); // 오디오 해제 (D-24 첫 입력)
    await page.getByRole('button', { name: '옵션' }).click();
    await expect(page.getByRole('heading', { name: '옵션' })).toBeVisible();
    const shake = page.getByRole('switch', { name: '화면 흔들림' });
    await shake.click();
    await expect(shake).toHaveAttribute('aria-checked', 'false');
    await page.getByRole('radio', { name: '최소' }).click();
    await expect(page.getByRole('radio', { name: '최소' })).toHaveAttribute('aria-checked', 'true');
    const master = page.getByLabel('마스터 음량');
    await master.focus();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowLeft'); // 80 → 60
    await expect(page.locator('output[for="volume-master"]')).toHaveText('60');
    await page.getByRole('switch', { name: '음소거' }).click();
    const state = await page.evaluate(async () => {
      const fx = await import('/js/fx/fx-intensity.js');
      const audio = await import('/js/audio/audio-engine.js');
      return { intensity: fx.getIntensity(), volumes: audio.getVolumes() };
    });
    expect(state.intensity).toMatchObject({ shakeEnabled: false, flashLevel: 'minimal', shake: 0, flash: 0.2 });
    expect(state.volumes).toMatchObject({ master: 60, muted: true });
    await expect(page.getByText('설정은 이번 접속 동안만 유지됩니다.')).toBeVisible();
  });
  // NFR-005 · 봉인 제6계명: 폰트·그래픽·사운드·API 전부 로컬 — 외부 출처 요청 0건
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('SCR-005 · REQ-006 · FR-023: 연습 모드 — 상대 없음·천사/갑주 숨김·위인 스킬·그만하기 → 연습 종료', async ({ page }) => {
  const errors = collectConsoleErrors([['P', page]]);
  const tap = await tapRoom(page);
  await enter(page, nickname('P'));
  await page.getByRole('button', { name: '시작' }).last().click();
  await pickHero(page, '바울 Paul');
  await step('연습 시작 (상대 없음)', tap, async () => {
    const joined = await waitFrame(tap, 0, (f) => f.type === 'joined', 30000);
    expect(joined.frame.data.mode).toBe('practice');
    expect(joined.frame.data.players).toHaveLength(1);
    const start = await waitFrame(tap, 0, (f) => f.type === 'start', 30000);
    await page.waitForTimeout(start.frame.data.countdown + 300);
    await expect(page.locator('.keycap--angel').first()).toBeHidden();
    await expect(page.locator('.armor-slots')).toBeHidden();
    await expect(page.locator('.keycap--hero')).toBeVisible();
  });
  await step('FR-034 위인 스킬 익히기: 줄 삭제로 믿음 충전 → A 키 → 바울 "옥문이 열리다"', tap, async () => {
    const cost = heroes.find((h) => h.id === 'paul').skill.cost;
    for (let i = 0; i < 20 && (lastStatus(tap)?.faith ?? 0) < cost; i += 1) {
      await injectClear(tap, { lines: 1 });
      await page.waitForTimeout(250);
    }
    await expect.poll(() => lastStatus(tap)?.faith ?? 0, { timeout: 5000 }).toBeGreaterThanOrEqual(cost);
    const since = tap.inbound.length;
    await page.keyboard.press('a');
    const effect = await waitFrame(tap, since, (f) => f.type === 'effect' && f.data.kind === 'hero');
    expect(effect.frame.data.id).toBe('hero_paul');
    expect(tap.inbound.some((e) => e.frame.type === 'attack' || e.frame.type === 'opponentState')).toBe(false);
  });
  await step('D3-20 일시 메뉴 → 그만하기 → SCR-006 "연습 종료"', tap, async () => {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: '일시 메뉴' })).toBeVisible();
    await page.getByRole('button', { name: '그만하기' }).click();
    await waitFrame(tap, 0, (f) => f.type === 'matchEnd', 15000);
    await expect(page.getByRole('heading', { name: '연습 종료' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.rating-line')).toHaveCount(0); // 연습은 레이팅 없음
  });
  expect(errors).toEqual([]);
});

test('REQ-005 · REQ-011 · FR-021·022·040~042: AI 봇 쉬움·보통·어려움 + 말씀 대결(KJV 4지선다) + EVT-43', async ({ page }) => {
  test.setTimeout(300000);
  const errors = collectConsoleErrors([['P', page]]);
  const tap = await tapRoom(page);
  await enter(page, nickname('Q'));

  for (const [level, label] of [['쉬움', 'easy'], ['보통', 'normal'], ['어려움', 'hard']]) {
    await step(`FR-021 봇 ${level}: 짝 성사·봇 표시·봇이 실제로 둔다`, tap, async () => {
      const since = tap.inbound.length;
      const start = await startBotMatch(page, tap, level, '다윗 David');
      const joined = tap.inbound.slice(since).find((e) => e.frame.type === 'joined')?.frame.data;
      const bot = joined.players.find((p) => p.isBot);
      expect(bot).toMatchObject({ isBot: true, botLevel: label });
      await expect(page.locator('.scorebar__side--opp .scorebar__name')).toHaveText(`AI 봇 · ${level}`);
      await page.waitForTimeout(start.countdown + 300);
      const boards = new Set();
      await expect.poll(() => {
        for (const e of tap.inbound.slice(since)) if (e.frame.type === 'opponentState') boards.add(e.frame.data.board);
        return boards.size;
      }, { timeout: 15000 }).toBeGreaterThan(1); // 봇 보드가 바뀐다 = 봇이 블록을 놓는다
    });

    if (label === 'easy') {
      await step('봇 경기 패배 → 결과(레이팅 변화 없음) → 로비', tap, async () => {
        await loseMatch(page, tap);
        await expect(page.locator('.rating-line')).toHaveCount(0); // FR-070 레이팅은 사람 대 사람만
        await page.getByRole('button', { name: '로비로' }).click();
      });
    } else if (label === 'normal') {
      await step('FR-047 단계 해금: 누적 3라운드 뒤 2라운드부터 말씀 블록', tap, async () => {
        const since = tap.inbound.length;
        await topOut(tap, page); // 누적 3라운드
        const next = await waitFrame(tap, since, (f) => f.type === 'start', 20000);
        expect(next.frame.data.stage).toBeGreaterThanOrEqual(1);
        await page.waitForTimeout(next.frame.data.countdown + 300);
        tap.stage = next.frame.data;
      });
      await step('FR-040~042 말씀 블록 줄 삭제 → 두 화면 정지·4지선다 → 먼저 맞혀 보상·해설·KJV 구절', tap, async () => {
        const { seed, stage } = tap.stage;
        const { n } = findSpecialPiece({ seed, mode: 'bot', stage }, 'word', 0);
        const since = tap.inbound.length;
        await injectClear(tap, { lines: 1, pieceCount: Math.max(n + 1, 3), specials: [{ kind: 'word', pieceIndex: n }] });
        const qs = (await waitFrame(tap, since, (f) => f.type === 'quizStart', 10000)).frame.data;
        expect(qs.trigger).toBe('wordBlock');
        expect(qs.choices).toHaveLength(4);
        await expect(page.locator('.quiz')).toBeVisible();
        await expect(page.locator('.quiz__question')).toHaveText(qs.question);
        const item = quiz.find((q) => q.id === qs.quizId);
        expect(item).toBeTruthy();
        await page.keyboard.press(String(item.answer + 1)); // 1~4 키 (말씀 대결 중 천사 키와 겹치지 않음)
        const result = (await waitFrame(tap, since, (f) => f.type === 'quizResult', 15000)).frame.data;
        expect(result.correctIndex).toBe(item.answer);
        expect(result.winnerSlot).toBe([...tap.inbound].reverse().find((e) => e.frame.type === 'joined').frame.data.slot);
        await expect(page.locator('.quiz__outcome--won')).toBeVisible();
        await expect(page.locator('.quiz__explain')).toHaveText(item.explanation);
        await expect(page.locator('.quiz .verse__ref')).toContainText(item.verseRef);
        await expect(page.locator('.quiz')).toBeHidden({ timeout: 10000 }); // resumeAt 재개
      });
      await step('EVT-43 (클라이언트 연출): 천사 봉인 중 천사 키 → 봉인 칩 섬광 1회 + 남은 초 토스트', tap, async () => {
        // 서버의 봉인 판정(ANGEL_SEALED)은 단위 시험(interference·angels)이 맡는다. 여기서는 그 응답을 받은 화면의 연출만 본다:
        // 천사 키를 한 번 눌러 마지막 키를 만들고(서버 응답 대기), 봉인 상태 + ANGEL_SEALED 거부를 앱 소켓에 그대로 전달한다.
        const mySlot = [...tap.inbound].reverse().find((e) => e.frame.type === 'joined').frame.data.slot;
        const mine = (f) => (f.type === 'error' && f.error.ref === 'skill') || (f.type === 'effect' && f.data.kind === 'angel' && f.data.bySlot === mySlot);
        let answered = false;
        for (let i = 0; i < 10 && !answered; i += 1) { // 재개(resumeAt) 직후 잠깐은 엔진이 정지 상태라 키를 무시한다
          const since = tap.inbound.length;
          await page.keyboard.press('5');
          await page.waitForTimeout(400);
          answered = tap.inbound.slice(since).some((e) => mine(e.frame));
        }
        expect(answered).toBe(true);
        const status = lastStatus(tap);
        await page.evaluate((s) => {
          window.__tapDeliver({ type: 'playerStatus', success: true, data: { ...s, sealedMs: 15000 } });
          window.__tapDeliver({ type: 'error', success: false, error: { code: 'ANGEL_SEALED', message: '천사 소환이 봉인되었습니다.', ref: 'skill' } });
        }, status);
        await expect(page.locator('.spirit-chips .chip--seal')).toHaveClass(/is-flash/);
        await expect(page.locator('.spirit-chips .chip--seal')).toContainText('⛓ 봉인');
        await expect(page.getByText(/천사 소환이 봉인되었습니다\. \(\d+초\)/)).toBeVisible();
      });
      await step('봇 경기 마무리 (2라운드 패배 → 결과 → 로비)', tap, async () => {
        await loseMatch(page, tap, 1);
        await page.getByRole('button', { name: '로비로' }).click();
      });
    } else {
      await step('봇 어려움 경기 패배 → 결과', tap, async () => {
        await loseMatch(page, tap);
      });
    }
  }
  expect(errors).toEqual([]);
});
