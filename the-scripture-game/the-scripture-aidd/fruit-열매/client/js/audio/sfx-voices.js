// sfx-voices.js — SFX-01~SFX-17 악기·효과 노드 생성만 (재생 레시피는 sfx.js)
// TASK-050-2 (D-03B 분할 — task-wall §3.4 #19-1) | REQ-013 FR-058 C-007 | ARCH-006 | design-vision §4.7.1 동시 발음 제한·
// §4.7.2 악기·옵션 열 | RTM §5 DCL-008
// Tone.start() 직후 한 번만 만든다(§4.7.1 악기 생성 시점 — 재생마다 new 0). 음량 열(dB)은 악기 volume에 그대로.
import * as Tone from "tone";

export const env = (a, d, s, r) => ({ attack: a, decay: d, sustain: s, release: r });

/**
 * §4.7.1 PolySynth 동시 발음 상한 n — 상한을 넘기면 sfx.js가 이전 음을 release한다. Tone은 release 꼬리가 끝날 때까지
 * 목소리를 붙잡으므로 maxPolyphony는 2n(꼬리 여유)으로 두어 새 음이 버려지지 않게 한다 @param {any} poly @param {number} n
 */
export function limit(poly, n) {
  poly.voiceLimit = n;
  poly.maxPolyphony = n * 2;
  return poly;
}

/** 단음 악기 N개 돌려 쓰기 — 넘치면 가장 오래된 음이 다시 울림(= release) (§4.7.1 동시 발음 제한) */
function voices(n, make) {
  const list = Array.from({ length: n }, make);
  let i = 0;
  return () => list[(i = (i + 1) % n)];
}

/**
 * SFX 악기 묶음 생성 — 실패하면 예외를 그대로 던진다(호출자 sfx.js가 잡아 소리 없이 계속).
 * @param {ReturnType<typeof import("./mixer.js").createMixer>} mixer @param {any} out mixer.sfxIn (spiritMute)
 */
export function buildSfxVoices(mixer, out) {
  const flt = (type, frequency, Q = 1) => new Tone.Filter({ type, frequency, Q });
  const to = (node, ...chain) => (chain.length ? node.chain(...chain, out) : node.connect(out));
  const short = (node, amt) => mixer.send(node, "short", amt);
  const long = (node, amt) => mixer.send(node, "long", amt);
  const hp600 = flt("highpass", 600).connect(out);
  const move = voices(2, () => new Tone.Synth({ oscillator: { type: "triangle" }, envelope: env(0.001, 0.035, 0, 0.02),
    volume: -24 }).connect(hp600));
  const rotate = new Tone.Synth({ oscillator: { type: "square" }, envelope: env(0.002, 0.06, 0, 0.03), volume: -22 });
  to(rotate, flt("lowpass", 3500));
  const lp1400 = flt("lowpass", 1400).connect(out);
  const soft = voices(2, () => new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: env(0.001, 0.025, 0, 0.01),
    volume: -30 }).connect(lp1400));
  const dropA = to(new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: env(0.001, 0.32, 0, 0.08),
    volume: -8 }));
  const dropBf = flt("bandpass", 4000, 1.2);
  const dropB = to(new Tone.NoiseSynth({ noise: { type: "white" }, envelope: env(0.001, 0.12, 0, 0.02), volume: -16 }),
    dropBf);
  const land = to(new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 2, envelope: env(0.001, 0.11, 0, 0.05),
    volume: -18 }));
  const hold = to(new Tone.FMSynth({ harmonicity: 3, modulationIndex: 8, envelope: env(0.003, 0.1, 0, 0.05),
    volume: -20 }));
  short(hold, 0.15);
  const lines = to(new Tone.PolySynth(Tone.FMSynth, { harmonicity: 2, modulationIndex: 6, volume: -12,
    envelope: env(0.005, 0.25, 0.2, 0.4) }));
  limit(lines, 4); // SFX-07 4음
  short(lines, 0.35);
  const thud = to(new Tone.MembraneSynth({ volume: -6 }));
  // SFX-07 4줄 솟음 잡음 — 음량은 RTM §5 DCL-008 (−20dB)
  const rise = to(new Tone.NoiseSynth({ noise: { type: "white" }, envelope: env(0.01, 0.6, 0, 0.05), volume: -20 }));
  const combo = to(new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: env(0.002, 0.12, 0, 0.08),
    volume: -16 }), new Tone.FeedbackDelay({ delayTime: 0.08, feedback: 0.2, wet: 0.2 }));
  const sparkle = to(new Tone.MetalSynth({ harmonicity: 5.1, envelope: { decay: 0.2, release: 0.05 }, volume: -26 }));
  const bellT = to(new Tone.FMSynth({ harmonicity: 3.01, modulationIndex: 14, envelope: env(0.001, 0.6, 0, 0.8),
    volume: -10 }));
  long(bellT, 0.4);
  const glint = to(new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: env(0.001, 0.6, 0, 0.8),
    volume: -10 }));
  long(glint, 0.4);
  const choir = to(new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsine", count: 3, spread: 30 },
    envelope: env(0.02, 0.3, 0.4, 0.6), volume: -12 }));
  const whooshF = flt("bandpass", 500);
  const whoosh = to(new Tone.NoiseSynth({ noise: { type: "white" }, envelope: env(0.005, 0.25, 0, 0.05), volume: -16 }),
    whooshF);
  const saw = to(new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: env(0.005, 0.2, 0, 0.05), volume: -20 }),
    flt("lowpass", 5000));
  const ping = to(new Tone.MetalSynth({ harmonicity: 5.1, modulationIndex: 16, resonance: 3000, octaves: 1.5,
    envelope: { decay: 0.18, release: 0.05 }, volume: -18 }));
  const hitM = voices(3, () => to(new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 4,
    envelope: env(0.001, 0.25, 0, 0.1), volume: -6 })));
  const hitChain = [new Tone.Distortion(0.5), flt("lowpass", 900)];
  hitChain[0].chain(hitChain[1], out);
  const hitN = voices(3, () => new Tone.NoiseSynth({ noise: { type: "brown" }, envelope: env(0.001, 0.18, 0, 0.05),
    volume: -12 }).connect(hitChain[0]));
  // SFX-12 드론: fatsawtooth(count 3, spread 35) → lowpass 280Hz Q 4 (LFO 0.4Hz ±120Hz) → 엔벨로프, 3음
  const droneV = new Tone.Volume(-14).connect(out);
  const droneDist = new Tone.Distortion({ distortion: 0.4, wet: 0 }).connect(droneV);
  const droneF = flt("lowpass", 280, 4).connect(droneDist);
  new Tone.LFO({ frequency: 0.4, min: 160, max: 400 }).connect(droneF.frequency).start();
  const fat = { type: "fatsawtooth", count: 3, spread: 35 };
  const drone = new Tone.PolySynth(Tone.Synth, { oscillator: fat, envelope: env(0.35, 0.3, 0.8, 1.0) }).connect(droneF);
  limit(drone, 3); // SFX-12 3음
  const boss = new Tone.Synth({ oscillator: fat, envelope: env(0.35, 0.3, 0.8, 2.2) }).connect(droneF);
  const hiss = to(new Tone.NoiseSynth({ noise: { type: "brown" }, envelope: env(0.35, 0.3, 0.8, 1.0), volume: -24 }));
  const chain = to(new Tone.MetalSynth({ envelope: { decay: 0.4, release: 0.1 }, volume: -14 }));
  // S-09 갉는 소리: 잡음 대역 통과 2.5kHz 30ms (음량 RTM §5 DCL-008: −20dB)
  const gnaw = to(new Tone.NoiseSynth({ noise: { type: "white" }, envelope: env(0.001, 0.03, 0, 0.005), volume: -20 }),
    flt("bandpass", 2500, 2));
  // SFX-13 합창: fatsine(count 4, spread 24) → Chorus 4Hz·2.5ms·0.5 → (그룹: AutoFilter 6Hz) → 긴 Reverb 0.5
  const angelV = new Tone.Volume(-12).connect(out);
  const wheel = new Tone.AutoFilter({ frequency: 6, wet: 0 }).connect(angelV).start();
  const chorus = new Tone.Chorus({ frequency: 4, delayTime: 2.5, depth: 0.5 }).connect(wheel).start();
  long(chorus, 0.5);
  const angelOpts = { oscillator: { type: "fatsine", count: 4, spread: 24 }, envelope: env(0.25, 0.4, 0.7, 1.6) };
  const angel = new Tone.PolySynth(Tone.Synth, angelOpts).connect(chorus);
  // S-13 가장한 사탄: 미끄러짐(detune 램프)이 필요해 단음 4개 (RTM §5 DCL-008: 화음은 미가엘 화음)
  const fallen = Array.from({ length: 4 }, () => new Tone.Synth(angelOpts).connect(chorus));
  const horn = to(new Tone.FMSynth({ harmonicity: 1, modulationIndex: 4, envelope: env(0.02, 0.3, 0.5, 0.4),
    volume: -14 }));
  const rise14 = to(new Tone.Synth({ oscillator: { type: "sine" }, envelope: env(0.005, 0.15, 0, 0.05), volume: -18 }));
  const chant = to(new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsine" }, envelope: env(0.1, 0.3, 0.6, 1.2),
    volume: -16 }));
  const swishF = flt("bandpass", 1000);
  const swish = to(new Tone.NoiseSynth({ noise: { type: "white" }, envelope: env(0.005, 0.15, 0, 0.02), volume: -16 }),
    swishF);
  const crash = to(new Tone.MembraneSynth({ volume: -10 }));
  const harp = to(new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.9, volume: -14 }));
  const rock = to(new Tone.MembraneSynth({ octaves: 3, volume: -6 }));
  const rockPad = to(new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsine" }, envelope: env(0.05, 0.5, 0.5, 1),
    volume: -14 }));
  const quake = to(new Tone.NoiseSynth({ noise: { type: "brown" }, envelope: env(0.2, 0.9, 0.4, 0.6), volume: -8 }),
    flt("lowpass", 140));
  const snap = to(new Tone.MetalSynth({ harmonicity: 3.1, modulationIndex: 20, envelope: { decay: 0.3, release: 0.05 },
    volume: -16 }));
  const beep = to(new Tone.Synth({ oscillator: { type: "square" }, envelope: env(0.002, 0.1, 0, 0.02), volume: -16 }),
    flt("lowpass", 2500));
  const brass = { oscillator: { type: "fatsawtooth", count: 3, spread: 20 } };
  const stand = to(new Tone.PolySynth(Tone.Synth, { ...brass, envelope: env(0.005, 0.3, 0.3, 0.5), volume: -10 }));
  const fanfare = to(new Tone.PolySynth(Tone.Synth, { ...brass, envelope: env(0.01, 0.2, 0.6, 1.2), volume: -8 }),
    flt("lowpass", 3200));
  long(fanfare, 0.35);
  const timp = to(new Tone.MembraneSynth({ volume: -8 }));
  const lose = to(new Tone.Synth({ oscillator: { type: "triangle" }, envelope: env(0.02, 0.3, 0.5, 0.6), volume: -12 }),
    new Tone.Vibrato(5, 0.1));
  const loseDrone = to(new Tone.Synth({ oscillator: { type: "fatsawtooth" }, envelope: env(0.5, 0, 1, 1.5),
    volume: -20 }), flt("lowpass", 300));
  for (const p of [combo, glint, choir, angel, chant, rockPad, stand, fanfare]) limit(p, 8); // 그 밖 PolySynth 8
  return { move, rotate, soft, dropA, dropB, dropBf, land, hold, lines, thud, rise, combo, sparkle, bellT, glint, choir,
    whoosh, whooshF, saw, ping, hitM, hitN, droneV, droneDist, drone, boss, hiss, chain, gnaw, wheel, angel, fallen,
      horn,
    rise14, chant, swish, swishF, crash, harp, rock, rockPad, quake, snap, beep, stand, fanfare, timp, lose,
    loseDrone };
}
