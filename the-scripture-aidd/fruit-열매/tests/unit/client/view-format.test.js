// TASK-062·063 · FR-007 · FR-041 · FR-042 · FR-063~066 · FR-069~071 · C-009 · FR-075 — 화면 표시 모델·형식 함수 (DOM 없이 검사)
import { describe, expect, it } from 'vitest';
import { formatClock } from '../../../client/js/ui/dom.js';
import { MAX_TOASTS, TOAST_MS, planToast, toastExpiry } from '../../../client/js/ui/toast.js';
import { REACTION_VIEW, canSendReaction } from '../../../client/js/ui/reactions.js';
import { describeQuizResult, formatNearMiss } from '../../../client/js/ui/quiz-panel.js';
import { verseCardFileName, wrapLines } from '../../../client/js/ui/verse-card.js';
import { entryErrorMessage, PRIVACY_NOTICE } from '../../../client/js/screens/entry-screen.js';
import { modeLabel, skillCostLabel } from '../../../client/js/screens/hero-select-screen.js';
import { codeAriaLabel, sanitizeCode } from '../../../client/js/screens/matching-screen.js';
import { formatLocalDateTime, matchRowView } from '../../../client/js/screens/records-screen.js';
import { shouldPinMyRank } from '../../../client/js/screens/ranking-screen.js';
import { formatGrowth, ratingLine, recordRows, resultTitle } from '../../../client/js/screens/result-screen.js';
import { snapVolume } from '../../../client/js/screens/options-screen.js';
import { keycapTimerText, spiritChipText, winDots } from '../../../client/js/screens/battle-screen.js';

describe('공통 형식', () => {
  it('formatClock mm:ss', () => {
    expect(formatClock(412870)).toBe('06:52');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-5)).toBe('00:00');
    expect(formatClock(undefined)).toBe('00:00');
  });
  it('전적 일시: ISO UTC → 현지 YYYY-MM-DD HH:mm', () => {
    const iso = '2026-10-19T14:31:02.004Z';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    expect(formatLocalDateTime(iso)).toBe(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
    expect(formatLocalDateTime('nope')).toBe('');
  });
});

describe('SCR-001·003·004', () => {
  it('고지 문구 (봉인 제5계명)', () => expect(PRIVACY_NOTICE).toBe('닉네임과 경기 기록이 이 게임 서버에 저장됩니다.'));
  it('입장 오류 문구', () => {
    expect(entryErrorMessage({ network: true })).toBeNull();
    expect(entryErrorMessage({ code: 'INVALID_BODY', message: 'x' })).toBe('닉네임 규칙(길이·문자)을 확인하세요.');
    expect(entryErrorMessage({ code: 'NICKNAME_TAKEN', message: '이미 사용 중인 닉네임입니다.' })).toBe('이미 사용 중인 닉네임입니다.');
  });
  it('모드 표시·비용 표시', () => {
    expect(modeLabel('bot', 'normal')).toBe('AI 봇 대전 · 보통');
    expect(modeLabel('random')).toBe('대전 · 랜덤 매칭');
    expect(skillCostLabel({ cost: 50, cooldownMs: 20000 })).toBe('믿음 50 · 재사용 20초');
  });
  it('초대 코드 입력 정리 (D-09: 0·O·1·I 제외, 대문자)', () => {
    expect(sanitizeCode('k7p-x4q')).toBe('K7PX4Q');
    expect(sanitizeCode('O0I1oi')).toBe('');
    expect(sanitizeCode(null)).toBe('');
    expect(codeAriaLabel('K7PX4Q')).toBe('초대 코드 K 7 P X 4 Q');
  });
});

describe('SCR-005 위젯', () => {
  it('승수 점·키캡 남은 초·영 칩', () => {
    expect(winDots(1)).toBe('●○');
    expect(winDots(5)).toBe('●●');
    expect(keycapTimerText('cooldown', 8200)).toBe('9');
    expect(keycapTimerText('ready', 8200)).toBe('');
    expect(spiritChipText({ spiritId: 'jezebel', remainingMs: 4200, clearsLeft: null })).toMatch(/4\.2s$/);
    expect(spiritChipText({ spiritId: 'wickedness', remainingMs: null, clearsLeft: 3 })).toMatch(/ 3$/);
  });
  it('토스트: 같은 문구 합치기·동시 최대 2개·만료', () => {
    let list = planToast([], { message: 'A' }, 1000, 1);
    list = planToast(list, { message: 'A' }, 1200, 2);
    expect(list).toHaveLength(1);
    expect(list[0].expiresAt).toBe(1200 + TOAST_MS);
    list = planToast(list, { message: 'B' }, 1300, 3);
    list = planToast(list, { message: 'C' }, 1400, 4);
    expect(list.map((t) => t.message)).toEqual(['B', 'C']);
    expect(list.length).toBeLessThanOrEqual(MAX_TOASTS);
    list = planToast(list, { message: '아직 다시 쓸 수 없습니다. (3.1초)', key: 'cd' }, 1500, 5);
    list = planToast(list, { message: '아직 다시 쓸 수 없습니다. (2.9초)', key: 'cd', untilMs: 2900 }, 1700, 6);
    expect(list.filter((t) => t.key === 'cd')).toHaveLength(1);
    expect(list.find((t) => t.key === 'cd').message).toContain('2.9초');
    expect(toastExpiry(1000, 3000)).toBe(4000); // 지속 ms
    expect(toastExpiry(1000, 1792420934000)).toBe(1792420934000); // epoch 만료 시각
  });
  it('리액션 1500ms 간격·3종', () => {
    expect(canSendReaction(null, 0)).toBe(true);
    expect(canSendReaction(1000, 2499)).toBe(false);
    expect(canSendReaction(1000, 2500)).toBe(true);
    expect(Object.keys(REACTION_VIEW)).toEqual(['amen', 'hallelujah', 'halo']);
  });
  it('말씀 대결: 니어미스·결과 문구', () => {
    expect(formatNearMiss(120)).toBe('0.12초 차이!');
    expect(formatNearMiss(1234)).toBe('1.23초 차이!');
    const base = { correctIndex: 2, deltaMs: 120, reward: { type: 'faith', amount: 50 } };
    expect(describeQuizResult({ ...base, winnerSlot: 1 }, 1, 2)).toEqual({ kind: 'won', text: '먼저 맞혔습니다! 믿음 +50' });
    expect(describeQuizResult({ ...base, winnerSlot: 1, reward: { type: 'armor', armorId: 'helmet_of_salvation' } }, 1, 2).text).toBe('전신갑주 획득: 구원의 투구');
    expect(describeQuizResult({ ...base, winnerSlot: 2 }, 1, 2)).toEqual({ kind: 'nearMiss', text: '0.12초 차이!' });
    expect(describeQuizResult({ ...base, winnerSlot: 2 }, 1, 0).kind).toBe('lost');
    expect(describeQuizResult({ ...base, winnerSlot: null }, 1, 0).text).toBe('아무도 맞히지 못했습니다');
  });
});

describe('SCR-006~009', () => {
  const end = { mode: 'random', winnerSlot: 1, ratingDelta: 16, rating: 1016, record: { maxCombo: 5, attackPerMin: 6.3, quizAccuracy: 1 }, growth: { maxCombo: 2, attackPerMin: 1.4, quizAccuracy: 0.5 } };
  it('제목·레이팅·성장', () => {
    expect(resultTitle(end, 1)).toBe('승리');
    expect(resultTitle(end, 2)).toBe('패배');
    expect(resultTitle({ mode: 'practice', winnerSlot: null }, 1)).toBe('연습 종료');
    expect(ratingLine(end)).toBe('레이팅 1016 (+16)');
    expect(ratingLine({ ...end, ratingDelta: -12, rating: 988 })).toBe('레이팅 988 (−12)');
    expect(ratingLine({ ...end, ratingDelta: null })).toBeNull();
    expect(formatGrowth(null)).toBe('첫 기록');
    expect(formatGrowth(0.5, 'quizAccuracy')).toBe('▲ 50%p');
    expect(formatGrowth(-1.4, 'attackPerMin')).toBe('▼ 1.4');
  });
  it('개인 기록 행 — 연습은 플레이 시간 추가, growth null이면 첫 기록', () => {
    expect(recordRows(end).map((r) => [r.value, r.growth])).toEqual([['5', '▲ 2'], ['6.3', '▲ 1.4'], ['100%', '▲ 50%p']]);
    const practice = recordRows({ mode: 'practice', record: { maxCombo: 1, attackPerMin: 0, quizAccuracy: 0, playTimeMs: 65000 }, growth: null });
    expect(practice).toHaveLength(4);
    expect(practice[3]).toMatchObject({ label: '플레이 시간', value: '01:05' });
    expect(practice[0].growth).toBe('첫 기록');
  });
  it('말씀 카드 파일명·줄바꿈', () => {
    expect(verseCardFileName('2 Timothy 4:7')).toBe('말씀카드-2-Timothy-4:7.png');
    const measure = (t) => t.length * 10;
    expect(wrapLines('aa bb cc dd', 50, measure)).toEqual(['aa bb', 'cc dd']);
    expect(wrapLines('abcdefghij', 40, measure)).toEqual(['abcd', 'efgh', 'ij']);
  });
  it('전적 행 모델', () => {
    const row = matchRowView({ result: 'loss', opponent: { nickname: null, isBot: true, botLevel: 'normal' }, myHero: 'peter', opponentHero: 'solomon', rounds: [1, 2], durationMs: 288110, createdAt: '2026-10-19T14:12:45.731Z' });
    expect(row).toMatchObject({ win: false, resultText: '패', opponent: 'AI 봇 · 보통', rounds: '1:2', duration: '04:48' });
    expect(row.myHero.nameKo).toBe('베드로');
  });
  it('내 순위 고정 줄', () => {
    expect(shouldPinMyRank({ top: [{ isMe: false }], me: { rank: 137 } })).toBe(true);
    expect(shouldPinMyRank({ top: [{ isMe: true }], me: { rank: 1 } })).toBe(false);
    expect(shouldPinMyRank({ top: [], me: null })).toBe(false);
  });
  it('음량 5단위', () => {
    expect(snapVolume('83')).toBe(85);
    expect(snapVolume(-3)).toBe(0);
    expect(snapVolume(140)).toBe(100);
  });
});
