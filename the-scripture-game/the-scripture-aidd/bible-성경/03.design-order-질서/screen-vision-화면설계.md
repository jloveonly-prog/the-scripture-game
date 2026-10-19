# 👁️ 화면 설계서 (Screen Vision) — 영적 전쟁 테트리스

> *"In the visions of God brought he me into the land of Israel, and set me upon a very high mountain, by which was as the frame of a city on the south."* — Ezekiel 40:2 (KJV)
>
> **규격:** `statute-율법/03.design-order-질서/screen-vision-환상-template.md` (필수 5섹션: 화면 목록 · 화면 상세 명세 · 라우팅 가드 · 반응형 디자인 · 접근성) + SKILL-03 "UC-화면 중복 해체 검증"
> **참조 예시:** `parable-비유/03.design-order-질서/screen-vision-환상-example.md`
> **파일명:** SKILL-03 산출물 표의 `screen-vision-화면설계.md` (design-vision D3-01)
> **짝 산출물:** [`design-vision-디자인명세.md`](./design-vision-디자인명세.md) — 디자인 시스템(§2), 와이어프레임 WF-001~WF-009(§3), 이벤트별 연출·소리(§4.6~4.7), 반응형(§5), 접근성(§6)의 원본. 이 문서는 WF-ID를 참조하고 화면별 컴포넌트·인터랙션·연결 API·상태를 정의한다.
> **근거 정경:** [`usecase-path-사용사례.md`](../01.requirement-hearing-들음/usecase-path-사용사례.md) (UC-001~UC-022) · [`spec-tablet-명세서.md`](../01.requirement-hearing-들음/spec-tablet-명세서.md) (FR-078 화면 9개) · [`architecture-temple-성전설계.md`](../02.architecture-foundation-기초/architecture-temple-성전설계.md) (§13 Phase 3 인계) · [`api-gate-성문.md`](../02.architecture-foundation-기초/api-gate-성문.md) (API-001~API-031) · [`data-ark-법궤.md`](../02.architecture-foundation-기초/data-ark-법궤.md) (TBL-011~TBL-018, §8.3 브라우저 저장)

---

## 1. 화면 목록

> 라우팅은 해시 방식(design-vision D3-12). "인증 필요" = 브라우저의 `swt.guest` 토큰이 서버 검증(API-002)을 통과한 세션이어야 함.

| SCR-ID | 화면명 | 라우팅 경로 | 연결 UC | 연결 REQ | 인증 필요 | 와이어프레임 |
|:---|:---|:---|:---|:---|:---:|:---|
| SCR-001 | 닉네임 입장 | `#/entry` | UC-001 | REQ-002 | ❌ | WF-001 |
| SCR-002 | 로비 (모드 선택) | `#/lobby` | UC-002 (+ UC-018·UC-019·UC-020 진입점) | REQ-004, REQ-005, REQ-006 | ✅ | WF-002 |
| SCR-003 | 캐릭터(위인) 선택 | `#/hero` | UC-002 | REQ-003 | ✅ | WF-003 |
| SCR-004 | 매칭 대기 / 초대 코드 / 입장 준비 | `#/waiting` | UC-003, UC-004 (+ UC-005·UC-006 입장 준비) | REQ-004, REQ-001 | ✅ | WF-004 (a)~(e) |
| SCR-005 | 대전 (사람·봇·연습 변형) | `#/battle` | UC-005, UC-006, UC-007, UC-008, UC-009, UC-010, UC-011, UC-012, UC-013, UC-014, UC-017 (+ UC-016 감지 연출) | REQ-001, REQ-005~REQ-013 | ✅ | WF-005 (§3.5.1~3.5.5) |
| SCR-006 | 결과 (말씀 카드) | `#/result` | UC-015, UC-016 (+ UC-006 6단계 연습 기록) | REQ-001, REQ-013, REQ-014, REQ-015 | ✅ | WF-006 |
| SCR-007 | 전적 | `#/history` | UC-018 | REQ-014 | ✅ | WF-007 |
| SCR-008 | 랭킹 | `#/ranking` | UC-019 | REQ-015 | ✅ | WF-008 |
| SCR-009 | 옵션 (화면 + 대전 중 모달) | `#/options` (모달은 경로 변경 없음) | UC-020 | REQ-013 | ✅ | WF-009 |

> 화면 수 9개 = FR-078 "화면 9개" = architecture ARCH-001 `screens/` 9파일(entry·lobby·hero-select·waiting·battle·result·history·ranking·options). UC-021(로컬 실행)·UC-022(자동 테스트)는 개발자(ACT-006)가 터미널에서 수행하는 유스케이스로 **화면이 없다** — §6 중복 해체 검증에 사유 기록.

**SCR-005 변형 · 덧씌움 (별도 화면이 아님 — 같은 화면의 상태):**

| 구분 | 이름 | 조건 | 와이어프레임 |
|:---|:---|:---|:---|
| 변형 | 사람 대 사람 | `start.mode` ∈ random, invite | §3.5.1 / §3.5.2 |
| 변형 | 봇 대전 | `start.mode` = bot | §3.5.3 |
| 변형 | 연습 | `start.mode` = practice | §3.5.4 |
| 덧씌움 | 카운트다운 | `start` 수신 후 `countdownMs` | §3.5.5 (a) |
| 덧씌움 | 말씀 대결 모달 | `quiz` 수신 ~ `quizResult` + `resumeInMs` | §3.5.5 (b) |
| 덧씌움 | 옵션 모달 (= SCR-009 컴포넌트) | Esc / ⚙ (사람·봇) | §3.5.5 (c) |
| 덧씌움 | 일시정지 메뉴 | Esc / ❚❚ (연습) | §3.5.5 (d) |
| 덧씌움 | 이탈 확인 모달 | 경로 이탈 시도 | §3.5.5 (e) |
| 덧씌움 | 세로 회전 안내 | 휴대폰 가로 | §3.5.5 (f) |
| 덧씌움 | 연결 끊김 · 경기 중단 | 방 소켓 비정상 종료 / `error` | §3.5.5 (g) |

---

## 2. 화면 상세 명세

### 공통 셸 (모든 화면)

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| 배경 | ParallaxBackdrop (DOM) | design-vision §2.12 메뉴용 CSS 배경 (SCR-005는 Pixi 배경) |
| 최상위 | AudioUnlockToast | 오디오 시작 전 "🔈 소리를 켜려면 화면을 누르세요" (design-vision §4.7.1) |
| 최상위 | ToastHost | `role="status"`, 최대 2개 쌓임 |
| 최상위 | ScreenVeil | 화면 전환 장막 (z 800) |
| 전역 | SessionStore | 메모리: 게스트 프로필(닉네임·레이팅·roundsPlayed), 흐름 상태(mode·botLevel·inviteAction·heroId), 대전 세션(matched·start·소켓), 마지막 matchEnd, 옵션 값(N-04 미승격 — 저장 안 함) |
| 전역 | ContentIndex | `content/*.json` 8종 번들 import 색인 (architecture D-15) — 화면은 이 색인으로 이름·효과 문장·구절·수치를 읽는다 |

### SCR-001: 닉네임 입장

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-001 |
| 화면명 | 닉네임 입장 |
| 경로 | `#/entry` |
| 연결 UC | UC-001 |
| 연결 REQ / FR | REQ-002, FR-012, FR-078, NFR-003, NFR-008 |
| 인증 | 불필요 |
| 와이어프레임 | design-vision §3.1 WF-001 |
| BGM / 소리 | BGM-1 (오디오 시작 후) / 버튼 AUX-14 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 | 데이터 원천 |
|:---|:---|:---|:---|
| Header | TitleLockup | "SPIRITUAL WARFARE TETRIS" + "영적 전쟁 테트리스" | 고정 문구 |
| Header | VerseBlock | Ephesians 6:12 — KJV·직접 번역·출처 3줄 | verses.json (TBL-016) |
| Main | NicknameInput | `<input>` `maxlength=12`, `pattern` = `rules.nickname.pattern`, `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`, `aria-describedby`=도움말·오류 | rules.json `nickname` |
| Main | HelperText | "2~12자 · 한글·영문·숫자·_" | rules `nickname.min`·`max` |
| Main | ErrorText | 오류 문장 (`role="alert"`) | API-001 error.message 또는 로컬 검사 |
| Main | PrivacyNotice | "ⓘ 닉네임은 랭킹에 공개됩니다." (architecture §10 봉인 제5계명 — 배치 확정) | 고정 문구 |
| Main | EnterButton | 주 버튼 "입장하기" — 닉네임이 로컬 검사를 통과해야 활성 | — |
| Overlay | BootSplash | 저장 게스트 확인 중 7점 회전 + "입장 정보를 확인하는 중…" | — |
| Overlay | RetryPanel | 서버 연결 실패 문장 + [다시 시도] | — |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 앱 시작 (어느 경로로 들어와도 1회) | localStorage `swt.guest` 읽기 → 있으면 BootSplash + 토큰 확인 → 200: SessionStore에 닉네임·레이팅·roundsPlayed 저장 후 요청한 경로(없으면 `#/lobby`)로 | API-002 |
| 토큰 확인 401 (UC-001 E3) | `swt.guest` 삭제 → 입력 폼 표시 (토스트 "입장 정보가 올바르지 않습니다.") | API-002 |
| 토큰 확인 503·네트워크 실패 (UC-001 E4) | RetryPanel "서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요" + [다시 시도] (게스트 정보 유지) | API-002 |
| 닉네임 입력 | trim 후 `rules.nickname.pattern` 검사 → 통과하면 버튼 활성. 칸을 벗어났는데 실패면 ErrorText "닉네임 규칙(2~12자, 한글·영문·숫자·_)을 확인하세요." (UC-001 E1) | — |
| Enter 키 / 입장하기 클릭 | 버튼 로딩 → POST → 201: `swt.guest`에 guestId·nickname·token 저장(data-ark §8.3) → `#/lobby` | API-001 |
| 400 NICKNAME_INVALID | ErrorText = error.message, 칸 흔들림(design-vision §4.2) | API-001 |
| 409 NICKNAME_TAKEN (UC-001 E2) | ErrorText "이미 사용 중인 닉네임입니다.", 입력 유지·전체 선택 | API-001 |
| 429 RATE_LIMITED | ErrorText = error.message, 버튼 5초 비활성 | API-001 |
| 500·503·네트워크 실패 | RetryPanel (입력값 유지) | API-001 |

**상태:** 로딩 = BootSplash·버튼 로딩 / 빈 상태 = 입력 전(버튼 비활성) / 오류 = ErrorText·RetryPanel.

### SCR-002: 로비

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-002 |
| 화면명 | 로비 (모드 선택) |
| 경로 | `#/lobby` |
| 연결 UC | UC-002 (1~2단계), UC-018·UC-019·UC-020 진입 |
| 연결 REQ / FR | REQ-004, REQ-005, REQ-006, FR-078, FR-019, FR-021, FR-023 |
| 인증 | 필요 |
| 와이어프레임 | design-vision §3.2 WF-002 |
| BGM / 소리 | BGM-1 / AUX-14 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 | 데이터 원천 |
|:---|:---|:---|:---|
| Header | ProfileChip | 닉네임 + "레이팅 n" | SessionStore (API-002 응답, 경기 후 `matchEnd.you.rating.after`로 갱신) |
| Header | NavButtons | [전적] [랭킹] [⚙ 옵션] (모바일: 전적·랭킹은 하단 고정 바) | — |
| Main | Greeting | "평강하라, " + 닉네임 / "어떤 싸움을 하시겠습니까?" | SessionStore |
| Main | ModeCard 랜덤 | 설명 + [상대 찾기] | — |
| Main | ModeCard 친구 초대 | [방 만들기] [코드로 입장] | — |
| Main | ModeCard AI 봇 | 난이도 세그먼트(쉬움·보통·어려움, 기본 보통 — CODE-002) + [봇과 싸우기] | — |
| Main | ModeCard 연습 | 설명 + [연습하기] | — |
| Footer | VerseBand | Ephesians 6:17 (데스크톱·태블릿만) | verses.json |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| [상대 찾기] | 흐름 상태 mode=`random` → `#/hero` | — (다음 화면에서 API-007) |
| [방 만들기] | mode=`invite`, inviteAction=`create` → `#/hero` | — |
| [코드로 입장] | mode=`invite`, inviteAction=`join` → `#/hero` (UC-004 4단계: 위인 선택 후 코드 입력) | — |
| 난이도 세그먼트 + [봇과 싸우기] | mode=`bot`, botLevel=선택값 → `#/hero` | — |
| [연습하기] | mode=`practice` → `#/hero` | — |
| [전적] / [랭킹] / [⚙] | `#/history` / `#/ranking` / `#/options` | — |
| 키보드 ←/→ | 모드 카드 사이 포커스 이동, Enter = 카드의 주 버튼 | — |

**상태:** 로딩 = 없음(진입 전 인증 완료) / 빈 상태 = 해당 없음 / 오류 = 해당 없음 (네트워크 호출 없음).

### SCR-003: 캐릭터(위인) 선택

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-003 |
| 화면명 | 캐릭터(위인) 선택 |
| 경로 | `#/hero` |
| 연결 UC | UC-002 (3~5단계, 4a, E1, E2) |
| 연결 REQ / FR | REQ-003, FR-013, FR-015(패시브 표시), C-008, C-010, C-003 |
| 인증 | 필요 |
| 와이어프레임 | design-vision §3.3 WF-003 |
| BGM / 소리 | BGM-1 / 카드 선택 AUX-14, 확정 SFX-13(미가엘 화음 0.6초 — 화면 전환 §4.1) |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 | 데이터 원천 |
|:---|:---|:---|:---|
| Header | BackButton | [← 뒤로] → `#/lobby` (UC-002 4a) | — |
| Header | ModeSummary | "모드: AI 봇 대전 · 보통" 등 | SessionStore 흐름 상태 |
| Main | HeroCard × 4 (`role="radio"`) | 엠블럼(§2.13.1, 128) · `name_ko`/`name_en` · `skill_name_ko` · `skill_effect_ko` · "믿음 n · m초" · `passive_ko`(솔로몬만) · 구절 3줄 | heroes.json (TBL-011), rules.json `heroSkills[skill_id].cost`·`cooldownMs`, verses.json |
| Footer | ConfirmButton | "이 위인으로 싸우기" — 선택 전 비활성 + 안내 "위인을 선택하세요" (UC-002 E1) | — |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 카드 클릭 / 화살표 + Space | 선택 (`aria-checked`), 다른 카드 투명도 0.7, 모바일은 상세 시트 갱신 | — |
| ConfirmButton | 흐름 상태 heroId 저장 → `#/waiting` | — (다음 화면에서 API-007 `heroId`) |
| Esc / [← 뒤로] | `#/lobby` (흐름 상태 유지 — 같은 모드 카드에 포커스) | — |
| 콘텐츠 색인 실패 (UC-002 E2) | 카드 대신 "게임 데이터를 불러오지 못했습니다" + [새로고침](`location.reload()`) | — |

**상태:** 로딩 = 없음(번들 콘텐츠) / 빈 상태 = 미선택(확정 비활성) / 오류 = UC-002 E2 패널.

### SCR-004: 매칭 대기 / 초대 코드 / 입장 준비

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-004 |
| 화면명 | 매칭 대기 / 초대 코드 / 입장 준비 |
| 경로 | `#/waiting` |
| 연결 UC | UC-003 (1~6단계, 2a, E1~E3), UC-004 (1~6단계, 2a, E1~E3), UC-005 (1~3단계), UC-006 (입장) |
| 연결 REQ / FR | REQ-004, REQ-001, FR-018, FR-019, FR-020, FR-005, FR-008, C-006 |
| 인증 | 필요 |
| 와이어프레임 | design-vision §3.4 WF-004 (a) 랜덤 대기 · (b) 초대 방장 · (c) 코드로 입장 · (d) 봇·연습 입장 준비 · (e) 상대 발견 |
| BGM / 소리 | BGM-1 / 상대 발견 SFX-13(미가엘 화음 0.6초), 취소 AUX-14 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 | 데이터 원천 |
|:---|:---|:---|:---|
| Main | SevenLightSpinner | 7점 원형 회전(블록 7색) | — |
| Main | StatusText + Elapsed | "상대를 찾는 중… 00:17" / "친구를 기다리는 중…" / "전장을 준비하는 중…" | 클라이언트 시계 |
| Main | MyHeroBadge | 내 위인 엠블럼 + 레이팅 | SessionStore |
| Main | InviteCodeDisplay (b) | 6칸 큰 글자, 선택 가능 텍스트 | API-009 `inviteCode` |
| Main | InviteExpiry (b) | "코드 만료까지 mm:ss" | API-009 `inviteExpiresAt` |
| Main | InviteCodeInput (c) | 6칸 입력(자동 대문자, `rules.invite.alphabet` 외 문자 무시, 붙여넣기 분배), 오류 문장 | rules.json `invite` |
| Main | MatchSplash (e) | 나 vs 상대(엠블럼·닉네임 또는 "봇 (난이도)"·레이팅) | API-010 `opponent` |
| Footer | CancelButton | (a)(b)(c)에서 [취소] | — |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 화면 진입 (random · invite-create · bot · practice) | 로비 소켓 연결 → 연결 즉시(5초 제한 안) `join` 전송 — 필드 token·heroId·mode(+ bot이면 botLevel) | API-005, API-007 |
| 화면 진입 (invite-join) | (c) 입력 화면만 표시 — 소켓은 [입장하기]를 누를 때 연결 후 `join`(token·heroId·mode=invite·roomCode) | API-005, API-007 |
| `waiting` 수신 | random → (a) / invite 방장 → (b) 코드·만료 표시 | API-009 |
| `matched` 수신 | 대전 세션 저장(roomId·ticket·slot·mode·opponent) → (e) 상대 발견(봇·사람, 최소 1,200ms — 연습은 생략) → 방 소켓 연결 → `ready`(token·ticket) | API-010, API-006, API-011 |
| 첫 `start` 수신 | start 데이터를 대전 세션에 넣고 `#/battle` (카운트다운은 대전 화면이 시작) | API-019 |
| [취소] (a)(b) | `cancel` 전송 → 서버 Close 1000 `cancelled` → `#/lobby` (UC-003 2a, UC-004 2a) | API-008 |
| [취소] (c) | 소켓을 열지 않았으면 그대로 `#/lobby` | — |
| `error` INVITE_NOT_FOUND / INVITE_FULL (UC-004 E1·E2) | (c) 오류 문장에 error.message, 입력 유지, 소켓은 서버가 닫음 | API-031 |
| `error` INVITE_EXPIRED | (b)에 "초대 코드가 만료되었습니다." + [새 코드 만들기](다시 연결·join) / [로비로] | API-031 |
| `error` UNAUTHORIZED (UC-003 E3) | `swt.guest` 삭제 → `#/entry` + 토스트 "입장 정보가 올바르지 않습니다." | API-031 |
| `error` ALREADY_QUEUED | 문장 "이미 다른 창에서 대기 중입니다." + [로비로] | API-031 |
| `error` OPPONENT_LEFT (`ready` 단계, UC-003 E2) | 토스트 "상대가 나갔습니다" → random이면 로비 소켓 다시 연결·`join`으로 (a) 복귀, invite·bot이면 `#/lobby` | API-031 |
| `error` MATCH_SETUP_FAILED · STORAGE_UNAVAILABLE · AUTH_TIMEOUT · BAD_MESSAGE | 문장 error.message + [다시 시도](같은 join 재전송) / [로비로] | API-031 |
| 로비 소켓 비정상 종료 (UC-003 E1) | partysocket 자동 재연결(로비 소켓만 — OQ #18) 후 `join` 재전송, 3회 실패 시 "서버에 연결할 수 없습니다" + [로비로] | API-005 |
| 방장 창 닫힘 (UC-004 E3) | 서버가 코드 무효화 — 화면 동작 없음 (친구 쪽은 E1) | — |

**상태:** 로딩 = (a)(b)(d) 회전 표시 / 빈 상태 = (c) 입력 전(입장하기 비활성) / 오류 = 위 오류 문장 칸.

### SCR-005: 대전

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-005 |
| 화면명 | 대전 (사람 대 사람 · 봇 · 연습 변형) |
| 경로 | `#/battle` |
| 연결 UC | UC-005, UC-006, UC-007, UC-008, UC-009, UC-010, UC-011, UC-012, UC-013, UC-014, UC-017, UC-016(감지 연출) |
| 연결 REQ / FR | REQ-001, REQ-005~REQ-013, FR-001~FR-011, FR-014~FR-017, FR-021~FR-064(화면 관련), NFR-001, NFR-002 |
| 인증 | 필요 + 활성 대전 세션 |
| 와이어프레임 | design-vision §3.5 (가로형 §3.5.1 좌표표, 세로형 §3.5.2 좌표표, 봇 §3.5.3, 연습 §3.5.4, 덧씌움 §3.5.5) |
| 연출·소리 | design-vision §4.6 전체(J·C·A·S·G·R·H·Q·X·D·M·RX), §4.7 BGM-2 |

**레이아웃 구성 (가로형 기준 — 세로형 좌표는 design-vision §3.5.2):**

| 영역 | 컴포넌트 | 설명 | 데이터 원천 |
|:---|:---|:---|:---|
| Top | MatchBar | 모드·ROUND n·내 승수 ● / 경기 시간 / 상대 승수 / ⚙(사람·봇) 또는 ❚❚(연습) | `start.round`, `roundEnd.wins`, `start.matchElapsedMs` |
| Left | HoldBox | 홀드 블록 | 로컬 엔진 |
| Left | HeroSkillButton | 엠블럼·스킬명·비용·쿨다운·⟨A⟩ | heroes.json, rules `heroSkills`, `status` |
| Left | AngelButtons × 5 (사람·봇만) | 천사 아이콘(§2.13.2 축소)·비용·쿨다운·봉인·⟨1~5⟩ | angels.json, rules `angels`, `status.cooldowns`·`sealedMs`·`gauge` |
| Left | ArmorSlots × 6 (사람·봇만) | 갑주 아이콘·보유 수·⟨Q~Y⟩ | armor.json, `status.armors` |
| Left | EffectChips (최대 2) | 걸린 악한 영 이름·남은 시간 | `status.effects`, spirits.json |
| Left | ReadyIndicators | 준비된 방어 아이콘 · 은혜 비둘기 · 예수님 이벤트 사용 별빛 | `status.armed`·`grace`·`jesusUsed`, `start.grace` |
| Center | FaithGauge | 세로 게이지 + 스킬 비용 눈금 | `status.gauge`·`gaugeMax`, rules 비용 |
| Center | MyBoard (Pixi) | 10×20 보드, 고스트·힌트, 특수 칸 | 로컬 엔진 (`start.seed`) |
| Center | PendingBar (사람·봇만) | 받을 공격 줄 수 + 상승 타이머 선 | `status.pending`, `attack.pending`, `garbage.pending`, rules `garbage.delayMs` |
| Center | NextQueue | 다음 블록 `start.preview`개(가브리엘 효과 중 7) | 로컬 엔진, `start.preview`, `effect.params.pieces` |
| Center | StatsBox | 점수·줄·콤보 (연습: 개인 기록 패널) | 로컬 엔진 |
| Lane | CollisionPoint · ReactionButtons × 3 (사람·봇만) | 충돌 연출 기준점, 🙏🔥😇 ⟨8·9·0⟩ | rules `reactions` |
| Right | OpponentHeader | 엠블럼·닉네임 또는 "봇 (난이도)"·레이팅 | `matched.opponent` |
| Right | OpponentBoard (Pixi) · OpponentHold · OpponentStats · OpponentPendingBar | 상대 스냅샷 | API-020 `opponentState` |
| Right | OpponentEffectChips | 내가 보낸 영 이름·남은 시간 | 보낸 `attack.spiritId`·`duration` |
| Overlay | Subtitle · Callout · QuizModal · OptionsModal · PauseMenu · LeaveConfirm · RotatePrompt · FatalModal · LiveRegions(2) | design-vision §3.5.5, §4.8, §6.4 | 아래 인터랙션 |

**인터랙션 — 사용자 입력 → 서버:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 이동·회전·드롭·홀드 키 / 제스처 (design-vision §4.3) | 로컬 엔진 조작 + J-01~J-08 연출 | — |
| 매 1/`rules.net.stateHz`초 (12회/초) | 내 보드 스냅샷 `state` 전송 — seq·board(200자, CODE-009)·active·hold·score·combo·pieceCount | API-012 |
| 줄 삭제 (엔진 clear) | C-01~C-13 연출 + `clear` 전송 — seq·lines·combo·b2b·tspin·pieceCount·specials (연습도 전송 — 게이지 충전) | API-013 |
| 위인 스킬 키 / 버튼 | `skill` 전송 — kind=hero, skillId=내 위인 skill_id (화면은 서버 `effect`를 받기 전에 효과를 적용하지 않음 — 버튼 눌림 연출만) | API-014 |
| 천사 키 / 버튼 (사람·봇) | `skill` 전송 — kind=angel, skillId=천사 id(CODE-011) | API-014 |
| 갑주 키 / 슬롯 (사람·봇) | `armor` 전송 — armorId(CODE-010) | API-015 |
| 퀴즈 보기 키 1~4 / 클릭 | `answer` 전송 — quizId·choice(0~3) + Q-02 | API-016 |
| 리액션 키 / 버튼 (사람·봇) | `reaction` 전송 — reactionId(CODE-014) + RX-01 (봇 대전은 서버가 중계하지 않음) | API-017 |
| Top-out (엔진) | C-13 판정 → `topout` 전송 — seq·pieceCount·voluntary=false | API-018 |
| 연습 일시정지 → [그만하기] (UC-006 6a) | `topout` 전송 — voluntary=true | API-018 |
| Esc / ⚙ (사람·봇) | OptionsModal (게임 계속) | — |
| Esc / ❚❚ (연습) | PauseMenu — 로컬 엔진·낙하·입력 정지, `state` 전송도 정지 / [계속하기]로 재개 | — |
| 경로 이탈 시도 (뒤로 가기·다른 해시) | LeaveConfirm (D3-13) → [나가기]: 방 소켓 닫기 → `#/lobby` (서버가 이탈 패배 기록 — FR-009) / [머무르기]: 해시 복원 | API-006 종료 |

**인터랙션 — 서버 메시지 → 화면:**

| 메시지 | 화면 동작 | 연결 API |
|:---|:---|:---|
| `start` | 엔진 초기화(seed·stage·preview·matchElapsedMs), 은혜 D-03, 카운트다운 M-01, 해금 첫 등장 X-06, 라운드 2·3이면 보드 비우고 다시 | API-019 |
| `opponentState` | 상대 보드·홀드·점수·콤보·받을 공격 갱신 | API-020 |
| `attack` (from=나) | A-01 (canceled>0이면 A-03·A-04), blockedBy면 상대 쪽 A-06 축소, 상대 효과 칩 추가 | API-021 |
| `attack` (target=나) | 받을 공격 반영 + A-02, 영 효과 적용·S-01~S-14, blockedBy면 A-06, reflected면 A-07 | API-021 |
| `garbage` (target=나) | 쓰레기 줄 상승 A-05 / voided A-05b | API-022 |
| `effect` (target=나) | source별 적용·연출: hero H-01~H-04 · angel G-01~G-05 · armor R-01~R-06 · jesus §4.6.8 · special X-03/X-04/R-07 · grace D-03 | API-023 |
| `effect` (target=상대) | 상대 보드 쪽 축소 연출만 (다윗 물맷돌은 받는 쪽이 자기 보드에 적용) | API-023 |
| `status` | HUD 전부 갱신 (design-vision §4.4) — HUD의 유일한 원천 | API-024 |
| `reject` | design-vision §4.5 매핑 | API-025 |
| `quiz` | 정지 + QuizModal Q-01 | API-026 |
| `quizResult` | Q-05~Q-09, `resumeInMs` 후 Q-10 | API-027 |
| `reaction` | RX-02 | API-028 |
| `roundEnd` | M-02 / M-03, `nextRoundInMs` 막대 | API-029 |
| `matchEnd` | 마지막 matchEnd를 SessionStore에 저장 → M-04/M-05/M-06/M-07 → `#/result` | API-030 |
| `error` (MATCH_ABORTED 등, UC-005 E2) | FatalModal error.message + [로비로] | API-031 |
| 방 소켓 비정상 종료 (내 연결 끊김) | FatalModal "연결이 끊어졌습니다" + [로비로] (경기 복귀 없음 — OQ #18, N-02 미승격) | API-006 |

**변형별 차이:**

| 요소 | 사람 대 사람 | 봇 대전 | 연습 |
|:---|:---:|:---:|:---:|
| 상대 영역(보드·머리글·받을 공격) | ✅ | ✅ "봇 (난이도)" | ❌ (개인 기록 패널) |
| 받을 공격 막대 | ✅ | ✅ | ❌ |
| 천사 버튼 · 갑주 슬롯 | ✅ | ✅ | ❌ (MODE_FORBIDDEN — OQ #4) |
| 리액션 버튼 | ✅ 중계 | ✅ 내 화면만 | ❌ |
| 말씀 대결 | ✅ | ✅ (봇 응답) | ❌ |
| 위인 스킬 | ✅ | ✅ | ✅ (다윗 물맷돌은 연습용 표시 연출만 — UC-006 4단계) |
| Esc | 옵션 모달 | 옵션 모달 | 일시정지 메뉴 |
| 라운드·승수 | 3판 2선승 | 3판 2선승 | 없음 (세션 1개) |

**상태:** 로딩 = 카운트다운 전 "전장을 준비하는 중…"(start 대기) / 빈 상태 = 해당 없음 / 오류 = FatalModal, reject 토스트.

### SCR-006: 결과 (말씀 카드)

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-006 |
| 화면명 | 결과 (말씀 카드) |
| 경로 | `#/result` |
| 연결 UC | UC-015 (5~10단계, 6a, 6b, 9a, E2, E3), UC-016 (5단계), UC-006 (6단계) |
| 연결 REQ / FR | REQ-001, REQ-013, REQ-014, REQ-015, FR-007, FR-056, FR-063, FR-065, FR-066, FR-068, FR-070, C-003 |
| 인증 | 필요 + 저장된 마지막 `matchEnd` |
| 와이어프레임 | design-vision §3.6 WF-006 |
| 연출·소리 | AC-01, RT-01, GR-01, SV-01 / BGM-1 2초 페이드 인 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 | 데이터 원천 |
|:---|:---|:---|:---|
| Header | ResultTitle | VICTORY / DEFEAT / 연습 종료 | `matchEnd.you.result`, `mode` |
| Header | Scoreline | "2 : 1 · 5분 12초 · 사유" (사유: topout → "Top-out", disconnect → "상대가 나갔습니다") | `wins`, `durationMs`, `reason` |
| Header | VictoryVerse (승리 시) | 구절 3줄 | `victoryVerseRef` → verses.json |
| Left | VerseCard | 4:5 카드 미리보기: 엠블럼(구절이 John 16:33이면 빛 별 문양 — design-vision §2.13.6)·구절 3줄·푸터 | `verseRef` → verses.json, 내 heroId 엠블럼 |
| Left | SaveImageButton | [이미지 저장] | — |
| Left | ShareButton | [공유] — PNG 파일로 `navigator.canShare`를 호출해 참일 때만 렌더 (UC-015 9a) | — |
| Right | RecordTable | 최대 콤보·분당 공격·퀴즈 정답률(%)·테트리스·지운 줄·플레이 시간 (연습: 퀴즈 정답률 행 숨김) | `you.record` |
| Right | GrowthColumn | ▲▼ 차이 (null이면 열 숨김 — 첫 경기·연습) | `you.growth` |
| Right | RatingDelta | before → after (±n) (null이면 숨김 — 봇·연습) | `you.rating` |
| Right | AchievementSeal | 새 업적마다 인장 + 이름 | `you.achievements`, rules `achievements[id].name_ko` |
| Right | SaveFailBanner | "기록 저장에 실패했습니다" (UC-015 E2) | `you.saved` = false |
| Footer | LobbyButton | [로비로] (기본 포커스) | — |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 화면 진입 | 저장된 matchEnd로 그림, 레이팅 after가 있으면 SessionStore 레이팅 갱신, roundsPlayed는 다음 API-002 호출 때 갱신 | (API-030 데이터) |
| [이미지 저장] | 화면 밖 `<canvas>` 1080×1350에 카드 그리기: 바탕 #07060D + 하늘 그라데이션, 안쪽 40px 금 테두리 8px, 엠블럼 160(위 가운데), KJV 원문 Cinzel 44px(폭 880 줄바꿈), 번역 Noto Serif KR 40px, 출처 32px #E8B84A, 푸터 "SPIRITUAL WARFARE TETRIS · 영적 전쟁 테트리스" 24px #9C93B3 → `toBlob('image/png')` → 파일명 `swt-verse-YYYYMMDD-HHmm.png` 내려받기 | — |
| [공유] | 같은 PNG로 `navigator.share` 호출 — files=[카드 PNG], title="영적 전쟁 테트리스", text=구절 출처 | — |
| 저장·공유 실패 (UC-015 E3) | 토스트 "카드를 저장하지 못했습니다" (공유를 사용자가 취소한 경우는 토스트 없음) | — |
| [로비로] / Esc | `#/lobby` | — |

**상태:** 로딩 = 없음 / 빈 상태 = 성장·레이팅·업적이 없으면 해당 칸 숨김 / 오류 = SaveFailBanner, 카드 저장 실패 토스트.

### SCR-007: 전적

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-007 |
| 화면명 | 전적 |
| 경로 | `#/history` |
| 연결 UC | UC-018 (1~4단계, 4a, E1, E2) |
| 연결 REQ / FR | REQ-014, FR-069 |
| 인증 | 필요 |
| 와이어프레임 | design-vision §3.7 WF-007 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 | 데이터 원천 |
|:---|:---|:---|:---|
| Header | BackButton + Title | [← 로비] "전적" | — |
| Main | HistoryTable (데스크톱) / HistoryCards (모바일) | 결과 배지 "승"(#E8B84A 바탕)·"패"(#3A3058 바탕, #F4EFE3 글자) / 상대: `opponent.nickname` 또는 "봇 (쉬움·보통·어려움)" (`botLevel` — api-gate API-003 주석) / endReason=disconnect이면 "상대 이탈"(승)·"이탈"(패) 꼬리표 / 위인 엠블럼 2개 (`me.heroId`, `opponent.heroId`) / 라운드 `me.roundsWon : opponent.roundsWon` / 레이팅 `ratingAfter − ratingBefore`(null이면 "—") / 시간 `durationMs` → m:ss / 일시 `playedAt` → 로컬 "YYYY.MM.DD HH:mm" | API-003 `data[]` |
| Footer | LoadMoreButton | [더 보기] — `meta.nextBefore`가 있을 때만 | API-003 `meta` |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 화면 진입 | `GET /api/matches?limit=20` (Bearer 토큰) → 목록 그리기 | API-003 |
| [더 보기] | `GET /api/matches?limit=20&before=nextBefore` → 뒤에 이어 붙임, 새 첫 행으로 포커스 | API-003 |
| 401 (UC-018 E2) | `swt.guest` 삭제 → `#/entry` | API-003 |
| 503·네트워크 (UC-018 E1) | "전적을 불러오지 못했습니다" + [다시 시도] | API-003 |

**상태:** 로딩 = 행 모양 뼈대(스켈레톤) 줄 5개(바탕 #161226↔#1F1936 1.2초 맥동, 감소 모드 정지) / 빈 상태 = "아직 경기 기록이 없습니다" + [대전하러 가기] (UC-018 4a) / 오류 = 재시도 패널.

### SCR-008: 랭킹

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-008 |
| 화면명 | 랭킹 |
| 경로 | `#/ranking` |
| 연결 UC | UC-019 (1~3단계, 3a, E1) |
| 연결 REQ / FR | REQ-015, FR-071, FR-070 |
| 인증 | 필요 |
| 와이어프레임 | design-vision §3.8 WF-008 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 | 데이터 원천 |
|:---|:---|:---|:---|
| Header | BackButton + Title | "랭킹 (레이팅 상위 100)" | — |
| Main | RankTable | 순위(1~3위 금·은·놋 메달 배지)·닉네임·레이팅, `isMe` 행 금 테두리 2px + #1F1936 + "(나)" | API-004 `data.top[]` |
| Footer | MyRankBar | 내가 top에 없을 때만: "내 순위: n위 · 닉네임 · 레이팅" 하단 고정 (UC-019 3a) | API-004 `data.me` |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 화면 진입 | `GET /api/leaderboard` → 표 그리기, 내 행이 있으면 그 행으로 스크롤(가운데) | API-004 |
| 401 | `swt.guest` 삭제 → `#/entry` | API-004 |
| 503·네트워크 (UC-019 E1) | "랭킹을 불러오지 못했습니다" + [다시 시도] | API-004 |

**상태:** 로딩 = 뼈대(스켈레톤) 줄 8개 / 빈 상태 = top이 비면 "아직 순위가 없습니다" / 오류 = 재시도 패널.

### SCR-009: 옵션

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-009 |
| 화면명 | 옵션 (화면 + 대전 중 모달 공용) |
| 경로 | `#/options` (대전 중에는 경로 변경 없이 모달) |
| 연결 UC | UC-020 (1~4단계, 3a, E1) |
| 연결 REQ / FR | REQ-013, FR-057, FR-060, FR-058, FR-059, C-007 |
| 인증 | 필요 |
| 와이어프레임 | design-vision §3.9 WF-009, 모달 §3.5.5 (c) |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 | 데이터 원천 |
|:---|:---|:---|:---|
| Header | BackButton / CloseButton | 화면: [← 뒤로] / 모달: [닫기 ⟨Esc⟩] | — |
| Main (소리) | VolumeSlider × 3 | 마스터·효과음·음악, 0~100 step 5, 값 숫자 표시 | SessionStore 옵션 (기본 80·80·60) |
| Main (소리) | MuteToggle | 끔/켬 | SessionStore |
| Main (연출) | ShakeToggle | 켬/끔 (기본: reduced-motion이면 끔) | SessionStore (D3-08) |
| Main (연출) | FlashSegment | 강/중/약 (기본: reduced-motion이면 약) | SessionStore |
| Footer | SessionNotice | "ⓘ 설정은 이번 접속 동안만 유지됩니다." | 고정 문구 (N-04 미승격) |
| Modal 전용 | MatchWarning · LeaveMatchButton | "대전은 멈추지 않습니다" / [경기 나가기] → LeaveConfirm | — |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 슬라이더 변경 | 해당 버스 `rampTo`(0.05s) 즉시 반영, 효과음·마스터는 SFX-01 1회 미리 듣기 (design-vision §4.7.1) | — |
| 음소거 켬/끔 (UC-020 3a) | `Tone.Destination.mute`, 슬라이더 값 보존 | — |
| 흔들림 끔 | 모든 SHK 0, 진동 끔 즉시 (진행 중 흔들림도 멈춤) | — |
| 섬광 세기 | FL 배율 즉시 변경 | — |
| 오디오 미시작 상태 (UC-020 E1) | 이 화면에서의 첫 클릭으로 `Tone.start()` | — |
| [← 뒤로] / Esc | 화면: 직전 경로(보통 `#/lobby`) / 모달: 닫기 | — |

**상태:** 로딩·빈·오류 = 해당 없음 (로컬 상태만).

---

## 3. 라우팅 가드

> 클라이언트 가드는 **화면 흐름 보호**용이고, 데이터 보호는 서버가 한다(모든 REST는 Bearer 토큰 — API-002~API-004, WS는 `join`·`ready` 토큰 + 1회용 티켓 — api-gate §5, 봉인 제7계명). 클라이언트 가드를 우회해도 서버 데이터에는 접근할 수 없다.

| 경로 | 진입 조건 | 조건 실패 시 | 근거 |
|:---|:---|:---|:---|
| 앱 시작 (모든 경로) | 부팅 1회: `swt.guest`가 있으면 API-002로 토큰 확인 | 없음·401 → `#/entry` (401이면 `swt.guest` 삭제) / 503 → SCR-001 RetryPanel | UC-001 1·1a·E3·E4 |
| `#/entry` | 인증된 세션이 **없을** 것 | 이미 인증됨 → `#/lobby` | UC-001 1a |
| `#/lobby`, `#/history`, `#/ranking`, `#/options` | 인증된 세션 | `#/entry` | 봉인 제7계명 |
| `#/hero` | 인증 + 흐름 상태 `mode` 있음 | `#/lobby` | UC-002 순서 |
| `#/waiting` | 인증 + `mode` + `heroId` | `#/lobby` | UC-002 5단계 |
| `#/battle` | 인증 + 활성 대전 세션(방 소켓 열림 + 첫 `start` 수신) | `#/lobby` (새로고침으로 들어온 경우 포함 — 경기 복귀 없음, N-02 미승격) | UC-003~UC-006, OQ #18 |
| `#/battle`에서 떠나기 | 이탈 확인 모달 [나가기] | [머무르기] → 해시 `#/battle` 복원 | D3-13, FR-009 |
| `#/result` | 인증 + 저장된 마지막 `matchEnd` | `#/lobby` | UC-015 |
| 알 수 없는 해시 | — | 인증이면 `#/lobby`, 아니면 `#/entry` | — |
| 진행 중 401·UNAUTHORIZED 수신 (어느 화면이든) | — | `swt.guest` 삭제 → `#/entry` + 토스트 "입장 정보가 올바르지 않습니다." | UC-003 E3, UC-018 E2 |

---

## 4. 반응형 디자인

> 토큰·규칙 원본: design-vision §5. 여기에는 화면 설계상 확정 사항만 적는다.

| 디바이스 | 최소 너비 | 레이아웃 변경 |
|:---|:---:|:---|
| Mobile | 0px | 메뉴 화면 1열(4열 그리드, 여백 16), 로비 하단 고정 바, 위인 2×2 + 상세 시트, 전적 카드 목록, 결과 1열. 대전은 세로형 720×1280 + 제스처·행동 버튼, 휴대폰 가로는 회전 안내 |
| Tablet | 768px | 메뉴 8열·여백 32, 로비·위인 2×2, 결과 2열, 전적 표 5열. 대전: 가로 방향이면 가로형(터치 버튼 높이 56), 세로 방향이면 세로형 |
| Desktop | 1024px | 메뉴 12열·여백 48·최대 폭 1120, 로비·위인 4개 가로, 전적 표 7열. 대전 가로형 1280×720 (창 비율이 세로로 길면 세로형) |

| 화면 | 반응형 확정 사항 |
|:---|:---|
| SCR-001 | 가상 키보드가 올라오면 입력칸이 보이도록 `scrollIntoView`(block=center) |
| SCR-002 | Mobile: 모드 카드 세로 쌓기, 전적·랭킹 하단 고정 바(높이 64 + 안전 영역) |
| SCR-003 | Mobile: 선택 상세는 하단 시트(최대 높이 60vh, 스크롤), 확정 버튼 하단 고정 |
| SCR-004 | 코드 칸 Mobile 44×56 / 그 외 64×80, 상대 발견 연출 Mobile 세로 배치 |
| SCR-005 | design-vision §5.2 배치 선택 표 + §3.5.1·§3.5.2 좌표표. 크기 변경 시 게임 상태 유지 |
| SCR-006 | Mobile: 카드 → 버튼 → 기록 순, [로비로] 하단 고정 |
| SCR-007 | Mobile 카드 / Tablet 표 5열(위인·일시는 행을 누르면 펼침) / Desktop 7열 |
| SCR-008 | 모든 크기 3열 표, 내 순위 하단 고정 줄 56 |
| SCR-009 | Mobile 전체 폭 / 그 외 폭 560 가운데, 대전 중 모달 크기 design-vision §3.5.5 (c) |

---

## 5. 접근성 (WCAG 2.1 AA)

> 기준·대비 검증표 원본: design-vision §6. 화면별 포커스 순서와 의미 구조:

| 화면 | 포커스 순서 (Tab) | 의미 구조 · ARIA | 키보드 |
|:---|:---|:---|:---|
| SCR-001 | 닉네임 입력 → 입장하기 (부팅 확인 중에는 `aria-busy="true"`) | `<main>`·`<h1>`·`<label for>`, 오류 `role="alert"` + `aria-invalid` | Enter 제출 |
| SCR-002 | 전적 → 랭킹 → 옵션 → 모드 카드 4(각 카드 안 버튼·세그먼트) | 카드 묶음 `role="group"` + `aria-label="싸움 방식"`, 난이도 `role="radiogroup"` | ←/→ 카드 이동, Enter 실행 |
| SCR-003 | 뒤로 → 위인 카드 묶음(하나의 탭 정지점) → 확정 | `role="radiogroup"` + 카드 `role="radio"` `aria-checked`, 카드 `aria-describedby`=효과·구절 | ←/→ 선택 이동, Space 선택, Enter 확정, Esc 뒤로 |
| SCR-004 | (b)(a) 취소 / (c) 코드 6칸 → 입장하기 → 취소 | 상태 문장 `role="status"`, 코드 표시 `aria-label="초대 코드 K 7 Q M 2 X"`(글자 사이 띄움 낭독), 입력 칸 `aria-label="초대 코드 n번째 글자"` | 코드 칸 자동 다음 칸 이동, Backspace 이전 칸 |
| SCR-005 | ⚙(❚❚) → 위인 스킬 → 천사 1~5 → 갑주 1~6 → 리액션 3 (조작 키는 포커스와 무관하게 동작) | 캔버스 `aria-hidden`, HUD `<button aria-label="이름, 상태">`, 알림 영역 polite·assertive 2개(design-vision §6.4), 퀴즈 모달 `role="dialog"` `aria-modal="true"` + 보기 `<button>` | design-vision §4.3 전체 |
| SCR-006 | 이미지 저장 → 공유 → 로비로(기본 포커스) | 카드 미리보기 `role="img"` `aria-label`=구절 전문, 기록 `<table>`, 저장 실패 `role="alert"` | Esc 로비 |
| SCR-007 | 뒤로 → 표(행 단위 읽기) → 더 보기 | `<table>` + `<caption>전적</caption>` + `<th scope="col">`, 결과는 글자 "승/패" | — |
| SCR-008 | 뒤로 → 표 → (내 순위 줄) | `<table>`, 내 행 `aria-current="true"`, 메달 배지 `aria-label="1위"` | — |
| SCR-009 | 뒤로/닫기 → 마스터 → 효과음 → 음악 → 음소거 → 흔들림 → 섬광 → (모달: 경기 나가기) | `<fieldset><legend>소리</legend>`·`<legend>연출</legend>`, 슬라이더 `<input type="range">` `aria-valuetext="80"` | ←/→ 슬라이더 5씩, Esc 닫기 |

---

## 6. UC-화면 중복 해체 검증 (SKILL-03, P3-004)

> *"Let all things be done decently and in order."* — 1 Corinthians 14:40 (KJV)
> 규칙: ① 같은 기능이 두 UC에 나뉘지 않는다 ② 같은 역할의 두 화면은 통합하거나 경계를 분리한다 ③ 각 UC는 고유한 진입점과 고유한 출력을 가진다.

| UC-ID | 매핑 화면 | 핵심 기능 (고유 진입점 → 고유 출력) | 다른 UC/화면과 기능 중복 여부 | 처리 |
|:--|:--|:--|:--|:--|
| UC-001 | SCR-001 | 닉네임 입력 → 게스트 토큰 저장·로비 | ❌ 없음 | 독립 |
| UC-002 | SCR-002 → SCR-003 | 모드 카드 선택 → 위인 확정·흐름 상태 | ⚠️ 한 UC가 두 화면에 걸침 (모드 선택 / 위인 선택) | 분리 — SCR-002는 "모드", SCR-003은 "위인"만 담당. 두 화면이 같은 기능을 하지 않음 (UC-002 정상 경로 2단계·4단계가 각각 하나씩) |
| UC-003 | SCR-004 (a)(e) → SCR-005 | `join random` → `matched`·`start` | ⚠️ UC-004와 같은 대기 화면(SCR-004) 사용 | 통합 — SCR-004 한 화면이 "로비 소켓 입장 절차"를 맡고 변형 (a)/(b)(c)로 경계 분리. 매칭 규칙(대기열)·초대 규칙(코드)은 서버가 다르게 처리, 출력(`waiting.inviteCode` 유무)도 다름 |
| UC-004 | SCR-004 (b)(c)(e) → SCR-005 | 방 만들기 → 코드 발급 / 코드 입력 → 같은 방 입장 | 위 UC-003 참조 | 통합 (변형 분리) |
| UC-005 | SCR-004 (d)(e) → SCR-005 봇 변형 | `join bot` → 봇 상대 대전 | ⚠️ UC-003·UC-004와 같은 대전 화면 | 통합 — 대전 규칙 화면은 하나(SCR-005), 봇 차이는 상대 머리글·리액션 중계만 (§2 SCR-005 변형 표). 봇 전용 대전 화면을 따로 만들지 않음 |
| UC-006 | SCR-004 (d) → SCR-005 연습 변형 → SCR-006 | `join practice` → 혼자 플레이 → 개인 기록 | ⚠️ 대전 화면 공유 | 통합 — "연습 화면 = 대전 화면에서 상대 보드·말씀 대결·천사·갑주 제거"(architecture §13-4). 결과도 SCR-006 연습 변형 (승패·레이팅 칸 숨김) |
| UC-007 | SCR-005 | 블록 조작 → 줄 삭제·`clear` | ❌ 없음 (조작은 이 UC만) | 독립 |
| UC-008 | SCR-005 | 서버 `attack`·`garbage` → 쓰레기·악한 영 연출 | ⚠️ FR-053 공격 연출이 UC-007 삭제 연출과 같은 프레임에 이어짐 | 분리 — UC-007은 "내 삭제 연출(C-*)", UC-008은 "서버 판정 공격 연출(A-*·S-*)" — 트리거가 다름(로컬 엔진 vs API-021) |
| UC-009 | SCR-005 | 위인 스킬 키 → `skill hero` → `effect` H-* | ⚠️ UC-010과 같은 `skill` 메시지 | 분리 — `kind` hero/angel(CODE-015)로 구분, 버튼·키·연출(H-* / G-*)이 다름 |
| UC-010 | SCR-005 | 천사 키 → `skill angel` → `effect` G-* | 위 UC-009 참조 | 분리 |
| UC-011 | SCR-005 | 갑주 획득(R-07)·사용(`armor` → R-01~R-06) | ⚠️ UC-013 보상으로도 갑주 획득 | 분리 — 갑주 "획득 연출 R-07"은 하나의 컴포넌트, 진입 원천만 둘(`effect armor_acquired` / `quizResult.reward`). 사용은 UC-011만 |
| UC-012 | SCR-005 (+ SCR-006 말씀 카드 구절) | 서버 `effect jesus` → 빛 실루엣 연출 | ❌ 없음 (사용자 진입점 없음 — 시스템 이벤트) | 독립 |
| UC-013 | SCR-005 퀴즈 모달 | `quiz` → `answer` → `quizResult` | ⚠️ UC-014 말씀 블록이 트리거 | 분리 — UC-014는 블록 삭제 연출(Q-00)까지, 모달 진행은 UC-013만 |
| UC-014 | SCR-005 | 특수 칸 삭제 → X-* 효과 | 위 UC-013 참조 | 분리 |
| UC-015 | SCR-005 (M-02~M-05) → SCR-006 | `roundEnd`·`matchEnd` → 결과·말씀 카드 | ⚠️ UC-016과 같은 결과 화면 | 통합 — 결과 화면 하나가 `matchEnd.reason`(topout/disconnect)으로 사유만 다르게 표시 |
| UC-016 | SCR-005 (M-06) → SCR-006 | 상대 소켓 종료 → `matchEnd reason=disconnect` | 위 UC-015 참조 | 통합 |
| UC-017 | SCR-005 | 리액션 키 → `reaction` → 상대 RX-02 | ❌ 없음 (채팅 화면 없음 — C-009) | 독립 |
| UC-018 | SCR-007 | 로비 [전적] → API-003 목록 | ❌ 없음 (결과 화면은 방금 경기 1건, 전적은 저장된 목록 — 원천 API가 다름) | 독립 |
| UC-019 | SCR-008 | 로비 [랭킹] → API-004 순위 | ❌ 없음 (결과 화면의 레이팅 변화는 내 값 1개, 랭킹은 전체 순위) | 독립 |
| UC-020 | SCR-009 (+ 대전 중 같은 컴포넌트 모달) | 옵션 값 변경 → 즉시 반영 | ⚠️ 로비 옵션 화면과 대전 중 옵션이 두 곳 | 통합 — 컴포넌트 1개(SCR-009)를 화면과 모달 두 방식으로 표시. 기능·상태 저장소 같음 |
| UC-021 | 화면 없음 (터미널) | 개발자 `npm install && npm run dev` | ❌ 없음 | 독립 — 화면 대상 아님 (ACT-006) |
| UC-022 | 화면 없음 (터미널) | 개발자 테스트 명령 | ❌ 없음 (E2E는 SCR-005를 관찰만) | 독립 — 화면 대상 아님 |

**검증 결과:** 중복 의심 11건(⚠️) — 통합 6건(UC-003/004 대기 화면, UC-005·UC-006 대전 화면, UC-015/016 결과 화면, UC-020 옵션), 분리 5건(UC-002, UC-008, UC-009/010, UC-011, UC-013/014) → **처리되지 않은 중복 0건**. 화면끼리 같은 역할을 하는 쌍 0건(SCR-001~SCR-009 각자 고유 진입점·출력). 모든 UC가 고유 진입점(사용자 행위 또는 서버 메시지)과 고유 출력을 가진다.

**화면 → UC 역방향 확인 (모든 화면이 UC에 매핑 — P3-003):**

| SCR-ID | 매핑 UC | UC 없는 화면 여부 |
|:---|:---|:---:|
| SCR-001 | UC-001 | ❌ 없음 |
| SCR-002 | UC-002 (+ UC-018·019·020 진입) | ❌ 없음 |
| SCR-003 | UC-002 | ❌ 없음 |
| SCR-004 | UC-003, UC-004, UC-005, UC-006 | ❌ 없음 |
| SCR-005 | UC-005~UC-014, UC-016, UC-017 | ❌ 없음 |
| SCR-006 | UC-015, UC-016, UC-006 | ❌ 없음 |
| SCR-007 | UC-018 | ❌ 없음 |
| SCR-008 | UC-019 | ❌ 없음 |
| SCR-009 | UC-020 | ❌ 없음 |

---

## 7. 디자인 시스템 (요약 — 원본 design-vision §2)

| 항목 | 규격 |
|:---|:---|
| 주 색상 (Primary) | #E8B84A (금 — 성막의 금, 빛) |
| 보조 색상 (Secondary) | #F6D98B (밝은 금) / #FFF8E7 (거룩한 흰빛) |
| 배경색 | #07060D (심연) · 패널 #161226 · 보드 #0A0814 |
| 위험·악 | #E5484D (그래픽) · #FF6B6F (글자) · #8E2A5A (악한 영) |
| 블록 7색 | I 청색 #3D7BFF · O 금 #F2C14E · T 자색 #9B4DFF · S 은 #A9B4C4 · Z 홍색 #E8304A · J 세마포 #EFE6D0 · L 놋 #D2873A (Exodus 26) |
| 폰트 | Cinzel 400·700·900 (영어·숫자·콜아웃), Noto Serif KR 400·700·900 (한국어) — @fontsource 번들. 크기 12 / 14 / 16 / 18 / 20 / 28 / 40 / 44 / 56 / 72 / 112 / 160 |
| 간격 (Spacing) | 4px 기반 (4, 8, 12, 16, 24, 32, 48, 64) |
| 그리드 | Desktop 12열·거터 24 / Tablet 8열·거터 16 / Mobile 4열·거터 12. 대전은 가상 해상도 1280×720 · 720×1280 |
| 모서리 반경 (Border Radius) | 3 (보드 칸) · 6 (칩) · 8 (버튼·입력) · 12 (카드) · 20 (모달) · 999 (원형) |
| 모션 | 60 / 120 / 200 / 360 / 800 / 1600ms, `power2.out`·`back.out(1.7)`·`expo.out`·`elastic.out(1, 0.45)` |

---

## 8. ⚖️ 심판 관문 판정 (Gate Judgment — Phase 3)

> *"For we must all appear before the judgment seat of Christ."* — 2 Corinthians 5:10 (KJV)
> 판정일: 2026-10-19 · 판정 대상: `bible-성경/03.design-order-질서/` 2개 파일 + RTM §7 갱신 · 기준: `.skill/gate-judgment-심판관문.md` 범용 G-001~G-008 + Phase 3 전용 P3-001~P3-005 · 각 항목 개별 판정 후 총평 (제8계명)

### 8.1 범용 심판 (G-001 ~ G-008)

| # | 체크 항목 | 판정 근거 | 판정 |
|:--|:--|:--|:--:|
| G-001 | 템플릿 형식·필수 섹션 준수 | 디자인명세: 템플릿 필수 6섹션 — 1 디자인 개요 · 2 디자인 시스템(색상 §2.1~2.4, 타이포 §2.6, 간격/그리드 §2.7) · 3 와이어프레임(9화면, 최소 3개 기준 초과) · 4 인터랙션 디자인 · 5 반응형(Mobile/Tablet/Desktop) · 6 접근성(WCAG 2.1 AA). 화면설계: 템플릿 필수 5섹션 — 1 화면 목록(SCR-ID·화면명·경로·연결 UC·연결 REQ·인증) · 2 화면 상세 명세(화면마다 항목표·레이아웃 구성·인터랙션+연결 API) · 3 라우팅 가드 · 4 반응형 · 5 접근성, 템플릿의 "디자인 시스템 섹션 형식"은 §7, SKILL-03 필수 "UC-화면 중복 해체 검증"은 §6. 템플릿 검증 규칙(UC·REQ 연결, 대비 4.5:1, 로딩·빈·오류 상태 명시)은 화면마다 "상태" 줄과 디자인명세 §6.2로 충족 | ✅ |
| G-002 | `bible-성경/` 해당 디렉토리 정경화 | 두 파일 모두 `bible-성경/03.design-order-질서/`에 저장 (언약책 §4 산출물 저장 경로). 파일명은 SKILL-03 산출물 표 그대로(디자인명세 D3-01) | ✅ |
| G-003 | `statute-율법/` 원본 미수정 | `git status --porcelain -- statute-율법 parable-비유 book-경전 .skill hearing-들음` 결과 0줄. 변경은 `bible-성경/03`(신규 2), `bible-성경/01/rtm-covenant-언약추적.md`(SKILL·템플릿 갱신 규칙에 따른 순방향 기록), `fruit-열매/history/2026-10-19.md`(로그)뿐 | ✅ |
| G-004 | 이전 Phase 산출물 근거 | 모든 화면이 UC·REQ에 연결(§1, §6), 모든 인터랙션에 API-ID 연결(§2), 수치는 rules.json(TBL-018)·status(API-024) 원천을 명시(디자인명세 §1 수치 원칙·§4.4), architecture §13 인계 7항목을 전부 반영(아래 표 P3 근거 열·디자인명세 D3-01~D3-15) | ✅ |
| G-005 | 설계에 없는 임의 내용 추가 없음 | NICE-TO-HAVE 미반영: 키 재설정 화면 없음(N-01), 경기 복귀 없음(N-02), 튜토리얼 없음(N-03), 옵션 저장 없음 — "이번 접속 동안만" 안내(N-04), 저장 모드 표시 없음(N-06). 초대 링크 복사·공유 버튼 없음(S16 기각 — 코드는 선택 가능한 글자로만), 관전 화면 없음(S17), 채팅 입력칸 없음(C-009), 상점·결제 요소 없음(C-001), 기권 메시지 없음(D3-13 — 이탈은 FR-009 경로). 보조 효과음 15종은 각각 근거 FR을 명시(D3-11). 7색 중 은·놋은 같은 장(Exodus 26)의 성막 재료로 근거 명시(D3-05) | ✅ |
| G-006 | 플레이스홀더 없음 | 두 파일 + RTM에서 템플릿 중괄호 자리표시자·작업 미완 표식(영문 약어 2종)·미확정 표기 검색 결과 0건. 메시지 필드는 중괄호 대신 "필드 a·b·c" 문장으로 기술 | ✅ |
| G-007 | 각 섹션 실질 내용 | 빈 표 0건 — 색 토큰 23행, 블록 7행, 이벤트 연출 표 13종(이벤트 100행), 효과음 17 + 보조 15, BGM 표, 화면 9개 각각 레이아웃·인터랙션·상태, UC 22행 중복 검증, RTM §7 116행 | ✅ |
| G-008 | 교차 참조 유효성 | 상대 링크(`../01.requirement-hearing-들음/*.md` 3종, `../02.architecture-foundation-기초/*.md` 3종, `./design-vision-디자인명세.md`, `./screen-vision-화면설계.md`, RTM의 `../03.design-order-질서/*.md` 2종)와 인용 경로(`statute-율법/03.design-order-질서/*-template.md` 2종, `parable-비유/03.design-order-질서/*-example.md` 2종) 실존을 스크립트로 확인 — 깨진 링크 0건 | ✅ |

### 8.2 Phase 3 전용 심판 (P3-001 ~ P3-005)

| # | 체크 항목 | 판정 근거 | 판정 |
|:--|:--|:--|:--:|
| P3-001 | 디자인 시스템(색상/타이포/간격) 확정 | 디자인명세 §2: 색 토큰(HEX + 용도), 성막 재료 7색(바탕·밝은 면·어두운 면·각인·대비), 셀·특수 칸 색, 존재별 색, 발광 토큰 5종, 타이포 15토큰(글꼴·굵기·크기·줄높이), 간격 8단계·그리드 3종·반경 6단계, Z-레이어(Pixi 11층 + DOM 9층), 모션 14토큰, 흔들림 5·히트스톱 4·섬광 4·파티클 10·진동 10 토큰, 블록 렌더링 6단계, 시차 배경 5층, 코드 그래픽(엠블럼 4·천사 5·악한 영 14·갑주 6·예수님 빛 실루엣 규칙·기호) | ✅ |
| P3-002 | 모든 화면의 와이어프레임 완성 | 9화면 전부 데스크톱·모바일 와이어프레임(디자인명세 §3.1~§3.9), 대전 화면은 가로형·세로형 좌표표 + 봇·연습 변형 + 덧씌움 7종(§3.5.1~§3.5.5), 화면 흐름도(§3.0). 빈 화면(자리만 있는 상자) 0개 | ✅ |
| P3-003 | 모든 화면이 Phase 1 유스케이스에 매핑 | §1 화면 목록 + §6 역방향 표 — SCR 9개 전부 1개 이상의 UC, UC 22개 중 화면 대상 20개 전부 SCR에 매핑, UC-021·UC-022는 개발자 터미널 유스케이스로 화면 없음(사유 기록). RTM §7: 116 ID 중 화면 연결 105 · N/A 11(사유 명시) | ✅ |
| P3-004 | UC-화면 중복 해체 검증 통과 | §6 — 중복 의심 11건 전부 처리(통합 6 · 분리 5), 처리되지 않은 중복 0건, 같은 역할 화면 쌍 0건 | ✅ |
| P3-005 | 반응형/접근성 설계 반영 | 반응형: 브레이크포인트 3단(디자인명세 §5.1), 대전 배치 선택 규칙·배율·안전 영역·최소 크기·터치 목표 검증(§5.2), 화면별 표(§5.3, 이 문서 §4). 접근성: WCAG 2.1 AA 기준 15개 항목(§6.1), 대비 검증표 17쌍 전부 통과(§6.2), 움직임·섬광 줄이기(§6.3, FR-057), 스크린리더 알림(§6.4), 화면별 포커스 순서·ARIA(이 문서 §5), 색각 이상 배려(§6.6) | ✅ |

### 8.3 언약 계수 (UTIL-census)

`python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 3 --log` → **✅ IRONCLAD** (exit 0, 2026-10-19 15:16:40 UTC) — 실계수 116 (🔄 116 / ⬜ 0), 문서 기재값 5항목 일치, spec-tablet ID 116개 전부 등재, 중복 0건. RTM §7 확인표 추가 후 재계수도 IRONCLAD. 상세: [`rtm-covenant-언약추적.md`](../01.requirement-hearing-들음/rtm-covenant-언약추적.md) §6·§7.

### 8.4 최종 판정

| 구분 | ✅ | ❌ |
|:---|:---:|:---:|
| 범용 심판 G-001~G-008 | 8 | 0 |
| Phase 3 전용 P3-001~P3-005 | 5 | 0 |
| 합계 (13항목) | 13 | 0 |

> ## ⚖️ 최종 판정: **IRONCLAD** — 범용 + Phase 전용 전 항목 ✅
> 회개(수정) 이력: 판정 전 자기 대조에서 발견·수정한 항목은 `fruit-열매/history/2026-10-19.md`에 기록한다. `fruit-열매/` 소스 코드 생성 0건 (제5계명).

---

## 9. Phase 4 인계 (언약책 §5 이동의 규례 — TIER-3)

TIER-3이므로 Phase 4(회개 — 개발)는 새 세션 또는 새 서브에이전트로 시작한다. 인계물: ① `.skill/covenant-book-언약책.md` ② `.skill/SKILL-04_repentance-회개개발.md` + 해당 statute-율법·parable-비유 ③ `bible-성경/01`·`02`·`03` 정경 산출물 전체.

Phase 4가 반드시 받아야 할 정경 결정:

1. **화면 9개 = `client/js/screens/` 9파일**, 해시 라우팅·가드는 이 문서 §3, 화면별 컴포넌트·API·상태는 §2. 대전 화면은 하나(사람·봇·연습 변형) — 봇·연습 전용 화면 파일을 만들지 않는다(§6).
2. **대전 좌표는 가상 해상도 2벌**(가로형 1280×720 · 세로형 720×1280)의 좌표표(디자인명세 §3.5.1·§3.5.2) 그대로, 캔버스·DOM 오버레이 같은 배율(§5.2).
3. **모든 글자는 DOM**, Pixi는 그래픽만(D3-04). 블록 텍스처는 시작 시 굽고 블록마다 실시간 필터 금지(§2.11, §4.9).
4. **HUD 값은 `status`(API-024)만**, 정적 수치는 rules.json(§4.4). 보드 파생 값만 로컬 엔진.
5. **기본 키 배치**(§4.3)는 `KeyboardEvent.code` 기준, 키 재설정 UI 없음. 터치 제스처 판정 수치(28px·1.1px/ms 등)는 §4.3 표.
6. **이벤트 연출 ID**(J·C·A·S·G·R·H·Q·X·D·M·RX·AC·RT·GR·SV)와 **소리 ID**(SFX-01~17 = FR-058 17종, AUX-01~15, BGM-1·2)를 `fx/`·`audio/` 모듈의 상수 이름으로 그대로 쓰면 RTM 연결과 Phase 5 검증이 쉬워진다.
7. **예수님 이벤트 금지 사항**(디자인명세 §2.13.5·§4.6.8): 얼굴 없음, 실루엣에 닿는 그래픽 없음, 버튼·아이콘 없음 — 코드 리뷰 체크 항목.
8. **공정성 규칙(D3-09):** 연출 세기 옵션은 방해 효과의 가림 정도를 바꾸지 않는다.
9. **옵션은 세션 메모리만**(N-04 미승격) — localStorage에는 `swt.guest`만 쓴다(data-ark §8.3).
