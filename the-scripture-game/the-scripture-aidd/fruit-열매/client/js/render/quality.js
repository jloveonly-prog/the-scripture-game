// quality.js — 프레임 시간 감시·가벼운 그리기 전환/복귀만
// TASK-042 | REQ-013 NFR-001 | ARCH-004 | design-vision §4.9 자동 품질 조절 (옵션이 아닌 내부 동작 — NFR-001 측정 기준 유지 장치)
// 20ms 넘는 프레임이 60프레임 연속 → "가벼운 그리기"(파티클 풀 300, Bloom 끔, Glow는 구운 텍스처만, 배경 P4 정지)
// 30초 동안 16.7ms 이하 유지 → 복귀. 시간은 실제 경과(rawMs — 히트스톱 배율 없음)로 잰다.
// 복귀 판정의 "16.7ms 이하"는 최근 60프레임 평균으로 본다 — 60Hz 화면의 vsync 흔들림(16.6~16.8ms) 한 프레임이
// 30초 누적을 매번 끊지 않게 (수치는 §4.9 그대로).

const SLOW_FRAME_MS = 20;
const SLOW_STREAK = 60;
const FAST_FRAME_MS = 16.7;
const RECOVER_MS = 30000;

/**
 * @param {{ onChange: (mode: "normal" | "light") => void }} o onChange에서 particles.setLimit·filters.setLight·
 *   background.setLight·board.setQuality를 호출한다
 */
export function createQualityMonitor({ onChange }) {
  let mode = "normal";
  let slowStreak = 0;
  let fastFor = 0;
  /** @type {number[]} */ const recent = [];
  let recentSum = 0;

  /** @param {"normal" | "light"} next */
  function set(next) {
    if (next === mode) return;
    mode = next;
    slowStreak = 0;
    fastFor = 0;
    recent.length = 0;
    recentSum = 0;
    try {
      onChange(mode);
    } catch (err) {
      console.error("품질 전환 실패", err);
    }
  }

  return {
    /** 매 프레임 실제 경과 ms @param {number} rawMs */
    sample(rawMs) {
      if (!(rawMs > 0) || rawMs > 1000) return; // 탭 비활성 복귀 등 비정상 간격은 세지 않는다
      if (mode === "normal") {
        slowStreak = rawMs > SLOW_FRAME_MS ? slowStreak + 1 : 0;
        if (slowStreak >= SLOW_STREAK) set("light");
      } else {
        recent.push(rawMs);
        recentSum += rawMs;
        if (recent.length > SLOW_STREAK) recentSum -= recent.shift();
        fastFor = recentSum / recent.length <= FAST_FRAME_MS ? fastFor + rawMs : 0;
        if (fastFor >= RECOVER_MS) set("normal");
      }
    },
    get mode() {
      return mode;
    },
    /** 화면 전환 시 초기화 */
    reset() {
      set("normal");
    },
  };
}
