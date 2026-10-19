// TASK-050 · REQ-013 · FR-058 · FR-061 · C-007 — 조작 효과음 SFX-01~09 Tone.js 합성 + 효과음 공통 음 계산(반음 이동·음량 배율)
// 정본: design-vision §2.9 효과음 표 SFX-01~09 · 사건 → 사운드 큐 맵. 오디오 파일 0개 (C-007, NFR-005).
import { getTone, getBus, onUnlocked, reportAudioError, strictStartTime } from './audio-engine.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const NOTE_PATTERN = /^([A-G])([#b]?)(-?\d)$/;
const MIDI_OCTAVE_OFFSET = 1;            // C4 = MIDI 60
const SEMITONES_PER_OCTAVE = 12;
const MS_PER_S = 1000;

/** SFX-08 콤보 상승음: D5에서 콤보마다 +1반음, 상한 +12 (design-vision §2.9) */
export const COMBO_BASE_NOTE = 'D5';
export const COMBO_MAX_SEMITONES = 12;
/** SFX-07 줄 수별 음 (1줄 C5 / 2줄 C5·E5 / 3줄 C5·E5·G5 / 4줄 C5·E5·G5·C6) */
export const LINE_CLEAR_NOTES = Object.freeze({ 1: ['C5'], 2: ['C5', 'E5'], 3: ['C5', 'E5', 'G5'], 4: ['C5', 'E5', 'G5', 'C6'] });
/** SFX-07 줄 수별 길이 300 / 350 / 400 / 700ms */
export const LINE_CLEAR_MS = Object.freeze({ 1: 300, 2: 350, 3: 400, 4: 700 });
const LINE_ARPEGGIO_STEP_MS = 50;        // "아르페지오 후 화음" — 화음 앞 음 간격
const SOFT_DROP_MIN_GAP_S = 0.05;        // SFX-03 최소 간격 50ms
const HOLD_PORTAMENTO_S = 0.05;          // SFX-06 E5 → B5 포르타멘토 50ms
const COMBO_LOWPASS_HZ = 3000;
const LINE_REVERB_DECAY_S = 1.8;
const HARD_DROP_NOISE_S = 0.08;

/** SFX-01~09 합성 규격 (design-vision §2.9 표 그대로) */
export const CONTROL_CUES = Object.freeze({
  'SFX-01': { name: 'move', db: -18, ms: 60, notes: ['G5'] },
  'SFX-02': { name: 'rotate', db: -16, ms: 70, notes: ['C6'] },
  'SFX-03': { name: 'softDrop', db: -26, ms: 30, notes: [] },
  'SFX-04': { name: 'hardDrop', db: -8, ms: 180, notes: ['C2'] },
  'SFX-05': { name: 'lock', db: -14, ms: 90, notes: ['G2'] },
  'SFX-06': { name: 'hold', db: -16, ms: 120, notes: ['E5', 'B5'] },
  'SFX-07': { name: 'lineClear', db: -10, ms: 300, notes: ['C5'] },
  'SFX-08': { name: 'combo', db: -12, ms: 120, notes: [COMBO_BASE_NOTE] },
  'SFX-09': { name: 'tSpin', db: -10, ms: 500, notes: ['A5'] },
});

// ── 공통 음 계산 (sfx-battle도 사용) ──

/** 음 이름 → MIDI 번호 (예: 'C4' → 60). 형식이 틀리면 null */
export function noteToMidi(note) {
  const m = NOTE_PATTERN.exec(String(note));
  if (!m) return null;
  const name = m[2] === 'b' ? FLAT_TO_SHARP[m[1] + 'b'] || null : m[1] + m[2];
  const index = NOTE_NAMES.indexOf(name);
  if (index < 0) return null;
  return (Number(m[3]) + MIDI_OCTAVE_OFFSET) * SEMITONES_PER_OCTAVE + index;
}

/** MIDI 번호 → 음 이름 (샤프 표기) */
export function midiToNote(midi) {
  const n = Math.round(midi);
  const octave = Math.floor(n / SEMITONES_PER_OCTAVE) - MIDI_OCTAVE_OFFSET;
  return NOTE_NAMES[((n % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE] + octave;
}

// FR-058 opts.semitones 변주 — 음 이름을 반음 이동 (형식이 틀리면 원래 값)
export function transposeNote(note, semitones = 0) {
  const midi = noteToMidi(note);
  const shift = Number(semitones) || 0;
  if (midi === null || shift === 0) return note;
  return midiToNote(midi + shift);
}

// FR-058 opts.volumeScale 0~1 → 큐 dB에 20·log10(배율) 더함 (0이면 무음, 미지정이면 그대로)
export function scaleDb(db, volumeScale) {
  if (volumeScale === undefined || volumeScale === null) return db;
  const s = Math.min(1, Math.max(0, Number(volumeScale) || 0));
  if (s <= 0) return -Infinity;
  return db + 20 * Math.log10(s);
}

// FR-061 · FR-058 SFX-08 콤보 n의 반음 이동 — 콤보 1 = D5, 콤보마다 +1, 상한 +12
export function comboSemitones(combo) {
  const c = Math.floor(Number(combo) || 0);
  return Math.min(Math.max(c - 1, 0), COMBO_MAX_SEMITONES);
}

function clampLines(lines) {
  const n = Math.floor(Number(lines) || 1);
  return Math.min(4, Math.max(1, n));
}

// FR-058 큐 계산 (순수 — 테스트 대상): { id, db, durationMs, notes } 또는 알 수 없는 id면 null
export function resolveControlCue(id, opts = {}) {
  const cue = CONTROL_CUES[id];
  if (!cue) return null;
  let notes = cue.notes;
  let ms = cue.ms;
  if (id === 'SFX-07') {
    const lines = clampLines(opts.lines);
    notes = LINE_CLEAR_NOTES[lines];
    ms = LINE_CLEAR_MS[lines];
  } else if (id === 'SFX-08') {
    notes = [transposeNote(COMBO_BASE_NOTE, comboSemitones(opts.combo === undefined ? 1 : opts.combo))];
  }
  const shift = Number(opts.semitones) || 0;
  const durationMs = Number(opts.durationMs) > 0 ? Number(opts.durationMs) : ms;
  return { id, db: scaleDb(cue.db, opts.volumeScale), durationMs, notes: notes.map((n) => transposeNote(n, shift)) };
}

// ── 음색 (해제 후 1회 생성·재사용, 효과음 버스에 연결) ──

const voices = new Map();
let lastSoftDropAt = -Infinity;

function shortEnv(attack, decay, sustain, release) {
  return { attack, decay, sustain, release };
}

const VOICE_FACTORIES = {
  'SFX-01': (T, out) => ({ synth: new T.Synth({ oscillator: { type: 'triangle' }, envelope: shortEnv(0.001, 0.04, 0, 0.02) }).connect(out) }),
  'SFX-02': (T, out) => ({ synth: new T.FMSynth({ harmonicity: 3, modulationIndex: 6, envelope: shortEnv(0.001, 0.05, 0, 0.02) }).connect(out) }),
  'SFX-03': (T, out) => ({ noise: new T.NoiseSynth({ noise: { type: 'pink' }, envelope: shortEnv(0.001, 0.03, 0, 0.005) }).connect(out) }),
  'SFX-04': (T, out) => ({
    synth: new T.MembraneSynth().connect(out),
    noise: new T.NoiseSynth({ noise: { type: 'white' }, envelope: shortEnv(0.001, HARD_DROP_NOISE_S, 0, 0.02) }).connect(out),
  }),
  'SFX-05': (T, out) => ({ synth: new T.MembraneSynth({ pitchDecay: 0.02 }).connect(out) }),
  'SFX-06': (T, out) => ({
    synth: new T.Synth({ oscillator: { type: 'sine' }, portamento: HOLD_PORTAMENTO_S, envelope: shortEnv(0.005, 0.05, 0.6, 0.03) }).connect(out),
  }),
  'SFX-07': (T, out) => {
    const reverb = new T.Reverb({ decay: LINE_REVERB_DECAY_S }).connect(out);
    return {
      reverb,
      synth: new T.PolySynth(T.Synth, { oscillator: { type: 'sine' } }).connect(reverb),
      layer: new T.PolySynth(T.Synth, { oscillator: { type: 'triangle' } }).connect(reverb),
    };
  },
  'SFX-08': (T, out) => {
    const filter = new T.Filter({ frequency: COMBO_LOWPASS_HZ, type: 'lowpass' }).connect(out);
    return { filter, synth: new T.Synth({ oscillator: { type: 'square' }, envelope: shortEnv(0.002, 0.08, 0.2, 0.03) }).connect(filter) };
  },
  'SFX-09': (T, out) => {
    const reverb = new T.Reverb({ decay: LINE_REVERB_DECAY_S }).connect(out);
    return { reverb, synth: new T.FMSynth({ harmonicity: 5.1, modulationIndex: 12, envelope: shortEnv(0.001, 0.4, 0, 0.1) }).connect(reverb) };
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
  for (const key of ['synth', 'noise', 'layer']) {
    if (voice[key] && voice[key].volume) voice[key].volume.value = db;
  }
}

function playLineClear(voice, cue, t) {
  const total = cue.durationMs / MS_PER_S;
  const step = LINE_ARPEGGIO_STEP_MS / MS_PER_S;
  if (cue.notes.length === 1) {
    voice.synth.triggerAttackRelease(cue.notes, total, t);
    voice.layer.triggerAttackRelease(cue.notes, total, t);
    return;
  }
  cue.notes.forEach((note, i) => {
    voice.synth.triggerAttackRelease(note, step, t + i * step);
  });
  const chordAt = cue.notes.length * step;
  voice.synth.triggerAttackRelease(cue.notes, Math.max(step, total - chordAt), t + chordAt);
  voice.layer.triggerAttackRelease(cue.notes, Math.max(step, total - chordAt), t + chordAt);
}

const PLAYERS = {
  'SFX-01': (v, cue, t) => v.synth.triggerAttackRelease(cue.notes[0], cue.durationMs / MS_PER_S, t),
  'SFX-02': (v, cue, t) => v.synth.triggerAttackRelease(cue.notes[0], cue.durationMs / MS_PER_S, t),
  'SFX-03': (v, cue, t) => v.noise.triggerAttackRelease(cue.durationMs / MS_PER_S, t),
  'SFX-04': (v, cue, t) => {
    v.synth.triggerAttackRelease(cue.notes[0], cue.durationMs / MS_PER_S, t);
    v.noise.triggerAttackRelease(HARD_DROP_NOISE_S, t);
  },
  'SFX-05': (v, cue, t) => v.synth.triggerAttackRelease(cue.notes[0], cue.durationMs / MS_PER_S, t),
  'SFX-06': (v, cue, t) => {
    v.synth.triggerAttack(cue.notes[0], t);
    v.synth.setNote(cue.notes[1], t + 0.001);
    v.synth.triggerRelease(t + cue.durationMs / MS_PER_S);
  },
  'SFX-07': playLineClear,
  'SFX-08': (v, cue, t) => v.synth.triggerAttackRelease(cue.notes[0], cue.durationMs / MS_PER_S, t),
  'SFX-09': (v, cue, t) => v.synth.triggerAttackRelease(cue.notes[0], cue.durationMs / MS_PER_S, t),
};

// FR-058 조작 효과음 SFX-01~09 재생 — 해제 전·미지원·알 수 없는 id면 false(무음). opts: lines·combo·semitones·volumeScale·durationMs
export function playControlSfx(id, opts = {}) {
  const T = getTone();
  if (!T) return false;
  const cue = resolveControlCue(id, opts || {});
  if (!cue) return false;
  try {
    const t = T.now();
    if (id === 'SFX-03') {
      if (t - lastSoftDropAt < SOFT_DROP_MIN_GAP_S) return false;
      lastSoftDropAt = t;
    }
    const voice = getVoice(T, id);
    if (!voice) return false;
    setVoiceDb(voice, cue.db);
    PLAYERS[id](voice, cue, strictStartTime(voice, t)); // 광야 BUG-003 같은 음색 같은 시각 재시작 방지
    return true;
  } catch (err) {
    reportAudioError(id, err);
    return false;
  }
}

// 해제 직후 음색을 미리 만든다 (Reverb 임펄스 생성이 첫 재생 전에 끝나도록)
onUnlocked((T) => {
  try {
    for (const id of Object.keys(VOICE_FACTORIES)) getVoice(T, id);
  } catch (err) {
    reportAudioError('sfx-play-voices', err);
  }
});
