# 📜 요구사항 추적 매트릭스 (RTM — Covenant Trace) — 영적 전쟁 테트리스

> *"And the Lord said unto Moses, Write this for a memorial in a book."* — Exodus 17:14 (KJV)
>
> **규격:** `statute-율법/01.requirement-hearing-들음/rtm-covenant-언약추적-template.md`
> **참조 예시:** `parable-비유/01.requirement-hearing-들음/rtm-covenant-언약추적-example.md`
> **근거 산출물:** [`spec-tablet-명세서.md`](./spec-tablet-명세서.md) (REQ 17 · FR 78 · NFR 8 · C 13), [`usecase-path-사용사례.md`](./usecase-path-사용사례.md) (UC-001~UC-022)
> **갱신 시점:** Phase 1 완료 — 언약추적 갱신 규칙에 따라 REQ 열 전체 등재 + UC-ID 연결, 나머지 열(ARCH/API/TBL/코드/테스트)은 ⬜. 이 RTM은 프로젝트 전체에서 단 1개이며 Phase 2~7에서 계속 갱신된다.
> **갱신 시점 (Phase 2 완료):** 언약추적 갱신 규칙 "Phase 2 완료 시 ARCH-ID, API-ID, TBL-ID 열 채움"에 따라 116행 전부 기재 — 근거 [`architecture-temple-성전설계.md`](../02.architecture-foundation-기초/architecture-temple-성전설계.md) (ARCH-001~022), [`api-gate-성문.md`](../02.architecture-foundation-기초/api-gate-성문.md) (API-001~006, API-101~154, API-201~262, API-290), [`data-ark-법궤.md`](../02.architecture-foundation-기초/data-ark-법궤.md) (TBL-001~007, TBL-101~109, TBL-201). 서버 API·테이블이 없는 클라이언트 전용 요구사항은 빈칸 대신 "해당 없음(사유)"으로 판단을 기록했다. 상태 ⬜ → 🔄 (설계 연결, 코드·테스트 미연결). `A~B` 표기는 양끝 포함 연속 ID 범위.
> **갱신 시점 (Phase 3 완료):** 언약추적 갱신 규칙 "Phase 3 완료 시 화면 관련 항목 연결 확인"에 따라 116개 ID 전부의 화면 연결을 확인해 §7에 기재했다 — 근거 [`screen-vision-화면설계.md`](../03.design-order-질서/screen-vision-화면설계.md) (SCR-001~009), [`design-vision-디자인명세.md`](../03.design-order-질서/design-vision-디자인명세.md). §1 매트릭스에는 화면 전용 열이 없으므로 열 구조(계수기 파싱 대상)는 바꾸지 않았고, 상태도 🔄 그대로다 (화면 확인은 설계 구간 안의 확인이며 코드·테스트 연결이 아님).
> **갱신 시점 (Phase 4 착수 — 2026-10-20 기반 단계):** task-wall 정경화 조건 "RTM에 태스크 ↔ REQ 연결 반영"에 따라 §8 태스크 연결 표를 신설했다 (116/116 연결). §5에 첫 설계 변경(재각 R1 — npm workspaces → 단일 package.json)을 기록했다. §1 "코드 모듈"·"테스트 ID" 열과 상태는 지파 구현·통합(TASK-090) 후 채운다 — 지금은 🔄 그대로.
> **갱신 시점 (Phase 4 통합 완료 — 2026-10-20, 여호수아 TASK-090):** §1 "코드 모듈"·"테스트 ID" 열 116행 전부 기재 (§8 태스크 연결 → task-wall 생성 파일 역산, 경로는 `client/js/`·`tests/` 접두 생략, `worker/` = `worker/src/`). 상태는 🔄 유지 — ✅(완전 추적)는 Phase 5에서 테스트 통과를 확인한 뒤 바꾼다. §5에 통합 조정 설계 변경 4건, §6.4에 `--phase 4` 계수 기록.

---

## 1. 추적 매트릭스

| REQ-ID | 요구사항 요약 | UC-ID | ARCH-ID | API-ID | TBL-ID | 코드 모듈 | 테스트 ID | 상태 |
|:---|:---|:---|:---|:---|:---|:---|:---|:---:|
| REQ-001 | 사용자가 브라우저에서 KJV 성경 기반 실시간 2인 대전 테트리스를 플레이한다 | UC-003, UC-004, UC-007, UC-015, UC-016 | ARCH-001, ARCH-002, ARCH-003, ARCH-007, ARCH-011 | API-005, API-006, API-201~204, API-252, API-253, API-261, API-262 | TBL-002 | `net/protocol.js`<br>`engine/rng.js`<br>`engine/pieces.js`<br>`engine/encode.js`<br>`engine/danger.js`<br>`engine/bag.js`<br>`engine/srs.js`<br>`engine/board.js`<br>`engine/scoring.js`<br>`engine/specials.js`<br>`engine/gravity.js`<br>`engine/game.js`<br>`battle/input-keyboard.js`<br>`battle/input-touch.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`battle/battle-controller.js`<br>`worker/room/room-state.ts`<br>`worker/room/timers.ts`<br>`worker/room/round-flow.ts`<br>`worker/room/message-router.ts`<br>`worker/game-room.ts`<br>`net/socket.js`<br>`net/lobby-client.js`<br>`net/room-client.js`<br>`net/http-api.js`<br>`auth/guest-session.js`<br>`screens/battle-screen.js` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/engine/bag-srs.test.js`<br>`unit/engine/board.test.js`<br>`unit/engine/scoring.test.js`<br>`unit/engine/specials-gravity.test.js`<br>`unit/engine/game.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/room/round-flow.test.ts`<br>`unit/room/message-router.test.ts`<br>`unit/integration/bot-guard.test.ts`<br>`unit/client/http-api.test.js`<br>`unit/client/net-clients.test.js`<br>`unit/client/guest-session.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| REQ-002 | 사용자는 게스트 닉네임으로 입장한다 | UC-001 | ARCH-001, ARCH-008, ARCH-009, ARCH-021 | API-001, API-002 | TBL-001, TBL-201 | `worker/auth/token.ts`<br>`worker/auth/nickname.ts`<br>`worker/protocol/validate.ts`<br>`worker/protocol/rate-limit.ts`<br>`worker/index.ts`<br>`worker/http/router.ts`<br>`worker/http/respond.ts`<br>`worker/http/guest-routes.ts`<br>`worker/http/records-routes.ts`<br>`worker/http/ranking-routes.ts`<br>`worker/http/ws-routes.ts`<br>`net/socket.js`<br>`net/lobby-client.js`<br>`net/room-client.js`<br>`net/http-api.js`<br>`auth/guest-session.js`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js` | `unit/protocol/token-nickname.test.ts`<br>`unit/protocol/validate.test.ts`<br>`unit/protocol/rate-limit.test.ts`<br>`unit/http/guest-routes.test.ts`<br>`unit/http/query-routes.test.ts`<br>`unit/client/http-api.test.js`<br>`unit/client/net-clients.test.js`<br>`unit/client/guest-session.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| REQ-003 | 사용자는 위인 4명(다윗·솔로몬·베드로·바울) 중 한 명을 고른다 | UC-002, UC-009 | ARCH-001, ARCH-004, ARCH-012, ARCH-018 | API-101, API-205, API-255 | TBL-101 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`worker/room/faith.ts`<br>`worker/room/grace.ts`<br>`worker/room/hero-skills.ts`<br>`worker/room/angels.ts`<br>`worker/room/armor.ts`<br>`worker/room/jesus-event.ts`<br>`worker/room/specials.ts`<br>`render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js`<br>`render/background-parallax.js`<br>`render/hud-view.js`<br>`render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js` | `unit/foundation/protocol-content.test.js`<br>`unit/room/faith-grace.test.ts`<br>`unit/room/hero-skills.test.ts`<br>`unit/room/angels.test.ts`<br>`unit/room/armor.test.ts`<br>`unit/room/jesus-specials.test.ts`<br>`unit/render/layout-skin.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| REQ-004 | 사용자는 대전 모드(사람 대 사람, 랜덤 매칭 + 친구 초대 코드)를 고를 수 있다 | UC-002, UC-003, UC-004 | ARCH-001, ARCH-010 | API-005, API-101~103, API-151~154 | TBL-005 | `worker/matchmaking/queue.ts`<br>`worker/matchmaking/invite-codes.ts`<br>`worker/matchmaking/room-factory.ts`<br>`worker/matchmaker.ts`<br>`net/socket.js`<br>`net/lobby-client.js`<br>`net/room-client.js`<br>`net/http-api.js`<br>`auth/guest-session.js`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js` | `unit/matchmaking/queue.test.ts`<br>`unit/matchmaking/invite-codes.test.ts`<br>`unit/client/http-api.test.js`<br>`unit/client/net-clients.test.js`<br>`unit/client/guest-session.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| REQ-005 | 사용자는 AI 봇 대전(쉬움·보통·어려움)을 고를 수 있다 | UC-002, UC-005 | ARCH-010, ARCH-014 | API-101, API-153 | TBL-002, TBL-108 | `worker/room/bot/bot-planner.ts`<br>`worker/room/bot/bot-player.ts`<br>`worker/room/bot/bot-quiz.ts`<br>`worker/matchmaking/queue.ts`<br>`worker/matchmaking/invite-codes.ts`<br>`worker/matchmaking/room-factory.ts`<br>`worker/matchmaker.ts`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js` | `unit/bot/bot-planner.test.ts`<br>`unit/bot/bot-quiz.test.ts`<br>`unit/integration/bot-guard.test.ts`<br>`unit/matchmaking/queue.test.ts`<br>`unit/matchmaking/invite-codes.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| REQ-006 | 사용자는 연습 모드를 고를 수 있다 | UC-002, UC-006 | ARCH-010, ARCH-011 | API-101, API-210, API-262 | TBL-003 | `worker/room/room-state.ts`<br>`worker/room/timers.ts`<br>`worker/room/round-flow.ts`<br>`worker/room/message-router.ts`<br>`worker/game-room.ts`<br>`worker/matchmaking/queue.ts`<br>`worker/matchmaking/invite-codes.ts`<br>`worker/matchmaking/room-factory.ts`<br>`worker/matchmaker.ts`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js` | `unit/room/round-flow.test.ts`<br>`unit/room/message-router.test.ts`<br>`unit/integration/bot-guard.test.ts`<br>`unit/matchmaking/queue.test.ts`<br>`unit/matchmaking/invite-codes.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| REQ-007 | 줄을 지우면 상대에게 쓰레기 줄과 악한 영(14종)이 공격으로 간다. 서버가 공격을 판정한다 | UC-008 | ARCH-003, ARCH-012, ARCH-017 | API-204, API-254 | TBL-103, TBL-108 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`battle/input-keyboard.js`<br>`battle/input-touch.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`battle/battle-controller.js`<br>`worker/attack.ts`<br>`worker/room/interference.ts`<br>`worker/room/progress-guard.ts` | `unit/foundation/protocol-content.test.js`<br>`unit/engine/game.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/room/attack.test.ts`<br>`unit/room/interference.test.ts`<br>`unit/room/progress-guard.test.ts`<br>`unit/integration/bot-guard.test.ts` | 🔄 |
| REQ-008 | 사용자는 믿음 게이지로 위인 스킬과 천사 5종을 쓴다 | UC-009, UC-010 | ARCH-012 | API-205, API-255, API-256 | TBL-101, TBL-102, TBL-108 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`battle/input-keyboard.js`<br>`battle/input-touch.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`battle/battle-controller.js`<br>`worker/room/faith.ts`<br>`worker/room/grace.ts`<br>`worker/room/hero-skills.ts`<br>`worker/room/angels.ts`<br>`worker/room/armor.ts`<br>`worker/room/jesus-event.ts`<br>`worker/room/specials.ts` | `unit/foundation/protocol-content.test.js`<br>`unit/engine/game.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/room/faith-grace.test.ts`<br>`unit/room/hero-skills.test.ts`<br>`unit/room/angels.test.ts`<br>`unit/room/armor.test.ts`<br>`unit/room/jesus-specials.test.ts` | 🔄 |
| REQ-009 | 사용자는 전신갑주 6종을 얻어 쓴다 | UC-011 | ARCH-012 | API-204, API-206, API-255 | TBL-104, TBL-105 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`battle/input-keyboard.js`<br>`battle/input-touch.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`battle/battle-controller.js`<br>`worker/room/faith.ts`<br>`worker/room/grace.ts`<br>`worker/room/hero-skills.ts`<br>`worker/room/angels.ts`<br>`worker/room/armor.ts`<br>`worker/room/jesus-event.ts`<br>`worker/room/specials.ts` | `unit/foundation/protocol-content.test.js`<br>`unit/engine/game.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/room/faith-grace.test.ts`<br>`unit/room/hero-skills.test.ts`<br>`unit/room/angels.test.ts`<br>`unit/room/armor.test.ts`<br>`unit/room/jesus-specials.test.ts` | 🔄 |
| REQ-010 | 예수님 "세상을 이기었노라" 이벤트(첨부 A §3.2 원칙 그대로)가 경기당 1회 일어날 수 있다 | UC-012 | ARCH-004, ARCH-012 | API-203, API-255 | TBL-106 | `battle/input-keyboard.js`<br>`battle/input-touch.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`battle/battle-controller.js`<br>`worker/room/faith.ts`<br>`worker/room/grace.ts`<br>`worker/room/hero-skills.ts`<br>`worker/room/angels.ts`<br>`worker/room/armor.ts`<br>`worker/room/jesus-event.ts`<br>`worker/room/specials.ts`<br>`render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js`<br>`render/background-parallax.js`<br>`render/hud-view.js`<br>`render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js` | `unit/engine/game.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/room/faith-grace.test.ts`<br>`unit/room/hero-skills.test.ts`<br>`unit/room/angels.test.ts`<br>`unit/room/armor.test.ts`<br>`unit/room/jesus-specials.test.ts`<br>`unit/render/layout-skin.test.js` | 🔄 |
| REQ-011 | 말씀 대결(성경 퀴즈, 60문항 이상)이 있다 | UC-013 | ARCH-013, ARCH-022 | API-257~259 | TBL-106, TBL-107 | `worker/room/quiz-duel.ts`<br>`worker/room/representative-verse.ts`<br>`screens/battle-screen.js`<br>`screens/result-screen.js`<br>`ui/verse-card.js`<br>`ui/quiz-panel.js`<br>`ui/reactions.js`<br>`ui/toast.js`<br>`content/verses.json`<br>`content/quiz.json`<br>`scripts/check-content.mjs` | `unit/room/quiz-duel.test.ts`<br>`unit/client/view-format.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/content/check-content.test.js` | 🔄 |
| REQ-012 | 특수 블록 3종(말씀·여리고 나팔·만나)이 있다 | UC-014 | ARCH-002, ARCH-012 | API-204, API-252 | TBL-003, TBL-108 | `engine/bag.js`<br>`engine/srs.js`<br>`engine/board.js`<br>`engine/scoring.js`<br>`engine/specials.js`<br>`engine/gravity.js`<br>`engine/game.js`<br>`worker/room/faith.ts`<br>`worker/room/grace.ts`<br>`worker/room/hero-skills.ts`<br>`worker/room/angels.ts`<br>`worker/room/armor.ts`<br>`worker/room/jesus-event.ts`<br>`worker/room/specials.ts` | `unit/engine/bag-srs.test.js`<br>`unit/engine/board.test.js`<br>`unit/engine/scoring.test.js`<br>`unit/engine/specials-gravity.test.js`<br>`unit/engine/game.test.js`<br>`unit/room/faith-grace.test.ts`<br>`unit/room/hero-skills.test.ts`<br>`unit/room/angels.test.ts`<br>`unit/room/armor.test.ts`<br>`unit/room/jesus-specials.test.ts` | 🔄 |
| REQ-013 | 디자인·액션·사운드·재미 요구사항(첨부 A §5 전체)은 필수다. 첨부 B의 체크리스트를 충족해야 한다 | UC-007, UC-008, UC-015, UC-017, UC-020 | ARCH-004, ARCH-005, ARCH-006, ARCH-016, ARCH-022 | API-255, API-260, API-262 | TBL-003, TBL-004, TBL-108 | `worker/elo.ts`<br>`worker/results/personal-record.ts`<br>`worker/results/achievements.ts`<br>`worker/results/record-match.ts`<br>`render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js`<br>`render/background-parallax.js`<br>`render/hud-view.js`<br>`render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js`<br>`fx/particle-pool.js`<br>`fx/screen-shake.js`<br>`fx/hitstop.js`<br>`fx/fx-intensity.js`<br>`fx/filters.js`<br>`fx/projectiles.js`<br>`fx/overlay-fx.js`<br>`fx/text-pop.js`<br>`fx/victory-fx.js`<br>`fx/feedback-sync.js`<br>`audio/audio-engine.js`<br>`audio/sfx-play.js`<br>`audio/sfx-battle.js`<br>`audio/bgm.js`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js`<br>`screens/battle-screen.js`<br>`screens/result-screen.js`<br>`ui/verse-card.js`<br>`ui/quiz-panel.js`<br>`ui/reactions.js`<br>`ui/toast.js` | `unit/results/elo-achievements.test.ts`<br>`unit/results/personal-record.test.ts`<br>`unit/render/layout-skin.test.js`<br>`unit/fx/fx-intensity.test.js`<br>`unit/fx/particle-pool.test.js`<br>`unit/fx/feedback-sync.test.js`<br>`unit/audio/audio-engine.test.js`<br>`unit/audio/sfx.test.js`<br>`unit/audio/bgm.test.js`<br>`unit/client/view-format.test.js`<br>`e2e/battle-two-browsers.spec.js` | 🔄 |
| REQ-014 | 경기 결과(전적)가 저장되고 조회된다 | UC-015, UC-016, UC-018 | ARCH-015, ARCH-016 | API-003, API-262 | TBL-002 | `worker/store/store.ts`<br>`worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`supabase/migrations/0001_init.sql`<br>`worker/store/supabase-store.ts`<br>`worker/store/select-store.ts`<br>`worker/store/do-store-client.ts`<br>`worker/elo.ts`<br>`worker/results/personal-record.ts`<br>`worker/results/achievements.ts`<br>`worker/results/record-match.ts`<br>`worker/index.ts`<br>`worker/http/router.ts`<br>`worker/http/respond.ts`<br>`worker/http/guest-routes.ts`<br>`worker/http/records-routes.ts`<br>`worker/http/ranking-routes.ts`<br>`worker/http/ws-routes.ts`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js`<br>`screens/battle-screen.js`<br>`screens/result-screen.js`<br>`ui/verse-card.js`<br>`ui/quiz-panel.js`<br>`ui/reactions.js`<br>`ui/toast.js` | `unit/store/do-sqlite-store.test.ts`<br>`unit/store/select-store.test.ts`<br>`unit/results/elo-achievements.test.ts`<br>`unit/results/personal-record.test.ts`<br>`unit/http/guest-routes.test.ts`<br>`unit/http/query-routes.test.ts`<br>`unit/client/view-format.test.js`<br>`e2e/battle-two-browsers.spec.js` | 🔄 |
| REQ-015 | 랭킹(Elo)이 저장되고 조회된다 | UC-015, UC-019 | ARCH-015, ARCH-016 | API-004, API-262 | TBL-001, TBL-006 | `worker/store/store.ts`<br>`worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`supabase/migrations/0001_init.sql`<br>`worker/store/supabase-store.ts`<br>`worker/store/select-store.ts`<br>`worker/store/do-store-client.ts`<br>`worker/elo.ts`<br>`worker/results/personal-record.ts`<br>`worker/results/achievements.ts`<br>`worker/results/record-match.ts`<br>`worker/index.ts`<br>`worker/http/router.ts`<br>`worker/http/respond.ts`<br>`worker/http/guest-routes.ts`<br>`worker/http/records-routes.ts`<br>`worker/http/ranking-routes.ts`<br>`worker/http/ws-routes.ts`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js`<br>`screens/battle-screen.js`<br>`screens/result-screen.js`<br>`ui/verse-card.js`<br>`ui/quiz-panel.js`<br>`ui/reactions.js`<br>`ui/toast.js` | `unit/store/do-sqlite-store.test.ts`<br>`unit/store/select-store.test.ts`<br>`unit/results/elo-achievements.test.ts`<br>`unit/results/personal-record.test.ts`<br>`unit/http/guest-routes.test.ts`<br>`unit/http/query-routes.test.ts`<br>`unit/client/view-format.test.js`<br>`e2e/battle-two-browsers.spec.js` | 🔄 |
| REQ-016 | 외부 서비스 키 없이 `npm install && npm run dev` 한 번으로 전부 동작해야 한다. Supabase는 환경변수가 있을 때만 쓰는 어댑터로 둔다 | UC-021 | ARCH-015, ARCH-019, ARCH-021 | API-001~006 (Vite 프록시 경유 로컬 경로) | TBL-007, TBL-101~109 | `package.json`<br>`scripts/dev.mjs`<br>`client/index.html`<br>`client/vite.config.js`<br>`worker/wrangler.toml`<br>`worker/env.ts`<br>`worker/store/store.ts`<br>`worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`supabase/migrations/0001_init.sql`<br>`worker/store/supabase-store.ts`<br>`worker/store/select-store.ts`<br>`worker/store/do-store-client.ts` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/store/do-sqlite-store.test.ts`<br>`unit/store/select-store.test.ts`<br>`unit/integration/bot-guard.test.ts` | 🔄 |
| REQ-017 | 테스트: Vitest(단위) + Playwright(브라우저 2개 E2E) | UC-022 | ARCH-020 | API-204, API-254 (E2E 검증 대상) | TBL-101~109 (콘텐츠 검사) | `package.json`<br>`scripts/dev.mjs`<br>`content/verses.json`<br>`content/quiz.json`<br>`scripts/check-content.mjs` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/engine/bag-srs.test.js`<br>`unit/engine/board.test.js`<br>`unit/engine/scoring.test.js`<br>`unit/engine/specials-gravity.test.js`<br>`unit/engine/game.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/attack.test.ts`<br>`unit/room/interference.test.ts`<br>`unit/room/progress-guard.test.ts`<br>`unit/room/faith-grace.test.ts`<br>`unit/room/hero-skills.test.ts`<br>`unit/room/angels.test.ts`<br>`unit/room/armor.test.ts`<br>`unit/room/jesus-specials.test.ts`<br>`unit/room/round-flow.test.ts`<br>`unit/room/message-router.test.ts`<br>`unit/store/do-sqlite-store.test.ts`<br>`unit/store/select-store.test.ts`<br>`unit/results/elo-achievements.test.ts`<br>`unit/results/personal-record.test.ts`<br>`unit/protocol/token-nickname.test.ts`<br>`unit/protocol/validate.test.ts`<br>`unit/protocol/rate-limit.test.ts`<br>`unit/http/guest-routes.test.ts`<br>`unit/http/query-routes.test.ts`<br>`unit/matchmaking/queue.test.ts`<br>`unit/matchmaking/invite-codes.test.ts`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/content/check-content.test.js`<br>`unit/integration/bot-guard.test.ts` | 🔄 |
| FR-001 | 보드·테트로미노·7-bag | UC-007 | ARCH-002 | API-252 (seed) | 해당 없음(엔진 메모리 상태) | `net/protocol.js`<br>`engine/rng.js`<br>`engine/pieces.js`<br>`engine/encode.js`<br>`engine/danger.js`<br>`engine/bag.js`<br>`engine/srs.js` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/engine/bag-srs.test.js` | 🔄 |
| FR-002 | SRS 회전 | UC-007 | ARCH-002 | API-203 (회전 결과 상태) | 해당 없음(엔진 메모리 상태) | `net/protocol.js`<br>`engine/rng.js`<br>`engine/pieces.js`<br>`engine/encode.js`<br>`engine/danger.js`<br>`engine/bag.js`<br>`engine/srs.js` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/engine/bag-srs.test.js` | 🔄 |
| FR-003 | 이동·드롭·홀드·고스트 | UC-007 | ARCH-002, ARCH-003 | API-203 | 해당 없음(엔진 메모리 상태) | `engine/board.js`<br>`engine/game.js`<br>`render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js` | `unit/engine/board.test.js`<br>`unit/engine/game.test.js`<br>`unit/render/layout-skin.test.js` | 🔄 |
| FR-004 | 줄 삭제·판정·점수 | UC-007 | ARCH-002 | API-204 | TBL-002 (stats) | `engine/board.js`<br>`engine/scoring.js` | `unit/engine/board.test.js`<br>`unit/engine/scoring.test.js` | 🔄 |
| FR-005 | 같은 시드 시작 | UC-003, UC-004 | ARCH-011 | API-202, API-252 | TBL-003 | `net/protocol.js`<br>`engine/rng.js`<br>`engine/pieces.js`<br>`engine/encode.js`<br>`engine/danger.js`<br>`engine/bag.js`<br>`engine/srs.js`<br>`worker/room/room-state.ts`<br>`worker/room/timers.ts`<br>`worker/room/round-flow.ts`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/engine/bag-srs.test.js`<br>`unit/room/round-flow.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-006 | 상대 보드 실시간 표시 | UC-007 | ARCH-003, ARCH-007, ARCH-011 | API-203, API-253 | 해당 없음(메모리 중계) | `net/protocol.js`<br>`engine/rng.js`<br>`engine/pieces.js`<br>`engine/encode.js`<br>`engine/danger.js`<br>`battle/battle-controller.js`<br>`worker/room/message-router.ts`<br>`render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js`<br>`net/socket.js`<br>`net/lobby-client.js`<br>`net/room-client.js`<br>`net/http-api.js` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/battle/effect-applier.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/room/message-router.test.ts`<br>`unit/render/layout-skin.test.js`<br>`unit/client/http-api.test.js`<br>`unit/client/net-clients.test.js` | 🔄 |
| FR-007 | 승리 조건 | UC-015 | ARCH-005, ARCH-011 | API-207, API-261, API-262 | TBL-002, TBL-106 | `battle/battle-controller.js`<br>`worker/room/round-flow.ts`<br>`fx/text-pop.js`<br>`fx/victory-fx.js`<br>`fx/feedback-sync.js`<br>`screens/result-screen.js`<br>`ui/verse-card.js` | `unit/battle/effect-applier.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/room/round-flow.test.ts`<br>`unit/fx/feedback-sync.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-008 | 실시간 통신 프로토콜 | UC-003, UC-004 | ARCH-007, ARCH-017 | API-005, API-006, API-101~154, API-201~262, API-290 | 해당 없음(전송 계층) | `net/protocol.js`<br>`engine/rng.js`<br>`engine/pieces.js`<br>`engine/encode.js`<br>`engine/danger.js`<br>`worker/room/message-router.ts`<br>`worker/game-room.ts`<br>`worker/http/ws-routes.ts`<br>`net/socket.js`<br>`net/lobby-client.js`<br>`net/room-client.js`<br>`net/http-api.js` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/room/message-router.test.ts`<br>`unit/integration/bot-guard.test.ts`<br>`unit/http/guest-routes.test.ts`<br>`unit/client/http-api.test.js`<br>`unit/client/net-clients.test.js` | 🔄 |
| FR-009 | 상대 이탈 처리 | UC-016 | ARCH-011, ARCH-016 | API-262 | TBL-002 | `worker/room/room-state.ts`<br>`worker/room/timers.ts`<br>`worker/room/round-flow.ts`<br>`worker/game-room.ts`<br>`worker/results/record-match.ts` | `unit/room/round-flow.test.ts`<br>`unit/room/message-router.test.ts`<br>`unit/integration/bot-guard.test.ts`<br>`unit/results/elo-achievements.test.ts` | 🔄 |
| FR-010 | 난이도 곡선 | UC-007 | ARCH-002 | API-252 (matchElapsedMs) | TBL-108 | `engine/specials.js`<br>`engine/gravity.js`<br>`worker/room/round-flow.ts` | `unit/engine/specials-gravity.test.js`<br>`unit/room/round-flow.test.ts` | 🔄 |
| FR-011 | 조작 입력 | UC-007 | ARCH-003 | API-205, API-206 (키 입력 결과 전송) | TBL-108 | `engine/game.js`<br>`battle/input-keyboard.js`<br>`battle/input-touch.js` | `unit/engine/game.test.js` | 🔄 |
| FR-012 | 게스트 닉네임 입장 | UC-001 | ARCH-008, ARCH-009, ARCH-021 | API-001, API-002 | TBL-001, TBL-201 | `worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`supabase/migrations/0001_init.sql`<br>`worker/store/supabase-store.ts`<br>`worker/store/select-store.ts`<br>`worker/store/do-store-client.ts`<br>`worker/auth/token.ts`<br>`worker/auth/nickname.ts`<br>`worker/http/guest-routes.ts`<br>`worker/http/records-routes.ts`<br>`worker/http/ranking-routes.ts`<br>`auth/guest-session.js`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js` | `unit/store/do-sqlite-store.test.ts`<br>`unit/store/select-store.test.ts`<br>`unit/protocol/token-nickname.test.ts`<br>`unit/http/guest-routes.test.ts`<br>`unit/http/query-routes.test.ts`<br>`unit/client/guest-session.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-013 | 캐릭터 선택 화면 | UC-002 | ARCH-001, ARCH-004, ARCH-018 | API-101 (heroId) | TBL-101, TBL-106 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js` | `unit/foundation/protocol-content.test.js`<br>`unit/render/layout-skin.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-014 | 다윗 — 물맷돌 | UC-009 | ARCH-003, ARCH-012 | API-205, API-255 | TBL-101 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`engine/board.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/hero-skills.ts`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js` | `unit/foundation/protocol-content.test.js`<br>`unit/engine/board.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/hero-skills.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-015 | 솔로몬 — 지혜로운 마음 | UC-009 | ARCH-003, ARCH-012 | API-205, API-255 | TBL-101 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`engine/game.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/hero-skills.ts`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js` | `unit/foundation/protocol-content.test.js`<br>`unit/engine/game.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/hero-skills.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-016 | 베드로 — 이 반석 위에 | UC-009 | ARCH-003, ARCH-012 | API-205, API-255 | TBL-101 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/hero-skills.ts`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js` | `unit/foundation/protocol-content.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/hero-skills.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-017 | 바울 — 옥문이 열리다 | UC-009 | ARCH-003, ARCH-012 | API-205, API-255 | TBL-101 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`engine/board.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/hero-skills.ts`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js` | `unit/foundation/protocol-content.test.js`<br>`unit/engine/board.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/hero-skills.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-018 | 랜덤 매칭 | UC-003 | ARCH-010 | API-101, API-151, API-153 | TBL-001 | `worker/matchmaker.ts`<br>`net/socket.js`<br>`net/lobby-client.js`<br>`net/room-client.js`<br>`net/http-api.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js` | `unit/matchmaking/queue.test.ts`<br>`unit/client/http-api.test.js`<br>`unit/client/net-clients.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-019 | 친구 초대 코드 | UC-004 | ARCH-010 | API-101, API-102, API-152, API-153 | TBL-005 | `worker/matchmaker.ts`<br>`net/socket.js`<br>`net/lobby-client.js`<br>`net/room-client.js`<br>`net/http-api.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js` | `unit/matchmaking/queue.test.ts`<br>`unit/client/http-api.test.js`<br>`unit/client/net-clients.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-020 | 대기 취소·대기열 정리 | UC-003 | ARCH-010 | API-103, API-154 | TBL-005 | `worker/matchmaker.ts`<br>`net/socket.js`<br>`net/lobby-client.js`<br>`net/room-client.js`<br>`net/http-api.js`<br>`screens/hero-select-screen.js`<br>`screens/matching-screen.js` | `unit/matchmaking/queue.test.ts`<br>`unit/client/http-api.test.js`<br>`unit/client/net-clients.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-021 | AI 봇 대전 | UC-005 | ARCH-010, ARCH-014 | API-101, API-153, API-253 | TBL-002, TBL-108 | `worker/room/bot/bot-planner.ts`<br>`worker/room/bot/bot-player.ts`<br>`worker/room/bot/bot-quiz.ts`<br>`worker/matchmaking/queue.ts`<br>`worker/matchmaking/invite-codes.ts`<br>`worker/matchmaking/room-factory.ts`<br>`worker/matchmaker.ts` | `unit/bot/bot-planner.test.ts`<br>`unit/bot/bot-quiz.test.ts`<br>`unit/integration/bot-guard.test.ts`<br>`unit/matchmaking/queue.test.ts`<br>`unit/matchmaking/invite-codes.test.ts` | 🔄 |
| FR-022 | 봇의 말씀 대결 응답 | UC-005, UC-013 | ARCH-013, ARCH-014 | API-259 | TBL-107, TBL-108 | `worker/room/bot/bot-planner.ts`<br>`worker/room/bot/bot-player.ts`<br>`worker/room/bot/bot-quiz.ts`<br>`worker/room/quiz-duel.ts`<br>`worker/room/representative-verse.ts` | `unit/bot/bot-planner.test.ts`<br>`unit/bot/bot-quiz.test.ts`<br>`unit/integration/bot-guard.test.ts`<br>`unit/room/quiz-duel.test.ts` | 🔄 |
| FR-023 | 연습 모드 | UC-006 | ARCH-010, ARCH-011 | API-101, API-210, API-262 | TBL-003 | `worker/room/round-flow.ts`<br>`worker/matchmaking/queue.ts`<br>`worker/matchmaking/invite-codes.ts`<br>`worker/matchmaking/room-factory.ts`<br>`worker/matchmaker.ts`<br>`screens/battle-screen.js` | `unit/room/round-flow.test.ts`<br>`unit/matchmaking/queue.test.ts`<br>`unit/matchmaking/invite-codes.test.ts`<br>`unit/client/view-format.test.js`<br>`e2e/battle-two-browsers.spec.js` | 🔄 |
| FR-024 | 공격력 계산 | UC-008 | ARCH-012 | API-204, API-254 | TBL-108 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`worker/attack.ts` | `unit/foundation/protocol-content.test.js`<br>`unit/room/attack.test.ts` | 🔄 |
| FR-025 | 쓰레기 줄 삽입·상쇄 | UC-008 | ARCH-003, ARCH-012 | API-203, API-254, API-255 | TBL-108 | `engine/board.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js` | `unit/engine/board.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js` | 🔄 |
| FR-026 | 악한 영 소환 결정 | UC-008 | ARCH-012 | API-254 | TBL-103, TBL-108 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`worker/attack.ts` | `unit/foundation/protocol-content.test.js`<br>`unit/room/attack.test.ts` | 🔄 |
| FR-027 | 악한 영 1~2등급 효과 | UC-008 | ARCH-003, ARCH-012 | API-254 | TBL-103 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/interference.ts`<br>`fx/filters.js`<br>`fx/projectiles.js`<br>`fx/overlay-fx.js` | `unit/foundation/protocol-content.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/interference.test.ts`<br>`unit/fx/feedback-sync.test.js` | 🔄 |
| FR-028 | 악한 영 3등급 효과 | UC-008 | ARCH-003, ARCH-012 | API-254 | TBL-103 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/interference.ts`<br>`worker/room/angels.ts`<br>`fx/filters.js`<br>`fx/projectiles.js`<br>`fx/overlay-fx.js` | `unit/foundation/protocol-content.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/interference.test.ts`<br>`unit/room/angels.test.ts`<br>`unit/fx/feedback-sync.test.js` | 🔄 |
| FR-029 | 악한 영 4등급 효과 | UC-008 | ARCH-003, ARCH-012 | API-254 | TBL-103 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`engine/board.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/interference.ts`<br>`fx/filters.js`<br>`fx/projectiles.js`<br>`fx/overlay-fx.js` | `unit/foundation/protocol-content.test.js`<br>`unit/engine/board.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/interference.test.ts`<br>`unit/fx/feedback-sync.test.js` | 🔄 |
| FR-030 | 악한 영 5등급·보스 효과 | UC-008 | ARCH-003, ARCH-012 | API-254 | TBL-103 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/attack.ts`<br>`worker/room/interference.ts`<br>`fx/filters.js`<br>`fx/projectiles.js`<br>`fx/overlay-fx.js` | `unit/foundation/protocol-content.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/attack.test.ts`<br>`unit/room/interference.test.ts`<br>`unit/fx/feedback-sync.test.js` | 🔄 |
| FR-031 | 방해 상한 규칙 | UC-008 | ARCH-012 | API-254 | TBL-108 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`worker/room/interference.ts` | `unit/foundation/protocol-content.test.js`<br>`unit/room/interference.test.ts` | 🔄 |
| FR-032 | 서버 진행 검증 | UC-007, UC-008 | ARCH-012, ARCH-017 | API-203, API-204, API-207, API-290 | TBL-108 | `worker/room/progress-guard.ts`<br>`worker/protocol/validate.ts`<br>`worker/protocol/rate-limit.ts` | `unit/room/progress-guard.test.ts`<br>`unit/integration/bot-guard.test.ts`<br>`unit/protocol/validate.test.ts`<br>`unit/protocol/rate-limit.test.ts` | 🔄 |
| FR-033 | 믿음 게이지 | UC-009 | ARCH-012 | API-204, API-256 | TBL-108 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`worker/room/faith.ts`<br>`worker/room/grace.ts`<br>`render/background-parallax.js`<br>`render/hud-view.js` | `unit/foundation/protocol-content.test.js`<br>`unit/room/faith-grace.test.ts`<br>`unit/render/layout-skin.test.js` | 🔄 |
| FR-034 | 위인 스킬 발동 | UC-009 | ARCH-012 | API-205, API-255, API-256, API-290 | TBL-101, TBL-108 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`worker/room/faith.ts`<br>`worker/room/grace.ts`<br>`worker/room/hero-skills.ts`<br>`screens/battle-screen.js` | `unit/foundation/protocol-content.test.js`<br>`unit/room/faith-grace.test.ts`<br>`unit/room/hero-skills.test.ts`<br>`unit/client/view-format.test.js`<br>`e2e/battle-two-browsers.spec.js` | 🔄 |
| FR-035 | 천사 5종 소환 | UC-010 | ARCH-012 | API-205, API-255 | TBL-102, TBL-108 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`engine/board.js`<br>`engine/game.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/angels.ts` | `unit/foundation/protocol-content.test.js`<br>`unit/engine/board.test.js`<br>`unit/engine/game.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/angels.test.ts` | 🔄 |
| FR-036 | 갑주 출현·획득 | UC-011 | ARCH-002, ARCH-012 | API-204, API-256 | TBL-104, TBL-108 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`engine/specials.js`<br>`engine/gravity.js`<br>`worker/room/armor.ts`<br>`render/background-parallax.js`<br>`render/hud-view.js` | `unit/foundation/protocol-content.test.js`<br>`unit/engine/specials-gravity.test.js`<br>`unit/room/armor.test.ts`<br>`unit/render/layout-skin.test.js` | 🔄 |
| FR-037 | 갑주 6종 사용 | UC-011 | ARCH-012 | API-206, API-255 | TBL-104 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/armor.ts` | `unit/foundation/protocol-content.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/armor.test.ts` | 🔄 |
| FR-038 | 상성표 | UC-011 | ARCH-018, ARCH-020 | API-205, API-206 | TBL-105 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`worker/room/armor.ts` | `unit/foundation/protocol-content.test.js`<br>`unit/room/armor.test.ts` | 🔄 |
| FR-039 | "세상을 이기었노라" 이벤트 | UC-012 | ARCH-004, ARCH-012 | API-203, API-255 | TBL-106 | `battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/jesus-event.ts`<br>`worker/room/specials.ts`<br>`render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js` | `unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/jesus-specials.test.ts`<br>`unit/render/layout-skin.test.js` | 🔄 |
| FR-040 | 말씀 대결 발생 | UC-013 | ARCH-013 | API-204, API-257 | TBL-107 | `battle/battle-controller.js`<br>`worker/room/quiz-duel.ts`<br>`worker/room/representative-verse.ts` | `unit/battle/effect-applier.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/room/quiz-duel.test.ts` | 🔄 |
| FR-041 | 진행·판정·보상 | UC-013 | ARCH-013, ARCH-022 | API-208, API-258, API-259 | TBL-106, TBL-107 | `worker/room/quiz-duel.ts`<br>`worker/room/representative-verse.ts`<br>`ui/quiz-panel.js`<br>`ui/reactions.js`<br>`ui/toast.js` | `unit/room/quiz-duel.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-042 | 니어미스 연출 | UC-013 | ARCH-013, ARCH-022 | API-259 | 해당 없음(메모리 도착 시각) | `worker/room/quiz-duel.ts`<br>`worker/room/representative-verse.ts`<br>`ui/quiz-panel.js`<br>`ui/reactions.js`<br>`ui/toast.js` | `unit/room/quiz-duel.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-043 | 퀴즈 콘텐츠 | UC-013 | ARCH-018 | API-257 | TBL-107 | `worker/room/quiz-duel.ts`<br>`worker/room/representative-verse.ts`<br>`content/verses.json`<br>`content/quiz.json`<br>`scripts/check-content.mjs` | `unit/room/quiz-duel.test.ts`<br>`unit/content/check-content.test.js` | 🔄 |
| FR-044 | 말씀 블록 | UC-014 | ARCH-002, ARCH-012 | API-204, API-257 | TBL-108 | `engine/specials.js`<br>`engine/gravity.js`<br>`worker/room/jesus-event.ts`<br>`worker/room/specials.ts`<br>`render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js` | `unit/engine/specials-gravity.test.js`<br>`unit/room/jesus-specials.test.ts`<br>`unit/render/layout-skin.test.js` | 🔄 |
| FR-045 | 여리고 나팔 블록 | UC-014 | ARCH-002, ARCH-012 | API-204, API-255 | TBL-108 | `engine/board.js`<br>`engine/specials.js`<br>`engine/gravity.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/attack.ts`<br>`worker/room/jesus-event.ts`<br>`worker/room/specials.ts`<br>`render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js` | `unit/engine/board.test.js`<br>`unit/engine/specials-gravity.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/attack.test.ts`<br>`unit/room/jesus-specials.test.ts`<br>`unit/render/layout-skin.test.js` | 🔄 |
| FR-046 | 만나 블록 | UC-014 | ARCH-002, ARCH-012 | API-204, API-256 | TBL-108 | `engine/specials.js`<br>`engine/gravity.js`<br>`battle/effect-applier.js`<br>`battle/interference-client.js`<br>`worker/room/jesus-event.ts`<br>`worker/room/specials.ts`<br>`render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js` | `unit/engine/specials-gravity.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/jesus-specials.test.ts`<br>`unit/render/layout-skin.test.js` | 🔄 |
| FR-047 | 단계적 해금 | UC-014 | ARCH-012, ARCH-016 | API-252 | TBL-003, TBL-108 | `engine/specials.js`<br>`engine/gravity.js`<br>`worker/room/jesus-event.ts`<br>`worker/room/specials.ts`<br>`worker/room/round-flow.ts`<br>`render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js`<br>`render/background-parallax.js`<br>`render/hud-view.js`<br>`render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js` | `unit/engine/specials-gravity.test.js`<br>`unit/room/jesus-specials.test.ts`<br>`unit/room/round-flow.test.ts`<br>`unit/render/layout-skin.test.js` | 🔄 |
| FR-048 | 아트 방향 | UC-007 | ARCH-004 | 해당 없음(클라이언트 렌더링 전용) | 해당 없음(코드 생성 그래픽 — C-007) | `render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js`<br>`render/background-parallax.js`<br>`render/hud-view.js`<br>`main.js`<br>`ui/dom.js`<br>`styles/base.css`<br>`styles/screens.css`<br>`styles/overlay.css` | `unit/render/layout-skin.test.js`<br>`unit/client/router.test.js` | 🔄 |
| FR-049 | 존재 시각 표현 | UC-008, UC-010 | ARCH-004 | API-254, API-255 (등장 지시) | TBL-102, TBL-103 | `render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js` | `unit/render/layout-skin.test.js` | 🔄 |
| FR-050 | 폰트 번들 | UC-007 | ARCH-004, ARCH-019 | 해당 없음(번들 폰트) | 해당 없음(@fontsource 번들) | `client/index.html`<br>`client/vite.config.js`<br>`main.js`<br>`ui/dom.js`<br>`styles/base.css`<br>`styles/screens.css`<br>`styles/overlay.css` | `unit/foundation/isomorphic.test.js`<br>`unit/client/router.test.js` | 🔄 |
| FR-051 | 조작 연출 | UC-007 | ARCH-005 | 해당 없음(클라이언트 연출 전용) | 해당 없음(연출 상태) | `fx/particle-pool.js`<br>`fx/screen-shake.js`<br>`fx/hitstop.js`<br>`fx/fx-intensity.js` | `unit/fx/fx-intensity.test.js`<br>`unit/fx/particle-pool.test.js` | 🔄 |
| FR-052 | 삭제 연출 | UC-007 | ARCH-005 | 해당 없음(클라이언트 엔진 판정 기반 연출) | 해당 없음(연출 상태) | `fx/particle-pool.js`<br>`fx/screen-shake.js`<br>`fx/hitstop.js`<br>`fx/fx-intensity.js`<br>`fx/filters.js`<br>`fx/projectiles.js`<br>`fx/overlay-fx.js`<br>`fx/text-pop.js`<br>`fx/victory-fx.js`<br>`fx/feedback-sync.js` | `unit/fx/fx-intensity.test.js`<br>`unit/fx/particle-pool.test.js`<br>`unit/fx/feedback-sync.test.js` | 🔄 |
| FR-053 | 공격 연출 | UC-008 | ARCH-005 | API-254, API-255 | 해당 없음(연출 상태) | `fx/filters.js`<br>`fx/projectiles.js`<br>`fx/overlay-fx.js` | `unit/fx/feedback-sync.test.js` | 🔄 |
| FR-054 | 영·천사·스킬 등장 연출 | UC-008, UC-010 | ARCH-005, ARCH-006 | API-254, API-255 | TBL-102, TBL-103, TBL-106 | `fx/filters.js`<br>`fx/projectiles.js`<br>`fx/overlay-fx.js` | `unit/fx/feedback-sync.test.js` | 🔄 |
| FR-055 | 위기 연출·위험선 | UC-007, UC-012 | ARCH-002, ARCH-005, ARCH-006 | API-203 | TBL-108 | `net/protocol.js`<br>`engine/rng.js`<br>`engine/pieces.js`<br>`engine/encode.js`<br>`engine/danger.js`<br>`battle/battle-controller.js`<br>`fx/particle-pool.js`<br>`fx/screen-shake.js`<br>`fx/hitstop.js`<br>`fx/fx-intensity.js`<br>`fx/filters.js`<br>`fx/projectiles.js`<br>`fx/overlay-fx.js`<br>`fx/text-pop.js`<br>`fx/victory-fx.js`<br>`fx/feedback-sync.js`<br>`audio/audio-engine.js`<br>`audio/sfx-play.js`<br>`audio/sfx-battle.js`<br>`audio/bgm.js` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/battle/effect-applier.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/fx/fx-intensity.test.js`<br>`unit/fx/particle-pool.test.js`<br>`unit/fx/feedback-sync.test.js`<br>`unit/audio/audio-engine.test.js`<br>`unit/audio/sfx.test.js`<br>`unit/audio/bgm.test.js` | 🔄 |
| FR-056 | 승리·패배 연출 | UC-015 | ARCH-005, ARCH-006 | API-262 | TBL-106 | `fx/text-pop.js`<br>`fx/victory-fx.js`<br>`fx/feedback-sync.js`<br>`screens/result-screen.js`<br>`ui/verse-card.js` | `unit/fx/feedback-sync.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-057 | 연출 세기 옵션 | UC-020 | ARCH-001, ARCH-005 | 해당 없음(클라이언트 옵션) | 해당 없음(옵션 미저장 — N-04) | `fx/particle-pool.js`<br>`fx/screen-shake.js`<br>`fx/hitstop.js`<br>`fx/fx-intensity.js`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js` | `unit/fx/fx-intensity.test.js`<br>`unit/fx/particle-pool.test.js`<br>`unit/fx/feedback-sync.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-058 | 효과음 | UC-007, UC-020 | ARCH-006 | 해당 없음(클라이언트 합성) | 해당 없음(음원 파일 없음 — C-007) | `audio/audio-engine.js`<br>`audio/sfx-play.js`<br>`audio/sfx-battle.js`<br>`audio/bgm.js` | `unit/audio/audio-engine.test.js`<br>`unit/audio/sfx.test.js`<br>`unit/audio/bgm.test.js` | 🔄 |
| FR-059 | 배경음악 | UC-007, UC-020 | ARCH-006 | 해당 없음(클라이언트 합성) | 해당 없음(음원 파일 없음 — C-007) | `audio/audio-engine.js`<br>`audio/sfx-play.js`<br>`audio/sfx-battle.js`<br>`audio/bgm.js` | `unit/audio/audio-engine.test.js`<br>`unit/audio/sfx.test.js`<br>`unit/audio/bgm.test.js` | 🔄 |
| FR-060 | 음량 조절 | UC-020 | ARCH-001, ARCH-006 | 해당 없음(클라이언트 옵션) | 해당 없음(옵션 미저장 — N-04) | `audio/audio-engine.js`<br>`audio/sfx-play.js`<br>`audio/sfx-battle.js`<br>`audio/bgm.js`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js` | `unit/audio/audio-engine.test.js`<br>`unit/audio/sfx.test.js`<br>`unit/audio/bgm.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-061 | 타격 피드백 동기화 | UC-007 | ARCH-005, ARCH-006 | 해당 없음(같은 프레임 클라이언트 처리) | 해당 없음(연출 상태) | `battle/battle-controller.js`<br>`fx/particle-pool.js`<br>`fx/screen-shake.js`<br>`fx/hitstop.js`<br>`fx/fx-intensity.js`<br>`fx/text-pop.js`<br>`fx/victory-fx.js`<br>`fx/feedback-sync.js` | `unit/battle/effect-applier.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/fx/fx-intensity.test.js`<br>`unit/fx/particle-pool.test.js`<br>`unit/fx/feedback-sync.test.js` | 🔄 |
| FR-062 | 실력 보정 "은혜(Grace)" | UC-008, UC-015 | ARCH-012, ARCH-016 | API-252, API-256 | TBL-003, TBL-108 | `worker/room/faith.ts`<br>`worker/room/grace.ts`<br>`worker/room/round-flow.ts`<br>`render/background-parallax.js`<br>`render/hud-view.js` | `unit/room/faith-grace.test.ts`<br>`unit/room/round-flow.test.ts`<br>`unit/render/layout-skin.test.js` | 🔄 |
| FR-063 | 말씀 카드 | UC-015 | ARCH-016, ARCH-022 | API-262 | TBL-002, TBL-106 | `worker/room/quiz-duel.ts`<br>`worker/room/representative-verse.ts`<br>`screens/result-screen.js`<br>`ui/verse-card.js` | `unit/room/quiz-duel.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-064 | 감정 표현 리액션 | UC-017 | ARCH-017, ARCH-022 | API-209, API-260 | 해당 없음(CODE-010 고정 목록) | `battle/input-keyboard.js`<br>`battle/input-touch.js`<br>`worker/room/message-router.ts`<br>`ui/quiz-panel.js`<br>`ui/reactions.js`<br>`ui/toast.js` | `unit/engine/game.test.js`<br>`unit/room/message-router.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-065 | 업적 | UC-015 | ARCH-016 | API-262 | TBL-004, TBL-109 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`worker/elo.ts`<br>`worker/results/personal-record.ts`<br>`worker/results/achievements.ts`<br>`screens/result-screen.js`<br>`ui/verse-card.js` | `unit/foundation/protocol-content.test.js`<br>`unit/results/elo-achievements.test.ts`<br>`unit/results/personal-record.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-066 | 개인 기록·성장 수치 | UC-015 | ARCH-016 | API-262 | TBL-002, TBL-003 | `worker/elo.ts`<br>`worker/results/personal-record.ts`<br>`worker/results/achievements.ts`<br>`screens/result-screen.js`<br>`ui/verse-card.js` | `unit/results/elo-achievements.test.ts`<br>`unit/results/personal-record.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-067 | 플레이어 진행 기록 | UC-014, UC-015 | ARCH-015, ARCH-016 | API-252, API-262 | TBL-003, TBL-004 | `worker/store/store.ts`<br>`worker/room/round-flow.ts`<br>`worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`worker/results/record-match.ts` | `unit/store/do-sqlite-store.test.ts`<br>`unit/room/round-flow.test.ts`<br>`unit/results/elo-achievements.test.ts` | 🔄 |
| FR-068 | 경기 결과 저장 | UC-015 | ARCH-015, ARCH-016 | API-262 | TBL-002 | `worker/store/store.ts`<br>`worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`worker/results/record-match.ts` | `unit/store/do-sqlite-store.test.ts`<br>`unit/results/elo-achievements.test.ts` | 🔄 |
| FR-069 | 전적 조회 | UC-018 | ARCH-009, ARCH-015 | API-003 | TBL-002 | `worker/store/store.ts`<br>`worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`worker/http/guest-routes.ts`<br>`worker/http/records-routes.ts`<br>`worker/http/ranking-routes.ts`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js` | `unit/store/do-sqlite-store.test.ts`<br>`unit/http/guest-routes.test.ts`<br>`unit/http/query-routes.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-070 | Elo 레이팅 갱신 | UC-015, UC-019 | ARCH-016 | API-262 | TBL-001 | `worker/store/store.ts`<br>`worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`worker/elo.ts`<br>`worker/results/personal-record.ts`<br>`worker/results/achievements.ts`<br>`worker/results/record-match.ts`<br>`screens/result-screen.js`<br>`ui/verse-card.js` | `unit/store/do-sqlite-store.test.ts`<br>`unit/results/elo-achievements.test.ts`<br>`unit/results/personal-record.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-071 | 랭킹 조회 | UC-019 | ARCH-009, ARCH-015 | API-004 | TBL-001, TBL-006 | `worker/store/store.ts`<br>`worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`worker/http/guest-routes.ts`<br>`worker/http/records-routes.ts`<br>`worker/http/ranking-routes.ts`<br>`screens/records-screen.js`<br>`screens/ranking-screen.js`<br>`screens/options-screen.js` | `unit/store/do-sqlite-store.test.ts`<br>`unit/http/guest-routes.test.ts`<br>`unit/http/query-routes.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| FR-072 | 저장소 어댑터 자동 전환 | UC-021 | ARCH-015 | API-001~004 (저장 경로) | TBL-001~004, TBL-006, TBL-007 | `worker/wrangler.toml`<br>`worker/env.ts`<br>`worker/store/store.ts`<br>`worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`supabase/migrations/0001_init.sql`<br>`worker/store/supabase-store.ts`<br>`worker/store/select-store.ts`<br>`worker/store/do-store-client.ts`<br>`worker/matchmaker.ts` | `unit/foundation/protocol-content.test.js`<br>`unit/store/do-sqlite-store.test.ts`<br>`unit/store/select-store.test.ts`<br>`unit/matchmaking/queue.test.ts` | 🔄 |
| FR-073 | 단일 명령 로컬 실행 | UC-021 | ARCH-019 | API-005, API-006 (Vite 프록시 경유) | TBL-007 | `package.json`<br>`scripts/dev.mjs`<br>`client/index.html`<br>`client/vite.config.js`<br>`worker/wrangler.toml`<br>`worker/env.ts`<br>`worker/index.ts`<br>`worker/http/router.ts`<br>`worker/http/respond.ts` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/http/guest-routes.test.ts`<br>`unit/integration/bot-guard.test.ts` | 🔄 |
| FR-074 | 공용 게임 콘텐츠 | UC-021 | ARCH-018 | API-255, API-257 | TBL-101~109 | `client/index.html`<br>`client/vite.config.js`<br>`content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`content/verses.json`<br>`content/quiz.json`<br>`scripts/check-content.mjs` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/content/check-content.test.js` | 🔄 |
| FR-075 | 단위 테스트 (Vitest) | UC-022 | ARCH-020 | API-204, API-254 (attack 계산 대상) | TBL-108 | `(코드 없음 — 통합 검증만)` | `unit/foundation/protocol-content.test.js`<br>`unit/foundation/isomorphic.test.js`<br>`unit/engine/bag-srs.test.js`<br>`unit/engine/board.test.js`<br>`unit/engine/scoring.test.js`<br>`unit/engine/specials-gravity.test.js`<br>`unit/engine/game.test.js`<br>`unit/battle/effect-applier.test.js`<br>`unit/battle/interference-client.test.js`<br>`unit/room/attack.test.ts`<br>`unit/room/interference.test.ts`<br>`unit/room/progress-guard.test.ts`<br>`unit/room/faith-grace.test.ts`<br>`unit/room/hero-skills.test.ts`<br>`unit/room/angels.test.ts`<br>`unit/room/armor.test.ts`<br>`unit/room/jesus-specials.test.ts`<br>`unit/room/round-flow.test.ts`<br>`unit/room/message-router.test.ts`<br>`unit/store/do-sqlite-store.test.ts`<br>`unit/store/select-store.test.ts`<br>`unit/results/elo-achievements.test.ts`<br>`unit/results/personal-record.test.ts`<br>`unit/protocol/token-nickname.test.ts`<br>`unit/protocol/validate.test.ts`<br>`unit/protocol/rate-limit.test.ts`<br>`unit/http/guest-routes.test.ts`<br>`unit/http/query-routes.test.ts`<br>`unit/matchmaking/queue.test.ts`<br>`unit/matchmaking/invite-codes.test.ts`<br>`unit/fx/fx-intensity.test.js`<br>`unit/fx/feedback-sync.test.js`<br>`unit/fx/particle-pool.test.js` | 🔄 |
| FR-076 | 콘텐츠 검사 스크립트 | UC-022 | ARCH-018, ARCH-020 | 해당 없음(오프라인 검사 스크립트) | TBL-101~109 | `content/verses.json`<br>`content/quiz.json`<br>`scripts/check-content.mjs` | `unit/content/check-content.test.js` | 🔄 |
| FR-077 | E2E 테스트 (Playwright) | UC-022 | ARCH-020 | API-204, API-205, API-206, API-254 | TBL-001, TBL-002 | `(코드 없음 — 통합 검증만)` | `e2e/battle-two-browsers.spec.js` | 🔄 |
| FR-078 | 화면 흐름 | UC-001, UC-002 | ARCH-001 | API-001, API-005, API-153 | TBL-201 | `main.js`<br>`ui/dom.js`<br>`styles/base.css`<br>`styles/screens.css`<br>`styles/overlay.css`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js` | `unit/client/router.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| NFR-001 | 렌더링 60fps (중급 모바일), 파티클 오브젝트 풀링 | UC-007 | ARCH-004, ARCH-005 | 해당 없음(렌더링 성능) | 해당 없음(렌더링 성능) | `render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js`<br>`fx/particle-pool.js`<br>`fx/screen-shake.js`<br>`fx/hitstop.js`<br>`fx/fx-intensity.js` | `unit/render/layout-skin.test.js`<br>`unit/fx/fx-intensity.test.js`<br>`unit/fx/particle-pool.test.js` | 🔄 |
| NFR-002 | 공격 반영 지연 100ms 이하 | UC-008 | ARCH-011, ARCH-012 | API-204, API-254 | 해당 없음(핫패스 저장소 접근 0회 — architecture §4.3) | `battle/battle-controller.js`<br>`worker/room/message-router.ts` | `unit/battle/effect-applier.test.js`<br>`e2e/battle-two-browsers.spec.js`<br>`unit/room/message-router.test.ts` | 🔄 |
| NFR-003 | 서버 메시지 스키마·게스트 토큰·닉네임·빈도 검증 | UC-001, UC-008 | ARCH-009, ARCH-017, ARCH-021 | API-001, API-101, API-201, API-290 | TBL-001 | `net/protocol.js`<br>`engine/rng.js`<br>`engine/pieces.js`<br>`engine/encode.js`<br>`engine/danger.js`<br>`worker/room/message-router.ts`<br>`worker/game-room.ts`<br>`worker/auth/token.ts`<br>`worker/auth/nickname.ts`<br>`worker/protocol/validate.ts`<br>`worker/protocol/rate-limit.ts`<br>`worker/index.ts`<br>`worker/http/router.ts`<br>`worker/http/respond.ts`<br>`worker/http/guest-routes.ts`<br>`worker/http/records-routes.ts`<br>`worker/http/ranking-routes.ts`<br>`worker/matchmaker.ts` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/room/message-router.test.ts`<br>`unit/integration/bot-guard.test.ts`<br>`unit/protocol/token-nickname.test.ts`<br>`unit/protocol/validate.test.ts`<br>`unit/protocol/rate-limit.test.ts`<br>`unit/http/guest-routes.test.ts`<br>`unit/http/query-routes.test.ts`<br>`unit/matchmaking/queue.test.ts` | 🔄 |
| NFR-004 | Supabase service role 키 클라이언트 비노출 | UC-021 | ARCH-015, ARCH-021 | API-001~006 (클라이언트에 키 미노출) | TBL-001~004 (Supabase 모드 service role 전용) | `client/index.html`<br>`client/vite.config.js`<br>`worker/wrangler.toml`<br>`worker/env.ts`<br>`supabase/migrations/0001_init.sql`<br>`worker/store/supabase-store.ts` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/store/select-store.test.ts` | 🔄 |
| NFR-005 | 외부 네트워크 리소스 없이 로컬 번들 자산으로 동작 | UC-021 | ARCH-004, ARCH-006, ARCH-019 | 해당 없음(외부 요청 0건) | 해당 없음(번들 자산) | `client/index.html`<br>`client/vite.config.js`<br>`render/pixi-app.js`<br>`render/piece-skin.js`<br>`render/board-view.js`<br>`render/background-parallax.js`<br>`render/hud-view.js`<br>`render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js`<br>`audio/audio-engine.js`<br>`audio/sfx-play.js`<br>`audio/sfx-battle.js`<br>`audio/bgm.js`<br>`main.js`<br>`ui/dom.js`<br>`styles/base.css`<br>`styles/screens.css`<br>`styles/overlay.css` | `unit/foundation/isomorphic.test.js`<br>`unit/render/layout-skin.test.js`<br>`unit/audio/audio-engine.test.js`<br>`unit/audio/sfx.test.js`<br>`unit/audio/bgm.test.js`<br>`unit/client/router.test.js` | 🔄 |
| NFR-006 | 첨부 B 체크리스트 8항목 충족 매핑 | UC-007, UC-008, UC-013, UC-015 | ARCH-005, ARCH-013, ARCH-016 | API-257~259, API-262 | TBL-108 | `fx/text-pop.js`<br>`fx/victory-fx.js`<br>`fx/feedback-sync.js` | `unit/fx/feedback-sync.test.js` | 🔄 |
| NFR-007 | 라이브러리 최신 안정판 lockfile 고정, 2주 미만 버전 회피 | UC-021 | ARCH-019 | 해당 없음(의존성 관리) | 해당 없음(package-lock.json) | `package.json`<br>`scripts/dev.mjs` | `unit/foundation/isomorphic.test.js` | 🔄 |
| NFR-008 | 수집 정보 최소화 (닉네임·게스트 ID·토큰·경기 기록) | UC-001 | ARCH-008, ARCH-021 | API-001 | TBL-001, TBL-201 | `worker/store/do-sqlite-schema.ts`<br>`worker/store/do-sqlite-store.ts`<br>`supabase/migrations/0001_init.sql`<br>`worker/store/supabase-store.ts`<br>`worker/store/select-store.ts`<br>`worker/store/do-store-client.ts`<br>`worker/auth/token.ts`<br>`worker/auth/nickname.ts`<br>`auth/guest-session.js` | `unit/store/do-sqlite-store.test.ts`<br>`unit/store/select-store.test.ts`<br>`unit/protocol/token-nickname.test.ts`<br>`unit/client/guest-session.test.js` | 🔄 |
| C-001 | 현금 결제·가챠 영구 금지 | UC-014 | ARCH-012 | 해당 없음(결제 API 없음) | 해당 없음(결제 테이블 없음) | `screens/entry-screen.js`<br>`screens/lobby-screen.js` | `unit/client/view-format.test.js` | 🔄 |
| C-002 | 예수님 표현 원칙 (선택 불가, 빛·실루엣, 경기당 1회 이벤트) | UC-012 | ARCH-004, ARCH-012 | API-255 | TBL-106 | `worker/room/jesus-event.ts`<br>`worker/room/specials.ts`<br>`render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js` | `unit/room/jesus-specials.test.ts`<br>`unit/render/layout-skin.test.js` | 🔄 |
| C-003 | KJV 1769 원문, 한국어 직접 번역, 출처 장·절 표기 | UC-013, UC-015 | ARCH-018 | API-255, API-259 | TBL-106 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`screens/result-screen.js`<br>`ui/verse-card.js`<br>`content/verses.json`<br>`content/quiz.json`<br>`scripts/check-content.mjs` | `unit/foundation/protocol-content.test.js`<br>`unit/client/view-format.test.js`<br>`unit/content/check-content.test.js` | 🔄 |
| C-004 | 외부 서비스 키 0개로 동작 | UC-021 | ARCH-015, ARCH-019 | API-001~006 (로컬 경로) | TBL-007 | `package.json`<br>`scripts/dev.mjs`<br>`worker/wrangler.toml`<br>`worker/env.ts`<br>`worker/store/select-store.ts`<br>`worker/store/do-store-client.ts` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/store/select-store.test.ts` | 🔄 |
| C-005 | 기술 스택 고정 (Vite·PixiJS v8·Workers+DO·DO SQLite·Vitest·Playwright 등) | UC-021 | ARCH-019 (전 계층 스택 — architecture §3) | API-005, API-006 (Workers + DO WebSocket) | TBL-001~007 (DO SQLite) | `package.json`<br>`scripts/dev.mjs`<br>`client/index.html`<br>`client/vite.config.js`<br>`main.js`<br>`ui/dom.js`<br>`styles/base.css`<br>`styles/screens.css`<br>`styles/overlay.css` | `unit/foundation/isomorphic.test.js`<br>`unit/client/router.test.js` | 🔄 |
| C-006 | Socket.IO·Express 미사용 | UC-003 | ARCH-007, ARCH-009 | API-005, API-006 | 해당 없음(전송 계층) | `net/protocol.js`<br>`engine/rng.js`<br>`engine/pieces.js`<br>`engine/encode.js`<br>`engine/danger.js`<br>`worker/http/ws-routes.ts`<br>`net/socket.js`<br>`net/lobby-client.js`<br>`net/room-client.js`<br>`net/http-api.js` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/http/guest-routes.test.ts`<br>`unit/client/http-api.test.js`<br>`unit/client/net-clients.test.js` | 🔄 |
| C-007 | 녹음 음원·일러스트 미사용 (코드 합성·코드 그래픽) | UC-007, UC-020 | ARCH-004, ARCH-006 | 해당 없음(클라이언트 생성 자산) | 해당 없음(에셋 파일 없음) | `render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js`<br>`audio/audio-engine.js`<br>`audio/sfx-play.js`<br>`audio/sfx-battle.js`<br>`audio/bgm.js` | `unit/render/layout-skin.test.js`<br>`unit/audio/audio-engine.test.js`<br>`unit/audio/sfx.test.js`<br>`unit/audio/bgm.test.js` | 🔄 |
| C-008 | 이번 실행 제외 범위 구현 금지 | UC-002 | ARCH-001 (제외 범위 미설계 — architecture D-34) | 해당 없음(로그인·배포 API 없음) | 해당 없음(unlocks 미생성) | `worker/wrangler.toml`<br>`worker/env.ts`<br>`screens/entry-screen.js`<br>`screens/lobby-screen.js` | `unit/foundation/protocol-content.test.js`<br>`unit/client/view-format.test.js` | 🔄 |
| C-009 | 채팅 없음 (리액션만) | UC-017 | ARCH-017, ARCH-022 | API-209, API-260 | 해당 없음(자유 텍스트 저장 없음) | `net/protocol.js`<br>`engine/rng.js`<br>`engine/pieces.js`<br>`engine/encode.js`<br>`engine/danger.js`<br>`worker/protocol/validate.ts`<br>`worker/protocol/rate-limit.ts`<br>`ui/quiz-panel.js`<br>`ui/reactions.js`<br>`ui/toast.js` | `unit/foundation/isomorphic.test.js`<br>`unit/foundation/protocol-content.test.js`<br>`unit/protocol/validate.test.ts`<br>`unit/protocol/rate-limit.test.ts`<br>`unit/client/view-format.test.js` | 🔄 |
| C-010 | KJV 근거 없는 존재 미등장, 모든 캐릭터 근거 구절 표시 | UC-002, UC-008 | ARCH-018, ARCH-020 | 해당 없음(콘텐츠 규칙) | TBL-101~103, TBL-106 | `content/*.json`<br>`worker/content.ts`<br>`content/content-loader.js`<br>`content/verses.json`<br>`content/quiz.json`<br>`scripts/check-content.mjs` | `unit/foundation/protocol-content.test.js`<br>`unit/content/check-content.test.js` | 🔄 |
| C-011 | 고어·선정 표현 금지 (전 연령) | UC-008 | ARCH-004, ARCH-005 | 해당 없음(연출 규칙) | TBL-103 (art 규칙) | `render/emblems.js`<br>`render/spirits-art.js`<br>`render/angels-art.js`<br>`render/jesus-light.js`<br>`fx/particle-pool.js`<br>`fx/screen-shake.js`<br>`fx/hitstop.js`<br>`fx/fx-intensity.js`<br>`fx/filters.js`<br>`fx/projectiles.js`<br>`fx/overlay-fx.js`<br>`fx/text-pop.js`<br>`fx/victory-fx.js`<br>`fx/feedback-sync.js` | `unit/render/layout-skin.test.js`<br>`unit/fx/fx-intensity.test.js`<br>`unit/fx/particle-pool.test.js`<br>`unit/fx/feedback-sync.test.js` | 🔄 |
| C-012 | 소스는 fruit-열매/ 아래 첨부 A §4.5 구조 | UC-021 | ARCH-019 | 해당 없음(폴더 구조 — architecture §5) | 해당 없음(폴더 구조) | `package.json`<br>`scripts/dev.mjs` | `unit/foundation/isomorphic.test.js` | 🔄 |
| C-013 | backup/ 폴더 git 미커밋·비공개 | UC-021 | ARCH-021 | 해당 없음(.gitignore 규칙) | 해당 없음(.gitignore 규칙) | `package.json`<br>`scripts/dev.mjs` | `unit/foundation/isomorphic.test.js` | 🔄 |

> 행 구성: 상위 요구사항(REQ) 17행 → 기능 요구사항(FR) 78행 → 비기능 요구사항(NFR) 8행 → 제약 조건(C) 13행 = 116행. 예시(`rtm-covenant-언약추적-example.md`)와 같이 REQ·FR·NFR를 한 매트릭스에 두고, 명세서의 제약 조건(C)도 "하나도 잃어버리지 않겠다"(John 6:39) 원칙에 따라 함께 등재한다.
> FR의 상위 REQ는 `spec-tablet-명세서.md` §4.1 "하위 FR" 열이 원본이다.

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
> Phase 2 시점의 커버리지(✅ 비율) 0%는 정상이다 — ✅는 설계→구현→테스트 전 구간 연결이며 Phase 5 이후에 가능하다. Phase 2 열 충족률: UC 116/116, ARCH-ID 116/116, API-ID 116/116, TBL-ID 116/116 (각 100%, "해당 없음(사유)" 판단 기재 포함). (Phase 1 기록: 🔄 0 / ⬜ 116)
> 수치는 `.skill/tools-도구/census-count-언약계수.py`의 실계수로 대조한다 (§6).

---

## 4. 미추적 항목 목록

> Phase 2 완료 시점: 미추적(⬜) 0건. 116건 전부 부분 추적(🔄)이며, 남은 연결 구간은 아래와 같다.

| 구분 | 대상 ID | 남은 미연결 구간 | 연결 예정 Phase |
|:---|:---|:---|:---|
| 상위 요구사항 | REQ-001 ~ REQ-017 (17건) | 코드 모듈·테스트 ID 미연결 (UC·ARCH·API·TBL 연결 완료) | Phase 3 (화면 확인), Phase 4 (코드), Phase 5 (테스트) |
| 기능 요구사항 | FR-001 ~ FR-078 (78건) | 같은 사유 | Phase 3 → 4 → 5 |
| 비기능 요구사항 | NFR-001 ~ NFR-008 (8건) | 같은 사유 | Phase 4, Phase 5 (측정 테스트) |
| 제약 조건 | C-001 ~ C-013 (13건) | 같은 사유 | Phase 4, Phase 6 (감사) |

> Phase 3 완료 시점: "화면 확인" 구간 완료 — 116건 중 화면 연결 103건, 화면이 없는 요구사항 13건은 "해당 없음(사유)" 기재 (§7). 남은 연결 구간은 코드 모듈(Phase 4)·테스트 ID(Phase 5).
> 의도적 제외(❌) 0건. 이번 실행 제외 범위(스토리 모드, 위인 11명, 열두 제자 카드, 구글·카카오 로그인, 실제 배포, 녹음 음원·일러스트)는 REQ로 등록하지 않았으며, "구현하지 않는다"는 사실 자체를 제약 조건 C-007·C-008로 추적한다.
> UX 확장 코너의 NICE-TO-HAVE(N-01~N-06)는 요구사항이 아니므로 이 매트릭스에 등재하지 않는다 (자동 모드 — 승격 금지). 승인되어 REQ로 승격되면 그때 새 REQ-ID로 등재한다.

---

## 5. 설계 변경 이력 (Design Change Log — 두 번째 돌판 규칙)

> 정경화(2026-10-19, Phase 1) 이후 상류 설계 변경: **0건** (Phase 2 갱신은 언약추적 갱신 규칙에 따른 ARCH/API/TBL 열 기재와 상태 전환뿐이며, Phase 1 요구사항 원문·ID·UC 연결은 바뀌지 않았다). 첫 변경이 발생하면 템플릿 "재각 규칙 1" 형식(변경일 · 발견 Phase/지역 · 대상 ID · 변경 사유 · 영향받는 하류 산출물 · 재검증 필요 여부 · 상태)의 표를 이 절에 추가하고, 두 증인 확정(재각 규칙 3)을 통과한 변경만 기록한다.
>
> **Phase 4 기반 단계(2026-10-20)에 첫 변경 1건이 발생했다.** 두 증인(npm 설치 오류 로그 + 독립 재현·드라이브 매핑 확인)은 `architecture-temple-성전설계.md` §15 R1에 있다. Phase 1 요구사항 원문·ID는 바뀌지 않았고(FR-073 문장 그대로), 116행 상태는 모두 🔄 그대로다.

| 변경일 | 발견 Phase/지역 | 대상 ID(REQ/ARCH/API/TBL) | 변경 사유 | 영향받는 하류 산출물 | 재검증 필요 여부 | 상태 |
|:---|:---|:---|:---|:---|:---:|:---:|
| 2026-10-20 | Phase 4 / acts-행전 예루살렘(00) 기반 배치 — TASK-001 | ARCH-019 (D-29, architecture §3.2·§4.6·§5.2·§5.3) — 관련 REQ-016, FR-073 | 개발 PC `D:`(원격 데스크톱 리디렉션 드라이브)가 junction·symlink를 만들 수 없어 npm workspaces 링크가 `EISDIR`로 실패 → workspaces 없는 단일 `fruit-열매/package.json` 루트로 재각 (R1) | `task-wall-성벽.md` TASK-001~003, `devguide-commandment-개발계명.md` §1·§2, `fruit-열매/package.json`·`scripts/dev.mjs` | ✅ (Phase 5 UC-021 단일 명령 실행 검증) | 🔄 |
| 2026-10-20 | Phase 4 / 통합 TASK-090 (여호수아) | devguide D4-15 (HUD Pixi/DOM 분담) — 관련 FR-062, design-vision HUD-15·EVT-52 | 은혜 ✧ 위치가 D4-15(Pixi)와 design-vision §3.5 HUD-15("내 닉네임 오른쪽", DOM)로 충돌 → 상류 설계(design-vision) 문자대로 DOM 단일화, D4-15 개정 | `devguide` D4-15·§7.9, `render/hud-view.js`, `screens/battle-screen.js`, `styles/screens.css` | ✅ (Phase 5 SCR-005 확인) | 🔄 |
| 2026-10-20 | Phase 4 / 통합 TASK-090 | devguide D4-20 (EVT-51 실행 위치) — 관련 FR-007, UC-016 | 이탈 승리 팡파르 이중 실행 → design-vision EVT-51 문자대로 feedback-sync 1회 연쇄로 확정 | `devguide` §8 D4-20, `screens/battle-screen.js`, `screens/result-screen.js` | ✅ | 🔄 |
| 2026-10-20 | Phase 4 / 통합 TASK-090 | devguide D4-21·D4-22 — 관련 FR-032, FR-064, NFR-003, api-gate R-02·R-04·API-209 | INVALID_REACTION 사상 위치 명시, 봇 장부 seq 라운드 초기화, garbageIn 상한(서버 송신 누계) 추가 — api-gate 규칙 자체는 불변, 모듈 경계만 구체화 | `devguide` §8, `game-room.ts`, `room/round-flow.ts`, `room/progress-guard.ts`, `room/message-router.ts` | ✅ (Phase 5 R-04 반례 시험) | 🔄 |
| 2026-10-20 | Phase 4 / 통합 TASK-090 | task-wall §2 분할표 (생성 파일) — 관련 REQ-017, FR-075 | 계획 외 파일 10개(`ui/dom.js`, 오디오·렌더·클라이언트 테스트 8개, 통합 검사 1개)와 300줄 초과 5개를 실제에 맞춰 task-wall §2.5·§2.6에 반영 (Spec-First 사후 정합) | `task-wall` §2.5·§2.6, `devguide` D4-19 | ❌ (문서 정합만) | ✅ |
| 2026-10-20 | Phase 4 / TASK-090 통합 (여호수아 헤드리스 스모크) | API 보안 표 CSP (api-gate §보안, devguide §3.3-7) — 관련 REQ-013, FR-058, C-007 | Tone.js가 컨텍스트 시계용 blob Worker를 쓰는데 CSP(`worker-src` 미지정 → `script-src 'self'`)가 차단 → 시계가 timeout으로 대체되어 BGM 타이밍 오류 발생. 두 증인: 브라우저 콘솔 CSP 위반 로그 + `bgm-loop` 타이밍 오류 로그. 모세 승인으로 `worker-src 'self' blob:` 추가 (스크립트 출처는 그대로 `'self'`) | `api-gate-성문.md`, `devguide-commandment-개발계명.md`, `fruit-열매/client/index.html` | ✅ (Phase 5 콘솔 오류 0건 확인) | 🔄 |

---

## 6. 언약 계수 (Census) 실행 기록

| 항목 | 내용 |
|:---|:---|
| 실행 명령 | `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --log` |
| 실행 시각 | 2026-10-19 14:17:46 (UTC) |
| 실계수 고유 ID | 116 (✅ 0 / 🔄 0 / ⬜ 116 / ❌ 0) |
| 문서 기재값 대조 | 전체 116 = 116, 완전 0 = 0, 부분 0 = 0, 미추적 116 = 116, 커버리지 0.0% = 0.0% — 5항목 전부 일치 |
| spec-tablet 원문 대조 | spec-tablet ID 116개 전부 RTM에 등재 (미등재 0건) |
| 중복 등재 | 0건 |
| 최종 판정 | **✅ IRONCLAD** (exit 0) — 기록의 서 `fruit-열매/history/2026-10-19.md`에 자동 기록됨 |

> AI의 자기신고가 아니라 계수기 출력이 증거다 (UTIL-census-언약계수.md). Phase 2·4·5·6·7 완료 직전에 `--phase N`으로 다시 계수한다.

### 6.2 Phase 2 완료 계수 (2026-10-20 00:01:25, 로컬 시각)

| 항목 | 내용 |
|:---|:---|
| 정식 명령 | `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 2 --log` |
| 정식 명령 실행 결과 | **실행 불가** — 이 PC의 `python`은 Microsoft Store 실행 별칭(`WindowsApps\python.exe`, 0바이트)뿐이고 실제 Python이 설치되어 있지 않아 exit 49로 즉시 종료 (샌드박스 해제 상태에서도 동일) |
| 대체 실행 | 같은 계수 알고리즘(표 파싱·요약 대조·spec-tablet 원문 대조·Phase 2 열 검사)을 Node.js v24.18.0으로 1:1 이식한 임시 계수기를 프로젝트 밖 임시 경로에서 실행 (산출물 아님, `.skill/` 원본 미수정) |
| 실계수 고유 ID | 116 (✅ 0 / 🔄 116 / ⬜ 0 / ❌ 0) |
| 문서 기재값 대조 | 전체 116 = 116, 완전 0 = 0, 부분 116 = 116, 미추적 0 = 0, 커버리지 0% = 0% — 5항목 전부 일치 |
| spec-tablet 원문 대조 | 원문 ID 116개 전부 RTM 등재 (미등재 0건) |
| Phase 2 열 검사 | ARCH-ID 미기재 0건 · API-ID 미기재 0건 · TBL-ID 미기재 0건 |
| 중복 등재 | 0건 |
| 대체 계수 판정 | **✅ IRONCLAD 동등** (exit 0) — 결과는 기록의 서 `fruit-열매/history/2026-10-19.md`에 수기 기록 |
| 후속 조치 | Python 설치 후 정식 명령을 재실행하여 이 표와 대조한다 (Phase 3 착수 전 권장) |

### 6.3 Phase 3 완료 계수 (2026-10-20 00:29:07, 로컬 시각)

| 항목 | 내용 |
|:---|:---|
| 정식 명령 | `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 3` |
| 정식 명령 실행 결과 | **실행 불가** — `python`은 여전히 Microsoft Store 실행 별칭(exit 49), `py` 실행기 없음 (Phase 2 후속 조치 미해소 — Python 미설치) |
| 대체 실행 | 같은 알고리즘(표 파싱·요약 대조·spec-tablet 원문 대조·Phase별 열 검사)을 Node.js로 1:1 이식한 임시 계수기를 프로젝트 밖 임시 경로(`%TEMP%`)에서 실행 — Phase 2 이식본과 별개로 이번 세션에서 원본 `.py`를 다시 읽고 새로 이식함 (산출물 아님, `.skill/` 원본 미수정) |
| 실계수 고유 ID | 116 (✅ 0 / 🔄 116 / ⬜ 0 / ❌ 0) |
| 문서 기재값 대조 | 전체 116 = 116, 완전 0 = 0, 부분 116 = 116, 미추적 0 = 0, 커버리지 0% = 0% — 5항목 전부 일치 |
| spec-tablet 원문 대조 | 원문 ID 116개 전부 RTM 등재 (미등재 0건) |
| Phase 3 열 검사 | 원본 계수기의 Phase별 필수 열 규칙에 Phase 3 항목이 없음(2·4·5·6·7만) → 열 검사 대상 없음 |
| 추가 검사 (이식본에만 추가, 원본 판정에 영향 없음) | §7 화면 연결 표에 기재된 ID 116개 = §1 매트릭스 116개 (누락 0 · 초과 0), "해당 없음" 13건 |
| 중복 등재 | 0건 |
| 대체 계수 판정 | **✅ IRONCLAD 동등** (exit 0) — 결과는 기록의 서 `fruit-열매/history/2026-10-20.md`에 수기 기록 |
| 후속 조치 | Python 설치 후 정식 명령을 재실행하여 §6.2·§6.3 표와 대조한다 |

### 6.4 Phase 4 통합 계수 (2026-10-20 03:20:26, 로컬 시각 — 여호수아 TASK-090)

| 항목 | 내용 |
|:---|:---|
| 정식 명령 | `python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 4 --log` (Python 3.12 전체 경로, `-I`) |
| 정식 명령 실행 결과 | **실행됨** — §6.2·§6.3의 Node 이식본 대신 원본 `.py`로 처음 정식 계수 |
| 실계수 고유 ID | 116 (✅ 0 / 🔄 116 / ⬜ 0 / ❌ 0) |
| 문서 기재값 대조 | 전체 116 = 116, 완전 0 = 0, 부분 116 = 116, 미추적 0 = 0, 커버리지 0.0% = 0.0% — 5항목 전부 일치 |
| spec-tablet 원문 대조 | 원문 ID 116개 전부 RTM 등재 (미등재 0건) |
| Phase 4 열 검사 | '코드 모듈' 열 미기재 0건 (테스트 ID 열도 116/116 기재 — Phase 5 검사 대상) |
| 최종 판정 | **✅ IRONCLAD** (exit 0) — 기록의 서 `fruit-열매/history/2026-10-20.md`에 자동 기록됨 |

---

## 7. 화면 연결 확인 (Phase 3 — 언약추적 갱신 규칙 "화면 관련 항목 연결 확인")

> 화면 정의는 [`screen-vision-화면설계.md`](../03.design-order-질서/screen-vision-화면설계.md) §1 (SCR-001 닉네임 입장 · SCR-002 로비 · SCR-003 캐릭터 선택 · SCR-004 매칭 대기·초대 코드 · SCR-005 대전 · SCR-006 결과 · SCR-007 전적 · SCR-008 랭킹 · SCR-009 옵션). "SCR-001~009"는 9개 화면 전부(아트·폰트·사운드·흐름처럼 모든 화면에 적용되는 요구사항). 화면이 없는 요구사항은 빈칸 대신 "해당 없음(사유)". 이 표는 §1 매트릭스와 별도이며 계수 대상(상태 열)이 아니다.

| 대상 ID | 연결 SCR-ID | 대상 ID | 연결 SCR-ID |
|:---|:---|:---|:---|
| REQ-001 | SCR-004, SCR-005, SCR-006 | REQ-002 | SCR-001 |
| REQ-003 | SCR-003, SCR-005 | REQ-004 | SCR-002, SCR-003, SCR-004 |
| REQ-005 | SCR-002, SCR-005 | REQ-006 | SCR-002, SCR-005, SCR-006 |
| REQ-007 | SCR-005 | REQ-008 | SCR-005 |
| REQ-009 | SCR-005 | REQ-010 | SCR-005 |
| REQ-011 | SCR-005 | REQ-012 | SCR-005 |
| REQ-013 | SCR-001~009 (핵심 SCR-005·006·009) | REQ-014 | SCR-006, SCR-007 |
| REQ-015 | SCR-006, SCR-008 | REQ-016 | 해당 없음(개발자 터미널 — UC-021) |
| REQ-017 | 해당 없음(개발자 터미널 — UC-022) | FR-001 | SCR-005 |
| FR-002 | SCR-005 | FR-003 | SCR-005 |
| FR-004 | SCR-005 | FR-005 | SCR-004, SCR-005 |
| FR-006 | SCR-005 | FR-007 | SCR-005, SCR-006 |
| FR-008 | SCR-004, SCR-005 | FR-009 | SCR-005, SCR-006 |
| FR-010 | SCR-005 | FR-011 | SCR-005 |
| FR-012 | SCR-001 | FR-013 | SCR-003 |
| FR-014 | SCR-003, SCR-005 | FR-015 | SCR-003, SCR-005 |
| FR-016 | SCR-003, SCR-005 | FR-017 | SCR-003, SCR-005 |
| FR-018 | SCR-004 | FR-019 | SCR-002, SCR-004 |
| FR-020 | SCR-004 | FR-021 | SCR-002, SCR-005 |
| FR-022 | SCR-005 | FR-023 | SCR-002, SCR-005, SCR-006 |
| FR-024 | SCR-005 | FR-025 | SCR-005 |
| FR-026 | SCR-005 | FR-027 | SCR-005 |
| FR-028 | SCR-005 | FR-029 | SCR-005 |
| FR-030 | SCR-005 | FR-031 | SCR-005 |
| FR-032 | SCR-005 | FR-033 | SCR-005 |
| FR-034 | SCR-005 | FR-035 | SCR-005 |
| FR-036 | SCR-005 | FR-037 | SCR-005 |
| FR-038 | SCR-005 | FR-039 | SCR-005 |
| FR-040 | SCR-005 | FR-041 | SCR-005 |
| FR-042 | SCR-005 | FR-043 | SCR-005 |
| FR-044 | SCR-005 | FR-045 | SCR-005 |
| FR-046 | SCR-005 | FR-047 | SCR-005 |
| FR-048 | SCR-001~009 | FR-049 | SCR-003, SCR-005 |
| FR-050 | SCR-001~009 | FR-051 | SCR-005 |
| FR-052 | SCR-005 | FR-053 | SCR-005 |
| FR-054 | SCR-005 | FR-055 | SCR-005 |
| FR-056 | SCR-005, SCR-006 | FR-057 | SCR-009 |
| FR-058 | SCR-005, SCR-006, SCR-009 | FR-059 | SCR-001~009 |
| FR-060 | SCR-009 | FR-061 | SCR-005 |
| FR-062 | SCR-005 | FR-063 | SCR-006 |
| FR-064 | SCR-005 | FR-065 | SCR-006 |
| FR-066 | SCR-006 | FR-067 | SCR-005, SCR-006 |
| FR-068 | SCR-006 | FR-069 | SCR-007 |
| FR-070 | SCR-006, SCR-008 | FR-071 | SCR-008 |
| FR-072 | 해당 없음(서버 저장소 전환 — 저장 모드 표시는 N-06 미설계) | FR-073 | 해당 없음(개발자 터미널 단일 명령) |
| FR-074 | SCR-003, SCR-005, SCR-006 | FR-075 | 해당 없음(단위 테스트) |
| FR-076 | 해당 없음(콘텐츠 검사 스크립트) | FR-077 | 해당 없음(E2E 테스트 — SCR-001~006을 구동하는 검증 수단) |
| FR-078 | SCR-001~009 | NFR-001 | SCR-005 |
| NFR-002 | SCR-005 | NFR-003 | SCR-001 (닉네임 입력 1차 검사) |
| NFR-004 | 해당 없음(클라이언트 번들 비밀 0개 — 화면 요소 없음) | NFR-005 | SCR-001~009 (번들 폰트·코드 그래픽·합성음) |
| NFR-006 | SCR-005, SCR-006 | NFR-007 | 해당 없음(의존성 lockfile) |
| NFR-008 | SCR-001 (수집 고지 문구) | C-001 | SCR-001~009 (결제·상점 화면 요소 0개) |
| C-002 | SCR-003 (선택지 미포함), SCR-005 (빛·실루엣 연출) | C-003 | SCR-003, SCR-005, SCR-006 |
| C-004 | 해당 없음(외부 키 0개 동작 — 실행 환경) | C-005 | SCR-001~009 (PixiJS·GSAP·Tone.js·@fontsource 스택) |
| C-006 | 해당 없음(전송 계층) | C-007 | SCR-001~009 (이미지·음원 파일 0개) |
| C-008 | SCR-001 (로그인 버튼 없음), SCR-002 (스토리 모드 없음) | C-009 | SCR-005 (리액션 3종, 채팅 입력 없음) |
| C-010 | SCR-003, SCR-005 | C-011 | SCR-005 |
| C-012 | 해당 없음(소스 폴더 구조) | C-013 | 해당 없음(backup 비공개 규칙) |

> 확인 결과: 116/116 기재 (화면 연결 103 · 해당 없음 13 — REQ-016, REQ-017, FR-072, FR-073, FR-075, FR-076, FR-077, NFR-004, NFR-007, C-004, C-006, C-012, C-013). 화면 9개 각각은 1개 이상의 REQ/FR로 역추적된다 (`screen-vision-화면설계.md` §1 연결 REQ 열).

---

## 8. 태스크 연결 (Phase 4 착수 — task-wall 정경화 조건 "RTM에 태스크 ↔ REQ 연결 반영")

> 근거 [`task-wall-성벽.md`](../04.development-repentance-회개/task-wall-성벽.md) §2 태스크 분할표의 "연결 REQ" 열을 역으로 모은 표다 (범위 표기 `FR-014~017`은 양끝 포함으로 펼침, 서브 태스크가 같은 ID를 가지면 부모 TASK는 생략). 이 표는 §1 매트릭스와 별도이며 계수 대상(상태 열)이 아니다 — §1의 "코드 모듈" 열은 지파 정복 완료 후 여호수아(TASK-090)가 실제 파일 경로로 채운다.
> 결과: spec-tablet ID 116개(REQ 17 · FR 78 · NFR 8 · C 13) 전부 1개 이상 TASK에 연결 — 미연결 0건 (2026-10-20 스크립트 역계수).

| 대상 ID | 연결 TASK-ID |
|:---|:---|
| REQ-001 | TASK-004, TASK-010, TASK-011, TASK-023, TASK-060, TASK-063-1 |
| REQ-002 | TASK-032, TASK-033, TASK-060, TASK-062 |
| REQ-003 | TASK-006, TASK-021, TASK-040, TASK-062 |
| REQ-004 | TASK-034, TASK-060, TASK-062 |
| REQ-005 | TASK-012, TASK-034, TASK-062 |
| REQ-006 | TASK-023, TASK-034, TASK-062 |
| REQ-007 | TASK-006, TASK-011, TASK-020 |
| REQ-008 | TASK-006, TASK-011, TASK-021 |
| REQ-009 | TASK-006, TASK-011, TASK-021 |
| REQ-010 | TASK-011, TASK-021, TASK-040 |
| REQ-011 | TASK-022, TASK-063, TASK-070 |
| REQ-012 | TASK-010, TASK-021 |
| REQ-013 | TASK-031, TASK-040, TASK-041, TASK-050, TASK-062, TASK-063 |
| REQ-014 | TASK-005, TASK-030, TASK-031, TASK-033, TASK-062, TASK-063 |
| REQ-015 | TASK-005, TASK-030, TASK-031, TASK-033, TASK-062, TASK-063 |
| REQ-016 | TASK-001, TASK-002, TASK-003, TASK-005, TASK-030, TASK-090 |
| REQ-017 | TASK-001, TASK-007, TASK-010-6, TASK-011-4, TASK-020-4, TASK-021-6, TASK-023-5, TASK-030-4, TASK-031-3, TASK-032-3, TASK-033-4, TASK-034-3, TASK-064, TASK-070, TASK-090 |
| FR-001 | TASK-004, TASK-010-1 |
| FR-002 | TASK-004, TASK-010-1 |
| FR-003 | TASK-010-2, TASK-010-5, TASK-040-1 |
| FR-004 | TASK-010-2, TASK-010-3 |
| FR-005 | TASK-004, TASK-010-1, TASK-023-1, TASK-023-2, TASK-062-2 |
| FR-006 | TASK-004, TASK-011-3, TASK-023-3, TASK-040-1, TASK-060-1 |
| FR-007 | TASK-011-3, TASK-023-2, TASK-041-3, TASK-063-2 |
| FR-008 | TASK-004, TASK-023-3, TASK-023-4, TASK-033-3, TASK-060-1 |
| FR-009 | TASK-023-1, TASK-023-2, TASK-023-4, TASK-031-2 |
| FR-010 | TASK-010-4, TASK-023-2 |
| FR-011 | TASK-010-5, TASK-011-1 |
| FR-012 | TASK-030, TASK-032-1, TASK-033-2, TASK-060-2, TASK-062-1 |
| FR-013 | TASK-006, TASK-040-3, TASK-062-2 |
| FR-014 | TASK-006, TASK-010-2, TASK-011-2, TASK-021-2, TASK-062-2 |
| FR-015 | TASK-006, TASK-010-5, TASK-011-2, TASK-021-2, TASK-062-2 |
| FR-016 | TASK-006, TASK-011-2, TASK-021-2, TASK-062-2 |
| FR-017 | TASK-006, TASK-010-2, TASK-011-2, TASK-021-2, TASK-062-2 |
| FR-018 | TASK-034-2, TASK-060-1, TASK-062-2 |
| FR-019 | TASK-034-2, TASK-060-1, TASK-062-2 |
| FR-020 | TASK-034-2, TASK-060-1, TASK-062-2 |
| FR-021 | TASK-012, TASK-034 |
| FR-022 | TASK-012, TASK-022 |
| FR-023 | TASK-023-2, TASK-034, TASK-063-1 |
| FR-024 | TASK-006, TASK-020-1 |
| FR-025 | TASK-010-2, TASK-011-2 |
| FR-026 | TASK-006, TASK-020-1 |
| FR-027 | TASK-006, TASK-011-2, TASK-020-2, TASK-041-2 |
| FR-028 | TASK-006, TASK-011-2, TASK-020-2, TASK-021-3, TASK-041-2 |
| FR-029 | TASK-006, TASK-010-2, TASK-011-2, TASK-020-2, TASK-041-2 |
| FR-030 | TASK-006, TASK-011-2, TASK-020-1, TASK-020-2, TASK-041-2 |
| FR-031 | TASK-006, TASK-020-2 |
| FR-032 | TASK-020-3, TASK-032-2 |
| FR-033 | TASK-006, TASK-021-1, TASK-040-2 |
| FR-034 | TASK-006, TASK-021-1, TASK-021-2, TASK-063-1 |
| FR-035 | TASK-006, TASK-010-2, TASK-010-5, TASK-011-2, TASK-021-3 |
| FR-036 | TASK-006, TASK-010-4, TASK-021-4, TASK-040-2 |
| FR-037 | TASK-006, TASK-011-2, TASK-021-4 |
| FR-038 | TASK-006, TASK-021-4 |
| FR-039 | TASK-011-2, TASK-021-5, TASK-040-3 |
| FR-040 | TASK-011-3, TASK-022 |
| FR-041 | TASK-022, TASK-063-3 |
| FR-042 | TASK-022, TASK-063-3 |
| FR-043 | TASK-022, TASK-070 |
| FR-044 | TASK-010-4, TASK-021-5, TASK-040-1 |
| FR-045 | TASK-010-2, TASK-010-4, TASK-011-2, TASK-020-1, TASK-021-5, TASK-040-1 |
| FR-046 | TASK-010-4, TASK-011-2, TASK-021-5, TASK-040-1 |
| FR-047 | TASK-010-4, TASK-021-5, TASK-023-2, TASK-040 |
| FR-048 | TASK-040-1, TASK-040-2, TASK-061 |
| FR-049 | TASK-040-3 |
| FR-050 | TASK-002, TASK-061 |
| FR-051 | TASK-041-1 |
| FR-052 | TASK-041-1, TASK-041-2, TASK-041-3 |
| FR-053 | TASK-041-2 |
| FR-054 | TASK-041-2 |
| FR-055 | TASK-004, TASK-011-3, TASK-041, TASK-050 |
| FR-056 | TASK-041-3, TASK-063-2 |
| FR-057 | TASK-041-1, TASK-041-4, TASK-062-3 |
| FR-058 | TASK-050 |
| FR-059 | TASK-050 |
| FR-060 | TASK-050, TASK-062-3 |
| FR-061 | TASK-011-3, TASK-041-1, TASK-041-3, TASK-041-4 |
| FR-062 | TASK-021-1, TASK-023-2, TASK-040-2 |
| FR-063 | TASK-022, TASK-063-2 |
| FR-064 | TASK-011-1, TASK-023-3, TASK-063-3 |
| FR-065 | TASK-006, TASK-031-1, TASK-063-2 |
| FR-066 | TASK-031-1, TASK-063-2 |
| FR-067 | TASK-005, TASK-023-2, TASK-030-1, TASK-031-2 |
| FR-068 | TASK-005, TASK-030-1, TASK-031-2 |
| FR-069 | TASK-005, TASK-030-1, TASK-033-2, TASK-062-3 |
| FR-070 | TASK-005, TASK-030-1, TASK-031-1, TASK-031-2, TASK-063-2 |
| FR-071 | TASK-005, TASK-030-1, TASK-033-2, TASK-062-3 |
| FR-072 | TASK-003, TASK-005, TASK-030-1, TASK-030-2, TASK-030-3, TASK-030-4, TASK-034-2 |
| FR-073 | TASK-001, TASK-002, TASK-003, TASK-033-1, TASK-090 |
| FR-074 | TASK-002, TASK-006, TASK-070 |
| FR-075 | TASK-007, TASK-010-6, TASK-011-4, TASK-020-4, TASK-021-6, TASK-023-5, TASK-030-4, TASK-031-3, TASK-032-3, TASK-033-4, TASK-034-3, TASK-041-4 |
| FR-076 | TASK-070 |
| FR-077 | TASK-064 |
| FR-078 | TASK-061, TASK-062-1 |
| NFR-001 | TASK-040-1, TASK-041-1 |
| NFR-002 | TASK-011-3, TASK-023-3, TASK-064 |
| NFR-003 | TASK-004, TASK-023-3, TASK-023-4, TASK-032-1, TASK-032-2, TASK-032-3, TASK-033-1, TASK-033-2, TASK-033-4, TASK-034-2 |
| NFR-004 | TASK-002, TASK-003, TASK-030-2 |
| NFR-005 | TASK-002, TASK-040, TASK-050, TASK-061 |
| NFR-006 | TASK-041-3 |
| NFR-007 | TASK-001 |
| NFR-008 | TASK-030, TASK-032-1, TASK-060-2 |
| C-001 | TASK-062-1 |
| C-002 | TASK-021-5, TASK-040-3 |
| C-003 | TASK-006, TASK-063-2, TASK-070 |
| C-004 | TASK-001, TASK-003, TASK-030-3 |
| C-005 | TASK-001, TASK-002, TASK-061 |
| C-006 | TASK-004, TASK-033-3, TASK-060-1 |
| C-007 | TASK-040-3, TASK-050 |
| C-008 | TASK-003, TASK-062-1 |
| C-009 | TASK-004, TASK-032-2, TASK-063-3 |
| C-010 | TASK-006, TASK-070 |
| C-011 | TASK-040-3, TASK-041 |
| C-012 | TASK-001 |
| C-013 | TASK-001 |
