// TASK-050 · REQ-013 · FR-059 · FR-055 · FR-061 · C-007 — 적응형 BGM: BGM-01 대기실 · BGM-02 대전 3층 · 위기 레이어(124BPM·심장박동·트레몰로) · 콤보 고조 · 덕킹
// 정본: design-vision §2.9 "배경음악"·§4.11 상태 기계, devguide §7.10. 해제 전 호출은 상태만 기억했다가 unlockAudio 성공 시 적용한다.
import { getTone, getBus, onUnlocked, reportAudioError, strictStartTime } from './audio-engine.js';

/** setBgmState 상태 (devguide §7.10) */
export const BGM_STATES = Object.freeze(['lobby', 'battle', 'stopped']);
export const LOBBY_BPM = 72;
export const BATTLE_BPM = 100;
export const DANGER_BPM = 124;
export const DANGER_ENTER_S = 2;          // 위험선 진입: 2초에 걸쳐 100→124BPM
export const DANGER_EXIT_S = 3;           // 이탈: 3초에 걸쳐 원복
export const CROSSFADE_S = 1;             // 교차 페이드 1000ms
export const COMBO_STEP_HZ = 200;         // 패드 필터 +200Hz × 콤보
export const COMBO_MAX_HZ = 1600;         // 상한 +1600Hz
export const COMBO_RELEASE_S = 0.6;       // 콤보 종료 시 600ms에 걸쳐 원복
export const PAD_BASE_CUTOFF_HZ = 800;    // BGM-02 현악 패드 기본 컷오프 (규격 미지정 — 보고서 모호점)
const COMBO_RISE_S = 0.05;
const LOBBY_DB = -20;
const BATTLE_DB = -16;
const DUCK_RAMP_S = 0.2;
const FADE_FLOOR_DB = -80;          // 교차 페이드 시작·끝 (지수 램프는 -Infinity에서 출발할 수 없음)
const HEARTBEAT_GAP_S = 0.18;             // "쿵-쿵" 2타 간격
const MS_PER_S = 1000;
const DISPOSE_MARGIN_MS = 100;

// BGM-01: D 도리안, 4마디 코드 진행 Dm–C–Bb–C (마디당 1화음), 16마디 반복
const LOBBY_CHORDS = [['D3', 'F3', 'A3'], ['C3', 'E3', 'G3'], ['A#2', 'D3', 'F3'], ['C3', 'E3', 'G3']];
const LOBBY_ARPEGGIO = [['D5', 'F5', 'A5', 'C6'], ['C5', 'E5', 'G5', 'B5'], ['A#4', 'D5', 'F5', 'A5'], ['C5', 'E5', 'G5', 'B5']];
const LOBBY_LOOP_BARS = 16;
const SIXTEENTHS_PER_BAR = 16;
// BGM-02: D 단조
const BATTLE_BASS_NOTE = 'D2';
const BATTLE_PAD_CHORD = ['D3', 'F3', 'A3'];
const KICK_NOTE = 'C1';
const HEARTBEAT_NOTE = 'E1';
const TREMOLO_CHORD = ['A3', 'D4'];

// FR-061 콤보 고조: 패드 컷오프 = 기본 + 200Hz × 콤보 (상한 +1600Hz) — 순수 함수
export function comboCutoffHz(combo) {
  const c = Math.max(0, Math.floor(Number(combo) || 0));
  return PAD_BASE_CUTOFF_HZ + Math.min(COMBO_STEP_HZ * c, COMBO_MAX_HZ);
}

// FR-059 상태별 템포 (대기 72 · 전투 100 · 위기 124) — 순수 함수
export function bgmTempo(state, inDanger) {
  if (state === 'lobby') return LOBBY_BPM;
  if (state === 'battle') return inDanger ? DANGER_BPM : BATTLE_BPM;
  return null;
}

// 덕킹 중첩: 활성 덕킹 중 가장 깊은 값 1개 (합산하지 않음), 없으면 0dB — 순수 함수
export function effectiveDuckDb(ducks) {
  let deepest = 0;
  for (const db of ducks) if (Number.isFinite(db) && db < deepest) deepest = db;
  return deepest;
}

let desiredState = 'stopped';
let playing = null;          // { state, fade, nodes[], loops[], padFilter?, dangerGain? }
let duckNode = null;
let danger = false;
let combo = 0;
const ducks = new Set();     // { db } 토큰

function loop(T, track, interval, cb) {
  const l = new T.Loop((time) => {
    try {
      cb(time);
    } catch (err) {
      reportAudioError('bgm-loop', err);
    }
  }, interval);
  track.loops.push(l);
  return l;
}

// 광야 BUG-003: 단음 신스(celesta·bass·hat·kick·heart)는 strictStartTime으로 시작 시각을 엄격히 증가시킨다 (audio-engine.js)

function ensureDuckNode(T) {
  if (duckNode) return duckNode;
  const music = getBus('music');
  if (!music) return null;
  duckNode = new T.Volume(effectiveDuckDb(duckSet())).connect(music);
  return duckNode;
}

function duckSet() {
  return [...ducks].map((d) => d.db);
}

function buildLobby(T, fade) {
  const track = { state: 'lobby', fade, nodes: [], loops: [] };
  const pad = new T.PolySynth(T.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.8, decay: 0.5, sustain: 0.7, release: 1.5 } }).connect(fade);
  const celesta = new T.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.2 } }).connect(fade);
  celesta.volume.value = -6;
  track.nodes.push(pad, celesta);
  let bar = 0;
  let step = 0;
  loop(T, track, '1m', (time) => {
    pad.triggerAttackRelease(LOBBY_CHORDS[bar % LOBBY_CHORDS.length], '1m', time);
    bar = (bar + 1) % LOBBY_LOOP_BARS;
  });
  loop(T, track, '16n', (time) => {
    const chordIndex = Math.floor(step / SIXTEENTHS_PER_BAR) % LOBBY_ARPEGGIO.length;
    const notes = LOBBY_ARPEGGIO[chordIndex];
    celesta.triggerAttackRelease(notes[step % notes.length], '16n', strictStartTime(celesta, time));
    step = (step + 1) % (LOBBY_LOOP_BARS * SIXTEENTHS_PER_BAR);
  });
  return track;
}

function buildBattle(T, fade) {
  const track = { state: 'battle', fade, nodes: [], loops: [] };
  // ① 베이스 펄스 8분음표
  const bass = new T.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.05 } }).connect(fade);
  // ② 타악: 킥 1·3박, 하이햇 8분음표
  const kick = new T.MembraneSynth().connect(fade);
  const hat = new T.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.04, sustain: 0 } }).connect(fade);
  hat.volume.value = -14;
  // ③ 현악 패드 (콤보 고조 필터)
  const padFilter = new T.Filter({ frequency: comboCutoffHz(combo), type: 'lowpass' }).connect(fade);
  const pad = new T.PolySynth(T.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1 } }).connect(padFilter);
  pad.volume.value = -8;
  // 위기 레이어: 심장박동(매 박 "쿵-쿵" 2타) + 현악 트레몰로 — 게인 0/1로 진입·이탈
  const dangerGain = new T.Gain(danger ? 1 : 0).connect(fade);
  const heart = new T.MembraneSynth({ pitchDecay: 0.05 }).connect(dangerGain);
  const tremolo = new T.PolySynth(T.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.005, decay: 0.05, sustain: 0.5, release: 0.03 } })
    .connect(dangerGain);
  tremolo.volume.value = -14;
  track.nodes.push(bass, kick, hat, padFilter, pad, dangerGain, heart, tremolo);
  track.padFilter = padFilter;
  track.dangerGain = dangerGain;
  loop(T, track, '8n', (time) => {
    bass.triggerAttackRelease(BATTLE_BASS_NOTE, '16n', strictStartTime(bass, time));
    hat.triggerAttackRelease('32n', strictStartTime(hat, time));
  });
  loop(T, track, '2n', (time) => kick.triggerAttackRelease(KICK_NOTE, '8n', strictStartTime(kick, time)));
  loop(T, track, '1m', (time) => pad.triggerAttackRelease(BATTLE_PAD_CHORD, '1m', time));
  loop(T, track, '4n', (time) => {
    heart.triggerAttackRelease(HEARTBEAT_NOTE, '16n', strictStartTime(heart, time));
    heart.triggerAttackRelease(HEARTBEAT_NOTE, '16n', strictStartTime(heart, time + HEARTBEAT_GAP_S));
  });
  loop(T, track, '32n', (time) => tremolo.triggerAttackRelease(TREMOLO_CHORD, '64n', time));
  return track;
}

function disposeTrack(track) {
  try {
    for (const l of track.loops) l.dispose();
    for (const n of track.nodes) n.dispose();
    track.fade.dispose();
  } catch (err) {
    reportAudioError('bgm-dispose', err);
  }
}

function fadeOut(track) {
  try {
    track.fade.volume.rampTo(FADE_FLOOR_DB, CROSSFADE_S);
  } catch (err) {
    reportAudioError('bgm-fade', err);
  }
  setTimeout(() => disposeTrack(track), CROSSFADE_S * MS_PER_S + DISPOSE_MARGIN_MS);
}

function applyState() {
  const T = getTone();
  if (!T) return;
  if (playing && playing.state === desiredState) return;
  try {
    if (playing) fadeOut(playing);
    playing = null;
    if (desiredState === 'stopped') return;
    const out = ensureDuckNode(T);
    if (!out) return;
    const transport = T.getTransport();
    transport.bpm.cancelScheduledValues(T.now());
    transport.bpm.value = bgmTempo(desiredState, danger);
    const fade = new T.Volume(FADE_FLOOR_DB).connect(out);
    playing = desiredState === 'lobby' ? buildLobby(T, fade) : buildBattle(T, fade);
    for (const l of playing.loops) l.start();
    fade.volume.rampTo(desiredState === 'lobby' ? LOBBY_DB : BATTLE_DB, CROSSFADE_S);
    if (transport.state !== 'started') transport.start();
  } catch (err) {
    reportAudioError('bgm-state', err);
  }
}

// FR-059 BGM 상태 전환 — 'lobby' BGM-01 / 'battle' BGM-02 / 'stopped' 정지 (교차 페이드 1000ms). 전투 밖으로 나가면 콤보·위기 초기화
export function setBgmState(state) {
  if (!BGM_STATES.includes(state)) return;
  desiredState = state;
  if (state !== 'battle') {
    danger = false;
    combo = 0;
  }
  applyState();
}

// FR-061 콤보 고조 — 패드 필터 +200Hz × 콤보 (상한 +1600), 0이면 600ms에 걸쳐 원복
export function setComboLevel(level) {
  combo = Math.max(0, Math.floor(Number(level) || 0));
  if (!playing || !playing.padFilter) return;
  try {
    playing.padFilter.frequency.rampTo(comboCutoffHz(combo), combo > 0 ? COMBO_RISE_S : COMBO_RELEASE_S);
  } catch (err) {
    reportAudioError('bgm-combo', err);
  }
}

// FR-055 · FR-059 위기 레이어 — 진입: 2초에 걸쳐 124BPM + 심장박동·트레몰로, 이탈: 3초에 걸쳐 원복
export function setDanger(inDanger) {
  const next = Boolean(inDanger);
  if (next === danger) return;
  danger = next;
  const T = getTone();
  if (!T || !playing || playing.state !== 'battle') return;
  try {
    const rampS = danger ? DANGER_ENTER_S : DANGER_EXIT_S;
    T.getTransport().bpm.rampTo(bgmTempo('battle', danger), rampS);
    playing.dangerGain.gain.rampTo(danger ? 1 : 0, rampS);
  } catch (err) {
    reportAudioError('bgm-danger', err);
  }
}

function applyDuck() {
  if (!duckNode) return;
  try {
    duckNode.volume.rampTo(effectiveDuckDb(duckSet()), DUCK_RAMP_S);
  } catch (err) {
    reportAudioError('bgm-duck', err);
  }
}

// FR-059 덕킹 — 음악 버스 일시 감쇠 (말씀 대결 −6dB, 예수님 −9dB). 반환한 release()를 부르면 해제 (여러 번 불러도 1회)
export function duckMusic(db) {
  const token = { db: Math.min(0, Number(db) || 0) };
  ducks.add(token);
  applyDuck();
  return function release() {
    if (!ducks.delete(token)) return;
    applyDuck();
  };
}

// 해제 전에 요청된 상태(예: 부팅 직후 'lobby')를 해제 시점에 적용
onUnlocked(() => {
  const T = getTone();
  if (T) ensureDuckNode(T);
  applyState();
  applyDuck();
});
