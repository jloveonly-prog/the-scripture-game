// TASK-062-3 · FR-057 · FR-058 · FR-059 · FR-060 · C-007 · SCR-009 · UC-020 — 옵션 (흔들림·섬광 세기·음량 3종·음소거)
// 설정은 저장하지 않는다 (N-04 보존 — 화면에 안내). 로비에서는 #/options, 대전 중에는 일시 메뉴의 모달로 같은 컴포넌트를 쓴다.
import { el } from '../ui/dom.js';

export const SESSION_NOTICE = '설정은 이번 접속 동안만 유지됩니다.';
const FLASH_LEVELS = Object.freeze([['normal', '기본'], ['reduced', '줄임'], ['minimal', '최소']]);
const BUSES = Object.freeze([['master', '마스터 음량'], ['sfx', '효과음 음량'], ['music', '음악 음량']]);
/** audio-engine 초기값과 같은 표시 기본값 (devguide §7.10 getVolumes 초기 80/80/60) — 모듈 로드 전 자리값 */
const DEFAULT_VOLUMES = Object.freeze({ master: 80, sfx: 80, music: 60, muted: false });
const VOLUME_STEP = 5;

// FR-060 슬라이더 값 정규화 — 0~100, 5단위
export function snapVolume(value) {
  const n = Math.round((Number(value) || 0) / VOLUME_STEP) * VOLUME_STEP;
  return Math.min(100, Math.max(0, n));
}

/** opts.modal = true면 [← 돌아가기] = opts.onBack (일시 메뉴로) */
export function mountOptionsScreen(host, ctx, { modal = false, onBack = null } = {}) {
  let intensity = null;
  let audio = null;
  const goBack = () => (modal ? onBack?.() : ctx.navigate('lobby'));

  const switchButton = (label, onToggle) => {
    const button = el('button', { class: 'switch', attrs: { type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-label': label } }, [
      el('span', { class: 'switch__off', text: '끄기' }), el('span', { class: 'switch__thumb', attrs: { 'aria-hidden': 'true' } }), el('span', { class: 'switch__on', text: '켜기' }),
    ]);
    button.addEventListener('click', () => {
      const next = button.getAttribute('aria-checked') !== 'true';
      button.setAttribute('aria-checked', String(next));
      onToggle(next);
    });
    return button;
  };
  const setSwitch = (button, on) => button.setAttribute('aria-checked', String(Boolean(on)));

  // FR-057 화면 흔들림 ×1/×0 (UC-020 4)
  const shake = switchButton('화면 흔들림', (on) => intensity?.setShakeEnabled(on));
  // FR-057 섬광 세기 1.0 / 0.5 / 0.2 (D3-09)
  const flashGroup = el('div', { class: 'segment', attrs: { role: 'radiogroup', 'aria-label': '섬광 세기' } });
  const flashButtons = FLASH_LEVELS.map(([level, label]) => {
    const button = el('button', { class: 'segment__item', text: label, attrs: { type: 'button', role: 'radio', 'aria-checked': 'false' } });
    button.addEventListener('click', () => { setFlash(level); intensity?.setFlashLevel(level); });
    flashGroup.append(button);
    return [level, button];
  });
  const setFlash = (level) => flashButtons.forEach(([l, b]) => b.setAttribute('aria-checked', String(l === level)));

  // FR-060 음량 슬라이더 (←→ 5단위, PageUp/Down 20단위, Home/End — 브라우저 기본 range 동작)
  const sliders = new Map();
  const sliderRows = BUSES.map(([bus, label]) => {
    const id = `volume-${bus}`;
    const output = el('output', { class: 'num', attrs: { for: id } });
    const input = el('input', { class: 'slider', attrs: { id, type: 'range', min: 0, max: 100, step: VOLUME_STEP } });
    const show = (v) => { input.value = String(v); input.setAttribute('aria-valuetext', String(v)); output.textContent = String(v); };
    input.addEventListener('input', () => { const v = snapVolume(input.value); show(v); audio?.engine?.setVolume(bus, v); });
    if (bus === 'sfx') input.addEventListener('change', () => audio?.sfx?.playControlSfx('SFX-05')); // 놓을 때 크기 확인 1회
    sliders.set(bus, show);
    return el('div', { class: 'option-row' }, [el('label', { class: 'label', text: label, attrs: { for: id } }), input, output]);
  });
  // FR-060 음소거 — 끄면 이전 음량 복원 (UC-020 3a)
  const mute = switchButton('음소거', (on) => audio?.engine?.setMuted(on));

  const back = el('button', { class: 'btn btn--ghost', text: '← 돌아가기', attrs: { type: 'button' }, on: { click: goBack } });
  host.append(
    el('header', { class: 'topbar' }, [back, el('h1', { class: 'screen-title', text: '옵션', attrs: { tabindex: '-1' } })]),
    el('section', { class: 'panel options' }, [
      el('h2', { class: 'options__group', text: '연출' }),
      el('div', { class: 'option-row' }, [el('span', { class: 'label', text: '화면 흔들림' }), shake]),
      el('div', { class: 'option-row' }, [el('span', { class: 'label', text: '섬광 세기' }), flashGroup]),
      el('h2', { class: 'options__group', text: '소리' }),
      ...sliderRows,
      el('div', { class: 'option-row' }, [el('span', { class: 'label', text: '음소거' }), mute]),
      el('p', { class: 'notice', text: `ⓘ ${SESSION_NOTICE}` }),
    ]),
  );
  for (const [bus, show] of sliders) show(DEFAULT_VOLUMES[bus]);
  setSwitch(shake, true);
  setFlash('normal');

  ctx.load('intensity').then((mod) => {
    intensity = mod;
    if (!mod) return;
    const now = mod.getIntensity();
    setSwitch(shake, now.shakeEnabled);
    setFlash(now.flashLevel);
  }).catch((err) => console.error('[options] intensity', err));
  Promise.all([ctx.load('audio'), ctx.load('sfx')]).then(([engine, sfx]) => {
    audio = { engine, sfx };
    if (!engine) return;
    const volumes = engine.getVolumes();
    for (const [bus, show] of sliders) show(volumes[bus]);
    setSwitch(mute, volumes.muted);
  }).catch((err) => console.error('[options] audio', err));

  const onKey = (event) => { if (event.key === 'Escape') { event.stopPropagation(); goBack(); } };
  host.addEventListener('keydown', onKey);
  shake.focus(); // SCR-009 진입 포커스 = 첫 컨트롤
  return { unmount() { host.removeEventListener('keydown', onKey); } };
}
