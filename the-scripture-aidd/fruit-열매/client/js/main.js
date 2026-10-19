// TASK-061 · FR-078 · FR-048 · FR-050 · FR-060 · NFR-005 · C-005 · ARCH-001 — 부트스트랩(폰트·배경·오디오 해제)·해시 라우터·가드·세션 메모리
// 다른 지파 모듈(render·fx·audio·battle)은 동적 import로만 불러온다 — 한 모듈이 실패해도 메뉴는 동작한다 (devguide §3.6, 보고서 기재).
import '@fontsource/noto-serif-kr/400.css';
import '@fontsource/noto-serif-kr/700.css';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '../styles/base.css';
import '../styles/screens.css';
import '../styles/overlay.css';
import { clearGuest, loadGuest } from './auth/guest-session.js';
import { mountEntryScreen } from './screens/entry-screen.js';
import { mountLobbyScreen } from './screens/lobby-screen.js';
import { mountHeroSelectScreen } from './screens/hero-select-screen.js';
import { mountMatchingScreen } from './screens/matching-screen.js';
import { mountBattleScreen } from './screens/battle-screen.js';
import { mountResultScreen } from './screens/result-screen.js';
import { mountRecordsScreen } from './screens/records-screen.js';
import { mountRankingScreen } from './screens/ranking-screen.js';
import { mountOptionsScreen } from './screens/options-screen.js';
import { clear, el } from './ui/dom.js';
import { createToaster } from './ui/toast.js';

/** screen-vision §1 해시 경로 9개 (D3-03) */
export const ROUTES = Object.freeze({
  entry: '#/entry', lobby: '#/lobby', hero: '#/hero', matching: '#/matching', battle: '#/battle',
  result: '#/result', records: '#/records', ranking: '#/ranking', options: '#/options',
});
const TITLES = Object.freeze({
  entry: '닉네임 입장', lobby: '로비', hero: '캐릭터 선택', matching: '매칭 대기', battle: '대전',
  result: '결과', records: '전적', ranking: '랭킹', options: '옵션',
});
const SCREENS = Object.freeze({
  entry: mountEntryScreen, lobby: mountLobbyScreen, hero: mountHeroSelectScreen, matching: mountMatchingScreen, battle: mountBattleScreen,
  result: mountResultScreen, records: mountRecordsScreen, ranking: mountRankingScreen, options: mountOptionsScreen,
});
/** 부팅 가드 2단계: 이 경로만 직접 진입 허용, 그 밖은 SCR-002 (screen-vision §3.1) */
const BOOT_DIRECT = new Set(['lobby', 'records', 'ranking', 'options']);
const NO_LOBBY_BGM = new Set(['battle', 'result']);
const ANNOUNCE_DEDUPE_MS = 1000;

/** 동적 import 표 (Vite가 정적 분석할 수 있도록 리터럴 경로) */
const MODULES = Object.freeze({
  background: () => import('./render/background-parallax.js'),
  emblems: () => import('./render/emblems.js'),
  pixi: () => import('./render/pixi-app.js'),
  intensity: () => import('./fx/fx-intensity.js'),
  feedback: () => import('./fx/feedback-sync.js'),
  audio: () => import('./audio/audio-engine.js'),
  sfx: () => import('./audio/sfx-play.js'),
  bgm: () => import('./audio/bgm.js'),
  controller: () => import('./battle/battle-controller.js'),
});

// FR-078 해시 → 화면 이름 (모르는 경로는 null)
export function parseRoute(hash) {
  const match = /^#\/([a-z]+)$/.exec(hash ?? '');
  return match && Object.hasOwn(ROUTES, match[1]) ? match[1] : null;
}

/** 세션 메모리 (새로고침하면 비워진다 — screen-vision §3.3) */
export function createSession() {
  return {
    verified: false, guest: null, profile: null, bootTarget: 'lobby',
    mode: null, inviteRole: null, botLevel: null, heroId: null,
    lobby: null, queued: null, invite: null, matched: null, matchEnd: null,
  };
}

/** 흐름 상태 폐기 (로비 진입·로그아웃) — 열린 Matchmaker 소켓을 닫는다 */
export function resetFlow(session) {
  try {
    session.lobby?.close();
  } catch (err) {
    console.error('[main] lobby close failed', err);
  }
  Object.assign(session, { mode: null, inviteRole: null, botLevel: null, heroId: null, lobby: null, queued: null, invite: null, matched: null, matchEnd: null });
}

// FR-078 화면 진입 가드 (screen-vision §3.2) → 실제로 그릴 화면 이름
export function guardRoute(name, session) {
  if (!session.verified) return 'entry';
  switch (name) {
    case 'entry': return 'lobby';
    case 'hero': return session.mode ? 'hero' : 'lobby';
    case 'matching': {
      const modeOk = session.mode === 'random' || session.mode === 'invite';
      const socketOk = Boolean(session.lobby) || session.inviteRole === 'friend';
      return modeOk && session.heroId && socketOk ? 'matching' : 'lobby';
    }
    case 'battle': return session.matched?.roomId && !session.matchEnd ? 'battle' : 'lobby';
    case 'result': return session.matchEnd ? 'result' : 'lobby';
    case 'lobby': case 'records': case 'ranking': case 'options': return name;
    default: return 'lobby';
  }
}

/** 부팅 시 검증 후 갈 화면 (screen-vision §3.1) */
export function bootTarget(requested) {
  return BOOT_DIRECT.has(requested) ? requested : 'lobby';
}

function createLoader() {
  const cache = new Map();
  return (key) => {
    if (!cache.has(key)) {
      cache.set(key, MODULES[key]().catch((err) => {
        console.error(`[main] module "${key}" unavailable`, err);
        return null;
      }));
    }
    return cache.get(key);
  };
}

function boot(root) {
  const session = createSession();
  const load = createLoader();
  const bgHost = el('div', { class: 'bg-host', attrs: { 'aria-hidden': 'true' } });
  const screenHost = el('main', { class: 'screen-host' });
  const overlayHost = el('div', { class: 'overlay-host' });
  const hint = el('p', { class: 'audio-hint', text: '🔈 소리를 켜려면 화면을 누르세요' });
  const livePolite = el('div', { class: 'sr-only', attrs: { 'aria-live': 'polite' } });
  const liveAssertive = el('div', { class: 'sr-only', attrs: { 'aria-live': 'assertive' } });
  root.append(bgHost, screenHost, overlayHost, hint, livePolite, liveAssertive);
  const toaster = createToaster(overlayHost);
  let current = null;
  let pending = null;
  let lastAnnounce = { text: '', at: 0 };

  load('background').then((m) => m?.mountBackground(bgHost)).catch((err) => console.error('[main] background failed', err));
  load('intensity').then((m) => m?.initIntensityFromSystem()).catch((err) => console.error('[main] intensity init failed', err));

  async function lobbyBgm() {
    const [audio, bgm] = await Promise.all([load('audio'), load('bgm')]);
    if (audio?.isAudioUnlocked() && bgm && current && !NO_LOBBY_BGM.has(current.name)) bgm.setBgmState('lobby');
  }
  // FR-060 D-24 첫 클릭·키·터치에서 Tone.start() → 안내 숨김·BGM-01 (UC-020 E1)
  const unlock = async () => {
    try {
      const audio = await load('audio');
      if (!audio || !(await audio.unlockAudio())) return;
      for (const type of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(type, unlock, true);
      hint.hidden = true;
      await lobbyBgm();
    } catch (err) {
      console.error('[main] audio unlock failed', err);
    }
  };
  for (const type of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(type, unlock, true);

  function render(name, { toast } = {}) {
    const target = guardRoute(name, session);
    try {
      current?.view?.unmount?.();
    } catch (err) {
      console.error(`[main] unmount ${current?.name} failed`, err);
    }
    clear(screenHost);
    const host = el('section', { class: `screen screen--${target}` });
    screenHost.append(host);
    document.title = `${TITLES[target]} — 영적 전쟁 테트리스`;
    current = { name: target, view: null };
    try {
      current.view = SCREENS[target](host, ctx);
    } catch (err) {
      console.error(`[main] mount ${target} failed`, err);
    }
    if (toast) toaster.show(toast);
    if (!NO_LOBBY_BGM.has(target)) lobbyBgm().catch((err) => console.error('[main] bgm failed', err));
    return target;
  }

  // FR-078 이동 — 흐름 화면(SCR-003~006)은 기록을 쌓지 않고(replaceState), 로비에서 나가는 첫 이동만 1칸 push (D3-14)
  function navigate(name, opts = {}) {
    const target = guardRoute(name, session);
    const from = current?.name ?? null;
    if (target === 'lobby' && from && from !== 'lobby' && from !== 'entry' && history.state?.pushed) {
      pending = { name: target, ...opts };
      history.back();
      return;
    }
    if (from === 'lobby' && target !== 'lobby' && target !== 'entry') history.pushState({ pushed: true }, '', ROUTES[target]);
    else history.replaceState(history.state, '', ROUTES[target]);
    render(target, opts);
  }

  window.addEventListener('popstate', () => {
    const queued = pending;
    pending = null;
    if (!queued && current?.name === 'battle') {
      current.view?.onPopState?.(); // SCR-005: 뒤로 가기 = 일시 메뉴, 경로를 #/battle로 되돌림
      history.pushState({ pushed: true }, '', ROUTES.battle);
      return;
    }
    const requested = queued?.name ?? parseRoute(location.hash) ?? 'lobby';
    const target = guardRoute(requested, session);
    if (location.hash !== ROUTES[target]) history.replaceState(history.state, '', ROUTES[target]);
    render(target, queued ?? {});
  });

  const ctx = {
    session,
    load,
    navigate,
    resetFlow: () => resetFlow(session),
    toast: (message, opts) => toaster.show(message, opts),
    // §6.3 HUD-17 라이브 영역 — 같은 안내는 1초 안에 1번만
    announce(text, { assertive = false } = {}) {
      const now = Date.now();
      if (!text || (text === lastAnnounce.text && now - lastAnnounce.at < ANNOUNCE_DEDUPE_MS)) return;
      lastAnnounce = { text, at: now };
      const region = assertive ? liveAssertive : livePolite;
      region.textContent = '';
      setTimeout(() => { region.textContent = text; }, 30);
    },
    // api-gate §4.3 HTTP 401 / WS 4001 → TBL-201 삭제 → SCR-001
    logout(message) {
      clearGuest();
      resetFlow(session);
      Object.assign(session, { verified: false, guest: null, profile: null, bootTarget: 'lobby' });
      navigate('entry', { toast: message });
    },
  };

  session.guest = loadGuest();
  session.bootTarget = bootTarget(parseRoute(location.hash));
  history.replaceState(null, '', ROUTES.entry);
  render('entry');
}

if (typeof document !== 'undefined' && document.getElementById('app')) boot(document.getElementById('app'));
