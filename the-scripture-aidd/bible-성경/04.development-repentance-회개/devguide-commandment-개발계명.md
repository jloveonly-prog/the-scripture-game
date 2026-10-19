# 🔨 개발 가이드 (Devguide Commandment) — 영적 전쟁 테트리스

> *"Thy word is a lamp unto my feet, and a light unto my path."* — Psalm 119:105 (KJV)
>
> **규격:** `statute-율법/04.development-repentance-회개/devguide-commandment-개발계명-template.md` · 시큐어 코딩 `statute-율법/04.development-repentance-회개/security-seal-봉인.md`
> **참조 예시:** `parable-비유/04.development-repentance-회개/devguide-commandment-개발계명-example.md`
> **동반 산출물:** [`task-wall-성벽.md`](./task-wall-성벽.md) (태스크·지파 배정표 — 상태의 유일한 원본)
> **근거 정경:** Phase 1 [`spec-tablet-명세서.md`](../01.requirement-hearing-들음/spec-tablet-명세서.md) · [`rtm-covenant-언약추적.md`](../01.requirement-hearing-들음/rtm-covenant-언약추적.md) / Phase 2 [`architecture-temple-성전설계.md`](../02.architecture-foundation-기초/architecture-temple-성전설계.md) · [`api-gate-성문.md`](../02.architecture-foundation-기초/api-gate-성문.md) · [`data-ark-법궤.md`](../02.architecture-foundation-기초/data-ark-법궤.md) / Phase 3 [`design-vision-디자인명세.md`](../03.design-order-질서/design-vision-디자인명세.md) · [`screen-vision-화면설계.md`](../03.design-order-질서/screen-vision-화면설계.md)
> **실행 방식:** TIER-3 · ⚡ 자동 모드 · `ORCH-01_canaan-가나안분배.md` 지파별 병렬 개발. 이 문서 §7(지파 간 인터페이스 계약)은 **지파가 서로의 코드를 읽지 않고 병렬로 일하기 위한 유일한 약속**이다.

---

## 1. 프로젝트 설정

### 1.1 언어·프레임워크·도구

| 항목 | 내용 | 근거 |
|:---|:---|:---|
| 클라이언트 언어 | 바닐라 JavaScript (ES Modules, ES2022), 프레임워크 없음, JSDoc으로 타입 설명 | C-005, architecture §3.1 |
| 서버 언어 | TypeScript 5 (`strict`), Cloudflare Workers + Durable Objects (WebSocket Hibernation API, DO RPC) | C-005, A §4.2 |
| 빌드·개발 서버 | Vite 7 (클라이언트), wrangler 4 (`wrangler dev` 로컬 workerd · `wrangler deploy --dry-run` 번들 검사) | FR-073, C-008 |
| 패키지 매니저 | npm 11 — **단일 `fruit-열매/package.json`** (npm workspaces 없음 — architecture §15 재각 R1) | D-29 재각 R1, NFR-007 |
| 런타임 | Node.js ≥ 22.12 (개발 PC 실측 v24.18.0) | Vite 7·wrangler 4 엔진 요구 |
| 테스트 | Vitest 3 (`tests/unit/**`), Playwright 1 (`tests/e2e/**`), 콘텐츠 검사 `scripts/check-content.mjs` | REQ-017, D-33 |
| 린터·포매터 | 추가하지 않는다 (스택 밖 도구 금지 — architecture §3.1). 서식은 §3 규칙을 사람이·Witness가 지킨다 | C-005 |

### 1.2 잠금 의존성 버전 (NFR-007 — 2026-10-20 잠금)

> 기준: architecture §3.2 계획 버전과 **같은 메이저** 안에서, 2026-10-06(출시 2주 경계) 이전에 배포된 최신 안정판. 배포 시각은 npm 레지스트리 `time` 필드로 확인했다. 정확한 버전을 `package.json`에 고정하고 `package-lock.json`으로 하위 의존성까지 잠근다.

| 패키지 | 구분 | 계획 (architecture §3.2) | **잠금** | 배포일 | 비고 |
|:---|:---|:---:|:---:|:---:|:---|
| vite | dev | 7.0.0 | **7.3.6** | 2026-06-25 | 7.3.7은 2026-10-06 배포라 제외, 8.x는 메이저 변경이라 제외 |
| pixi.js | dep | 8.9.2 | **8.22.0** | 2026-10-01 | |
| pixi-filters | dep | 6.1.0 | **6.1.5** | 2025-11-29 | |
| gsap | dep | 3.13.0 | **3.15.0** | 2026-04-13 | |
| tone | dep | 15.0.4 | **15.1.22** | 2025-04-27 | npm `latest` 태그. 15.5.x는 `next`(개발판) 태그라 제외 |
| canvas-confetti | dep | 1.9.3 | **1.9.4** | 2025-10-25 | |
| partysocket | dep | 1.1.4 | **1.3.0** | 2026-06-23 | |
| @fontsource/cinzel | dep | 5.2.5 | **5.3.0** | 2026-07-19 | |
| @fontsource/noto-serif-kr | dep | 5.2.5 | **5.3.0** | 2026-07-19 | 5.3.1은 2주 경계 안쪽이라 제외 |
| wrangler | dev | 4.20.0 | **4.147.0** | 2026-10-02 | |
| typescript | dev | 5.8.3 | **5.9.3** | 2025-09-30 | 6·7은 메이저 변경이라 제외 |
| @supabase/supabase-js | dep | 2.50.0 | **2.117.2** | 2026-09-25 | Worker 전용 — 키가 있을 때만 동적 import |
| vitest | dev | 3.2.4 | **3.2.7** | 2026-07-06 | |
| @playwright/test | dev | 1.53.0 | **1.63.0** | 2026-09-04 | 브라우저 바이너리는 `npx playwright install chromium` 1회 (E2E 실행 준비 — `npm run dev`와 무관) |

### 1.3 명령 (모두 `fruit-열매/`에서)

| 명령 | 동작 | 근거 |
|:---|:---|:---|
| `npm install` | 의존성 설치 (lockfile 1개) | FR-073 |
| `npm run dev` | `scripts/dev.mjs`가 `npm run dev:worker`(wrangler dev :8787)와 `npm run dev:client`(Vite :5173)를 함께 띄움. 외부 키·로그인 불필요 | FR-073, C-004 |
| `npm run build` | `vite build`(→ `client/dist`) + `wrangler deploy --dry-run`(→ `worker/dist`, 배포 없음) | C-008 |
| `npm run typecheck` | `tsc --noEmit -p worker/tsconfig.json` | architecture §3.1 |
| `npm run types:worker` | `wrangler types --include-env=false` → `worker/worker-configuration.d.ts` (런타임 타입) | §8 D4-10 |
| `npm test` | Vitest 단위 테스트 전체 (`tests/unit/**/*.test.{js,ts}`) — Phase 5 1겹 | SKILL-04 test 명령 등록 |
| `npm run test:e2e` | Playwright (webServer = `npm run dev`, baseURL `http://localhost:5173`) | FR-077 |
| `npm run check:content` | 콘텐츠 검사 (FR-076) — 실패 시 종료 코드 1 | FR-076 |

> `npm install` 시 npm 11의 allow-scripts 정책 때문에 "esbuild·workerd install script not yet covered by allowScripts" 경고가 나온다. 두 패키지는 플랫폼별 optional 패키지(`@esbuild/win32-x64`, `@cloudflare/workerd-windows-64`)로 동작하므로 스크립트 승인 없이 정상이다 — 2026-10-20 확인: `vite --version` 7.3.6, `wrangler --version` 4.147.0, esbuild TS 변환 성공, `wrangler types` 생성 성공. 이 PC의 `D:`는 원격 데스크톱 리디렉션 드라이브라 첫 설치가 오래 걸린다(관측 21분).

---

## 2. 디렉토리 구조

> 정본은 architecture §5.3·§5.4. 아래는 Phase 4 확정형(재각 R1 반영)과 **소유 지파**다 (영토 경계 — task-wall 부록 지파 배정표가 원본).

```
fruit-열매/
├── package.json · package-lock.json · .gitignore · vitest.config.js · playwright.config.js   [기반]
├── scripts/
│   ├── dev.mjs                         [기반]   Vite + wrangler 동시 기동
│   └── check-content.mjs               [잇사갈] 콘텐츠 검사 (FR-076)
├── content/
│   ├── heroes.json angels.json spirits.json armor.json counters.json balance.json achievements.json   [기반]
│   └── verses.json quiz.json           [잇사갈] (기반이 빈 배열 씨앗만 만들고 소유권 이전)
├── client/
│   ├── index.html · vite.config.js     [기반]
│   ├── styles/ base.css screens.css overlay.css            [므낫세]
│   └── js/
│       ├── main.js                     [므낫세] 부트스트랩·해시 라우터·세션 메모리
│       ├── screens/ (화면 9개)          [므낫세]
│       ├── engine/ rng.js pieces.js encode.js danger.js     [기반]  동형 공용
│       ├── engine/ bag.js srs.js board.js scoring.js specials.js gravity.js game.js   [유다]
│       ├── battle/ (조정·입력·효과 적용)  [유다]
│       ├── net/ protocol.js            [기반]  동형 공용
│       ├── net/ socket.js lobby-client.js room-client.js http-api.js   [므낫세]
│       ├── auth/ guest-session.js      [므낫세]
│       ├── content/ content-loader.js  [기반]
│       ├── render/ (PixiJS)            [납달리]
│       ├── fx/ (연출)                   [납달리]
│       ├── audio/ (Tone.js)            [스불론]
│       └── ui/ quiz-panel.js verse-card.js reactions.js toast.js   [므낫세]
├── worker/
│   ├── wrangler.toml · tsconfig.json · .dev.vars.example · worker-configuration.d.ts   [기반]
│   └── src/
│       ├── env.ts · content.ts · store/store.ts            [기반]
│       ├── index.ts · elo.ts · matchmaker.ts · http/ · auth/ · protocol/ · matchmaking/ · results/ · store/(store.ts 제외)   [베냐민]
│       ├── attack.ts · game-room.ts · room/(bot/ 제외)       [에브라임]
│       └── room/bot/                   [유다]
├── supabase/migrations/0001_init.sql   [베냐민]
└── tests/
    ├── unit/foundation/                [기반]
    ├── unit/engine/ · unit/battle/ · unit/bot/              [유다]
    ├── unit/room/                      [에브라임]
    ├── unit/store/ · unit/results/ · unit/protocol/ · unit/http/ · unit/matchmaking/   [베냐민]
    ├── unit/render/ · unit/fx/         [납달리]
    ├── unit/audio/                     [스불론]
    ├── unit/client/ · e2e/             [므낫세]
    └── unit/content/                   [잇사갈]
```

---

## 3. 코딩 컨벤션

### 3.1 추적 주석 (필수 — SKILL-04 "REQ-ID 주석 필수")

- **모든 파일 첫 줄:** `// TASK-ID · REQ/FR/NFR/C-ID… — 단일 책임 한 줄` (CSS는 `/* … */`, JSON은 주석 불가 → task-wall 행이 추적 원본).
- **요구사항을 구현하는 export 함수마다** 바로 위 한 줄 주석에 FR/NFR/C-ID를 적는다. 예: `// FR-024 공격력 계산 (data-ark §8.8.1)`.
- 설계 결정을 따르는 코드는 결정 ID를 함께 적는다 (D-14, D3-12, D4-08 등). 주석은 한국어·영어 모두 허용.

### 3.2 이름·서식

| 대상 | 규칙 | 예 |
|:---|:---|:---|
| 파일 | kebab-case, 역할 접미사 | `battle-controller.js`, `guest-routes.ts`, `hero-select-screen.js` |
| 함수·변수 | camelCase, 동사로 시작하는 함수 | `computeAttack`, `rollSpecial` |
| 상수 | UPPER_SNAKE_CASE (모듈 최상위 고정값) | `MAX_FRAME_BYTES` |
| 클래스·타입 | PascalCase | `GameRoom`, `RoomInit` |
| 콘텐츠 ID | snake_case (data-ark §1.4) | `prince_of_persia` |
| 서식 | 들여쓰기 2칸, 세미콜론, 작은따옴표, 한 줄 ≤ 140자 권장, 파일 끝 개행 | |
| 모듈 | ESM `import`/`export`만 (CommonJS 금지). 순환 import 금지 | |

### 3.3 금지 규칙 (마귀 축출 목록)

1. **매직 넘버 금지** — 공격력·게이지·쿨다운·확률·시간·봇 수치는 `content/*.json`(D-15)과 `protocol.js`(필드 한계·빈도 제한)에서만 읽는다. 연출 수치(색·ms·px)는 design-vision 토큰 값을 이름 있는 상수로 둔다.
2. **동형 모듈 오염 금지** — `client/js/engine/**`, `client/js/net/protocol.js`에는 `window`·`document`·`localStorage`·`performance.now` 직접 호출을 두지 않는다 (시각은 인자로 받는다 — D-12).
3. **`innerHTML`·`outerHTML`·`insertAdjacentHTML` 금지** — 동적 텍스트는 `textContent`, 요소는 `createElement`/`createElementNS`(아이콘 SVG) (api-gate §5.4 XSS).
4. **새 의존성 금지** — `package.json`은 기반 소유. 스키마 검증·병렬 실행·DOM 테스트 라이브러리 등 추가 불가 (C-005).
5. **NICE-TO-HAVE 구현 금지** — N-01 키 재설정, N-02 재접속 복귀, N-03 튜토리얼, N-04 옵션 저장, N-05 퀴즈 중복 방지, N-06 저장 모드 표시 (D-34).
6. **설계 밖 화면·메시지·필드 금지** — api-gate §1의 메시지·필드, screen-vision 9화면, design-vision EVT-01~54 밖의 것은 만들지 않는다. 필요하면 모세에게 경계 분쟁으로 보고 (Spec-First).
7. **CSP 준수** — `index.html` CSP(`script-src 'self'`, `worker-src` 미지정 → `'self'`)를 바꾸지 않는다: PixiJS는 `import 'pixi.js/unsafe-eval'`(eval 없이 셰이더 동기화 함수를 쓰게 하는 Pixi v8 공식 모듈)을 `render/pixi-app.js`에서 1회 import, canvas-confetti는 `useWorker: false`, Tone.js는 AudioWorklet(Blob URL)이 필요한 노드를 쓰지 않는다.

### 3.4 계층 분리 결정 (SKILL-04 "계층 분리 원칙" — 근거와 함께 기록)

| 계층 | 클라이언트 | 서버 | 섞이면 안 되는 것 |
|:---|:---|:---|:---|
| HTTP 처리 | — | `worker/src/http/*-routes.ts` (요청 파싱·서비스 호출·상태코드), `http/respond.ts`(응답 직렬화) | SQL, 비즈니스 계산, 저장소 구현 import(인터페이스만) |
| WS 처리 | `net/*-client.js` (봉투·재연결 정책) | `game-room.ts`·`matchmaker.ts`(Hibernation 셸) → `room/message-router.ts`(분배) | 판정 계산(→ `attack.ts`·`room/*.ts`), DOM |
| 서비스(규칙) | `engine/*` (순수), `battle/*`(조정) | `attack.ts`, `room/*.ts`, `matchmaking/*.ts`, `results/*.ts`, `auth/*.ts`, `protocol/*.ts` | HTTP·WS 객체, SQL, DOM |
| 데이터 | `auth/guest-session.js`(localStorage 1건) | `store/*.ts`, `supabase/migrations/*.sql` | HTTP, 판정 |
| 렌더링 | `screens/*`(DOM 템플릿), `render/*`(Pixi), `fx/*`, `audio/*`, `ui/*` | (없음 — JSON 응답만) | 네트워크 송신, 판정, 저장 |

- **분리 근거:** architecture §5.1 체크리스트(CRUD 부분 포함 → 강제 분리, 화면 9개, HTTP·렌더링 혼재 금지) + §5.2. 300줄 초과 예상 파일 0개 (task-wall §2.3).
- **의존성 주입:** 서버 서비스 모듈은 저장소·시계·난수·송신 함수를 **인자(deps)로 받는다** — DO 셸만 `cloudflare:workers`를 import 하고, 나머지는 Vitest(Node)에서 그대로 테스트된다.

### 3.5 앱 인스턴스 export (SKILL-04 — 통합 테스트 전제)

- `worker/src/index.ts`: `export async function handleFetch(request, env, ctx)` + `export default { fetch: handleFetch }` + `export { Matchmaker } from './matchmaker'`, `export { GameRoom } from './game-room'` (wrangler가 DO 클래스를 진입 모듈 export에서 찾는다).
- HTTP 통합 테스트는 `handleFetch`에 가짜 `Env`(가짜 `Store`를 돌려주는 `selectStore` 대체 — §7.11)를 넣어 호출한다.

### 3.6 예외 처리 정책 (SKILL-04 "예외처리 없는 라우트 = 죄")

| 위치 | 규칙 |
|:---|:---|
| HTTP 라우트 (`http/*-routes.ts`) | 각 핸들러 본문 전체를 `try-catch`. 알려진 실패는 api-gate §4 코드(`StoreError` → `NICKNAME_TAKEN`/`STORE_UNAVAILABLE`, 검증 실패 → `INVALID_BODY` 등)로, 그 밖은 `INTERNAL_ERROR` 500 + 고정 문구 (스택·SQL·키 미포함 — 봉인 제1계명). `index.ts`에 전역 `try-catch` 1겹 추가 (2중 방어) |
| WS 핸들러 (`webSocketMessage`·`webSocketClose`·`webSocketError`·`alarm`) | 메시지 1건 처리 전체를 `try-catch` → `encodeErrorMessage('INTERNAL_ERROR', ref)` 송신 + 구조화 로그. 한 메시지 실패가 방 전체를 멈추지 않게 한다 |
| DO RPC (`init`, `roomClosed`, Store 위임) | `try-catch` 후 `StoreError` 또는 `Error`로 재던짐 — 호출 측이 코드로 변환 |
| 저장소 | DB 오류는 `StoreError('STORE_UNAVAILABLE')`로 감싼다. 닉네임 UNIQUE 위반은 `StoreError('NICKNAME_TAKEN')` (경쟁 조건 안전 — data-ark §5) |
| 클라이언트 네트워크 | `fetch`·소켓 이벤트 처리기마다 `try-catch` → 화면 오류 상태(ConnectionError·ErrorState·토스트) — 사용자 문구는 `protocol.js` `ERRORS[code].message` |
| 클라이언트 렌더·오디오 | 프레임 루프 안 예외는 잡아서 1회 `console.error` 후 해당 연출만 건너뛴다 (게임 진행은 계속). 오디오 미지원·미해제는 무음으로 진행 |
| 금지 | 빈 `catch {}` (최소 로그 또는 사용자 피드백 1개), 오류 메시지에 토큰·닉네임·토큰 해시 포함 |

### 3.7 로그 형식 (봉인 제1·8계명)

서버 로그는 `console.log(JSON.stringify({ at: ISO시각, event: 'kebab-case 이벤트', guest: guestId.slice(0, 8), roomId }))` 한 줄. 기록 대상: 프로필 생성, 토큰 검증 실패, `clear` 거부(SEQ/PROGRESS), 경기 기록 성공·실패, 빈도 위반 종료(4008). 토큰·토큰 해시·닉네임 전체·출처 IP는 출력하지 않는다.

---

## 4. 모듈별 개발 현황

> 상태의 유일한 원본은 task-wall이다. 이 표는 모듈 ↔ 요구사항 연결 요약이며 상태 열은 task-wall을 그대로 옮긴 것이다 (갱신 시 task-wall 먼저).

| 모듈 (경로) | 소유 지파 | 관련 REQ / ARCH | TASK | 상태 | 코드 리뷰 |
|:---|:---|:---|:---|:---:|:---:|
| 작업공간·동시 기동 (`package.json`, `scripts/dev.mjs`, 테스트 설정) | 기반 | REQ-016, REQ-017 / ARCH-019·020 | TASK-001 | 🔄 | ⬜ 레위 대기 |
| 클라이언트 골격 (`client/index.html`, `vite.config.js`) | 기반 | REQ-016, NFR-004·005 / ARCH-001·019 | TASK-002 | 🔄 | ⬜ |
| 워커 골격 (`wrangler.toml`, `tsconfig.json`, `env.ts`) | 기반 | REQ-016, FR-072 / ARCH-009·019·021 | TASK-003 | 🔄 | ⬜ |
| 공용 동형 모듈 (`protocol.js`, `rng.js`, `pieces.js`, `encode.js`, `danger.js`) | 기반 | REQ-001, FR-008, NFR-003 / ARCH-002·007·017 | TASK-004 | 🔄 | ⬜ |
| 저장 인터페이스 (`store/store.ts`) | 기반 | REQ-014~016 / ARCH-015 | TASK-005 | 🔄 | ⬜ |
| 공용 콘텐츠·로더 (`content/*.json` 7종, `content.ts`, `content-loader.js`) | 기반 | FR-074 / ARCH-018 | TASK-006 | 🔄 | ⬜ |
| 엔진 (`client/js/engine/*` 7개) | 유다 | REQ-001, REQ-012 / ARCH-002 | TASK-010 | ⬜ | ⬜ |
| 전투 클라이언트 (`client/js/battle/*`) | 유다 | REQ-001, REQ-007~010 / ARCH-003 | TASK-011 | ⬜ | ⬜ |
| AI 봇 (`worker/src/room/bot/*`) | 유다 | REQ-005 / ARCH-014 | TASK-012 | ⬜ | ⬜ |
| 공격·방해·진행 판정 (`attack.ts`, `room/interference.ts`, `room/progress-guard.ts`) | 에브라임 | REQ-007 / ARCH-012 | TASK-020 | ⬜ | ⬜ |
| 게이지·스킬·천사·갑주·예수님·특수 칸 (`room/*`) | 에브라임 | REQ-003, REQ-008~010, REQ-012 / ARCH-012 | TASK-021 | ⬜ | ⬜ |
| 말씀 대결 (`room/quiz-duel.ts`, `room/representative-verse.ts`) | 에브라임 | REQ-011 / ARCH-013 | TASK-022 | ⬜ | ⬜ |
| GameRoom (`game-room.ts`, `room/room-state·timers·round-flow·message-router`) | 에브라임 | REQ-001, REQ-006 / ARCH-011 | TASK-023 | ⬜ | ⬜ |
| 저장소 어댑터 (`store/*`, `supabase/`) | 베냐민 | REQ-014~016 / ARCH-015 | TASK-030 | ⬜ | ⬜ |
| 결과·레이팅 (`elo.ts`, `results/*`) | 베냐민 | REQ-013~015 / ARCH-016 | TASK-031 | ⬜ | ⬜ |
| 인증·메시지 검증 (`auth/*`, `protocol/*`) | 베냐민 | REQ-002, NFR-003 / ARCH-017·021 | TASK-032 | ⬜ | ⬜ |
| HTTP 성문 (`index.ts`, `http/*`) | 베냐민 | REQ-002, REQ-014, REQ-015 / ARCH-009 | TASK-033 | ⬜ | ⬜ |
| Matchmaker (`matchmaker.ts`, `matchmaking/*`) | 베냐민 | REQ-004~006 / ARCH-010 | TASK-034 | ⬜ | ⬜ |
| 렌더 (`client/js/render/*`) | 납달리 | REQ-013, REQ-003, REQ-010 / ARCH-004 | TASK-040 | ⬜ | ⬜ |
| 연출 (`client/js/fx/*`) | 납달리 | REQ-013 / ARCH-005 | TASK-041 | ⬜ | ⬜ |
| 오디오 (`client/js/audio/*`) | 스불론 | REQ-013 / ARCH-006 | TASK-050 | ⬜ | ⬜ |
| 네트워크·게스트 세션 (`net/*`, `auth/*`) | 므낫세 | REQ-001, REQ-002, REQ-004 / ARCH-007·008 | TASK-060 | ⬜ | ⬜ |
| 앱 셸·스타일 (`main.js`, `styles/*`) | 므낫세 | FR-078, FR-048, FR-050 / ARCH-001 | TASK-061 | ⬜ | ⬜ |
| 메뉴 화면 7개 (`screens/*`) | 므낫세 | REQ-002~006, REQ-013~015 / ARCH-001 | TASK-062 | ⬜ | ⬜ |
| 대전·결과 화면 + 경기 UI (`battle-screen`, `result-screen`, `ui/*`) | 므낫세 | REQ-001, REQ-011, REQ-013 / ARCH-001·022 | TASK-063 | ⬜ | ⬜ |
| E2E (`tests/e2e/battle-two-browsers.spec.js`) | 므낫세 | REQ-017, FR-077, NFR-002 / ARCH-020 | TASK-064 | ⬜ | ⬜ |
| 말씀 콘텐츠·검사 (`verses.json`, `quiz.json`, `check-content.mjs`) | 잇사갈 | REQ-011, FR-043, FR-076, C-003 / ARCH-018·020 | TASK-070 | ⬜ | ⬜ |

---

## 5. 코드 리뷰 체크리스트 (Witness = 레위 지파가 각 TASK마다 개별 판정)

### 5.1 봉인의 율법 10계명 (security-seal-봉인.md — 전부 필수)

- [ ] **제1계명 노출하지 말라:** 로그·응답·화면 오류에 토큰·토큰 해시·스택·SQL 없음. 서버 로그 게스트 ID는 앞 8자만 (§3.7)
- [ ] **제2계명 코드에 넣지 말라:** `SUPABASE_*` 값은 `Env`로만 읽음. `client/` 아래에 `SUPABASE`·`service_role` 문자열 0개 (빌드 산출물 검사 — NFR-004)
- [ ] **제3계명 암호화하라:** 토큰 = `crypto.getRandomValues` 32바이트 base64url, 저장은 SHA-256 hex만 (`auth/token.ts`)
- [ ] **제4계명 최소만 취하라:** 요청 본문 개인정보는 닉네임 1개. 이메일·실명·IP 저장 없음. 초대 코드 만료 즉시 삭제
- [ ] **제5계명 동의 없이 취하지 말라:** SCR-001 고지 문구 "닉네임과 경기 기록이 이 게임 서버에 저장됩니다." 표시 후 입장 버튼
- [ ] **제6계명 외부에 넘기지 말라:** 로컬 모드 외부 요청 0건 (폰트·그래픽·사운드 포함 — NFR-005). 분석·광고 SDK 없음
- [ ] **제7계명 접근을 통제하라:** 모든 WS `join`·HTTP 조회 토큰 검증, GameRoom 명단 검증(R-13), 판정은 서버 권한(R-01~R-12), RLS 전면 거부(Supabase), 스키마 검증·빈도 제한
- [ ] **제8계명 기록하라:** §3.7 이벤트 로그
- [ ] **제9계명 유출을 대비하라:** 토큰 해시만 저장 → `token_hash` 일괄 교체로 무효화 가능 (절차는 Phase 7 운영 문서)
- [ ] **제10계명 탐하지 말라:** 저장 데이터 용도 = 입장·전적·랭킹·해금·은혜·성장·업적. 집계·분석 코드 없음

### 5.2 공통 품질

- [ ] 파일 첫 줄 추적 주석 + export 함수 FR 주석 (§3.1)
- [ ] 파일 1개 = 책임 1개, 300줄 이하 (초과 시 task-wall 근거 필요), 영토 밖 파일 수정 0건
- [ ] 예외 처리 (§3.6) — 라우트·WS 핸들러·RPC 전부
- [ ] 매직 넘버 없음 (§3.3-1), `innerHTML` 없음, 새 의존성 없음, NICE-TO-HAVE 없음
- [ ] §7 계약 시그니처와 정확히 일치 (이름·인자·반환 형태)
- [ ] 해당 TASK의 단위 테스트가 `npm test`에서 통과 (계약 의존 상대가 아직 없으면 그 사실을 정복 완료 보고에 명시)

---

## 6. Git 커밋 컨벤션 (AIDD 커밋 타입)

| 타입 | 의미 | 매핑 | 예 |
|:---|:---|:---|:---|
| `Genesis` | 새 파일·기능 생성 | create/feat | `Genesis(engine): TASK-010-1 FR-002 SRS 벽차기 표 생성` |
| `Refine` | 코드 개선 (동작 불변) | refactor | `Refine(room): TASK-023-3 message-router 분배 표 정리` |
| `Repent` | 버그 수정 (회개) | fix | `Repent(store): TASK-030-1 FR-069 전적 정렬 역순 수정` |
| `Scroll` | 문서 작성·수정 | docs | `Scroll: Phase 4 task-wall 지파 배정표 정경화` |
| `Test` | 테스트 추가·수정 | test | `Test(attack): TASK-020-4 FR-075 B2B 테트리스 공격력 5 검증` |
| `Deploy` | 배포·인프라 설정 | deploy/ci | `Deploy: TASK-003 wrangler.toml DO 바인딩·SQLite 마이그레이션` |

- 형식: `타입(범위): TASK-ID REQ/FR-ID 요약` — 범위는 지파 영토의 폴더명(engine, battle, bot, room, attack, store, results, protocol, http, matchmaking, render, fx, audio, net, screens, ui, content, foundation).
- 커밋은 모세(오케스트레이터)가 정경화 시점에 한다. 지파는 git을 직접 실행하지 않는다.

---

## 7. 지파 간 인터페이스 계약 (병렬 개발의 경계표 — Deuteronomy 19:14)

> **규칙:** ① 지파는 다른 지파 영토의 파일을 읽어 구현을 짐작하지 않는다 — 이 절의 시그니처만 믿는다. ② 계약을 구현하는 쪽은 시그니처를 정확히 지키고, 호출하는 쪽은 여기 적힌 것 외의 속성을 기대하지 않는다. ③ 계약 변경이 필요하면 코드를 고치기 전에 여호수아에게 보고 → 모세가 이 절을 먼저 고친다 (Spec-First). ④ 메시지 필드의 정본은 api-gate §3, 수치의 정본은 data-ark §8.8 — 이 절은 그 위의 **모듈 경계**만 정한다.

### 7.1 기반 소유 공용 모듈 (읽기 전용 — 모든 지파 import 가능, 수정 불가)

| 파일 | export | 쓰는 지파 |
|:---|:---|:---|
| `client/js/net/protocol.js` | `MM_C2S`, `MM_S2C`, `ROOM_C2S`, `ROOM_S2C`, `MSG_ERROR`, `API_IDS`, `MODES`, `BOT_LEVELS`, `HERO_IDS`, `ANGEL_IDS`, `SPIRIT_IDS`, `ARMOR_IDS`, `EFFECT_CATEGORIES`, `END_REASONS`, `MATCH_END_REASONS`, `CELL`, `ARMOR_CELL_CODES`, `REACTION_IDS`, `INVITE_STATUS`, `STAGES`, `EFFECT_KINDS`, `ACHIEVEMENT_IDS`, `QUIZ_TRIGGERS`, `SPECIAL_KINDS`, `JESUS_EFFECT_ID`, `heroSkillId(heroId)`, `angelSkillId(angelId)`, `LIMITS`, `PATTERNS`, `ROOM_CODE_ALPHABET`, `TIMING`, `RATE_LIMITS`, `RATE_ABUSE`, `HTTP_RATE_LIMITS`, `CLOSE_CODES`, `ERRORS`, `encodeClientMessage(type, data)`, `encodeServerMessage(type, data)`, `encodeErrorMessage(code, ref, retryAfterMs?)` | 유다·에브라임·베냐민·므낫세 |
| `client/js/engine/rng.js` | `SPECIAL_SEED_XOR`, `mulberry32(seed) → () => [0,1)`, `deriveSeed(seed, xor)`, `nextInt(rand, min, maxInclusive)`, `pick(rand, items)`, `shuffleInPlace(rand, items)` | 유다·에브라임 |
| `client/js/engine/pieces.js` | `PIECE_TYPES`(['I','O','T','S','Z','J','L']), `PIECES[name] = { type, code, box, cells[rot][4] = [행, 열] }`, `pieceByType(type)`, `absoluteCells({type, rot, x, y}) → [[행, 열]×4]` (위→아래·왼→오른 순서) | 유다·납달리 |
| `client/js/engine/encode.js` | `BOARD_COLS`, `BOARD_ROWS`, `createEmptyGrid()`, `isValidBoardString(s)`, `encodeBoard(grid) → 200자`, `decodeBoard(s) → grid`, `cellAt(s, row, col)` — **격자(grid) = 20행 × 10열 셀 코드 문자 배열, 0행이 맨 위, 고정 블록만** | 유다·에브라임·납달리 |
| `client/js/engine/danger.js` | `DEFAULT_DANGER_ROWS`(4), `isInDanger(grid, rows?)`, `isBoardStringInDanger(s, rows?)`, `stackHeight(grid)` | 유다·에브라임 |
| `client/js/content/content-loader.js` | `content`(heroes·angels·spirits·armor·counters·verses·balance·achievements), `heroesById`, `angelsById`, `spiritsById`, `armorById`, `achievementsById`, `countersBySpiritId`, `versesByRef`, `armorByCellCode`, `getVerse(ref)` — **quiz.json은 클라이언트 번들에 없다** (D4-04) | 유다·납달리·스불론·므낫세 |
| `worker/src/content.ts` | 같은 색인 + `quiz`, `quizById`, `balance`(타입 `BalanceDef`), `getVerse(ref)`, `findSkill(skillId)`, 정의 타입 `HeroDef`·`AngelDef`·`SpiritDef`·`ArmorDef`·`CounterDef`·`VerseDef`·`QuizDef`·`AchievementDef`·`ActionDef` | 유다(봇)·에브라임·베냐민 |
| `worker/src/env.ts` | `Env`, `RoomMode`, `RosterEntry`, `RoomInit`, `GameRoomRpc`, `MatchmakerRpc` | 에브라임·베냐민 |
| `worker/src/store/store.ts` | `Store`, `StoreError`(`code`: `NICKNAME_TAKEN`·`RATING_CHANGED`·`STORE_UNAVAILABLE`), `Profile`, `Progress`, `PlayerSnapshot`, `PersonalRecord`, `SlotStats`, `MatchStats`, `ProgressUpdate`, `RecordMatchInput`, `RecordMatchResult`, `RecordPracticeInput`, `MatchListItem`, `LeaderboardRow`, `HeroId`, `BotLevel`, `MatchMode`, `EndReason`, `Slot` | 에브라임·베냐민 |

### 7.2 콘텐츠 JSON 구조 (기반 확정 — data-ark §8 구체화)

- **action 형식:** heroes `skill.action`·angels `action`·armor `action`은 data-ark TBL-101·102·104의 객체 그대로이며, 서버 `effect.action`(API-255)에 **같은 객체를 그대로** 싣는다. 클라이언트 `battle/effect-applier.js`는 `action.type`으로 분기한다: `destroyTopBlocks(count)`, `landingHint(durationMs)`, `garbageImmune(durationMs)`, `removeBottomGarbage(rows)`, `negateSpirits(spiritIds, charges)`, `revealQueue(count, landingHint)`, `burnIncoming(rows)`, `cleanseCurses(categories)`, `removeGarbageRow(rows)`, `wardCategories(categories, charges, clearActive)`, `reduceNextGarbage(rows)`, `blockNextAttack`, `reflectNextAttack` + 서버 전용 `offset(rows)`, `overcome(clearCurses, clearVision, removeGarbageRows)`, 특수 칸 `jerichoBlast(center:[행,열], size:3)`·`mannaFaith(amount:25)`.
- **spirits `effect`:** `{ kinds: string[], durationMs: int(즉시형·줄 단위형 0), params: object }` — `kinds` 값은 data-ark §8.8.6의 효과 이름(`darken`, `muteSfx`, `hideNext`, `shadowSwarm`, `fakeNext`, `fakeGhost`, `wrongGhost`, `flySwarm`, `wind`, `angelSeal`, `locustHoles`, `reverseLR`, `leadRow`, `drunkenWave`, `falseAngel`, `blackout`). 서버 `attack`(API-254)의 `duration` = `durationMs`, `params` = 이 객체 + 서버가 굴린 값(`wind.direction`, `locustHoles.columns`).
- **emblem `palette`:** design-vision §2.3 블록 토큰 접미사 (`gold`, `blue-sky`, `purple`, `silver`, `blue-deep`, `scarlet`) — D4-07.
- **balance.json 최상위 키:** `attack`, `spiritGrades`, `faith`, `specials`, `interference`, `quiz`, `gravity`, `input`, `grace`, `bots`, `invite`, `elo`, `match`, `reactions` (각 값은 data-ark §8.8 수치 그대로). 스킬·천사 비용·쿨다운의 단일 원천은 heroes/angels JSON (D4-05).
- **verses.json 필수 ref (잇사갈 — 30개 + 퀴즈 해설 구절):** `1 Samuel 17:49`, `1 Kings 3:9`, `Matthew 16:18`, `Acts 16:26`, `Jude 1:9`, `Luke 1:19`, `Genesis 3:24`, `Isaiah 6:6-7`, `Hebrews 1:14`, `Mark 1:23`, `Mark 9:25`, `Mark 5:9`, `1 Kings 22:22`, `Acts 16:16`, `Matthew 12:24`, `Ephesians 2:2`, `Daniel 10:13`, `Revelation 9:11`, `Revelation 2:20`, `Zechariah 5:7-8`, `Revelation 17:5`, `2 Corinthians 11:14`, `Revelation 12:9`, `Ephesians 6:14`, `Ephesians 6:15`, `Ephesians 6:16`, `Ephesians 6:17`, `John 16:33`, `John 1:5`, `2 Timothy 4:7`. 범위 절(`Isaiah 6:6-7`, `Zechariah 5:7-8`)의 `kjv`는 두 절을 이어 쓴다.

### 7.3 C-SPECIAL — 특수 칸 굴림 알고리즘 (유다 `engine/specials.js` 생성 ↔ 에브라임 `room/specials.ts` 검증 — D-14 "같은 수식")

```
입력: seed(start.seed), mode, stage(start.stage), n(라운드 내 출현 순번 0,1,2,… = clear.specials[].pieceIndex),
      combo(블록 n이 출현하는 순간의 콤보 값 — 콤보 중이 아니면 0), stackHeight·inDanger(그 순간의 고정 격자 — danger.js),
      nextWordAt(라운드 시작 시 null)
스트림: rand = mulberry32(deriveSeed(seed, balance.specials.seedXor)) — 라운드마다 새로 만든다
매 블록 n마다 항상 2회 소비: u1 = rand(), u2 = rand()   (특수 칸이 없어도 소비 — 서버 재계산 가능, D-14)
cellIndex = floor(u2 × 4)   → absoluteCells(출현 자세) 순서의 칸 번호 0~3

1) 말씀 칸 (mode ≠ practice 이고 stage ≥ 1):
     nextWordAt이 null이면 nextWordAt = n + minGap + floor(u1 × (maxGap − minGap + 1))   (minGap 7, maxGap 12)
     n == nextWordAt 이면 → kind = 'word', nextWordAt = n + minGap + floor(u1 × (maxGap − minGap + 1)), 끝
2) 확률 구간 (u1 하나를 누적 구간으로 판정 — 우선순위 말씀 > 여리고 > 만나 > 갑주):
     pJ = stage ≥ 2 ? min(jericho.base + jericho.perCombo × min(max(combo,0), comboCap), jericho.max) : 0
     pM = stage ≥ 2 ? (inDanger ? manna.dangerChance : stackHeight ≥ manna.highThresholdRows ? manna.highChance : manna.lowChance) : 0
     pA = mode ≠ practice ? armor.chance : 0           (갑주 칸은 해금 단계와 무관)
     u1 < pJ            → 'jericho'
     u1 < pJ + pM       → 'manna'
     u1 < pJ + pM + pA  → 'armor', armorId = ARMOR_IDS[floor((u1 − pJ − pM) / pA × 6)]
     그 밖              → 특수 칸 없음
서버 검증(R-09) — 클라이언트 보드 상태를 모르므로 상한으로 검사:
     같은 (seed, n)로 u1·u2를 재계산 → word: 말씀 칸 위치(nextWordAt 수열)는 시드만으로 정해지므로 서버가 정확히 재계산해
       n이 그 수열에 있어야 인정 (stage≥1·대전). 수열에 있는 n에 다른 종류를 주장하면 거부
     jericho: stage≥2 · u1 < jericho.max · manna: stage≥2 · u1 < jericho.max + manna.dangerChance
     armor: 대전 · u1 < jericho.max + manna.dangerChance + armor.chance · armorId가 위 식(가능한 pJ+pM 범위 안의 값)과 일치
     같은 pieceIndex 2회 인정 금지. `clear.specials[].pieceIndex` = 이 n.
```

### 7.4 BotPlayer (유다 `worker/src/room/bot/*` → 에브라임 GameRoom)

```ts
// worker/src/room/bot/bot-player.ts  — FR-021 (봇은 스킬·천사·갑주를 쓰지 않는다, OQ #6)
export interface BotInit { level: 'easy' | 'normal' | 'hard'; seed: number; stage: 0 | 1 | 2; startAt: number; matchElapsedMs: number }
export interface BotOutput { type: 'state' | 'clear' | 'topout'; data: Record<string, unknown> } // data = api-gate API-203·204·207 필드 그대로(seq 포함 — 봇 자체 카운터, 엄격 증가)
export interface BotPlayer {
  tick(now: number): BotOutput[];          // GameRoom이 ≤ 50ms 간격으로 호출. state는 83ms(12Hz)마다 1건
  receiveAttack(attack: { garbage: number; holeColumn: number; spiritId: string | null; duration: number; params: Record<string, unknown> }): void; // API-254 data
  applyEffect(effect: { kind: string; id: string; action: { type: string; [k: string]: unknown } }): void;  // 봇 보드가 대상인 API-255 (다윗 물맷돌 등)
  freeze(now: number): void;               // 말씀 대결 정지
  resume(now: number): void;               // resumeAt 도달
  readonly toppedOut: boolean;
}
export function createBotPlayer(init: BotInit): BotPlayer;
// worker/src/room/bot/bot-quiz.ts — FR-022
export function planBotQuizAnswer(level: 'easy' | 'normal' | 'hard', answerIndex: number, rand: () => number): { choice: 0 | 1 | 2 | 3; delayMs: number };
```
- 봇 출력은 사람 `clear`와 **같은 판정 파이프라인**(진행 검증 → 공격 → 영)을 지난다 (FR-021 "봇 대전의 공격도 서버가 판정"). 봇 특수 칸도 §7.3을 따른다.

### 7.5 서버 서비스 (베냐민 → 에브라임)

```ts
// worker/src/auth/token.ts — FR-012, 봉인 제3계명
export function generateToken(): string;                                   // 43자 base64url (32바이트 난수)
export async function hashToken(token: string): Promise<string>;           // SHA-256 hex 64자
export async function resolveGuest(store: Store, token: unknown): Promise<Profile | null>; // 형식 검사(PATTERNS.TOKEN) → 해시 → getProfileByTokenHash
// worker/src/protocol/validate.ts — NFR-003 (상태 없는 스키마 검사: 크기·JSON·봉투·type·필드 타입·범위·추가 필드·R-08)
export type Channel = 'matchmaker' | 'room';
export function parseClientFrame(channel: Channel, raw: string | ArrayBuffer):
  { ok: true; type: string; data: Record<string, unknown> } | { ok: false; code: 'INVALID_MESSAGE'; ref: string };
// worker/src/protocol/rate-limit.ts — D-31 (소켓 1개당 인스턴스 1개, 시각은 인자)
export interface RateLimiter { check(type: string, now: number): 'ok' | 'ignore' | 'reject'; noteRejected(now: number): boolean /* true → 4008로 닫는다 */ }
export function createRateLimiter(): RateLimiter;
// worker/src/store/select-store.ts — FR-072 (isolate당 1회 계산 캐시)
export function selectStore(env: Env): Store;
// worker/src/results/record-match.ts — FR-065~068, FR-070, D-20, D-21
export interface SlotOutcome { slot: 1 | 2; guestId: string | null; heroId: HeroId; isBot: boolean; botLevel: BotLevel | null;
  ratingAtStart: number | null; roundsDelta: number; lossStreak: number }
export interface MatchOutcome { roomId: string; mode: MatchMode; slots: [SlotOutcome, SlotOutcome]; winnerSlot: 1 | 2;
  score: [number, number]; endReason: EndReason; durationMs: number; stats: MatchStats }
export interface SlotResult { ratingDelta: number | null; rating: number | null; record: PersonalRecord;
  growth: { maxCombo: number; attackPerMin: number; quizAccuracy: number } | null; achievements: string[] }
export async function recordMatchOutcome(store: Store, outcome: MatchOutcome): Promise<{ saved: boolean; slots: { 1: SlotResult; 2: SlotResult } }>;
export async function recordPracticeOutcome(store: Store, input: { guestId: string; roundsDelta: number; stats: SlotStats; playTimeMs: number }):
  Promise<{ saved: boolean; record: PersonalRecord; growth: SlotResult['growth'] }>;
```
- `recordMatchOutcome`은 저장 실패해도 던지지 않고 `saved: false`와 계산된 기록을 돌려준다 (UC-015 E2 — 결과 화면은 표시). 개인 기록·성장 수치·Elo·업적 계산은 전부 베냐민 쪽 (`personal-record.ts`, `elo.ts`, `achievements.ts`).
- `seq`·`garbageIn` 단조 증가, 콤보·B2B 일관성(R-02~R-07)은 **에브라임 `progress-guard.ts`**가 검사한다 (validate는 상태 없음).

### 7.6 Durable Object 경계 (에브라임 ↔ 베냐민)

| 항목 | 계약 |
|:---|:---|
| GameRoom 클래스 | `worker/src/game-room.ts`: `export class GameRoom extends DurableObject<Env> implements GameRoomRpc` — `init(init: RoomInit)` RPC, `fetch(request)`는 Worker가 Upgrade·Origin·UUID 검사를 마친 `/ws/room/:roomId` 요청만 받는다. 초기화 전이면 404 JSON `{success:false, error:{code:'ROOM_NOT_FOUND', message}}`, 아니면 `ctx.acceptWebSocket` 후 101 |
| Matchmaker 클래스 | `worker/src/matchmaker.ts`: `export class Matchmaker extends DurableObject<Env> implements MatchmakerRpc` — 싱글턴 `idFromName('global')`. Store 메서드 RPC는 `DoSqliteStore`에 위임, `roomClosed(roomId)`는 초대 코드 즉시 `closed` |
| 방 생성 순서 | 베냐민 `room-factory.ts`: `roomId = crypto.randomUUID()` → `env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId)).init(roomInit)` 완료 → 그다음 `matched` 송신 (API-153) |
| 방 종료 통지 | 에브라임: 경기·연습이 끝나거나 방이 무효가 되면 `env.MATCHMAKER.get(env.MATCHMAKER.idFromName('global')).roomClosed(roomId)` 1회 (실패는 로그만) |
| RPC 형 변환 | `DurableObjectNamespace.get()` 결과는 `as unknown as GameRoomRpc` / `as unknown as MatchmakerRpc`로 좁힌다 (env.ts가 클래스 타입을 import 하지 않기 때문 — 순환 방지) |
| 진입 export | 베냐민 `index.ts`가 두 클래스를 re-export (§3.5) |

### 7.7 RoomConnection (므낫세 `client/js/net/room-client.js` → 유다 `battle-controller.js`, 므낫세 `battle-screen.js`)

```js
// FR-008, API-006·201~262 — GameRoom 소켓은 자동 재연결하지 않는다 (api-gate §4.3)
export function connectRoom({ roomId, token, heroId }) // → RoomConnection. 열리면 join(API-201)을 자동 송신
RoomConnection = {
  on(type, handler) → off,          // type: ROOM_S2C 값 또는 MSG_ERROR('error'). handler(data) / error는 handler(errorObj{code,message,ref,retryAfterMs?})
                                    // 같은 type에 처리기 여러 개 가능 (컨트롤러·화면이 함께 구독)
  onClose(handler(code, reason)) → off,
  send(type, data),                 // ready · skill · armor · quizAnswer · reaction · quit
  sendSequenced(type, data),        // state · clear · topout — seq를 자동 부여 (소켓별 1부터 엄격 증가, D4-17)
  startStateStream(getSnapshot),    // 83ms마다 getSnapshot() → {board, active, score, garbageIn} 또는 null(건너뜀) → state 송신
  stopStateStream(),
  toLocalTime(serverEpochMs) → localEpochMs, // start 수신 시 (startAt − countdown) ≈ 서버 송신 시각으로 오프셋 추정
  close(),
}
```

### 7.8 BattleController ↔ battle-screen (유다 ↔ 므낫세)

```js
// 유다 client/js/battle/battle-controller.js — FR-001~011, FR-025, FR-027~030, FR-061
export function createBattleController({ room, joined, scene, ui, keyTarget, touchSurface })
// room = RoomConnection(§7.7) · joined = API-251 data · scene = BattleScene(§7.9, battle-screen이 만든 것)
// ui = BattleUiPort(아래, battle-screen 구현) · keyTarget = window · touchSurface = 내 보드 영역 DOM
→ BattleController = {
  ready(),                 // 장면 준비 완료 → ready(API-202) 송신
  perform(action),         // 'skill' | 'angel:' + angelId | 'armor:' + armorId — 화면 키캡 버튼(터치)이 호출
  setPaused(paused),       // 연습 모드 일시 메뉴만 엔진 정지 (D3-20). 대전·봇은 무시
  dispose(),               // 입력 해제 · 상태 스트림 중지 · 프레임 루프 중지 · feedback detach
}
// 므낫세 client/js/screens/battle-screen.js 가 구현해 넘기는 BattleUiPort
BattleUiPort = {
  updateHud(hud: HudState),                        // DOM HUD-01·05·06·07·08·09·10·14·15 (수치·키캡 상태·칩)
  showRoundEnd(roundEnd /* API-261 data */, mySlot),
  showToast(message, { key, untilMs } = {}),       // HUD-18, 문구는 ERRORS[code].message
  announce(text),                                  // HUD-17 aria-live
  keycapRejected(keyId /* skillId | armorId */, code), // EVT-41~44 키캡 흔들림
  openPauseMenu(),                                 // Esc · P · [Ⅱ] · popstate
  quizChoose(index /* 0~3 */),                     // 말씀 대결 중 1~4 키 → quiz-panel
  onReactionKey(reactionId),                       // 7·8·9 키 → 화면이 송신·1500ms 간격·말풍선 처리
}
```

| 메시지 (S→C) | 처리 지파 |
|:---|:---|
| `start`, `opponentState`, `attack`, `effect`, `playerStatus`, `roundEnd`(보드 연출·다음 라운드 준비) | 유다 (컨트롤러) |
| `quizStart`(엔진 정지)·`quizResult`(`resumeAt` 재개 예약) | 유다 (엔진) + 므낫세 (quiz-panel 표시) 둘 다 구독 |
| `joined`(골격), `quizLock`, `reaction`, `roundEnd`(배너 — `ui.showRoundEnd`는 컨트롤러가 호출), `matchEnd`(세션 저장 → SCR-006) | 므낫세 |
| `error` ref ∈ {`skill`,`armor`,`clear`,`state`,`topout`,`ready`} | 유다 (토스트·키캡은 `ui` 경유) |
| `error` 그 밖(`OPPONENT_LEFT`, `BOT_FAILURE`, 입장 거부, `quizAnswer`·`reaction` ref), 소켓 종료 코드 | 므낫세 |

### 7.9 렌더·연출 API (납달리 → 유다·므낫세)

```js
// render/pixi-app.js — FR-048, NFR-001 (import 'pixi.js/unsafe-eval' 포함 — §3.3-7)
export async function createBattleScene({ stageHost, overlayHost, mode, mySlot, players }) // → BattleScene
BattleScene = {
  renderMyBoard(state: BoardRenderState),       // 컨트롤러가 매 프레임 호출
  renderOpponentBoard(state: { grid, active } | null),
  updateHud(hud: HudState),                     // Pixi 측 HUD: 홀드·다음 블록 모양·게이지 막대·갑주 문장·은혜 ✧ (D4-15)
  layout() → { cellSize, myBoard, opponentBoard, lane, hold, next }, // 각 값 {x,y,width,height} CSS px (stageHost 기준, design-vision §5.2)
  onLayout(cb) → off,                           // 크기 변경 시 — battle-screen이 DOM HUD 위치를 맞춘다
  destroy(),
}
BoardRenderState = { grid /* encode.js 격자 */, active /* {type,rot,x,y}|null */, ghost /* 표시용(가짜·틀린 고스트 반영 후)|null */,
                     hint /* 솔로몬·가브리엘 착지 힌트|null */, inDanger: boolean, leadRows: Array<{ row, clearsLeft }> }
HudState = {
  mode, mySlot, round, bestOf, score: [n, n], elapsedMs,
  me: { nickname, heroId, score, combo, b2b, hold /* type|null */, holdUsed, next /* type[] — 표시 개수·가짜 반영 후 */, nextHidden,
        faith, cooldowns /* {skillId: 남은 ms} */, sealedMs, armor /* armorId[] */, wards /* §7.12 */, pendingGarbage,
        grace, jesusUsed, reversed, activeSpirits: [{ spiritId, category, remainingMs /* null=줄 단위 */, clearsLeft /* null=시간형 */ }] },
  opponent: { nickname, heroId, isBot, botLevel, score } | null,
  keys: { [skillId | armorId]: 'ready' | 'cost' | 'cooldown' | 'sealed' | 'missing' | 'hidden' },  // design-vision §4.2 키캡 상태
}
// fx/feedback-sync.js — FR-061 (같은 프레임 시각·청각·히트스톱·흔들림), EVT-19 동시 피드백 규칙
export function attachScene(scene), detachScene()
export function emitFx(events: Array<{ evt: 'EVT-xx', ...payload }>) → { hitstopMs }  // 한 프레임 묶음 1회. 유다는 hitstopMs 동안 중력·고정 지연을 멈춘다
// 메뉴·결과 화면용 (므낫세 호출)
render/background-parallax.js: export function mountBackground(host) → { destroy() }   // 부팅 시 1회 (모든 메뉴 화면 공통 4층 배경)
render/emblems.js:             export async function renderEmblemCanvas(heroId, sizePx) → HTMLCanvasElement   // SCR-003·004·006·007 DOM용
fx/fx-intensity.js:            export function setShakeEnabled(on), setFlashLevel('normal' | 'reduced' | 'minimal'), getIntensity() → { shake: 0|1, flash: 1|0.5|0.2, shakeEnabled, flashLevel }, initIntensityFromSystem()  // D3-08·09
```

**EVT 발신자와 payload (design-vision §4.5~§4.10의 EVT-ID 그대로 — D4-16):**

| EVT | 발신 | payload | EVT | 발신 | payload |
|:---|:---|:---|:---|:---|:---|
| 01 이동 | 유다 | `{ active }` | 27 영 등장 | 유다 | `{ spiritId, target:'me'\|'opponent', durationMs, params }` |
| 02 회전 | 유다 | `{ from, to }` (active) | 28 영 종료 | 유다 | `{ spiritId, target }` |
| 04 소프트 드롭 | 유다 | `{}` | 29 스킬·천사 발동 | 유다 | `{ kind:'hero'\|'angel', id, target, action }` |
| 05 하드 드롭 | 유다 | `{ active, distance }` | 30 갑주 획득 | 유다 | `{ armorId, cell:[행,열] }` |
| 06 착지 | 유다 | `{ cells }` | 31 갑주 사용 | 유다 | `{ armorId }` |
| 07 홀드 | 유다 | `{ type }` | 32 예수님 | 유다 | `{ target }` |
| 09~12 줄 삭제 | 유다 | `{ rows, lines }` | 33 특수 칸 출현 | 유다 | `{ kind, cell }` |
| 13 콤보 | 유다 | `{ combo, lines }` | 34 말씀 대결 개시 | 므낫세 | `{ trigger }` |
| 14 T-Spin | 유다 | `{ lines }` | 36 대결 결과 | 므낫세 | `{ won, reward }` |
| 15 B2B | 유다 | `{}` | 37 재개 | 므낫세 | `{}` |
| 16 니어미스 | 유다 | `{ rows, target }` (D3-12) | 38 여리고 | 유다 | `{ center:[행,열] }` |
| 17 위험선 | 유다 | `{ inDanger }` | 39 만나 | 유다 | `{}` |
| 18 카운트다운 | 유다 | `{ round, startAtLocal, countdownMs }` | 47 Top-out | 유다 | `{}` |
| 20 공격 발사 | 유다 | `{ garbage }` | 48 라운드 승패 | 유다 | `{ won }` |
| 21 공격 받음 | 유다 | `{ garbage, fromSlot }` | 49 경기 승리 | 므낫세 | `{}` |
| 22 상쇄 | 유다 | `{ rows }` | 50 경기 패배 | 므낫세 | `{}` |
| 23 쓰레기 삽입 | 유다 | `{ rows }` | 51 이탈 승리 | 므낫세 | `{}` |
| 24 방패 차단 | 유다 | `{}` | 52 은혜 | 유다 | `{}` |
| 25 검 되돌림 | 유다 | `{ side:'me'\|'opponent' }` | 26 흉배·은혜 경감 | 유다 | `{ kind:'breastplate'\|'grace' }` |

- EVT-03·08(무연출), EVT-35(quiz-panel 자체), EVT-40(`updateHud`의 게이지 변화로 처리), EVT-41~46·53·54(DOM 토스트·키캡·말풍선·모달)는 `emitFx`로 보내지 않는다 — 므낫세 DOM 담당.
- 진동(`navigator.vibrate`, design-vision §4.4)은 유다 `input-touch.js`가 사건 표의 진동 열대로 직접 처리한다 (EVT-19 "가장 긴 진동 1회" 포함).
- 사건 → 효과음·BGM 큐 맵(design-vision §2.9)의 정본 실행 위치는 `fx/feedback-sync.js`다 (납달리가 §7.10 오디오 API를 호출).

### 7.10 오디오 API (스불론 → 납달리·므낫세)

```js
// audio/audio-engine.js — FR-060, D-24
export async function unlockAudio() → boolean          // 첫 클릭·키·터치에서 Tone.start() (므낫세 main.js)
export function isAudioUnlocked() → boolean
export function setVolume(bus /* 'master'|'sfx'|'music' */, value /* 0~100 */)   // 0 = 무음, 그 외 20·log10(v/100) dB
export function getVolumes() → { master, sfx, music, muted }   // 초기 80 / 80 / 60, 음소거 false (저장 안 함 — N-04)
export function setMuted(muted)                         // 마스터 mute, 해제 시 이전 값 복원
export function muteSfxBusFor(ms, delayMs = 0)          // 귀먹고 말 못하게 하는 귀신 (FR-027)
export function volumeToDb(value) → number              // 순수 함수 (테스트 대상)
// audio/sfx-play.js — SFX-01~09 · audio/sfx-battle.js — SFX-10~17 (FR-058)
export function playControlSfx(id /* 'SFX-01'~'SFX-09' */, opts = {})
export function playBattleSfx(id /* 'SFX-10'~'SFX-17' */, opts = {})
// opts: { lines?: 1~4 (SFX-07), combo?: n (SFX-08), semitones?: 변주 반음, volumeScale?: 0~1, durationMs?: 길이 변주(SFX-12 영 지속·SFX-13 4000ms 유지) }
// audio/bgm.js — FR-059, FR-055 (design-vision §4.11 상태 기계)
export function setBgmState(state /* 'lobby' | 'battle' | 'stopped' */)   // BGM-01 / BGM-02 / 정지 (교차 페이드 1000ms)
export function setComboLevel(combo)                    // 패드 필터 +200Hz×콤보(상한 +1600), 0이면 600ms 원복
export function setDanger(inDanger)                     // 위기 레이어(124BPM·심장박동) 진입·이탈
export function duckMusic(db) → release()               // 말씀 대결 −6dB, 예수님 −9dB
```
- 호출 분담: 므낫세 = `unlockAudio`·`setVolume`·`setMuted`·`getVolumes`(옵션 화면), 메뉴 화면 진입 시 `setBgmState('lobby')`. 납달리 `feedback-sync` = 사건별 SFX, EVT-18 카운트다운 종료 시 `setBgmState('battle')`, EVT-13·17·32·34·37 BGM 제어, EVT-49·50(`setBgmState('stopped')` → 팡파르/패배음 → 3000ms 뒤 `setBgmState('lobby')`).

### 7.11 HTTP 성문·화면 (베냐민 ↔ 므낫세) — api-gate §3 그대로

- 므낫세 `net/http-api.js`는 api-gate API-001~004 요청·응답을 그대로 쓴다 (`Authorization: Bearer`, 상대 경로 `/api/...`, 빌드 변수 `VITE_SERVER_ORIGIN`이 있으면 앞에 붙임 — 로컬은 빈 값).
- 므낫세 `net/lobby-client.js`·`room-client.js`는 `/ws/matchmaker`·`/ws/room/:roomId` (같은 출처 — Vite 프록시). Matchmaker 소켓만 partysocket 자동 재연결.
- 베냐민 HTTP 테스트용 대체점: `handleFetch(request, env, ctx)`의 `env`에 테스트 전용 `Store`를 주입할 수 있도록, 라우트 모듈은 `selectStore(env)`를 직접 부르지 않고 `index.ts`가 만든 `deps.store`를 인자로 받는다.

### 7.12 서버 상태 표현 (에브라임 → 유다·므낫세, API-256 `playerStatus.wards` 구체화 — D4-14)

`wards = { vision: int, deception: int, control: int, speed: int, shield: boolean, reflect: boolean, breastplate: boolean, michael: int }` — 정수는 남은 무효 횟수(허리띠 = deception·control 각 1, 신 = speed 1, 투구 = vision 1, 미가엘 = 남은 상쇄 횟수), 불리언은 장전 여부(방패·검·흉배).

### 7.13 콘텐츠 검사 (잇사갈 → 레위·Phase 5)

`scripts/check-content.mjs`: `export function checkContent(contentDir) → { ok: boolean, errors: string[] }` + 직접 실행 시 결과 출력·실패 시 `process.exitCode = 1`. 검사 항목 = data-ark §8.9 전부 + 퀴즈 난이도·유형별 ≥ 15 + verses 필수 ref(§7.2) 존재.

---

## 8. Phase 4 결정 기록 (⚡ 자동 모드 — 가장 문자적 해석, NICE-TO-HAVE 승격 0건)

| # | 모호점·사건 | 채택 | 근거 |
|:--|:---|:---|:---|
| D4-01 | 의존성 잠금 | §1.2 — 계획 메이저 유지, 2026-10-06 이전 최신 안정판. tone은 `latest` 태그(15.1.22) | NFR-007, architecture §3.2 |
| D4-02 | 2개 이상 지파가 쓰는 파일 | 기반(공통 선행 단계)으로 승격: `protocol.js`, `rng.js`, `pieces.js`, `encode.js`, `danger.js`, `content-loader.js`, `content.ts`, `env.ts`, `store.ts`, 구조 콘텐츠 JSON 7종 | ORCH-01 경계표 원칙 ("겹치는 파일은 공통 선행 단계로 승격") |
| D4-03 | `verses.json`·`quiz.json` 시작 상태 | 기반이 빈 배열 `[]` 씨앗만 만들고(로더 import 해석용) 소유권을 잇사갈에 넘긴다. 기반은 이후 수정하지 않는다 | 영토 단일 소유, D4-02 |
| D4-04 | 클라이언트 번들의 quiz.json | 포함하지 않는다 — 문항은 `quizStart`, 정답·해설은 `quizResult`로만 받는다. FR-074의 "함께 쓴다"는 콘텐츠 집합 수준(구절·인물·상성표)으로 충족 | api-gate R-11, 봉인 제7계명 |
| D4-05 | 비용·쿨다운 정의 위치 (TBL-101·102 필수 필드 ↔ D-15 balance 단일 정의) | heroes/angels JSON의 `cost`·`cooldownMs`가 단일 원천, balance.json `faith`에는 충전 규칙만. 같은 수치를 두 파일에 쓰지 않는다 | D-15 취지(코드 상수 분산 금지), TBL-101·102 |
| D4-06 | spirits `effect` 형식·KJV 표기 길이 | `{kinds, durationMs, params}`. `nameKjv` 30자 상한 때문에 `prince of Persia`(Daniel 10:20 KJV 표기), `the great dragon`(Revelation 12:9)으로 둔다 | TBL-103, data-ark §8.8.6 |
| D4-07 | emblem palette 값 | design-vision §2.3 블록 토큰 접미사 | design-vision §2.4 위인 팔레트 |
| D4-08 | 특수 칸 굴림의 구체 수식 | §7.3 C-SPECIAL (누적 구간 1회 판정, 서버는 상한 검사) | D-14, R-09, data-ark §8.8.4 |
| D4-09 | 운영 전환에 필요한 Origin 목록 위치 | `wrangler.toml [vars] ALLOWED_ORIGINS` (로컬 두 출처). `compatibility_flags`는 두지 않는다 — 잠금한 @supabase/supabase-js 2.117.2 배포본에 Node 내장 모듈 import가 0건임을 확인 (스택 밖 설정 미추가) | api-gate API-005, architecture §4.4 "모드 전환은 환경변수로만" |
| D4-10 | 런타임 타입 | `wrangler types --include-env=false` → `worker/worker-configuration.d.ts`. `Env`는 `env.ts`가 직접 정의 (DO 클래스가 아직 없어도 기반 단독 타입 검사 가능) | architecture §3.1, §15 R1 |
| D4-11 | `build`의 서버 쪽 | `wrangler deploy --dry-run --outdir worker/dist` — 번들만 만들고 배포하지 않음 | C-008 |
| D4-12 | npm workspaces 실패 | 단일 package.json 루트로 재각 (architecture §15 R1, RTM §5) | FR-073 문장 불변 |
| D4-13 | 줄 수 예산 조정 | `store/store.ts` 80 → ~185 (도메인 타입 포함, 단일 책임), `screens/battle-screen.js` 180 → ~260 (BattleUiPort 구현 포함), `fx/feedback-sync.js` 150 → ~220 (EVT 큐 표 포함). 모두 300 이하 | SKILL-04 줄 수 가이드 |
| D4-14 | `playerStatus.wards` 키 | §7.12 — API-256 예시 키에 deception·control·speed 정수 추가 (허리띠·신의 범주 무효) | armor.json action, OQ #8 |
| D4-15 | HUD의 Pixi/DOM 분담 | Pixi(`hud-view.js`) = 홀드·다음 블록 모양·게이지 막대·갑주 문장·은혜 ✧ / DOM(`battle-screen.js`) = 수치·키캡·칩·배너·토스트·라이브 영역 | design-vision §1 렌더링 분담 |
| D4-16 | EVT 발신자 | §7.9 표 — 엔진·서버 판정 결과는 유다, 말씀 대결·경기 결과 화면은 므낫세. 효과음 큐 맵 실행은 `feedback-sync` | FR-061, design-vision §2.9 |
| D4-17 | `seq` 부여 위치 | `room-client.js`가 state·clear·topout 공유 카운터로 자동 부여 | api-gate §2.6 seq, R-02 |
| D4-18 | 지파 수·이름 | 7지파(유다·에브라임·베냐민·납달리·스불론·므낫세·잇사갈) + 레위(QA) + 여호수아(통합) | ORCH-01, task-wall 부록 |

---

## 9. 지파 인계 체크리스트 (모세 → 각 지파 — ORCH-01 3단계)

1. 자기 지파 행만 발췌한 task-wall 부록(지파 배정표 + 자기 TASK 행), 이 문서 §1~§7 전부, `security-seal-봉인.md`.
2. 자기 도메인 정경 절: 유다(api-gate §2.6·§3 API-203~207, data-ark §8.8.4·§8.8.8·§8.8.10, design-vision §4.3~§4.10), 에브라임(api-gate §2.8·§3 API-201~262, data-ark §8.8 전부), 베냐민(api-gate §2~§5, data-ark §1~§7), 납달리(design-vision §2.3~§2.10·§3.5~§3.7·§4.5~§4.12·§5.2), 스불론(design-vision §2.9·§4.11), 므낫세(screen-vision 전부, design-vision §2.1~§2.6·§3·§4.1~§4.4·§5·§6, api-gate §3·§4.2), 잇사갈(data-ark §8·§8.9, spec-tablet C-003·C-010·FR-043).
3. 완료 시 ORCH-01 4단계 "정복 완료 보고" 표 + 실행한 테스트 명령과 결과.
