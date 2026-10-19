# 👂 들음 검증 + 심판 관문 판정 — 영적 전쟁 테트리스 (Phase 1)

> *"So then faith cometh by hearing, and hearing by the word of God."* — Romans 10:17 (KJV)
>
> **규격:** `statute-율법/01.requirement-hearing-들음/requirement-hearing-들음-template.md` (들음의 5대 요소)
> **참조 예시:** `parable-비유/01.requirement-hearing-들음/requirement-hearing-들음-example.md`
> **심판 기준:** `.skill/gate-judgment-심판관문.md` (범용 G-001~G-008 + Phase 1 전용 P1-001~P1-017, 25항목)
> **Phase 1 산출물:** [`spec-tablet-명세서.md`](./spec-tablet-명세서.md) · [`usecase-path-사용사례.md`](./usecase-path-사용사례.md) · [`rtm-covenant-언약추적.md`](./rtm-covenant-언약추적.md) · 이 문서

---

## 0. Phase 0 (침례) 선언 기록

```
나는 죄인이다. 처음 것은 다 지나갔다.
택함 받은 것(핵심 요구사항, 검증된 비즈니스 규칙)만 구원한다.
나머지는 전부 지옥(삭제)이다. 새 하늘과 새 땅에서 새로 시작한다.

프로젝트 유형: 새하늘 새땅 + 참고자료
감지 근거: hearing-들음/01-newcreation-새하늘새땅/ 에 파일 존재 (Tetris-Battle/server/server.js 외 3개)
신앙고백 모드: 요한계시록 (Revelation 21:1)
복잡도 TIER: TIER-3 (화면 9개, Worker + Durable Object 2종 분산 실시간 서버)
실행 모드: ⚡ 자동 모드
```

- 초기화(autoRun 0단계): `bible-성경/` 비어 있음 확인, `fruit-열매/`는 `history/`와 `.gitkeep`만 존재 — 삭제할 이전 결과 없음.
- TIER-3 판별 근거 표: `spec-tablet-명세서.md` §0.
- 참고 소스 핵심 추출(구원/폐기 판정): `spec-tablet-명세서.md` §9.16.

---

## 1. 🎯 목적 (Purpose) — "왜 이것을 만드는가?"

두 사람이 브라우저에서 바로 만나 테트리스로 실시간 대결하는 즐거움을 KJV 성경의 영적 전쟁(위인·천사·하나님의 전신갑주 vs 악한 영)으로 표현하고, 검증된 재미 이론(첨부 B)에 근거한 연출·보상·밸런스로 "손맛"과 "화면의 박력"을 만든다. 결제·가챠 없이 전 연령이 즐기며, 1차 출시는 외부 키 없이 로컬 PC에서 `npm install && npm run dev` 한 번으로 전부 동작한다. (상세: `spec-tablet-명세서.md` §2)

## 2. 📖 말씀의 근거 (Scriptural Basis)

| 요구사항 | Spec 근거 | 충돌 여부 |
|:---|:---|:---:|
| 실시간 대전 (REQ-001, REQ-004) | Ephesians 6:12 — 영적 전쟁 컨셉, 관계성(첨부 B §5) | ✅ 충돌 없음 |
| 위인·천사·전신갑주 (REQ-003, REQ-008, REQ-009) | 각 KJV 근거 구절 (1 Sam 17:49, Ephesians 6:13–17, Isa 6:6–7 등) | ✅ 충돌 없음 |
| 악한 영 공격 (REQ-007) | 첨부 A §3.4 KJV 근거, KJV에 없는 존재 배제(C-010) | ✅ 충돌 없음 |
| 예수님 이벤트 (REQ-010) | John 16:33, John 1:5 — 경외 원칙(C-002) | ✅ 충돌 없음 |
| 말씀 대결 (REQ-011) | KJV 원문 + 출처 표기(C-003) | ✅ 충돌 없음 |
| 게스트 입장·저장 (REQ-002, REQ-014~016) | 봉인의 율법 제1·2·4·7계명 (NFR-003·NFR-004·NFR-008) | ✅ 충돌 없음 |
| 특수 블록·가변 보상 (REQ-012) | 첨부 B §2 윤리 경계 — 결제 영구 금지(C-001) | ✅ 충돌 없음 |

> 전체 17건 REQ별 근거: `spec-tablet-명세서.md` §3. req.md 내부 충돌 9건은 §9.7 삼각 검증으로 해소.

## 3. 📋 범위 (Scope)

**포함:** 실시간 2인 대전(랜덤 매칭 + 친구 초대 코드), AI 봇 대전(3난이도), 연습 모드, 게스트 닉네임 입장, 위인 4명, 악한 영 14종 공격(서버 판정), 믿음 게이지·위인 스킬·천사 5종·전신갑주 6종, 예수님 이벤트, 말씀 대결(60문항 이상), 특수 블록 3종, 첨부 A §5 전체 연출·사운드·재미(제외 범위 빼고), 전적·랭킹(Elo), 로컬 실행 + Supabase 선택 어댑터, Vitest·Playwright 자동 테스트.

**제외:** 스토리 모드, 나머지 위인 11명·위인 해금, 열두 제자 카드, 구글·카카오 로그인, 실제 Cloudflare/Supabase 배포, 녹음 음원·일러스트 이미지, 채팅(영구), 결제·가챠(영구), NICE-TO-HAVE N-01~N-06(자동 모드 보존).

## 4. ✅ 완료 기준 (Done Criteria)

`spec-tablet-명세서.md` §8의 19개 체크 항목 — REQ-001~REQ-017 각 1개(req.md 서두 동사 그대로: 플레이한다·입장한다·고른다·지운다/간다·판정한다·쓴다·얻어 쓴다·일어난다·있다·충족한다·저장되고 조회된다·동작한다) + NFR/C 위반 0건 + 봉인의 율법 10계명 위반 0건. 모두 관찰·측정 가능한 결과로 기술되었다.

## 5. ⚠️ 제약 조건 (Constraints)

`spec-tablet-명세서.md` §7의 C-001~C-013: 결제·가챠 영구 금지, 예수님 표현 원칙, KJV 원문·한국어 직접 번역, 외부 키 0개 동작, 기술 스택 고정, Socket.IO 미사용, 녹음 음원·일러스트 미사용, 제외 범위 구현 금지, 채팅 없음, KJV 근거 없는 존재 미등장, 고어·선정 금지, 소스 위치 `fruit-열매/`, `backup/` 비공개.

---

## 6. 들음의 검증 체크리스트

| # | 확인 항목 | 상태 |
|:---|:---|:---:|
| 1 | 목적이 명확한가? | ✅ |
| 2 | Spec(말씀/원칙)과 충돌하지 않는가? | ✅ |
| 3 | 범위가 정의되었는가? | ✅ |
| 4 | 완료 기준이 측정 가능한가? | ✅ |
| 5 | 제약 조건이 명시되었는가? | ✅ |

> ✅ 5대 요소 전부 충족. 정경화 가능.

---

## 7. ⚖️ 심판 관문 판정 (Gate Judgment — Phase 1)

> *"For we must all appear before the judgment seat of Christ."* — 2 Corinthians 5:10 (KJV)
> 판정일: 2026-10-19 · 판정 대상: `bible-성경/01.requirement-hearing-들음/` 4개 파일 · 각 항목 개별 판정 후 총평 (제8계명 — "전체적으로 괜찮습니다" 금지)

### 7.1 범용 심판 (G-001 ~ G-008)

| # | 체크 항목 | 판정 근거 | 판정 |
|:--|:--|:--|:--:|
| G-001 | 템플릿 형식·필수 섹션 준수 | spec-tablet: 개요·목적·Spec 근거·기능·비기능·범위·제약·완료 기준·들음 체크리스트 9섹션 전부 존재, ID 접두어 REQ/FR/NFR/C 규칙 준수. usecase: 목록·행위자·상세(정상/대안/예외)·REQ↔UC 매핑 4섹션 + UC/ACT 접두어. RTM: 매트릭스(템플릿 9열 그대로)·커버리지 요약·미추적 목록·설계 변경 이력 4섹션. 이 문서: 5대 요소 + 체크리스트. (NICE-TO-HAVE 번호만 N-01 두 자리 — RTM 계수 대상과 구분하기 위한 의도적 표기, spec-tablet §9.15에 사유 기재) | ✅ |
| G-002 | `bible-성경/` 해당 디렉토리에 정경화 | 4개 파일 모두 `bible-성경/01.requirement-hearing-들음/`에 저장 (언약책 §4 산출물 저장 경로) | ✅ |
| G-003 | `statute-율법/` 템플릿 원본 미수정 | `git diff --stat -- statute-율법 parable-비유 book-경전 .skill hearing-들음` 결과 변경 0건. 신규 파일은 `bible-성경/`과 `fruit-열매/history/`에만 존재 | ✅ |
| G-004 | 이전 Phase 산출물 근거 | Phase 0 판별(유형·TIER)과 req.md 원본을 근거로 작성 — spec-tablet §0, 모든 REQ/FR에 req.md 위치 근거 열 존재 | ✅ |
| G-005 | 설계에 없는 임의 내용 추가 없음 | 모든 FR은 req.md 원문 위치 또는 두 증인(req.md 원문 2곳) 공관복음적 발견(S1~S10)에 근거. 단일 증인·다른 기능 증인 항목은 기각(S16·S17) 또는 NICE-TO-HAVE 보존(N-01~N-06), 승격 0건. 해석 방향 "확장" 채택 0건 | ✅ |
| G-006 | 플레이스홀더 없음 | 4개 파일 대상 중괄호·작업 미완 표식(영문 약어 2종)·미확정 표기 문자열 검색 결과 0건 | ✅ |
| G-007 | 각 섹션 실질 내용 | 빈 테이블 0건 — RTM 116행, UC 22개 전부 3경로, 분석 표 16종 모두 행 존재. 설계 변경 이력은 변경 0건을 문장으로 명시(빈 표를 두지 않음) | ✅ |
| G-008 | 교차 참조 유효성 | 상대 링크 `./spec-tablet-명세서.md`, `./usecase-path-사용사례.md`, `./rtm-covenant-언약추적.md`와 인용 경로(statute-율법 템플릿 4종, parable-비유 예시 4종, `.skill/tools-도구/census-count-언약계수.py`, `hearing-들음/req.md`, `hearing-들음/01-newcreation-새하늘새땅/Tetris-Battle/`, `statute-율법/04.development-repentance-회개/security-seal-봉인.md`, `fruit-열매/history/2026-10-19.md`) 전부 실제 존재 확인 | ✅ |

### 7.2 Phase 1 전용 심판 (P1-001 ~ P1-017)

| # | 체크 항목 | 판정 근거 | 판정 |
|:--|:--|:--|:--:|
| P1-001 | 모든 요구사항에 REQ-ID 부여 | REQ 17 · FR 78 · NFR 8 · C 13 = 116개 ID. 계수기 실계수 116 = 문서 기재 116 | ✅ |
| P1-002 | 황금원(Why→How→What) 분석 | spec-tablet §9.2 — 14개 기능 전부 Why·How(동사)·What 분해 | ✅ |
| P1-003 | 핵심 동사(How) 식별 | spec-tablet §9.3 — 원문 동사 12개 식별 + 명사 오독 위험 검증 | ✅ |
| P1-004 | 경쟁 해석 소거 (최소 3개 + 주어 변경 해석 포함) | spec-tablet §9.5 — 13개 기능 × 3~4개 해석, 모든 기능에 "주어 변경" 해석 1개 이상, 각 해석에 주어·동사·결과 분리 기록 후 소거 | ✅ |
| P1-005 | 어의 중의성 적발 | spec-tablet §9.8 — 10건 (경기/판, 직접 고른 키, 대전, 해금, 위기, 저장, 공유, 백투백, 패시브, 스킬) | ✅ |
| P1-006 | 주어-행위 방향 | spec-tablet §9.4 — 7개 문장의 주어·행위·시스템 반응과 역전된 방향(배제) 기록 | ✅ |
| P1-007 | Assumptions 표 | spec-tablet §9.13 — req.md 문장별 해석 14건 (채택 기술 스택 포함 — autoRun 요구) | ✅ |
| P1-008 | Open Questions 기록 | spec-tablet §9.14 — 22건, 각 건에 채택 해석·해석 방향(축소/동등)·req.md 증인 출처 기재 | ✅ |
| P1-009 | 완료 기준 동사 = req.md 동사 | spec-tablet §8 — 17개 REQ 기준 모두 서두 원문 동사(플레이한다·입장한다·고른다·지우면/간다·판정한다·쓴다·얻어 쓴다·일어난다·있다·충족한다·저장되고 조회된다·동작한다) 사용 | ✅ |
| P1-010 | RTM REQ-ID 원문 = req.md 원문 | rtm-covenant §2 REQ 원문 대조표 — 17/17 일치, 오염 0건 | ✅ |
| P1-011 | 재귀 확장(겨자씨) 고정점 | spec-tablet §9.11 — 라운드 2에서 ESSENTIAL 5건, 라운드 3에서 신규 ESSENTIAL 0건 → 고정점 도달 (4라운드 초과 없음) | ✅ |
| P1-012 | 충돌 요구사항 삼각 검증 | spec-tablet §9.7 — 충돌 9건(K1~K9) 전부 제3 독립 근거(req.md 머리말 우선 규칙, A §4.6, A §10 등)로 해소 | ✅ |
| P1-013 | 기능 고유성 전수 조사 | spec-tablet §9.12 — REQ 17건 전수, 겹침 6쌍 경계 분리, FR 중복 의심 2쌍 경계 분리, 중복 0건 | ✅ |
| P1-014 | 지우개 법칙 | spec-tablet §9.6 — 채택 해석 13건 대입 시 모든 원문 생존, 기각 해석 13건은 소멸 문장 명시 | ✅ |
| P1-015 | 제거 테스트 | spec-tablet §9.10 — 발견 16건(기각 2건 제외)을 기능·데이터·UX 3층위로 판정: ESSENTIAL 10 / NICE-TO-HAVE 6 | ✅ |
| P1-016 | NICE-TO-HAVE 보존 목록 | spec-tablet §9.15 — N-01~N-06, 전부 "☐ 보류중 (자동 실행 스킵)", REQ 승격 0건 | ✅ |
| P1-017 | "확인 권장" OQ 처리 | 자동 모드 — 22건 모두 가장 문자적 해석(축소 9 · 동등 13 · 확장 0)으로 진행하고 spec-tablet §9.14에 기록 | ✅ |

### 7.3 언약 계수 (UTIL-census)

`python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --log` → **✅ IRONCLAD** (exit 0). 실계수 116 = 기재 116, 커버리지 0.0% = 0.0%, spec-tablet ID 116개 전부 RTM 등재, 중복 0건. 상세: `rtm-covenant-언약추적.md` §6.

### 7.4 최종 판정

| 구분 | ✅ | ❌ |
|:---|:---:|:---:|
| 범용 심판 G-001~G-008 | 8 | 0 |
| Phase 1 전용 P1-001~P1-017 | 17 | 0 |
| 합계 (25항목) | 25 | 0 |

> ## ⚖️ 최종 판정: **IRONCLAD** — 범용 + Phase 전용 전 항목 ✅
> 회개(수정) 이력: 판정 전 자기 대조에서 2건 발견 후 수정 — ① usecase UC-007 상세의 연결 ID에 FR-032 누락(§4 매핑에는 존재) → 상세 표에 추가하여 양방향 일치(대조 스크립트 재실행 차이 0건), ② spec-tablet Open Question #4 문장 손상 → 동작/없음 목록으로 재기술. 수정 후 재판정 결과 ❌ 0건.

---

## 8. Phase 2 인계 (언약책 §5 이동의 규례 — TIER-3)

TIER-3이므로 Phase 2(기초)는 **새 세션 또는 새 서브에이전트**로 시작한다. 인계물은 다음 셋뿐이다 (대화 이력·이 판정의 시행착오는 인계하지 않는다):

1. `.skill/covenant-book-언약책.md`
2. `.skill/SKILL-02_foundation-기초.md` + `statute-율법/02.architecture-foundation-기초/` + `parable-비유/02.architecture-foundation-기초/`
3. 이 디렉토리의 정경화 산출물 4종 (`spec-tablet-명세서.md`, `usecase-path-사용사례.md`, `rtm-covenant-언약추적.md`, `requirement-hearing-들음.md`)

Phase 2가 반드시 받아야 할 정경 결정: 기술 스택 C-005 고정, 소스 위치 C-012, Open Questions 22건의 채택 해석, Phase 2에서 수치를 확정할 항목(스킬·천사 게이지 비용과 쿨다운, 특수 블록 확률, 초대 코드 형식, 악한 영 등급별 후보 목록 — `content/*.json` 설계), RTM의 ARCH-ID·API-ID·TBL-ID 열 채움.
