// aux-sfx.js — AUX-01~AUX-15 합성·재생만
// TASK-050-2 | REQ-013 FR-034 FR-036 FR-037 FR-039 FR-041 FR-042 FR-045 FR-046 FR-053 FR-055 FR-061 FR-064 FR-065
// FR-078 C-007 | ARCH-006 | design-vision §4.7.3·§4.8 소리 겹침 | D3-11 | RTM §5 DCL-008
// FR-058 17종 밖의 보조음 — 각 근거 FR의 청각 피드백(D3-11). 경고음 AUX-01·AUX-03은 spiritMute 경유(§4.7.1).
// 심장박동(AUX-01)은 Tone.Clock으로 돈다 — Transport 템포(위기 132 BPM)와 무관하게 900/650ms (RTM §5 DCL-008).
import * as Tone from "tone";
import { dbToGain } from "./mixer.js";
import { env, limit } from "./sfx-voices.js";

export const AUX_IDS = Object.freeze(Array.from({ length: 15 }, (_, i) => `AUX-${String(i + 1).padStart(2, "0")}`));

/** §4.6.11 D-01 심장박동 간격 — 블록이 위 2줄 안이면 650ms */
const HEART_MS = { normal: 900, severe: 650 };

/** @param {ReturnType<typeof import("./mixer.js").createMixer>} mixer */
export function createAuxSfx(mixer) {
  /** @type {any} */ let I = null;
  /** @type {Record<string, number>} */ const last = {};
  const heart = { on: false, severe: false, clock: /** @type {any} */ (null) };

  function build() {
    if (I) return true;
    const out = mixer.sfxIn;
    if (!out) return false;
    try {
      const to = (node, ...chain) => (chain.length ? node.chain(...chain, out) : node.connect(out));
      const flt = (type, frequency) => new Tone.Filter({ type, frequency });
      const beat = to(new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 2.5, envelope: env(0.001, 0.18, 0, 0.05),
        volume: -10 }));
      const bell = to(new Tone.PolySynth(Tone.FMSynth, { harmonicity: 3.5, modulationIndex: 10,
        envelope: env(0.001, 1.6, 0, 0.8), volume: -10 }));
      mixer.send(bell, "long", 0.4);
      const tick = to(new Tone.Synth({ oscillator: { type: "square" }, envelope: env(0, 0.02, 0, 0.01), volume: -28 }));
      const buzz = to(new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: env(0.005, 0.25, 0, 0.05),
        volume: -14 }), flt("lowpass", 900));
      const arp = to(new Tone.Synth({ oscillator: { type: "triangle" }, envelope: env(0.002, 0.2, 0, 0.1),
        volume: -14 }));
      const sting = to(new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsine" }, envelope: env(0.005, 0.5, 0,
        0.3),
        volume: -12 }));
      const cymbal = to(new Tone.NoiseSynth({ noise: { type: "white" }, envelope: env(0.4, 0.01, 0, 0.01),
        volume: -22 }),
        flt("highpass", 3000));
      const light = to(new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsine", count: 5, spread: 18 },
        envelope: env(1.0, 0.5, 0.9, 2.8), volume: -10 }));
      mixer.send(light, "long", 0.6);
      const shimmer = to(new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: env(1.5, 0, 1, 2), volume: -30 }),
        flt("highpass", 6000));
      mixer.send(shimmer, "long", 0.6);
      const hornF = flt("lowpass", 800);
      const horn = to(new Tone.Synth({ oscillator: { type: "fatsawtooth", count: 2, spread: 10 },
        envelope: env(0.01, 0.1, 0.7, 0.2), volume: -10 }), hornF);
      const hornLow = to(new Tone.MembraneSynth({ volume: -10 }));
      const chime = to(new Tone.Synth({ oscillator: { type: "sine" }, envelope: env(0.001, 0.3, 0, 0.2),
        volume: -16 }));
      mixer.send(chime, "short", 0.3);
      const pop = to(new Tone.Synth({ oscillator: { type: "sine" }, envelope: env(0.001, 0.06, 0, 0.02),
        volume: -20 }));
      const blip = to(new Tone.Synth({ oscillator: { type: "square" }, envelope: env(0.001, 0.08, 0, 0.02),
        volume: -20 }),
        flt("lowpass", 2000));
      const ready = to(new Tone.FMSynth({ harmonicity: 3, modulationIndex: 6, envelope: env(0.001, 0.8, 0, 0.4),
        volume: -16 }));
      const shield = to(new Tone.MetalSynth({ harmonicity: 5.1, modulationIndex: 24, resonance: 4000, octaves: 1.2,
        envelope: { attack: 0.001, decay: 0.6, release: 0.3 }, volume: -14 }));
      const menu = to(new Tone.Synth({ oscillator: { type: "triangle" }, envelope: env(0, 0.04, 0, 0.02),
        volume: -26 }));
      const clash = to(new Tone.MetalSynth({ harmonicity: 4.1, modulationIndex: 30, envelope: { decay: 0.5,
        release: 0.2 },
        volume: -10 }));
      const clashLow = to(new Tone.MembraneSynth({ envelope: env(0.001, 0.5, 0, 0.2), volume: -10 }));
      for (const p of [bell, sting, light]) limit(p, 8); // §4.7.1 그 밖 PolySynth 8
      I = { beat, bell, tick, buzz, arp, sting, cymbal, light, shimmer, horn, hornF, hornLow, chime, pop, blip, ready,
        shield, menu, clash, clashLow };
      return true;
    } catch (err) {
      console.error("보조 효과음 악기 생성 실패", err);
      I = null;
      return false;
    }
  }

  const glide = (synth, a, b, t, sec, v) => {
    synth.triggerAttackRelease(a, sec, t, v);
    synth.frequency.exponentialRampToValueAtTime(Tone.Frequency(b).toFrequency(), t + sec);
  };

  /** §4.7.3 레시피 (t = Tone.now(), v = 재생별 음량 배율) */
  const PLAY = {
    "AUX-01"(t, o, v) { // 심장박동 "쿵"(F1) → 140ms 뒤 "쿵"(C2)
      I.beat.triggerAttackRelease("F1", 0.18, t, v);
      I.beat.triggerAttackRelease("C2", 0.18, t + 0.14, v);
    },
    "AUX-02"(t, o, v) { // 말씀 대결 종 [G5, C6] (Q-06 단음 변형)
      I.bell.triggerAttackRelease(o.single ? ["G5"] : ["G5", "C6"], 1.6, t, v);
    },
    "AUX-03"(t, o, v) { // 퀴즈 째깍 C7
      I.tick.triggerAttackRelease("C7", 0.02, t, v);
    },
    "AUX-04"(t, o, v) { // 오답 버즈 E2→D#2 0.25s
      glide(I.buzz, "E2", "D#2", t, 0.25, v);
    },
    "AUX-05"(t, o, v) { // 말씀 승리 아르페지오 [C5, E5, G5, C6] 60ms 간격
      ["C5", "E5", "G5", "C6"].forEach((n, i) => I.arp.triggerAttackRelease(n, 0.2, t + i * 0.06, v));
    },
    "AUX-06"(t, o, v) { // 니어미스 스팅 [B4, C5] 단2도 + 역방향 심벌
      I.sting.triggerAttackRelease(["B4", "C5"], 0.5, t, v);
      I.cymbal.triggerAttackRelease(0.41, t, v);
    },
    "AUX-07"(t, o, v) { // 빛의 화음 [C3, G3, C4, E4, G4, C5] 3.6s + 고역 반짝임
      I.light.triggerAttackRelease(["C3", "G3", "C4", "E4", "G4", "C5"], 3.6, t, v);
      I.shimmer.triggerAttackRelease(3.6, t, v);
    },
    "AUX-08"(t, o, v) { // 여리고 나팔 G3(0.12) G3(0.12) C4(0.4) — 음마다 lowpass 800→3,500Hz 0.05s + 막 G1
      [["G3", 0, 0.12], ["G3", 0.14, 0.12], ["C4", 0.28, 0.4]].forEach(([n, at, d]) => {
        I.hornF.frequency.setValueAtTime(800, t + at);
        I.hornF.frequency.exponentialRampToValueAtTime(3500, t + at + 0.05);
        I.horn.triggerAttackRelease(n, d, t + at, v);
      });
      I.hornLow.triggerAttackRelease("G1", 0.4, t, v);
    },
    "AUX-09"(t, o, v) { // 만나·갑주 차임 [E6, B6] 70ms 간격
      I.chime.triggerAttackRelease("E6", 0.3, t, v);
      I.chime.triggerAttackRelease("B6", 0.3, t + 0.07, v);
    },
    "AUX-10"(t, o, v) { // 리액션 팝 600→1,200Hz 0.06s
      glide(I.pop, 600, 1200, t, 0.06, v);
    },
    "AUX-11"(t, o, v) { // 거부 블립 D4→A3 0.08s
      glide(I.blip, "D4", "A3", t, 0.08, v);
    },
    "AUX-12"(t, o, v) { // 준비·업적 차임 [C6, G6] 50ms 간격 (H-06 +5반음)
      const k = o.semitones ?? 0;
      I.ready.triggerAttackRelease(Tone.Frequency("C6").transpose(k).toFrequency(), 0.8, t, v);
      I.ready.triggerAttackRelease(Tone.Frequency("G6").transpose(k).toFrequency(), 0.8, t + 0.05, v);
    },
    "AUX-13"(t, o, v) { // 방패 울림 520Hz
      I.shield.triggerAttackRelease(520, 0.6, t, v);
    },
    "AUX-14"(t, o, v) { // 메뉴 확인 G5
      I.menu.triggerAttackRelease("G5", 0.04, t, v);
    },
    "AUX-15"(t, o, v) { // 공격 충돌 MetalSynth 300Hz + 막 G1
      I.clash.triggerAttackRelease(300, 0.5, t, v);
      I.clashLow.triggerAttackRelease("G1", 0.5, t, v);
    },
  };

  /** @param {string} id @param {any} o */
  function play(id, o = {}) {
    if (!PLAY[id] || !build()) return false;
    try {
      const t = Tone.now();
      if (last[id] !== undefined && t - last[id] < 0.03) return false; // §4.8 같은 소리 30ms 안 생략
      last[id] = t;
      PLAY[id](t, o, dbToGain(o.db ?? 0));
      return true;
    } catch (err) {
      console.error(`보조 효과음 ${id} 실패`, err);
      return false;
    }
  }

  return {
    build, play,
    /**
     * D-01·D-02 AUX-01 심장박동 반복 켜기·끄기 — 간격 900ms (위 2줄 안이면 650ms)
     * @param {boolean} on @param {boolean} [severe]
     */
    setHeartbeat(on, severe = false) {
      if (!build()) return;
      try {
        heart.on = !!on;
        heart.severe = !!severe;
        if (!heart.clock) heart.clock = new Tone.Clock((time) => PLAY["AUX-01"](time, {}, 1), 1000 / HEART_MS.normal);
        heart.clock.frequency.value = 1000 / (heart.severe ? HEART_MS.severe : HEART_MS.normal);
        if (heart.on && heart.clock.state !== "started") heart.clock.start();
        if (!heart.on && heart.clock.state === "started") heart.clock.stop();
      } catch (err) {
        console.error("심장박동 전환 실패", err);
      }
    },
    get heartbeat() {
      return { on: heart.on, severe: heart.severe };
    },
  };
}
