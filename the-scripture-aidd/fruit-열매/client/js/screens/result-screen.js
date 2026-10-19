// TASK-063-2 · FR-007 · FR-056 · FR-063 · FR-065 · FR-066 · FR-070 · C-003 · SCR-006 · UC-015 · UC-016 · API-262 — 결과 (말씀 카드)
import { achievementsById, getVerse } from '../content/content-loader.js';
import { clear, el, formatClock } from '../ui/dom.js';
import { buildVerseCardElement, canShareFiles, saveVerseCard, shareVerseCard } from '../ui/verse-card.js';

const SAVE_FAIL_TOAST = '카드를 저장하지 못했습니다';

// FR-007 제목 — 연습 종료 / 승리 / 패배
export function resultTitle(matchEnd, mySlot) {
  if (matchEnd.mode === 'practice') return '연습 종료';
  return matchEnd.winnerSlot === mySlot ? '승리' : '패배';
}

// FR-066 이전 대비 표시 — null이면 "첫 기록", 양수 ▲, 음수 ▼ (퀴즈 정답률은 %p)
export function formatGrowth(delta, kind) {
  if (delta === null || delta === undefined) return '첫 기록';
  const value = kind === 'quizAccuracy' ? `${Math.round(Math.abs(delta) * 100)}%p` : String(Math.round(Math.abs(delta) * 10) / 10);
  if (delta > 0) return `▲ ${value}`;
  if (delta < 0) return `▼ ${value}`;
  return `— ${value}`;
}

// FR-066 개인 기록 표시 모델 (순수)
export function recordRows(matchEnd) {
  const r = matchEnd.record ?? {};
  const g = matchEnd.growth;
  const rows = [
    { label: '최대 콤보', value: String(r.maxCombo ?? 0), growth: formatGrowth(g ? g.maxCombo : null, 'maxCombo') },
    { label: '분당 공격', value: (Number(r.attackPerMin) || 0).toFixed(1), growth: formatGrowth(g ? g.attackPerMin : null, 'attackPerMin') },
    { label: '퀴즈 정답률', value: `${Math.round((Number(r.quizAccuracy) || 0) * 100)}%`, growth: formatGrowth(g ? g.quizAccuracy : null, 'quizAccuracy') },
  ];
  if (matchEnd.mode === 'practice') rows.push({ label: '플레이 시간', value: formatClock(r.playTimeMs), growth: '' });
  return rows;
}

// FR-070 레이팅 변화 "레이팅 1016 (+16)" — 사람 대 사람만 (ratingDelta null이면 표시 없음)
export function ratingLine(matchEnd) {
  if (matchEnd.ratingDelta === null || matchEnd.ratingDelta === undefined) return null;
  const sign = matchEnd.ratingDelta >= 0 ? '+' : '−';
  return `레이팅 ${matchEnd.rating} (${sign}${Math.abs(matchEnd.ratingDelta)})`;
}

const verseBlock = (verse) => el('blockquote', { class: 'verse' }, [
  el('p', { class: 'verse__en', text: verse.kjv, attrs: { lang: 'en' } }),
  el('p', { class: 'verse__ko', text: verse.ko }),
  el('cite', { class: 'verse__ref', text: `— ${verse.ref}`, attrs: { lang: 'en' } }),
]);

export function mountResultScreen(host, ctx) {
  const { session } = ctx;
  const { data, mySlot, heroId } = session.matchEnd;
  const practice = data.mode === 'practice';
  const won = !practice && data.winnerSlot === mySlot;
  const loadEmblems = () => ctx.load('emblems');

  const heading = el('h1', { class: `result__title ${won ? 'is-win' : ''}`, text: resultTitle(data, mySlot), attrs: { tabindex: '-1' } });
  const score = Array.isArray(data.score) ? (mySlot === 2 ? [data.score[1], data.score[0]] : data.score) : null;
  const scoreParts = [];
  if (!practice && score) scoreParts.push(`${score[0]} : ${score[1]}`);
  scoreParts.push(`경기 시간 ${formatClock(data.durationMs)}`);
  if (data.reason === 'disconnect' && won) scoreParts.push('상대가 나갔습니다');
  const victoryVerse = won && data.victoryVerseRef ? getVerse(data.victoryVerseRef) : null;
  host.append(el('header', { class: 'result__head' }, [heading, el('p', { class: 'result__score', text: scoreParts.join('  ·  ') }), victoryVerse ? verseBlock(victoryVerse) : null]));

  // 왼쪽: 말씀 카드 + 저장·공유 (FR-063)
  const verse = getVerse(data.verseRef);
  const left = el('section', { class: 'result__card' });
  if (verse) {
    const save = el('button', { class: 'btn btn--secondary', text: '이미지 저장', attrs: { type: 'button' } });
    const share = el('button', { class: 'btn btn--secondary', text: '공유', attrs: { type: 'button' }, hidden: !canShareFiles() }); // UC-015 9a
    const opts = { verse, heroId, loadEmblems };
    save.addEventListener('click', async () => { save.disabled = true; if (!(await saveVerseCard(opts))) ctx.toast(SAVE_FAIL_TOAST); save.disabled = false; });
    share.addEventListener('click', async () => { share.disabled = true; if ((await shareVerseCard(opts)) === 'failed') ctx.toast(SAVE_FAIL_TOAST); share.disabled = false; });
    left.append(buildVerseCardElement(opts), el('div', { class: 'button-row' }, [save, share]));
  }

  // 오른쪽: 개인 기록·성장·레이팅·업적·저장 실패 (FR-065·066·070)
  const right = el('section', { class: 'panel result__record' });
  right.append(el('table', { class: 'table record-table' }, [
    el('caption', { class: 'sr-only', text: '개인 기록' }),
    el('thead', {}, [el('tr', {}, ['개인 기록', '', '이전 대비'].map((t) => el('th', { text: t, attrs: { scope: 'col' } })))]),
    el('tbody', {}, recordRows(data).map((row) => el('tr', {}, [el('th', { text: row.label, attrs: { scope: 'row' } }), el('td', { class: 'num', text: row.value }), el('td', { class: 'num', text: row.growth })]))),
  ]));
  const rating = practice ? null : ratingLine(data);
  if (rating) right.append(el('p', { class: 'rating-line num', text: rating }));
  const achievements = (data.achievements ?? []).map((id) => achievementsById.get(id)).filter(Boolean);
  if (achievements.length) right.append(el('p', { class: 'achievement' }, ['새 업적 🏅 ', achievements.map((a) => a.nameKo).join(', ')]));
  if (data.saved === false) right.append(el('p', { class: 'error-text', attrs: { role: 'alert' }, text: practice ? '기록을 저장하지 못했습니다' : '기록 저장에 실패했습니다' }));

  const lobby = el('button', { class: 'btn btn--primary btn--lg', text: '로비로', attrs: { type: 'button' }, on: { click: () => ctx.navigate('lobby') } });
  host.append(el('div', { class: 'result__grid' }, [left, right]), el('footer', { class: 'action-bar' }, [lobby]));
  if (!won && !practice) host.classList.add('is-defeat');

  // EVT-49 경기 승리 / EVT-50 패배 / 연습 연출 없음. 이탈 승리는 대전 화면의 EVT-51이 1500ms 뒤 EVT-49를 이미 1회 실행했다 (중복 팡파르 방지 — 여호수아 조정)
  const leaveWin = won && data.reason === 'disconnect' && session.matchEnd.winFxPlayed === true;
  if (!practice && !leaveWin) {
    ctx.load('feedback').then((fx) => fx?.emitFx([{ evt: won ? 'EVT-49' : 'EVT-50' }])).catch((err) => console.error('[result] fx', err));
  }
  ctx.announce(`${resultTitle(data, mySlot)}. ${scoreParts.join(', ')}${rating ? `. ${rating}` : ''}`, { assertive: true });
  const onKey = (event) => { if (event.key === 'Escape') ctx.navigate('lobby'); };
  host.addEventListener('keydown', onKey);
  heading.focus();
  return { unmount() { host.removeEventListener('keydown', onKey); clear(host); } };
}
