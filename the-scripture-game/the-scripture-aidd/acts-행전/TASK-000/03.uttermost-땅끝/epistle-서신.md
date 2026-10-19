# ✉️ 서신 — 03.uttermost-땅끝 / TASK-000

> ⚠️ **파생 문서(Derived).** 이 서신은 원본이 아니다. 직접 수정 금지 — 원본을 고친 뒤 이 서신을 재생성하라.
> 원본: `bible-성경/01.requirement-hearing-들음/spec-tablet-명세서.md`, `bible-성경/03.design-order-질서/screen-vision-화면설계.md`, `bible-성경/02.architecture-foundation-기초/api-gate-성문.md` (§1 목록·§2 공통 규약·§4 에러 코드), `bible-성경/02.architecture-foundation-기초/architecture-temple-성전설계.md` (§10 보안), `statute-율법/04.development-repentance-회개/security-seal-봉인.md` (봉인 계명)
> 생성일: 2026-10-19 / 생성 기준: RTM 설계 변경 이력 최종 행 = 2026-10-19 DCL-009 (rtm-covenant-언약추적.md §5 — DCL-001 data-ark §6.1 부록·§7, DCL-002 data-ark TBL-018 `rateLimit`, DCL-003 data-ark TBL-018 `gravity.accelAfterMs`·`ledger.*`, DCL-004 architecture ARCH-002·ARCH-013 착지 평가 위치 + data-ark TBL-018 `placement.weights`, DCL-005 data-ark TBL-018 `net.joinTimeoutMs`·`net.readyTimeoutMs`, DCL-006 data-ark TBL-018 `bot.*` 난이도 수치·`lineBias`·`biasMaxHeight`), DCL-007 design-vision §2.8·§2.10·§4.6.8·§4.9 렌더 구조 주석, DCL-008 design-vision §2.10·§4.6.2·§4.6.8·§4.7.1·§4.7.3·§4.7.4 03-B 세부 수치 주석, DCL-009 design-vision §2.5·§3.5.1·§4.6.1~§4.6.3·§4.6.5·§4.6.8 충격파 고리·빛기둥·자막 맞춤) · **재생성 2026-10-19 W-03A·W-03B** (W-02 재생성본은 DCL-007~DCL-009 추가로 무효 — acts-행전 README "서신은 무효가 된다". DCL-007~009는 모두 design-vision 개정이며 design-vision은 이 서신에 발췌하지 않고 아래 포인터로만 가리킨다 — 발췌 행 변경 0, 표 행 원문 대조 비원문 0)
>
> **규격:** `statute-율법/04.development-repentance-회개/epistle-서신-template.md`
> **이 지역의 개발 계층:** 프론트엔드/UI(03-A 렌더 코어 → 03-B 오디오·타격감 → 03-C 화면·HUD·네트워크) + 인증·보안 봉인 + 로컬 실행 인프라(03-D) (task-wall 4~6단계)
> **발췌 원칙:** 아래 `## REQ 원문 발췌`·`## 설계 발췌`의 각 블록은 원본 파일에서 표 행·절을 **그대로 잘라 온 것**이다(요약·의역 0). 블록마다 `— 출처:`를 붙였다. 제목 단계(#)만 이 문서 구조에 맞춰 낮췄다.

## 지역 개요
- TASK-ID: TASK-000 (task-wall §2.0 행전 묶음 — 이 지역의 실행 단위는 아래 태스크)
- 지역: 03.uttermost-땅끝
- 이 지역 태스크: [03-A] TASK-040, TASK-041, TASK-042, TASK-043, TASK-044(-1~-3), TASK-045 · [03-B] TASK-050(-1, -2), TASK-051(-1, -2), TASK-052, TASK-053 · [03-C] TASK-060(-1, -2), TASK-061, TASK-062(-1, -2), TASK-063, TASK-064(-1, -2), TASK-065, TASK-066, TASK-067(-1, -2) · [03-D] TASK-070, TASK-071, TASK-072 ← 상태·짝 배정은 task-wall 참조. 여기 복사하지 않는다.
- 선행 지역: 02.samaria-사마리아

## 선행 지역 확인
- 직전 지역: 02.samaria-사마리아
- task-wall 확인: TASK-030~TASK-034 — 이 서신 생성 시점(2026-10-19, Phase 4 계획 완료 직후)의 상태는 전부 ⬜ 미착수다. 이 지역의 Doer·Witness는 **착수 직전에** `bible-성경/04.development-repentance-회개/task-wall-성벽.md`에서 위 태스크 전부 ✅ · 짝 검증 결과 ✅를 직접 확인한다(서신에 완료를 적지 않는다 — acts-행전 README 사용 규칙 3).
- history 이정표: `fruit-열매/history/` 에 "(Acts 12:24) 사마리아 배치 완료" 이정표 줄이 있어야 착수한다.
- RTM: `/census-count`(UTIL-census) 실계수로 직전 지역 REQ 행 최신 여부를 확인한다.
- 무효 조건: 이 서신 생성 이후 RTM §5 설계 변경 이력에 새 행이 생겼으면 이 서신은 무효 — 재생성 후 착수한다.

## 그룹별 원본 열람 지시 (포인터 — 발췌 아님)
- 03-A 렌더 코어: `design-vision-디자인명세.md` §2.2~§2.5·§2.8·§2.10~§2.13·§4.9·§5.2 — 좌표·색·텍스처·파티클·필터 수치의 원본. 이 서신에는 싣지 않았다(1,473줄 문서 — 그룹 Doer가 원본을 직접 읽는다). 원본의 `[추가 2026-10-19 — RTM §5 DCL-007·DCL-008·DCL-009]` 주석과 취소선 수치(~~옛 값~~ 새 값)가 현재 값이다.
- 03-B 오디오·타격감: `design-vision-디자인명세.md` §2.9~§2.10·§4.6 전체(이벤트 ID 표)·§4.7(SFX·AUX·BGM)·§4.8·§6.3.
- 03-C 화면·HUD·네트워크: 아래 SCR 발췌 + `design-vision-디자인명세.md` §2.1·§2.6~§2.8·§3(와이어프레임 WF-001~WF-009 좌표표)·§4.1~§4.5·§5·§6, `api-gate-성문.md` §3 메시지 상세(API-001~API-031). 03-C는 03-A·03-B 모듈을 조립만 한다 — 스테이지 구조(design-vision §2.8 DCL-007 주석: letterbox → [screenRoot, HolyLayer, ScreenFx]), 자막 영역 맞춤(§3.5.1 DCL-009 ④), 감소 모드 정의(§2.9 머리 주석·§6.3)를 원본에서 확인한다.
- 03-D 봉인·실행: 아래 봉인 발췌 + `statute-율법/04.development-repentance-회개/sync-fruit-열매검증-template.md`, `parable-비유/04.development-repentance-회개/security-seal-봉인-example.md`, `.skill/UTIL-census-언약계수.md`.

## REQ 원문 발췌

### 상위 요구사항 (spec-tablet §4.1)

| ID | 요구사항 (req.md 서두 동사 보존) | 우선순위 | 하위 FR |
|:--|:---|:---:|:---|
| REQ-001 | 사용자가 브라우저에서 KJV 성경 기반 실시간 2인 대전 테트리스를 플레이한다 | High | FR-001~FR-011 |
| REQ-002 | 사용자는 게스트 닉네임으로 입장한다 | High | FR-012 |
| REQ-003 | 사용자는 위인 4명(다윗·솔로몬·베드로·바울) 중 한 명을 고른다 | High | FR-013~FR-017 |
| REQ-004 | 사용자는 대전 모드(사람 대 사람, 랜덤 매칭 + 친구 초대 코드)를 고를 수 있다 | High | FR-018~FR-020, FR-078 |
| REQ-005 | 사용자는 AI 봇 대전(쉬움·보통·어려움)을 고를 수 있다 | High | FR-021, FR-022, FR-078 |
| REQ-006 | 사용자는 연습 모드를 고를 수 있다 | Mid | FR-023, FR-078 |
| REQ-007 | 줄을 지우면 상대에게 쓰레기 줄과 악한 영(14종)이 공격으로 간다. 서버가 공격을 판정한다 | High | FR-024~FR-032 |
| REQ-008 | 사용자는 믿음 게이지로 위인 스킬과 천사 5종을 쓴다 | High | FR-033~FR-035 |
| REQ-009 | 사용자는 전신갑주 6종을 얻어 쓴다 | High | FR-036~FR-038 |
| REQ-010 | 예수님 "세상을 이기었노라" 이벤트(첨부 A §3.2 원칙 그대로)가 경기당 1회 일어날 수 있다 | High | FR-039 |
| REQ-011 | 말씀 대결(성경 퀴즈, 60문항 이상)이 있다 | High | FR-040~FR-043 |
| REQ-012 | 특수 블록 3종(말씀·여리고 나팔·만나)이 있다 | High | FR-044~FR-047 |
| REQ-013 | 디자인·액션·사운드·재미 요구사항(첨부 A §5 전체)은 필수다. 첨부 B의 체크리스트를 충족해야 한다 | High | FR-048~FR-067 |
| REQ-014 | 경기 결과(전적)가 저장되고 조회된다 | High | FR-068, FR-069 |
| REQ-015 | 랭킹(Elo)이 저장되고 조회된다 | High | FR-070, FR-071 |
| REQ-016 | 외부 서비스 키 없이 `npm install && npm run dev` 한 번으로 전부 동작해야 한다. Supabase는 환경변수가 있을 때만 쓰는 어댑터로 둔다 | High | FR-072~FR-074 |
| REQ-017 | 테스트: Vitest(단위) + Playwright(브라우저 2개 E2E) | High | FR-075~FR-077 |

— 출처: bible-성경/01/spec-tablet-명세서.md §4.1 REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017

### 기능 요구사항 (spec-tablet §4.2)

#### (spec-tablet §4.2) REQ-001 실시간 2인 대전 테트리스
| ID | 기능명 | 설명 (측정 가능한 형태) | 우선순위 | req.md 근거 |
|:--|:---|:---|:---:|:---|
| FR-003 | 이동·드롭·홀드·고스트 | 좌우 이동, 소프트 드롭, 하드 드롭, 홀드(교체 1회/낙하당), 고스트 피스 표시 | High | A §2.1 |
| FR-006 | 상대 보드 실시간 표시 | 클라이언트는 `state`(seq, 압축 보드, 활성 블록, 점수)를 초당 10~15회 보내고, 상대 화면에 `opponentState`로 표시된다 | High | A §4.3, §5.4 |
| FR-007 | 승리 조건 | 상대 블록이 천장에 닿으면(Top-out) 라운드 승리. 3판 2선승제. 경기 승리 시 KJV 구절과 승리 연출 (예: 2 Timothy 4:7) | High | A §2.4 |
| FR-008 | 실시간 통신 프로토콜 | 브라우저 기본 WebSocket(partysocket) 위 JSON 메시지. 클라이언트→서버: join, ready, state, clear, skill, topout. 서버→클라이언트: matched, start, opponentState, attack, effect, roundEnd, matchEnd | High | A §4.2, §4.3 |
| FR-009 | 상대 이탈 처리 | 대전 중 한 플레이어의 연결이 끊기면 서버가 이탈로 판정하고 남은 플레이어를 경기 승자로 `matchEnd`를 보내며, 이탈자는 패배로 전적에 기록된다 | High | 공관복음적 발견 S2 (§9.9) |
| FR-011 | 조작 입력 | 키보드 조작(이동·회전·드롭·홀드·스킬·천사·갑주 사용 키). 모바일: 터치 스와이프 조작 + 진동(`navigator.vibrate`) 피드백 | High | A §5.2 모바일 행 |

#### (spec-tablet §4.2) REQ-002 게스트 입장
| ID | 기능명 | 설명 | 우선순위 | req.md 근거 |
|:--|:---|:---|:---:|:---|
| FR-012 | 게스트 닉네임 입장 | 사용자가 닉네임을 입력해 입장한다. 서버가 닉네임을 검증(길이·허용 문자, 중복 거부 — profiles.nickname unique)하고 게스트 ID와 게스트 토큰을 발급한다. 닉네임·게스트 ID·토큰은 브라우저에 저장되어 재방문 시 다시 입력하지 않는다. 이후 모든 `join`은 이 토큰을 담는다 | High | 서두, A §4.3 join(token), §4.4, §4.6 |

#### (spec-tablet §4.2) REQ-003 위인 선택 (1차 4명)
| ID | 기능명 | 설명 | 우선순위 | req.md 근거 |
|:--|:---|:---|:---:|:---|
| FR-013 | 캐릭터 선택 화면 | 다윗·솔로몬·베드로·바울 4명을 코드로 그린 벡터 엠블럼, 스킬 이름·효과, KJV 근거 구절과 함께 보여 주고 사용자가 1명을 고른다. 4명 모두 처음부터 선택 가능 | High | 서두, A §3.1, §5.1 위인 |

#### (spec-tablet §4.2) REQ-004 · REQ-005 · REQ-006 모드
| ID | 기능명 | 설명 | 우선순위 | req.md 근거 |
|:--|:---|:---|:---:|:---|
| FR-018 | 랜덤 매칭 | Matchmaker가 대기열을 관리하고 레이팅(Elo) 차이가 작은 상대부터 짝지어 `matched`(방 ID, 상대 닉네임·위인)를 보낸다 | High | A §4.1, §4.3, §5.5(3) |
| FR-019 | 친구 초대 코드 | 사용자가 방을 만들면 서버가 초대 코드를 발급하고, 친구가 그 코드를 입력하면 같은 방(GameRoom)으로 입장한다. 잘못된·만료된·가득 찬 코드는 거부 메시지 | High | 서두, A §1.3, §4.3 join(roomCode) |
| FR-020 | 대기 취소·대기열 정리 | 사용자가 매칭 대기를 취소하거나 연결이 끊기면 대기열에서 제거되어, 없는 플레이어와 매칭되지 않는다 | High | 공관복음적 발견 S3 |
| FR-021 | AI 봇 대전 | 쉬움·보통·어려움 3단계 봇과 대전(3판 2선승). 난이도는 봇의 착지 판단 품질과 조작 속도로 구분된다. 봇 대전의 공격도 서버가 판정한다. 봇에게는 4명 중 위인 1명이 무작위 배정된다 | High | 서두, A §5.4, §5.5(3) |
| FR-022 | 봇의 말씀 대결 응답 | 봇 대전 중 말씀 대결이 열리면 봇이 난이도별 정답률·응답 시간으로 답하고, 서버가 사람과 같은 도착 순서 규칙으로 판정한다 | High | 공관복음적 발견 S7 |
| FR-023 | 연습 모드 | 혼자 플레이하며 위인 스킬을 익힌다. 상대·공격·말씀 대결이 없고, 믿음 게이지 충전과 위인 스킬 사용, 여리고 나팔·만나 블록(해금 단계에 따름)이 동작한다. Top-out 시 개인 기록을 보여 준다 | Mid | 서두, A §1.3 |
| FR-078 | 화면 흐름 | 닉네임 입장 → 로비(모드 선택: 대전-랜덤 / 대전-초대 코드 / AI 봇(난이도) / 연습, 전적·랭킹·옵션 진입) → 캐릭터 선택 → 매칭 대기·초대 코드 → 대전 → 결과 → 로비. 화면 9개 | High | 서두, A §4.5 main.js "로비 → 캐릭터 선택 → 대전" |

#### (spec-tablet §4.2) REQ-008 믿음 게이지 · 위인 스킬 · 천사
| ID | 기능명 | 설명 | 우선순위 | req.md 근거 |
|:--|:---|:---|:---:|:---|
| FR-033 | 믿음 게이지 | 줄을 지울 때마다 믿음 게이지가 찬다. 게이지 값은 서버가 관리하고 화면에 표시된다 | High | A §2.3, §4.3 |
| FR-034 | 위인 스킬 발동 | 사용자가 스킬 키를 누르면 `skill`(skillId)을 보내고, 서버가 게이지·쿨다운을 검증한 뒤 발동하여 `effect`로 양측에 연출을 알린다. 게이지 부족·쿨다운 중이면 거부 피드백 | High | A §2.3, §4.3, §5.5(5) |

#### (spec-tablet §4.2) REQ-010 예수님 이벤트
| ID | 기능명 | 설명 | 우선순위 | req.md 근거 |
|:--|:---|:---|:---:|:---|
| FR-039 | "세상을 이기었노라" 이벤트 | 믿음 게이지가 가득 찬 상태에서 위기(FR-055 위험선)에 처하면 서버가 경기당 1회 발동한다. 효과: 내 보드의 모든 저주와 암전 제거 + 쓰레기 줄 절반 제거. 표현: 얼굴 없이 빛과 실루엣, John 16:33·John 1:5 구절 표시. 선택 캐릭터가 아니며 피해·패배 대상으로 나오지 않는다 | High | 서두, A §3.2, §5.4 |

#### (spec-tablet §4.2) REQ-011 말씀 대결
| ID | 기능명 | 설명 | 우선순위 | req.md 근거 |
|:--|:---|:---|:---:|:---|
| FR-040 | 말씀 대결 발생 | 말씀 블록이 든 줄을 지우면 열린다. 아무도 못 지우면 마지막 말씀 대결(또는 라운드 시작) 후 90초마다 자동으로 열린다. 대전(사람·봇) 전용 | High | A §5.5(1) |
| FR-041 | 진행·판정·보상 | 두 플레이어 화면이 동시에 멈추고 KJV 기반 4지선다가 10초 제한으로 나온다. 서버가 도착 순서로 판정, 먼저 맞힌 사람이 보상(믿음 게이지 +50% 또는 무작위 전신갑주)을 받는다. 틀리면 3초 동안 다시 고를 수 없다. 정답 해설에 KJV 원문 구절과 출처 표시 | High | A §5.5(1) |
| FR-042 | 니어미스 연출 | 둘 다 맞혔는데 늦은 쪽에 도착 시간 차이를 "0.12초 차이!" 형식으로 크게 보여 준다 | High | A §5.5(1) |

#### (spec-tablet §4.2) REQ-013 디자인 · 액션 · 사운드 · 재미 (첨부 A §5 전체)
| ID | 기능명 | 설명 | 우선순위 | req.md 근거 |
|:--|:---|:---|:---:|:---|
| FR-048 | 아트 방향 | 톤 "어둠 속에 비치는 빛"(다크 판타지 + 금빛·흰빛 네온). 7종 블록을 성막 재료 색(금, 은, 청색, 자색, 홍색 — Exodus 26:1)으로, 유리 질감·하이라이트·은은한 발광(Glow). 여러 층 시차(Parallax) 배경(하늘 빛, 구름, 빛 입자), 공격을 받으면 배경이 붉고 어둡게 변함 | High | A §5.1 |
| FR-049 | 존재 시각 표현 | 악한 영: 실루엣·연기 중심 반투명. 천사: 빛·날개·불꽃 — 그룹은 네 얼굴과 바퀴(Ezek 10), 스랍은 여섯 날개(Isa 6:2). 위인: 코드로 그린 벡터 엠블럼 | High | A §5.1 |
| FR-050 | 폰트 번들 | 영어 구절 Cinzel, 한글 Noto Serif KR을 `@fontsource`로 번들에 포함 — 오프라인에서도 표시 | High | A §5.1 |
| FR-051 | 조작 연출 | 블록 이동·회전: 미세한 이동 보간(트윈), 회전 잔상. 하드 드롭: 낙하 궤적 빛줄기 + 착지 충격파 + 작은 화면 흔들림 | High | A §5.2 |
| FR-052 | 삭제 연출 | 1~3줄: 줄이 하얗게 번쩍인 뒤 블록이 조각나 파티클 폭발. 테트리스: 강한 흔들림, 0.08초 히트스톱, 충격파 필터, "TETRIS" 대형 글자. 콤보: 수가 커질수록 글자 크기·색·떨림 증가, 음 높이 상승. T-Spin/백투백: 금빛 섬광 + 전용 문구 + 전용 효과음 | High | A §5.2 |
| FR-053 | 공격 연출 | 공격 발사: 내 보드에서 상대 보드로 빛의 화살(투사체) 궤적. 공격 받음: 보드가 붉게 번쩍이고 흔들림, 경고 게이지 차오름. 양측 공격이 화면 가운데에서 부딪혀 상쇄되는 연출 | High | A §5.2, §5.4 보는 재미 |
| FR-054 | 영·천사·스킬 등장 연출 | 악한 영 등장: 화면 가장자리 비네트 어둠, 연기 파티클, 영 이름과 KJV 구절 자막. 천사·스킬 발동: 위에서 빛기둥, 날개 파티클 + 성가 화음 | High | A §5.2 |
| FR-055 | 위기 연출·위험선 | 블록이 위험선(보드 상단 4줄 영역) 근처에 오면 심장박동 효과음 + 보드 테두리 붉은 맥동. 위험선 판정은 예수님 이벤트·만나 확률·적응형 BGM이 함께 쓴다 | High | A §5.2, §3.2, §5.3, §5.5(2) |
| FR-056 | 승리·패배 연출 | 승리: 빛 폭발 + 금빛 콘페티(canvas-confetti) + 구절. 패배: 보드가 회색으로 굳으며 무너짐 | High | A §5.2 |
| FR-057 | 연출 세기 옵션 | 옵션 메뉴에서 흔들림 끄기, 섬광 줄이기 등 연출 세기 조절(광과민성 배려) | High | A §5.2 |
| FR-058 | 효과음 | Tone.js 코드 합성(음원 파일 없음): 이동, 회전, 소프트/하드 드롭, 착지, 홀드, 1~4줄 삭제(줄 수마다 다른 음), 콤보 상승음, T-Spin, 공격 발사, 공격 받음, 악한 영 등장(저음 드론), 천사 등장(합창 화음), 스킬 발동, 카운트다운, 승리 팡파르, 패배 — 17종 전부 | High | A §5.3 |
| FR-059 | 배경음악 | 대기실 BGM과 대전 BGM. 위기 상황에서 템포와 긴장감이 올라가는 적응형 음악 | High | A §5.3 |
| FR-060 | 음량 조절 | 마스터 / 효과음 / 음악 음량 조절과 음소거 | High | A §5.3 |
| FR-061 | 타격 피드백 동기화 | 콤보가 이어질수록 배경 빛·음 높이·테두리 맥동이 고조. 콤보가 터지는 순간 히트스톱(0.05~0.1초) + 파티클 + 흔들림 + 효과음이 같은 프레임에 나온다. 니어미스: 테트리스 직전 콤보가 끊기거나 1칸 차이로 지면 "아깝다!" 문구와 함께 놓친 줄을 잠깐 강조 | High | A §5.5(4) |
| FR-062 | 실력 보정 "은혜(Grace)" | 연속 3판 진 플레이어는 다음 판에서 받는 쓰레기 줄 −1, 믿음 게이지 충전 +15%. 화면에는 "은혜" 아이콘으로만 은은하게 표시 | High | A §5.5(3) |
| FR-063 | 말씀 카드 | 경기 결과 화면에 그 경기의 대표 구절 카드를 보여 주고, 이미지로 저장하거나 공유할 수 있다 | High | A §5.4 |
| FR-064 | 감정 표현 리액션 | 대전 중 짧은 리액션 3종(🙏 아멘, 🔥 할렐루야, 😇)을 보내 상대 화면에 표시. 채팅 없음 | High | A §5.4 |
| FR-065 | 업적 | 업적 달성 판정·표시. 정의된 업적: "골리앗 사냥꾼 — 다윗으로 한 경기 테트리스 5회" | Mid | A §5.4 |
| FR-066 | 개인 기록·성장 수치 | 경기가 끝나면 개인 기록(최대 콤보, 분당 공격, 퀴즈 정답률)과 이전 판 대비 성장 수치를 보여 준다 | High | A §5.5(5) |
| FR-067 | 플레이어 진행 기록 | 서버가 게스트 ID별로 누적 판 수, 연속 패배 수, 직전 판 개인 기록, 업적 달성을 저장한다 (FR-047·FR-062·FR-065·FR-066의 데이터 원천) | High | 공관복음적 발견 S8 |

#### (spec-tablet §4.2) REQ-014 전적 · REQ-015 랭킹
| ID | 기능명 | 설명 | 우선순위 | req.md 근거 |
|:--|:---|:---|:---:|:---|
| FR-069 | 전적 조회 | 사용자가 전적 화면에서 자기 경기 기록(상대, 위인, 승패, 시간, 일시)을 최신순으로 조회한다 | High | 서두 "조회된다" |
| FR-071 | 랭킹 조회 | 사용자가 랭킹 화면에서 레이팅 상위 100명(닉네임, 레이팅)과 자기 순위를 조회한다 | High | 서두, A §4.4 leaderboard |

#### (spec-tablet §4.2) REQ-016 로컬 실행 · REQ-017 테스트
| ID | 기능명 | 설명 | 우선순위 | req.md 근거 |
|:--|:---|:---|:---:|:---|
| FR-072 | 저장소 어댑터 자동 전환 | `.dev.vars`에 Supabase 키가 없으면 Durable Object 내장 SQLite(로컬 파일)에 저장. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 설정되면 Supabase Postgres 어댑터로 자동 전환. 두 어댑터는 같은 저장 인터페이스(프로필·경기·랭킹) | High | 서두, A §4.4, §4.6 |
| FR-073 | 단일 명령 로컬 실행 | 저장소 루트에서 `npm install && npm run dev` 한 번으로 Vite 개발 서버와 `wrangler dev`(Workers + Durable Objects, 로그인 불필요)가 함께 뜨고, 브라우저 2개로 대전할 수 있다 | High | 서두, A §4.6 |

— 출처: bible-성경/01/spec-tablet-명세서.md §4.2 FR-003, FR-006, FR-007, FR-008, FR-009, FR-011, FR-012, FR-013, FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-033, FR-034, FR-039, FR-040, FR-041, FR-042, FR-048, FR-049, FR-050, FR-051, FR-052, FR-053, FR-054, FR-055, FR-056, FR-057, FR-058, FR-059, FR-060, FR-061, FR-062, FR-063, FR-064, FR-065, FR-066, FR-067, FR-069, FR-071, FR-072, FR-073, FR-078

### 비기능 요구사항 (spec-tablet §5)

| ID | 분류 | 요구사항 | 측정 방법 | req.md 근거 |
|:--|:---|:---|:---|:---|
| NFR-001 | 성능 | 렌더링 60fps 유지(중급 모바일 기준). 파티클은 오브젝트 풀링으로 재사용 | 브라우저 성능 측정(프레임 시간 16.7ms 이하 비율) | A §5.2, §7.3 |
| NFR-002 | 성능 | 공격 반영 지연 100ms 이하 (`clear` 송신 → 상대 `attack` 수신) | 로컬 두 브라우저 E2E에서 타임스탬프 차이 측정 | A §7.3 |
| NFR-003 | 보안(봉인의 율법 제7계명) | 서버는 모든 클라이언트 메시지를 스키마 검증하고, 게스트 토큰이 없거나 틀린 `join`을 거부하며, 닉네임 길이·문자를 제한하고, 비정상 빈도 메시지를 차단한다 | 단위 테스트: 잘못된 메시지·토큰 거부 | A §4.3 서버 권한, §4.6 |
| NFR-004 | 보안(봉인의 율법 제1·2계명) | Supabase service role 키는 Worker 환경변수(`.dev.vars` / `wrangler secret`)에만 두고 클라이언트 번들에 절대 포함하지 않는다. 클라이언트에는 anon 공개 키만. `.dev.vars`는 git 제외 | 빌드 산출물 문자열 검사 | A §4.4 |
| NFR-005 | 가용성(오프라인 자산) | 폰트·그래픽·사운드가 외부 네트워크 리소스 없이 로컬 번들만으로 동작 | 네트워크 차단 상태 로딩 확인 | A §5.1, §5.3 |
| NFR-006 | 재미 품질 | 첨부 B §10 체크리스트 8항목 각각에 충족 장치가 연결되어 있다 (§6 범위의 매핑표) | 체크리스트 매핑 검증 (Phase 5·6) | 서두, A §5.5(6), B §10 |
| NFR-008 | 개인정보(봉인의 율법 제4계명) | 수집 정보는 닉네임·게스트 ID·게스트 토큰·경기 기록뿐. 이메일·실명 등 수집 없음 | 저장 스키마 검사 | 서두 "게스트 닉네임" |

— 출처: bible-성경/01/spec-tablet-명세서.md §5 NFR-001, NFR-002, NFR-003, NFR-004, NFR-005, NFR-006, NFR-008

### 제약 조건 (spec-tablet §7)

| ID | 제약 | 근거 (req.md) |
|:--|:---|:---|
| C-001 | 현금 결제·확률형 유료 아이템(가챠)을 넣지 않는다 — 앞으로도 영구히. 가변 보상은 "다음 판이 궁금해지는 정도"까지만 | A §5.5(2) 윤리 원칙, B §2 |
| C-002 | 예수님은 선택 캐릭터가 아니고, 피해를 받거나 지는 대상으로 나오지 않으며, 얼굴을 그리지 않고 빛과 실루엣으로만 표현하고, 경기당 1회 이벤트로만 쓴다 | 서두 "§3.2 원칙 그대로", A §3.2 |
| C-003 | 게임 내 영어 구절은 KJV(1769) 원문 그대로. 한국어는 개역개정을 쓰지 않으며 KJV 직접 번역 문장을 쓴다. 모든 구절은 출처 장·절을 표기 | A §3 머리말, §8 |
| C-004 | 외부 서비스 키(Cloudflare 계정, Supabase URL/키)가 하나도 없어도 전부 동작해야 한다 | 서두 인프라, A §4.6 |
| C-007 | 녹음 음원·일러스트 이미지를 쓰지 않는다 — 코드 합성 사운드(Tone.js)와 코드로 그린 그래픽만 | 서두 제외, A §5.1, §5.3 |
| C-008 | 이번 실행 제외 범위(스토리 모드, 위인 11명, 열두 제자 카드, 구글·카카오 로그인, 실제 클라우드 배포)를 구현하지 않는다 | 서두 "이번 실행에서 제외" |
| C-009 | 채팅 기능을 넣지 않는다 (리액션만) | A §5.4 |
| C-011 | 연출은 무섭게 하되 고어·선정 표현을 하지 않는다 (전 연령) | A §3.5, §5.1 |

— 출처: bible-성경/01/spec-tablet-명세서.md §7 C-001, C-002, C-003, C-004, C-007, C-008, C-009, C-011

## 설계 발췌

### 1. 화면 목록

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

— 출처: bible-성경/03/screen-vision-화면설계.md §1

### 2. 화면 상세 명세

#### 공통 셸 (모든 화면)

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| 배경 | ParallaxBackdrop (DOM) | design-vision §2.12 메뉴용 CSS 배경 (SCR-005는 Pixi 배경) |
| 최상위 | AudioUnlockToast | 오디오 시작 전 "🔈 소리를 켜려면 화면을 누르세요" (design-vision §4.7.1) |
| 최상위 | ToastHost | `role="status"`, 최대 2개 쌓임 |
| 최상위 | ScreenVeil | 화면 전환 장막 (z 800) |
| 전역 | SessionStore | 메모리: 게스트 프로필(닉네임·레이팅·roundsPlayed), 흐름 상태(mode·botLevel·inviteAction·heroId), 대전 세션(matched·start·소켓), 마지막 matchEnd, 옵션 값(N-04 미승격 — 저장 안 함) |
| 전역 | ContentIndex | `content/*.json` 8종 번들 import 색인 (architecture D-15) — 화면은 이 색인으로 이름·효과 문장·구절·수치를 읽는다 |

#### SCR-001: 닉네임 입장

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

#### SCR-002: 로비

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

#### SCR-003: 캐릭터(위인) 선택

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

#### SCR-004: 매칭 대기 / 초대 코드 / 입장 준비

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

#### SCR-005: 대전

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

#### SCR-006: 결과 (말씀 카드)

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

#### SCR-007: 전적

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

#### SCR-008: 랭킹

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

#### SCR-009: 옵션

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

— 출처: bible-성경/03/screen-vision-화면설계.md §2 공통 셸 · SCR-001~SCR-009

### 3. 라우팅 가드

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

— 출처: bible-성경/03/screen-vision-화면설계.md §3

### 4. 반응형 디자인

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

— 출처: bible-성경/03/screen-vision-화면설계.md §4

### 5. 접근성 (WCAG 2.1 AA)

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

— 출처: bible-성경/03/screen-vision-화면설계.md §5

### 9. Phase 4 인계 (언약책 §5 이동의 규례 — TIER-3)

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

— 출처: bible-성경/03/screen-vision-화면설계.md §9

### 1. 컴포넌트 목록 (발췌 — ARCH-002 · ARCH-013, RTM §5 DCL-004 재각)

| ARCH-ID | 컴포넌트 | 위치 (`fruit-열매/`) | 책임 (단일) | 근거 REQ/FR |
|:---|:---|:---|:---|:---|
| ARCH-002 | 게임 엔진 (DOM 비의존 순수 모듈) | `client/js/engine/` | 10×20 보드, 7종 테트로미노, 시드 7-bag, SRS 벽차기, 홀드·고스트, 줄 삭제·콤보·B2B·T-Spin·점수, 낙하 속도 곡선, 특수 칸·갑주 칸 결정론적 배정, **최적 착지 평가(`placement.js` — 솔로몬·가브리엘 착지 힌트와 서버 봇 공용) [재각 2026-10-19 — RTM §5 DCL-004]** | FR-001~FR-004, FR-010, FR-015, FR-021, FR-035, FR-036, FR-044~FR-047 |
| ARCH-013 | AI 봇 | `worker/src/bot/` | GameRoom 안에서 ARCH-002 엔진 인스턴스를 구동: 엔진 착지 평가(ARCH-002 `placement.js`) 위에 난이도별 평가 노이즈·조작 속도·실수율 **[재각 2026-10-19 — RTM §5 DCL-004]**, 말씀 대결 정답률·응답 시간 | FR-021, FR-022 |

— 출처: bible-성경/02/architecture-temple-성전설계.md §1 ARCH-002, ARCH-013

### TBL-018: rules.json (규칙 수치 — 콘텐츠) — 발췌: 03 클라이언트가 읽는 엔진·힌트·소켓 행 (DCL-003·DCL-004·DCL-005 영향)

> **목적:** spec-tablet §4.2 머리말이 Phase 2에 위임한 **모든 수치의 단일 원천**. 서버 판정과 클라이언트 표시가 같은 값을 읽는다 — 화면·코드 하드코딩 금지
> **연결 REQ:** REQ-001, REQ-005, REQ-007~REQ-013, REQ-015, FR-004, FR-010, FR-019, FR-021~FR-047, FR-062, FR-064, FR-065, FR-070, NFR-003

| 키 (경로) | 값 | 단위 | 근거 / 해석 |
|:---|:---|:---|:---|
| `board.width` / `board.height` | 10 / 20 | 칸 | FR-001 |
| `board.dangerRows` | 4 | 줄 | OQ #7 위험선 = 상단 4줄, FR-055 |
| `board.preview` | 3 | 개 | 기본 다음 블록 미리보기 |
| `board.previewSolomon` / `board.previewGabriel` | 5 / 7 | 개 | FR-015 패시브, FR-035 가브리엘 |
| `gravity.startMs` | 1000 | ms/줄 | FR-010 시작 낙하 간격 |
| `gravity.at120sMs` | 500 | ms/줄 | 0~120초 선형 감소 ("완만하게") |
| `gravity.accelEveryMs` / `gravity.accelFactor` / `gravity.minMs` | 15000 / 0.85 / 80 | ms / 배 / ms | 120초 이후 15초마다 ×0.85 ("2분 뒤부터 가속"), 하한 80ms |
| `gravity.accelAfterMs` | 120000 | ms | **[추가 2026-10-19 — RTM §5 DCL-003]** 선형 감소 구간 끝·가속 시작 시점 (FR-010 "2분 뒤부터") — 지금까지 키 이름 `at120sMs`에만 숨어 있던 값을 단일 원천으로 올림, 값 불변 |
| `heroSkills.understanding_heart` | cost 40, cooldownMs 20000, hintMs 10000 | — | FR-015 |
| `angels.gabriel` | cost 40, cooldownMs 20000, pieces 7 | — | FR-035 |
| `placement.weights` | `{"aggregateHeight": -0.510066, "lines": 0.760666, "holes": -0.35663, "bumpiness": -0.184483}` | 가중치 | **[추가 2026-10-19 — RTM §5 DCL-004]** 착지 평가 점수 = Σ 가중치 × 특징(집계 높이·지운 줄·구멍·울퉁불퉁함). FR-015 솔로몬·FR-035 가브리엘 "최적 착지 위치 힌트" = 이 점수가 가장 큰 착지(`client/js/engine/placement.js`, 클라이언트 로컬 엔진). FR-021 봇은 같은 점수에 `bot.*`의 `evalNoise`·`mistakeRate`를 더한다(난이도 차이는 `bot.*`만). 값 = 01 지역 D-01 구현 상수(공개 휴리스틱) 그대로 이전 — 새 수치 발명 0 |
| `net.stateHz` | 12 | 회/초 | FR-006 "초당 10~15회" 안 |
| `net.joinTimeoutMs` / `net.readyTimeoutMs` | 5000 / 10000 | ms | **[추가 2026-10-19 — RTM §5 DCL-005]** 로비 소켓 연결 후 `join` 기한(API-005)·방 소켓 연결 후 `ready` 기한(API-006) — 넘으면 `error AUTH_TIMEOUT` + Close 4001 (api-gate §4.3). api-gate에만 있던 값을 단일 원천으로 올림, 값 불변 |

— 출처: bible-성경/02/data-ark-법궤.md TBL-018 (board · gravity · placement · heroSkills.understanding_heart · angels.gabriel · net 행만 — 원문 그대로)

### 1. API 전체 목록

> Method 열: HTTP 메서드, 또는 WebSocket 메시지 방향(`WS↑` 클라이언트→서버, `WS↓` 서버→클라이언트). 엔드포인트 열의 `lobby`는 API-005 소켓, `room`은 API-006 소켓. FR-008이 정한 기본 메시지 13종은 이름·필드를 보존했고(★), 나머지는 괄호 안 FR이 요구하는 통로다.

| API-ID | Method | Endpoint / 메시지 | 설명 | 연결 REQ | 인증 |
|:---|:---|:---|:---|:---|:---:|
| API-001 | POST | `/api/guests` | 게스트 닉네임 입장 — 게스트 ID·토큰 발급 | REQ-002, FR-012 | ❌ |
| API-002 | GET | `/api/guests/me` | 저장된 토큰 확인·프로필 조회 (재방문) | REQ-002, FR-012 | ✅ |
| API-003 | GET | `/api/matches` | 내 전적 최신순 조회 | REQ-014, FR-069 | ✅ |
| API-004 | GET | `/api/leaderboard` | 랭킹 상위 100 + 내 순위 | REQ-015, FR-071 | ✅ |
| API-005 | GET (Upgrade) | `/ws/lobby` | Matchmaker WebSocket 연결 | REQ-004, FR-008 | ✅ (`join` 토큰) |
| API-006 | GET (Upgrade) | `/ws/room/:roomId` | GameRoom WebSocket 연결 | REQ-001, FR-008 | ✅ (`ready` 토큰 + 티켓) |
| API-007 | WS↑ | lobby `join` ★ | 랜덤 매칭·초대 코드 만들기/입장·봇 대전·연습 요청 | REQ-004, REQ-005, REQ-006, FR-018, FR-019, FR-021, FR-023 | ✅ |
| API-008 | WS↑ | lobby `cancel` | 매칭 대기·초대 대기 취소 (FR-020) | REQ-004, FR-020 | ✅ |
| API-009 | WS↓ | lobby `waiting` | 대기 상태 + 발급된 초대 코드 (FR-019) | REQ-004, FR-019 | ✅ |
| API-010 | WS↓ | lobby `matched` ★ | 방 배정 (roomId, 입장 티켓, 상대) | REQ-004, REQ-005, FR-018 | ✅ |
| API-011 | WS↑ | room `ready` ★ | 방 입장 인증 + 준비 완료 | REQ-001, FR-005, FR-008 | ✅ |
| API-012 | WS↑ | room `state` ★ | 내 보드 스냅샷 (초당 12회) | REQ-001, FR-006 | ✅ |
| API-013 | WS↑ | room `clear` ★ | 줄 삭제 정보 (공격 계산용) | REQ-007, FR-024, FR-032 | ✅ |
| API-014 | WS↑ | room `skill` ★ | 위인 스킬 / 천사 소환 | REQ-008, FR-034, FR-035 | ✅ |
| API-015 | WS↑ | room `armor` | 전신갑주 사용 (FR-037) | REQ-009, FR-037 | ✅ |
| API-016 | WS↑ | room `answer` | 말씀 대결 응답 (FR-041) | REQ-011, FR-041 | ✅ |
| API-017 | WS↑ | room `reaction` | 리액션 보내기 (FR-064) | REQ-013, FR-064 | ✅ |
| API-018 | WS↑ | room `topout` ★ | 게임 오버 (연습은 그만하기 포함) | REQ-001, FR-007, FR-023 | ✅ |
| API-019 | WS↓ | room `start` ★ | 라운드 시작 (같은 시드, 카운트다운) | REQ-001, FR-005 | ✅ |
| API-020 | WS↓ | room `opponentState` ★ | 상대 보드 스냅샷 | REQ-001, FR-006 | ✅ |
| API-021 | WS↓ | room `attack` ★ | 서버 판정 공격 (쓰레기 줄 + 악한 영) | REQ-007, FR-024~FR-031 | ✅ |
| API-022 | WS↓ | room `garbage` | 대기 공격의 쓰레기 줄 상승 지시 (FR-025) | REQ-007, FR-025, FR-016 | ✅ |
| API-023 | WS↓ | room `effect` ★ | 스킬·천사·갑주·예수님·특수 블록·은혜 발동 | REQ-008, REQ-009, REQ-010, REQ-012, FR-034~FR-039 | ✅ |
| API-024 | WS↓ | room `status` | 서버 관리 수치 (게이지·쿨다운·갑주·효과·대기 공격) (FR-033) | REQ-008, FR-033 | ✅ |
| API-025 | WS↓ | room `reject` | 행동 거부 피드백 (FR-034) | REQ-008, FR-034, FR-032 | ✅ |
| API-026 | WS↓ | room `quiz` | 말씀 대결 문제 (FR-041) | REQ-011, FR-040, FR-041 | ✅ |
| API-027 | WS↓ | room `quizResult` | 말씀 대결 판정·보상·해설·니어미스 (FR-041, FR-042) | REQ-011, FR-041, FR-042 | ✅ |
| API-028 | WS↓ | room `reaction` | 상대 리액션 표시 (FR-064) | REQ-013, FR-064 | ✅ |
| API-029 | WS↓ | room `roundEnd` ★ | 라운드 승패 | REQ-001, FR-007 | ✅ |
| API-030 | WS↓ | room `matchEnd` ★ | 경기 승패·개인 기록·성장·레이팅·업적 | REQ-001, REQ-014, REQ-015, FR-007, FR-009, FR-063, FR-065, FR-066 | ✅ |
| API-031 | WS↓ | lobby·room `error` | 치명 오류 후 소켓 종료 (NFR-003) | NFR-003 | — |

> 합계: HTTP 4 + WebSocket 엔드포인트 2 + WebSocket 메시지 25 = **31**.

— 출처: bible-성경/02/api-gate-성문.md §1

### 2. 공통 규약

| 항목 | 규격 |
|:---|:---|
| Base URL (브라우저 기준) | `http://localhost:5173` — 클라이언트는 상대 경로 `/api/...`, `/ws/...`만 쓴다. Vite 프록시가 `http://127.0.0.1:8787`(wrangler dev)로 전달 (`ws: true`) — architecture D-03 |
| 콘텐츠 타입 | REST: `application/json; charset=utf-8` / WebSocket: UTF-8 텍스트 프레임 1개 = JSON 1개 |
| 인증 방식 | REST: `Authorization: Bearer <guestToken>` / WebSocket: 브라우저가 헤더를 못 붙이므로 첫 메시지(`join`, `ready`) 본문의 `token` (§5) |
| REST 공통 응답 | `{"success": true, "data": ...}` / `{"success": false, "error": {"code": "SNAKE_CASE", "message": "한국어 메시지"}}` / 목록은 `meta` 추가 |
| WS 공통 봉투 | 정상: `{"type": "<메시지명>", "data": { ... }}` / 치명 오류: `{"type": "error", "error": {"code": "...", "message": "..."}}` 후 소켓 종료 (REST와 같은 `code`·`message` 구조 — "변하지 않는" 응답, Malachi 3:6) |
| 페이징 | 커서(키셋) 방식 — 무한 증가하는 전적에 OFFSET을 쓰지 않는다. 요청 `limit`(1~50, 기본 20) + `before`(ISO-8601, 이 시각보다 이전), 응답 `meta: {"size": n, "nextBefore": "ISO-8601" 또는 null}` |
| 시간 표기 | ISO-8601 UTC 문자열 (`2026-10-19T14:30:00.000Z`), 기간·남은 시간은 정수 ms |
| 메시지 크기 | WebSocket 프레임 최대 4,096바이트(rules.json `rateLimit.maxMessageBytes`), REST 본문 최대 1,024바이트 — 초과 시 BAD_MESSAGE / PAYLOAD_TOO_LARGE |
| 속도 제한 | 소켓별 토큰 버킷 (data-ark TBL-018 `rateLimit`): state 20/초, clear 10/초, skill·armor 5/초, answer 4/초, reaction 1/2초, 전체 40/초. 초과분: state·reaction은 조용히 버림(UC-017 E2), 나머지는 `reject RATE_LIMITED`, 전체 한도 3초 연속 초과 시 `error RATE_LIMITED` 후 종료. REST 게스트 생성은 접속 주소별 분당 5회(메모리 계수만, 저장 안 함) |
| 검증 원칙 | 서버는 모든 메시지를 `type`별 스키마로 검증(필수·타입·범위·열거·추가 필드 무시)하고 실패 시 공격·효과를 만들지 않는다 (NFR-003, ARCH-015) |
| 버전 | 프로토콜 버전 1 — `start`·`matched`에 `"protocol": 1` 포함 |

— 출처: bible-성경/02/api-gate-성문.md §2

### 4. 에러 코드 정의

#### 4.1 REST (HTTP)

| 에러 코드 | HTTP | 메시지 (한국어) | 사용 API |
|:---|:---:|:---|:---|
| BAD_REQUEST | 400 | 요청 형식이 올바르지 않습니다. | API-001 |
| NICKNAME_INVALID | 400 | 닉네임 규칙(2~12자, 한글·영문·숫자·_)을 확인하세요. | API-001 |
| INVALID_QUERY | 400 | 조회 조건이 올바르지 않습니다. | API-003 |
| UNAUTHORIZED | 401 | 입장 정보가 올바르지 않습니다. | API-002~API-004 |
| ORIGIN_FORBIDDEN | 403 | 허용되지 않은 접속 경로입니다. | API-001~API-006 |
| NOT_FOUND | 404 | 요청한 경로가 없습니다. | 정의되지 않은 경로 |
| ROOM_NOT_FOUND | 404 | 방을 찾을 수 없습니다. | API-006 |
| NICKNAME_TAKEN | 409 | 이미 사용 중인 닉네임입니다. | API-001 |
| PAYLOAD_TOO_LARGE | 413 | 요청이 너무 큽니다. | API-001 |
| UPGRADE_REQUIRED | 426 | WebSocket 연결이 필요합니다. | API-005, API-006 |
| RATE_LIMITED | 429 | 요청이 너무 잦습니다. 잠시 후 다시 시도하세요. | API-001 |
| INTERNAL_ERROR | 500 | 서버 오류가 발생했습니다. | 전체 |
| STORAGE_UNAVAILABLE | 503 | 기록 저장소에 연결할 수 없습니다. 잠시 후 다시 시도하세요. | API-001~API-004 |

#### 4.2 WebSocket `reject` 코드 (비치명 — 소켓 유지)

| 에러 코드 | 메시지 (한국어) | retryInMs | 사용 API |
|:---|:---|:---:|:---|
| CLEAR_REJECTED | 진행 기록이 올바르지 않아 공격이 취소되었습니다. | null | API-013 |
| NOT_ACTIVE | 지금은 사용할 수 없습니다. | null | API-013~API-015, API-018 |
| GAUGE_LOW | 믿음이 부족합니다. | null | API-014 |
| COOLDOWN | 아직 준비되지 않았습니다. | 남은 ms | API-014 |
| ANGEL_SEALED | 천사 소환이 봉인되었습니다. | 남은 ms | API-014 |
| SKILL_INVALID | 사용할 수 없는 스킬입니다. | null | API-014 |
| MODE_FORBIDDEN | 이 모드에서는 사용할 수 없습니다. | null | API-014, API-015, API-018 |
| NO_ARMOR | 보유한 갑주가 없습니다. | null | API-015 |
| QUIZ_WRONG | 틀렸습니다. 3초 뒤 다시 고를 수 있습니다. | 3000 | API-016 |
| QUIZ_LOCKED | 잠시 후 다시 고를 수 있습니다. | 남은 ms | API-016 |
| QUIZ_CLOSED | 말씀 대결이 끝났습니다. | null | API-016 |
| REACTION_INVALID | 보낼 수 없는 리액션입니다. | null | API-017 |
| RATE_LIMITED | 입력이 너무 빠릅니다. | 남은 ms | API-013~API-016 |

#### 4.3 WebSocket `error` 코드 + Close 코드 (치명 — 소켓 종료)

| 에러 코드 | Close | 메시지 (한국어) | 사용 |
|:---|:---:|:---|:---|
| BAD_MESSAGE | 4000 | 메시지 형식이 올바르지 않습니다. | lobby·room 전체 |
| HERO_INVALID | 4000 | 선택할 수 없는 위인입니다. | API-007 |
| MODE_INVALID | 4000 | 선택할 수 없는 모드입니다. | API-007 |
| UNAUTHORIZED | 4001 | 입장 정보가 올바르지 않습니다. | API-007, API-011 |
| AUTH_TIMEOUT | 4001 | 연결 인증 시간이 지났습니다. | API-005, API-006 |
| TICKET_INVALID | 4003 | 방 입장 권한이 없습니다. | API-011 |
| ROOM_NOT_FOUND | 4004 | 방을 찾을 수 없습니다. | API-006, API-011 |
| INVITE_NOT_FOUND | 4404 | 초대 코드를 찾을 수 없습니다. | API-007 |
| INVITE_EXPIRED | 4408 | 초대 코드가 만료되었습니다. | API-009 이후 |
| INVITE_FULL | 4409 | 이미 가득 찬 방입니다. | API-007 |
| ALREADY_QUEUED | 4409 | 이미 다른 창에서 대기 중입니다. | API-007 |
| OPPONENT_LEFT | 4410 | 상대가 나갔습니다. | API-011 (시작 전 이탈) |
| RATE_LIMITED | 4429 | 요청이 너무 잦아 연결을 종료합니다. | lobby·room 전체 |
| MATCH_SETUP_FAILED | 1011 | 방을 준비하지 못했습니다. 다시 시도하세요. | API-010 |
| MATCH_ABORTED | 1011 | 경기를 계속할 수 없습니다. | room (봇 처리 오류 — UC-005 E2, 전적 미기록) |
| STORAGE_UNAVAILABLE | 1011 | 기록 저장소에 연결할 수 없습니다. | API-007 |
| (정상 종료) | 1000 | `cancelled` · `matched` · `match_end` | API-008, API-010, API-030 |

— 출처: bible-성경/02/api-gate-성문.md §4

### 10. 보안 아키텍처 (봉인의 율법 연동)

> 원본: `statute-율법/04.development-repentance-회개/security-seal-봉인.md`. 템플릿 검증 규칙 "제2·3·7계명 최소 준수"를 포함해 10계명 전부를 대응시킨다.

| 봉인 계명 | 적용 | 근거 |
|:---|:---|:---|
| 제1계명: 노출하지 말라 | 서버 로그에는 guestId 앞 8자와 이벤트 종류만. 토큰·토큰 해시·티켓은 로그·응답 본문(발급 응답 제외)에 쓰지 않는다. 랭킹·전적 응답에 guestId를 넣지 않고 닉네임만 노출 | NFR-003, NFR-008 |
| 제2계명: 코드에 넣지 말라 | Supabase `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY`는 `worker/.dev.vars`(로컬) / `wrangler secret`(운영)에만. `.dev.vars`는 `.gitignore`. 저장소에는 값 없는 `.dev.vars.example`만. 클라이언트 번들에는 Supabase 키가 **하나도** 없다(클라이언트는 Supabase에 직접 접속하지 않음 — req.md "anon 키만"보다 엄격) | NFR-004, C-004 |
| 제3계명: 암호화하라 | 게스트 토큰은 SHA-256 해시로만 저장. 전송: 로컬 실행판은 localhost(http/ws) 루프백 통신이며, 운영 경로(다음 단계)는 Cloudflare 기본 HTTPS/WSS | FR-012 |
| 제4계명: 최소만 취하라 | 수집 = 닉네임·게스트 ID·토큰 해시·경기 기록·진행 기록뿐. 이메일·실명·IP 저장 없음 | NFR-008 |
| 제5계명: 동의 없이 취하지 말라 | 수집 항목은 사용자가 직접 입력한 닉네임뿐이며, 닉네임 입장 화면에 "닉네임은 랭킹에 공개됩니다" 안내를 둔다(문구 배치는 Phase 3) | FR-012, FR-071 |
| 제6계명: 외부에 넘기지 말라 | 제3자 분석·광고 SDK 없음. Supabase는 운영자가 직접 환경변수로 연결한 자기 소유 저장소일 때만 사용 | FR-072 |
| 제7계명: 접근을 통제하라 | REST 조회는 `Authorization: Bearer <token>` 필수(API-002~API-004). WS는 `join`/`ready`에 토큰 + GameRoom 입장 티켓(Matchmaker가 발급, 1회용) 필수. 경기 기록 쓰기는 GameRoom → Matchmaker RPC만 가능(외부 엔드포인트 없음). Supabase 모드에서 테이블 RLS를 켜고 anon 정책을 두지 않음(service role만 접근). Origin 허용 목록(`ALLOWED_ORIGINS`, 기본 `http://localhost:5173,http://127.0.0.1:5173`) | NFR-003, FR-068 |
| 제8계명: 기록하라 | Worker 구조화 로그(`console.log` JSON 1줄): 게스트 생성, 토큰 검증 실패, 메시지 거부(코드), 속도 제한 초과, 저장 실패. wrangler dev 콘솔에 출력 | UC-007 E4, UC-015 E2 |
| 제9계명: 유출을 대비하라 | 원장이 유출돼도 토큰 원문은 복원 불가(해시). Supabase 키 유출 시 대응 = Supabase에서 service role 키 재발급 → `wrangler secret put` 교체(운영 단계 절차) | NFR-004 |
| 제10계명: 탐하지 말라 | 수집 데이터는 매칭·전적·랭킹·진행 보정 용도로만 사용. 분석·추적 코드 없음 | NFR-008 |

**입력 방어 3중 (SKILL-02 방어 깊이):** ① 클라이언트 — 닉네임 입력 `required`·`maxlength=12`·`pattern` (ARCH-001) ② 서버 — trim 후 정규식 `^[가-힣A-Za-z0-9_]{2,12}$`, 모든 WS 메시지 스키마 검증·크기 상한 4KB·속도 제한 (ARCH-015) ③ DB — `NOT NULL` + `CHECK(length(trim(nickname)) BETWEEN 2 AND 12)` 등 (data-ark §6).

— 출처: bible-성경/02/architecture-temple-성전설계.md §10 (봉인의 율법 연동)

### 봉인의 율법 10계명 (statute 원문)

#### 제1계명: 노출하지 말라 (Thou Shalt Not Expose)
개인정보(이름, 이메일, 전화번호, 주소 등)를 로그, 출력, 응답에 평문으로 노출하지 말라.

#### 제2계명: 코드에 넣지 말라 (Thou Shalt Not Hardcode)
비밀번호, API 키, 토큰, 자격증명(Credentials)을 소스 코드에 직접 기록하지 말라. 반드시 환경 변수(ENV) 또는 시크릿 관리자(Secret Manager)를 사용하라.

#### 제3계명: 암호화하라 (Thou Shalt Encrypt)
민감 데이터는 저장(at rest) 시와 전송(in transit) 시 모두 암호화하라. 평문 저장은 봉인을 뜯는 행위이며 곧 죄다.

#### 제4계명: 최소만 취하라 (Thou Shalt Minimize)
필요한 최소한의 개인정보만 수집하라. 목적을 달성한 데이터는 즉시 파기하라. 탐욕은 죄다.

#### 제5계명: 동의 없이 취하지 말라 (Thou Shalt Not Take Without Consent)
사용자의 명시적 동의 없이 개인정보를 수집, 처리, 전달하지 말라. 도적질하지 말라.

#### 제6계명: 외부에 넘기지 말라 (Thou Shalt Not Share)
사용자의 개인정보를 명시적 허가 없이 제3자, 외부 API, 또는 학습 데이터로 넘기지 말라. 배신하지 말라.

#### 제7계명: 접근을 통제하라 (Thou Shalt Guard Access)
개인정보에 대한 접근은 최소 권한 원칙(Principle of Least Privilege)을 적용하라. 봉인을 열 수 있는 자는 권한 받은 자뿐이다.

#### 제8계명: 기록하라 (Thou Shalt Log)
개인정보에 대한 모든 접근, 수정, 삭제를 감사 로그(Audit Log)에 기록하라. 하나님 앞에 숨겨진 것은 없다.

#### 제9계명: 유출을 대비하라 (Thou Shalt Prepare)
데이터 유출(Breach) 발생 시 즉시 탐지하고 통보할 수 있는 대응 절차를 갖추어라. 파수꾼은 잠들지 말라.

#### 제10계명: 남의 데이터를 탐하지 말라 (Thou Shalt Not Covet)
분석, 마케팅, 또는 어떤 목적으로든 수집 범위를 넘어서는 데이터 활용을 탐하지 말라. 탐심은 우상숭배와 같다.

---

> **위반의 결과:** 이 율법을 위반한 산출물은 예수님의 심판(Final Verification)에서 **Fail(지옥/Reject)**된다. 봉인을 함부로 뜯는 자에게는 구원(Deploy)이 없다.

— 출처: statute-율법/04.development-repentance-회개/security-seal-봉인.md 제1~제10계명
