# 🔒 봉인의 율법 점검 결과 — 영적 전쟁 테트리스

> *"And the book was sealed with seven seals"* — Revelation 5:1 (KJV)
>
> **규격:** `statute-율법/04.development-repentance-회개/security-seal-봉인.md` (10계명) · **참조 예시:** `parable-비유/04.development-repentance-회개/security-seal-봉인-example.md`
> **근거 정경:** architecture-temple §10(봉인의 율법 연동) · api-gate §2·§5 · data-ark §6·§7·§8.3 · spec-tablet NFR-003·NFR-004·NFR-008·C-001·C-002 · devguide §3.6·§5.1
> **태스크:** TASK-071 (03.uttermost-땅끝 03-D) · **작성:** D-03D (Doer) · 2026-10-19 · **상태:** Doer 점검 완료 — W-03D 짝 검증 대기
> **점검 대상:** `fruit-열매/` 전 소스(`client/`·`worker/`·`content/`·`supabase/`·`scripts/`) + `npm run build` 산출물 `client/dist/` + 실제 실행(`npm run dev` — Vite 5173 · wrangler dev 8787)

---

## 1. 봉인의 율법 10계명 점검 결과

| # | 계명 | 점검 항목 (architecture §10 대응) | 증거 (실측·명령) | 상태 |
|:--|:---|:---|:---|:---:|
| 1 | 노출하지 말라 | 로그·응답에 토큰·해시·티켓·guestId 전체 0, 랭킹·전적은 닉네임만 | worker의 `console.*`는 `log.ts` 1곳뿐(grep) — 필드는 `gid`(앞 8자)·`code`(SNAKE_CASE 정규식)만 통과. 실행 로그 실측 `{"evt":"guest_created","gid":"945f805c"}`. API-004 응답 `{rank,nickname,rating,isMe}`(guestId 0), API-003·API-010 `opponent`는 `{nickname,heroId,rating,isBot,botLevel}`. 토큰은 URL 쿼리에 없음(`/ws/lobby`·`/ws/room/:id` + 본문 `token`). 클라이언트 `console.error`는 오류 객체만(토큰 0) | ✅ (SEC-001·003 수정 후) |
| 2 | 코드에 넣지 말라 | Supabase URL·키는 `.dev.vars`/`wrangler secret`에만, 번들 0 | `git grep -E` JWT·`sb_secret_`·`*.supabase.co`·`SUPABASE_*=값`·개인키 패턴 → 0건. 추적 파일 중 `.dev.vars*`는 값 없는 `worker/.dev.vars.example`뿐, `.dev.vars`·`.wrangler/`·`dist/`는 `git check-ignore` 확인. `wrangler.toml [vars]`는 `ALLOWED_ORIGINS`만. 번들(`client/dist`, 11파일) 문자열 검사: `supabase`·`service_role`·`SUPABASE_URL`·`.supabase.co`·JWT(`eyJ…`)·`token_hash`·`ALLOWED_ORIGINS` 전부 **0** (NFR-004 측정 방법) | ✅ (SEC-001 수정 후) |
| 3 | 암호화하라 | 토큰 SHA-256 해시만 저장, 전송 | `guest-service.ts`: `crypto.getRandomValues` 32바이트 → base64url 43자, 원장에는 `sha256Hex`만. 실측: 로컬 원장 `profiles` 열 = `id,nickname,token_hash,rating,created_at,updated_at`, 새 게스트 행 `token_hash` 64자 hex, 토큰 원문 저장 0. 입장 티켓도 SHA-256만 GameRoom에 전달. 전송: 로컬판은 루프백 http/ws(architecture §10 — 운영 HTTPS/WSS는 다음 단계, C-008) | ✅ |
| 4 | 최소만 취하라 | 닉네임·게스트 ID·토큰 해시·경기·진행 기록뿐 | `supabase/migrations/0001_init.sql`·`sqlite-adapter.ts` 표 5개(profiles·matches·match_players·player_progress·achievements) — 이메일·실명·IP 열 0. 게스트 생성 속도 제한의 접속 주소는 Worker 메모리 Map만(1분 지나면 삭제, 저장·로그 0). 브라우저 저장은 `localStorage` `swt.guest` 1개(Playwright 실측 키 목록 `["swt.guest"]`) | ✅ |
| 5 | 동의 없이 취하지 말라 | 닉네임 입장 화면 공개 안내 | `screens/entry.js` "ⓘ 닉네임은 랭킹에 공개됩니다." (SCR-001 PrivacyNotice). 수집 항목은 사용자가 입력한 닉네임뿐 | ✅ |
| 6 | 외부에 넘기지 말라 | 분석·광고·추적 SDK 0, 외부 요청 0 | 클라이언트 의존성 8종(pixi.js·pixi-filters·gsap·tone·partysocket·canvas-confetti·@fontsource 2) — 분석 SDK 0. 번들의 `fetch`/`WebSocket` 호출 대상은 상대 경로(`/api`, `/ws`)와 `location.host`뿐, 글꼴은 번들 자산. Supabase 클라이언트는 Worker에만, 두 env 값이 모두 있을 때만 생성(`select-storage.ts`) | ✅ |
| 7 | 접근을 통제하라 | Bearer·토큰+1회용 티켓·Origin·RLS·스키마 검증·4KB·속도 제한 | 실측(curl, Vite 프록시 경유): Bearer 없는 `/api/guests/me` → 401 UNAUTHORIZED, 허용 밖 Origin → 403 ORIGIN_FORBIDDEN, Origin 없는 `/ws/lobby` 업그레이드 → 403, 게스트 생성 6번째 → 429. `ready`는 토큰 guestId + 티켓 SHA-256 일치·사용 후 폐기(`room/handlers.ts`). 원장 쓰기는 GameRoom→Matchmaker RPC뿐(외부 쓰기 = API-001). Supabase: 5개 표 RLS on + anon·authenticated `revoke all`, 함수 실행은 service_role만. 모든 WS 메시지 `protocol/validate.ts` 스키마·4,096B·토큰 버킷(`rules.rateLimit`) — `worker/test/validate.test.ts` 23건 통과. C-002(예수님): heroes.json = david·solomon·peter·paul만, 이벤트 `by: null`·경기당 `rules.jesus.perMatch`=1, `JESUS_LIGHT` 색 #FFF8E7·#FFFFFF만(얼굴 데이터 0) | ✅ (SEC-002 수정 후) |
| 8 | 기록하라 | 보안 로그 5종 | `log.event` 사용처: auth_fail 8 · guest_created 1 · rate_limited 3 · reject 5 · storage_fail 18 — 정의 밖 이벤트는 `formatLogLine`이 null(기록 안 함). wrangler dev 콘솔 실측 출력 확인 | ✅ |
| 9 | 유출을 대비하라 | 해시 저장 + 키 재발급 절차 | 원장 유출 시 토큰 원문 복원 불가(SHA-256). `fruit-열매/README.md` §5 "키가 새어 나갔다면": Supabase service role 키 재발급 → `.dev.vars` 교체 / `wrangler secret put` (devguide §5.1 제9계명 항목) | ✅ |
| 10 | 남의 데이터를 탐하지 말라 | 수집 데이터는 매칭·전적·랭킹·진행 보정에만 | 원장 읽기 경로 = API-002~004 · 매칭(Elo) · 진행 기록(은혜·해금·성장) · 업적뿐. 분석·추적·내보내기 코드 0. C-001: 결제·구매·가챠 문자열/로직 0(grep `payment|purchase|checkout|gacha|결제|구매|가챠`), C-009 채팅 0 | ✅ |

**XSS 점검 (제7계명 — 사용자 문자열 렌더링):** 사용자·서버가 정하는 문자열(닉네임·상대 닉네임·초대 코드·오류 `message`·퀴즈 문제·보기)은 전부 `textContent`(토스트·말풍선·스크린리더 알림·떠오르는 글)로 쓰거나, `innerHTML` 템플릿 안에서는 `esc()`(= `fx/subtitle.js` `escapeHtml` — `& < > " '` 5자 치환)를 거친다: `lobby.js`·`waiting.js`(닉네임·코드 칸·오류)·`ranking.js`·`history.js`(`esc(opp)`)·`battle-hud.js`(`esc(oppName)`)·`battle-overlays.js`(`esc(d.question)`·`esc(c)`·`esc(message)`). 이스케이프 없이 `innerHTML`에 들어가는 값은 코드 상수·정경 콘텐츠·숫자뿐. `eval`·`new Function`·`document.write` 0. CSP 헤더는 정경(architecture §10·api-gate §5)에 없어 추가하지 않았다(P4-002) — 운영 배포 단계 과제(관찰 OBS-03).

**클라이언트 번들 — 말씀 대결 정답 (api-gate §5 서버 권한):** `npm run build` 후 `client/dist` 검사: 퀴즈 문제 문장 **0/66**, 퀴즈 ID 0/66, `answer`·`question_ko` 키 0 — 클라이언트는 `quiz.json`을 import하지 않는다(`client/js/content.js` 3행). 정답 보기 문장 중 13개가 번들에 보이는 것은 전부 `verses.json` 한국어 번역 문장 안의 같은 구절(예: "빵 다섯 개와 물고기 두 마리")이며, 구절 문장으로 설명되지 않는 정답 문자열은 0개다(스크립트 대조).

---

## 2. 보안 아키텍처 요약

```
Browser ──(http/ws 루프백)──> Vite :5173 ──proxy /api·/ws──> wrangler dev :8787 (127.0.0.1)
  localStorage swt.guest 1개        │  server.fs.deny: .dev.vars · .wrangler/ · content/quiz.json (DCL-011)
                                     ▼
                         index.ts ─ Origin 허용 목록 (ALLOWED_ORIGINS) ─┬─ /api/* → routes (Bearer · 5회/분 · 1KB)
                                                                       └─ /ws/*  → Matchmaker(join 토큰) / GameRoom(ready 토큰 + 1회용 티켓)
                                                                                 validate.ts 스키마 · 4KB · 토큰 버킷
                         Matchmaker 원장 ─ select-storage: 키 0 → DO SQLite(token_hash) / 키 2개 → Supabase(service role, RLS)
                         log.ts ─ {"evt","gid"(8자),"code"} 5종만
```

## 3. 발견된 취약점 및 조치

| # | 취약점 | 심각도 | 조치 | 상태 |
|:--|:---|:---:|:---|:---:|
| SEC-001 | Vite 개발 서버가 `server.fs.allow: ['..']` 범위의 `worker/.dev.vars`를 `/@fs/<절대경로>/worker/.dev.vars`로 **200 + 원문** 제공(실측 — 더미 파일). Supabase service role 키가 Worker 밖(HTTP)으로 나감 — 제2계명·NFR-004 | High (localhost 한정) | Spec-First: RTM §5 DCL-011 → devguide §1.3 고정 항목 문장 추가 → `client/vite.config.js` `server.fs.deny`(Vite 기본 6개 + `**/.dev.vars`·`**/.wrangler/**`·`**/content/quiz.json`). 재측정 403 | ✅ Fixed |
| SEC-002 | 같은 경로로 `content/quiz.json`(정답 `answer` 포함) 200 — 말씀 대결 판정 서버 권한 우회(제7계명, TBL-017) | Medium | SEC-001과 같은 차단 목록. 재측정 `?import`·원문 모두 403. 번들 0/66은 그대로 | ✅ Fixed |
| SEC-003 | 같은 경로로 로컬 원장 `worker/.wrangler/state/v3/do/*.sqlite` 200(닉네임·token_hash) — 제1·7계명 | Medium | 같은 차단 목록. 재측정 403 | ✅ Fixed |

> 수정 후 회귀: 정상 경로 `/`·`/js/main.js`·`content/verses.json`·`@fontsource` 글꼴 200, `.dev.vars.example` 200(값 없는 공개 파일), `npm test` 61/61, `npm run build`, 새 설치 후 브라우저 스모크(Playwright chromium SwiftShader: 닉네임 입장→로비, 페이지 오류 0).

**관찰 (위반 아님 — 기록만):**

| # | 내용 | 판단 |
|:--|:---|:---|
| OBS-01 | `npm audit`: 개발 도구 의존성 5건(concurrently 10.0.5 → shell-quote `quote()` 명령 주입, wrangler 4.147.0 → miniflare → sharp/librsvg). `npm audit --omit=dev` = **0건**(배포 번들·Worker 런타임 무관) | concurrently는 저장소 고정 명령 문자열만 인용(외부 입력 0) → 악용 경로 없음. 버전 변경은 devguide §1.2 고정표·NFR-007(2주 규칙) 개정 사항이라 Doer가 바꾸지 않음 — Phase 6 판정 후보 |
| OBS-02 | 토큰 검증은 "상수 시간 비교"(api-gate §5) 대신 **SHA-256 해시 후 원장 조회·Map 조회**, 티켓도 해시끼리 `===` | 비교 대상이 공격자가 고를 수 없는 해시라 시간 차이가 비밀(토큰·티켓)에 대한 정보를 주지 않음(hash-then-compare) — 의도 충족으로 판단, W-03D 확인 요청 |
| OBS-03 | CSP·`X-Content-Type-Options` 등 응답 보안 헤더 없음 | 정경에 없음 → 추가하지 않음(P4-002). 로컬 실행판 범위. 운영 배포(C-008 제외 범위) 때 설계 |
| OBS-04 | wrangler dev의 Local Explorer API(`127.0.0.1:8787/cdn-cgi/local/explorer/api`)가 로컬 바인딩 목록을 보여 줌 | wrangler 자체 개발 기능, 127.0.0.1 전용, 다른 Origin 요청은 403(실측), Vite 프록시 대상 아님 — 개발자 본인 기기 범위 |

---

> ✅ **봉인의 율법 10계명 전항 Pass** — 위반 3건(SEC-001~003)은 TASK-071에서 즉시 수정·재측정 완료. 판정 확정은 W-03D 짝 검증(DCL-011 승인 포함)을 거친다.
