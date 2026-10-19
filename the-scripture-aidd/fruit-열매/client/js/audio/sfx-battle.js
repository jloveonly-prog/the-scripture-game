// TASK-050 · REQ-013 · FR-058 · FR-027 · FR-039 · C-007 — 전투 효과음 SFX-10~17 Tone.js 합성 (공격·영 드론·천사 합창·스킬·카운트다운·승패)
// 정본: design-vision §2.9 효과음 표 SFX-10~17 · 사건 → 사운드 큐 맵. 오디오 파일 0개 (C-007, NFR-005).
// opts.durationMs: 지속형(SFX-12 영 지속·SFX-13 예수님 4000ms)은 유지 길이, 순차형(SFX-14~17)은 앞에서부터 그 길이까지만 재생
//   (예: 말씀 대결 시작 = SFX-15 { durationMs: 100 } 첫 틱, 라운드 승리 = SFX-16 { durationMs: 1200 }, 여리고 = SFX-16 { durationMs: 500 } 첫 2음).
import { getTone, getBus, onUnlocked, reportAudioError, strictStartTime } from './audio-engine.js';
import { transposeNote, scaleDb, noteToMidi } from './sfx-play.js';

const MS_PER_S = 1000;
const A4_HZ = 440;
const A4_MIDI = 69;
const FANFARE_STEP_MS = 60000 / 120 / 2;   // SFX-16 8분음표 @120BPM = 250ms
const DEFEAT_STEP_MS = 60000 / 70 / 2;     // SFX-17 70BPM, 4음이 2200ms 안에 들도록 반 박 간격 (보고서 모호점 참조)
const COUNTDOWN_TICK_MS = 100;
const COUNTDOWN_GAP_MS = 1000;
const COUNTDOWN_LAST_MS = 300;
const DRONE_ATTACK_S = 0.4;
const DRONE_FADE_MS = 1000;
const DRONE_MAX_HOLD_MS = 6000;            // SFX-12 영 효과 지속 동안 유지 (최대 6000ms)
const DRONE_SHORT_HOLD_MS = 3000;          // 봉인 21초·즉시형·줄 단위형은 3000ms 후 1s 페이드
const DRONE_LOWPASS_HZ = 300;
const DRONE_LFO_HZ = 0.3;
const DRONE_LFO_DEPTH_HZ = 100;
const DRONE_SPREAD_CENTS = 30;             // 3중 ±15센트
const DISPOSE_MARGIN_MS = 200;
const ATTACK_SWEEP_BASE_HZ = 400;
const ATTACK_SWEEP_TOP_HZ = 4000;
const RECEIVED_LOWPASS_HZ = 1200;
const RECEIVED_DISTORTION = 0.4;
const DEFEAT_LOWPASS_HZ = 1500;
const CHOIR_REVERB_DECAY_S = 3;

/** SFX-10~17 합성 규격 (design-vision §2.9 표 그대로) */
export const BATTLE_CUES = Object.freeze({
  'SFX-10': { name: 'attackFire', db: -10, ms: 250, events: [{ notes: ['C4'], at: 0, ms: 250, glideTo: 'C6' }] },
  'SFX-11': { name: 'attackReceived', db: -6, ms: 300, events: [{ notes: ['A1'], at: 0, ms: 300 }] },
  'SFX-12': { name: 'spiritDrone', db: -14, ms: DRONE_SHORT_HOLD_MS + DRONE_FADE_MS, events: [{ notes: ['A1'], at: 0, ms: DRONE_SHORT_HOLD_MS }] },
  'SFX-13': { name: 'angelChoir', db: -12, ms: 1800, events: [{ notes: ['D4', 'F#4', 'A4', 'E5'], at: 0, ms: 1800 }] },
  'SFX-14': {
    name: 'skill', db: -12, ms: 1200,
    events: [{ notes: ['G3', 'D4', 'G4', 'B4'], at: 0, ms: 1200 }, { notes: ['C6'], at: 0, ms: 600, bell: true }],
  },
  'SFX-15': {
    name: 'countdown', db: -14, ms: 3300,
    events: [
      { notes: ['A4'], at: 0, ms: COUNTDOWN_TICK_MS },
      { notes: ['A4'], at: COUNTDOWN_GAP_MS, ms: COUNTDOWN_TICK_MS },
      { notes: ['A4'], at: 2 * COUNTDOWN_GAP_MS, ms: COUNTDOWN_TICK_MS },
      { notes: ['A5'], at: 3 * COUNTDOWN_GAP_MS, ms: COUNTDOWN_LAST_MS },
    ],
  },
  'SFX-16': {
    name: 'victory', db: -8, ms: 2600,
    events: [
      { notes: ['C5'], at: 0, ms: FANFARE_STEP_MS },
      { notes: ['E5'], at: FANFARE_STEP_MS, ms: FANFARE_STEP_MS },
      { notes: ['G5'], at: 2 * FANFARE_STEP_MS, ms: FANFARE_STEP_MS },
      { notes: ['C6'], at: 3 * FANFARE_STEP_MS, ms: FANFARE_STEP_MS },
      { notes: ['C5', 'E5', 'G5', 'C6'], at: 4 * FANFARE_STEP_MS, ms: 1500 },
    ],
  },
  'SFX-17': {
    name: 'defeat', db: -12, ms: 2200,
    events: [
      { notes: ['E4'], at: 0, ms: DEFEAT_STEP_MS },
      { notes: ['D4'], at: DEFEAT_STEP_MS, ms: DEFEAT_STEP_MS },
      { notes: ['C4'], at: 2 * DEFEAT_STEP_MS, ms: DEFEAT_STEP_MS },
      { notes: ['A3'], at: 3 * DEFEAT_STEP_MS, ms: 2200 - 3 * DEFEAT_STEP_MS },
    ],
  },
});

// FR-058 SFX-12 드론 유지 길이: 영 지속 durationMs(≤6000)면 그대로, 0·미지정·6000 초과(봉인 21초)면 3000ms
export function droneHoldMs(durationMs) {
  const d = Number(durationMs);
  if (!Number.isFinite(d) || d <= 0 || d > DRONE_MAX_HOLD_MS) return DRONE_SHORT_HOLD_MS;
  return d;
}

function truncateEvents(events, limitMs) {
  return events.filter((e) => e.at < limitMs).map((e) => ({ ...e, ms: Math.min(e.ms, limitMs - e.at) }));
}

// FR-058 큐 계산 (순수 — 테스트 대상): { id, db, durationMs, events[{notes, at, ms, …}] } 또는 알 수 없는 id면 null
export function resolveBattleCue(id, opts = {}) {
  const cue = BATTLE_CUES[id];
  if (!cue) return null;
  const custom = Number(opts.durationMs) > 0 ? Number(opts.durationMs) : null;
  let events = cue.events;
  let durationMs = cue.ms;
  if (id === 'SFX-12') {
    const hold = droneHoldMs(custom);
    events = [{ ...events[0], ms: hold }];
    durationMs = hold + DRONE_FADE_MS;
  } else if (id === 'SFX-13') {
    if (custom) {
      events = [{ ...events[0], ms: custom }];
      durationMs = custom;
    }
  } else if (custom) {
    events = truncateEvents(events, custom);
    durationMs = Math.min(custom, cue.ms);
  }
  const shift = Number(opts.semitones) || 0;
  const shifted = events.map((e) => ({
    ...e,
    notes: e.notes.map((n) => transposeNote(n, shift)),
    ...(e.glideTo ? { glideTo: transposeNote(e.glideTo, shift) } : {}),
  }));
  return { id, db: scaleDb(cue.db, opts.volumeScale), durationMs, events: shifted };
}

// ── 음색 (해제 후 1회 생성·재사용 — SFX-12 드론만 재생마다 생성·폐기) ──

const voices = new Map();

const VOICE_FACTORIES = {
  'SFX-10': (T, out) => {
    // highpass 400→4000Hz 1회 스윕 (AutoFilter의 LFO는 위상이 재생마다 달라 1회 스윕을 보장하지 못해 Filter 램프로 같은 궤적을 만든다)
    const sweep = new T.Filter({ frequency: ATTACK_SWEEP_BASE_HZ, type: 'highpass' }).connect(out);
    return {
      sweep,
      noise: new T.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.24, sustain: 0, release: 0.01 } }).connect(sweep),
      synth: new T.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.05 } }).connect(out),
    };
  },
  'SFX-11': (T, out) => {
    const lowpass = new T.Filter({ frequency: RECEIVED_LOWPASS_HZ, type: 'lowpass' }).connect(out);
    const dist = new T.Distortion(RECEIVED_DISTORTION).connect(lowpass);
    return {
      lowpass, dist,
      synth: new T.MembraneSynth().connect(dist),
      noise: new T.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.002, decay: 0.28, sustain: 0, release: 0.02 } }).connect(dist),
    };
  },
  'SFX-13': (T, out) => {
    const reverb = new T.Reverb({ decay: CHOIR_REVERB_DECAY_S }).connect(out);
    const chorus = new T.Chorus(4, 2.5, 0.5).connect(reverb).start();
    return { reverb, chorus, synth: new T.PolySynth(T.AMSynth, { envelope: { attack: 0.3, decay: 0.2, sustain: 0.8, release: 1.5 } }).connect(chorus) };
  },
  'SFX-14': (T, out) => ({
    synth: new T.PolySynth(T.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.3 } }).connect(out),
    bell: new T.FMSynth({ harmonicity: 3.5, modulationIndex: 10, envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.2 } }).connect(out),
  }),
  'SFX-15': (T, out) => ({ synth: new T.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.05, sustain: 0.7, release: 0.03 } }).connect(out) }),
  'SFX-16': (T, out) => ({ synth: new T.PolySynth(T.FMSynth, { harmonicity: 1, modulationIndex: 3, envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.1 } }).connect(out) }),
  'SFX-17': (T, out) => {
    const lowpass = new T.Filter({ frequency: DEFEAT_LOWPASS_HZ, type: 'lowpass' }).connect(out);
    return { lowpass, synth: new T.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 } }).connect(lowpass) };
  },
};

function getVoice(T, id) {
  if (voices.has(id)) return voices.get(id);
  const out = getBus('sfx');
  if (!out) return null;
  const voice = VOICE_FACTORIES[id](T, out);
  voices.set(id, voice);
  return voice;
}

function setVoiceDb(voice, db) {
  for (const key of ['synth', 'noise', 'bell']) {
    if (voice[key] && voice[key].volume) voice[key].volume.value = db;
  }
}

function playEvents(voice, cue, t) {
  for (const e of cue.events) {
    const target = e.bell ? voice.bell : voice.synth;
    const notes = e.notes.length === 1 ? e.notes[0] : e.notes;
    target.triggerAttackRelease(notes, e.ms / MS_PER_S, t + e.at / MS_PER_S);
  }
}

// SFX-12 저음 드론: FatOscillator sawtooth 3중 → lowpass 300Hz(LFO 0.3Hz) → 게인(attack 0.4s · 유지 · 1s 페이드) → 효과음 버스
function playDrone(T, cue, t) {
  const out = getBus('sfx');
  if (!out) return false;
  const holdS = cue.events[0].ms / MS_PER_S;
  const fadeS = DRONE_FADE_MS / MS_PER_S;
  const amp = new T.Gain(0).connect(out);
  const filter = new T.Filter({ frequency: DRONE_LOWPASS_HZ, type: 'lowpass' }).connect(amp);
  const lfo = new T.LFO({ frequency: DRONE_LFO_HZ, min: DRONE_LOWPASS_HZ - DRONE_LFO_DEPTH_HZ, max: DRONE_LOWPASS_HZ + DRONE_LFO_DEPTH_HZ });
  lfo.connect(filter.frequency);
  const osc = new T.FatOscillator({ frequency: cue.events[0].notes[0], type: 'sawtooth', count: 3, spread: DRONE_SPREAD_CENTS }).connect(filter);
  osc.volume.value = cue.db;
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(1, t + DRONE_ATTACK_S);
  amp.gain.setValueAtTime(1, t + holdS);
  amp.gain.linearRampToValueAtTime(0, t + holdS + fadeS);
  lfo.start(t);
  osc.start(t);
  osc.stop(t + holdS + fadeS);
  setTimeout(() => {
    try {
      for (const node of [osc, lfo, filter, amp]) node.dispose();
    } catch (err) {
      reportAudioError('SFX-12-dispose', err);
    }
  }, cue.durationMs + DISPOSE_MARGIN_MS);
  return true;
}

function playAttackFire(voice, cue, t) {
  const e = cue.events[0];
  const dur = e.ms / MS_PER_S;
  voice.sweep.frequency.setValueAtTime(ATTACK_SWEEP_BASE_HZ, t);
  voice.sweep.frequency.exponentialRampToValueAtTime(ATTACK_SWEEP_TOP_HZ, t + dur);
  voice.noise.triggerAttackRelease(dur, t);
  voice.synth.triggerAttack(e.notes[0], t);
  voice.synth.frequency.exponentialRampToValueAtTime(noteToHz(e.glideTo), t + dur);
  voice.synth.triggerRelease(t + dur);
}

// 음 이름 → Hz (A4 = 440Hz 평균율)
export function noteToHz(note) {
  const midi = noteToMidi(note);
  return midi === null ? A4_HZ : A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

function playReceived(voice, cue, t) {
  const e = cue.events[0];
  voice.synth.triggerAttackRelease(e.notes[0], e.ms / MS_PER_S, t);
  voice.noise.triggerAttackRelease(e.ms / MS_PER_S, t);
}

// FR-058 전투 효과음 SFX-10~17 재생 — 해제 전·미지원·알 수 없는 id면 false(무음). opts: semitones·volumeScale·durationMs
export function playBattleSfx(id, opts = {}) {
  const T = getTone();
  if (!T) return false;
  const cue = resolveBattleCue(id, opts || {});
  if (!cue) return false;
  try {
    const t = T.now();
    if (id === 'SFX-12') return playDrone(T, cue, t);
    const voice = getVoice(T, id);
    if (!voice) return false;
    setVoiceDb(voice, cue.db);
    // 광야 BUG-003 같은 음색의 시작 시각을 엄격히 증가 (순차 큐는 마지막 예약 음까지)
    const start = strictStartTime(voice, t, Math.max(0, ...cue.events.map((e) => e.at)) / MS_PER_S);
    if (id === 'SFX-10') playAttackFire(voice, cue, start);
    else if (id === 'SFX-11') playReceived(voice, cue, start);
    else playEvents(voice, cue, start);
    return true;
  } catch (err) {
    reportAudioError(id, err);
    return false;
  }
}

// 해제 직후 음색을 미리 만든다 (합창 Reverb 임펄스 생성이 첫 재생 전에 끝나도록)
onUnlocked((T) => {
  try {
    for (const id of Object.keys(VOICE_FACTORIES)) getVoice(T, id);
  } catch (err) {
    reportAudioError('sfx-battle-voices', err);
  }
});
