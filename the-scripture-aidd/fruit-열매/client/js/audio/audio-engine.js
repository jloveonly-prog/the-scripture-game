// TASK-050 · REQ-013 · FR-060 · FR-027 · C-007 · NFR-005 · D-24 — 오디오 컨텍스트·버스(마스터 ← 효과음·음악)·음량·음소거·자동재생 해제
// 정본: design-vision §2.9 "버스·음량", devguide §7.10 오디오 API. Tone.js는 첫 사용자 입력(unlockAudio) 때 동적 import 한다 —
// 그 전에는 AudioContext를 만들지 않으며, AudioContext 미지원·해제 실패 시 모든 재생 함수는 무음 no-op (devguide §3.6).

/** 버스 이름 (devguide §7.10 setVolume bus) */
export const BUSES = Object.freeze(['master', 'sfx', 'music']);
/** FR-060 초기 음량 — 마스터 80, 효과음 80, 음악 60 (design-vision §2.9). 저장하지 않는다 (N-04) */
export const DEFAULT_VOLUMES = Object.freeze({ master: 80, sfx: 80, music: 60 });
const VOLUME_MIN = 0;
const VOLUME_MAX = 100;
const SILENT_DB = -Infinity;

let tone = null;            // 해제 후의 Tone 모듈
let unlocked = false;
let unlocking = null;       // 진행 중인 해제 Promise (중복 호출 1회로 합침)
let buses = null;           // { master, sfx, music } — Tone.Volume
const volumes = { ...DEFAULT_VOLUMES };
let muted = false;
let sfxMuteDepth = 0;       // 겹친 muteSfxBusFor 구간 수 (0보다 크면 효과음 버스 무음)
const unlockListeners = [];
const reportedErrors = new Set();

// FR-060 화면 값 0~100 → dB (0이면 무음, 그 외 20·log10(v/100)) — 순수 함수
export function volumeToDb(value) {
  const v = clampVolume(value);
  if (v === null || v <= VOLUME_MIN) return SILENT_DB;
  return 20 * Math.log10(v / VOLUME_MAX);
}

function clampVolume(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, n));
}

function hasAudioContext() {
  return typeof globalThis.AudioContext === 'function' || typeof globalThis.webkitAudioContext === 'function';
}

/** 오디오 오류를 키별 1회만 console.error (devguide §3.6 — 연출만 건너뛰고 게임은 계속). 개인정보 없음 (봉인 제1계명) */
export function reportAudioError(key, err) {
  if (reportedErrors.has(key)) return;
  reportedErrors.add(key);
  console.error('[audio]', key, err && err.message ? err.message : String(err));
}

// FR-060 · D-24 첫 클릭·키·터치에서 Tone.start() — 성공 시 true, 미지원·실패 시 false(무음 진행)
export async function unlockAudio() {
  if (unlocked) return true;
  if (!hasAudioContext()) return false;
  if (!unlocking) {
    unlocking = doUnlock().finally(() => { unlocking = null; });
  }
  return unlocking;
}

async function doUnlock() {
  try {
    const mod = await import('tone');
    await mod.start();
    const ctx = mod.getContext();
    if (!ctx || ctx.state !== 'running') return false;
    buses = createBuses(mod);
    tone = mod;
    unlocked = true;
  } catch (err) {
    reportAudioError('unlock', err);
    return false;
  }
  for (const cb of unlockListeners.splice(0)) notifyUnlocked(cb);
  return true;
}

function createBuses(T) {
  const master = new T.Volume(SILENT_DB).toDestination();
  const sfx = new T.Volume(SILENT_DB).connect(master);
  const music = new T.Volume(SILENT_DB).connect(master);
  const created = { master, sfx, music };
  applyBusVolume(created, 'master');
  applyBusVolume(created, 'sfx');
  applyBusVolume(created, 'music');
  return created;
}

function busDb(name) {
  if (name === 'master' && muted) return SILENT_DB;
  if (name === 'sfx' && sfxMuteDepth > 0) return SILENT_DB;
  return volumeToDb(volumes[name]);
}

function applyBusVolume(target, name) {
  if (!target || !target[name]) return;
  try {
    target[name].volume.value = busDb(name);
  } catch (err) {
    reportAudioError('bus-' + name, err);
  }
}

function notifyUnlocked(cb) {
  try {
    cb(tone);
  } catch (err) {
    reportAudioError('unlock-listener', err);
  }
}

// FR-060 해제 여부
export function isAudioUnlocked() {
  return unlocked;
}

// FR-060 버스 음량 설정 (0 = 무음, 그 외 20·log10(v/100) dB). 알 수 없는 버스·숫자 아님은 무시
export function setVolume(bus, value) {
  if (!BUSES.includes(bus)) return;
  const v = clampVolume(value);
  if (v === null) return;
  volumes[bus] = v;
  applyBusVolume(buses, bus);
}

// FR-060 현재 음량·음소거 (옵션 화면 SCR-009)
export function getVolumes() {
  return { master: volumes.master, sfx: volumes.sfx, music: volumes.music, muted };
}

// FR-060 · UC-020 3a 마스터 음소거 — 해제 시 이전 마스터 값 복원 (값 자체는 바꾸지 않음)
export function setMuted(isMuted) {
  muted = Boolean(isMuted);
  applyBusVolume(buses, 'master');
}

// FR-027 귀먹고 말 못하게 하는 귀신 — delayMs 뒤 효과음 버스를 ms 동안 무음 (겹치면 마지막 구간 끝까지 유지)
export function muteSfxBusFor(ms, delayMs = 0) {
  const duration = Number(ms);
  const delay = Math.max(0, Number(delayMs) || 0);
  if (!Number.isFinite(duration) || duration <= 0) return;
  setTimeout(() => {
    sfxMuteDepth += 1;
    applyBusVolume(buses, 'sfx');
    setTimeout(() => {
      sfxMuteDepth = Math.max(0, sfxMuteDepth - 1);
      applyBusVolume(buses, 'sfx');
    }, duration);
  }, delay);
}

// ── 영토 내부용 (sfx-play·sfx-battle·bgm) — 다른 지파 계약 아님 ──

/** 해제된 Tone 모듈, 해제 전·미지원이면 null (호출 측은 null이면 무음 no-op) */
export function getTone() {
  return tone;
}

/** 'sfx' | 'music' | 'master' 버스 노드, 해제 전이면 null */
export function getBus(name) {
  return buses && buses[name] ? buses[name] : null;
}

/** 해제 시 1회 호출 (이미 해제됐으면 즉시) — BGM 대기 상태 적용·효과음 음색 준비용 */
export function onUnlocked(cb) {
  if (typeof cb !== 'function') return;
  if (unlocked) notifyUnlocked(cb);
  else unlockListeners.push(cb);
}
