# 👁️ 화면 설계서 (Screen Vision) — 영적 전쟁 테트리스

> *"In the visions of God brought he me into the land of Israel, and set me upon a very high mountain, by which was as the frame of a city on the south."* — Ezekiel 40:2 (KJV)
>
> **규격:** `statute-율법/03.design-order-질서/screen-vision-환상-template.md` (파일명은 SKILL-03 산출물 표의 `screen-vision-화면설계.md` — 결정 근거 [`design-vision-디자인명세.md`](./design-vision-디자인명세.md) §7 D3-01)
> **참조 예시:** `parable-비유/03.design-order-질서/screen-vision-환상-example.md`
> **동반 산출물:** [`design-vision-디자인명세.md`](./design-vision-디자인명세.md) — 디자인 시스템·와이어프레임(§3)·사건별 연출(§4)·반응형(§5)·접근성(§6)·심판 관문(§9)
> **근거 산출물:** [`usecase-path-사용사례.md`](../01.requirement-hearing-들음/usecase-path-사용사례.md) · [`spec-tablet-명세서.md`](../01.requirement-hearing-들음/spec-tablet-명세서.md) · [`rtm-covenant-언약추적.md`](../01.requirement-hearing-들음/rtm-covenant-언약추적.md) · [`architecture-temple-성전설계.md`](../02.architecture-foundation-기초/architecture-temple-성전설계.md) (ARCH-001 화면 라우터, §5.4 화면 파일 9개) · [`api-gate-성문.md`](../02.architecture-foundation-기초/api-gate-성문.md) · [`data-ark-법궤.md`](../02.architecture-foundation-기초/data-ark-법궤.md)

---

## 1. 화면 목록

> 화면 9개 = FR-078 화면 흐름 = architecture §5.4 `client/js/screens/` 파일 9개 (1:1). 경로는 해시 경로다 (D3-03 — Vite 정적 SPA, 서버 라우트 없음). 말씀 대결 패널·일시 메뉴·카운트다운·예수님 연출은 독립 화면이 아니라 SCR-005의 상태다 (D3-21).

| SCR-ID | 화면명 | 라우팅 경로 | 연결 UC | 연결 REQ | 인증 필요 | 화면 파일 (Phase 4 계획 경로) |
|:---|:---|:---|:---|:---|:---:|:---|
| SCR-001 | 닉네임 입장 | `#/entry` | UC-001 | REQ-002, FR-012, FR-078, NFR-003, NFR-008 | ❌ | `client/js/screens/entry-screen.js` |
| SCR-002 | 로비 (모드 선택) | `#/lobby` | UC-002, UC-004 (진입), UC-018·UC-019·UC-020 (진입) | REQ-004, REQ-005, REQ-006, FR-019, FR-021, FR-023, FR-078, C-008 | ✅ | `client/js/screens/lobby-screen.js` |
| SCR-003 | 캐릭터 선택 | `#/hero` | UC-002, UC-004 (4단계) | REQ-003, FR-013~FR-017, FR-074, C-002, C-003, C-010 | ✅ | `client/js/screens/hero-select-screen.js` |
| SCR-004 | 매칭 대기·초대 코드 | `#/matching` | UC-003, UC-004 | REQ-004, FR-005, FR-008, FR-018, FR-019, FR-020, C-006 | ✅ | `client/js/screens/matching-screen.js` |
| SCR-005 | 대전 (연습·봇 변형 포함) | `#/battle` | UC-005~UC-014, UC-015 (1~4), UC-016 (1~3), UC-017, UC-020 (일시 메뉴 진입) | REQ-001, REQ-003, REQ-005~REQ-013, FR-001~FR-011, FR-014~FR-017, FR-021~FR-062, FR-064, NFR-001, NFR-002, NFR-006, C-002, C-009, C-011 | ✅ | `client/js/screens/battle-screen.js` |
| SCR-006 | 결과 (말씀 카드) | `#/result` | UC-015 (5~10), UC-016 (5), UC-006 (6) | REQ-001, REQ-013, REQ-014, REQ-015, FR-007, FR-056, FR-063, FR-065~FR-068, FR-070, C-003 | ✅ | `client/js/screens/result-screen.js` |
| SCR-007 | 전적 | `#/records` | UC-018 | REQ-014, FR-069 | ✅ | `client/js/screens/records-screen.js` |
| SCR-008 | 랭킹 | `#/ranking` | UC-019 | REQ-015, FR-070, FR-071 | ✅ | `client/js/screens/ranking-screen.js` |
| SCR-009 | 옵션 | `#/options` (대전 중에는 경로 변경 없이 모달) | UC-020 | REQ-013, FR-057, FR-058, FR-059, FR-060, C-007 | ✅ | `client/js/screens/options-screen.js` |

> 인증 = 브라우저 게스트 정보(TBL-201 `swt.guest`)가 있고 이번 접속에서 API-002로 검증됨. 역할은 게스트 1종뿐이다 (Supabase Auth·관리자 제외 — C-008, spec-tablet §9.7 K5).

---

## 디자인 시스템 (요약 — 정본은 `design-vision-디자인명세.md` §2)

| 항목 | 규격 |
|:---|:---|
| 주 색상 (Primary) | #F2C14E `--light-gold` (금빛 네온 — "어둠 속에 비치는 빛") |
| 보조 색상 (Secondary) | #FFFFFF `--light-white` (흰빛 네온), #B9B4CC `--text-secondary` |
| 배경색 | #0E1020 `--bg-night` (본문), #07080F `--bg-abyss` (최하층), #0A0C18 `--board-well` (보드) |
| 블록 색 | 성막 재료 7색 — I #4FB3FF · O #F4C430 · T #A35CF0 · S #C7D0DC · Z #E5404F · J #3B5FE0 · L #F27A45 (Exodus 26:1, D3-02) |
| 폰트 | Noto Serif KR (한글 UI 400·700), Cinzel (KJV 영어 구절·영문 타이틀·대형 연출 글자 400·700) — @fontsource 번들. 크기 체계 12 / 14 / 16 / 22 / 28 / 40 / 64px + 연출 32~120px |
| 간격 (Spacing) | 4px 기반 (4, 8, 12, 16, 24, 32, 48, 64) |
| 그리드 | Desktop 12컬럼·거터 24px(최대 1200px) / Tablet 8컬럼·거터 16px / Mobile 4컬럼·거터 12px |
| 모서리 반경 (Border Radius) | 4px (키캡·작은 버튼), 8px (카드·입력), 12px (패널·모달), 999px (토스트·칩) |

---

## 2. 화면 상세 명세

> 와이어프레임은 `design-vision-디자인명세.md` §3의 같은 SCR-ID 절. 사용자 문구는 api-gate §4.2 "사용자 문구"와 Phase 1 UC 예외 경로 문구를 그대로 쓴다. 상태 표기: 로딩 / 오류 / 빈 상태를 화면마다 명시한다.

### SCR-001: 닉네임 입장

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-001 |
| 화면명 | 닉네임 입장 |
| 경로 | `#/entry` |
| 연결 UC | UC-001 (정상 1~6, 1a, E1~E4) |
| 연결 REQ | REQ-002, FR-012, FR-078, NFR-003, NFR-008 |
| 인증 | 불필요 |
| 와이어프레임 | design-vision §3.1 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Background | ParallaxBackground | 시차 배경 4층(남흑 하늘·하늘의 빛·구름·빛 입자) — FR-048. 모든 메뉴 화면 공통 |
| Header | TitleLogo | "SPIRITUAL WARFARE TETRIS"(Cinzel 64, `lang="en"`) + "영적 전쟁 테트리스"(Noto Serif KR 28) |
| Main | NicknameInput | 라벨 "닉네임", 안내 "2~12자 · 한글/영문/숫자/밑줄", `minlength=2` `maxlength=12` `pattern` (architecture §9 방어 1층) |
| Main | ErrorText | 오류 문구 영역 (`aria-live="polite"`, 입력 칸 `aria-describedby`) |
| Main | PrivacyNotice | "닉네임과 경기 기록이 이 게임 서버에 저장됩니다." (봉인 제5계명 — architecture §9) |
| Main | EnterButton | 주 버튼 "입장하기" — 처리 중 상태 (design-vision §4.2) |
| Main | TokenCheckState | 저장된 게스트가 있을 때 "입장 정보를 확인하는 중" + 빛 고리 (UC-001 1a) |
| Main | ConnectionError | "서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요" + [다시 시도] (UC-001 E4) |
| Footer | AudioUnlockHint | "소리를 켜려면 화면을 누르세요" — 첫 사용자 입력 전까지만 (UC-020 E1, D-24). 모든 화면 공통 |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 앱 시작 (TBL-201 있음) | `GET /api/guest/me` → 200: 닉네임·레이팅을 세션에 두고 SCR-002 / 401 `INVALID_TOKEN`·`UNAUTHORIZED`: TBL-201 삭제 후 입력 폼 (UC-001 E3) / 503·네트워크 실패: ConnectionError | API-002 |
| 앱 시작 (TBL-201 없음·형식 오류) | 형식 오류면 TBL-201 삭제(data-ark TBL-201 제약), 입력 폼 표시 | — |
| EnterButton 클릭 / Enter | 클라이언트 1차 검사(NFC·trim·2~12자·허용 문자) 실패 → "닉네임 규칙(길이·문자)을 확인하세요." (E1). 통과 → `POST /api/guest` → 201: TBL-201에 guestId·nickname·token 저장 → SCR-002 | API-001 |
| 서버 거부 | 400 `INVALID_NICKNAME` → "닉네임 규칙(길이·문자)을 확인하세요." / 409 `NICKNAME_TAKEN` → "이미 사용 중인 닉네임입니다." (E2) / 429 → "요청이 너무 잦습니다." / 503 → "기록 저장소에 연결할 수 없습니다." / 네트워크 실패 → ConnectionError (E4) — 입력 화면 유지, 입력값 보존, 포커스는 입력 칸 | API-001 |
| [다시 시도] | 직전 요청(API-002 또는 API-001) 재실행 | API-001, API-002 |
| 첫 클릭·키·터치 | `Tone.start()`, AudioUnlockHint 숨김, BGM-01 시작 | — |

**상태:** 로딩 = TokenCheckState·처리 중 버튼 / 오류 = ErrorText·ConnectionError / 빈 상태 = 해당 없음(입력 폼이 기본 상태).

### SCR-002: 로비 (모드 선택)

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-002 |
| 화면명 | 로비 (모드 선택) |
| 경로 | `#/lobby` |
| 연결 UC | UC-002 (1~2, 4a 복귀), UC-004 (1·4의 진입 버튼), UC-018·UC-019·UC-020 (진입) |
| 연결 REQ | REQ-004, REQ-005, REQ-006, FR-019, FR-021, FR-023, FR-078, C-008 |
| 인증 | 필요 (게스트 검증) |
| 와이어프레임 | design-vision §3.2 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Header | TitleLogo (작게) | 타이틀 Cinzel 28 |
| Header | ProfileBadge | 닉네임 · 레이팅 (API-002/API-001 응답값 — D3-22) |
| Main | RandomModeCard | "대전 · 랜덤 매칭" + [시작] |
| Main | InviteModeCard | "친구 대전 · 초대 코드" + [방 만들기] + [코드로 입장] (D3-05) |
| Main | BotModeCard | "AI 봇 대전" + 난이도 라디오 쉬움/보통/어려움(선택 전 미선택 — UC-002 2 "함께 고른다") + [시작](난이도 선택 전 비활성) |
| Main | PracticeModeCard | "연습" + [시작] |
| Footer | MenuButtons | [전적] [랭킹] [옵션] |
| — | (없음) | 로그인·스토리 모드·상점 버튼 없음 (C-008, C-001) |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| RandomModeCard [시작] | 세션 mode = `random` → SCR-003 | — |
| InviteModeCard [방 만들기] / [코드로 입장] | mode = `invite`, 하위 = 방장 / 친구 → SCR-003 | — |
| BotModeCard [시작] | mode = `bot`, botLevel = 선택값(CODE-002) → SCR-003 | — |
| PracticeModeCard [시작] | mode = `practice` → SCR-003 | — |
| [전적] / [랭킹] / [옵션] | SCR-007 / SCR-008 / SCR-009 | — |
| Matchmaker 소켓 4001 (다른 화면에서 복귀 시) | TBL-201 삭제 → SCR-001 | API-005 |

**상태:** 로딩 = 없음(부팅 시 API-002 완료 후 진입) / 오류 = 이전 화면에서 넘어온 안내 토스트("연결이 끊어졌습니다" 등) / 빈 상태 = 해당 없음.

### SCR-003: 캐릭터 선택

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-003 |
| 화면명 | 캐릭터 선택 |
| 경로 | `#/hero` |
| 연결 UC | UC-002 (3~5, 4a, E1, E2), UC-004 (4 — 친구의 위인 선택), UC-003 (1 — `join` 전송), UC-005 (1), UC-006 (1) |
| 연결 REQ | REQ-003, FR-013~FR-017, FR-074, C-002, C-003, C-010 |
| 인증 | 필요 + 세션 mode 존재 |
| 와이어프레임 | design-vision §3.3 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Header | BackButton | "← 뒤로" → SCR-002 (UC-002 4a) |
| Header | ScreenTitle + ModeLabel | "위인을 고르세요" + 현재 모드(봇이면 난이도) |
| Main | HeroCardGroup | 카드 4장(`role="radiogroup"`): 벡터 엠블럼 128(design §2.10) + nameKo + nameEn. 4명 모두 처음부터 선택 가능 (FR-013). 예수님은 선택지에 없음 (C-002) |
| Detail | HeroDetailPanel | 스킬 이름·효과(heroes.json skill.nameKo·descKo), 비용·재사용(skill.cost·cooldownMs — D3-18), 솔로몬만 패시브 줄, 근거 구절 KJV 원문 + 직접 번역 + 출처(verses.json — C-003, C-010) |
| Footer | HintText | "위인을 선택하세요" (UC-002 E1), 초대-친구 경로는 "확정 후 초대 코드를 입력합니다" |
| Footer | ConfirmButton | 주 버튼 "확정" — 선택 전 비활성 |
| Main | ContentError | "게임 데이터를 불러오지 못했습니다" + "새로고침해 주세요" (UC-002 E2) |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 카드 선택 (클릭·화살표·Enter) | 선택 표시 + 상세 갱신 (번들 콘텐츠 TBL-101·TBL-106 — 네트워크 없음) | — |
| ConfirmButton — 랜덤 | Matchmaker 소켓 연결 → `join`(token, heroId, mode `random`) → `queued` 수신 시 SCR-004 상태 A | API-005, API-101, API-151 |
| ConfirmButton — 초대 방장 | 소켓 연결 → `createRoom`(token, heroId) → `roomCreated` 수신 시 SCR-004 상태 B | API-005, API-102, API-152 |
| ConfirmButton — 초대 친구 | heroId를 세션에 두고 SCR-004 상태 C (코드 입력 후 전송) | — |
| ConfirmButton — 봇 | 소켓 연결 → `join`(mode `bot`, botLevel) → `matched` → SCR-005 "전장으로 들어가는 중" (D3-04) | API-005, API-101, API-153 |
| ConfirmButton — 연습 | 소켓 연결 → `join`(mode `practice`) → `matched` → SCR-005 | API-005, API-101, API-153 |
| `error` INVALID_TOKEN / 종료 4001 | "입장 정보가 올바르지 않습니다." → TBL-201 삭제 → SCR-001 (UC-003 E3) | API-290 |
| `error` ALREADY_QUEUED / STORE_UNAVAILABLE / RATE_LIMITED | 토스트 "이미 상대를 찾는 중입니다." / "기록 저장소에 연결할 수 없습니다." / "요청이 너무 잦습니다." — 화면 유지 | API-290 |
| 처리 중 | ConfirmButton 처리 중 상태(중복 전송 차단), 응답 대기 동안 카드 변경 불가 | — |

**상태:** 로딩 = ConfirmButton 처리 중 / 오류 = ContentError·토스트 / 빈 상태 = 해당 없음(위인 4명 고정).

### SCR-004: 매칭 대기·초대 코드

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-004 |
| 화면명 | 매칭 대기·초대 코드 |
| 경로 | `#/matching` |
| 연결 UC | UC-003 (2~4, 2a, 3a, E1, E2), UC-004 (2~6, 2a, E1~E3) |
| 연결 REQ | REQ-004, FR-005, FR-008, FR-018, FR-019, FR-020, C-006 |
| 인증 | 필요 + mode ∈ random·invite + heroId |
| 와이어프레임 | design-vision §3.4 (상태 A~D) |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Main (상태 A) | SearchingIndicator | "상대를 찾는 중" + 빛 고리 + 내 닉네임·위인·레이팅 + 대기 시간(`queued.queuedAt` 기준 경과) |
| Main (상태 B) | InviteCodeDisplay | "친구를 기다리는 중", 코드 6칸(Cinzel 48, `aria-label`에 한 글자씩 띄어 읽기), "이 코드를 친구에게 직접 알려 주세요", 만료까지 남은 시간(`expiresAt`). 복사·링크 공유 버튼 없음 (spec S16 기각) |
| Main (상태 C) | InviteCodeInput | 6칸 분할 입력(design §4.2), 오류 문구, [입장] |
| Main (상태 D) | VersusCard | 내 닉네임·엠블럼 VS 상대 닉네임·엠블럼(`matched.opponent`), "전장으로 들어가는 중…" (D-02 연결 전환) |
| Footer | CancelButton | "취소" (상태 A·B·C) |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 상태 A 진입 | `queued` 표시, 대기 시간 1초마다 갱신 | API-151 |
| 상태 A [취소] | `cancel` → `cancelled`(reason `user`) → SCR-002 (UC-003 2a, FR-020) | API-103, API-154 |
| 상태 B [취소] | `cancel` → `cancelled` → 코드 무효 → SCR-002 (UC-004 2a) | API-103, API-154 |
| 상태 B 만료 | `cancelled`(reason `expired`) → 토스트 "초대 코드가 만료되었습니다" → SCR-002 | API-154 |
| 상태 C [입장] | 소켓 연결 → `join`(token, heroId, mode `invite`, roomCode) | API-005, API-101 |
| 상태 C 거부 | `INVITE_NOT_FOUND` "초대 코드를 찾을 수 없습니다." (E1) / `ROOM_FULL` "이미 가득 찬 방입니다." (E2) / `OWN_INVITE` "내가 만든 초대 코드입니다." — 입력 유지, 첫 칸 포커스 | API-290 |
| 상태 C [취소] | 소켓을 열지 않았거나 닫고 SCR-002 | — |
| `matched` 수신 (A·B·C) | 상태 D → GameRoom 소켓 `/ws/room/:roomId` + `join`(token, heroId) → `joined` → SCR-005 | API-153, API-006, API-201, API-251 |
| 방 입장 거부 | `NOT_IN_ROOM`·`HERO_MISMATCH`·`DUPLICATE_SESSION`(4003) / `ROOM_NOT_FOUND`(404·4004) → 해당 문구 토스트 → SCR-002 | API-201, API-006 |
| 대기 중 소켓 끊김 | partysocket 자동 재연결 후 SCR-002 + 토스트 "연결이 끊어졌습니다" (UC-003 E1 — 서버가 대기열에서 이미 제거) | API-005 |
| `error` INVALID_TOKEN | TBL-201 삭제 → SCR-001 | API-290 |

**상태:** 로딩 = 상태 A·D의 빛 고리 / 오류 = 상태 C 오류 문구·토스트 / 빈 상태 = 해당 없음.

### SCR-005: 대전 (연습·봇 변형 포함)

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-005 |
| 화면명 | 대전 |
| 경로 | `#/battle` |
| 연결 UC | UC-005, UC-006 (1~5, 6a), UC-007, UC-008, UC-009, UC-010, UC-011, UC-012, UC-013, UC-014, UC-015 (1~4), UC-016 (1~3), UC-017, UC-020 (일시 메뉴 → 옵션) |
| 연결 REQ | REQ-001, REQ-003, REQ-005~REQ-013, FR-001~FR-011, FR-014~FR-017, FR-021~FR-062, FR-064, NFR-001, NFR-002, NFR-006, C-002, C-009, C-011 |
| 인증 | 필요 + `matched.roomId` (세션 메모리) |
| 와이어프레임 | design-vision §3.5 (데스크톱 HUD), §3.6 (봇·연습 변형, 카운트다운, 라운드 배너, 말씀 대결 패널, 일시 메뉴, 예수님 연출, 입장·이탈 상태), §3.7 (태블릿·모바일) |

**레이아웃 구성:** (HUD-ID 정의는 design-vision §3.5 표)

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Top | HUD-01 Scoreboard | 닉네임·엠블럼·라운드 승수·라운드·경과 시간·[Ⅱ] |
| Left | HUD-02 Hold, HUD-09 ArmorSlots, HUD-10 SpiritEffects | 홀드, 갑주 6슬롯, 영 효과 칩·봉인·납 |
| Center-left | HUD-05 IncomingGarbageMeter, HUD-04 MyBoard, HUD-16 Subtitle | 경고 게이지, 내 보드(PixiJS), 자막 |
| Center | HUD-03 NextQueue, HUD-14 ScoreCombo, HUD-12 BattleLane | 다음 블록, 점수·콤보, 투사체 레인 |
| Right | HUD-11 OpponentBoard | 상대 보드·점수·엠블럼, 받은 리액션 말풍선 |
| Bottom | HUD-06 FaithGauge, HUD-07 HeroSkillKey, HUD-08 AngelKeys, HUD-13 ReactionBar, HUD-18 Toast | 믿음 게이지, 키캡 A·1~5·7~9, 토스트 |
| Overlay | Countdown, QuizPanel(ARCH-022), RoundEndBanner, PauseMenu, JesusLight, EnteringState, BotFailureModal | SCR-005의 상태 (D3-21) |
| Hidden | HUD-17 LiveRegion | 스크린리더 안내 |
| 변형 — 봇 | HUD-01·11에 "AI 봇 · 난이도" + 봇 위인, 리액션은 내 화면에만 | UC-005, UC-017 1a |
| 변형 — 연습 | HUD-05·08·09·10·11·12·13 숨김, 내 보드 가운데, HUD-01은 플레이 시간 | UC-006, OQ #4 |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 진입 (봇·연습 — SCR-003에서 직접) | EnteringState "전장으로 들어가는 중…" → GameRoom 소켓 + `join` → `joined` | API-006, API-201, API-251 |
| `joined` 수신 | 화면 골격(players·bestOf·slot) 구성, 장면 준비 완료 시 `ready` 전송, 상대 미입장 시 "상대를 기다리는 중" | API-251, API-202 |
| `start` 수신 | 카운트다운(EVT-18) → `startAt`에 시드로 엔진 시작, `stage`로 특수 칸 해금, `grace`면 HUD-15, `matchElapsedMs`로 중력 곡선 | API-252 |
| 조작 키·터치 (design §4.3·§4.4) | 엔진 처리 + 연출 EVT-01~08, 12Hz `state` 송신(seq·board·active·score·garbageIn) | API-203 |
| 줄 삭제 | 연출 EVT-09~19, 대전이면 `clear`(seq·lines·combo·b2b·tspin·pieceCount·specials) 송신 | API-204 |
| `effect` attackSent / offset / reflect | EVT-20 / EVT-22 / EVT-25 | API-255 |
| `playerStatus` | HUD-05·06·07·08·09·10·15 갱신 (서버 값만 — R-10) | API-256 |
| `opponentState` | HUD-11 상대 보드 갱신 | API-253 |
| `attack` | HUD-05 큐 추가·EVT-21, 영 효과 EVT-27·§4.7, 다음 비삭제 고정 때 쓰레기 삽입 EVT-23, 누적 삽입 수를 `state.garbageIn`에 반영 | API-254 |
| 키 A / 1~5 | `skill`(hero_ / angel_ skillId) → `effect` hero·angel 연출(EVT-29) / `error` 거부 피드백(EVT-41~43, EVT-45) | API-205, API-255, API-290 |
| 키 Q~Y | `armor`(armorId) → `effect` armor(EVT-31) / `ARMOR_NOT_OWNED`(EVT-44) | API-206, API-255, API-290 |
| `effect` jesus | 예수님 연출 EVT-32 (조작 계속) | API-255 |
| `effect` special | 여리고·만나 결과 반영 (EVT-38·39) | API-255 |
| `quizStart` | 두 보드 정지, QuizPanel 열기(EVT-34), 포커스 첫 보기 | API-257 |
| 보기 선택 (1~4·클릭·탭) | `quizAnswer`(quizId·choice) → `quizLock`(EVT-35) / `quizResult`(EVT-36) → `resumeAt`에 재개(EVT-37) | API-208, API-258, API-259 |
| 키 7~9 | `reaction`(reactionId) → 내 보드 위 말풍선 / 상대 `reaction` 수신 시 상대 보드 근처 말풍선 (EVT-46) | API-209, API-260 |
| 내 Top-out | `topout`(seq·pieceCount) → `roundEnd` → 배너(EVT-48), 2승 전이면 `nextRoundAt` 후 다음 `start` | API-207, API-261 |
| `matchEnd` | 결과 데이터를 세션에 두고 SCR-006 (reason `disconnect`면 EVT-51 배너 먼저) | API-262 |
| Esc / P / [Ⅱ] / 브라우저 뒤로 | PauseMenu 열기 — 대전·봇은 경기 계속, 연습은 엔진 정지 (D3-14, D3-20). [옵션] → SCR-009 모달 | — |
| PauseMenu [그만하기] (연습만) | `quit` → `matchEnd`(mode practice) → SCR-006 (UC-006 6a) | API-210, API-262 |
| `error` OPPONENT_LEFT (시작 전) | 토스트 "상대가 나갔습니다." → 랜덤: SCR-004 상태 A로 재등록(`join` random) / 초대 방장: 상태 B(새 `createRoom`) / 초대 친구: 상태 C (UC-003 E2) | API-290, API-101, API-102 |
| `error` BOT_FAILURE | BotFailureModal "경기를 계속할 수 없습니다" + [로비로] → SCR-002 (UC-005 E2) | API-290 |
| `error` GAME_NOT_RUNNING·SEQ_REJECTED·PROGRESS_REJECTED·QUIZ_CLOSED·QUIZ_ALREADY_ANSWERED·INVALID_REACTION | 표시 없음 (api-gate §4.2 "표시 없음") — 진행 계속 (UC-007 E4) | API-290 |
| 소켓 종료 4008 | 토스트 "요청이 너무 잦습니다." → SCR-002 | API-006 |
| 내 소켓 비정상 종료 | GameRoom 소켓은 재연결하지 않음(api-gate §4.3) → 토스트 "연결이 끊어졌습니다" → SCR-002 (서버는 이탈 패배로 기록 — FR-009) | API-006 |

**상태:** 로딩 = EnteringState·"상대를 기다리는 중" / 오류 = 토스트·BotFailureModal / 빈 상태 = 해당 없음(보드는 빈 우물로 시작).

### SCR-006: 결과 (말씀 카드)

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-006 |
| 화면명 | 결과 (말씀 카드) |
| 경로 | `#/result` |
| 연결 UC | UC-015 (5~10, 6a, 6b, 9a, E2, E3), UC-016 (5, 3a), UC-006 (6, E2) |
| 연결 REQ | REQ-001, REQ-013, REQ-014, REQ-015, FR-007, FR-056, FR-063, FR-065, FR-066, FR-067, FR-068, FR-070, C-003 |
| 인증 | 필요 + `matchEnd` 데이터 (세션 메모리) |
| 와이어프레임 | design-vision §3.8 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Header | ResultTitle | "승리" / "패배" / "연습 종료" (`matchEnd.winnerSlot`·mode) |
| Header | ScoreLine | 최종 승수(score)·경기 시간(durationMs)·이탈 사유("상대가 나갔습니다") |
| Header | VictoryVerse | `victoryVerseRef`(2 Timothy 4:7) KJV 원문 + 직접 번역 + 출처 — 승리 화면만 (FR-007) |
| Left | VerseCard | 대표 구절 카드(`verseRef` → verses.json): 금테 3:4 카드, 내 위인 엠블럼 워터마크, KJV 원문·직접 번역·출처, 하단 "SPIRITUAL WARFARE TETRIS" (FR-063, C-003) |
| Left | SaveImageButton, ShareButton | "이미지 저장", "공유" (공유 미지원이면 숨김 — UC-015 9a) |
| Right | PersonalRecord | 최대 콤보·분당 공격·퀴즈 정답률(`record`) + 이전 대비(`growth`, null이면 "첫 기록"). 연습은 플레이 시간 추가 (FR-066) |
| Right | RatingChange | 갱신 레이팅 + 변화량 (`ratingDelta`가 null이 아닐 때만 — 사람 대 사람, FR-070) |
| Right | NewAchievements | 새 업적 이름(achievements.json nameKo) — 있을 때만 (FR-065) |
| Right | SaveFailNotice | `saved`가 false면 "기록 저장에 실패했습니다" (UC-015 E2); 연습은 "기록을 저장하지 못했습니다" (UC-006 E2) |
| Footer | LobbyButton | 주 버튼 "로비로" (UC-015 10) |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 진입 | 승리 EVT-49(콘페티·팡파르) / 패배 EVT-50 / 이탈 승리 EVT-51 / 연습 연출 없음 | (API-262 데이터) |
| SaveImageButton | `ui/verse-card.js`가 카드를 오프스크린 캔버스에 그려 PNG 생성 → 내려받기(파일명 "말씀카드-출처.png", 공백은 하이픈) | — |
| ShareButton | `navigator.canShare(files)` 참일 때만 표시, `navigator.share`로 PNG 공유 | — |
| 저장·공유 실패 | 토스트 "카드를 저장하지 못했습니다" (UC-015 E3). 사용자가 공유 창을 닫은 경우는 실패로 보지 않음 | — |
| LobbyButton / Esc | 결과 데이터 폐기 → SCR-002 | — |

**상태:** 로딩 = 없음(`matchEnd` 수신 후 진입) / 오류 = SaveFailNotice·저장 실패 토스트 / 빈 상태 = 업적 없음이면 NewAchievements 영역 자체를 그리지 않음.

### SCR-007: 전적

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-007 |
| 화면명 | 전적 |
| 경로 | `#/records` |
| 연결 UC | UC-018 (1~4, 4a, E1, E2) |
| 연결 REQ | REQ-014, FR-069 |
| 인증 | 필요 |
| 와이어프레임 | design-vision §3.9 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Header | BackButton + ScreenTitle | "← 로비", "전적" |
| Main | MatchTable | 열: 결과(승/패 배지) · 상대(닉네임 또는 "AI 봇 · 난이도") · 위인(나 vs 상대 엠블럼 24 + 이름) · 라운드(rounds) · 경기 시간(durationMs → mm:ss) · 일시(createdAt → 브라우저 현지 시각 YYYY-MM-DD HH:mm). 최신순 (D3-16) |
| Footer | Pagination | [‹ 이전] 페이지/전체 [다음 ›] — `meta.page`·`totalPages`, 20건씩 |
| Main | LoadingState / EmptyState / ErrorState | 빛 고리 / "아직 경기 기록이 없습니다" / "전적을 불러오지 못했습니다" + [다시 시도] |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 진입 | `GET /api/matches?page=1&size=20` (Bearer 토큰) → 목록 | API-003 |
| [다음 ›] / [‹ 이전] | page ±1 재조회 (범위 밖 버튼 비활성) | API-003 |
| 401 | TBL-201 삭제 → SCR-001 (UC-018 E2) | API-003 |
| 503·429·네트워크 실패 | ErrorState + [다시 시도] (UC-018 E1) | API-003 |
| BackButton / Esc | SCR-002 | — |

**상태:** 로딩 = LoadingState / 오류 = ErrorState / 빈 상태 = EmptyState (`totalCount` 0).

### SCR-008: 랭킹

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-008 |
| 화면명 | 랭킹 |
| 경로 | `#/ranking` |
| 연결 UC | UC-019 (1~3, 3a, E1) |
| 연결 REQ | REQ-015, FR-070, FR-071 |
| 인증 | 필요 (API-004는 토큰 선택이지만 앱 흐름상 입장 후에만 도달 — 내 순위 표시를 위해 토큰 전송) |
| 와이어프레임 | design-vision §3.10 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Header | BackButton + ScreenTitle | "← 로비", "랭킹 · 레이팅 상위 100" |
| Main | RankingTable | 순위·닉네임·레이팅 100행. `isMe` 행은 `--bg-panel-raised` + 금빛 왼쪽 띠 + "◀ 나" (색 외 글자 표식) |
| Footer | MyRankRow | `me`가 있고 `top`에 내 행이 없을 때만 아래 고정 (UC-019 3a) |
| Main | LoadingState / ErrorState | 빛 고리 / "랭킹을 불러오지 못했습니다" + [다시 시도] (UC-019 E1) |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| 진입 | `GET /api/rankings` (Bearer 토큰) → 표 | API-004 |
| 401 INVALID_TOKEN | TBL-201 삭제 → SCR-001 | API-004 |
| 503·429·네트워크 실패 | ErrorState + [다시 시도] | API-004 |
| BackButton / Esc | SCR-002 | — |

**상태:** 로딩 = LoadingState / 오류 = ErrorState / 빈 상태 = `top`이 0행이면 "아직 랭킹이 없습니다" (프로필이 1개 이상 있어야 이 화면에 도달하므로 실제로는 내 행이 최소 1행).

### SCR-009: 옵션

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-009 |
| 화면명 | 옵션 |
| 경로 | `#/options` (로비에서) / 경로 변경 없는 모달 (대전 일시 메뉴에서) |
| 연결 UC | UC-020 (1~4, 3a, E1) |
| 연결 REQ | REQ-013, FR-057, FR-058, FR-059, FR-060, C-007 |
| 인증 | 필요 |
| 와이어프레임 | design-vision §3.11 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Header | BackButton + ScreenTitle | "← 돌아가기" (로비 또는 일시 메뉴), "옵션" |
| Main — 연출 | ShakeToggle | "화면 흔들림" 켜기/끄기 (`role="switch"`) |
| Main — 연출 | FlashLevelSegment | "섬광 세기" 기본 / 줄임 / 최소 (D3-09) |
| Main — 소리 | MasterVolume, SfxVolume, MusicVolume | 슬라이더 0~100, 5단위, 현재 값 숫자 |
| Main — 소리 | MuteToggle | "음소거" 켜기/끄기 |
| Footer | SessionNotice | "설정은 이번 접속 동안만 유지됩니다." (N-04 보존 — D3-08) |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| ShakeToggle | `fx-intensity.js` 흔들림 배율 즉시 1/0 (하드 드롭·테트리스·공격 받음 흔들림 미적용 — UC-020 4) | — |
| FlashLevelSegment | 섬광 배율 1.0 / 0.5 / 0.2 즉시 적용 | — |
| 음량 슬라이더 | `audio-engine.js` 해당 버스 음량 즉시 변경 (음악 → 대기실·대전 BGM 즉시 — UC-020 4). 효과음 슬라이더 놓을 때 SFX-05 1회로 크기 확인 | — |
| MuteToggle | 켜기: 마스터 음소거(효과음·음악 정지) / 끄기: 이전 음량 복원 (UC-020 3a) | — |
| BackButton / Esc | 로비 진입이면 SCR-002, 대전 모달이면 일시 메뉴로 | — |
| 오디오 미시작 상태 | 첫 조작 시 `Tone.start()` (UC-020 E1) | — |

**상태:** 로딩 = 없음 / 오류 = 해당 없음(네트워크 무관) / 빈 상태 = 해당 없음.

---

## 3. 라우팅 가드

> 서버 쪽 접근 통제(토큰 검증·명단 검증·서버 판정)는 api-gate §5가 정본이고, 아래는 화면 진입 가드다. 화면 가드는 편의(잘못된 진입 차단)이며 보안 경계가 아니다 — 보안은 서버가 진다 (봉인 제7계명).

### 3.1 부팅 가드 (앱 시작 시 1회)

| 순서 | 검사 | 결과 |
|:--|:---|:---|
| 1 | TBL-201 `swt.guest`가 JSON이고 3키(guestId·nickname·token)가 비어 있지 않은가 | 아니면 삭제 → SCR-001 입력 폼 |
| 2 | `GET /api/guest/me` (API-002) | 200 → 세션 "검증됨" → 요청 경로가 `#/lobby`·`#/records`·`#/ranking`·`#/options`면 그 화면, 그 밖의 경로는 SCR-002 / 401 → TBL-201 삭제 → SCR-001 / 실패 → SCR-001 ConnectionError |

### 3.2 화면별 진입 조건

| 화면 | 인증 (세션 검증됨) | 추가 조건 (세션 메모리) | 조건 불충족 시 |
|:---|:---:|:---|:---|
| SCR-001 | ❌ (검증됨이면 진입 불가) | — | 검증됨 → SCR-002 |
| SCR-002 | ✅ | — | 미검증 → SCR-001 |
| SCR-003 | ✅ | mode 선택됨 | SCR-002 |
| SCR-004 | ✅ | mode ∈ random·invite, heroId, Matchmaker 소켓 열림(상태 C는 소켓 전) | SCR-002 |
| SCR-005 | ✅ | `matched.roomId` 존재, 경기 미종료 | SCR-002 |
| SCR-006 | ✅ | `matchEnd` 데이터 존재 | SCR-002 |
| SCR-007 | ✅ | — | 미검증 → SCR-001 |
| SCR-008 | ✅ | — | 미검증 → SCR-001 |
| SCR-009 | ✅ | — | 미검증 → SCR-001 |

### 3.3 역할·연결별 가드

| 상황 | 처리 | 근거 |
|:---|:---|:---|
| 역할 | 게스트 1종. 관리자·로그인 사용자 화면 없음 | C-008, K5 |
| 아무 화면에서 HTTP 401 / WS 종료 4001 | TBL-201 삭제 → SCR-001 | api-gate §4.3 |
| WS 종료 4003·4004 | 해당 문구 토스트 → SCR-002 | api-gate §4.3 |
| WS 종료 4008 | "요청이 너무 잦습니다." → SCR-002 | api-gate §4.3 |
| 경로 직접 입력·새로고침 | 세션 메모리가 비므로 SCR-003~006은 SCR-002로 (부팅 가드 2단계) — 진행 중 경기는 새로고침 = 연결 종료 = 이탈 (FR-009, N-02 재접속 복귀 미설계) | D3-14 |
| 브라우저 뒤로 가기 | 흐름 화면(SCR-003~006)은 `history.replaceState`로 이동하여 기록을 쌓지 않는다. SCR-005에서 `popstate`가 오면 일시 메뉴를 열고 경로를 `#/battle`로 되돌린다. SCR-007~009는 `pushState`라 뒤로 = SCR-002 | D3-14 |
| 상대 정보 노출 | 상대의 게이지·은혜·갑주는 화면에 표시하지 않음 (서버가 보내지 않음) — 상대 보드·점수·닉네임·위인만 | api-gate §5.2 |

---

## 4. 반응형 디자인

| 디바이스 | 최소 너비 | 레이아웃 변경 |
|:---|:---:|:---|
| Mobile | 0px | 4컬럼, 메뉴 화면 1열 세로 쌓기·하단 고정 버튼, 대전은 세로 배치(상대 미니 보드 위·내 보드 가운데·키캡 아래) + 터치 조작·진동 |
| Mobile 가로 | 0px (높이 < 500px) | 대전만 가로 배치, 키캡 오른쪽 세로 열 |
| Tablet | 768px | 8컬럼, 카드 2×2, 대전 가로 배치(상대 보드 0.6배), 터치·키보드 |
| Desktop | 1024px | 12컬럼(최대 1200px), 카드 4열, 대전 전체 HUD, 키보드 우선 |

> 화면별 변경표와 대전 셀 크기 공식은 `design-vision-디자인명세.md` §5.2·§5.3이 정본이다.

---

## 5. 접근성 (WCAG 2.1 AA)

> 대비·섬광·움직임·라이브 영역 기준은 `design-vision-디자인명세.md` §6이 정본이다. 아래는 화면별 포커스 순서와 역할 지정이다 (WCAG 2.4.3, 4.1.2).

| 화면 | 진입 시 포커스 | 포커스 순서 (Tab) | 역할·속성 |
|:---|:---|:---|:---|
| SCR-001 | 닉네임 입력 칸 | 입력 칸 → 입장하기 → (오류 시) 다시 시도 | 입력 `aria-describedby`=안내+오류, `aria-invalid` |
| SCR-002 | 화면 제목 h1 | 랜덤 [시작] → 방 만들기 → 코드로 입장 → 봇 난이도 라디오 → 봇 [시작] → 연습 [시작] → 전적 → 랭킹 → 옵션 | 난이도 `role="radiogroup"` |
| SCR-003 | 첫 위인 카드 (선택 상태면 그 카드) | 뒤로 → 위인 카드 그룹(그룹 안 이동은 화살표) → 확정 | 카드 `role="radio"` + `aria-checked`, 상세 패널 `aria-live="polite"` |
| SCR-004 | 상태 A·B: 취소 / 상태 C: 첫 코드 칸 / 상태 D: 상태 문장 | 상태 C: 코드 칸 6개 → 입장 → 취소 | 코드 표시 `aria-label="초대 코드 K 7 P X 4 Q"`, 대기 문장 `role="status"` |
| SCR-005 | 게임 키 전용 (HUD 버튼 `tabindex="-1"`) | 일시 메뉴·말씀 대결 패널·모달만 Tab 순환(포커스 가두기) | 캔버스 `aria-hidden`, HUD-17 라이브 영역, 말씀 대결 `role="dialog"` + 보기 `role="radio"` |
| SCR-006 | 결과 제목 h1 | 이미지 저장 → 공유 → 로비로 | 말씀 카드 `role="img"` + `aria-label`=출처·번역문 |
| SCR-007 | 화면 제목 h1 | 로비 → 표(읽기) → 이전 → 다음 → (오류 시) 다시 시도 | `<table>` + `<caption>` "전적, 최신순", 결과 배지는 글자 포함 |
| SCR-008 | 화면 제목 h1 | 로비 → 표 → (오류 시) 다시 시도 | 내 행 `aria-current="true"` |
| SCR-009 | 첫 컨트롤(화면 흔들림) | 돌아가기 → 흔들림 → 섬광 세기 → 마스터 → 효과음 → 음악 → 음소거 | 토글 `role="switch"`, 슬라이더 `aria-valuetext` |

---

## 6. UC-화면 매핑 및 중복 해체 검증 (P3-003, P3-004)

### 6.1 UC → 화면 매핑 (고유 진입점·고유 출력 — SKILL-03 규칙 3)

| UC-ID | 유스케이스 | 매핑 화면 (상태) | 고유 진입점 | 고유 출력 |
|:---|:---|:---|:---|:---|
| UC-001 | 게스트 닉네임으로 입장한다 | SCR-001 | 앱 시작(저장된 게스트 없음·무효) | 게스트 정보 저장 + SCR-002 |
| UC-002 | 모드와 위인을 고른다 | SCR-002 모드 카드, SCR-003 | 로비 모드 카드 버튼 | (mode, heroId) 확정 → 모드별 다음 단계 |
| UC-003 | 랜덤 매칭으로 대전을 시작한다 | SCR-004 상태 A·D | SCR-003 확정 (mode `random`) | `queued` 대기 표시 → `matched` 방 배정 |
| UC-004 | 친구 초대 코드로 대전한다 | SCR-004 상태 B·C·D | SCR-003 확정 (invite 방장 / 친구) | 초대 코드 표시(`roomCreated`) / 코드 입장 `matched` |
| UC-005 | AI 봇과 대전한다 | SCR-005 봇 변형 | SCR-003 확정 (mode `bot` + 난이도) | 봇 상대 표시(HUD-01·11 "AI 봇 · 난이도") |
| UC-006 | 연습 모드를 플레이한다 | SCR-005 연습 변형, SCR-006 연습 변형 | SCR-003 확정 (mode `practice`) | 1인 보드 세션·일시정지·그만하기 |
| UC-007 | 블록을 조작해 줄을 지운다 | SCR-005 HUD-02·03·04·14 | `start` 후 조작 키·터치 | 줄 삭제 연출 + `state`·`clear` 송신 |
| UC-008 | 공격을 보내고 받는다 | SCR-005 HUD-05·10·12·16 | 서버 `attack` / `effect` attackSent·offset | 쓰레기 줄·영 효과 반영 + 공격 연출 |
| UC-009 | 위인 스킬을 쓴다 | SCR-005 HUD-06·07 | 키 A | `effect` hero 연출·효과 |
| UC-010 | 천사를 소환한다 | SCR-005 HUD-08 | 키 1~5 | `effect` angel 연출·효과 |
| UC-011 | 전신갑주를 얻어 쓴다 | SCR-005 HUD-09 | 갑주 칸 줄 삭제 / 키 Q~Y | 보유 슬롯 표시 / `effect` armor |
| UC-012 | 예수님 이벤트가 일어난다 | SCR-005 예수님 연출 상태 | 서버 `effect` jesus (사용자 입력 없음) | 저주·암전 해제 + 빛·구절 연출 |
| UC-013 | 말씀 대결에 답한다 | SCR-005 말씀 대결 패널 상태 | 서버 `quizStart` | `quizResult` 보상·해설·니어미스 |
| UC-014 | 특수 블록을 지운다 | SCR-005 HUD-04 특수 칸 | 특수 칸이 든 줄 삭제 | 여리고 폭파·만나 충전·말씀 대결 개시 |
| UC-015 | 라운드·경기를 마치고 결과를 확인한다 | SCR-005 라운드 배너, SCR-006 | `topout` → `roundEnd`·`matchEnd` | 라운드 배너 / 결과 화면·말씀 카드 |
| UC-016 | 상대가 이탈한 경기를 끝낸다 | SCR-005 이탈 배너 → SCR-006 사유 변형 | 서버 `matchEnd` reason `disconnect` | "상대가 나갔습니다 — 승리" |
| UC-017 | 리액션을 보낸다 | SCR-005 HUD-13 | 키 7~9 | 상대 화면 말풍선 |
| UC-018 | 전적을 조회한다 | SCR-007 | 로비 [전적] | 내 경기 목록 |
| UC-019 | 랭킹을 조회한다 | SCR-008 | 로비 [랭킹] | 상위 100 + 내 순위 |
| UC-020 | 연출 세기와 음량을 조절한다 | SCR-009 | 로비 [옵션] / 일시 메뉴 [옵션] | 연출·음량 즉시 반영 |
| UC-021 | 키 없이 로컬에서 실행한다 | 화면 없음 (개발자 터미널) | 터미널 `npm run dev` | 실행 로그 (브라우저 접속 이후는 UC-001의 SCR-001) |
| UC-022 | 자동 테스트를 실행한다 | 화면 없음 (개발자 터미널) | 터미널 테스트 명령 | 통과·실패 출력 (E2E가 SCR-001~006을 구동하는 것은 검증 대상일 뿐 화면 기능 아님) |

> 검증: UC-001~UC-020 20건 전부 화면 1개 이상 ✅ / UC-021·UC-022는 행위자가 개발자(ACT-006)이고 진입·출력이 터미널이므로 화면이 없는 것이 정상 ✅ / 화면 9개 전부 UC 1개 이상 (§1 연결 UC 열) ✅.

### 6.2 UC-화면 중복 해체 검증

> 같은 화면을 둘 이상의 UC가 쓰거나 기능 접점이 있는 경우를 전수 조사했다 (12건). "통합" = 기능을 한 UC·한 컴포넌트로 모음, "분리" = 같은 화면 안에서 경계(컴포넌트·상태)를 명확히 나눔.

| UC-ID | 매핑 화면 | 핵심 기능 | 다른 UC/화면과 기능 중복 여부 | 처리 |
|:--|:--|:--|:--|:--|
| UC-001 | SCR-001 | 게스트 입장 | ❌ 없음 | 독립 |
| UC-002 | SCR-002, SCR-003 | 모드·위인 선택 | ⚠️ UC-004 4단계(친구의 위인 선택)와 같은 기능 | **통합** — 위인 선택은 UC-002(SCR-003) 한 곳에만 두고, UC-004 친구 경로는 SCR-003을 그대로 거친 뒤 SCR-004 상태 C로 간다. 위인 선택 컴포넌트 1개 |
| UC-003 | SCR-004 상태 A·D | 랜덤 대기·취소 | ⚠️ UC-004와 같은 화면 | **분리** — 상태 A(랜덤 대기)는 UC-003 전용, 상태 B·C(코드 표시·입력)는 UC-004 전용, 상태 D(짝 성사 전환)만 공유 표시 컴포넌트. 진입(`queued` vs `roomCreated`/코드 입력)과 출력이 다름 |
| UC-004 | SCR-002 버튼, SCR-004 상태 B·C·D | 초대 코드 발급·입력 | 위 UC-002·UC-003 참조 | 통합·분리 완료 |
| UC-005 | SCR-005 봇 변형 | 봇 상대 대전 | ⚠️ UC-007~014와 같은 화면 | **분리** — UC-005 고유 기능은 상대 패널의 봇 표시(HUD-01·11)와 리액션 비중계(UC-017 1a)뿐. 조작·공격·스킬은 각 UC 소유 |
| UC-006 | SCR-005 연습 변형, SCR-006 연습 변형 | 혼자 플레이·개인 기록 | ⚠️ (a) UC-007·UC-009와 같은 화면 (b) UC-015 결과 화면의 개인 기록과 같은 기능 | (a) **분리** — 연습 변형 레이아웃·일시정지·그만하기만 UC-006 소유, 조작·스킬은 UC-007·UC-009 컴포넌트 재사용 (b) **통합** — 개인 기록 표시는 SCR-006 PersonalRecord 컴포넌트 1개 |
| UC-007 | SCR-005 HUD-02·03·04·14 | 조작·줄 삭제·연출 | ❌ 없음 | 독립 |
| UC-008 | SCR-005 HUD-05·10·12·16 | 공격 판정 결과 표시 | ⚠️ 방어 연출(방패·검·미가엘·베드로)이 UC-009~011과 접점 | **분리** — UC-008은 공격 연출(EVT-20~23·27)만, 방어 발동 연출은 각 방어 수단의 UC(EVT-24·25·29·31) 소유 |
| UC-009 | SCR-005 HUD-06·07 | 위인 스킬·믿음 게이지 표시 | ⚠️ UC-010이 같은 게이지 사용 | **분리** — 게이지 표시(HUD-06)는 UC-009(FR-033) 소유, 천사 키(HUD-08)는 게이지 값을 읽기만 |
| UC-010 | SCR-005 HUD-08 | 천사 소환 | 위 UC-009 참조 | 분리 완료 |
| UC-011 | SCR-005 HUD-09 | 갑주 획득·사용 | ⚠️ UC-013 보상(무작위 갑주) 접점 | **분리** — UC-013은 보상 지급 연출(EVT-36 비행)까지, 보유 슬롯 표시는 UC-011 HUD-09 하나 |
| UC-012 | SCR-005 예수님 연출 상태 | 예수님 이벤트 연출 | ❌ 없음 (자동 발동, 입력 없음) | 독립 |
| UC-013 | SCR-005 말씀 대결 패널 | 말씀 대결 진행 | ⚠️ UC-014 말씀 블록(트리거) 접점 | **분리** — UC-014는 말씀 칸 표시·삭제(EVT-33), UC-013은 `quizStart` 이후 패널 전부 (spec-tablet §9.12 REQ-011/012 경계와 같음) |
| UC-014 | SCR-005 HUD-04 특수 칸 | 특수 칸 표시·효과 | 위 UC-013 참조 | 분리 완료 |
| UC-015 | SCR-005 라운드 배너, SCR-006 | 라운드·경기 결과 표시 | ⚠️ (a) UC-016과 결과 화면 공유 (b) UC-019와 레이팅 표시 접점 | (a) **통합** — 결과 화면은 SCR-006 하나, UC-016은 사유 변형(ScoreLine 이탈 문구·EVT-51 배너)만 더함 (b) **분리** — SCR-006은 이번 경기 변화량, SCR-008은 순위표 |
| UC-016 | SCR-005 이탈 배너, SCR-006 | 이탈 경기 종료 | 위 UC-015 참조 | 통합 완료 |
| UC-017 | SCR-005 HUD-13 | 리액션 | ❌ 없음 | 독립 |
| UC-018 | SCR-007 | 전적 조회 | ❌ 없음 | 독립 |
| UC-019 | SCR-008 | 랭킹 조회 | 위 UC-015 참조 | 분리 완료 |
| UC-020 | SCR-009 | 연출·음량 조절 | ⚠️ 진입점 2곳(로비·일시 메뉴) | **통합** — 옵션 화면 컴포넌트 1개, 진입점만 2개 (대전 중에는 같은 컴포넌트를 모달로 표시) |
| UC-021 | 화면 없음 | 로컬 실행 | ❌ 없음 | 독립 |
| UC-022 | 화면 없음 | 자동 테스트 | ❌ 없음 | 독립 |

> **판정:** 공유·접점 12건 = 통합 4건(UC-002/004 위인 선택, UC-006/015 개인 기록, UC-015/016 결과 화면, UC-020 진입점) + 분리 8건(UC-003/004, UC-005/007~014, UC-006/007·009, UC-008/009~011, UC-009/010, UC-011/013, UC-013/014, UC-015/019). **미처리 중복 0건** — 같은 기능이 두 UC·두 화면에 나뉜 곳이 없다.

---

## 7. 요구사항 → 화면 추적 (RTM 연결 확인 — 언약추적 갱신 규칙 "Phase 3 완료 시 화면 관련 항목 연결 확인")

> RTM 추적 매트릭스(§1)에는 화면 전용 열이 없으므로 열 구조는 바꾸지 않고, RTM에 "§7 화면 연결 확인 (Phase 3)" 절을 추가해 116개 ID 전부의 SCR-ID(또는 "해당 없음(사유)")를 기재했다 → [`rtm-covenant-언약추적.md`](../01.requirement-hearing-들음/rtm-covenant-언약추적.md) §7.

| 구분 | ID 수 | 화면 연결 | 해당 없음(사유 기재) |
|:---|:---:|:---:|:---:|
| REQ | 17 | 15 | 2 — REQ-016 로컬 실행, REQ-017 테스트 (개발자 터미널) |
| FR | 78 | 73 | 5 — FR-072 저장소 어댑터 자동 전환(저장 모드 표시는 N-06 미설계), FR-073 단일 명령 실행, FR-075·FR-076·FR-077 테스트 |
| NFR | 8 | 6 | 2 — NFR-004 비밀 경계(번들 비밀 0개), NFR-007 의존성 고정 |
| C | 13 | 9 | 4 — C-004 키 0개 동작, C-006 전송 계층, C-012 폴더 구조, C-013 backup 비공개 |
| 합계 | 116 | 103 | 13 |

---

## 8. 정경화 조건

- [x] 모든 UC에서 화면이 1개 이상 정의됨 (§6.1 — UC-001~UC-020, 터미널 UC-021·022는 사유 기록)
- [x] 디자인 시스템(색상, 폰트, 간격) 명시 (위 요약 + design-vision §2)
- [x] 반응형 브레이크포인트 정의 (§4 + design-vision §5)
- [x] 인터랙션 + 연결 API 명시 (§2 화면별 인터랙션 표 — API-001~006, API-101~154, API-201~262, API-290)
- [x] 접근성 기준 확인 (§5 + design-vision §6)
- [x] 모든 화면 UC-ID·REQ-ID 연결 (§1)
- [x] 색상 대비 최소 4.5:1 (design-vision §2.2 실측)
- [x] 에러·로딩·빈 상태 명시 (§2 각 화면 "상태")
- [x] 라우팅 가드 정의 (§3)
- [x] UC-화면 중복 해체 검증 통과 (§6.2 — 미처리 중복 0건)
