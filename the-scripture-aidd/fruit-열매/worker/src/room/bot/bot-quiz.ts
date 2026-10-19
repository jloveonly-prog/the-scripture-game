// TASK-012 · REQ-005 · FR-022 — 봇 말씀 대결 응답 (난이도별 정답률·응답 시간 — data-ark §8.8.10).
// 단일 책임: 정답 번호를 받아 봇이 고를 보기와 응답 지연을 정한다. 도착순 판정은 서버 quiz-duel(에브라임)이 사람과 같은 규칙으로 한다.
import { balance } from '../../content';

type BotLevel = 'easy' | 'normal' | 'hard';
type Choice = 0 | 1 | 2 | 3;
const CHOICES: readonly Choice[] = [0, 1, 2, 3];

// FR-022 봇 응답 계획 — quizAccuracy 확률로 정답, 아니면 오답 3개 중 균등. 지연 = quizDelayMs [min, max] 균등 정수
export function planBotQuizAnswer(level: BotLevel, answerIndex: number, rand: () => number): { choice: Choice; delayMs: number } {
  const cfg = balance.bots[level];
  if (!cfg) throw new RangeError('planBotQuizAnswer: 알 수 없는 봇 난이도');
  if (!CHOICES.includes(answerIndex as Choice)) throw new RangeError('planBotQuizAnswer: answerIndex는 0~3');
  const correct = rand() < cfg.quizAccuracy;
  const wrong = CHOICES.filter((c) => c !== answerIndex);
  const choice = correct ? (answerIndex as Choice) : wrong[Math.min(Math.floor(rand() * wrong.length), wrong.length - 1)];
  const [minMs, maxMs] = cfg.quizDelayMs;
  const delayMs = minMs + Math.floor(rand() * (maxMs - minMs + 1));
  return { choice, delayMs };
}
