# 📜 요구사항 추적 매트릭스 (RTM — Covenant Trace) — 영적 전쟁 테트리스

> *"And the Lord said unto Moses, Write this for a memorial in a book."* — Exodus 17:14 (KJV)
>
> **규격:** `statute-율법/01.requirement-hearing-들음/rtm-covenant-언약추적-template.md`
> **참조 예시:** `parable-비유/01.requirement-hearing-들음/rtm-covenant-언약추적-example.md`
> **근거 산출물:** [`spec-tablet-명세서.md`](./spec-tablet-명세서.md) (REQ 17 · FR 78 · NFR 8 · C 13), [`usecase-path-사용사례.md`](./usecase-path-사용사례.md) (UC-001~UC-022)
> **갱신 시점:** Phase 1 완료 — REQ 열 전체 등재 + UC-ID 연결. **Phase 2 완료(2026-10-19)** — 언약추적 갱신 규칙 "Phase 2 완료 시 ARCH-ID, API-ID, TBL-ID 열 채움"에 따라 116행 전부 연결, 상태 ⬜ → 🔄(설계 산출물에만 연결). **Phase 3 완료(2026-10-19)** — "화면 관련 항목 연결 확인"을 §7에 기록(매트릭스 열·상태 변경 없음). 코드 모듈·테스트 ID 열은 Phase 4·5에서 채운다. **Phase 4 계획(2026-10-19)** — task-wall 태스크 ↔ REQ 연결을 §8에 기록(§1 매트릭스 열·상태 변경 없음). **Phase 4 구현 마감(2026-10-19, TASK-072 D-03D)** — 언약추적 갱신 규칙 "Phase 4 완료 시 코드 모듈 열 채움"에 따라 §1 `코드 모듈` 열 116행을 task-wall §2 생성 파일(§8 태스크 연결 경유, 실제 존재 확인)로 채움. 상태 열은 🔄 유지(✅는 테스트 ID가 붙는 Phase 5 이후). C-008은 구현 금지 제약이라 `N/A`(제외 범위 코드 0 대조 근거 링크). 이 RTM은 프로젝트 전체에서 단 1개이며 Phase 3~7에서 계속 갱신된다.
> **Phase 3 근거 산출물:** [`design-vision-디자인명세.md`](../03.design-order-질서/design-vision-디자인명세.md) · [`screen-vision-화면설계.md`](../03.design-order-질서/screen-vision-화면설계.md) (SCR-001~SCR-009)
> **Phase 2 근거 산출물:** [`architecture-temple-성전설계.md`](../02.architecture-foundation-기초/architecture-temple-성전설계.md) (ARCH-001~ARCH-018), [`api-gate-성문.md`](../02.architecture-foundation-기초/api-gate-성문.md) (API-001~API-031), [`data-ark-법궤.md`](../02.architecture-foundation-기초/data-ark-법궤.md) (TBL-001~TBL-006 원장, TBL-011~TBL-018 콘텐츠 JSON)

---

## 1. 추적 매트릭스

| REQ-ID | 요구사항 요약 | UC-ID | ARCH-ID | API-ID | TBL-ID | 코드 모듈 | 테스트 ID | 상태 |
|:---|:---|:---|:---|:---|:---|:---|:---|:---:|
| REQ-001 | 사용자가 브라우저에서 KJV 성경 기반 실시간 2인 대전 테트리스를 플레이한다 | UC-003, UC-004, UC-007, UC-015, UC-016 | ARCH-001, ARCH-002, ARCH-003, ARCH-008, ARCH-011 | API-006, API-011, API-012, API-013, API-018, API-019, API-020, API-029, API-030 | TBL-002, TBL-003 | `client/js/engine/{bag.js, board.js, gravity.js, index.js, piece.js, rng.js, scoring.js, specials.js, srs.js}` · `client/js/game/{local-player.js, server-events.js}` · `client/js/input/{keyboard.js, touch.js}` · `client/js/net/{lobby-socket.js, room-socket.js}` · `client/js/render/{block-textures.js, board-view.js, piece-preview.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js, result.js}` · `client/test/engine-purity.test.js` · `content/rules.json` · `worker/src/game-room.ts` · `worker/src/protocol/{messages.ts, rate-limit.ts, validate.ts}` · `worker/src/room/{bot-driver.ts, handlers.ts, match-flow.ts, outbox.ts, results.ts}` · `worker/test/validate.test.ts` | ⬜ | 🔄 |
| REQ-002 | 사용자는 게스트 닉네임으로 입장한다 | UC-001 | ARCH-001, ARCH-008, ARCH-009, ARCH-014 | API-001, API-002 | TBL-001, TBL-004 | `client/js/main.js` · `client/js/net/{api.js, lobby-socket.js, room-socket.js}` · `client/js/screens/{entry.js, hero-select.js, lobby.js, shell.js, waiting.js}` · `client/js/store/{guest.js, session.js, settings.js}` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` · `worker/src/routes/{guests.ts, leaderboard.ts, matches.ts, respond.ts}` · `worker/src/services/{elo.ts, guest-service.ts, history-service.ts, progress-service.ts, ranking-service.ts}` | ⬜ | 🔄 |
| REQ-003 | 사용자는 위인 4명(다윗·솔로몬·베드로·바울) 중 한 명을 고른다 | UC-002, UC-009 | ARCH-001, ARCH-003, ARCH-011, ARCH-016 | API-007, API-014, API-023 | TBL-011, TBL-016, TBL-018 | `client/js/art/{shapes-angels.js, shapes-heroes-armor.js, shapes-spirits.js, shapes-ui.js, to-pixi.js, to-svg.js}` · `client/js/engine/placement.js` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `client/js/screens/{entry.js, hero-select.js, lobby.js, waiting.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` · `worker/src/bot/{bot-player.ts, placement.ts}` · `worker/src/room/{angels.ts, armor.ts, hero-skills.ts, jesus.ts}` | ⬜ | 🔄 |
| REQ-004 | 사용자는 대전 모드(사람 대 사람, 랜덤 매칭 + 친구 초대 코드)를 고를 수 있다 | UC-002, UC-003, UC-004 | ARCH-001, ARCH-010 | API-005, API-007, API-008, API-009, API-010 | TBL-001 | `client/js/net/{api.js, lobby-socket.js, room-socket.js}` · `client/js/screens/{entry.js, hero-select.js, lobby.js, waiting.js}` · `client/js/store/{guest.js, settings.js}` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` | ⬜ | 🔄 |
| REQ-005 | 사용자는 AI 봇 대전(쉬움·보통·어려움)을 고를 수 있다 | UC-002, UC-005 | ARCH-010, ARCH-011, ARCH-013 | API-007, API-010, API-020 | TBL-002, TBL-003, TBL-018 | `client/js/engine/placement.js` · `client/js/net/{lobby-socket.js, room-socket.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js, entry.js, hero-select.js, lobby.js, waiting.js}` · `content/rules.json` · `worker/src/bot/{bot-player.ts, placement.ts}` · `worker/src/{game-room.ts, matchmaker.ts}` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/room/{bot-driver.ts, handlers.ts, outbox.ts}` | ⬜ | 🔄 |
| REQ-006 | 사용자는 연습 모드를 고를 수 있다 | UC-002, UC-006 | ARCH-003, ARCH-011 | API-007, API-019, API-030 | TBL-004, TBL-018 | `client/js/net/{lobby-socket.js, room-socket.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js, entry.js, hero-select.js, lobby.js, waiting.js}` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` · `worker/src/room/{match-flow.ts, results.ts}` | ⬜ | 🔄 |
| REQ-007 | 줄을 지우면 상대에게 쓰레기 줄과 악한 영(14종)이 공격으로 간다. 서버가 공격을 판정한다 | UC-008 | ARCH-011, ARCH-012, ARCH-015 | API-013, API-021, API-022 | TBL-013, TBL-018 | `client/js/art/{shapes-angels.js, shapes-spirits.js}` · `client/js/fx/{arrows.js, confetti.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js, local-player.js, server-events.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, rules.json, spirits.json}` · `worker/src/{attack.ts, game-room.ts}` · `worker/src/protocol/{messages.ts, rate-limit.ts, validate.ts}` · `worker/src/room/{bot-driver.ts, effects.ts, garbage.ts, handlers.ts, outbox.ts, player-state.ts}` · `worker/test/validate.test.ts` | ⬜ | 🔄 |
| REQ-008 | 사용자는 믿음 게이지로 위인 스킬과 천사 5종을 쓴다 | UC-009, UC-010 | ARCH-003, ARCH-011 | API-014, API-023, API-024, API-025 | TBL-011, TBL-012, TBL-018 | `client/js/art/{shapes-angels.js, shapes-spirits.js}` · `client/js/engine/placement.js` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js, local-player.js, server-events.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, rules.json, spirits.json}` · `worker/src/bot/{bot-player.ts, placement.ts}` · `worker/src/game-room.ts` · `worker/src/room/{angels.ts, armor.ts, bot-driver.ts, effects.ts, handlers.ts, hero-skills.ts, jesus.ts, outbox.ts, player-state.ts}` | ⬜ | 🔄 |
| REQ-009 | 사용자는 전신갑주 6종을 얻어 쓴다 | UC-011 | ARCH-002, ARCH-003, ARCH-011 | API-013, API-015, API-023, API-024 | TBL-014, TBL-015, TBL-018 | `client/js/art/shapes-heroes-armor.js` · `client/js/engine/{bag.js, board.js, gravity.js, index.js, piece.js, rng.js, scoring.js, specials.js, srs.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js, local-player.js, server-events.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `client/test/engine-purity.test.js` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` · `worker/src/game-room.ts` · `worker/src/room/{angels.ts, armor.ts, bot-driver.ts, handlers.ts, hero-skills.ts, jesus.ts, outbox.ts, specials.ts}` · `worker/test/specials.test.ts` | ⬜ | 🔄 |
| REQ-010 | 예수님 "세상을 이기었노라" 이벤트(첨부 A §3.2 원칙 그대로)가 경기당 1회 일어날 수 있다 | UC-012 | ARCH-003, ARCH-005, ARCH-011 | API-012, API-023 | TBL-016, TBL-018 | `client/js/art/{shapes-angels.js, shapes-spirits.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js, local-player.js, server-events.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `content/rules.json` · `worker/src/room/{angels.ts, armor.ts, hero-skills.ts, jesus.ts}` | ⬜ | 🔄 |
| REQ-011 | 말씀 대결(성경 퀴즈, 60문항 이상)이 있다 | UC-013 | ARCH-005, ARCH-011, ARCH-013 | API-016, API-026, API-027 | TBL-003, TBL-016, TBL-017 | `client/js/fx/{overlay.js, reactions.js, subtitle.js, verse-card.js}` · `client/js/game/{local-player.js, server-events.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `content/{quiz.json, verses.json}` · `worker/src/game-room.ts` · `worker/src/room/{bot-driver.ts, handlers.ts, outbox.ts, quiz.ts}` | ⬜ | 🔄 |
| REQ-012 | 특수 블록 3종(말씀·여리고 나팔·만나)이 있다 | UC-014 | ARCH-002, ARCH-011 | API-013, API-019, API-023 | TBL-004, TBL-018 | `client/js/engine/{bag.js, board.js, gravity.js, index.js, piece.js, rng.js, scoring.js, specials.js, srs.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js, local-player.js, server-events.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `client/test/engine-purity.test.js` · `content/rules.json` · `worker/src/room/specials.ts` · `worker/src/services/progress-service.ts` · `worker/test/specials.test.ts` | ⬜ | 🔄 |
| REQ-013 | 디자인·액션·사운드·재미 요구사항(첨부 A §5 전체)은 필수다. 첨부 B의 체크리스트를 충족해야 한다 | UC-007, UC-008, UC-015, UC-017, UC-020 | ARCH-004, ARCH-005, ARCH-006, ARCH-007 | API-017, API-021, API-023, API-028, API-030 | TBL-003, TBL-004, TBL-005, TBL-016, TBL-018 | `client/{index.html, style.css}` · `client/js/art/{shapes-angels.js, shapes-heroes-armor.js, shapes-spirits.js, shapes-ui.js, to-pixi.js, to-svg.js}` · `client/js/audio/{aux-sfx.js, bgm.js, mixer.js, sfx-voices.js, sfx.js}` · `client/js/fx/{arrows.js, board-motion.js, confetti.js, flash.js, hitstop.js, juice-table-core.js, juice-table-flow.js, juice-table-powers.js, juice-table-quiz.js, juice.js, overlay.js, reactions.js, shake.js, subtitle.js, verse-card.js}` · `client/js/main.js` · `client/js/render/{background.js, block-textures.js, board-view.js, filters.js, holy-fx.js, layout.js, particles.js, piece-preview.js, pixi-app.js, quality.js, spirit-appear.js, spirit-fx.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js, history.js, options.js, ranking.js, result.js, shell.js}` · `client/js/store/session.js` · `client/styles/{battle.css, components.css, screens.css, tokens.css}` · `content/rules.json` · `worker/src/game-room.ts` · `worker/src/room/{bot-driver.ts, effects.ts, handlers.ts, match-flow.ts, outbox.ts, player-state.ts, results.ts}` · `worker/src/services/{elo.ts, guest-service.ts, history-service.ts, progress-service.ts, ranking-service.ts}` | ⬜ | 🔄 |
| REQ-014 | 경기 결과(전적)가 저장되고 조회된다 | UC-015, UC-016, UC-018 | ARCH-001, ARCH-011, ARCH-014 | API-003, API-030 | TBL-002, TBL-003 | `client/js/net/api.js` · `client/js/screens/{history.js, options.js, ranking.js, result.js}` · `client/js/store/{guest.js, settings.js}` · `supabase/migrations/0001_init.sql` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` · `worker/src/room/{match-flow.ts, results.ts}` · `worker/src/routes/{guests.ts, leaderboard.ts, matches.ts, respond.ts}` · `worker/src/services/{elo.ts, guest-service.ts, history-service.ts, progress-service.ts, ranking-service.ts}` · `worker/src/storage/{adapter.ts, migrations.ts, sqlite-adapter.ts}` · `worker/test/helpers/sql-storage-fake.ts` · `worker/test/ledger-fk.test.ts` | ⬜ | 🔄 |
| REQ-015 | 랭킹(Elo)이 저장되고 조회된다 | UC-015, UC-019 | ARCH-001, ARCH-010, ARCH-014 | API-004, API-030 | TBL-001, TBL-003, TBL-006 | `client/js/net/api.js` · `client/js/screens/{history.js, options.js, ranking.js, result.js}` · `client/js/store/{guest.js, settings.js}` · `content/rules.json` · `supabase/migrations/0001_init.sql` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` · `worker/src/routes/{guests.ts, leaderboard.ts, matches.ts, respond.ts}` · `worker/src/services/{elo.ts, guest-service.ts, history-service.ts, progress-service.ts, ranking-service.ts}` · `worker/src/storage/{adapter.ts, migrations.ts, sqlite-adapter.ts}` · `worker/test/helpers/sql-storage-fake.ts` · `worker/test/ledger-fk.test.ts` | ⬜ | 🔄 |
| REQ-016 | 외부 서비스 키 없이 `npm install && npm run dev` 한 번으로 전부 동작해야 한다. Supabase는 환경변수가 있을 때만 쓰는 어댑터로 둔다 | UC-021 | ARCH-014, ARCH-016, ARCH-017 | API-001~API-006 (Vite 프록시 경유) | TBL-001~TBL-006 (SQLite 기본 / Supabase 선택) | `.gitignore` · `README.md` · `package.json` · `playwright.config.js` · `vitest.config.js` · `client/js/content.js` · `client/{package.json, vite.config.js}` · `content/check-content.mjs` · `scripts/check-ports.mjs` · `supabase/migrations/0001_init.sql` · `worker/{.dev.vars.example, package.json, tsconfig.json, wrangler.toml}` · `worker/src/{content.ts, env.ts, index.ts, log.ts}` · `worker/src/storage/{adapter.ts, migrations.ts, select-storage.ts, sqlite-adapter.ts, supabase-adapter.ts}` · `worker/test/helpers/sql-storage-fake.ts` · `worker/test/ledger-fk.test.ts` | ⬜ | 🔄 |
| REQ-017 | 테스트: Vitest(단위) + Playwright(브라우저 2개 E2E) | UC-022 | ARCH-018 | API-005, API-006, API-013, API-021 (E2E 경로) | TBL-011~TBL-018 (콘텐츠 검사) | `.gitignore` · `README.md` · `package.json` · `playwright.config.js` · `vitest.config.js` · `client/js/content.js` · `client/{package.json, vite.config.js}` · `content/check-content.mjs` · `scripts/check-ports.mjs` · `worker/{.dev.vars.example, package.json, tsconfig.json, wrangler.toml}` · `worker/src/{content.ts, env.ts, log.ts}` | ⬜ | 🔄 |
| FR-001 | 보드·테트로미노·7-bag | UC-007 | ARCH-002 | API-019 | TBL-018 | `client/js/engine/{bag.js, index.js, piece.js, rng.js, srs.js}` · `client/js/render/{block-textures.js, board-view.js, piece-preview.js}` · `client/test/engine-purity.test.js` | ⬜ | 🔄 |
| FR-002 | SRS 회전 | UC-007 | ARCH-002 | N/A (클라이언트 전용) — 엔진 SRS 상수 | N/A (영속 데이터 없음) | `client/js/engine/{bag.js, piece.js, rng.js, srs.js}` | ⬜ | 🔄 |
| FR-003 | 이동·드롭·홀드·고스트 | UC-007 | ARCH-002, ARCH-007 | N/A (클라이언트 전용) | TBL-018 | `client/js/engine/{board.js, index.js, scoring.js}` · `client/js/input/{keyboard.js, touch.js}` · `client/js/render/{block-textures.js, board-view.js, piece-preview.js}` · `client/test/engine-purity.test.js` | ⬜ | 🔄 |
| FR-004 | 줄 삭제·판정·점수 | UC-007 | ARCH-002 | API-013 | TBL-018 | `client/js/engine/{board.js, index.js, scoring.js}` · `client/test/engine-purity.test.js` · `content/rules.json` | ⬜ | 🔄 |
| FR-005 | 같은 시드 시작 | UC-003, UC-004 | ARCH-002, ARCH-011 | API-011, API-019 | N/A (GameRoom 휘발 상태) | `client/js/engine/{bag.js, piece.js, rng.js, srs.js}` · `client/js/game/{local-player.js, server-events.js}` · `worker/src/game-room.ts` · `worker/src/room/{bot-driver.ts, handlers.ts, match-flow.ts, outbox.ts, results.ts}` | ⬜ | 🔄 |
| FR-006 | 상대 보드 실시간 표시 | UC-007 | ARCH-003, ARCH-004, ARCH-011 | API-012, API-020 | N/A (GameRoom 휘발 상태) | `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js, local-player.js, server-events.js}` · `client/js/render/{block-textures.js, board-view.js, piece-preview.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `worker/src/game-room.ts` · `worker/src/room/{bot-driver.ts, handlers.ts, outbox.ts}` | ⬜ | 🔄 |
| FR-007 | 승리 조건 | UC-015 | ARCH-005, ARCH-011 | API-018, API-029, API-030 | TBL-002, TBL-003, TBL-016 | `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js, result.js}` · `worker/src/room/{match-flow.ts, results.ts}` | ⬜ | 🔄 |
| FR-008 | 실시간 통신 프로토콜 | UC-003, UC-004 | ARCH-008, ARCH-009, ARCH-010, ARCH-011 | API-005~API-031 | N/A (전송 계층) | `client/js/game/{local-player.js, server-events.js}` · `client/js/net/{api.js, lobby-socket.js, room-socket.js}` · `client/js/store/{guest.js, settings.js}` · `worker/src/{game-room.ts, index.ts, matchmaker.ts}` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/protocol/{messages.ts, rate-limit.ts, validate.ts}` · `worker/src/room/{bot-driver.ts, handlers.ts, outbox.ts}` · `worker/test/validate.test.ts` | ⬜ | 🔄 |
| FR-009 | 상대 이탈 처리 | UC-016 | ARCH-011, ARCH-014 | API-030 | TBL-002, TBL-003 | `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `worker/src/game-room.ts` · `worker/src/room/{bot-driver.ts, handlers.ts, match-flow.ts, outbox.ts, results.ts}` | ⬜ | 🔄 |
| FR-010 | 난이도 곡선 | UC-007 | ARCH-002 | API-019 | TBL-018 | `client/js/engine/{gravity.js, index.js, specials.js}` · `client/test/engine-purity.test.js` · `content/rules.json` | ⬜ | 🔄 |
| FR-011 | 조작 입력 | UC-007 | ARCH-007 | N/A (클라이언트 전용) | TBL-018 | `client/js/input/{keyboard.js, touch.js}` · `client/js/render/{layout.js, pixi-app.js}` · `client/styles/{battle.css, screens.css}` | ⬜ | 🔄 |
| FR-012 | 게스트 닉네임 입장 | UC-001 | ARCH-001, ARCH-008, ARCH-009, ARCH-014 | API-001, API-002 | TBL-001, TBL-004 | `client/js/net/{api.js, lobby-socket.js, room-socket.js}` · `client/js/screens/{entry.js, lobby.js}` · `client/js/store/{guest.js, settings.js}` · `worker/src/routes/{guests.ts, leaderboard.ts, matches.ts, respond.ts}` · `worker/src/services/{elo.ts, guest-service.ts}` · `worker/src/storage/{adapter.ts, sqlite-adapter.ts}` · `worker/test/helpers/sql-storage-fake.ts` · `worker/test/ledger-fk.test.ts` | ⬜ | 🔄 |
| FR-013 | 캐릭터 선택 화면 | UC-002 | ARCH-001, ARCH-016 | API-007 | TBL-011, TBL-016 | `client/js/art/{shapes-angels.js, shapes-heroes-armor.js, shapes-spirits.js, shapes-ui.js, to-pixi.js, to-svg.js}` · `client/js/screens/{hero-select.js, waiting.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` | ⬜ | 🔄 |
| FR-014 | 다윗 — 물맷돌 | UC-009 | ARCH-003, ARCH-011 | API-014, API-023 | TBL-011, TBL-018 | `client/js/fx/{arrows.js, confetti.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` · `worker/src/room/{hero-skills.ts, jesus.ts}` | ⬜ | 🔄 |
| FR-015 | 솔로몬 — 지혜로운 마음 | UC-009 | ARCH-002, ARCH-003, ARCH-011 | API-014, API-019, API-023 | TBL-011, TBL-018 | `client/js/engine/placement.js` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` · `worker/src/bot/{bot-player.ts, placement.ts}` · `worker/src/room/{hero-skills.ts, jesus.ts}` | ⬜ | 🔄 |
| FR-016 | 베드로 — 이 반석 위에 | UC-009 | ARCH-003, ARCH-011 | API-014, API-022, API-023 | TBL-011, TBL-018 | `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` · `worker/src/room/{garbage.ts, hero-skills.ts, jesus.ts}` | ⬜ | 🔄 |
| FR-017 | 바울 — 옥문이 열리다 | UC-009 | ARCH-003, ARCH-011 | API-014, API-023 | TBL-011, TBL-018 | `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` · `worker/src/room/{hero-skills.ts, jesus.ts}` | ⬜ | 🔄 |
| FR-018 | 랜덤 매칭 | UC-003 | ARCH-010 | API-007, API-009, API-010 | TBL-001 | `client/js/screens/{hero-select.js, waiting.js}` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` · `worker/src/services/{elo.ts, guest-service.ts}` | ⬜ | 🔄 |
| FR-019 | 친구 초대 코드 | UC-004 | ARCH-010 | API-007, API-009, API-010, API-031 | N/A (소켓 첨부 휘발 상태) | `client/js/screens/{entry.js, hero-select.js, lobby.js, waiting.js}` · `content/rules.json` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` | ⬜ | 🔄 |
| FR-020 | 대기 취소·대기열 정리 | UC-003 | ARCH-010 | API-008 | N/A (소켓 첨부 휘발 상태) | `client/js/net/{lobby-socket.js, room-socket.js}` · `client/js/screens/{hero-select.js, waiting.js}` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` | ⬜ | 🔄 |
| FR-021 | AI 봇 대전 | UC-005 | ARCH-010, ARCH-011, ARCH-013 | API-007, API-010, API-020 | TBL-002, TBL-018 | `client/js/engine/placement.js` · `client/js/screens/{hero-select.js, waiting.js}` · `worker/src/bot/{bot-player.ts, placement.ts}` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` | ⬜ | 🔄 |
| FR-022 | 봇의 말씀 대결 응답 | UC-005, UC-013 | ARCH-011, ARCH-013 | API-026, API-027 | TBL-017, TBL-018 | `client/js/engine/placement.js` · `worker/src/bot/{bot-player.ts, placement.ts}` · `worker/src/room/quiz.ts` | ⬜ | 🔄 |
| FR-023 | 연습 모드 | UC-006 | ARCH-003, ARCH-011 | API-007, API-018, API-019, API-030 | TBL-004, TBL-018 | `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js, hero-select.js, waiting.js}` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` · `worker/src/room/{match-flow.ts, results.ts}` | ⬜ | 🔄 |
| FR-024 | 공격력 계산 | UC-008 | ARCH-012 | API-013, API-021 | TBL-018 | `worker/src/attack.ts` | ⬜ | 🔄 |
| FR-025 | 쓰레기 줄 삽입·상쇄 | UC-008 | ARCH-003, ARCH-011 | API-021, API-022, API-024 | TBL-018 | `client/js/engine/{board.js, scoring.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `worker/src/room/garbage.ts` | ⬜ | 🔄 |
| FR-026 | 악한 영 소환 결정 | UC-008 | ARCH-012 | API-021 | TBL-013, TBL-018 | `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` · `worker/src/attack.ts` | ⬜ | 🔄 |
| FR-027 | 악한 영 1~2등급 효과 | UC-008 | ARCH-003, ARCH-005, ARCH-011 | API-021 | TBL-013 | `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` | ⬜ | 🔄 |
| FR-028 | 악한 영 3등급 효과 | UC-008 | ARCH-003, ARCH-005, ARCH-011 | API-021 | TBL-013 | `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` · `worker/src/room/{effects.ts, player-state.ts}` | ⬜ | 🔄 |
| FR-029 | 악한 영 4등급 효과 | UC-008 | ARCH-003, ARCH-005, ARCH-011 | API-021, API-022 | TBL-013 | `client/js/engine/{board.js, scoring.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` | ⬜ | 🔄 |
| FR-030 | 악한 영 5등급·보스 효과 | UC-008 | ARCH-003, ARCH-005, ARCH-011 | API-021 | TBL-013 | `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` | ⬜ | 🔄 |
| FR-031 | 방해 상한 규칙 | UC-008 | ARCH-011 | API-021, API-024 | TBL-018 | `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `content/rules.json` · `worker/src/room/{effects.ts, player-state.ts}` | ⬜ | 🔄 |
| FR-032 | 서버 진행 검증 | UC-007, UC-008 | ARCH-011, ARCH-015 | API-013, API-025 | TBL-018 | `worker/src/game-room.ts` · `worker/src/protocol/{messages.ts, rate-limit.ts, validate.ts}` · `worker/src/room/{bot-driver.ts, handlers.ts, outbox.ts, specials.ts}` · `worker/test/{specials.test.ts, validate.test.ts}` | ⬜ | 🔄 |
| FR-033 | 믿음 게이지 | UC-009 | ARCH-011 | API-024 | TBL-018 | `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `worker/src/room/{effects.ts, player-state.ts}` | ⬜ | 🔄 |
| FR-034 | 위인 스킬 발동 | UC-009 | ARCH-011 | API-014, API-023, API-025 | TBL-011, TBL-018 | `client/js/game/{local-player.js, server-events.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `worker/src/room/{hero-skills.ts, jesus.ts}` | ⬜ | 🔄 |
| FR-035 | 천사 5종 소환 | UC-010 | ARCH-002, ARCH-003, ARCH-011 | API-014, API-023, API-025 | TBL-012, TBL-018 | `client/js/art/{shapes-angels.js, shapes-spirits.js}` · `client/js/engine/placement.js` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` · `worker/src/bot/{bot-player.ts, placement.ts}` · `worker/src/room/{angels.ts, armor.ts}` | ⬜ | 🔄 |
| FR-036 | 갑주 출현·획득 | UC-011 | ARCH-002, ARCH-011 | API-013, API-023, API-024 | TBL-014, TBL-018 | `client/js/engine/{gravity.js, specials.js}` · `worker/src/room/{angels.ts, armor.ts, specials.ts}` · `worker/test/specials.test.ts` | ⬜ | 🔄 |
| FR-037 | 갑주 6종 사용 | UC-011 | ARCH-003, ARCH-011 | API-015, API-023 | TBL-014, TBL-018 | `client/js/art/shapes-heroes-armor.js` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` · `worker/src/room/{angels.ts, armor.ts}` | ⬜ | 🔄 |
| FR-038 | 상성표 | UC-011 | ARCH-016 | N/A (콘텐츠 정적 데이터) | TBL-015 | `client/js/content.js` · `content/{angels.json, armor.json, check-content.mjs, counters.json, heroes.json, spirits.json}` · `worker/src/content.ts` · `worker/src/room/{angels.ts, armor.ts}` | ⬜ | 🔄 |
| FR-039 | "세상을 이기었노라" 이벤트 | UC-012 | ARCH-003, ARCH-005, ARCH-011 | API-012, API-023 | TBL-016, TBL-018 | `client/js/art/{shapes-angels.js, shapes-spirits.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` · `worker/src/room/{hero-skills.ts, jesus.ts}` | ⬜ | 🔄 |
| FR-040 | 말씀 대결 발생 | UC-013 | ARCH-011 | API-013, API-026 | TBL-018 | `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `worker/src/room/quiz.ts` | ⬜ | 🔄 |
| FR-041 | 진행·판정·보상 | UC-013 | ARCH-005, ARCH-011 | API-016, API-024, API-026, API-027 | TBL-003, TBL-016, TBL-017 | `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `content/quiz.json` · `worker/src/room/quiz.ts` | ⬜ | 🔄 |
| FR-042 | 니어미스 연출 | UC-013 | ARCH-005, ARCH-011 | API-027 | N/A (판정 시점 계산값) | `client/js/fx/{overlay.js, reactions.js, subtitle.js, verse-card.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `worker/src/room/quiz.ts` | ⬜ | 🔄 |
| FR-043 | 퀴즈 콘텐츠 | UC-013 | ARCH-016 | API-026 | TBL-016, TBL-017 | `content/{quiz.json, verses.json}` · `worker/src/room/quiz.ts` | ⬜ | 🔄 |
| FR-044 | 말씀 블록 | UC-014 | ARCH-002, ARCH-011 | API-013, API-019 | TBL-018 | `client/js/engine/{gravity.js, specials.js}` · `worker/src/room/specials.ts` · `worker/test/specials.test.ts` | ⬜ | 🔄 |
| FR-045 | 여리고 나팔 블록 | UC-014 | ARCH-002, ARCH-011 | API-013, API-023 | TBL-018 | `client/js/engine/{gravity.js, specials.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `worker/src/room/specials.ts` · `worker/test/specials.test.ts` | ⬜ | 🔄 |
| FR-046 | 만나 블록 | UC-014 | ARCH-002, ARCH-011 | API-012, API-013, API-023 | TBL-018 | `client/js/engine/{gravity.js, specials.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `worker/src/room/specials.ts` · `worker/test/specials.test.ts` | ⬜ | 🔄 |
| FR-047 | 단계적 해금 | UC-014 | ARCH-011, ARCH-014 | API-019 | TBL-004, TBL-018 | `client/js/engine/{gravity.js, specials.js}` · `worker/src/room/specials.ts` · `worker/src/services/progress-service.ts` · `worker/test/specials.test.ts` | ⬜ | 🔄 |
| FR-048 | 아트 방향 | UC-007 | ARCH-004 | N/A (클라이언트 전용) — 렌더링 | N/A (영속 데이터 없음) | `client/{index.html, style.css}` · `client/js/render/{background.js, block-textures.js, board-view.js, layout.js, piece-preview.js, pixi-app.js}` · `client/styles/{battle.css, components.css, screens.css, tokens.css}` | ⬜ | 🔄 |
| FR-049 | 존재 시각 표현 | UC-008, UC-010 | ARCH-004, ARCH-005 | API-021, API-023 | TBL-012, TBL-013 | `client/js/art/{shapes-angels.js, shapes-heroes-armor.js, shapes-spirits.js, shapes-ui.js, to-pixi.js, to-svg.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` | ⬜ | 🔄 |
| FR-050 | 폰트 번들 | UC-007 | ARCH-001, ARCH-017 | N/A (클라이언트 전용) — 폰트 번들 | N/A (영속 데이터 없음) | `client/{index.html, style.css}` · `client/js/main.js` · `client/js/screens/shell.js` · `client/js/store/session.js` · `client/styles/{battle.css, components.css, screens.css, tokens.css}` | ⬜ | 🔄 |
| FR-051 | 조작 연출 | UC-007 | ARCH-004, ARCH-005 | N/A (클라이언트 전용) — 조작 연출 | N/A (영속 데이터 없음) | `client/js/fx/{board-motion.js, flash.js, hitstop.js, juice-table-core.js, juice-table-flow.js, juice-table-powers.js, juice-table-quiz.js, juice.js, shake.js}` · `client/js/render/{block-textures.js, board-view.js, piece-preview.js}` | ⬜ | 🔄 |
| FR-052 | 삭제 연출 | UC-007 | ARCH-004, ARCH-005 | N/A (클라이언트 전용) — 삭제 연출 | N/A (영속 데이터 없음) | `client/js/fx/{arrows.js, board-motion.js, confetti.js, flash.js, hitstop.js, juice-table-core.js, juice-table-flow.js, juice-table-powers.js, juice-table-quiz.js, juice.js, shake.js}` · `client/js/render/{filters.js, particles.js, quality.js}` | ⬜ | 🔄 |
| FR-053 | 공격 연출 | UC-008 | ARCH-004, ARCH-005 | API-021, API-022 | N/A (연출) | `client/js/fx/{arrows.js, board-motion.js, confetti.js, flash.js, hitstop.js, juice-table-core.js, juice-table-flow.js, juice-table-powers.js, juice-table-quiz.js, juice.js, shake.js}` · `client/js/render/{background.js, filters.js, particles.js, quality.js}` | ⬜ | 🔄 |
| FR-054 | 영·천사·스킬 등장 연출 | UC-008, UC-010 | ARCH-005, ARCH-006 | API-021, API-023 | TBL-016 | `client/js/fx/{board-motion.js, juice-table-core.js, juice-table-flow.js, juice-table-powers.js, juice-table-quiz.js, juice.js, overlay.js, reactions.js, subtitle.js, verse-card.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` | ⬜ | 🔄 |
| FR-055 | 위기 연출·위험선 | UC-007, UC-012 | ARCH-002, ARCH-004, ARCH-006, ARCH-011 | API-012 | TBL-018 | `client/js/audio/{aux-sfx.js, bgm.js, mixer.js, sfx-voices.js, sfx.js}` · `client/js/engine/{board.js, scoring.js}` · `client/js/fx/{board-motion.js, juice-table-core.js, juice-table-flow.js, juice-table-powers.js, juice-table-quiz.js, juice.js}` · `client/js/render/{background.js, block-textures.js, board-view.js, piece-preview.js}` | ⬜ | 🔄 |
| FR-056 | 승리·패배 연출 | UC-015 | ARCH-005 | API-029, API-030 | TBL-016 | `client/js/fx/{arrows.js, board-motion.js, confetti.js, flash.js, hitstop.js, juice-table-core.js, juice-table-flow.js, juice-table-powers.js, juice-table-quiz.js, juice.js, shake.js}` · `client/js/render/{filters.js, particles.js, quality.js}` · `client/js/screens/result.js` | ⬜ | 🔄 |
| FR-057 | 연출 세기 옵션 | UC-020 | ARCH-001, ARCH-005 | N/A (클라이언트 전용) — 세션 옵션 | N/A (세션 메모리 — N-04 미승격) | `client/js/fx/{flash.js, hitstop.js, shake.js}` · `client/js/input/{keyboard.js, touch.js}` · `client/js/net/api.js` · `client/js/screens/{history.js, options.js, ranking.js}` · `client/js/store/{guest.js, settings.js}` · `client/styles/{battle.css, screens.css}` | ⬜ | 🔄 |
| FR-058 | 효과음 | UC-007, UC-020 | ARCH-006 | N/A (클라이언트 전용) — Tone.js 합성 | N/A (영속 데이터 없음) | `client/js/audio/{aux-sfx.js, bgm.js, mixer.js, sfx-voices.js, sfx.js}` | ⬜ | 🔄 |
| FR-059 | 배경음악 | UC-007, UC-020 | ARCH-006 | N/A (클라이언트 전용) — Tone.js 합성 | TBL-018 | `client/js/audio/{aux-sfx.js, bgm.js, mixer.js, sfx-voices.js, sfx.js}` | ⬜ | 🔄 |
| FR-060 | 음량 조절 | UC-020 | ARCH-001, ARCH-006 | N/A (클라이언트 전용) — 세션 옵션 | N/A (세션 메모리 — N-04 미승격) | `client/js/audio/{aux-sfx.js, bgm.js, mixer.js, sfx-voices.js, sfx.js}` · `client/js/net/api.js` · `client/js/screens/{history.js, options.js, ranking.js}` · `client/js/store/{guest.js, settings.js}` | ⬜ | 🔄 |
| FR-061 | 타격 피드백 동기화 | UC-007 | ARCH-004, ARCH-005, ARCH-006 | N/A (클라이언트 전용) — 연출 동기화 | N/A (영속 데이터 없음) | `client/js/audio/{aux-sfx.js, sfx-voices.js, sfx.js}` · `client/js/fx/{arrows.js, board-motion.js, confetti.js, flash.js, hitstop.js, juice-table-core.js, juice-table-flow.js, juice-table-powers.js, juice-table-quiz.js, juice.js, overlay.js, reactions.js, shake.js, subtitle.js, verse-card.js}` | ⬜ | 🔄 |
| FR-062 | 실력 보정 "은혜(Grace)" | UC-008, UC-015 | ARCH-005, ARCH-011, ARCH-014 | API-019, API-023, API-024 | TBL-004, TBL-018 | `client/js/art/{shapes-ui.js, to-pixi.js, to-svg.js}` · `client/js/fx/{overlay.js, reactions.js, subtitle.js, verse-card.js}` · `client/js/game/{apply-attack.js, apply-effect.js, apply-spirit.js, board-codec.js}` · `content/rules.json` · `worker/src/room/{effects.ts, garbage.ts, player-state.ts}` · `worker/src/services/progress-service.ts` | ⬜ | 🔄 |
| FR-063 | 말씀 카드 | UC-015 | ARCH-005 | API-030 | TBL-002, TBL-016 | `client/js/fx/{overlay.js, reactions.js, subtitle.js, verse-card.js}` · `client/js/screens/result.js` · `worker/src/room/{match-flow.ts, results.ts}` | ⬜ | 🔄 |
| FR-064 | 감정 표현 리액션 | UC-017 | ARCH-005, ARCH-011 | API-017, API-028 | TBL-018 | `client/js/fx/{overlay.js, reactions.js, subtitle.js, verse-card.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` · `content/rules.json` · `worker/src/game-room.ts` · `worker/src/room/{bot-driver.ts, handlers.ts, outbox.ts}` | ⬜ | 🔄 |
| FR-065 | 업적 | UC-015 | ARCH-011, ARCH-014 | API-030 | TBL-005, TBL-018 | `client/js/art/{shapes-ui.js, to-pixi.js, to-svg.js}` · `client/js/screens/result.js` · `content/rules.json` · `worker/src/room/{match-flow.ts, results.ts}` · `worker/src/services/progress-service.ts` | ⬜ | 🔄 |
| FR-066 | 개인 기록·성장 수치 | UC-015 | ARCH-005, ARCH-014 | API-030 | TBL-003, TBL-004 | `client/js/screens/result.js` · `worker/src/room/{match-flow.ts, results.ts}` · `worker/src/services/progress-service.ts` | ⬜ | 🔄 |
| FR-067 | 플레이어 진행 기록 | UC-014, UC-015 | ARCH-014 | API-030 | TBL-004, TBL-005 | `supabase/migrations/0001_init.sql` · `worker/src/services/progress-service.ts` · `worker/src/storage/{adapter.ts, migrations.ts, sqlite-adapter.ts}` · `worker/test/helpers/sql-storage-fake.ts` · `worker/test/ledger-fk.test.ts` | ⬜ | 🔄 |
| FR-068 | 경기 결과 저장 | UC-015 | ARCH-011, ARCH-014 | API-030 | TBL-002, TBL-003 | `supabase/migrations/0001_init.sql` · `worker/src/lobby/{lobby-flow.ts, pairing.ts}` · `worker/src/matchmaker.ts` · `worker/src/room/{match-flow.ts, results.ts}` · `worker/src/services/{history-service.ts, ranking-service.ts}` · `worker/src/storage/{adapter.ts, migrations.ts, sqlite-adapter.ts}` · `worker/test/helpers/sql-storage-fake.ts` · `worker/test/ledger-fk.test.ts` | ⬜ | 🔄 |
| FR-069 | 전적 조회 | UC-018 | ARCH-001, ARCH-009, ARCH-014 | API-003 | TBL-001, TBL-002, TBL-003 | `client/js/net/api.js` · `client/js/screens/{history.js, options.js, ranking.js}` · `client/js/store/{guest.js, settings.js}` · `worker/src/routes/{guests.ts, leaderboard.ts, matches.ts, respond.ts}` · `worker/src/services/{history-service.ts, ranking-service.ts}` · `worker/src/storage/{adapter.ts, sqlite-adapter.ts}` · `worker/test/helpers/sql-storage-fake.ts` · `worker/test/ledger-fk.test.ts` | ⬜ | 🔄 |
| FR-070 | Elo 레이팅 갱신 | UC-015, UC-019 | ARCH-014 | API-030 | TBL-001, TBL-003 | `client/js/screens/result.js` · `content/rules.json` · `supabase/migrations/0001_init.sql` · `worker/src/services/{elo.ts, guest-service.ts, history-service.ts, ranking-service.ts}` · `worker/src/storage/{adapter.ts, migrations.ts, sqlite-adapter.ts}` · `worker/test/helpers/sql-storage-fake.ts` · `worker/test/ledger-fk.test.ts` | ⬜ | 🔄 |
| FR-071 | 랭킹 조회 | UC-019 | ARCH-001, ARCH-009, ARCH-014 | API-004 | TBL-001, TBL-006 | `client/js/net/api.js` · `client/js/screens/{history.js, options.js, ranking.js}` · `client/js/store/{guest.js, settings.js}` · `worker/src/routes/{guests.ts, leaderboard.ts, matches.ts, respond.ts}` · `worker/src/services/{history-service.ts, ranking-service.ts}` · `worker/src/storage/{adapter.ts, sqlite-adapter.ts}` · `worker/test/helpers/sql-storage-fake.ts` · `worker/test/ledger-fk.test.ts` | ⬜ | 🔄 |
| FR-072 | 저장소 어댑터 자동 전환 | UC-021 | ARCH-014 | API-001~API-004 (어댑터 경유) | TBL-001~TBL-006 | `README.md` · `supabase/migrations/0001_init.sql` · `worker/{.dev.vars.example, package.json, tsconfig.json, wrangler.toml}` · `worker/src/storage/{adapter.ts, migrations.ts, select-storage.ts, sqlite-adapter.ts, supabase-adapter.ts}` · `worker/test/helpers/sql-storage-fake.ts` · `worker/test/ledger-fk.test.ts` | ⬜ | 🔄 |
| FR-073 | 단일 명령 로컬 실행 | UC-021 | ARCH-017 | API-005, API-006 (Vite 프록시 ws) | N/A (실행 구성) | `.gitignore` · `README.md` · `package.json` · `client/{package.json, vite.config.js}` · `scripts/check-ports.mjs` · `worker/{.dev.vars.example, package.json, tsconfig.json, wrangler.toml}` · `worker/src/index.ts` | ⬜ | 🔄 |
| FR-074 | 공용 게임 콘텐츠 | UC-021 | ARCH-016 | N/A (빌드 시 번들 — 런타임 조회 없음) | TBL-011~TBL-018 | `client/js/content.js` · `content/{angels.json, armor.json, check-content.mjs, counters.json, heroes.json, spirits.json, verses.json}` · `worker/src/content.ts` | ⬜ | 🔄 |
| FR-075 | 단위 테스트 (Vitest) | UC-022 | ARCH-018 | N/A (단위 테스트 — 순수 모듈) | TBL-018 | `client/js/engine/index.js` · `client/test/engine-purity.test.js` · `playwright.config.js` · `vitest.config.js` | ⬜ | 🔄 |
| FR-076 | 콘텐츠 검사 스크립트 | UC-022 | ARCH-016, ARCH-018 | N/A (콘텐츠 검사 스크립트) | TBL-011~TBL-018 | `client/js/content.js` · `content/check-content.mjs` · `worker/src/content.ts` | ⬜ | 🔄 |
| FR-077 | E2E 테스트 (Playwright) | UC-022 | ARCH-018 | API-013, API-014, API-015, API-021 | N/A (E2E 실행) | `playwright.config.js` · `vitest.config.js` | ⬜ | 🔄 |
| FR-078 | 화면 흐름 | UC-001, UC-002 | ARCH-001 | API-001, API-002, API-007 | N/A (화면 흐름) | `client/{index.html, style.css}` · `client/js/main.js` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js, entry.js, history.js, lobby.js, options.js, ranking.js, result.js, shell.js}` · `client/js/store/session.js` · `client/styles/{components.css, tokens.css}` | ⬜ | 🔄 |
| NFR-001 | 렌더링 60fps (중급 모바일), 파티클 오브젝트 풀링 | UC-007 | ARCH-004 | N/A (클라이언트 전용) — 렌더링 성능 | N/A (영속 데이터 없음) | `client/js/render/{filters.js, layout.js, particles.js, pixi-app.js, quality.js}` | ⬜ | 🔄 |
| NFR-002 | 공격 반영 지연 100ms 이하 | UC-008 | ARCH-011, ARCH-012 | API-013, API-021 | N/A (지연 측정) | `client/js/game/{local-player.js, server-events.js}` · `worker/src/{attack.ts, game-room.ts}` · `worker/src/room/{bot-driver.ts, handlers.ts, outbox.ts}` | ⬜ | 🔄 |
| NFR-003 | 서버 메시지 스키마·게스트 토큰·닉네임·빈도 검증 | UC-001, UC-008 | ARCH-009, ARCH-015 | API-001~API-031 | TBL-001 | `client/js/screens/{entry.js, lobby.js}` · `client/vite.config.js` · `content/rules.json` · `worker/src/{env.ts, game-room.ts, index.ts, log.ts}` · `worker/src/protocol/{messages.ts, rate-limit.ts, validate.ts}` · `worker/src/room/{bot-driver.ts, handlers.ts, outbox.ts}` · `worker/src/routes/{guests.ts, leaderboard.ts, matches.ts, respond.ts}` · `worker/src/services/{elo.ts, guest-service.ts}` · `worker/test/validate.test.ts` | ⬜ | 🔄 |
| NFR-004 | Supabase service role 키 클라이언트 비노출 | UC-021 | ARCH-014, ARCH-017 | N/A (서버 환경변수 — 응답에 미포함) | TBL-001~TBL-005 (Supabase RLS) | `client/vite.config.js` · `worker/{.dev.vars.example, package.json, tsconfig.json, wrangler.toml}` · `worker/src/{env.ts, log.ts}` · `worker/src/storage/{select-storage.ts, supabase-adapter.ts}` | ⬜ | 🔄 |
| NFR-005 | 외부 네트워크 리소스 없이 로컬 번들 자산으로 동작 | UC-021 | ARCH-004, ARCH-006, ARCH-016, ARCH-017 | N/A (클라이언트 전용) — 번들 자산 | TBL-011~TBL-018 | `client/js/audio/{aux-sfx.js, bgm.js, mixer.js, sfx-voices.js, sfx.js}` · `client/js/main.js` · `client/js/screens/shell.js` · `client/js/store/session.js` | ⬜ | 🔄 |
| NFR-006 | 첨부 B 체크리스트 8항목 충족 매핑 | UC-007, UC-008, UC-013, UC-015 | ARCH-005, ARCH-011 | API-021, API-026 | TBL-018 | `client/js/fx/{board-motion.js, juice-table-core.js, juice-table-flow.js, juice-table-powers.js, juice-table-quiz.js, juice.js}` | ⬜ | 🔄 |
| NFR-007 | 라이브러리 최신 안정판 lockfile 고정, 2주 미만 버전 회피 | UC-021 | ARCH-017 | N/A (의존성 고정) | N/A (lockfile) | `.gitignore` · `package.json` · `client/{package.json, vite.config.js}` · `scripts/check-ports.mjs` · `worker/{.dev.vars.example, package.json, tsconfig.json, wrangler.toml}` | ⬜ | 🔄 |
| NFR-008 | 수집 정보 최소화 (닉네임·게스트 ID·토큰·경기 기록) | UC-001 | ARCH-014 | API-001 | TBL-001 | `supabase/migrations/0001_init.sql` · `worker/src/{env.ts, log.ts}` · `worker/src/services/{elo.ts, guest-service.ts}` · `worker/src/storage/migrations.ts` | ⬜ | 🔄 |
| C-001 | 현금 결제·가챠 영구 금지 | UC-014 | ARCH-011 | N/A (상점·결제 API 없음) | TBL-018 | `content/rules.json` · `worker/src/room/specials.ts` · `worker/test/specials.test.ts` | ⬜ | 🔄 |
| C-002 | 예수님 표현 원칙 (선택 불가, 빛·실루엣, 경기당 1회 이벤트) | UC-012 | ARCH-005, ARCH-011 | API-023 | TBL-016 | `client/js/art/{shapes-angels.js, shapes-spirits.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` · `worker/src/room/{hero-skills.ts, jesus.ts}` | ⬜ | 🔄 |
| C-003 | KJV 1769 원문, 한국어 직접 번역, 출처 장·절 표기 | UC-013, UC-015 | ARCH-016 | API-026, API-027 | TBL-016, TBL-017 | `client/js/fx/{overlay.js, reactions.js, subtitle.js, verse-card.js}` · `content/{quiz.json, verses.json}` | ⬜ | 🔄 |
| C-004 | 외부 서비스 키 0개로 동작 | UC-021 | ARCH-014, ARCH-017 | API-001~API-006 | TBL-001~TBL-006 | `README.md` · `worker/{.dev.vars.example, package.json, tsconfig.json, wrangler.toml}` · `worker/src/storage/{select-storage.ts, supabase-adapter.ts}` | ⬜ | 🔄 |
| C-005 | 기술 스택 고정 (Vite·PixiJS v8·Workers+DO·DO SQLite·Vitest·Playwright 등) | UC-021 | ARCH-001~ARCH-018 | N/A (기술 스택 제약) | N/A (기술 스택 제약) | `.gitignore` · `package.json` · `client/{package.json, vite.config.js}` · `scripts/check-ports.mjs` · `worker/{.dev.vars.example, package.json, tsconfig.json, wrangler.toml}` | ⬜ | 🔄 |
| C-006 | Socket.IO·Express 미사용 | UC-003 | ARCH-008, ARCH-009 | API-005, API-006 | N/A (전송 계층) | `client/js/net/{lobby-socket.js, room-socket.js}` · `worker/src/index.ts` · `worker/src/protocol/{messages.ts, rate-limit.ts, validate.ts}` · `worker/test/validate.test.ts` | ⬜ | 🔄 |
| C-007 | 녹음 음원·일러스트 미사용 (코드 합성·코드 그래픽) | UC-007, UC-020 | ARCH-004, ARCH-006 | N/A (클라이언트 전용) — 코드 합성·코드 그래픽 | TBL-011 (emblem 키) | `client/js/art/{shapes-angels.js, shapes-heroes-armor.js, shapes-spirits.js, shapes-ui.js, to-pixi.js, to-svg.js}` · `client/js/audio/{aux-sfx.js, bgm.js, mixer.js, sfx-voices.js, sfx.js}` | ⬜ | 🔄 |
| C-008 | 이번 실행 제외 범위 구현 금지 | UC-002 | ARCH-001, ARCH-016 | API-007 (heroId 4명 검증) | TBL-011 | N/A (구현 금지 제약 — 제외 범위 코드 0: 전 소스 대조 `bible-성경/04/sync-fruit-열매검증.md` §3) | ⬜ | 🔄 |
| C-009 | 채팅 없음 (리액션만) | UC-017 | ARCH-011 | API-017, API-028 | TBL-018 | `client/js/fx/{overlay.js, reactions.js, subtitle.js, verse-card.js}` · `client/js/screens/{battle-hud.js, battle-overlays.js, battle.js}` | ⬜ | 🔄 |
| C-010 | KJV 근거 없는 존재 미등장, 모든 캐릭터 근거 구절 표시 | UC-002, UC-008 | ARCH-016 | N/A (콘텐츠 정적 데이터) | TBL-011, TBL-012, TBL-013 | `client/js/art/{shapes-angels.js, shapes-spirits.js}` · `client/js/content.js` · `content/{angels.json, armor.json, check-content.mjs, counters.json, heroes.json, spirits.json, verses.json}` · `worker/src/content.ts` | ⬜ | 🔄 |
| C-011 | 고어·선정 표현 금지 (전 연령) | UC-008 | ARCH-004, ARCH-005 | N/A (클라이언트 전용) — 연출 표현 | N/A (영속 데이터 없음) | `client/js/art/{shapes-angels.js, shapes-heroes-armor.js, shapes-spirits.js, shapes-ui.js, to-pixi.js, to-svg.js}` · `client/js/render/{holy-fx.js, spirit-appear.js, spirit-fx.js}` · `content/{angels.json, armor.json, counters.json, heroes.json, spirits.json}` | ⬜ | 🔄 |
| C-012 | 소스는 fruit-열매/ 아래 첨부 A §4.5 구조 | UC-021 | ARCH-017 | N/A (폴더 구조 제약) | N/A (폴더 구조 제약) | `.gitignore` · `package.json` · `scripts/check-ports.mjs` | ⬜ | 🔄 |
| C-013 | backup/ 폴더 git 미커밋·비공개 | UC-021 | ARCH-017 | N/A (.gitignore 정책) | N/A (.gitignore 정책) | `.gitignore` · `package.json` · `scripts/check-ports.mjs` | ⬜ | 🔄 |

> 행 구성: 상위 요구사항(REQ) 17행 → 기능 요구사항(FR) 78행 → 비기능 요구사항(NFR) 8행 → 제약 조건(C) 13행 = 116행. 예시(`rtm-covenant-언약추적-example.md`)와 같이 REQ·FR·NFR를 한 매트릭스에 두고, 명세서의 제약 조건(C)도 "하나도 잃어버리지 않겠다"(John 6:39) 원칙에 따라 함께 등재한다.
> FR의 상위 REQ는 `spec-tablet-명세서.md` §4.1 "하위 FR" 열이 원본이다.
> **`N/A (사유)` 표기 (Phase 2):** 해당 계층이 Phase 2 설계 판정 결과 존재하지 않음을 뜻한다 — 예: 조작·삭제 연출(FR-051, FR-052)은 클라이언트 렌더링 전용이라 API·영속 테이블이 없고, 대기열·초대 코드(FR-019, FR-020)는 휘발 상태(data-ark §8)라 테이블이 없다. 누락(⬜)이 아니라 "설계상 없음"의 판정이며 괄호 안에 사유를 적는다. `ARCH-001~ARCH-018`처럼 물결(~)은 그 범위의 ID 전부를 뜻한다.

---

## 2. REQ 원문 대조표 (RTM 오염 방지 — P1-010)

> RTM의 상위 REQ 요약이 req.md 원문과 같은 뜻·같은 동사인지 대조한다. 원문은 `hearing-들음/req.md` "이번 실행 범위" 절을 굵게 표시만 빼고 그대로 옮겼다.

| REQ-ID | req.md 원문 (서두 "이번 실행 범위") | RTM 요약과 일치 |
|:---|:---|:---:|
| REQ-001 | "사용자가 브라우저에서 KJV 성경 기반 실시간 2인 대전 테트리스를 플레이한다." | ✅ 동일 문장 |
| REQ-002 | "사용자는 게스트 닉네임으로 입장하고, ..." | ✅ 동사 "입장" 보존 |
| REQ-003 | "... 위인 4명(다윗·솔로몬·베드로·바울) 중 한 명을 고른다." | ✅ 동사 "고른다" 보존 |
| REQ-004 | "사용자는 대전 모드(사람 대 사람, 랜덤 매칭 + 친구 초대 코드), ... 를 고를 수 있다." | ✅ 동사 "고를 수 있다" 보존 |
| REQ-005 | "사용자는 ..., AI 봇 대전(쉬움·보통·어려움), ... 를 고를 수 있다." | ✅ |
| REQ-006 | "사용자는 ..., 연습 모드를 고를 수 있다." | ✅ |
| REQ-007 | "줄을 지우면 상대에게 쓰레기 줄과 악한 영(첨부 A §3.4의 14종) 이 공격으로 간다. 서버가 공격을 판정한다." | ✅ 동사 "지우면·간다·판정한다" 보존 |
| REQ-008 | "사용자는 믿음 게이지로 위인 스킬과 천사 5종(첨부 A §3.3) 을 쓰고, ..." | ✅ 동사 "쓰고" 보존 |
| REQ-009 | "... 전신갑주 6종(첨부 A §2.3) 을 얻어 쓴다." | ✅ 동사 "얻어 쓴다" 보존 |
| REQ-010 | "예수님 "세상을 이기었노라" 이벤트(첨부 A §3.2 원칙 그대로) 가 경기당 1회 일어날 수 있다." | ✅ 동일 문장 |
| REQ-011 | "말씀 대결(성경 퀴즈, 60문항 이상) 과 ... 이 있다 (첨부 A §5.5)." | ✅ |
| REQ-012 | "... 특수 블록 3종(말씀·여리고 나팔·만나) 이 있다 (첨부 A §5.5)." | ✅ |
| REQ-013 | "디자인·액션·사운드·재미 요구사항(첨부 A §5 전체) 은 필수다. 첨부 B의 체크리스트를 충족해야 한다." | ✅ 동일 문장 |
| REQ-014 | "경기 결과(전적)와 랭킹(Elo) 이 저장되고 조회된다." | ✅ 전적 부분 — 동사 "저장되고 조회된다" 보존 |
| REQ-015 | "경기 결과(전적)와 랭킹(Elo) 이 저장되고 조회된다." | ✅ 랭킹 부분 — 동사 보존 |
| REQ-016 | "인프라: 로컬 PC. 외부 서비스 키(Cloudflare 계정, Supabase) 없이 npm install && npm run dev 한 번으로 전부 동작해야 한다." + "DB: ... Supabase는 환경변수가 있을 때만 쓰는 어댑터로 둔다." | ✅ 동사 "동작해야 한다·둔다" 보존 |
| REQ-017 | "테스트: Vitest(단위) + Playwright(브라우저 2개 E2E)" | ✅ 동일 문구 |

> 오염 검사 결과: 17/17 일치. RTM 요약에 req.md에 없는 동사·기능어가 들어간 REQ 0건.

---

## 3. 커버리지 요약

| 지표 | 수치 |
|:---|:---:|
| 전체 REQ 수 | 116 |
| 완전 추적(✅) | 0 |
| 부분 추적(🔄) | 116 |
| 미추적(⬜) | 0 |
| 커버리지 | 0% |

> "전체 REQ 수"는 매트릭스의 고유 ID 수(REQ 17 + FR 78 + NFR 8 + C 13)다.
> Phase 2 시점의 커버리지(✅) 0%는 정상이다 — ✅는 설계→구현→테스트 전 구간 연결이며 Phase 5 이후에 가능하다. Phase 2 완료 시점 연결률: UC 116/116, ARCH 116/116, API 116/116(N/A 판정 포함), TBL 116/116(N/A 판정 포함) = 100%. 🔄 116건 = 설계 산출물에만 연결된 상태.
> 수치는 `.skill/tools-도구/census-count-언약계수.py`의 실계수로 대조한다 (§6).

---

## 4. 미추적 항목 목록

| 구분 | 대상 ID | 미추적(미완) 사유 | 연결 예정 Phase |
|:---|:---|:---|:---|
| 상위 요구사항 | REQ-001 ~ REQ-017 (17건) | Phase 2 완료 — UC·ARCH·API·TBL 연결됨(🔄). Phase 3 화면 연결 확인 완료(§7). Phase 4 코드 모듈 연결 완료(TASK-072). 테스트 ID 미연결 | Phase 5 (테스트) |
| 기능 요구사항 | FR-001 ~ FR-078 (78건) | 같은 사유 | Phase 5 |
| 비기능 요구사항 | NFR-001 ~ NFR-008 (8건) | 같은 사유 | Phase 5 (측정 테스트) |
| 제약 조건 | C-001 ~ C-013 (13건) | 같은 사유 | Phase 5 (테스트), Phase 6 (감사) |

> ⬜(미추적) 0건 — 116건 전부 🔄(부분 추적).
> 의도적 제외(❌) 0건. 이번 실행 제외 범위(스토리 모드, 위인 11명, 열두 제자 카드, 구글·카카오 로그인, 실제 배포, 녹음 음원·일러스트)는 REQ로 등록하지 않았으며, "구현하지 않는다"는 사실 자체를 제약 조건 C-007·C-008로 추적한다.
> UX 확장 코너의 NICE-TO-HAVE(N-01~N-06)는 요구사항이 아니므로 이 매트릭스에 등재하지 않는다 (자동 모드 — 승격 금지). 승인되어 REQ로 승격되면 그때 새 REQ-ID로 등재한다.

---

## 5. 설계 변경 이력 (Design Change Log — 두 번째 돌판 규칙)

> 정경화(2026-10-19, Phase 1) 이후 상류 설계 변경: **0건** (Phase 3도 Phase 1·2 산출물의 본문을 바꾸지 않았다 — §7 화면 연결 확인은 순방향 기록이다. Phase 2는 Phase 1 산출물의 본문을 바꾸지 않았다 — 이 RTM의 ARCH/API/TBL 열 채움과 상태 갱신은 "언약추적 갱신 규칙"의 순방향 갱신이며 재각(역방향 개정)이 아니다). 첫 변경이 발생하면 템플릿 "재각 규칙 1" 형식(변경일 · 발견 Phase/지역 · 대상 ID · 변경 사유 · 영향받는 하류 산출물 · 재검증 필요 여부 · 상태)의 표를 이 절에 추가하고, 두 증인 확정(재각 규칙 3)을 통과한 변경만 기록한다.

> **2026-10-19 갱신:** Phase 4 / acts-행전 00.jerusalem-예루살렘 배치에서 첫 변경 1건이 발생했다(아래 DCL-001). 위 "0건" 문장은 정경화 시점 기록으로 보존한다. **W-00 갱신(2026-10-19):** DCL-001 승인, DCL-002(TBL-018 rateLimit 수치 3개 — api-gate §2와 정합) 추가 → 이 배치의 변경 2건. **D-01 갱신(2026-10-19, 01.judaea-유대):** DCL-003(TBL-018 gravity.accelAfterMs·ledger 수치 6개 — 다른 정경 문서 원문 값 그대로) 추가, W-01 확정 대기. **W-01 갱신(2026-10-19):** DCL-003 승인, DCL-004(착지 평가 위치 = ARCH-002 `engine/placement.js` + TBL-018 `placement.weights` — 솔로몬·가브리엘 힌트 계산 위치 설계 틈 해소) 추가 → 01 배치 변경 2건. **D-02 갱신(2026-10-19, 02.samaria-사마리아):** DCL-005(TBL-018 `net.joinTimeoutMs`·`net.readyTimeoutMs` — api-gate API-005·API-006 인증 기한 원문 값 그대로) 추가, W-02 확정 대기. **W-02 갱신(2026-10-19):** DCL-005 승인, DCL-006(TBL-018 `bot` 난이도 수치 개정 + `lineBias`·`biasMaxHeight` — 어려움 봇 공격 설계·쉬움/보통 자멸 해소, 조정값) 추가·승인 → 02 배치 변경 2건. **D-03A 갱신(2026-10-19, 03.uttermost-땅끝 03-A):** DCL-007(렌더 구조 — 파티클 컨테이너 2개·배경 PT-mote 소유·v8 동적 속성 이름·흔들림 루트에서 HolyLayer 분리·보드 단위 컨테이너) 추가, W-03A 확정 대기. **D-03B 갱신(2026-10-19, 03.uttermost-땅끝 03-B):** DCL-008(03-B 설계 틈 — 미지정 세부 수치·심장박동 시계·예수님 자막 자리·콤보 배경 밝기 문장 충돌·음악 낮춤 노드·히트스톱 섬광) 추가, W-03B 확정 대기. **W-03A·W-03B 갱신(2026-10-19):** DCL-007·DCL-008 승인, DCL-009(설계 의도 ↔ 수치 토큰 4건 — 충격파 고리 크기·시간, 빛기둥 GLW-holy, 자막 높이 맞춤) 추가·승인 → 03-A·03-B 변경 3건. **D-03C 갱신(2026-10-19, 03.uttermost-땅끝 03-C):** DCL-010(빌드 명령·세로형 연습 패널 좌표 충돌·X-06 첫 등장 기준) 추가, W-03C 확정 대기. **D-03D 갱신(2026-10-19, 03.uttermost-땅끝 03-D):** DCL-011(Vite 개발 서버 파일 제공 차단 목록 `server.fs.deny` — 봉인 점검 TASK-071 SEC-001~003) 추가, W-03D 확정 대기.

| # | 변경일 | 발견 Phase/지역 | 대상 ID(REQ/ARCH/API/TBL) | 변경 사유 | 영향받는 하류 산출물 | 재검증 필요 여부 | 상태 |
|:---|:---|:---|:---|:---|:---|:---:|:---:|
| DCL-001 | 2026-10-19 | Phase 4 / acts-행전 00.jerusalem-예루살렘 배치 (task-wall A-03) | TBL-001~TBL-006 (data-ark §7 마이그레이션 전략, §6.1 부록 추가), ARCH-014, FR-072 | data-ark §7의 단계 판정 수단 `PRAGMA user_version`이 Durable Object SQL API에서 거부됨 — 실측(wrangler 4.147.0 / workerd 1.20261001.1 `wrangler dev`, SQLite-backed DO): `PRAGMA user_version` 읽기·`= 1` 쓰기 모두 `not authorized: SQLITE_AUTH`. 같은 실측에서 `PRAGMA foreign_keys` = 1, FK 위반 INSERT 거부, `transactionSync` 롤백, `COLLATE NOCASE`·`RANK() OVER`·`strftime('%f')` 정상. 대안: 단일 행 표 `schema_meta(id=1, version)`로 단계 번호 기록 (task-wall A-03이 미리 정한 대안 그대로). 발견 근거 2곳: ① 실측 오류 메시지(fruit-열매/history 2026-10-19) ② task-wall A-03 사전 예측(DO SQL PRAGMA 허용 목록) | data-ark-법궤 §7·§6.1 부록, `worker/src/storage/migrations.ts`(TASK-002), `worker/test/ledger-fk.test.ts`(TASK-003), 서신 `acts-행전/TASK-000/00.jerusalem-예루살렘/epistle-서신.md` §7 발췌(재생성 필요 — 이 배치 Doer는 acts-행전 쓰기 권한 없음) | ✅ | ✅ 2026-10-19 W-00 승인 — 두 증인 확정(재각 규칙 3): ① D-00 실측 ② W-00 독립 재실측(별도 탐침 Worker, 같은 wrangler 4.147.0 `wrangler dev`): `PRAGMA user_version` 읽기·쓰기 모두 `not authorized: SQLITE_AUTH` 재현, 실제 `migrations.ts`가 workerd에서 단계 1 적용·재실행 멱등(version 1 유지)·`PRAGMA foreign_keys` = 1. §6.1 부록 DDL = migrations.ts 문자열(공백 정규화 대조 12/12 + schema_meta 일치). `ledger-fk.test.ts` 마이그레이션 3건 통과. 서신 4통 재생성 완료(W-00) |
| DCL-002 | 2026-10-19 | Phase 4 / acts-행전 00.jerusalem-예루살렘 배치 (TASK-008 rules.json, W-00 대조) | TBL-018 `rateLimit` (data-ark §3 TBL-018 표), API-001, API-005~API-017 공통 규약(api-gate §2 "메시지 크기"·"속도 제한"), NFR-003 | api-gate §2 공통 규약이 수치 3개 — 전체 한도 3초 연속 초과 시 종료, REST 게스트 생성 접속 주소별 분당 5회, REST 본문 최대 1,024바이트 — 를 정의하지만 "모든 수치의 단일 원천"인 data-ark TBL-018 `rateLimit` 행에는 없어 rules.json에 넣을 근거가 없었다(코드가 api-gate 문장을 하드코딩하게 되는 설계 틈). 개정: TBL-018 `rateLimit` 행에 `totalViolationMs` 3000 · `guestCreate` 5/60초 · `maxRestBodyBytes` 1024 추가(기존 문장 취소선 보존), 버킷 형식 `{tokens, perMs}` 명시. 수치 값은 api-gate 원문 그대로 — 새 수치 발명 0. 발견 근거 2곳: ① D-00 보고(rules.json 작성 시 표에 없는 수치 발견) ② W-00 원문 대조(api-gate §2 65~66행 ↔ data-ark TBL-018 rateLimit 행) | data-ark-법궤 TBL-018 표, `content/rules.json`(TASK-008), `content/check-content.mjs`(TASK-009 — rateLimit 하위 키 11개 검사), 서신 00·02 (TBL-018 rateLimit 행 발췌 — 재생성), 02 사마리아 rate-limit 구현(TASK-030~TASK-034 — 이 키를 읽어야 함) | ✅ | ✅ 2026-10-19 W-00 개정·구현·검사 통과 (`npm run check:content` 통과, 키 제거 음성 검사 exit 1) |
| DCL-003 | 2026-10-19 | Phase 4 / acts-행전 01.judaea-유대 배치 (D-01 — TASK-010-3 gravity.js, TASK-020-1·020-2 원장 서비스) | TBL-018 `gravity`·`ledger`(신규 키) (data-ark §3 TBL-018 표), FR-010, FR-012, FR-069, FR-071, ARCH-002, ARCH-014 | TBL-018은 "모든 수치의 단일 원천"(머리말)인데 01 지역 구현에 필요한 수치 6개가 다른 정경 문서에만 있다: ① FR-010 가속 시작 120,000ms — 키 이름 `gravity.at120sMs`에만 숨어 있음 ② 토큰 검증 LRU 1,000건(architecture §4·data-ark §5) ③ 랭킹 캐시 5초 TTL(data-ark §5) ④ 랭킹 상위 100명(FR-071) ⑤⑥ 전적 페이지 기본 20·최대 50(api-gate §2). 코드에 하드코딩하지 않도록 TBL-018에 `gravity.accelAfterMs` 120000, `ledger.{tokenCacheSize 1000, leaderboardCacheMs 5000, leaderboardTop 100, historyPageDefault 20, historyPageMax 50}` 추가. 수치 값은 원문 그대로 — 새 수치 발명 0 (DCL-002와 같은 유형). 발견 근거 2곳: ① D-01 구현 중 rules.json 키 부재 ② 원문 대조(architecture §4 캐시 전략 행, data-ark §5 인덱스 전략 표, api-gate §2 페이징 행, spec-tablet FR-010·FR-071) | data-ark-법궤 TBL-018 표, `content/rules.json`(TASK-008 — 키 추가), `content/check-content.mjs`(TASK-009 — RULE_KEYS 6개 추가), `client/js/engine/gravity.js`(TASK-010-3), `worker/src/services/guest-service.ts`·`ranking-service.ts`·`history-service.ts`(TASK-020-1·020-2), 서신 01·02·03 (TBL-018 발췌 — 재생성 필요: 이 배치 Doer는 acts-행전 쓰기 권한 없음), 02 사마리아 routes/matches.ts(limit 파싱 — 이 키를 읽어야 함) | ✅ | ✅ 2026-10-19 W-01 승인 — 두 증인 확정(재각 규칙 3): ① D-01 구현 중 발견 ② W-01 독립 원문 대조 6/6 일치 — architecture §4 캐시 전략 행(LRU 1,000건·랭킹 상위 100 5초 TTL), data-ark §5 인덱스 표(LRU 1,000·5초 TTL), api-gate §2 페이징 행·API-003 limit(기본 20, 1~50), spec-tablet FR-071(상위 100명), `gravity.at120sMs` 키 이름(120초) — 새 수치 0, 기존 키 값 불변. rules.json 값 = data-ark 표 값, `check:content` RULE_KEYS 6개 검사 통과, 코드(gravity.js·guest/ranking/history-service)가 하드코딩 없이 이 키를 읽음. 서신 01·02·03 재생성 완료(W-01) |
| DCL-004 | 2026-10-19 | Phase 4 / acts-행전 01.judaea-유대 배치 (W-01 대조 — D-01 인계 메모 ② 미해결 설계 틈) | ARCH-002, ARCH-013, FR-015, FR-021, FR-035, TBL-018 `placement`(신규 키) (data-ark §3 TBL-018 표, architecture §1 ARCH 표·§5.2 트리) | FR-015(솔로몬 "최적 착지 위치 힌트 10초")·FR-035(가브리엘 "착지 힌트")의 **최적 착지 계산 위치가 정경에 없다** — screen-vision SCR-005 MyBoard 행은 데이터 원천을 "로컬 엔진"이라 하지만 ARCH-002 책임 목록에 착지 평가가 없고, 평가 로직은 서버 `worker/src/bot/placement.ts`(ARCH-013)에만 있었다(클라이언트 → worker import는 계층 위반, 클라이언트 재구현은 D-12 "엔진 이중 구현 금지" 위반). 또 평가 가중치 4개가 코드 상수였다(TBL-018 "모든 수치의 단일 원천" 위반 — 힌트가 플레이어에게 보이는 규칙이 되므로 알고리즘 내부 상수로 볼 수 없음). 개정: ① 착지 후보 열거·보드 평가·최적 착지 선택을 ARCH-002 순수 엔진 `client/js/engine/placement.js`로 둔다(클라이언트 힌트·서버 봇 공용 — D-12·D-02와 정합, 공용 패키지 폴더 신설 없음) ② ARCH-013은 그 점수에 난이도 노이즈·실수율만 더한다 ③ TBL-018에 `placement.weights` 추가(값 = D-01 구현 상수 그대로 — 새 수치 발명 0). SRS 벽차기 표는 이 변경 대상이 아니다: FR-002 "SRS … 벽차기 테이블"이 표준 표 자체를 요구하고 task-wall §3.2 #4가 `srs.js`를 그 표의 위치로 지정한다(규칙 수치가 아닌 표준 알고리즘 표). 발견 근거 2곳: ① D-01 인계 메모(fruit-열매/history 2026-10-19 16:47:27 ②) ② W-01 정경 대조(screen-vision SCR-005 "고스트·힌트 ← 로컬 엔진" ↔ architecture ARCH-002 책임 목록 ↔ devguide §3.5-5 "수치는 rules.json에서만") | architecture-temple ARCH-002·ARCH-013 행·§5.2 트리, data-ark-법궤 TBL-018 표, 이 RTM §1 FR-015·FR-035 ARCH 열·§8 FR-015·FR-035·REQ-003·REQ-008 행, task-wall §2.2 TASK-019 행·§3.2·§7, devguide §2.1 트리, `content/rules.json`(TASK-008 — 키 추가), `content/check-content.mjs`(TASK-009 — RULE_KEYS +1), `client/js/engine/placement.js`(TASK-019 신규)·`index.js`(re-export 1줄)·`worker/src/bot/placement.ts`·`bot-player.ts`(TASK-019), `client/test/engine-purity.test.js`(엔진 파일 목록), 서신 01·03(재생성), 03-A board-view 힌트 그리기·03-C 컨트롤러(TASK-041·TASK-065 — `engine.placement.bestPlacement(board, type, rules.placement.weights)`를 읽어야 함) | ✅ | ✅ 2026-10-19 W-01 개정·구현 (Spec-First: 이 행 → 정경 4종 → 코드 순). 두 증인: D-01 발견(미해결 보고) + W-01 판정·구현. `npm test` 통과·`check:content` 통과·worker tsc 0 오류, 봇 착지 결과 이전과 동일(같은 가중치·같은 열거) |
| DCL-005 | 2026-10-19 | Phase 4 / acts-행전 02.samaria-사마리아 배치 (D-02 — TASK-032 Matchmaker·TASK-033 GameRoom 소켓 인증 기한) | TBL-018 `net`(신규 키 2개) (data-ark §3 TBL-018 표), API-005, API-006, NFR-003 | api-gate API-005 "연결 후 5초 안에 `join`(토큰) 필수"·API-006 "연결 후 10초 안에 `ready`(토큰 + 티켓) 필수"(§4.3 AUTH_TIMEOUT Close 4001)가 수치 2개를 정의하지만 "모든 수치의 단일 원천"인 data-ark TBL-018에는 없어 02 지역 코드가 api-gate 문장을 하드코딩하게 되는 설계 틈(DCL-002·DCL-003과 같은 유형). 개정: TBL-018에 `net.joinTimeoutMs` 5000 · `net.readyTimeoutMs` 10000 추가. 수치 값은 api-gate 원문 그대로 — 새 수치 발명 0. 발견 근거 2곳: ① D-02 구현 중 rules.json 키 부재 ② 원문 대조(api-gate API-005·API-006 "인증 필요" 행, §4.3 AUTH_TIMEOUT 행) | data-ark-법궤 TBL-018 표, `content/rules.json`(TASK-008 — 키 추가), `content/check-content.mjs`(TASK-009 — RULE_KEYS +2), `worker/src/matchmaker.ts`(TASK-032)·`worker/src/game-room.ts`(TASK-033), 서신 02·03 (TBL-018 발췌 — 재생성 필요: 이 배치 Doer는 acts-행전 쓰기 권한 없음) | ✅ | ✅ 2026-10-19 W-02 승인 — 원문 독립 대조 2/2 일치(api-gate API-005 "5초 안에 `join`"·API-006 "10초 안에 `ready`"·§4.3 AUTH_TIMEOUT 4001 ↔ TBL-018 5000·10000 ↔ rules.json), 새 수치 0, 코드 하드코딩 0(`lobby-flow.ts`·`game-room.ts`가 `rules.net.*`만 읽음), 실측 AUTH_TIMEOUT 4001 5초(스모크). 방 수준 ready 기한(소켓을 열지 않은 슬롯 → OPPONENT_LEFT)은 UC-003 E2 "`ready` 전 이탈"과 같은 값을 쓰는 해석 — 승인 |
| DCL-006 | 2026-10-19 | Phase 4 / acts-행전 02.samaria-사마리아 배치 (W-02 대조 — D-02 관찰 "어려움 봇은 거의 1줄만 지워 공격이 드물다") | TBL-018 `bot.easy`·`bot.normal`·`bot.hard`(수치 개정 + 키 2개 추가) (data-ark §3 TBL-018 표), FR-021, REQ-005, req §5.4 "AI 상대"·§5.5(3)·(6) "몰입 채널 밸런싱 — 봇 난이도" | FR-021은 "난이도는 착지 판단 품질과 조작 속도로 구분"이라 하고 req §5.5(6)은 봇 난이도를 몰입 채널 밸런싱 장치로 둔다. 그런데 Phase 2 수치(TBL-018 `bot`)로 실측하면 난이도가 "재미있는 상대"로 구분되지 않는다 — W-02 시뮬레이션(엔진 그대로, 시드 10개 × 240초, 공격 없음): 쉬움 평균 70초·보통 80초에 **스스로 Top-out**(쉬움 10판 합계 1줄 삭제 8회 — 사실상 무작위 착지), 어려움은 1줄 삭제가 90%라 공격력 합 9/240초(FR-024 1줄 = 공격 0). 원인 ① evalNoise 0.6·0.25가 0~1 정규화 점수 폭을 덮음 ② 착지 평가(`placement.weights`)가 "줄을 바로 지움"에 최적화된 생존형이라 줄을 모아 지우는 판단이 없음. 개정: ① 쉬움 evalNoise 0.6→0.2·mistakeRate 0.25→0.10, 보통 evalNoise 0.25→0.1·mistakeRate 0.10→0.04 (조작 속도 moveIntervalMs·퀴즈 수치 불변) ② 봇 전용 키 `lineBias`(지운 줄 수 0~4별 점수 보정)·`biasMaxHeight`(그 높이 넘으면 보정 0) 추가 — 쉬움 없음, 보통 [0,−3,0,2,6]/12, 어려움 [0,−6,−1,4,12]/12. `placement.weights`와 엔진 `placement.js`는 불변(솔로몬·가브리엘 힌트 점수 그대로 — DCL-004 경계 유지). 결과(같은 시뮬레이션, 240초): 공격력 합 쉬움 0.1 · 보통 3.3 · 어려움 20.5 (개정 전 0 · 0.5 · 9.0), 스스로 Top-out 시각 쉬움 평균 ~140초 · 보통 ~175초(3/10 생존) · 어려움 0/10. 새 수치는 정경 원문 값이 아닌 **조정값**이다(DCL-002~005와 다른 유형 — 두 증인: ① D-02 스모크 관찰 ② W-02 시뮬레이션 실측). 발견 근거 2곳: ① history 2026-10-19 17:27:57 D-02 관찰 ② W-02 봇 시뮬레이션(저장소 밖 scratch) | data-ark-법궤 TBL-018 `bot.*` 행, `content/rules.json`(TASK-008), `worker/src/bot/placement.ts`(TASK-019 — 줄 수 보정), 서신 02·03 (TBL-018 발췌 — W-02 재생성) | ✅ | ✅ 2026-10-19 W-02 개정·구현 (수치는 scratch 시뮬레이션으로 탐색한 뒤 이 행 → data-ark TBL-018 → rules.json 순으로 확정, 코드는 rules 키만 읽음). 실서버 스모크: 어려움 봇이 42초 안에 사람에게 서버 판정 공격, 봇 clear 거부 0 · npm test·check:content·tsc 통과. Phase 5 재미 검증(체감) 대상으로 인계 |
| DCL-007 | 2026-10-19 | Phase 4 / acts-행전 03.uttermost-땅끝 03-A 배치 (D-03A — TASK-040 pixi-app·TASK-041 board-view·TASK-042 particles·TASK-043 background·TASK-045 holy-fx 구현 중) | ARCH-004, FR-039, FR-048, FR-052, FR-053, FR-054, NFR-001, C-002, D-13 (design-vision §2.8·§2.10·§4.6.8·§4.9) | design-vision 문장끼리 충돌 4건 + 레이어 표 해석 1건 + 설치본 라이브러리 의미 충돌 1건 — 코드로는 둘 다 지킬 수 없어 Doer가 임의 선택하면 안 되는 설계 틈. ① §2.10 "PT는 모두 `ParticleContainer` 한 개의 풀" ↔ PT-spark "가산 혼합(add)": Pixi 8.22.0 `ParticleContainer`는 blendMode가 컨테이너 단위 1개(실측: node_modules/pixi.js/lib/scene/particle-container/shared/Particle.d.ts — 파티클별 blendMode 속성 없음)라 어두운 PT-smoke·PT-fly(일반 혼합)와 PT-spark(add)를 한 컨테이너에 담으면 둘 중 하나가 틀린다 → ParticleLayer(z50) 안에 일반·가산 `ParticleContainer` 2개, 풀 상한 600(가벼운 그리기 300)은 **두 컨테이너의 합** ② §2.10 PT-mote "같은 풀" ↔ §2.8·§2.12 P1·P4 = BackgroundLayer(z0, 보드 아래): 한 컨테이너는 한 z에만 그려지므로 PT-mote(104개, 무한 순환)는 BackgroundLayer 전용 `ParticleContainer`가 소유하고 풀 600에 세지 않는다(무한 수명이라 회수 대상이 될 수 없음) ③ §4.9 동적 속성 "position·rotation·alpha" ↔ PT-smoke 크기 1→1.6: v8 동적 속성 이름은 position·rotation·color(alpha·tint)·vertex(scale)·uvs — 크기 변화와 풀 재사용 시 프리셋 텍스처 교체를 위해 vertex·uvs도 동적으로 둔다(파티클 텍스처는 시작 시 구운 아틀라스 1장 — 한 컨테이너 = 한 텍스처 원천) ④ §2.10 SHK "화면 = 스테이지 루트" ↔ §2.13.5·§4.6.8 "실루엣의 흔들림·어두워짐 금지"(C-002): HolyLayer가 흔들림 루트 안에 있으면 예수님 실루엣이 화면 흔들림(SHK-4·SHK-5)과 함께 흔들린다 → 스테이지 = 레터박스(배율·원점) → [흔들림 루트 `screenRoot`(z0~z70 레이어 — SHK "화면" 대상, §4.6.8 밝기 필터 대상), HolyLayer(z80), ScreenFxLayer(z90)] — z 순서 불변, HolyLayer·ScreenFx는 흔들리지 않는다 ⑤ §2.8 BoardFrame(10)·BoardCell(20)·Guide(25)·ActivePiece(30)·BoardFx(40) 레이어 ↔ §2.10 SHK "보드 = 해당 보드 컨테이너"·§4.6.1 J-05 "착지점 ShockwaveFilter(보드 컨테이너)"·§4.6.4 S-12 "내 보드 컨테이너에 BlurFilter": 필터·흔들림 대상이 보드 1개여야 하므로 보드마다 컨테이너 1개(필터·흔들림 대상)를 두고 그 안에 zIndex 10·20·25·30·40 하위 레이어를 둔다 — 보드끼리 겹치지 않으므로 그리기 순서는 §2.8 표와 같다(레이어 11개 = zIndex 상수 11개) ⑥ §4.6.8 `GodrayFilter`(angle 90 **아래 방향**) ↔ pixi-filters 6.1.5 설치본 의미(실측: node_modules/pixi-filters/lib/godray/GodrayFilter.d.ts "a value of 0 is vertical rays, values of 90 or -90 produce horizontal rays" — 헤드리스 Chromium 실측 화면에서도 90은 가로 띠): 수치 90을 그대로 넣으면 문장(아래 방향)과 반대 그림이 된다 → 문장의 의도(아래로 내리는 빛살)를 따르고 이 라이브러리 값으로 angle 0(세로). 새 수치 0(의미 보정), 시각 결과 = 설계 문장 그대로. 발견 근거 2곳: ① D-03A 구현 중 Pixi 8.22.0 설치본 API 실측(ParticleContainer·Particle d.ts) ② design-vision 원문 대조(§2.8 표·§2.10 PT 머리말·PT-spark 행·§2.12 P1·P4 행·§2.13.5 겹침 행·§4.6.8 300~900ms 행·금지 행·§4.9 파티클 행) | design-vision-디자인명세 §2.8·§2.10·§4.6.8·§4.9(주석 추가), `client/js/render/pixi-app.js`(TASK-040)·`board-view.js`(TASK-041)·`particles.js`(TASK-042)·`background.js`(TASK-043)·`holy-fx.js`(TASK-045), 03-B `fx/shake.js`(TASK-051-1 — "화면" 흔들림 대상 = `screenRoot`)·`fx/hitstop.js`, 서신 03 (생성 기준 무효 — 재생성 필요: 이 배치 Doer는 acts-행전 쓰기 권한 없음) | ✅ | ✅ 2026-10-19 W-03A 승인 — 두 증인 확정: ① D-03A 실측 ② W-03A 독립 대조: Pixi 8.22.0 `ParticleContainer.d.ts` 동적 속성 이름 `vertex·position·rotation·uvs·color`·blendMode 컨테이너 단위 ①③ 재확인, PT-mote 무한 순환 = 회수 불가 ② 타당, `pixi-app.js` 구조 letterbox → [screenRoot, holy, screenFx] ④·board-view 보드 컨테이너 ⑤ 확인, `pixi-filters/lib/godray` 셰이더 `d = cos·x + sin·y·aspect`(angle 0 → x 방향으로 변하는 잡음 = 세로 빛살, 세로 옅어짐 `1 − coord.y` = 위에서 아래로 내리는 빛) ⑥ 재확인. 새 수치 0 |
| DCL-008 | 2026-10-19 | Phase 4 / acts-행전 03.uttermost-땅끝 03-B 배치 (D-03B — TASK-050 오디오·TASK-052 자막·TASK-053 Juice 구현 중) | ARCH-005, ARCH-006, FR-039, FR-055, FR-058, FR-059, FR-061 (design-vision §2.12·§4.6.2·§4.6.4·§4.6.8·§4.7.1~§4.7.4) | design-vision에 **수치·자리가 없는 세부 9건 + 문장 충돌 1건 + 라이브러리 시간 의미 1건** — 코드에 값을 넣어야 해서 Doer가 임의로 고르면 안 되는 설계 틈. ① §4.7.4 콤보 반응 "combo ≥ 5: 리드 저역 통과 열림"의 차단 주파수 없음 → 층 4 리드에 lowpass 기본 2,000Hz, combo ≥ 5에서 8,000Hz로 1마디 램프(끊기면 1마디 안 2,000Hz — 원문 "1마디 안에 원래대로") ② "combo ≥ 3: 엇박 열린 하이햇"의 소리 정의 없음 → 같은 하이햇 MetalSynth를 8분 길이·+6dB로 16분 격자 2·6·10·14번째(8분 엇박) ③ §4.7.2 SFX-07 4줄 `NoiseSynth` white 솟음의 음량 없음 → −20dB ④ SFX-12 봉인 층 "쇠사슬 2회" 간격 없음 → 0.3s (음량은 SFX-12 열 −14dB) ⑤ §4.6.4 S-09 "갉는 소리 4번(잡음 대역 통과 2.5kHz, 30ms)" 음량·시각 없음 → −20dB, 메뚜기 비행 600ms 뒤 60ms 간격(칸 부서짐 시각과 같게) ⑥ S-13 "SFX-13을 +30센트 어긋나게" — 어느 천사 화음인지 없음 → 미가엘 화음 [D4, F#4, A4, D5], 세 온음(−600센트) 미끄러짐 0.4s. SFX-13 강세(미가엘 FMSynth D5 0.6s, 가브리엘 E5→0.2s 뒤 B5) 길이·음량 없음 → −14dB ⑦ §4.7.3 AUX-01 "`Tone.Loop` 간격 900ms(위 2줄이면 650ms)" ↔ §4.7.4 위기 층 `Transport.bpm.rampTo(132, 2)`: Tone.Loop의 초 단위 간격은 생성 시 틱으로 바뀌어 Transport 템포를 따르므로 위기 진입(=심장박동 시작) 순간 템포가 112→132로 오르면 실제 간격이 900→764ms로 줄어 원문 ms를 지킬 수 없다 → Transport와 독립인 `Tone.Clock`(주파수 1000/900·1000/650Hz)으로 같은 반복을 구현 (간격 수치 원문 그대로) ⑧ §4.6.8 예수님 자막 "가운데 통로·상단 바 아래 넓은 영역 — 보드 칸을 가리지 않음"의 좌표 없음(가운데 통로 폭 140은 Cinzel 26px 구절이 들어가지 않음) → 가로형 (616, 64) 폭 324(받을 공격 막대 오른쪽 ~ 상대 보드 왼쪽 — 다음 블록·점수 HUD 위, 보드 칸 0), 세로형 (16, 744) 폭 688(내 보드 아래 HUD 위). 포인터 이벤트 없음 ⑨ §2.12 P1 "콤보 중 밝기 +5%/콤보(최대 +30%)" ↔ §4.6.2 C-06·C-07·C-08 "배경 P1 밝기 +10%·+20%·+30%"(콤보 3~4·5~6·≥7): 콤보 3이면 +15% vs +10%로 충돌 → 더 구체적인 이벤트 표(§4.6.2)를 따름: C-05 0 · C-06 +10% · C-07 +20% · C-08 +30% (background.setCombo에 2·4·6을 넘김, C-09 0) ⑩ §4.7.1 버스 구조에 §4.7.4의 "musicBus −12/−6/−18dB"를 걸면 FR-060 음악 음량 슬라이더 값이 덮인다 → musicFilter 뒤 `musicDuck`(Tone.Volume, 기본 0dB) 노드를 하나 두어 연출 낮춤은 musicDuck, 사용자 음량은 musicBus (슬라이더 값 보존 — UC-020 "즉시 반영"과 충돌 0) ⑪ §2.10 HS "엔진 틱과 Pixi 애니메이션 시간을 멈추고 섬광 한 장면만 그린다": 섬광 올림(30~80ms)도 Pixi 시간이라 히트스톱 동안 멈추면 정지 화면에 섬광이 0 → 히트스톱을 같이 거는 이벤트(C-04)의 섬광은 정점에서 시작(올림 생략)하고 내림만 히트스톱 뒤에 흐른다. 발견 근거 2곳: ① D-03B 구현 중 design-vision §4.6·§4.7 원문 대조(수치 열 공란) ② Tone.js 15.1.22 설치본 실측(node_modules/tone/build/esm/event/ToneEvent.js `_loopEnd = this.toTicks(loopEnd)` — Loop interval을 틱으로 저장) | design-vision-디자인명세 §4.6.8·§4.7.1·§4.7.3·§4.7.4(주석 추가), `client/js/audio/mixer.js`·`bgm.js`(TASK-050-1)·`sfx.js`·`sfx-voices.js`·`aux-sfx.js`(TASK-050-2)·`fx/subtitle.js`(TASK-052)·`fx/juice-table-core.js`·`juice-table-powers.js`(TASK-053)·`fx/flash.js`(TASK-051-1), 서신 03 (생성 기준 무효 — 재생성 필요: 이 배치 Doer는 acts-행전 쓰기 권한 없음) | ✅ | ✅ 2026-10-19 W-03B 승인 — ①~⑥ 원문 공란(수치 미지정)을 메우는 최소 값(새 규칙 0), ⑦ `tone/build/esm/event/ToneEvent.js` 43행 `_loopEnd = this.toTicks(loopEnd)` 재확인 → `aux-sfx.js` `Tone.Clock` 1000/900·1000/650Hz 확인, ⑧ 좌표 = 받을 공격 막대~상대 보드 사이 통로(보드 칸 0) 확인, ⑨ 이벤트 표(§4.6.2)가 더 구체 → `background.setCombo(2·4·6)` = +10·20·30% 확인, ⑩ `mixer.js` musicFilter → musicDuck → musicBus 확인(슬라이더 값 보존), ⑪ 정지 화면 섬광 정점 확인 |
| DCL-009 | 2026-10-19 | Phase 4 / acts-행전 03.uttermost-땅끝 03-A·03-B Witness (W-03A·W-03B 브라우저 대조 — D-03B 충격파 관찰 판정 요청 포함) | FR-048, FR-052, FR-053, FR-054, FR-061, NFR-001, C-002, C-003 (design-vision §2.5·§3.5.1·§4.6.1·§4.6.2·§4.6.3·§4.6.5·§4.6.7·§4.6.8) | 설계 **의도**(문장)와 **수치 토큰**(라이브러리 단위로 읽은 값)이 어긋나 화면이 설계 문장과 반대로 보이는 4건 — 원문 수치를 그대로 넣은 구현이 "깨진 화면"을 만든다. ① **충격파 크기:** §4.6.2 C-11·§4.6.13 AC-01·§2.8 z40이 충격파를 "고리"로 서술(줄 삭제의 빛 고리가 퍼짐)하는데, pixi-filters 6.1.5 `ShockwaveFilter`의 amplitude는 **px 단위 변위**이고 셰이더 최대 변위 = 1.25 × amplitude(실측: `lib/shockwave/shockwave.mjs` `powDiff = 1.25·sin(diff·π)·p·amplitude·fade`, 기본값 amplitude 30은 라이브러리 기본값과 같음). C-04 amplitude 30·wavelength 140이면 37px 변위가 140px 띠로 보드 아래 절반 전체를 휘어 **보드 테두리가 항아리 모양**이 된다(D-03A·D-03B·W-03 헤드리스 촬영 재현). 고리로 읽히려면 띠가 좁고 변위가 칸 반 이하여야 한다 → 모든 충격파 amplitude ×⅓(상대 크기 순서 보존), C-04·C-11 wavelength 140→60, J-05 90→40, 미지정(A-01·A-04) 기본 40, C-04·C-11 brightness 1.2(J-05 1.15와 같은 빛 고리): J-05 18→6(감소 6→2) · C-04 30→10(감소 10→3) · C-11 20→7 · A-01 8→3 · A-04 20→7(감소 8→3). 최대 변위 C-04 12.5px ≈ 칸 0.42. ② **충격파 시간:** 모든 충격파를 time 0→0.5s 뒤 해제하던 구현은 C-04(speed 700·radius 420 → 0.6s)를 반지름 350에서 자른다(fade 0.31 — 고리가 뚝 사라짐). 의도 = 고리가 radius에 닿아 fade 0이 될 때까지 → time 0→radius/speed (J-05 260/520 = 원문 0.5s 그대로). 코드 결함이며 새 수치 0 ③ **빛기둥 GLW-holy:** §4.6.5 "가운데 #FFFFFF → 가장자리 투명" 단면에 Glow(outerStrength 5)+Bloom(threshold 0.45)을 그대로 걸면 기둥이 불투명한 흰 막대가 되고, 같은 행의 "기둥 위 천사 그림"(#DCE8FF~#FFF8E7 날개)이 흰 위의 흰으로 사라진다(촬영 확인) — 문장 의도(빛나는 기둥 + 보이는 천사)와 토큰 문자 해석이 충돌 → 빛기둥 = 시작 시 구운 텍스처 1장(가산 혼합 add, 단면 3겹: 바깥 번짐 폭 2.2배 최대 0.16 · 몸체 --g-holy 최대 0.5 · 흰 심 폭 0.14배 0.9, 아래 40% 구간 투명으로 옅어짐 — 실시간 필터 0, NFR-001), GLW-holy의 Glow는 천사 그림에(§2.13.2 wings_light 행이 이미 천사에 GLW-holy를 지정), Bloom은 예수님 실루엣(bloomScale 2.0)에만. 예수님 빛기둥의 `GodrayFilter`는 필터 영역 사각형 전체에 빛살 안개(알파 1)를 더하므로 기둥 모양 알파 마스크 안에만 남긴다(투명도 0에서도 회색 사각형이 보이던 결함) ④ **자막 높이:** §3.5.1 내 자막 영역 300×120인데 구절 3줄(C-003 원문 전체)을 18px로 쓰면 긴 구절(Jude 1:9 등)이 300px 넘게 자라 보드 위쪽 2/3를 2초 넘게 가린다 → 글을 자르지 않고(C-003) 배율만 낮춰 120 안에 맞춤(최저 0.7배 — 18px → 12.6px, 그래도 넘치면 그 크기로 표시). 새 규칙 0, 영역 수치 원문 그대로. 발견 근거 2곳: ① D-03B 관찰(history 19:14:34 "충격파 관찰 — W-03A/W-03B 판정 요청") ② W-03 헤드리스 촬영 대조(scratch shots-W03AB: 항아리 보드·흰 막대 기둥·회색 사각 빛살·보드 덮는 자막) + pixi-filters 6.1.5 셰이더 원문 | design-vision-디자인명세 §2.5 GLW-holy 행·§3.5.1 자막 행·§4.6.1 J-05·§4.6.2 C-04·C-11·§4.6.3 A-01·A-04·§4.6.5 공통·§4.6.8 300~900ms 행(주석·취소선 보존), `client/js/render/filters.js`(TASK-042 — 시간 = radius/speed, 기본 wavelength 40)·`holy-fx.js`(TASK-045 — 구운 빛기둥·천사 Glow·Godray 마스크), `client/js/fx/juice-table-core.js`·`juice-table-flow.js`(TASK-053 — 충격파 수치)·`subtitle.js`(TASK-052 — 영역 맞춤), 서신 03(W-03 재생성) | ✅ | ✅ 2026-10-19 W-03A·W-03B 개정·구현 (Spec-First: 이 행 → design-vision → 코드). 두 증인: ① D-03B 관찰·판정 요청 ② W-03 독립 촬영·셰이더 원문 대조. 재촬영 판독 shots-W03AB(테트리스 고리 프레임·천사·스킬·예수님) |
| DCL-010 | 2026-10-19 | Phase 4 / acts-행전 03.uttermost-땅끝 03-C Doer (D-03C 실제 브라우저 2인 대전·봇·연습 E2E 중 발견) | FR-073, NFR-004, FR-011, FR-047, SCR-005 (devguide §1.3 매니페스트, design-vision §3.5.4 세로형 연습·§4.6.12 X-06) | 03-C 구현에 필요한 정경 공백 3건 — 원문 수치·문장은 바꾸지 않고 비어 있던 자리만 채운다. ① **빌드 명령 부재:** NFR-004 측정 방법(api-gate §5 "빌드 산출물 문자열 검사로 확인")과 03-D TASK-071이 번들 검사를 하려면 정적 빌드가 있어야 하는데 devguide §1.3 매니페스트에 `build`가 없다 → 루트 `build` = `npm run build -w client`, `client` `build` = `vite build`(`client/dist/`, 이미 `.gitignore`의 `dist/`). 새 의존성 0, 버전 고정표 불변 ② **세로형 연습 개인 기록 패널 좌표 충돌:** design-vision §3.5.4 세로형 문장 "상대 영역 자리에 개인 기록 패널(480,96, 232×240)"이 같은 세로형 §3.5.2 다음 블록 칸(480,96, 80×336)과 겹친다(한 자리에 두 요소) → 패널을 다음 블록 칸 바로 아래 (480,440)에 둔다(크기·내용 원문 그대로, 보드·제스처 패드와 겹침 0). 세로형 연습의 점수는 패널의 점수 행 ③ **X-06 "해금 첫 등장" 판정 기준:** §4.6.12 X-06은 "단계 해금 첫 등장" 안내를 요구하지만 "첫"의 기준(계정 평생 1회는 저장 금지 — N-04·data-ark §8.3 localStorage 키 1개뿐)이 없다 → 한 경기 안에서 `start.stage` 플래그가 새로 참이 된 라운드, 그리고 경기 첫 라운드는 API-002 `roundsPlayed` ≤ `rules.specials.unlockRounds[kind]`(방금 해금된 경계)일 때만 표시. 새 저장소·새 수치 0. 발견 근거 2곳: ① D-03C `npm run build` 요구(인계 지시)·devguide §1.3 표 대조 ② D-03C 세로형 좌표표(§3.5.2 다음 블록 행 ↔ §3.5.4 세로형 문장) 대조·SCR-005 X-06 구현 | devguide-commandment §1.3 표(행 2개 추가), design-vision §3.5.4 세로형 문장(취소선 + 주석), 루트·`client/package.json` scripts, `client/styles/battle.css`(pp 패널 좌표), `client/js/game/server-events.js`(X-06 판정), 서신 03(design-vision은 포인터 발췌라 발췌 행 변경 0 — 재생성 필요 여부 W-03C 판정) | ✅ | 🔄 D-03C 개정·구현 (Spec-First: 이 행 → devguide·design-vision → 코드). W-03C 확정 대기 |
| DCL-011 | 2026-10-19 | Phase 4 / acts-행전 03.uttermost-땅끝 03-D Doer (D-03D — TASK-071 봉인의 율법 점검 중 실측) | NFR-004, NFR-003, FR-073, TBL-017, TBL-001 (devguide §1.3 `client/vite.config.js` 고정 항목, architecture §10 제2·7계명, api-gate §5 비밀값·서버 권한) | devguide §1.3 고정 항목 `server.fs.allow: ['..']`(content/ 상대 import)는 `fruit-열매/` 전체를 Vite 개발 서버의 `/@fs/` 파일 제공 범위에 넣는다. Vite 기본 차단 목록(`.env`·`.env.*`·인증서·`.npmrc`·`.git`)에는 이 프로젝트의 비밀 파일이 없어 실측(D-03D, `npx vite` + curl): ① `GET /@fs/<절대경로>/worker/.dev.vars` → **200 + 파일 원문**(Supabase service role 키 — 봉인 제2계명·NFR-004 "Worker 환경변수에만") ② `/@fs/.../content/quiz.json` → 200(정답 `answer` 포함 — api-gate §5 "말씀 대결 판정은 서버만", TBL-017 클라이언트 비노출) ③ `/@fs/.../worker/.wrangler/state/v3/do/...sqlite` → 200(로컬 원장 — token_hash·닉네임, 봉인 제1·7계명). 개발 서버는 localhost에만 열리지만, 정경은 비밀값의 위치를 Worker 환경으로 한정하므로 설계 틈이다. 개정: `client/vite.config.js`에 `server.fs.deny` = Vite 8.3.2 기본 6개(배열 지정 시 기본값을 대체하므로 그대로 다시 적음) + `**/.dev.vars`(값 없는 `.dev.vars.example`은 저장소 공개 파일이라 차단하지 않음) · `**/.wrangler/**` · `**/content/quiz.json`. `server.fs.allow: ['..']`는 그대로(content/·`node_modules/@fontsource` 글꼴 제공에 필요). 새 의존성·새 수치 0, 빌드 산출물 영향 0(dev 서버 전용 설정). 발견 근거: D-03D 실측 curl 3건(200) → 개정 후 403 3건, 정상 경로(`/`, content JSON import, 글꼴) 200 | devguide §1.3 `client/vite.config.js` 고정 항목(문장 추가), `client/vite.config.js`, `bible-성경/04/security-seal-봉인.md` SEC-001~003, 서신 03(봉인 발췌 행 변경 0 — 재생성 필요 여부 W-03D 판정) | ✅ | 🔄 D-03D 개정·구현 (Spec-First: 이 행 → devguide → 코드). W-03D 확정 대기 |

---

## 6. 언약 계수 (Census) 실행 기록

| 항목 | Phase 1 | Phase 2 | Phase 3 |
|:---|:---|:---|:---|
| 실행 명령 | `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --log` | `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 2 --log` | `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 3 --log` |
| 실행 시각 | 2026-10-19 14:17:46 (UTC) | 2026-10-19 14:44:47 (UTC) | 2026-10-19 15:16:40 (UTC) |
| 실계수 고유 ID | 116 (✅ 0 / 🔄 0 / ⬜ 116 / ❌ 0) | 116 (✅ 0 / 🔄 116 / ⬜ 0 / ❌ 0) | 116 (✅ 0 / 🔄 116 / ⬜ 0 / ❌ 0) |
| 문서 기재값 대조 | 5항목 전부 일치 | 전체 116 = 116, 완전 0 = 0, 부분 116 = 116, 미추적 0 = 0, 커버리지 0.0% = 0.0% — 5항목 전부 일치 | 5항목 전부 일치 (Phase 3은 매트릭스 수치를 바꾸지 않음) |
| spec-tablet 원문 대조 | 116개 전부 등재 (미등재 0건) | 116개 전부 등재 (미등재 0건) | 116개 전부 등재 (미등재 0건) |
| 중복 등재 | 0건 | 0건 | 0건 (§7 확인표는 계수 대상 표가 아님 — 헤더에 REQ-ID·상태 열 없음) |
| Phase 열 충족 | — | ARCH-ID 미기재 0건, API-ID 미기재 0건, TBL-ID 미기재 0건 | Phase 3 필수 열 없음(계수기 규칙) — 화면 연결은 §7에서 116/116 확인(연결 105 · N/A 11) |
| 최종 판정 | **✅ IRONCLAD** (exit 0) | **✅ IRONCLAD** (exit 0) — 기록의 서 `fruit-열매/history/2026-10-19.md`에 자동 기록됨 | **✅ IRONCLAD** (exit 0) — 기록의 서에 자동 기록됨 |

> AI의 자기신고가 아니라 계수기 출력이 증거다 (UTIL-census-언약계수.md). Phase 4·5·6·7 완료 직전에 `--phase N`으로 다시 계수한다.
> **Phase 4 계획 시점 계수 (2026-10-19 15:37:55 UTC):** `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --log` → **✅ IRONCLAD** (exit 0) — 실계수 116 (🔄 116), 문서 기재값 5항목 일치, spec-tablet ID 116개 전부 등재. §8 태스크 연결 표 추가 후에도 매트릭스 파싱·수치 불변 확인. `--phase 4`(코드 모듈 열 충족)는 구현 완료 후 TASK-072에서 실행한다.
> **Phase 4 · 00.jerusalem-예루살렘 지역 완료 계수 (2026-10-19 16:11:29 UTC, W-00):** `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --log` → **✅ IRONCLAD** (exit 0) — 실계수 116 (🔄 116), 문서 기재값 5항목 일치, spec-tablet 116 전부 등재. (§1 코드 모듈 열·✅ 전환은 TASK-072 — 지역 완료는 REQ 행 상태를 바꾸지 않는다)
> **Phase 4 · 01.judaea-유대 지역 완료 계수 (2026-10-19 16:57:49 UTC, W-01):** `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --log` → **✅ IRONCLAD** (exit 0) — 실계수 116 (🔄 116), 문서 기재값 5항목 일치, spec-tablet ID 116개 전부 등재. DCL-004로 §1 FR-015·FR-035 ARCH 열과 §8 연결이 바뀐 뒤의 계수다.

> **Phase 4 · 02.samaria-사마리아 지역 완료 계수 (2026-10-19 17:52:09 UTC, W-02):** `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --log` → **✅ IRONCLAD** (exit 0) — 실계수 116 (🔄 116), spec-tablet ID 116개 전부 등재. DCL-005·DCL-006은 RTM §1 ID 연결을 바꾸지 않는다(TBL-018 수치 행만).

> **Phase 4 구현 마감 계수 (2026-10-19 22:04:21 UTC, D-03D — TASK-072):** `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 4 --log` → **✅ IRONCLAD** (exit 0) — 실계수 116 (🔄 116), 문서 기재값 5항목 일치, spec-tablet ID 116개 전부 등재, **Phase 4 심판 '코드 모듈' 열 미기재 0건**. 기록의 서에 자동 기록됨. (W-03D 짝 검증 후 재계수)

---

## 7. Phase 3 화면 연결 확인 (언약추적 갱신 규칙 "Phase 3 완료 시 화면 관련 항목 연결 확인")

> 확인일 2026-10-19 · 근거: [`screen-vision-화면설계.md`](../03.design-order-질서/screen-vision-화면설계.md) §1 화면 목록·§6 UC-화면 중복 해체 검증, [`design-vision-디자인명세.md`](../03.design-order-질서/design-vision-디자인명세.md). 이 표는 §1 매트릭스의 열을 바꾸지 않는 **확인 기록**이다 — 매트릭스의 상태(🔄)·열 구성은 그대로이며(화면 열은 템플릿에 없음), 계수기는 §1 표만 센다. `N/A`는 화면이 없는 서버·개발·테스트 항목이며 괄호 안에 사유를 적는다.

| ID | 연결 화면 (SCR) | 판정 |
|:---|:---|:---:|
| REQ-001 | SCR-004, SCR-005, SCR-006 | ✅ 연결 |
| REQ-002 | SCR-001 | ✅ 연결 |
| REQ-003 | SCR-003, SCR-005 | ✅ 연결 |
| REQ-004 | SCR-002, SCR-004 | ✅ 연결 |
| REQ-005 | SCR-002, SCR-004, SCR-005 | ✅ 연결 |
| REQ-006 | SCR-002, SCR-004, SCR-005, SCR-006 | ✅ 연결 |
| REQ-007 | SCR-005 | ✅ 연결 |
| REQ-008 | SCR-005 | ✅ 연결 |
| REQ-009 | SCR-005 | ✅ 연결 |
| REQ-010 | SCR-005, SCR-006 | ✅ 연결 |
| REQ-011 | SCR-005 | ✅ 연결 |
| REQ-012 | SCR-005 | ✅ 연결 |
| REQ-013 | SCR-005, SCR-006, SCR-009 (아트·폰트·BGM은 SCR-001~SCR-009) | ✅ 연결 |
| REQ-014 | SCR-006, SCR-007 | ✅ 연결 |
| REQ-015 | SCR-006, SCR-008 | ✅ 연결 |
| REQ-016 | N/A (개발자 터미널 실행 — UC-021, 화면 없음) | N/A 판정 |
| REQ-017 | N/A (테스트 실행 — UC-022, 화면 없음 / E2E가 SCR-005를 관찰) | N/A 판정 |
| FR-001 | SCR-005 | ✅ 연결 |
| FR-002 | SCR-005 | ✅ 연결 |
| FR-003 | SCR-005 | ✅ 연결 |
| FR-004 | SCR-005 | ✅ 연결 |
| FR-005 | SCR-004, SCR-005 | ✅ 연결 |
| FR-006 | SCR-005 | ✅ 연결 |
| FR-007 | SCR-005, SCR-006 | ✅ 연결 |
| FR-008 | SCR-004, SCR-005 | ✅ 연결 |
| FR-009 | SCR-005, SCR-006 | ✅ 연결 |
| FR-010 | SCR-005 | ✅ 연결 |
| FR-011 | SCR-005 | ✅ 연결 |
| FR-012 | SCR-001 | ✅ 연결 |
| FR-013 | SCR-003 | ✅ 연결 |
| FR-014 | SCR-005 (효과 설명은 SCR-003) | ✅ 연결 |
| FR-015 | SCR-005 (효과 설명은 SCR-003) | ✅ 연결 |
| FR-016 | SCR-005 (효과 설명은 SCR-003) | ✅ 연결 |
| FR-017 | SCR-005 (효과 설명은 SCR-003) | ✅ 연결 |
| FR-018 | SCR-004 | ✅ 연결 |
| FR-019 | SCR-002, SCR-004 | ✅ 연결 |
| FR-020 | SCR-004 | ✅ 연결 |
| FR-021 | SCR-002, SCR-004, SCR-005 | ✅ 연결 |
| FR-022 | SCR-005 | ✅ 연결 |
| FR-023 | SCR-002, SCR-005, SCR-006 | ✅ 연결 |
| FR-024 | SCR-005 | ✅ 연결 |
| FR-025 | SCR-005 | ✅ 연결 |
| FR-026 | SCR-005 | ✅ 연결 |
| FR-027 | SCR-005 | ✅ 연결 |
| FR-028 | SCR-005 | ✅ 연결 |
| FR-029 | SCR-005 | ✅ 연결 |
| FR-030 | SCR-005 | ✅ 연결 |
| FR-031 | SCR-005 | ✅ 연결 |
| FR-032 | SCR-005 (CLEAR_REJECTED 토스트) | ✅ 연결 |
| FR-033 | SCR-005 | ✅ 연결 |
| FR-034 | SCR-005 | ✅ 연결 |
| FR-035 | SCR-005 | ✅ 연결 |
| FR-036 | SCR-005 | ✅ 연결 |
| FR-037 | SCR-005 | ✅ 연결 |
| FR-038 | SCR-005 | ✅ 연결 |
| FR-039 | SCR-005, SCR-006 (말씀 카드 John 16:33) | ✅ 연결 |
| FR-040 | SCR-005 | ✅ 연결 |
| FR-041 | SCR-005 | ✅ 연결 |
| FR-042 | SCR-005 | ✅ 연결 |
| FR-043 | SCR-005 | ✅ 연결 |
| FR-044 | SCR-005 | ✅ 연결 |
| FR-045 | SCR-005 | ✅ 연결 |
| FR-046 | SCR-005 | ✅ 연결 |
| FR-047 | SCR-005 | ✅ 연결 |
| FR-048 | SCR-001~SCR-009 (대전 SCR-005 중심) | ✅ 연결 |
| FR-049 | SCR-003, SCR-005 | ✅ 연결 |
| FR-050 | SCR-001~SCR-009 | ✅ 연결 |
| FR-051 | SCR-005 | ✅ 연결 |
| FR-052 | SCR-005 | ✅ 연결 |
| FR-053 | SCR-005 | ✅ 연결 |
| FR-054 | SCR-005 | ✅ 연결 |
| FR-055 | SCR-005 | ✅ 연결 |
| FR-056 | SCR-005, SCR-006 | ✅ 연결 |
| FR-057 | SCR-009 | ✅ 연결 |
| FR-058 | SCR-005, SCR-009 | ✅ 연결 |
| FR-059 | SCR-001~SCR-009 (BGM-1 / BGM-2) | ✅ 연결 |
| FR-060 | SCR-009 | ✅ 연결 |
| FR-061 | SCR-005 | ✅ 연결 |
| FR-062 | SCR-005 | ✅ 연결 |
| FR-063 | SCR-006 | ✅ 연결 |
| FR-064 | SCR-005 | ✅ 연결 |
| FR-065 | SCR-006 | ✅ 연결 |
| FR-066 | SCR-006 | ✅ 연결 |
| FR-067 | SCR-006 (성장·해금·은혜 표시의 원천 — 저장은 서버) | ✅ 연결 |
| FR-068 | SCR-006 (saved 표시) | ✅ 연결 |
| FR-069 | SCR-007 | ✅ 연결 |
| FR-070 | SCR-006, SCR-008 | ✅ 연결 |
| FR-071 | SCR-008 | ✅ 연결 |
| FR-072 | N/A (서버 저장소 전환 — 화면 없음, 저장 모드 표시는 N-06 미승격) | N/A 판정 |
| FR-073 | N/A (개발 실행 — 화면 없음) | N/A 판정 |
| FR-074 | SCR-003, SCR-005, SCR-006 (콘텐츠 표시) | ✅ 연결 |
| FR-075 | N/A (단위 테스트 — 화면 없음) | N/A 판정 |
| FR-076 | N/A (콘텐츠 검사 — 화면 없음) | N/A 판정 |
| FR-077 | SCR-005 (E2E 관찰 대상) | ✅ 연결 |
| FR-078 | SCR-001~SCR-009 | ✅ 연결 |
| NFR-001 | SCR-005 | ✅ 연결 |
| NFR-002 | SCR-005 | ✅ 연결 |
| NFR-003 | SCR-001 (닉네임 입력 제한), SCR-004 (코드 입력 제한) | ✅ 연결 |
| NFR-004 | N/A (서버 비밀값 — 화면 없음) | N/A 판정 |
| NFR-005 | SCR-001~SCR-009 (번들 폰트·코드 그래픽·합성음) | ✅ 연결 |
| NFR-006 | SCR-005, SCR-006 (design-vision §7) | ✅ 연결 |
| NFR-007 | N/A (의존성 고정) | N/A 판정 |
| NFR-008 | SCR-001 (닉네임만 입력) | ✅ 연결 |
| C-001 | SCR-001~SCR-009 (상점·결제 요소 0개) | ✅ 연결 |
| C-002 | SCR-005, SCR-006 | ✅ 연결 |
| C-003 | SCR-001, SCR-002, SCR-003, SCR-005, SCR-006 (구절 3줄 표기) | ✅ 연결 |
| C-004 | N/A (실행 환경) | N/A 판정 |
| C-005 | SCR-001~SCR-009 | ✅ 연결 |
| C-006 | SCR-004, SCR-005 (브라우저 WebSocket) | ✅ 연결 |
| C-007 | SCR-001~SCR-009 | ✅ 연결 |
| C-008 | SCR-003 (위인 4명만) | ✅ 연결 |
| C-009 | SCR-005 (리액션 3종만, 글 입력칸 없음) | ✅ 연결 |
| C-010 | SCR-003, SCR-005 | ✅ 연결 |
| C-011 | SCR-005 | ✅ 연결 |
| C-012 | N/A (폴더 구조) | N/A 판정 |
| C-013 | N/A (.gitignore 정책) | N/A 판정 |

> 집계: 116개 ID 중 화면 연결 105건 · N/A 판정 11건 (사유 명시) · 미확인 0건. 화면 9개 전부가 1개 이상의 REQ에 연결되고(screen-vision §1), REQ 17건 중 화면이 있는 15건은 전부 SCR에 연결된다.

---

## 8. Phase 4 태스크 연결 (task-wall ↔ REQ — task-wall 정경화 조건 "RTM에 태스크 ↔ REQ 연결 반영")

> **갱신:** 2026-10-19 Phase 4 계획(SKILL-04 1단계) — [`task-wall-성벽.md`](../04.development-repentance-회개/task-wall-성벽.md)의 실행 단위 64개를 116 ID에 연결했다. 미연결 0건(스크립트 대조).
> **§1 매트릭스와의 관계:** §1의 `코드 모듈` 열은 언약추적 갱신 규칙("Phase 4 완료 시 코드 모듈 열 채움")에 따라 **구현이 끝난 뒤** TASK-072가 실제 파일 경로로 채운다. 계획 단계에서 그 열에 TASK-ID를 미리 적으면 `census --phase 4`가 코드 없이 통과하는 거짓 증거가 되므로, 계획 연결은 이 절에만 적는다. 이 표는 계수 대상 표가 아니다(머리글에 REQ-ID·상태 열 없음). 상태의 원본은 task-wall이다.
> **지역 열 약어:** 00 = 00.jerusalem-예루살렘, 01 = 01.judaea-유대, 02 = 02.samaria-사마리아, 03 = 03.uttermost-땅끝 (그룹 03-A·03-B·03-C·03-D는 task-wall §1.1).

| ID | 요구사항 요약 | 연결 TASK-ID (task-wall 실행 단위) | 지역 |
|:---|:---|:---|:---:|
| REQ-001 | 사용자가 브라우저에서 KJV 성경 기반 실시간 2인 대전 테트리스를 플레이한다 | TASK-008, TASK-010-1, TASK-010-2, TASK-010-3, TASK-010-4, TASK-018, TASK-030, TASK-033, TASK-041, TASK-062-2, TASK-063, TASK-065, TASK-066, TASK-067-1 | 00, 01, 02, 03 |
| REQ-002 | 사용자는 게스트 닉네임으로 입장한다 | TASK-020-1, TASK-020-2, TASK-020-3, TASK-031, TASK-032, TASK-061, TASK-062-1, TASK-062-2, TASK-064-1, TASK-064-2 | 01, 02, 03 |
| REQ-003 | 사용자는 위인 4명(다윗·솔로몬·베드로·바울) 중 한 명을 고른다 | TASK-005, TASK-011, TASK-015-1, TASK-015-2, TASK-019, TASK-044-1, TASK-044-2, TASK-044-3, TASK-064-1, TASK-064-2 | 00, 01, 03 |
| REQ-004 | 사용자는 대전 모드(사람 대 사람, 랜덤 매칭 + 친구 초대 코드)를 고를 수 있다 | TASK-032, TASK-062-1, TASK-062-2, TASK-064-1, TASK-064-2 | 02, 03 |
| REQ-005 | 사용자는 AI 봇 대전(쉬움·보통·어려움)을 고를 수 있다 | TASK-008, TASK-019, TASK-032, TASK-033, TASK-062-2, TASK-064-1, TASK-064-2, TASK-066 | 00, 01, 02, 03 |
| REQ-006 | 사용자는 연습 모드를 고를 수 있다 | TASK-018, TASK-032, TASK-062-2, TASK-064-1, TASK-064-2, TASK-066 | 01, 02, 03 |
| REQ-007 | 줄을 지우면 상대에게 쓰레기 줄과 악한 영(14종)이 공격으로 간다. 서버가 공격을 판정한다 | TASK-005, TASK-008, TASK-011, TASK-012, TASK-013, TASK-014, TASK-030, TASK-033, TASK-044-3, TASK-045, TASK-051-2, TASK-065, TASK-066 | 00, 01, 02, 03 |
| REQ-008 | 사용자는 믿음 게이지로 위인 스킬과 천사 5종을 쓴다 | TASK-005, TASK-008, TASK-011, TASK-013, TASK-015-1, TASK-015-2, TASK-019, TASK-033, TASK-044-3, TASK-045, TASK-065, TASK-066 | 00, 01, 02, 03 |
| REQ-009 | 사용자는 전신갑주 6종을 얻어 쓴다 | TASK-005, TASK-010-1, TASK-010-2, TASK-010-3, TASK-010-4, TASK-011, TASK-015-1, TASK-015-2, TASK-016, TASK-033, TASK-044-2, TASK-065, TASK-066 | 00, 01, 02, 03 |
| REQ-010 | 예수님 "세상을 이기었노라" 이벤트(첨부 A §3.2 원칙 그대로)가 경기당 1회 일어날 수 있다 | TASK-008, TASK-011, TASK-015-1, TASK-015-2, TASK-044-3, TASK-045, TASK-065, TASK-066 | 00, 01, 03 |
| REQ-011 | 말씀 대결(성경 퀴즈, 60문항 이상)이 있다 | TASK-006, TASK-007, TASK-017, TASK-033, TASK-052, TASK-065, TASK-066 | 00, 01, 02, 03 |
| REQ-012 | 특수 블록 3종(말씀·여리고 나팔·만나)이 있다 | TASK-008, TASK-010-1, TASK-010-2, TASK-010-3, TASK-010-4, TASK-011, TASK-016, TASK-020-3, TASK-065, TASK-066 | 00, 01, 03 |
| REQ-013 | 디자인·액션·사운드·재미 요구사항(첨부 A §5 전체)은 필수다. 첨부 B의 체크리스트를 충족해야 한다 | TASK-008, TASK-013, TASK-018, TASK-020-1, TASK-020-2, TASK-020-3, TASK-033, TASK-040, TASK-041, TASK-042, TASK-043, TASK-044-1, TASK-044-2, TASK-044-3, TASK-045, TASK-050-1, TASK-050-2, TASK-051-1, TASK-051-2, TASK-052, TASK-053, TASK-060-1, TASK-060-2, TASK-061, TASK-066, TASK-067-1, TASK-067-2 | 00, 01, 02, 03 |
| REQ-014 | 경기 결과(전적)가 저장되고 조회된다 | TASK-002, TASK-003, TASK-018, TASK-020-1, TASK-020-2, TASK-020-3, TASK-031, TASK-032, TASK-062-1, TASK-067-1, TASK-067-2 | 00, 01, 02, 03 |
| REQ-015 | 랭킹(Elo)이 저장되고 조회된다 | TASK-002, TASK-003, TASK-008, TASK-020-1, TASK-020-2, TASK-020-3, TASK-031, TASK-032, TASK-062-1, TASK-067-1, TASK-067-2 | 00, 01, 02, 03 |
| REQ-016 | 외부 서비스 키 없이 `npm install && npm run dev` 한 번으로 전부 동작해야 한다. Supabase는 환경변수가 있을 때만 쓰는 어댑터로 둔다 | TASK-001-1, TASK-001-2, TASK-001-3, TASK-001-4, TASK-001-5, TASK-002, TASK-003, TASK-004, TASK-009, TASK-034, TASK-070, TASK-071 | 00, 02, 03 |
| REQ-017 | 테스트: Vitest(단위) + Playwright(브라우저 2개 E2E) | TASK-001-1, TASK-001-2, TASK-001-3, TASK-001-4, TASK-001-5, TASK-009, TASK-070, TASK-072 | 00, 03 |
| FR-001 | 보드·테트로미노·7-bag | TASK-010-1, TASK-010-4, TASK-041 | 01, 03 |
| FR-002 | SRS 회전 | TASK-010-1 | 01 |
| FR-003 | 이동·드롭·홀드·고스트 | TASK-010-2, TASK-010-4, TASK-041, TASK-063 | 01, 03 |
| FR-004 | 줄 삭제·판정·점수 | TASK-008, TASK-010-2, TASK-010-4 | 00, 01 |
| FR-005 | 같은 시드 시작 | TASK-010-1, TASK-018, TASK-033, TASK-065 | 01, 02, 03 |
| FR-006 | 상대 보드 실시간 표시 | TASK-011, TASK-033, TASK-041, TASK-065, TASK-066 | 01, 02, 03 |
| FR-007 | 승리 조건 | TASK-018, TASK-066, TASK-067-1 | 01, 03 |
| FR-008 | 실시간 통신 프로토콜 | TASK-030, TASK-032, TASK-033, TASK-034, TASK-062-1, TASK-062-2, TASK-065 | 02, 03 |
| FR-009 | 상대 이탈 처리 | TASK-018, TASK-033, TASK-066 | 01, 02, 03 |
| FR-010 | 난이도 곡선 | TASK-008, TASK-010-3, TASK-010-4 | 00, 01 |
| FR-011 | 조작 입력 | TASK-040, TASK-060-2, TASK-063 | 03 |
| FR-012 | 게스트 닉네임 입장 | TASK-003, TASK-020-1, TASK-031, TASK-062-1, TASK-062-2, TASK-064-1 | 00, 01, 02, 03 |
| FR-013 | 캐릭터 선택 화면 | TASK-005, TASK-044-1, TASK-044-2, TASK-044-3, TASK-064-2 | 00, 03 |
| FR-014 | 다윗 — 물맷돌 | TASK-005, TASK-011, TASK-015-1, TASK-051-2 | 00, 01, 03 |
| FR-015 | 솔로몬 — 지혜로운 마음 | TASK-005, TASK-011, TASK-015-1, TASK-019 | 00, 01 |
| FR-016 | 베드로 — 이 반석 위에 | TASK-005, TASK-011, TASK-014, TASK-015-1 | 00, 01 |
| FR-017 | 바울 — 옥문이 열리다 | TASK-005, TASK-011, TASK-015-1 | 00, 01 |
| FR-018 | 랜덤 매칭 | TASK-020-1, TASK-032, TASK-064-2 | 01, 02, 03 |
| FR-019 | 친구 초대 코드 | TASK-008, TASK-032, TASK-064-1, TASK-064-2 | 00, 02, 03 |
| FR-020 | 대기 취소·대기열 정리 | TASK-032, TASK-062-2, TASK-064-2 | 02, 03 |
| FR-021 | AI 봇 대전 | TASK-019, TASK-032, TASK-064-2 | 01, 02, 03 |
| FR-022 | 봇의 말씀 대결 응답 | TASK-017, TASK-019 | 01 |
| FR-023 | 연습 모드 | TASK-018, TASK-032, TASK-064-2, TASK-066 | 01, 02, 03 |
| FR-024 | 공격력 계산 | TASK-012 | 01 |
| FR-025 | 쓰레기 줄 삽입·상쇄 | TASK-010-2, TASK-011, TASK-014 | 01 |
| FR-026 | 악한 영 소환 결정 | TASK-005, TASK-012 | 00, 01 |
| FR-027 | 악한 영 1~2등급 효과 | TASK-005, TASK-011, TASK-045 | 00, 01, 03 |
| FR-028 | 악한 영 3등급 효과 | TASK-005, TASK-011, TASK-013, TASK-045 | 00, 01, 03 |
| FR-029 | 악한 영 4등급 효과 | TASK-005, TASK-010-2, TASK-011, TASK-045 | 00, 01, 03 |
| FR-030 | 악한 영 5등급·보스 효과 | TASK-005, TASK-011, TASK-045 | 00, 01, 03 |
| FR-031 | 방해 상한 규칙 | TASK-008, TASK-011, TASK-013 | 00, 01 |
| FR-032 | 서버 진행 검증 | TASK-016, TASK-030, TASK-033 | 01, 02 |
| FR-033 | 믿음 게이지 | TASK-013, TASK-066 | 01, 03 |
| FR-034 | 위인 스킬 발동 | TASK-015-1, TASK-065, TASK-066 | 01, 03 |
| FR-035 | 천사 5종 소환 | TASK-005, TASK-011, TASK-015-2, TASK-019, TASK-044-3 | 00, 01, 03 |
| FR-036 | 갑주 출현·획득 | TASK-010-3, TASK-015-2, TASK-016 | 01 |
| FR-037 | 갑주 6종 사용 | TASK-005, TASK-011, TASK-015-2, TASK-044-2 | 00, 01, 03 |
| FR-038 | 상성표 | TASK-005, TASK-009, TASK-015-2 | 00, 01 |
| FR-039 | "세상을 이기었노라" 이벤트 | TASK-011, TASK-015-1, TASK-044-3, TASK-045 | 01, 03 |
| FR-040 | 말씀 대결 발생 | TASK-017, TASK-066 | 01, 03 |
| FR-041 | 진행·판정·보상 | TASK-007, TASK-017, TASK-066 | 00, 01, 03 |
| FR-042 | 니어미스 연출 | TASK-017, TASK-052, TASK-066 | 01, 03 |
| FR-043 | 퀴즈 콘텐츠 | TASK-006, TASK-007, TASK-017 | 00, 01 |
| FR-044 | 말씀 블록 | TASK-010-3, TASK-016 | 01 |
| FR-045 | 여리고 나팔 블록 | TASK-010-3, TASK-011, TASK-016 | 01 |
| FR-046 | 만나 블록 | TASK-010-3, TASK-011, TASK-016 | 01 |
| FR-047 | 단계적 해금 | TASK-010-3, TASK-016, TASK-020-3 | 01 |
| FR-048 | 아트 방향 | TASK-040, TASK-041, TASK-043, TASK-060-1, TASK-060-2 | 03 |
| FR-049 | 존재 시각 표현 | TASK-044-1, TASK-044-2, TASK-044-3, TASK-045 | 03 |
| FR-050 | 폰트 번들 | TASK-060-1, TASK-060-2, TASK-061 | 03 |
| FR-051 | 조작 연출 | TASK-041, TASK-051-1, TASK-053 | 03 |
| FR-052 | 삭제 연출 | TASK-042, TASK-051-1, TASK-051-2, TASK-053 | 03 |
| FR-053 | 공격 연출 | TASK-042, TASK-043, TASK-051-1, TASK-051-2, TASK-053 | 03 |
| FR-054 | 영·천사·스킬 등장 연출 | TASK-045, TASK-052, TASK-053 | 03 |
| FR-055 | 위기 연출·위험선 | TASK-010-2, TASK-041, TASK-043, TASK-050-1, TASK-050-2, TASK-053 | 01, 03 |
| FR-056 | 승리·패배 연출 | TASK-042, TASK-051-1, TASK-051-2, TASK-053, TASK-067-1 | 03 |
| FR-057 | 연출 세기 옵션 | TASK-051-1, TASK-060-2, TASK-062-1, TASK-063, TASK-067-2 | 03 |
| FR-058 | 효과음 | TASK-050-1, TASK-050-2 | 03 |
| FR-059 | 배경음악 | TASK-050-1, TASK-050-2 | 03 |
| FR-060 | 음량 조절 | TASK-050-1, TASK-050-2, TASK-062-1, TASK-067-2 | 03 |
| FR-061 | 타격 피드백 동기화 | TASK-050-2, TASK-051-1, TASK-051-2, TASK-052, TASK-053 | 03 |
| FR-062 | 실력 보정 "은혜(Grace)" | TASK-008, TASK-011, TASK-013, TASK-014, TASK-020-3, TASK-044-1, TASK-052 | 00, 01, 03 |
| FR-063 | 말씀 카드 | TASK-018, TASK-052, TASK-067-1 | 01, 03 |
| FR-064 | 감정 표현 리액션 | TASK-008, TASK-033, TASK-052, TASK-066 | 00, 02, 03 |
| FR-065 | 업적 | TASK-008, TASK-018, TASK-020-3, TASK-044-1, TASK-067-1 | 00, 01, 03 |
| FR-066 | 개인 기록·성장 수치 | TASK-018, TASK-020-3, TASK-067-1 | 01, 03 |
| FR-067 | 플레이어 진행 기록 | TASK-002, TASK-003, TASK-020-3 | 00, 01 |
| FR-068 | 경기 결과 저장 | TASK-002, TASK-003, TASK-018, TASK-020-2, TASK-032 | 00, 01, 02 |
| FR-069 | 전적 조회 | TASK-003, TASK-020-2, TASK-031, TASK-062-1, TASK-067-2 | 00, 01, 02, 03 |
| FR-070 | Elo 레이팅 갱신 | TASK-002, TASK-003, TASK-008, TASK-020-1, TASK-020-2, TASK-067-1 | 00, 01, 03 |
| FR-071 | 랭킹 조회 | TASK-003, TASK-020-2, TASK-031, TASK-062-1, TASK-067-2 | 00, 01, 02, 03 |
| FR-072 | 저장소 어댑터 자동 전환 | TASK-001-3, TASK-002, TASK-003, TASK-004, TASK-070 | 00, 03 |
| FR-073 | 단일 명령 로컬 실행 | TASK-001-1, TASK-001-2, TASK-001-3, TASK-034, TASK-070 | 00, 02, 03 |
| FR-074 | 공용 게임 콘텐츠 | TASK-005, TASK-006, TASK-009 | 00 |
| FR-075 | 단위 테스트 (Vitest) | TASK-001-5, TASK-010-4 | 00, 01 |
| FR-076 | 콘텐츠 검사 스크립트 | TASK-009 | 00 |
| FR-077 | E2E 테스트 (Playwright) | TASK-001-5 | 00 |
| FR-078 | 화면 흐름 | TASK-060-1, TASK-061, TASK-064-1, TASK-066, TASK-067-1, TASK-067-2 | 03 |
| NFR-001 | 렌더링 60fps (중급 모바일), 파티클 오브젝트 풀링 | TASK-040, TASK-042 | 03 |
| NFR-002 | 공격 반영 지연 100ms 이하 | TASK-012, TASK-033, TASK-065 | 01, 02, 03 |
| NFR-003 | 서버 메시지 스키마·게스트 토큰·닉네임·빈도 검증 | TASK-001-4, TASK-008, TASK-020-1, TASK-030, TASK-031, TASK-033, TASK-034, TASK-064-1, TASK-071 | 00, 01, 02, 03 |
| NFR-004 | Supabase service role 키 클라이언트 비노출 | TASK-001-3, TASK-001-4, TASK-004, TASK-071 | 00, 03 |
| NFR-005 | 외부 네트워크 리소스 없이 로컬 번들 자산으로 동작 | TASK-050-1, TASK-050-2, TASK-061 | 03 |
| NFR-006 | 첨부 B 체크리스트 8항목 충족 매핑 | TASK-053, TASK-072 | 03 |
| NFR-007 | 라이브러리 최신 안정판 lockfile 고정, 2주 미만 버전 회피 | TASK-001-1, TASK-001-2, TASK-001-3 | 00 |
| NFR-008 | 수집 정보 최소화 (닉네임·게스트 ID·토큰·경기 기록) | TASK-001-4, TASK-002, TASK-020-1, TASK-071 | 00, 01, 03 |
| C-001 | 현금 결제·가챠 영구 금지 | TASK-008, TASK-016, TASK-071 | 00, 01, 03 |
| C-002 | 예수님 표현 원칙 (선택 불가, 빛·실루엣, 경기당 1회 이벤트) | TASK-015-1, TASK-044-3, TASK-045, TASK-071 | 01, 03 |
| C-003 | KJV 1769 원문, 한국어 직접 번역, 출처 장·절 표기 | TASK-006, TASK-007, TASK-052 | 00, 03 |
| C-004 | 외부 서비스 키 0개로 동작 | TASK-001-3, TASK-004, TASK-070 | 00, 03 |
| C-005 | 기술 스택 고정 (Vite·PixiJS v8·Workers+DO·DO SQLite·Vitest·Playwright 등) | TASK-001-1, TASK-001-2, TASK-001-3 | 00 |
| C-006 | Socket.IO·Express 미사용 | TASK-030, TASK-034, TASK-062-2 | 02, 03 |
| C-007 | 녹음 음원·일러스트 미사용 (코드 합성·코드 그래픽) | TASK-044-1, TASK-044-2, TASK-044-3, TASK-050-1, TASK-050-2 | 03 |
| C-008 | 이번 실행 제외 범위 구현 금지 | TASK-072 | 03 |
| C-009 | 채팅 없음 (리액션만) | TASK-052, TASK-066 | 03 |
| C-010 | KJV 근거 없는 존재 미등장, 모든 캐릭터 근거 구절 표시 | TASK-005, TASK-006, TASK-009, TASK-044-3 | 00, 03 |
| C-011 | 고어·선정 표현 금지 (전 연령) | TASK-005, TASK-044-1, TASK-044-2, TASK-044-3, TASK-045 | 00, 03 |
| C-012 | 소스는 fruit-열매/ 아래 첨부 A §4.5 구조 | TASK-001-1 | 00 |
| C-013 | backup/ 폴더 git 미커밋·비공개 | TASK-001-1 | 00 |
