# 📜 요구사항 추적 매트릭스 (RTM — Covenant Trace) — 영적 전쟁 테트리스

> *"And the Lord said unto Moses, Write this for a memorial in a book."* — Exodus 17:14 (KJV)
>
> **규격:** `statute-율법/01.requirement-hearing-들음/rtm-covenant-언약추적-template.md`
> **참조 예시:** `parable-비유/01.requirement-hearing-들음/rtm-covenant-언약추적-example.md`
> **근거 산출물:** [`spec-tablet-명세서.md`](./spec-tablet-명세서.md) (REQ 17 · FR 78 · NFR 8 · C 13), [`usecase-path-사용사례.md`](./usecase-path-사용사례.md) (UC-001~UC-022)
> **갱신 시점:** Phase 1 완료 — REQ 열 전체 등재 + UC-ID 연결. **Phase 2 완료(2026-10-19)** — 언약추적 갱신 규칙 "Phase 2 완료 시 ARCH-ID, API-ID, TBL-ID 열 채움"에 따라 116행 전부 연결, 상태 ⬜ → 🔄(설계 산출물에만 연결). **Phase 3 완료(2026-10-19)** — "화면 관련 항목 연결 확인"을 §7에 기록(매트릭스 열·상태 변경 없음). 코드 모듈·테스트 ID 열은 Phase 4·5에서 채운다. **Phase 4 계획(2026-10-19)** — task-wall 태스크 ↔ REQ 연결을 §8에 기록(§1 매트릭스 열·상태 변경 없음). 이 RTM은 프로젝트 전체에서 단 1개이며 Phase 3~7에서 계속 갱신된다.
> **Phase 3 근거 산출물:** [`design-vision-디자인명세.md`](../03.design-order-질서/design-vision-디자인명세.md) · [`screen-vision-화면설계.md`](../03.design-order-질서/screen-vision-화면설계.md) (SCR-001~SCR-009)
> **Phase 2 근거 산출물:** [`architecture-temple-성전설계.md`](../02.architecture-foundation-기초/architecture-temple-성전설계.md) (ARCH-001~ARCH-018), [`api-gate-성문.md`](../02.architecture-foundation-기초/api-gate-성문.md) (API-001~API-031), [`data-ark-법궤.md`](../02.architecture-foundation-기초/data-ark-법궤.md) (TBL-001~TBL-006 원장, TBL-011~TBL-018 콘텐츠 JSON)

---

## 1. 추적 매트릭스

| REQ-ID | 요구사항 요약 | UC-ID | ARCH-ID | API-ID | TBL-ID | 코드 모듈 | 테스트 ID | 상태 |
|:---|:---|:---|:---|:---|:---|:---|:---|:---:|
| REQ-001 | 사용자가 브라우저에서 KJV 성경 기반 실시간 2인 대전 테트리스를 플레이한다 | UC-003, UC-004, UC-007, UC-015, UC-016 | ARCH-001, ARCH-002, ARCH-003, ARCH-008, ARCH-011 | API-006, API-011, API-012, API-013, API-018, API-019, API-020, API-029, API-030 | TBL-002, TBL-003 | ⬜ | ⬜ | 🔄 |
| REQ-002 | 사용자는 게스트 닉네임으로 입장한다 | UC-001 | ARCH-001, ARCH-008, ARCH-009, ARCH-014 | API-001, API-002 | TBL-001, TBL-004 | ⬜ | ⬜ | 🔄 |
| REQ-003 | 사용자는 위인 4명(다윗·솔로몬·베드로·바울) 중 한 명을 고른다 | UC-002, UC-009 | ARCH-001, ARCH-003, ARCH-011, ARCH-016 | API-007, API-014, API-023 | TBL-011, TBL-016, TBL-018 | ⬜ | ⬜ | 🔄 |
| REQ-004 | 사용자는 대전 모드(사람 대 사람, 랜덤 매칭 + 친구 초대 코드)를 고를 수 있다 | UC-002, UC-003, UC-004 | ARCH-001, ARCH-010 | API-005, API-007, API-008, API-009, API-010 | TBL-001 | ⬜ | ⬜ | 🔄 |
| REQ-005 | 사용자는 AI 봇 대전(쉬움·보통·어려움)을 고를 수 있다 | UC-002, UC-005 | ARCH-010, ARCH-011, ARCH-013 | API-007, API-010, API-020 | TBL-002, TBL-003, TBL-018 | ⬜ | ⬜ | 🔄 |
| REQ-006 | 사용자는 연습 모드를 고를 수 있다 | UC-002, UC-006 | ARCH-003, ARCH-011 | API-007, API-019, API-030 | TBL-004, TBL-018 | ⬜ | ⬜ | 🔄 |
| REQ-007 | 줄을 지우면 상대에게 쓰레기 줄과 악한 영(14종)이 공격으로 간다. 서버가 공격을 판정한다 | UC-008 | ARCH-011, ARCH-012, ARCH-015 | API-013, API-021, API-022 | TBL-013, TBL-018 | ⬜ | ⬜ | 🔄 |
| REQ-008 | 사용자는 믿음 게이지로 위인 스킬과 천사 5종을 쓴다 | UC-009, UC-010 | ARCH-003, ARCH-011 | API-014, API-023, API-024, API-025 | TBL-011, TBL-012, TBL-018 | ⬜ | ⬜ | 🔄 |
| REQ-009 | 사용자는 전신갑주 6종을 얻어 쓴다 | UC-011 | ARCH-002, ARCH-003, ARCH-011 | API-013, API-015, API-023, API-024 | TBL-014, TBL-015, TBL-018 | ⬜ | ⬜ | 🔄 |
| REQ-010 | 예수님 "세상을 이기었노라" 이벤트(첨부 A §3.2 원칙 그대로)가 경기당 1회 일어날 수 있다 | UC-012 | ARCH-003, ARCH-005, ARCH-011 | API-012, API-023 | TBL-016, TBL-018 | ⬜ | ⬜ | 🔄 |
| REQ-011 | 말씀 대결(성경 퀴즈, 60문항 이상)이 있다 | UC-013 | ARCH-005, ARCH-011, ARCH-013 | API-016, API-026, API-027 | TBL-003, TBL-016, TBL-017 | ⬜ | ⬜ | 🔄 |
| REQ-012 | 특수 블록 3종(말씀·여리고 나팔·만나)이 있다 | UC-014 | ARCH-002, ARCH-011 | API-013, API-019, API-023 | TBL-004, TBL-018 | ⬜ | ⬜ | 🔄 |
| REQ-013 | 디자인·액션·사운드·재미 요구사항(첨부 A §5 전체)은 필수다. 첨부 B의 체크리스트를 충족해야 한다 | UC-007, UC-008, UC-015, UC-017, UC-020 | ARCH-004, ARCH-005, ARCH-006, ARCH-007 | API-017, API-021, API-023, API-028, API-030 | TBL-003, TBL-004, TBL-005, TBL-016, TBL-018 | ⬜ | ⬜ | 🔄 |
| REQ-014 | 경기 결과(전적)가 저장되고 조회된다 | UC-015, UC-016, UC-018 | ARCH-001, ARCH-011, ARCH-014 | API-003, API-030 | TBL-002, TBL-003 | ⬜ | ⬜ | 🔄 |
| REQ-015 | 랭킹(Elo)이 저장되고 조회된다 | UC-015, UC-019 | ARCH-001, ARCH-010, ARCH-014 | API-004, API-030 | TBL-001, TBL-003, TBL-006 | ⬜ | ⬜ | 🔄 |
| REQ-016 | 외부 서비스 키 없이 `npm install && npm run dev` 한 번으로 전부 동작해야 한다. Supabase는 환경변수가 있을 때만 쓰는 어댑터로 둔다 | UC-021 | ARCH-014, ARCH-016, ARCH-017 | API-001~API-006 (Vite 프록시 경유) | TBL-001~TBL-006 (SQLite 기본 / Supabase 선택) | ⬜ | ⬜ | 🔄 |
| REQ-017 | 테스트: Vitest(단위) + Playwright(브라우저 2개 E2E) | UC-022 | ARCH-018 | API-005, API-006, API-013, API-021 (E2E 경로) | TBL-011~TBL-018 (콘텐츠 검사) | ⬜ | ⬜ | 🔄 |
| FR-001 | 보드·테트로미노·7-bag | UC-007 | ARCH-002 | API-019 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-002 | SRS 회전 | UC-007 | ARCH-002 | N/A (클라이언트 전용) — 엔진 SRS 상수 | N/A (영속 데이터 없음) | ⬜ | ⬜ | 🔄 |
| FR-003 | 이동·드롭·홀드·고스트 | UC-007 | ARCH-002, ARCH-007 | N/A (클라이언트 전용) | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-004 | 줄 삭제·판정·점수 | UC-007 | ARCH-002 | API-013 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-005 | 같은 시드 시작 | UC-003, UC-004 | ARCH-002, ARCH-011 | API-011, API-019 | N/A (GameRoom 휘발 상태) | ⬜ | ⬜ | 🔄 |
| FR-006 | 상대 보드 실시간 표시 | UC-007 | ARCH-003, ARCH-004, ARCH-011 | API-012, API-020 | N/A (GameRoom 휘발 상태) | ⬜ | ⬜ | 🔄 |
| FR-007 | 승리 조건 | UC-015 | ARCH-005, ARCH-011 | API-018, API-029, API-030 | TBL-002, TBL-003, TBL-016 | ⬜ | ⬜ | 🔄 |
| FR-008 | 실시간 통신 프로토콜 | UC-003, UC-004 | ARCH-008, ARCH-009, ARCH-010, ARCH-011 | API-005~API-031 | N/A (전송 계층) | ⬜ | ⬜ | 🔄 |
| FR-009 | 상대 이탈 처리 | UC-016 | ARCH-011, ARCH-014 | API-030 | TBL-002, TBL-003 | ⬜ | ⬜ | 🔄 |
| FR-010 | 난이도 곡선 | UC-007 | ARCH-002 | API-019 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-011 | 조작 입력 | UC-007 | ARCH-007 | N/A (클라이언트 전용) | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-012 | 게스트 닉네임 입장 | UC-001 | ARCH-001, ARCH-008, ARCH-009, ARCH-014 | API-001, API-002 | TBL-001, TBL-004 | ⬜ | ⬜ | 🔄 |
| FR-013 | 캐릭터 선택 화면 | UC-002 | ARCH-001, ARCH-016 | API-007 | TBL-011, TBL-016 | ⬜ | ⬜ | 🔄 |
| FR-014 | 다윗 — 물맷돌 | UC-009 | ARCH-003, ARCH-011 | API-014, API-023 | TBL-011, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-015 | 솔로몬 — 지혜로운 마음 | UC-009 | ARCH-002, ARCH-003, ARCH-011 | API-014, API-019, API-023 | TBL-011, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-016 | 베드로 — 이 반석 위에 | UC-009 | ARCH-003, ARCH-011 | API-014, API-022, API-023 | TBL-011, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-017 | 바울 — 옥문이 열리다 | UC-009 | ARCH-003, ARCH-011 | API-014, API-023 | TBL-011, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-018 | 랜덤 매칭 | UC-003 | ARCH-010 | API-007, API-009, API-010 | TBL-001 | ⬜ | ⬜ | 🔄 |
| FR-019 | 친구 초대 코드 | UC-004 | ARCH-010 | API-007, API-009, API-010, API-031 | N/A (소켓 첨부 휘발 상태) | ⬜ | ⬜ | 🔄 |
| FR-020 | 대기 취소·대기열 정리 | UC-003 | ARCH-010 | API-008 | N/A (소켓 첨부 휘발 상태) | ⬜ | ⬜ | 🔄 |
| FR-021 | AI 봇 대전 | UC-005 | ARCH-010, ARCH-011, ARCH-013 | API-007, API-010, API-020 | TBL-002, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-022 | 봇의 말씀 대결 응답 | UC-005, UC-013 | ARCH-011, ARCH-013 | API-026, API-027 | TBL-017, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-023 | 연습 모드 | UC-006 | ARCH-003, ARCH-011 | API-007, API-018, API-019, API-030 | TBL-004, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-024 | 공격력 계산 | UC-008 | ARCH-012 | API-013, API-021 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-025 | 쓰레기 줄 삽입·상쇄 | UC-008 | ARCH-003, ARCH-011 | API-021, API-022, API-024 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-026 | 악한 영 소환 결정 | UC-008 | ARCH-012 | API-021 | TBL-013, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-027 | 악한 영 1~2등급 효과 | UC-008 | ARCH-003, ARCH-005, ARCH-011 | API-021 | TBL-013 | ⬜ | ⬜ | 🔄 |
| FR-028 | 악한 영 3등급 효과 | UC-008 | ARCH-003, ARCH-005, ARCH-011 | API-021 | TBL-013 | ⬜ | ⬜ | 🔄 |
| FR-029 | 악한 영 4등급 효과 | UC-008 | ARCH-003, ARCH-005, ARCH-011 | API-021, API-022 | TBL-013 | ⬜ | ⬜ | 🔄 |
| FR-030 | 악한 영 5등급·보스 효과 | UC-008 | ARCH-003, ARCH-005, ARCH-011 | API-021 | TBL-013 | ⬜ | ⬜ | 🔄 |
| FR-031 | 방해 상한 규칙 | UC-008 | ARCH-011 | API-021, API-024 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-032 | 서버 진행 검증 | UC-007, UC-008 | ARCH-011, ARCH-015 | API-013, API-025 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-033 | 믿음 게이지 | UC-009 | ARCH-011 | API-024 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-034 | 위인 스킬 발동 | UC-009 | ARCH-011 | API-014, API-023, API-025 | TBL-011, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-035 | 천사 5종 소환 | UC-010 | ARCH-002, ARCH-003, ARCH-011 | API-014, API-023, API-025 | TBL-012, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-036 | 갑주 출현·획득 | UC-011 | ARCH-002, ARCH-011 | API-013, API-023, API-024 | TBL-014, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-037 | 갑주 6종 사용 | UC-011 | ARCH-003, ARCH-011 | API-015, API-023 | TBL-014, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-038 | 상성표 | UC-011 | ARCH-016 | N/A (콘텐츠 정적 데이터) | TBL-015 | ⬜ | ⬜ | 🔄 |
| FR-039 | "세상을 이기었노라" 이벤트 | UC-012 | ARCH-003, ARCH-005, ARCH-011 | API-012, API-023 | TBL-016, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-040 | 말씀 대결 발생 | UC-013 | ARCH-011 | API-013, API-026 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-041 | 진행·판정·보상 | UC-013 | ARCH-005, ARCH-011 | API-016, API-024, API-026, API-027 | TBL-003, TBL-016, TBL-017 | ⬜ | ⬜ | 🔄 |
| FR-042 | 니어미스 연출 | UC-013 | ARCH-005, ARCH-011 | API-027 | N/A (판정 시점 계산값) | ⬜ | ⬜ | 🔄 |
| FR-043 | 퀴즈 콘텐츠 | UC-013 | ARCH-016 | API-026 | TBL-016, TBL-017 | ⬜ | ⬜ | 🔄 |
| FR-044 | 말씀 블록 | UC-014 | ARCH-002, ARCH-011 | API-013, API-019 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-045 | 여리고 나팔 블록 | UC-014 | ARCH-002, ARCH-011 | API-013, API-023 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-046 | 만나 블록 | UC-014 | ARCH-002, ARCH-011 | API-012, API-013, API-023 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-047 | 단계적 해금 | UC-014 | ARCH-011, ARCH-014 | API-019 | TBL-004, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-048 | 아트 방향 | UC-007 | ARCH-004 | N/A (클라이언트 전용) — 렌더링 | N/A (영속 데이터 없음) | ⬜ | ⬜ | 🔄 |
| FR-049 | 존재 시각 표현 | UC-008, UC-010 | ARCH-004, ARCH-005 | API-021, API-023 | TBL-012, TBL-013 | ⬜ | ⬜ | 🔄 |
| FR-050 | 폰트 번들 | UC-007 | ARCH-001, ARCH-017 | N/A (클라이언트 전용) — 폰트 번들 | N/A (영속 데이터 없음) | ⬜ | ⬜ | 🔄 |
| FR-051 | 조작 연출 | UC-007 | ARCH-004, ARCH-005 | N/A (클라이언트 전용) — 조작 연출 | N/A (영속 데이터 없음) | ⬜ | ⬜ | 🔄 |
| FR-052 | 삭제 연출 | UC-007 | ARCH-004, ARCH-005 | N/A (클라이언트 전용) — 삭제 연출 | N/A (영속 데이터 없음) | ⬜ | ⬜ | 🔄 |
| FR-053 | 공격 연출 | UC-008 | ARCH-004, ARCH-005 | API-021, API-022 | N/A (연출) | ⬜ | ⬜ | 🔄 |
| FR-054 | 영·천사·스킬 등장 연출 | UC-008, UC-010 | ARCH-005, ARCH-006 | API-021, API-023 | TBL-016 | ⬜ | ⬜ | 🔄 |
| FR-055 | 위기 연출·위험선 | UC-007, UC-012 | ARCH-002, ARCH-004, ARCH-006, ARCH-011 | API-012 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-056 | 승리·패배 연출 | UC-015 | ARCH-005 | API-029, API-030 | TBL-016 | ⬜ | ⬜ | 🔄 |
| FR-057 | 연출 세기 옵션 | UC-020 | ARCH-001, ARCH-005 | N/A (클라이언트 전용) — 세션 옵션 | N/A (세션 메모리 — N-04 미승격) | ⬜ | ⬜ | 🔄 |
| FR-058 | 효과음 | UC-007, UC-020 | ARCH-006 | N/A (클라이언트 전용) — Tone.js 합성 | N/A (영속 데이터 없음) | ⬜ | ⬜ | 🔄 |
| FR-059 | 배경음악 | UC-007, UC-020 | ARCH-006 | N/A (클라이언트 전용) — Tone.js 합성 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-060 | 음량 조절 | UC-020 | ARCH-001, ARCH-006 | N/A (클라이언트 전용) — 세션 옵션 | N/A (세션 메모리 — N-04 미승격) | ⬜ | ⬜ | 🔄 |
| FR-061 | 타격 피드백 동기화 | UC-007 | ARCH-004, ARCH-005, ARCH-006 | N/A (클라이언트 전용) — 연출 동기화 | N/A (영속 데이터 없음) | ⬜ | ⬜ | 🔄 |
| FR-062 | 실력 보정 "은혜(Grace)" | UC-008, UC-015 | ARCH-005, ARCH-011, ARCH-014 | API-019, API-023, API-024 | TBL-004, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-063 | 말씀 카드 | UC-015 | ARCH-005 | API-030 | TBL-002, TBL-016 | ⬜ | ⬜ | 🔄 |
| FR-064 | 감정 표현 리액션 | UC-017 | ARCH-005, ARCH-011 | API-017, API-028 | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-065 | 업적 | UC-015 | ARCH-011, ARCH-014 | API-030 | TBL-005, TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-066 | 개인 기록·성장 수치 | UC-015 | ARCH-005, ARCH-014 | API-030 | TBL-003, TBL-004 | ⬜ | ⬜ | 🔄 |
| FR-067 | 플레이어 진행 기록 | UC-014, UC-015 | ARCH-014 | API-030 | TBL-004, TBL-005 | ⬜ | ⬜ | 🔄 |
| FR-068 | 경기 결과 저장 | UC-015 | ARCH-011, ARCH-014 | API-030 | TBL-002, TBL-003 | ⬜ | ⬜ | 🔄 |
| FR-069 | 전적 조회 | UC-018 | ARCH-001, ARCH-009, ARCH-014 | API-003 | TBL-001, TBL-002, TBL-003 | ⬜ | ⬜ | 🔄 |
| FR-070 | Elo 레이팅 갱신 | UC-015, UC-019 | ARCH-014 | API-030 | TBL-001, TBL-003 | ⬜ | ⬜ | 🔄 |
| FR-071 | 랭킹 조회 | UC-019 | ARCH-001, ARCH-009, ARCH-014 | API-004 | TBL-001, TBL-006 | ⬜ | ⬜ | 🔄 |
| FR-072 | 저장소 어댑터 자동 전환 | UC-021 | ARCH-014 | API-001~API-004 (어댑터 경유) | TBL-001~TBL-006 | ⬜ | ⬜ | 🔄 |
| FR-073 | 단일 명령 로컬 실행 | UC-021 | ARCH-017 | API-005, API-006 (Vite 프록시 ws) | N/A (실행 구성) | ⬜ | ⬜ | 🔄 |
| FR-074 | 공용 게임 콘텐츠 | UC-021 | ARCH-016 | N/A (빌드 시 번들 — 런타임 조회 없음) | TBL-011~TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-075 | 단위 테스트 (Vitest) | UC-022 | ARCH-018 | N/A (단위 테스트 — 순수 모듈) | TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-076 | 콘텐츠 검사 스크립트 | UC-022 | ARCH-016, ARCH-018 | N/A (콘텐츠 검사 스크립트) | TBL-011~TBL-018 | ⬜ | ⬜ | 🔄 |
| FR-077 | E2E 테스트 (Playwright) | UC-022 | ARCH-018 | API-013, API-014, API-015, API-021 | N/A (E2E 실행) | ⬜ | ⬜ | 🔄 |
| FR-078 | 화면 흐름 | UC-001, UC-002 | ARCH-001 | API-001, API-002, API-007 | N/A (화면 흐름) | ⬜ | ⬜ | 🔄 |
| NFR-001 | 렌더링 60fps (중급 모바일), 파티클 오브젝트 풀링 | UC-007 | ARCH-004 | N/A (클라이언트 전용) — 렌더링 성능 | N/A (영속 데이터 없음) | ⬜ | ⬜ | 🔄 |
| NFR-002 | 공격 반영 지연 100ms 이하 | UC-008 | ARCH-011, ARCH-012 | API-013, API-021 | N/A (지연 측정) | ⬜ | ⬜ | 🔄 |
| NFR-003 | 서버 메시지 스키마·게스트 토큰·닉네임·빈도 검증 | UC-001, UC-008 | ARCH-009, ARCH-015 | API-001~API-031 | TBL-001 | ⬜ | ⬜ | 🔄 |
| NFR-004 | Supabase service role 키 클라이언트 비노출 | UC-021 | ARCH-014, ARCH-017 | N/A (서버 환경변수 — 응답에 미포함) | TBL-001~TBL-005 (Supabase RLS) | ⬜ | ⬜ | 🔄 |
| NFR-005 | 외부 네트워크 리소스 없이 로컬 번들 자산으로 동작 | UC-021 | ARCH-004, ARCH-006, ARCH-016, ARCH-017 | N/A (클라이언트 전용) — 번들 자산 | TBL-011~TBL-018 | ⬜ | ⬜ | 🔄 |
| NFR-006 | 첨부 B 체크리스트 8항목 충족 매핑 | UC-007, UC-008, UC-013, UC-015 | ARCH-005, ARCH-011 | API-021, API-026 | TBL-018 | ⬜ | ⬜ | 🔄 |
| NFR-007 | 라이브러리 최신 안정판 lockfile 고정, 2주 미만 버전 회피 | UC-021 | ARCH-017 | N/A (의존성 고정) | N/A (lockfile) | ⬜ | ⬜ | 🔄 |
| NFR-008 | 수집 정보 최소화 (닉네임·게스트 ID·토큰·경기 기록) | UC-001 | ARCH-014 | API-001 | TBL-001 | ⬜ | ⬜ | 🔄 |
| C-001 | 현금 결제·가챠 영구 금지 | UC-014 | ARCH-011 | N/A (상점·결제 API 없음) | TBL-018 | ⬜ | ⬜ | 🔄 |
| C-002 | 예수님 표현 원칙 (선택 불가, 빛·실루엣, 경기당 1회 이벤트) | UC-012 | ARCH-005, ARCH-011 | API-023 | TBL-016 | ⬜ | ⬜ | 🔄 |
| C-003 | KJV 1769 원문, 한국어 직접 번역, 출처 장·절 표기 | UC-013, UC-015 | ARCH-016 | API-026, API-027 | TBL-016, TBL-017 | ⬜ | ⬜ | 🔄 |
| C-004 | 외부 서비스 키 0개로 동작 | UC-021 | ARCH-014, ARCH-017 | API-001~API-006 | TBL-001~TBL-006 | ⬜ | ⬜ | 🔄 |
| C-005 | 기술 스택 고정 (Vite·PixiJS v8·Workers+DO·DO SQLite·Vitest·Playwright 등) | UC-021 | ARCH-001~ARCH-018 | N/A (기술 스택 제약) | N/A (기술 스택 제약) | ⬜ | ⬜ | 🔄 |
| C-006 | Socket.IO·Express 미사용 | UC-003 | ARCH-008, ARCH-009 | API-005, API-006 | N/A (전송 계층) | ⬜ | ⬜ | 🔄 |
| C-007 | 녹음 음원·일러스트 미사용 (코드 합성·코드 그래픽) | UC-007, UC-020 | ARCH-004, ARCH-006 | N/A (클라이언트 전용) — 코드 합성·코드 그래픽 | TBL-011 (emblem 키) | ⬜ | ⬜ | 🔄 |
| C-008 | 이번 실행 제외 범위 구현 금지 | UC-002 | ARCH-001, ARCH-016 | API-007 (heroId 4명 검증) | TBL-011 | ⬜ | ⬜ | 🔄 |
| C-009 | 채팅 없음 (리액션만) | UC-017 | ARCH-011 | API-017, API-028 | TBL-018 | ⬜ | ⬜ | 🔄 |
| C-010 | KJV 근거 없는 존재 미등장, 모든 캐릭터 근거 구절 표시 | UC-002, UC-008 | ARCH-016 | N/A (콘텐츠 정적 데이터) | TBL-011, TBL-012, TBL-013 | ⬜ | ⬜ | 🔄 |
| C-011 | 고어·선정 표현 금지 (전 연령) | UC-008 | ARCH-004, ARCH-005 | N/A (클라이언트 전용) — 연출 표현 | N/A (영속 데이터 없음) | ⬜ | ⬜ | 🔄 |
| C-012 | 소스는 fruit-열매/ 아래 첨부 A §4.5 구조 | UC-021 | ARCH-017 | N/A (폴더 구조 제약) | N/A (폴더 구조 제약) | ⬜ | ⬜ | 🔄 |
| C-013 | backup/ 폴더 git 미커밋·비공개 | UC-021 | ARCH-017 | N/A (.gitignore 정책) | N/A (.gitignore 정책) | ⬜ | ⬜ | 🔄 |

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
| 상위 요구사항 | REQ-001 ~ REQ-017 (17건) | Phase 2 완료 — UC·ARCH·API·TBL 연결됨(🔄). Phase 3 화면 연결 확인 완료(§7). 코드 모듈·테스트 ID 미연결 | Phase 4 (코드), Phase 5 (테스트) |
| 기능 요구사항 | FR-001 ~ FR-078 (78건) | 같은 사유 | Phase 4 → 5 |
| 비기능 요구사항 | NFR-001 ~ NFR-008 (8건) | 같은 사유 | Phase 4 (구현), Phase 5 (측정 테스트) |
| 제약 조건 | C-001 ~ C-013 (13건) | 같은 사유 | Phase 4 (준수 구현), Phase 6 (감사) |

> ⬜(미추적) 0건 — 116건 전부 🔄(부분 추적).
> 의도적 제외(❌) 0건. 이번 실행 제외 범위(스토리 모드, 위인 11명, 열두 제자 카드, 구글·카카오 로그인, 실제 배포, 녹음 음원·일러스트)는 REQ로 등록하지 않았으며, "구현하지 않는다"는 사실 자체를 제약 조건 C-007·C-008로 추적한다.
> UX 확장 코너의 NICE-TO-HAVE(N-01~N-06)는 요구사항이 아니므로 이 매트릭스에 등재하지 않는다 (자동 모드 — 승격 금지). 승인되어 REQ로 승격되면 그때 새 REQ-ID로 등재한다.

---

## 5. 설계 변경 이력 (Design Change Log — 두 번째 돌판 규칙)

> 정경화(2026-10-19, Phase 1) 이후 상류 설계 변경: **0건** (Phase 3도 Phase 1·2 산출물의 본문을 바꾸지 않았다 — §7 화면 연결 확인은 순방향 기록이다. Phase 2는 Phase 1 산출물의 본문을 바꾸지 않았다 — 이 RTM의 ARCH/API/TBL 열 채움과 상태 갱신은 "언약추적 갱신 규칙"의 순방향 갱신이며 재각(역방향 개정)이 아니다). 첫 변경이 발생하면 템플릿 "재각 규칙 1" 형식(변경일 · 발견 Phase/지역 · 대상 ID · 변경 사유 · 영향받는 하류 산출물 · 재검증 필요 여부 · 상태)의 표를 이 절에 추가하고, 두 증인 확정(재각 규칙 3)을 통과한 변경만 기록한다.

> **2026-10-19 갱신:** Phase 4 / acts-행전 00.jerusalem-예루살렘 배치에서 첫 변경 1건이 발생했다(아래 DCL-001). 위 "0건" 문장은 정경화 시점 기록으로 보존한다. **W-00 갱신(2026-10-19):** DCL-001 승인, DCL-002(TBL-018 rateLimit 수치 3개 — api-gate §2와 정합) 추가 → 이 배치의 변경 2건. **D-01 갱신(2026-10-19, 01.judaea-유대):** DCL-003(TBL-018 gravity.accelAfterMs·ledger 수치 6개 — 다른 정경 문서 원문 값 그대로) 추가, W-01 확정 대기. **W-01 갱신(2026-10-19):** DCL-003 승인, DCL-004(착지 평가 위치 = ARCH-002 `engine/placement.js` + TBL-018 `placement.weights` — 솔로몬·가브리엘 힌트 계산 위치 설계 틈 해소) 추가 → 01 배치 변경 2건.

| # | 변경일 | 발견 Phase/지역 | 대상 ID(REQ/ARCH/API/TBL) | 변경 사유 | 영향받는 하류 산출물 | 재검증 필요 여부 | 상태 |
|:---|:---|:---|:---|:---|:---|:---:|:---:|
| DCL-001 | 2026-10-19 | Phase 4 / acts-행전 00.jerusalem-예루살렘 배치 (task-wall A-03) | TBL-001~TBL-006 (data-ark §7 마이그레이션 전략, §6.1 부록 추가), ARCH-014, FR-072 | data-ark §7의 단계 판정 수단 `PRAGMA user_version`이 Durable Object SQL API에서 거부됨 — 실측(wrangler 4.147.0 / workerd 1.20261001.1 `wrangler dev`, SQLite-backed DO): `PRAGMA user_version` 읽기·`= 1` 쓰기 모두 `not authorized: SQLITE_AUTH`. 같은 실측에서 `PRAGMA foreign_keys` = 1, FK 위반 INSERT 거부, `transactionSync` 롤백, `COLLATE NOCASE`·`RANK() OVER`·`strftime('%f')` 정상. 대안: 단일 행 표 `schema_meta(id=1, version)`로 단계 번호 기록 (task-wall A-03이 미리 정한 대안 그대로). 발견 근거 2곳: ① 실측 오류 메시지(fruit-열매/history 2026-10-19) ② task-wall A-03 사전 예측(DO SQL PRAGMA 허용 목록) | data-ark-법궤 §7·§6.1 부록, `worker/src/storage/migrations.ts`(TASK-002), `worker/test/ledger-fk.test.ts`(TASK-003), 서신 `acts-행전/TASK-000/00.jerusalem-예루살렘/epistle-서신.md` §7 발췌(재생성 필요 — 이 배치 Doer는 acts-행전 쓰기 권한 없음) | ✅ | ✅ 2026-10-19 W-00 승인 — 두 증인 확정(재각 규칙 3): ① D-00 실측 ② W-00 독립 재실측(별도 탐침 Worker, 같은 wrangler 4.147.0 `wrangler dev`): `PRAGMA user_version` 읽기·쓰기 모두 `not authorized: SQLITE_AUTH` 재현, 실제 `migrations.ts`가 workerd에서 단계 1 적용·재실행 멱등(version 1 유지)·`PRAGMA foreign_keys` = 1. §6.1 부록 DDL = migrations.ts 문자열(공백 정규화 대조 12/12 + schema_meta 일치). `ledger-fk.test.ts` 마이그레이션 3건 통과. 서신 4통 재생성 완료(W-00) |
| DCL-002 | 2026-10-19 | Phase 4 / acts-행전 00.jerusalem-예루살렘 배치 (TASK-008 rules.json, W-00 대조) | TBL-018 `rateLimit` (data-ark §3 TBL-018 표), API-001, API-005~API-017 공통 규약(api-gate §2 "메시지 크기"·"속도 제한"), NFR-003 | api-gate §2 공통 규약이 수치 3개 — 전체 한도 3초 연속 초과 시 종료, REST 게스트 생성 접속 주소별 분당 5회, REST 본문 최대 1,024바이트 — 를 정의하지만 "모든 수치의 단일 원천"인 data-ark TBL-018 `rateLimit` 행에는 없어 rules.json에 넣을 근거가 없었다(코드가 api-gate 문장을 하드코딩하게 되는 설계 틈). 개정: TBL-018 `rateLimit` 행에 `totalViolationMs` 3000 · `guestCreate` 5/60초 · `maxRestBodyBytes` 1024 추가(기존 문장 취소선 보존), 버킷 형식 `{tokens, perMs}` 명시. 수치 값은 api-gate 원문 그대로 — 새 수치 발명 0. 발견 근거 2곳: ① D-00 보고(rules.json 작성 시 표에 없는 수치 발견) ② W-00 원문 대조(api-gate §2 65~66행 ↔ data-ark TBL-018 rateLimit 행) | data-ark-법궤 TBL-018 표, `content/rules.json`(TASK-008), `content/check-content.mjs`(TASK-009 — rateLimit 하위 키 11개 검사), 서신 00·02 (TBL-018 rateLimit 행 발췌 — 재생성), 02 사마리아 rate-limit 구현(TASK-030~TASK-034 — 이 키를 읽어야 함) | ✅ | ✅ 2026-10-19 W-00 개정·구현·검사 통과 (`npm run check:content` 통과, 키 제거 음성 검사 exit 1) |
| DCL-003 | 2026-10-19 | Phase 4 / acts-행전 01.judaea-유대 배치 (D-01 — TASK-010-3 gravity.js, TASK-020-1·020-2 원장 서비스) | TBL-018 `gravity`·`ledger`(신규 키) (data-ark §3 TBL-018 표), FR-010, FR-012, FR-069, FR-071, ARCH-002, ARCH-014 | TBL-018은 "모든 수치의 단일 원천"(머리말)인데 01 지역 구현에 필요한 수치 6개가 다른 정경 문서에만 있다: ① FR-010 가속 시작 120,000ms — 키 이름 `gravity.at120sMs`에만 숨어 있음 ② 토큰 검증 LRU 1,000건(architecture §4·data-ark §5) ③ 랭킹 캐시 5초 TTL(data-ark §5) ④ 랭킹 상위 100명(FR-071) ⑤⑥ 전적 페이지 기본 20·최대 50(api-gate §2). 코드에 하드코딩하지 않도록 TBL-018에 `gravity.accelAfterMs` 120000, `ledger.{tokenCacheSize 1000, leaderboardCacheMs 5000, leaderboardTop 100, historyPageDefault 20, historyPageMax 50}` 추가. 수치 값은 원문 그대로 — 새 수치 발명 0 (DCL-002와 같은 유형). 발견 근거 2곳: ① D-01 구현 중 rules.json 키 부재 ② 원문 대조(architecture §4 캐시 전략 행, data-ark §5 인덱스 전략 표, api-gate §2 페이징 행, spec-tablet FR-010·FR-071) | data-ark-법궤 TBL-018 표, `content/rules.json`(TASK-008 — 키 추가), `content/check-content.mjs`(TASK-009 — RULE_KEYS 6개 추가), `client/js/engine/gravity.js`(TASK-010-3), `worker/src/services/guest-service.ts`·`ranking-service.ts`·`history-service.ts`(TASK-020-1·020-2), 서신 01·02·03 (TBL-018 발췌 — 재생성 필요: 이 배치 Doer는 acts-행전 쓰기 권한 없음), 02 사마리아 routes/matches.ts(limit 파싱 — 이 키를 읽어야 함) | ✅ | ✅ 2026-10-19 W-01 승인 — 두 증인 확정(재각 규칙 3): ① D-01 구현 중 발견 ② W-01 독립 원문 대조 6/6 일치 — architecture §4 캐시 전략 행(LRU 1,000건·랭킹 상위 100 5초 TTL), data-ark §5 인덱스 표(LRU 1,000·5초 TTL), api-gate §2 페이징 행·API-003 limit(기본 20, 1~50), spec-tablet FR-071(상위 100명), `gravity.at120sMs` 키 이름(120초) — 새 수치 0, 기존 키 값 불변. rules.json 값 = data-ark 표 값, `check:content` RULE_KEYS 6개 검사 통과, 코드(gravity.js·guest/ranking/history-service)가 하드코딩 없이 이 키를 읽음. 서신 01·02·03 재생성 완료(W-01) |
| DCL-004 | 2026-10-19 | Phase 4 / acts-행전 01.judaea-유대 배치 (W-01 대조 — D-01 인계 메모 ② 미해결 설계 틈) | ARCH-002, ARCH-013, FR-015, FR-021, FR-035, TBL-018 `placement`(신규 키) (data-ark §3 TBL-018 표, architecture §1 ARCH 표·§5.2 트리) | FR-015(솔로몬 "최적 착지 위치 힌트 10초")·FR-035(가브리엘 "착지 힌트")의 **최적 착지 계산 위치가 정경에 없다** — screen-vision SCR-005 MyBoard 행은 데이터 원천을 "로컬 엔진"이라 하지만 ARCH-002 책임 목록에 착지 평가가 없고, 평가 로직은 서버 `worker/src/bot/placement.ts`(ARCH-013)에만 있었다(클라이언트 → worker import는 계층 위반, 클라이언트 재구현은 D-12 "엔진 이중 구현 금지" 위반). 또 평가 가중치 4개가 코드 상수였다(TBL-018 "모든 수치의 단일 원천" 위반 — 힌트가 플레이어에게 보이는 규칙이 되므로 알고리즘 내부 상수로 볼 수 없음). 개정: ① 착지 후보 열거·보드 평가·최적 착지 선택을 ARCH-002 순수 엔진 `client/js/engine/placement.js`로 둔다(클라이언트 힌트·서버 봇 공용 — D-12·D-02와 정합, 공용 패키지 폴더 신설 없음) ② ARCH-013은 그 점수에 난이도 노이즈·실수율만 더한다 ③ TBL-018에 `placement.weights` 추가(값 = D-01 구현 상수 그대로 — 새 수치 발명 0). SRS 벽차기 표는 이 변경 대상이 아니다: FR-002 "SRS … 벽차기 테이블"이 표준 표 자체를 요구하고 task-wall §3.2 #4가 `srs.js`를 그 표의 위치로 지정한다(규칙 수치가 아닌 표준 알고리즘 표). 발견 근거 2곳: ① D-01 인계 메모(fruit-열매/history 2026-10-19 16:47:27 ②) ② W-01 정경 대조(screen-vision SCR-005 "고스트·힌트 ← 로컬 엔진" ↔ architecture ARCH-002 책임 목록 ↔ devguide §3.5-5 "수치는 rules.json에서만") | architecture-temple ARCH-002·ARCH-013 행·§5.2 트리, data-ark-법궤 TBL-018 표, 이 RTM §1 FR-015·FR-035 ARCH 열·§8 FR-015·FR-035·REQ-003·REQ-008 행, task-wall §2.2 TASK-019 행·§3.2·§7, devguide §2.1 트리, `content/rules.json`(TASK-008 — 키 추가), `content/check-content.mjs`(TASK-009 — RULE_KEYS +1), `client/js/engine/placement.js`(TASK-019 신규)·`index.js`(re-export 1줄)·`worker/src/bot/placement.ts`·`bot-player.ts`(TASK-019), `client/test/engine-purity.test.js`(엔진 파일 목록), 서신 01·03(재생성), 03-A board-view 힌트 그리기·03-C 컨트롤러(TASK-041·TASK-065 — `engine.placement.bestPlacement(board, type, rules.placement.weights)`를 읽어야 함) | ✅ | ✅ 2026-10-19 W-01 개정·구현 (Spec-First: 이 행 → 정경 4종 → 코드 순). 두 증인: D-01 발견(미해결 보고) + W-01 판정·구현. `npm test` 통과·`check:content` 통과·worker tsc 0 오류, 봇 착지 결과 이전과 동일(같은 가중치·같은 열거) |

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
