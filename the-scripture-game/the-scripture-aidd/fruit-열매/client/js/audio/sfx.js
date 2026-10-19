// sfx.js — SFX-01~SFX-17 합성·재생만
// TASK-050-2 | REQ-013 FR-055 FR-058 FR-061 C-007 | ARCH-006 | design-vision §4.7.1 동시 발음·§4.7.2·§4.8 소리 겹침 |
// RTM §5 DCL-008
// FR-058 17종 1:1. 악기는 첫 재생 전에 한 번 만들어 재사용(재생마다 new 0). 소리는 Tone.now() 즉시(§4.6 동시성 규칙).
// 같은 SFX가 30ms 안에 다시 오면 생략(SFX-07 제외). 엔벨로프 = attack / decay / sustain / release(초).
import * as Tone from "tone";
import { dbToGain } from "./mixer.js";
import { buildSfxVoices } from "./sfx-voices.js";

export const SFX_IDS = Object.freeze(Array.from({ length: 17 }, (_, i) => `SFX-${String(i + 1).padStart(2, "0")}`));

const tr = (note, semis) => Tone.Frequency(note).transpose(semis).toFrequency();
/** PolySynth 상한 — 넘치면 이전 음을 release 후 새 음 (§4.7.1) @param {any} poly @param {number} need */
function room(poly, need, t) {
  if (poly.activeVoices + need > (poly.voiceLimit ?? poly.maxPolyphony)) poly.releaseAll(t);
}
/** 필터 주파수 스윕 @param {any} f @param {number} a @param {number} b @param {number} t @param {number} sec */
function sweep(f, a, b, t, sec) {
  f.frequency.cancelScheduledValues(t);
  f.frequency.setValueAtTime(a, t);
  f.frequency.exponentialRampToValueAtTime(b, t + sec);
}

/** @param {ReturnType<typeof import("./mixer.js").createMixer>} mixer */
export function createSfx(mixer) {
  /** @type {any} */ let I = null;
  /** @type {Record<string, number>} */ const last = {};
  let moveFlip = false;
  let softAt = -1;

  function build() {
    if (I) return true;
    if (!mixer.sfxIn) return false;
    try {
      I = buildSfxVoices(mixer, mixer.sfxIn);
      return true;
    } catch (err) {
      console.error("효과음 악기 생성 실패", err);
      I = null;
      return false;
    }
  }

  /** §4.7.2 레시피 — t = Tone.now(), o = 변형 옵션, v = 재생별 음량 배율(dB 오프셋) */
  const PLAY = {
    "SFX-01"(t, o, v) { // 이동 E6/F6 번갈아, 막힘 −5반음 −6dB
      moveFlip = !moveFlip;
      const note = tr(moveFlip ? "E6" : "F6", o.blocked ? -5 : 0);
      I.move().triggerAttackRelease(note, 0.04, t, o.blocked ? v * dbToGain(-6) : v);
    },
    "SFX-02"(t, o, v) { // 회전 글라이드 45ms, 벽차기 +2, 실패 C4 30ms −26dB
      if (o.fail) return I.rotate.triggerAttackRelease("C4", 0.03, t, v * dbToGain(-4));
      const k = o.kick ? 2 : 0;
      const [a, b] = o.dir === "ccw" ? [tr("E6", k), tr("A5", k)] : [tr("A5", k), tr("E6", k)];
      I.rotate.triggerAttackRelease(a, 0.06, t, v);
      I.rotate.frequency.exponentialRampToValueAtTime(b, t + 0.045);
    },
    "SFX-03"(t, o, v) { // 소프트 드롭 25ms — 60ms에 1회까지
      if (t - softAt < 0.06) return;
      softAt = t;
      I.soft().triggerAttackRelease(0.025, t, v);
    },
    "SFX-04"(t, o, v) { // 하드 드롭: 막 C1 + 잡음 휙 bandpass 4,000→500Hz 0.12s
      I.dropA.triggerAttackRelease("C1", 0.33, t, v);
      sweep(I.dropBf, 4000, 500, t, 0.12);
      I.dropB.triggerAttackRelease(0.12, t, v);
    },
    "SFX-05"(t, o, v) { // 착지 G2 / 쓰레기 상승 D2 −14dB × rows (40ms 간격, 최대 4번)
      const n = o.garbage ? Math.min(4, Math.max(1, o.rows ?? 1)) : 1;
      for (let i = 0; i < n; i += 1) {
        I.land.triggerAttackRelease(o.garbage ? "D2" : "G2", 0.12, t + i * 0.04, o.garbage ? v * dbToGain(4) : v);
      }
    },
    "SFX-06"(t, o, v) { // 홀드 E5 → 50ms 뒤 B5 (거부: −7반음, −12dB)
      const k = o.rejected ? -7 : 0;
      const w = o.rejected ? v * dbToGain(-12) : v;
      I.hold.triggerAttackRelease(tr("E5", k), 0.05, t, w);
      I.hold.triggerAttackRelease(tr("B5", k), 0.11, t + 0.05, w);
    },
    "SFX-07"(t, o, v) { // 1~4줄 화음, 콤보 중이면 (combo) 반음 올림 최대 +12
      const n = Math.min(4, Math.max(1, o.lines ?? 1));
      const notes = [["C5"], ["C5", "G5"], ["C5", "E5", "G5"], ["C5", "E5", "G5", "C6"]][n - 1];
      const up = Math.min(12, Math.max(0, o.combo ?? 0));
      room(I.lines, n, t);
      I.lines.set({ envelope: { decay: 0.25 * n } });
      const dur = [0.22, 0.3, 0.42, 0.9][n - 1];
      I.lines.triggerAttackRelease(notes.map((x) => tr(x, up)), dur, t, v * dbToGain(2 * (n - 1))); // −12/−10/−8/−6dB
      if (n === 4) {
        I.thud.triggerAttackRelease("C1", 0.4, t, v);
        I.rise.triggerAttackRelease(0.61, t, v);
      }
    },
    "SFX-08"(t, o, v) { // 콤보: D5 + (combo−1)반음, 45ms 뒤 완전5도 / ≥5 옥타브 / ≥7 반짝임
      const c = Math.max(1, o.combo ?? 1);
      const root = tr("D5", Math.min(12, c - 1));
      const fifth = Tone.Frequency(root).transpose(7).toFrequency();
      room(I.combo, 4, t);
      I.combo.triggerAttackRelease(c >= 5 ? [root, root * 2] : [root], 0.16, t, v);
      I.combo.triggerAttackRelease(c >= 5 ? [fifth, fifth * 2] : [fifth], 0.115, t + 0.045, v);
      if (c >= 7) I.sparkle.triggerAttackRelease(1200, 0.2, t, v);
    },
    "SFX-09"(t, o, v) { // T-Spin 종 A5 + 반짝임 E6·A6 30ms / B2B 합창 찌르기 [A4, C#5, E5]
      I.bellT.triggerAttackRelease("A5", 0.9, t, v);
      I.glint.triggerAttackRelease("E6", 0.3, t + 0.03, v);
      I.glint.triggerAttackRelease("A6", 0.3, t + 0.06, v);
      if (o.b2b) I.choir.triggerAttackRelease(["A4", "C#5", "E5"], 0.6, t, v);
    },
    "SFX-10"(t, o, v) { // 공격 발사 휙 + 톱니 C4→C6 / cancel 핑 / reflect C6→C4→C6 / wind 잡음만 0.12s
      if (o.variant === "cancel") return I.ping.triggerAttackRelease(880, 0.18, t, v);
      const dur = o.variant === "wind" ? 0.12 : 0.25;
      sweep(I.whooshF, 500, 7000, t, dur);
      I.whoosh.triggerAttackRelease(dur, t, o.variant === "wind" ? v * dbToGain(-2) : v);
      if (o.variant === "wind") return;
      const path = o.variant === "reflect" ? ["C6", "C4", "C6"] : ["C4", "C6"];
      I.saw.triggerAttackRelease(path[0], 0.22, t, v);
      path.slice(1).forEach((p, i) => I.saw.frequency.exponentialRampToValueAtTime(Tone.Frequency(p).toFrequency(),
        t + (0.22 * (i + 1)) / (path.length - 1)));
    },
    "SFX-11"(t, o, v) { // 공격 받음: 막 C1 쿵 + 갈색 잡음 Distortion 0.5 → 900Hz (3음)
      I.hitM().triggerAttackRelease("C1", 0.26, t, v);
      I.hitN().triggerAttackRelease(0.18, t, v);
    },
    "SFX-12"(t, o, v) { // 악한 영 드론 — 등급별 화음, 보스 A1→E1 1.5s + Distortion + 잡음, 파리·봉인 층
      const tier = Math.max(1, Math.min(6, o.tier ?? 1));
      const isBoss = tier >= 6 || o.boss;
      const hold = o.short ? 0.4 : 1.2;
      I.droneV.volume.setValueAtTime(isBoss ? -8 : -14 + 1.5 * (tier - 1), t); // 등급마다 +1.5dB, 보스 −8dB
      I.droneDist.wet.setValueAtTime(isBoss ? 1 : 0, t);
      if (isBoss) {
        I.boss.triggerAttackRelease("A1", hold + 0.3, t, v);
        I.boss.frequency.exponentialRampToValueAtTime(Tone.Frequency("E1").toFrequency(), t + 1.5);
      } else {
        const chord = [["D2"], ["D2", "A1"], ["D2", "G#1"], ["D1", "D2", "G#1"], ["D1", "D2", "G#1"]][tier - 1];
        room(I.drone, chord.length, t);
        I.drone.triggerAttackRelease(chord, hold, t, v);
      }
      if (tier >= 5) I.hiss.triggerAttackRelease(hold, t, v);
      if (o.layer === "fly") fly(t, (o.layerMs ?? 5000) / 1000, v);
      if (o.layer === "murmur") I.hiss.triggerAttackRelease(hold, t, v * dbToGain(-2)); // S-03 브라운 잡음 −26dB
      if (o.layer === "lead") I.thud.triggerAttackRelease("C1", 0.4, t, v); // S-11 무거운 쿵 MembraneSynth C1 −6dB
      if (o.layer === "gnaw") for (let i = 0; i < 4; i += 1) I.gnaw.triggerAttackRelease(0.03, t + 0.6 + i * 0.06, v);
      if (o.layer === "seal") { // 쇠사슬 2회 (간격 RTM §5 DCL-008: 0.3s)
        I.chain.triggerAttackRelease(200, 0.4, t, v);
        I.chain.triggerAttackRelease(200, 0.4, t + 0.3, v);
      }
    },
    "SFX-13"(t, o, v) { // 천사 합창 화음 + 천사별 강세
      const CH = { michael: ["D4", "F#4", "A4", "D5"], gabriel: ["E4", "G#4", "B4", "E5"],
        cherubim: ["F4", "A4", "C5", "F5"],
        seraphim: ["G4", "B4", "D5", "G5"], ministering_spirits: ["A3", "C#4", "E4", "A4"] };
      if (o.disguise) return disguise(t, (o.slideAtMs ?? 1500) / 1000, v);
      const id = CH[o.angel] ? o.angel : "michael";
      const w = id === "ministering_spirits" ? v * dbToGain(-6) : v;
      I.wheel.wet.setValueAtTime(id === "cherubim" ? 1 : 0, t);
      const times = id === "seraphim" ? [0, 0.25, 0.5] : [0]; // "Holy, holy, holy" — Isaiah 6:3
      for (const dt of times) I.angel.triggerAttackRelease(CH[id], 1.6 - dt, t + dt, w);
      if (id === "michael") I.horn.triggerAttackRelease("D5", 0.6, t, w);
      if (id === "gabriel") {
        I.horn.triggerAttackRelease("E5", 0.2, t, w);
        I.horn.triggerAttackRelease("B5", 0.5, t + 0.2, w);
      }
    },
    "SFX-14"(t, o, v) { // 스킬 공통 층 + 위인 층
      if (!o.rockOnly) {
        I.rise14.triggerAttackRelease("C5", 0.15, t, v);
        I.rise14.frequency.exponentialRampToValueAtTime(Tone.Frequency("C6").toFrequency(), t + 0.15);
        I.chant.triggerAttackRelease(["C4", "E4", "G4"], 1.2, t, v);
      }
      if (o.hero === "david") {
        for (const dt of [0, 0.15]) {
          sweep(I.swishF, 1000, 3000, t + dt, 0.15);
          I.swish.triggerAttackRelease(0.15, t + dt, v);
        }
        I.crash.triggerAttackRelease("E2", 0.4, t + 0.66, v); // 휘두르기 300ms + 돌 비행 360ms 뒤 충돌
      } else if (o.hero === "solomon") {
        ["C5", "E5", "G5", "B5", "D6", "F#6"].forEach((n, i) => I.harp.triggerAttack(n, t + i * 0.035));
      } else if (o.hero === "peter") {
        I.rock.triggerAttackRelease("C1", 0.5, t, v);
        if (!o.rockOnly) I.rockPad.triggerAttackRelease(["C3", "G3", "C4"], 1.0, t, v);
      } else if (o.hero === "paul") {
        I.quake.triggerAttackRelease(1.1, t, v);
        I.snap.triggerAttackRelease(300, 0.3, t + 0.4, v);
        I.snap.triggerAttackRelease(300, 0.3, t + 0.7, v);
      }
    },
    "SFX-15"(t, o, v) { // 카운트다운 숫자 A4 0.11s / 시작 STAND [A4, C#5, E5, A5] 0.8s
      if (o.kind === "start") I.stand.triggerAttackRelease(["A4", "C#5", "E5", "A5"], 0.8, t, v);
      else I.beep.triggerAttackRelease("A4", 0.11, t, v);
    },
    "SFX-16"(t, o, v) { // 승리 팡파르 120BPM (8분 = 0.25s) — short: 앞 3음 0.6s (M-02)
      const seq = [["G4", 0, 0.25], ["C5", 0.25, 0.25], ["E5", 0.5, 0.25], ["G5", 0.75, 0.5], ["C5", 1.25, 0.083],
        ["E5", 1.333, 0.083], ["G5", 1.417, 0.083]];
      const k = o.short ? 0.8 : 1; // 앞 3음을 0.6s 안에
      for (const [n, at, d] of o.short ? seq.slice(0, 3) : seq) I.fanfare.triggerAttackRelease(n, d * k, t + at * k, v);
      I.timp.triggerAttackRelease("C2", 0.4, t, v);
      if (o.short) return;
      I.fanfare.triggerAttackRelease(["C4", "E4", "G4", "C5", "E5"], 1.6, t + 1.5, v);
      I.timp.triggerAttackRelease("G1", 0.4, t + 1.0, v);
      I.timp.triggerAttackRelease("C2", 0.6, t + 2.0, v);
    },
    "SFX-17"(t, o, v) { // 패배 E4 0.35 → C4 0.35 → A3 0.9 + 드론 A1 — short: 앞 2음 0.7s (M-03)
      const seq = [["E4", 0, 0.35], ["C4", 0.35, 0.35], ["A3", 0.7, 0.9]].slice(0, o.short ? 2 : 3);
      for (const [n, at, d] of seq) I.lose.triggerAttackRelease(n, d, t + at, v);
      I.loseDrone.triggerAttackRelease("A1", o.short ? 0.7 : 1.6, t, v);
    },
  };

  /** SFX-12 파리 층: AMOscillator 180Hz, 변조 30Hz, −26dB, 효과 시간 동안 */
  function fly(t, sec, v) {
    const vol = new Tone.Volume(-26 + 20 * Math.log10(Math.max(v, 1e-4))).connect(mixer.sfxIn);
    const osc = new Tone.AMOscillator({ frequency: 180, harmonicity: 30 / 180 }).connect(vol);
    osc.start(t).stop(t + sec);
    osc.onstop = () => {
      osc.dispose();
      vol.dispose();
    };
  }

  /** S-13: SFX-13을 +30센트 어긋나게 → slideAt에 세 온음(−600센트) 아래로 미끄러져 SFX-12 등급 5 드론으로 */
  function disguise(t, slideAt, v) {
    I.wheel.wet.setValueAtTime(0, t);
    ["D4", "F#4", "A4", "D5"].forEach((n, i) => {
      const s = I.fallen[i];
      s.detune.cancelScheduledValues(t);
      s.detune.setValueAtTime(30, t);
      s.detune.setValueAtTime(30, t + slideAt);
      s.detune.linearRampToValueAtTime(-570, t + slideAt + 0.4);
      s.triggerAttackRelease(n, slideAt + 0.4, t, v);
    });
    // 드론은 그 시각에 지금 재생으로 (미래 시각 예약은 그 사이 다른 SFX-12의 즉시 재생과 시간 순서가 어긋남)
    setTimeout(() => {
      try {
        PLAY["SFX-12"](Tone.now(), { tier: 5 }, v);
      } catch (err) {
        console.error("SFX-12 미끄러짐 실패", err);
      }
    }, slideAt * 1000);
  }

  return {
    build,
    /**
     * 효과음 재생 (Tone.now() 즉시). 같은 id가 30ms 안이면 생략(SFX-07 제외 — §4.8). 실패해도 예외를 던지지 않는다.
     * @param {string} id SFX-01~SFX-17 @param {{ db?: number } & Record<string, any>} [o] db = 재생별 음량 오프셋
     * @returns {boolean} 재생했는가
     */
    play(id, o = {}) {
      if (!PLAY[id] || !build()) return false;
      try {
        const t = Tone.now();
        if (id !== "SFX-07" && last[id] !== undefined && t - last[id] < 0.03) return false;
        last[id] = t;
        PLAY[id](t, o, dbToGain(o.db ?? 0));
        return true;
      } catch (err) {
        console.error(`효과음 ${id} 실패`, err);
        return false;
      }
    },
  };
}
