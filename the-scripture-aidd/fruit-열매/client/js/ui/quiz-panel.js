// TASK-063-3 · FR-041 · FR-042 · C-003 · ARCH-022 · API-208 · API-257~259 · EVT-34~37 — 말씀 대결 패널 (4지선다·10초·잠금·니어미스·해설)
// 정답은 quizResult 전까지 모른다 (R-11). Esc로 닫히지 않는다 — 응답 또는 시간 종료만 (design-vision §4.2).
import { armorById, content } from '../content/content-loader.js';
import { ROOM_C2S } from '../net/protocol.js';
import { clear, el, trapFocus } from './dom.js';

const TICK_MS = 100;

// FR-042 니어미스 문구 "0.12초 차이!" (deltaMs/1000, 소수 둘째 자리 — balance.quiz.nearMissDecimals)
export function formatNearMiss(deltaMs, decimals = content.balance.quiz.nearMissDecimals) {
  return `${(Math.max(0, deltaMs) / 1000).toFixed(decimals)}초 차이!`;
}

// FR-041 결과 문구 결정 (순수) — 승리 보상 / 니어미스(늦은 정답자) / 아무도 못 맞힘 / 그 밖 없음
export function describeQuizResult(result, mySlot, myLastChoice) {
  if (result.winnerSlot === null || result.winnerSlot === undefined) return { kind: 'none', text: '아무도 맞히지 못했습니다' };
  if (result.winnerSlot === mySlot) {
    const reward = result.reward;
    if (reward?.type === 'faith') return { kind: 'won', text: `먼저 맞혔습니다! 믿음 +${reward.amount}` };
    if (reward?.type === 'armor') return { kind: 'won', text: `전신갑주 획득: ${armorById.get(reward.armorId)?.nameKo ?? ''}` };
    return { kind: 'won', text: '먼저 맞혔습니다!' };
  }
  if (Number.isFinite(result.deltaMs) && myLastChoice === result.correctIndex) return { kind: 'nearMiss', text: formatNearMiss(result.deltaMs) };
  return { kind: 'lost', text: '' };
}

/**
 * opts: { host, room, mySlot, toLocalTime, emitFx(events), announce(text, {assertive}), onOpenChange(open) }
 * 반환 { open(quizStart), lock(quizLock), result(quizResult), choose(index), close(), isOpen() }
 */
export function createQuizPanel({ host, room, mySlot, toLocalTime, emitFx, announce, onOpenChange }) {
  let quiz = null;
  let answered = false;
  let lockedUntil = 0;
  let lastChoice = null;
  let finished = false;
  let ticker = null;
  let resumeTimer = null;
  let releaseTrap = null;
  let returnFocus = null;

  const timerFill = el('div', { class: 'quiz__timer-fill' });
  const timerText = el('span', { class: 'quiz__timer-text' });
  const question = el('p', { class: 'quiz__question', attrs: { id: 'quiz-question' } });
  const choicesBox = el('div', { class: 'quiz__choices', attrs: { role: 'radiogroup', 'aria-labelledby': 'quiz-question' } });
  const status = el('p', { class: 'quiz__status', attrs: { 'aria-live': 'polite' } });
  const resultBox = el('div', { class: 'quiz__result' });
  const panel = el('section', { class: 'quiz', hidden: true, attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'quiz-question' } }, [
    el('header', { class: 'quiz__head' }, [
      el('h2', { class: 'quiz__title', text: '✦ 말씀 대결' }),
      el('div', { class: 'quiz__timer', attrs: { 'aria-hidden': 'true' } }, [timerFill]), timerText,
    ]),
    question, choicesBox, status, resultBox,
  ]);
  host.append(panel);
  const buttons = () => [...choicesBox.querySelectorAll('button')];

  function tick() {
    if (!quiz) return;
    const now = Date.now();
    if (!finished) {
      const left = Math.max(0, toLocalTime(quiz.deadlineAt) - now);
      timerFill.style.transform = `scaleX(${Math.min(1, left / quiz.timeLimitMs)})`;
      timerText.textContent = `${(left / 1000).toFixed(1)}초`;
    }
    const locked = lockedUntil > now;
    for (const button of buttons()) button.disabled = finished || locked || answered;
    if (!locked && status.dataset.state === 'locked') { status.textContent = ''; status.dataset.state = ''; }
  }

  // FR-041 quizStart(API-257) → 두 보드 정지 표시·패널 열기·첫 보기 포커스 (EVT-34)
  function open(data) {
    closeNow(false);
    quiz = data;
    answered = false; lockedUntil = 0; lastChoice = null; finished = false;
    question.textContent = data.question;
    clear(choicesBox); clear(resultBox); status.textContent = '';
    data.choices.forEach((choice, index) => {
      choicesBox.append(el('button', {
        class: 'quiz__choice', attrs: { type: 'button', role: 'radio', 'aria-checked': 'false' }, on: { click: () => choose(index) },
      }, [el('span', { class: 'quiz__num', text: String(index + 1) }), el('span', { class: 'quiz__text', text: choice })]));
    });
    returnFocus = document.activeElement;
    panel.hidden = false;
    releaseTrap = trapFocus(panel);
    onOpenChange?.(true);
    buttons()[0]?.focus();
    announce?.(`말씀 대결. ${data.question} ${data.choices.map((c, i) => `${i + 1}번 ${c}`).join(', ')}`, { assertive: true });
    emitFx?.([{ evt: 'EVT-34', trigger: data.trigger }]);
    ticker = setInterval(tick, TICK_MS);
    tick();
  }

  // FR-041 보기 선택 (1~4 키·클릭·탭) → quizAnswer(API-208)
  function choose(index) {
    if (!quiz || finished || answered || lockedUntil > Date.now()) return;
    if (!Number.isInteger(index) || index < 0 || index >= quiz.choices.length) return;
    answered = true;
    lastChoice = index;
    buttons().forEach((b, i) => b.setAttribute('aria-checked', i === index ? 'true' : 'false'));
    room.send(ROOM_C2S.QUIZ_ANSWER, { quizId: quiz.quizId, choice: index });
    tick();
  }

  // FR-041 quizLock(API-258) — 고른 보기 흔들림 ✗, 3초 잠금 (EVT-35)
  function lock(data) {
    if (!quiz || data.quizId !== quiz.quizId) return;
    lockedUntil = Date.now() + data.lockedMs;
    answered = false;
    const chosen = buttons()[lastChoice];
    chosen?.classList.add('is-wrong', 'is-shake');
    setTimeout(() => chosen?.classList.remove('is-shake'), 300);
    status.dataset.state = 'locked';
    status.textContent = `🔒 오답 — ${Math.round(data.lockedMs / 1000)}초 후 다시 고를 수 있습니다`;
    tick();
  }

  // FR-041·042 quizResult(API-259) — 정답 ✓, 보상·니어미스, 해설·구절(C-003), resumeAt 재개 카운트다운 (EVT-36·37)
  function result(data) {
    if (!quiz || data.quizId !== quiz.quizId) return;
    finished = true;
    buttons().forEach((b, i) => {
      if (i === data.correctIndex) b.classList.add('is-correct');
      if (i === lastChoice && i !== data.correctIndex) b.classList.add('is-wrong');
      b.querySelector('.quiz__num').textContent = i === data.correctIndex ? '✓' : (i === lastChoice ? '✗' : String(i + 1));
    });
    const outcome = describeQuizResult(data, mySlot, lastChoice);
    status.textContent = '';
    clear(resultBox);
    if (outcome.text) resultBox.append(el('p', { class: `quiz__outcome quiz__outcome--${outcome.kind}`, text: outcome.text }));
    resultBox.append(el('p', { class: 'quiz__explain', text: data.explanation }));
    if (data.verse) {
      resultBox.append(el('blockquote', { class: 'verse' }, [
        el('p', { class: 'verse__en', text: data.verse.kjv, attrs: { lang: 'en' } }),
        el('p', { class: 'verse__ko', text: data.verse.ko }),
        el('cite', { class: 'verse__ref', text: `— ${data.verse.ref}`, attrs: { lang: 'en' } }),
      ]));
    }
    const resume = el('p', { class: 'quiz__resume' });
    resultBox.append(resume);
    announce?.(`${outcome.text} ${data.explanation}`.trim(), { assertive: true });
    emitFx?.([{ evt: 'EVT-36', won: data.winnerSlot === mySlot, reward: data.winnerSlot === mySlot ? data.reward : null }]);
    const resumeAtLocal = toLocalTime(data.resumeAt);
    const countdown = () => {
      const left = Math.ceil((resumeAtLocal - Date.now()) / 1000);
      if (left <= 0) { closeNow(true); return; }
      resume.textContent = `재개까지 ${left}`;
      resumeTimer = setTimeout(countdown, TICK_MS);
    };
    countdown();
    tick();
  }

  function closeNow(emitResume) {
    clearInterval(ticker); ticker = null;
    clearTimeout(resumeTimer); resumeTimer = null;
    releaseTrap?.(); releaseTrap = null;
    const wasOpen = !panel.hidden;
    panel.hidden = true;
    quiz = null;
    if (wasOpen) {
      onOpenChange?.(false);
      if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
      if (emitResume) emitFx?.([{ evt: 'EVT-37' }]);
    }
  }

  return { open, lock, result, choose, close: () => closeNow(false), isOpen: () => !panel.hidden, destroy: () => { closeNow(false); panel.remove(); } };
}
