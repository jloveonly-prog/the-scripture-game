# 🔨 개발 가이드 (Devguide Commandment) — 영적 전쟁 테트리스

> *"Thy word is a lamp unto my feet, and a light unto my path."* — Psalm 119:105 (KJV)
>
> **규격:** `statute-율법/04.development-repentance-회개/devguide-commandment-개발계명-template.md` (필수 6섹션) + SKILL-04 "devguide에 기록하라" 3항목(앱 export 결정 · 계층 분리 결정과 근거 · 예외처리)
> **참조 예시:** `parable-비유/04.development-repentance-회개/devguide-commandment-개발계명-example.md`
> **시큐어 코딩 원본:** `statute-율법/04.development-repentance-회개/security-seal-봉인.md` (봉인의 율법 10계명)
> **짝 산출물:** [`task-wall-성벽.md`](./task-wall-성벽.md) — 태스크·파일·지역·Doer/Witness의 원본. 이 문서는 "어떻게 쓰는가"의 원본이다.
> **근거 정경:** [`architecture-temple-성전설계.md`](../02.architecture-foundation-기초/architecture-temple-성전설계.md) §3 기술 스택·§5 폴더 구조·§10 보안·§11 결정 체인 · [`data-ark-법궤.md`](../02.architecture-foundation-기초/data-ark-법궤.md) · [`api-gate-성문.md`](../02.architecture-foundation-기초/api-gate-성문.md) §2 공통 규약·§4 에러 코드 · [`design-vision-디자인명세.md`](../03.design-order-질서/design-vision-디자인명세.md) · [`screen-vision-화면설계.md`](../03.design-order-질서/screen-vision-화면설계.md) §9 Phase 4 인계
> **작성일:** 2026-10-19 · **상태:** Canonized(정경화) 후보 — Phase 4 진행 중 §4 현황만 갱신한다

---

## 1. 프로젝트 설정

### 1.1 기본

| 항목 | 내용 |
|:---|:---|
| 언어 | 클라이언트·공유 엔진: 바닐라 JavaScript (ES Modules, `"type": "module"`) / 서버: TypeScript (Workers) |
| 프레임워크 | 없음 — 클라이언트 Vite 번들 + PixiJS v8, 서버 Cloudflare Workers + Durable Objects (C-005, C-006: Socket.IO·Express 금지) |
| 패키지 매니저 | npm 10 + **npm workspaces** (`"workspaces": ["client", "worker"]`), lockfile `package-lock.json` 커밋 (NFR-007) |
| 런타임 | Node.js ≥ 22.12 (현 환경 22.22.0) · workerd 1.20261001.1 (wrangler 4.147.0 내장) |
| 소스 루트 | `the-scripture-aidd/fruit-열매/` (C-012) — 최상위 `client/` · `worker/` · `content/` · `supabase/` + 실행 보조 `scripts/` |
| 린터/포매터 | 별도 도구 없음(원문 스택 밖 의존 추가 금지 — P2-001). 형식 규칙은 §3.7을 사람이 지키고 Witness가 대조한다 |
| 외부 키 | 0개로 전부 동작 (C-004). Supabase는 `worker/.dev.vars`에 `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` **둘 다** 있을 때만 |

### 1.2 버전 고정표 (NFR-007 — architecture §3 실조회값 그대로, `^`·`~` 금지)

> 기준: 2026-10-19 현재 출시 2주 이상(2026-10-05 이전) 최신 안정판. 예외 2건은 Phase 2 결정 체인에 근거가 있다.

| 패키지 | 고정 버전 | 위치 (`package.json`) | 출시일 | 비고 |
|:---|:---|:---|:---|:---|
| vite | **8.3.2** | client devDependencies | 2026-10-01 | 개발 서버·번들 |
| pixi.js | **8.22.0** | client dependencies | 2026-10-01 | |
| pixi-filters | **6.1.5** | client dependencies | 2025-11-29 | |
| gsap | **3.15.0** | client dependencies | 2026-04-13 | |
| tone | **15.1.22** | client dependencies | 2025-04-27 | `latest` 채널 — 15.5.x는 `next`(프리릴리스)라 제외 (A-06) |
| canvas-confetti | **1.9.4** | client dependencies | 2025-10-25 | |
| partysocket | **1.3.0** | client dependencies | 2026-06-23 | 로비 소켓만 (OQ #18) |
| @fontsource/cinzel | **5.3.0** | client dependencies | 2026-07-19 | |
| @fontsource/noto-serif-kr | **5.3.0** | client dependencies | 2026-07-19 | |
| wrangler | **4.147.0** | worker devDependencies | 2026-10-02 | workerd 1.20261001.1 |
| typescript | **7.0.2** | worker devDependencies | 2026-07-08 | 타입 검사 전용 (번들은 wrangler 내장 esbuild) |
| @cloudflare/workers-types | **5.20261004.1** | worker devDependencies | 2026-10-04 | |
| @supabase/supabase-js | **2.117.2** | worker dependencies | 2026-09-25 | 선택 어댑터 |
| vitest | **5.0.3** | 루트 devDependencies | 2026-09-30 | `test.projects` |
| @playwright/test | **1.56.1** | 루트 devDependencies | 2025-10-17 | 예외: 설치된 `/opt/pw-browsers/chromium-1194` 정합 (D-17, A-06) |
| concurrently | **10.0.5** | 루트 devDependencies | 2026-08-15 | `npm run dev` 동시 기동 |

> 새 의존성 추가 금지. 필요해 보이면 멈추고 Phase 2 결정 체인(D-16 "추가 의존 없이")과 대조한 뒤 RTM §5 두 번째 돌판 절차를 밟는다.

### 1.3 매니페스트 명령 (SKILL-04 "test 명령 등록 — 언어 무관" 필수)

| 위치 | 스크립트 | 명령 | 근거 |
|:---|:---|:---|:---|
| 루트 `package.json` | `predev` | `node scripts/check-ports.mjs` | UC-021 E1 (A-11) |
| 루트 `package.json` | `dev` | `concurrently -k -n client,worker "npm run dev -w client" "npm run dev -w worker"` | FR-073, D-03 |
| 루트 `package.json` | **`test`** | **`vitest run`** — `vitest.config.js` `test.projects` 3종(client · worker · content)을 한 번에 | REQ-017, FR-075, SKILL-04 🚨 |
| 루트 `package.json` | `check:content` | `node content/check-content.mjs` | FR-076 |
| 루트 `package.json` | `test:e2e` | `playwright test` | FR-077 (spec은 Phase 5) |
| `client/package.json` | `dev` | `vite --port 5173 --strictPort` | architecture §4 |
| `worker/package.json` | `dev` | `wrangler dev --port 8787 --ip 127.0.0.1` | architecture §4 |

**`worker/wrangler.toml` 고정 항목:** `name = "spiritual-warfare-tetris"` · `main = "src/index.ts"` · `compatibility_date = "2026-10-01"`(workerd 1.20261001.1이 지원하는 최신 날짜 이하) · `[[durable_objects.bindings]]` `MATCHMAKER`→`Matchmaker`, `GAME_ROOM`→`GameRoom` · `[[migrations]] tag = "v1"`, `new_sqlite_classes = ["Matchmaker", "GameRoom"]` (data-ark §7) · `[vars] ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"` (architecture §10 제7계명). Supabase 키는 `[vars]`에 절대 쓰지 않는다(`.dev.vars`만).

**`client/vite.config.js` 고정 항목:** `server.port 5173`, `strictPort: true`, `server.proxy` `'/api' → http://127.0.0.1:8787`, `'/ws' → { target: 'ws://127.0.0.1:8787', ws: true }`, `server.fs.allow: ['..']`(content/ 상대 import — architecture §5.2).

**실행 환경 변수:** `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` (D-17). `WRANGLER_SEND_METRICS=false`는 필요 시 README에 안내만(키 아님).

---

## 2. 디렉토리 구조

### 2.1 전체 트리 (task-wall §3 생성 파일 141개 — 주석 = TASK-ID ~예상 줄수)

```
fruit-열매/
├── client/
│   ├── js/
│   │   ├── art/
│   │   │   ├── shapes-angels.js             # TASK-044-3 ~220
│   │   │   ├── shapes-heroes-armor.js       # TASK-044-2 ~240
│   │   │   ├── shapes-spirits.js            # TASK-044-3 ~280
│   │   │   ├── shapes-ui.js                 # TASK-044-1 ~170
│   │   │   ├── to-pixi.js                   # TASK-044-1 ~90
│   │   │   └── to-svg.js                    # TASK-044-1 ~70
│   │   ├── audio/
│   │   │   ├── aux-sfx.js                   # TASK-050-2 ~220
│   │   │   ├── bgm.js                       # TASK-050-1 ~230
│   │   │   ├── mixer.js                     # TASK-050-1 ~120
│   │   │   └── sfx.js                       # TASK-050-2 ~260
│   │   ├── engine/
│   │   │   ├── bag.js                       # TASK-010-1 ~50
│   │   │   ├── board.js                     # TASK-010-2 ~220
│   │   │   ├── gravity.js                   # TASK-010-3 ~40
│   │   │   ├── index.js                     # TASK-010-4 ~240
│   │   │   ├── piece.js                     # TASK-010-1 ~90
│   │   │   ├── placement.js                 # TASK-019 ~80 (착지 평가 — 힌트·봇 공용, RTM §5 DCL-004)
│   │   │   ├── rng.js                       # TASK-010-1 ~45
│   │   │   ├── scoring.js                   # TASK-010-2 ~130
│   │   │   ├── specials.js                  # TASK-010-3 ~150
│   │   │   └── srs.js                       # TASK-010-1 ~90
│   │   ├── fx/
│   │   │   ├── arrows.js                    # TASK-051-2 ~190
│   │   │   ├── confetti.js                  # TASK-051-2 ~60
│   │   │   ├── flash.js                     # TASK-051-1 ~90
│   │   │   ├── hitstop.js                   # TASK-051-1 ~60
│   │   │   ├── juice-table-core.js          # TASK-053 ~260
│   │   │   ├── juice-table-powers.js        # TASK-053 ~280
│   │   │   ├── juice.js                     # TASK-053 ~150
│   │   │   ├── overlay.js                   # TASK-052 ~250
│   │   │   ├── reactions.js                 # TASK-052 ~80
│   │   │   ├── shake.js                     # TASK-051-1 ~90
│   │   │   └── verse-card.js                # TASK-052 ~190
│   │   ├── game/
│   │   │   ├── apply-attack.js              # TASK-011 ~150
│   │   │   ├── apply-effect.js              # TASK-011 ~220
│   │   │   ├── apply-spirit.js              # TASK-011 ~230
│   │   │   ├── board-codec.js               # TASK-011 ~70
│   │   │   ├── local-player.js              # TASK-065 ~240
│   │   │   └── server-events.js             # TASK-065 ~220
│   │   ├── input/
│   │   │   ├── keyboard.js                  # TASK-063 ~170
│   │   │   └── touch.js                     # TASK-063 ~190
│   │   ├── net/
│   │   │   ├── api.js                       # TASK-062-1 ~100
│   │   │   ├── lobby-socket.js              # TASK-062-2 ~120
│   │   │   └── room-socket.js               # TASK-062-2 ~130
│   │   ├── render/
│   │   │   ├── background.js                # TASK-043 ~180
│   │   │   ├── block-textures.js            # TASK-041 ~180
│   │   │   ├── board-view.js                # TASK-041 ~260
│   │   │   ├── filters.js                   # TASK-042 ~170
│   │   │   ├── holy-fx.js                   # TASK-045 ~240
│   │   │   ├── layout.js                    # TASK-040 ~130
│   │   │   ├── particles.js                 # TASK-042 ~220
│   │   │   ├── pixi-app.js                  # TASK-040 ~150
│   │   │   ├── quality.js                   # TASK-042 ~80
│   │   │   └── spirit-fx.js                 # TASK-045 ~260
│   │   ├── screens/
│   │   │   ├── battle-hud.js                # TASK-066 ~260
│   │   │   ├── battle-overlays.js           # TASK-066 ~270
│   │   │   ├── battle.js                    # TASK-066 ~230
│   │   │   ├── entry.js                     # TASK-064-1 ~150
│   │   │   ├── hero-select.js               # TASK-064-2 ~160
│   │   │   ├── history.js                   # TASK-067-2 ~130
│   │   │   ├── lobby.js                     # TASK-064-1 ~170
│   │   │   ├── options.js                   # TASK-067-2 ~170
│   │   │   ├── ranking.js                   # TASK-067-2 ~120
│   │   │   ├── result.js                    # TASK-067-1 ~210
│   │   │   ├── shell.js                     # TASK-061 ~170
│   │   │   └── waiting.js                   # TASK-064-2 ~190
│   │   ├── store/
│   │   │   ├── guest.js                     # TASK-062-1 ~50
│   │   │   ├── session.js                   # TASK-061 ~100
│   │   │   └── settings.js                  # TASK-062-1 ~70
│   │   ├── content.js                   # TASK-009 ~70
│   │   └── main.js                      # TASK-061 ~130
│   ├── styles/
│   │   ├── battle.css                   # TASK-060-2 ~260
│   │   ├── components.css               # TASK-060-1 ~250
│   │   ├── screens.css                  # TASK-060-2 ~280
│   │   └── tokens.css                   # TASK-060-1 ~160
│   ├── test/
│   │   └── engine-purity.test.js        # TASK-010-4 ~50
│   ├── index.html                   # TASK-060-1 ~60
│   ├── package.json                 # TASK-001-2 ~30
│   ├── style.css                    # TASK-060-1 ~15
│   └── vite.config.js               # TASK-001-2 ~40
├── content/
│   ├── angels.json                  # TASK-005 ~50
│   ├── armor.json                   # TASK-005 ~60
│   ├── check-content.mjs            # TASK-009 ~150
│   ├── counters.json                # TASK-005 ~75
│   ├── heroes.json                  # TASK-005 ~60
│   ├── quiz.json                    # TASK-007 ~75
│   ├── rules.json                   # TASK-008 ~210
│   ├── spirits.json                 # TASK-005 ~200
│   └── verses.json                  # TASK-006 ~90
├── scripts/
│   └── check-ports.mjs              # TASK-001-1 ~60
├── supabase/
│   └── migrations/
│       └── 0001_init.sql                # TASK-002 ~190
├── worker/
│   ├── src/
│   │   ├── bot/
│   │   │   ├── bot-player.ts                # TASK-019 ~210
│   │   │   └── placement.ts                 # TASK-019 ~60 (엔진 placement.js 점수 + 난이도 노이즈, DCL-004)
│   │   ├── lobby/
│   │   │   ├── lobby-flow.ts                # TASK-032 ~280 (D-02 분할 — 로비 흐름)
│   │   │   └── pairing.ts                   # TASK-032 ~200
│   │   ├── protocol/
│   │   │   ├── messages.ts                  # TASK-030 ~130
│   │   │   ├── rate-limit.ts                # TASK-030 ~100
│   │   │   └── validate.ts                  # TASK-030 ~270
│   │   ├── room/
│   │   │   ├── angels.ts                    # TASK-015-2 ~170
│   │   │   ├── armor.ts                     # TASK-015-2 ~170
│   │   │   ├── effects.ts                   # TASK-013 ~190
│   │   │   ├── garbage.ts                   # TASK-014 ~170
│   │   │   ├── handlers.ts                  # TASK-033 ~260
│   │   │   ├── hero-skills.ts               # TASK-015-1 ~170
│   │   │   ├── jesus.ts                     # TASK-015-1 ~90
│   │   │   ├── match-flow.ts                # TASK-018 ~250
│   │   │   ├── outbox.ts                    # TASK-033 ~70
│   │   │   ├── player-state.ts              # TASK-013 ~200
│   │   │   ├── quiz.ts                      # TASK-017 ~230
│   │   │   ├── results.ts                   # TASK-018 ~170
│   │   │   └── specials.ts                  # TASK-016 ~160
│   │   ├── routes/
│   │   │   ├── guests.ts                    # TASK-031 ~110
│   │   │   ├── leaderboard.ts               # TASK-031 ~60
│   │   │   ├── matches.ts                   # TASK-031 ~80
│   │   │   └── respond.ts                   # TASK-031 ~80
│   │   ├── services/
│   │   │   ├── elo.ts                       # TASK-020-1 ~40
│   │   │   ├── guest-service.ts             # TASK-020-1 ~150
│   │   │   ├── history-service.ts           # TASK-020-2 ~150
│   │   │   ├── progress-service.ts          # TASK-020-3 ~180
│   │   │   └── ranking-service.ts           # TASK-020-2 ~90
│   │   ├── storage/
│   │   │   ├── adapter.ts                   # TASK-003 ~110
│   │   │   ├── migrations.ts                # TASK-002 ~120
│   │   │   ├── select-storage.ts            # TASK-004 ~40
│   │   │   ├── sqlite-adapter.ts            # TASK-003 ~240
│   │   │   └── supabase-adapter.ts          # TASK-004 ~200
│   │   ├── attack.ts                    # TASK-012 ~160
│   │   ├── content.ts                   # TASK-009 ~90
│   │   ├── env.ts                       # TASK-001-4 ~30
│   │   ├── game-room.ts                 # TASK-033 ~210
│   │   ├── index.ts                     # TASK-034 ~130
│   │   ├── log.ts                       # TASK-001-4 ~50
│   │   └── matchmaker.ts                # TASK-032 ~240
│   ├── test/
│   │   ├── helpers/
│   │   │   └── sql-storage-fake.ts          # TASK-003 ~70
│   │   ├── ledger-fk.test.ts            # TASK-003 ~90
│   │   ├── specials.test.ts             # TASK-016 ~80
│   │   └── validate.test.ts             # TASK-030 ~120
│   ├── .dev.vars.example            # TASK-001-3 ~6
│   ├── package.json                 # TASK-001-3 ~25
│   ├── tsconfig.json                # TASK-001-3 ~25
│   └── wrangler.toml                # TASK-001-3 ~30
├── .gitignore                   # TASK-001-1 ~20
├── README.md                    # TASK-070 ~120
├── package.json                 # TASK-001-1 ~40
├── playwright.config.js         # TASK-001-5 ~35
└── vitest.config.js             # TASK-001-5 ~35
```

> `package-lock.json`(npm install이 생성), `.wrangler/`(wrangler dev가 생성 — 원장 SQLite 파일), `node_modules/`는 트리에 없다. `.wrangler/`·`.dev.vars`·`node_modules/`·`dist/`·`test-results/`·`playwright-report/`·`**/backup/`는 `.gitignore` (C-013, NFR-004).

### 2.2 계층 분리 결정 — architecture §5.3 트리 밖 파일의 근거 (SKILL-04 "분리 결정은 근거와 함께 기록")

| # | 결정 | 새 파일 | 소속 ARCH | 근거 |
|:--|:---|:---|:---|:---|
| L-01 | GameRoom 판정을 책임별로 분할 — DO 셸 / 수신 핸들러 / 송신 / 판정 논리 | `room/handlers.ts`, `room/outbox.ts`, `room/hero-skills.ts`, `room/jesus.ts`, `room/angels.ts`, `room/armor.ts` | ARCH-011 | task-wall A-01 — FR 약 30건이 한 컴포넌트에 몰림. 판정 논리는 `cloudflare:workers`를 모르게 해 Node 테스트 가능 |
| L-02 | 로비 매칭 논리를 DO 셸에서 분리 | `lobby/pairing.ts` | ARCH-010 | architecture §6 "Matchmaker 클래스 파일에는 매칭만" + 셸 240줄 상한 |
| L-03 | 저장소 선택 팩토리 분리 | `storage/select-storage.ts` | ARCH-014 | D-05 "키 둘 다 있을 때만 Supabase 생성" — 인터페이스 정의(adapter.ts)가 구현을 import하지 않게 |
| L-04 | Env 타입·구조화 로그 공용화 | `env.ts`, `log.ts` | ARCH-009, ARCH-014 | 봉인 제1·8계명을 한 곳에서 강제(토큰·해시·티켓 필드 차단) |
| L-05 | 클라이언트 저주(악한 영) 상태를 효과(effect) 적용과 분리 | `game/apply-spirit.js` | ARCH-003 | `attack` 경로(14종 저주)와 `effect` 경로(위인·천사·갑주·예수님·특수·은혜)는 트리거·만료 규칙이 다르다 |
| L-06 | 컨트롤러를 송신 루프와 수신 분배로 분리 | `game/server-events.js` | ARCH-003 | 서버 메시지 13종 분배 + juice 발행이 엔진 루프와 섞이면 300줄 초과 |
| L-07 | 코드 그래픽을 데이터(그리기 명령)와 출력기(Pixi·SVG)로 분리 | `art/*.js` 6개 | ARCH-004 (+ ARCH-001 DOM SVG) | design-vision §2.13 "Pixi Graphics로 굽고, DOM은 같은 좌표의 인라인 SVG" — 같은 좌표를 두 번 쓰지 않는다 |
| L-08 | 렌더러 보조 책임 분리 | `render/layout.js`, `render/block-textures.js`, `render/quality.js`, `render/spirit-fx.js`, `render/holy-fx.js` | ARCH-004 | design-vision §5.2(가상 해상도), §2.11(텍스처 굽기), §4.9(자동 품질), §2.8 SpiritLayer·HolyLayer |
| L-09 | 연출 지휘(Juice)를 디스패처와 이벤트 표 2개로 분리, 섬광 제한 분리 | `fx/juice.js`, `fx/juice-table-core.js`, `fx/juice-table-powers.js`, `fx/flash.js` | ARCH-005 | design-vision §4.6(이벤트 행 약 110개)·§4.8 섬광 1초 3회 제한 |
| L-10 | 보조 효과음 분리 | `audio/aux-sfx.js` | ARCH-006 | SFX 17종(FR-058 1:1)과 AUX 15종(D3-11)은 근거 FR이 다르다 |
| L-11 | 스타일을 진입점 + 4파일로 분리 | `styles/*.css` (`style.css`는 `@import`만) | ARCH-001 | 단일 style.css 예상 900줄+ → 500줄 규칙 |
| L-12 | 대전 화면 3분할, 공통 셸·세션 저장소 분리 | `screens/battle-hud.js`, `screens/battle-overlays.js`, `screens/shell.js`, `store/session.js` | ARCH-001, ARCH-008 | architecture §5.2 분리 예고, screen-vision 공통 셸·SessionStore |
| L-13 | 포트 사전 점검 스크립트, 실행 안내 문서 | `scripts/check-ports.mjs`, `README.md` | ARCH-017 | UC-021 E1 "해결 방법 출력", data-ark §7 "로컬 초기화 — 문서화" |
| L-14 | 원장 단위 테스트용 SqlStorage 모사 | `worker/test/helpers/sql-storage-fake.ts` | ARCH-018 | task-wall A-04 — 테스트 전용, 런타임 번들에 포함되지 않음 |
| L-15 | 로비 흐름을 Matchmaker DO 셸·원장 RPC 파사드에서 분리 (D-02 2026-10-19 — matchmaker.ts 실측 401줄) | `lobby/lobby-flow.ts` | ARCH-010 | task-wall §4.2 "300줄 넘으면 분할" + L-02와 같은 근거(Matchmaker 셸에는 소켓 분기·RPC만). cloudflare:workers 비의존 |

> 위 14건 모두 **기능 추가가 아니라 책임 분할**이다. 새 화면·새 메시지·새 테이블·새 수치는 0개 (P4-002).

---

## 3. 코딩 컨벤션

### 3.1 네이밍 (제10계명 — 이름에 영혼을 담으라)

| 대상 | 규칙 | 예 |
|:---|:---|:---|
| 파일 | kebab-case, 역할이 드러나는 이름 (task-wall §3 이름 그대로 — 임의 변경 금지) | `apply-spirit.js`, `guest-service.ts` |
| 함수·변수 | camelCase 동사구 / 명사구 | `computeAttack()`, `pendingGarbage` |
| 클래스 | PascalCase — DO 클래스명은 wrangler.toml과 정확히 일치 | `Matchmaker`, `GameRoom`, `Engine` |
| 상수 | UPPER_SNAKE_CASE | `MAX_MESSAGE_BYTES` (값은 rules.json에서 읽어 대입) |
| 게임 id | 콘텐츠의 snake_case id 그대로 (CODE-003·010·011, spirits id) — 번역·축약 금지 | `prince_of_the_air`, `shield_of_faith` |
| WS 메시지 `type` | api-gate 이름 그대로 (camelCase) | `opponentState`, `quizResult`, `matchEnd` |
| 에러 코드 | api-gate §4 SNAKE_CASE 그대로 | `NICKNAME_TAKEN`, `ANGEL_SEALED` |
| 연출·소리 ID | design-vision ID를 상수 이름으로 (screen-vision §9-6) | `JUICE.C_05`, `SFX_07`, `AUX_01`, `BGM_2` |
| DB 컬럼 ↔ JSON | 원장은 snake_case(DDL), API 응답 JSON은 camelCase(api-gate) — 변환은 storage 어댑터 경계에서만 | `rating_before` ↔ `ratingBefore` |
| 사용자 문구 | 한국어, api-gate·screen-vision·design-vision 문구 그대로 | "믿음이 부족합니다" |

### 3.2 REQ-ID 주석 (SKILL-04 "REQ-ID 주석 필수" — 양방향 추적)

1. **모든 소스 파일 첫 줄 블록 주석:** 파일 책임 한 줄(task-wall §3 문장 그대로) + TASK-ID + 연결 ID.
   ```
   // apply-spirit.js — 악한 영 14종 저주 상태 모델 적용·만료만
   // TASK-011 | REQ-007 FR-027~FR-031 | API-021 | TBL-013 | ARCH-003
   ```
2. **요구사항을 구현하는 함수·분기 바로 위 한 줄:** `// FR-031 동시 최대 2개` 형식. 수치 규칙을 구현하는 줄에는 rules.json 키를 함께 적는다: `// FR-031 rules.effects.maxConcurrent`.
3. CSS·JSON처럼 주석이 불편한 파일: CSS는 `/* TASK-060-1 | FR-048 */` 머리 주석, JSON은 주석 없이 task-wall·RTM으로 추적(JSON 주석 금지 — 파서 오류).
4. 설계에 없는 동작에는 붙일 REQ-ID가 없다 — **붙일 ID가 없는 코드는 만들지 않는다** (P4-002).

### 3.3 예외 처리 — 모든 라우트·모든 WS 핸들러 (P4-004, SKILL-04 🛡️)

> 전역 오류 처리기만으로는 불합격이다. 각 라우트·각 핸들러가 자기 예외를 잡고 api-gate §4의 코드로 응답한다.

| 위치 | 규칙 | 실패 시 응답 |
|:---|:---|:---|
| `routes/*.ts` (API-001~API-004) | 핸들러마다 `try { … } catch (err) { log(…); return respond.error(…) }`. 본문 파싱 실패 → `BAD_REQUEST`(400), 1,024B 초과 → `PAYLOAD_TOO_LARGE`(413), 토큰 없음/불일치 → `UNAUTHORIZED`(401), 저장소 실패 → `STORAGE_UNAVAILABLE`(503), 그 밖 → `INTERNAL_ERROR`(500) | REST 공통 봉투 `{success:false, error:{code, message}}` — 스택 트레이스·내부 메시지 노출 금지 |
| `index.ts` | 경로 분기 전체를 try/catch로 감싸 최후 방어(500 `INTERNAL_ERROR`) + 없는 경로 404 `NOT_FOUND` + Origin 불일치 403 `ORIGIN_FORBIDDEN`(Origin 없는 비브라우저 요청은 REST만 허용 — api-gate §5) + Upgrade 없는 `/ws/*` 426 `UPGRADE_REQUIRED` | 같은 봉투 |
| `matchmaker.ts` `webSocketMessage` / `room/handlers.ts` 메시지별 함수 | **메시지 종류마다** try/catch. 검증 실패 → `reject`(비치명, 소켓 유지 — API-025), 인증 실패·크기 초과·지속 속도 초과 → `error` 후 close(API-031, api-gate §4.3 Close 코드) | `{type:'reject', data:{action, code, message, retryInMs}}` / `{type:'error', error:{code, message}}` |
| DO RPC 메서드 (`createGuest`, `recordMatch` …) | 메서드마다 try/catch, 실패는 `{ok:false, code}` 값으로 반환 — 호출자(route·GameRoom)가 코드로 분기. 기록 실패는 `matchEnd.you.saved = false`(UC-015 E2) | 예외를 DO 경계 밖으로 던지지 않는다 |
| 타이머 콜백 (상승·퀴즈·90초·봇 틱·다음 라운드) | 콜백마다 try/catch → 로그 + 방 `error MATCH_ABORTED`(UC-005 E2) | 무효 경기는 기록하지 않는다(TBL-002 규칙) |
| 클라이언트 `net/*.js` | `fetch`·소켓 송신 try/catch, 응답 `success:false`는 예외가 아닌 값으로 화면에 전달 | 토스트·ErrorText (design-vision §4.5) |
| 클라이언트 `store/guest.js` | localStorage 접근은 항상 try/catch (사생활 모드에서 예외) — 실패 시 메모리만 사용 | 화면은 계속 동작 |
| 클라이언트 `audio/*` | Tone 시작·노드 생성 실패 시 소리 없이 계속(게임 진행 우선) | AudioUnlockToast 유지 |

```ts
// 형식 예시 (api-gate §4.1 코드 사용) — 실제 코드는 TASK-031에서 작성
export async function postGuests(request: Request, env: Env): Promise<Response> {
  try {
    const body = await respond.readJson(request, 1024);      // FR-012, api-gate §2 본문 상한
    const result = await matchmaker(env).createGuest(body.nickname);
    if (!result.ok) return respond.error(result.code);        // NICKNAME_INVALID 400 / NICKNAME_TAKEN 409
    return respond.ok(result.data, 201);
  } catch (err) {
    log.event("storage_fail", { code: "INTERNAL_ERROR" });  // 봉인 제1·8계명: 닉네임·토큰 미기록
    return respond.error("INTERNAL_ERROR");
  }
}
```

### 3.4 앱 인스턴스 export — 통합 테스트의 전제 (SKILL-04 🔌 "devguide에 기록하라")

| 결정 | 내용 |
|:---|:---|
| Worker 진입 | `worker/src/index.ts` 마지막에 `export default { fetch: handleFetch } satisfies ExportedHandler<Env>;` + 이름 있는 export `export async function handleFetch(request, env, ctx)` + `export { Matchmaker } from "./matchmaker"; export { GameRoom } from "./game-room";` |
| 통합 테스트 경로 (Phase 5) | DO 네임스페이스는 workerd 안에서만 존재하므로 HTTP·WS 통합 테스트는 **실제 workerd**에 붙는다: ① wrangler 4.147.0의 프로그래밍 API(`unstable_startWorker`)로 Worker를 띄워 `fetch` 호출, 또는 ② `npm run dev`(Playwright `webServer`)에 HTTP 요청. 어느 쪽이든 Phase 4는 위 export만 보장한다 |
| Node 단위 테스트 경로 | 순수 모듈(엔진·`attack.ts`·`room/*`(handlers·outbox 제외)·`services/*`·`protocol/*`·`storage/sqlite-adapter.ts`)은 `cloudflare:workers`를 import하지 않는다 → Vitest(Node)로 직접 import. DO 의존은 `RoomContext`·`StorageAdapter` 인터페이스로 주입 |
| 클라이언트 | 엔진(`client/js/engine/index.js`)과 순수 논리(`game/apply-*.js`, `game/board-codec.js`)는 DOM 없이 import 가능해야 한다 — `engine-purity.test.js`가 강제 |

### 3.5 계층 규칙 (의존 방향 — architecture §2.2·§2.3)

1. **클라이언트:** `main.js → screens/* → game/* → engine/*` 단방향. `screens/*`는 `fetch`·WebSocket을 직접 쓰지 않는다(`net/*` 경유). `render/*`·`fx/*`·`audio/*`는 게임 규칙을 계산하지 않는다. HUD 값은 `status`(API-024)만 — 클라이언트 계산 금지(D-07), 보드 파생 값(점수·줄·콤보·다음 블록)만 로컬 엔진.
2. **모든 글자는 DOM, Pixi는 그래픽만**(D3-04). 블록 텍스처는 시작 시 굽고 블록마다 실시간 필터 0개(design-vision §4.9).
3. **서버:** `index.ts → routes/* → (DO RPC) → services/* → storage/*`. `routes/*`에 SQL·Elo·검증 로직 금지, `services/*`에 `Response`·SQL 문자열 금지, SQL은 `storage/*`에만. GameRoom: `game-room.ts → room/handlers.ts → room/<판정>.ts → attack.ts / engine`. 판정 모듈끼리 순환 import 금지(위상 순서: player-state → effects → garbage → hero-skills·angels·armor·jesus·specials·quiz → match-flow → results).
4. **엔진 공유(D-12):** worker → `client/js/engine/` 단방향. 엔진은 DOM·Pixi·`window`·`document`·`localStorage`·`setTimeout`·`Date.now`·JSON import 금지 — 시간·rules·시드는 전부 인자로 받는다.
5. **콘텐츠(D-15):** JSON import는 `client/js/content.js`와 `worker/src/content.ts` 두 곳만. 수치는 rules.json에서만(화면·코드 하드코딩 금지 — 표시용 쿨다운 초·비용 포함).
6. **휘발 상태(data-ark §8):** 대기열·초대 코드는 소켓 첨부(`serializeAttachment`)에만, GameRoom config는 `ctx.storage.put("config")`, 진행 상태는 메모리. 클라이언트 localStorage에는 `swt.guest` 하나만, 옵션은 세션 메모리(N-04 미승격).
7. **공정성(D3-09):** 연출 세기 옵션은 흔들림·섬광·움직임만 줄인다. 방해 효과의 가림 정도(opacity·coverage·blur)는 spirits.json 수치 그대로.

### 3.6 로그 (봉인 제1·8계명 — api-gate §5 "보안 로그" 형식 그대로)

- 서버 로그는 `log.ts`만 사용: 구조화 JSON 1줄 `{"evt": "...", "gid": "앞 8자", "code": "..."}`. `gid`는 guestId **앞 8자**. 금지 필드: token, token_hash, ticket, 닉네임 원문, Supabase 키, 요청 본문 원문.
- `evt` 값은 api-gate §5의 5종만: `guest_created` · `auth_fail` · `reject` · `rate_limited` · `storage_fail` (architecture §10 제8계명 "게스트 생성, 토큰 검증 실패, 메시지 거부(코드), 속도 제한 초과, 저장 실패"와 1:1).
- 클라이언트는 `console.error`를 개발 중 오류에만 쓰고 토큰을 출력하지 않는다.

### 3.7 형식

- 들여쓰기 2칸, 세미콜론 사용, 문자열 큰따옴표, 줄 길이 120자 이하, 파일 끝 개행 1개, UTF-8.
- `verses.json`·`quiz.json`은 배열 원소 1개 = 1줄(A-07). 나머지 JSON은 2칸 들여쓰기.
- TypeScript `strict: true`. `any` 대신 api-gate 필드 표로 만든 타입. JS 파일은 JSDoc `@param`으로 메시지 타입 표기.
- 파일 300줄 접근 시 멈추고 task-wall을 먼저 고친다(500줄 초과 금지).

---

## 4. 모듈별 개발 현황

> 상태는 task-wall §2의 원본을 요약한 것이다(불일치 시 task-wall이 맞다). TASK-072가 Phase 4 마감 때 이 표와 RTM 코드 모듈 열을 갱신한다.

| 모듈 (`fruit-열매/`) | 관련 REQ | ARCH | TASK | 지역 | 상태 | 코드 리뷰 |
|:---|:---|:---|:---|:---|:---:|:---:|
| 루트 매니페스트·실행 보조 (`package.json`, `.gitignore`, `scripts/`) | REQ-016, REQ-017 | ARCH-017 | TASK-001-1 | 00 | ✅ | ✅ |
| `client/` 설정 (`package.json`, `vite.config.js`) | REQ-016 | ARCH-017 | TASK-001-2 | 00 | ✅ | ✅ |
| `worker/` 설정·공용 (`wrangler.toml`, `tsconfig.json`, `.dev.vars.example`, `env.ts`, `log.ts`) | REQ-016, NFR-004 | ARCH-017, ARCH-009 | TASK-001-3, TASK-001-4 | 00 | ✅ | ✅ |
| 테스트 하네스 (`vitest.config.js`, `playwright.config.js`) | REQ-017 | ARCH-018 | TASK-001-5 | 00 | ✅ | ✅ |
| 원장 `worker/src/storage/`, `supabase/migrations/` | REQ-014, REQ-015, REQ-016 | ARCH-014 | TASK-002~TASK-004 | 00 | ✅ | ✅ |
| 콘텐츠 `content/*.json` 8종 | REQ-003, REQ-007~REQ-012 | ARCH-016 | TASK-005~TASK-008 | 00 | ✅ | ✅ |
| 콘텐츠 색인·검사 (`check-content.mjs`, `content.js`, `content.ts`) | REQ-016, REQ-017 | ARCH-016 | TASK-009 | 00 | ✅ | ✅ |
| 엔진 `client/js/engine/` | REQ-001, REQ-009, REQ-012 | ARCH-002 | TASK-010-1~TASK-010-4 | 01 | ✅ | ✅ |
| 클라이언트 보드 효과 `client/js/game/apply-*.js`, `board-codec.js` | REQ-003, REQ-007~REQ-010 | ARCH-003 | TASK-011 | 01 | ✅ | ✅ |
| 공격 판정 `worker/src/attack.ts` | REQ-007 | ARCH-012 | TASK-012 | 01 | ✅ | ✅ |
| 방 판정 `worker/src/room/*` (handlers·outbox 제외) | REQ-001, REQ-003, REQ-006~REQ-012 | ARCH-011 | TASK-013~TASK-018 | 01 | ✅ | ✅ |
| AI 봇 `worker/src/bot/` + 착지 평가 `client/js/engine/placement.js` (DCL-004) | REQ-005, FR-015, FR-035 | ARCH-013, ARCH-002 | TASK-019 | 01 | ✅ | ✅ |
| 원장 서비스 `worker/src/services/` | REQ-002, REQ-013~REQ-015 | ARCH-014 | TASK-020-1~TASK-020-3 | 01 | ✅ | ✅ |
| 프로토콜 `worker/src/protocol/` | REQ-001, REQ-007, NFR-003 | ARCH-015 | TASK-030 | 02 | 🔄 | ⬜ |
| REST `worker/src/routes/` | REQ-002, REQ-014, REQ-015 | ARCH-009 | TASK-031 | 02 | 🔄 | ⬜ |
| Matchmaker `worker/src/matchmaker.ts`, `lobby/` | REQ-004~REQ-006 | ARCH-010 | TASK-032 | 02 | 🔄 | ⬜ |
| GameRoom `worker/src/game-room.ts`, `room/handlers.ts`, `room/outbox.ts` | REQ-001, REQ-005, REQ-007~REQ-011 | ARCH-011 | TASK-033 | 02 | 🔄 | ⬜ |
| Worker 진입 `worker/src/index.ts` | REQ-016 | ARCH-009 | TASK-034 | 02 | 🔄 | ⬜ |
| 렌더 `client/js/render/`, `client/js/art/` | REQ-013 | ARCH-004 | TASK-040~TASK-045 | 03-A | ⬜ | ⬜ |
| 오디오 `client/js/audio/` | REQ-013 | ARCH-006 | TASK-050-1, TASK-050-2 | 03-B | ⬜ | ⬜ |
| 연출 `client/js/fx/` | REQ-011, REQ-013 | ARCH-005 | TASK-051-1~TASK-053 | 03-B | ⬜ | ⬜ |
| 셸·스타일·라우터 (`index.html`, `style.css`, `styles/`, `main.js`, `screens/shell.js`, `store/session.js`) | REQ-013, FR-078 | ARCH-001 | TASK-060-1, TASK-060-2, TASK-061 | 03-C | ⬜ | ⬜ |
| 저장·네트워크 `client/js/store/guest·settings.js`, `client/js/net/` | REQ-002, REQ-004 | ARCH-008 | TASK-062-1, TASK-062-2 | 03-C | ⬜ | ⬜ |
| 입력 `client/js/input/` | REQ-001 | ARCH-007 | TASK-063 | 03-C | ⬜ | ⬜ |
| 화면 9개 `client/js/screens/` | REQ-001~REQ-006, REQ-013~REQ-015 | ARCH-001 | TASK-064-1, TASK-064-2, TASK-066, TASK-067-1, TASK-067-2 | 03-C | ⬜ | ⬜ |
| 컨트롤러 `client/js/game/local-player.js`, `server-events.js` | REQ-001, REQ-007~REQ-012 | ARCH-003 | TASK-065 | 03-C | ⬜ | ⬜ |
| 실행 안내 `README.md` | REQ-016, REQ-017 | ARCH-017 | TASK-070 | 03-D | ⬜ | ⬜ |
| 봉인 점검·마감 검증 (`bible-성경/04/security-seal-봉인.md`, `sync-fruit-열매검증.md`) | NFR-003, NFR-004, NFR-008, C-008 | — | TASK-071, TASK-072 | 03-D | ⬜ | ⬜ |

---

## 5. 코드 리뷰 체크리스트 (Witness가 태스크마다 판정 — 봉인의 율법 포함)

### 5.1 봉인의 율법 10계명 (template 필수 4항 = 제1·2·3·7계명 포함 전부)

- [ ] **제1계명 노출 금지:** 로그·응답에 토큰·토큰 해시·티켓·guestId 전체 없음(로그는 앞 8자). 랭킹·전적 응답에 guestId 없음(닉네임만)
- [ ] **제2계명 하드코딩 금지:** 소스·`wrangler.toml [vars]`·클라이언트 번들에 Supabase URL/키 문자열 0. 저장소에는 값 없는 `.dev.vars.example`만, `.dev.vars`는 `.gitignore`
- [ ] **제3계명 암호화:** 게스트 토큰 32바이트 `crypto.getRandomValues` → base64url 43자, 원장에는 SHA-256 소문자 hex 64자만(D-06)
- [ ] **제4계명 최소 수집:** 닉네임·게스트 ID·토큰 해시·경기 기록·진행 기록 외 컬럼·필드 0 (이메일·실명·IP 저장 0)
- [ ] **제5계명 동의:** 닉네임 입장 화면에 "닉네임은 랭킹에 공개됩니다" 안내(SCR-001)
- [ ] **제6계명 외부 전달 금지:** 분석·광고·추적 SDK 0, 외부 네트워크 요청 0(Supabase는 운영자 키가 있을 때만)
- [ ] **제7계명 접근 통제:** REST 조회 3종 Bearer 필수, WS `join`·`ready` 토큰 + 1회용 티켓, 경기 기록 쓰기는 GameRoom → Matchmaker RPC뿐, Origin 허용 목록, Supabase RLS 전면 거부(service role만), 모든 수신 메시지 스키마 검증·4KB 상한·속도 제한
- [ ] **제8계명 기록:** `log.ts` 보안 로그 5종(`guest_created`·`auth_fail`·`reject`·`rate_limited`·`storage_fail`) 기록(§3.6)
- [ ] **제9계명 유출 대비:** 원장 유출 시 토큰 복원 불가(해시만), README에 키 재발급 절차 안내
- [ ] **제10계명 탐욕 금지:** 수집 데이터는 매칭·전적·랭킹·진행 보정에만 사용

### 5.2 Spec 충실성 (P4-001·P4-002·P4-004)

- [ ] 파일 머리 주석에 TASK-ID·REQ-ID(§3.2), 구현 분기에 FR-ID 주석
- [ ] task-wall §3에 없는 파일 0 / 설계에 없는 기능·메시지·필드·수치 0 (붙일 REQ-ID가 없는 코드 0)
- [ ] 모든 REST 라우트·WS 핸들러·RPC·타이머 콜백에 개별 예외 처리(§3.3)
- [ ] 수치 하드코딩 0 — rules.json 키 사용, 표시 문구는 정경 문구 그대로
- [ ] 엔진 순수성(§3.5-4), 계층 방향(§3.5-1·3) 위반 0
- [ ] 파일 300줄 이하(초과 시 task-wall 갱신이 먼저), 500줄 초과 0

### 5.3 이 프로젝트 고유 금지 사항

- [ ] **C-002 예수님 표현:** 얼굴 없음, 빛·실루엣만, 실루엣에 닿는 그래픽 0, 버튼·아이콘·선택 캐릭터 0, `effect.by = null`, 경기당 1회
- [ ] **C-003 KJV:** verses.json `kjv`는 KJV 1769 원문 그대로, `ko`는 직접 번역(개역개정·개역한글 문장 0), 출처 표기
- [ ] **C-001 결제·가챠 0**, **C-009 채팅 0**(리액션 3종만), **C-010 근거 없는 존재 0**, **C-011 고어·선정 0**
- [ ] **C-007 음원·이미지 파일 0** (`.mp3`·`.wav`·`.ogg`·`.png`·`.jpg`·`.webp` 자산 0 — 코드 합성·코드 그래픽만. 말씀 카드 PNG는 사용자가 저장하는 **출력물**이지 자산이 아님)
- [ ] **C-006 Socket.IO·Express 0**, **C-008 제외 범위(스토리·위인 11명·열두 제자·로그인·배포) 0**
- [ ] **D3-09 공정성:** 연출 세기 옵션이 방해 가림 수치를 바꾸지 않음
- [ ] 클라이언트 URL은 상대 경로(`/api`, `/ws`)만 — 절대 URL·포트 하드코딩 0 (D-03)

---

## 6. Git 커밋 컨벤션 (AIDD 커밋 타입)

| 타입 | 의미 | 매핑 | 이 프로젝트 예 |
|:---|:---|:---|:---|
| `Genesis` | 새 기능·파일 생성 | create/feat | `Genesis(engine): TASK-010-2 REQ-001 FR-004 보드·T-Spin·점수 판정` |
| `Refine` | 코드 개선 (동작 불변) | refactor | `Refine(room): TASK-013 FR-031 상한 판정 함수 분리` |
| `Repent` | 버그 수정 (회개) | fix | `Repent(garbage): TASK-014 FR-025 상쇄 후 음수 대기 공격 방지` |
| `Scroll` | 문서 수정 | docs | `Scroll(bible): Phase 4 task-wall 짝 검증 결과 갱신` |
| `Test` | 테스트 추가·수정 | test | `Test(protocol): TASK-030 NFR-003 토큰 없는 join 거부` |
| `Deploy` | 배포·실행 설정 | deploy/ci | `Deploy(dev): TASK-001-1 FR-073 npm run dev 동시 기동` |

- 형식: `<타입>(<범위>): <TASK-ID> <REQ/FR-ID> <한국어 요약>` — 한 커밋 = 한 태스크(또는 한 서브 태스크).
- `backup/`·`.dev.vars`·`.wrangler/` 커밋 금지(C-013, NFR-004). 커밋·푸시는 사용자 요청이 있을 때만 한다.
- 커밋 메시지 끝에는 세션이 지정한 attribution 줄을 붙인다(사용자 지시 우선).
