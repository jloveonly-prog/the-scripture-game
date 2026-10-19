# 🚪 API 명세서 (API Gate) — 영적 전쟁 테트리스

> *"And he measured the gate ... and the threshold of the gate."* — Ezekiel 40:6 (KJV)
>
> **규격:** `statute-율법/02.architecture-foundation-기초/api-gate-성문-template.md`
> **참조 예시:** `parable-비유/02.architecture-foundation-기초/api-gate-성문-example.md`
> **근거 산출물:** [`spec-tablet-명세서.md`](../01.requirement-hearing-들음/spec-tablet-명세서.md) (FR-008 프로토콜, A §4.3) · [`usecase-path-사용사례.md`](../01.requirement-hearing-들음/usecase-path-사용사례.md) · [`architecture-temple-성전설계.md`](./architecture-temple-성전설계.md) (D-01·D-02·D-08·D-30·D-31) · [`data-ark-법궤.md`](./data-ark-법궤.md)

---

## 1. API 전체 목록

> FR-008이 정한 기본 메시지(클라이언트→서버 `join`·`ready`·`state`·`clear`·`skill`·`topout`, 서버→클라이언트 `matched`·`start`·`opponentState`·`attack`·`effect`·`roundEnd`·`matchEnd`)는 이름·필드를 그대로 쓴다. 그 밖의 메시지는 각 행의 "연결 REQ" 열에 적힌 FR/UC를 실현하는 데 필요한 전달 수단으로만 추가했다 (새 기능 0건 — G-005).

### 1.1 HTTP 엔드포인트

| API-ID | Method | Endpoint | 설명 | 연결 REQ | 인증 |
|:---|:---|:---|:---|:---|:---:|
| API-001 | POST | `/api/guest` | 게스트 닉네임 입장 — 프로필 생성·토큰 발급 | REQ-002, FR-012, NFR-003, NFR-008 | ❌ |
| API-002 | GET | `/api/guest/me` | 저장된 토큰 검증·프로필 복원 (재방문) | REQ-002, FR-012 | ✅ |
| API-003 | GET | `/api/matches` | 내 전적 최신순 조회 | REQ-014, FR-069 | ✅ |
| API-004 | GET | `/api/rankings` | 레이팅 상위 100 + 내 순위 | REQ-015, FR-071 | ⬜ 선택 (있으면 내 순위 포함) |

### 1.2 WebSocket 엔드포인트 (HTTP Upgrade)

| API-ID | Method | Endpoint | 설명 | 연결 REQ | 인증 |
|:---|:---|:---|:---|:---|:---:|
| API-005 | GET (Upgrade) | `/ws/matchmaker` | Matchmaker DO 연결 — 랜덤 매칭·초대 코드·봇·연습 방 배정 | REQ-004~006, FR-018~021, FR-023, C-006 | ✅ (첫 메시지 `join`/`createRoom`의 token) |
| API-006 | GET (Upgrade) | `/ws/room/:roomId` | GameRoom DO 연결 — 대전·연습 진행 | REQ-001, FR-008, C-006 | ✅ (첫 메시지 `join`의 token + 명단) |

### 1.3 WebSocket 메시지 — Matchmaker (`/ws/matchmaker`)

| API-ID | 방향 | 메시지 `type` | 설명 | 연결 REQ | 인증 |
|:---|:---|:---|:---|:---|:---:|
| API-101 | C→S | `join` | 랜덤 대기열 등록 / 초대 코드로 입장 / 봇 대전 / 연습 요청 | FR-008, FR-018, FR-019, FR-021, FR-023 | ✅ |
| API-102 | C→S | `createRoom` | 친구 초대 방 만들기 (코드 발급 요청) | FR-019, UC-004 | ✅ |
| API-103 | C→S | `cancel` | 매칭 대기 취소 / 초대 방 닫기 | FR-020, UC-004 2a | ✅ (연결 세션) |
| API-151 | S→C | `queued` | 대기열 등록 확인 ("상대를 찾는 중") | FR-018, UC-003 | — |
| API-152 | S→C | `roomCreated` | 초대 코드 발급 결과 | FR-019 | — |
| API-153 | S→C | `matched` | 짝 성사 — 방 ID·상대 정보 | FR-008, FR-018, FR-019, FR-021 | — |
| API-154 | S→C | `cancelled` | 대기·초대 방 종료 통지 (사용자 취소·만료) | FR-020, UC-004 | — |

### 1.4 WebSocket 메시지 — GameRoom (`/ws/room/:roomId`)

| API-ID | 방향 | 메시지 `type` | 설명 | 연결 REQ | 인증 |
|:---|:---|:---|:---|:---|:---:|
| API-201 | C→S | `join` | 방 입장 (예약 명단 검증) | FR-008, NFR-003 | ✅ |
| API-202 | C→S | `ready` | 준비 완료 | FR-005, FR-008 | ✅ (세션) |
| API-203 | C→S | `state` | 내 보드 스냅샷 (12Hz) | FR-006, FR-055, FR-025 | ✅ (세션) |
| API-204 | C→S | `clear` | 줄 삭제 정보 (공격 계산용) | FR-004, FR-024, FR-032, FR-036, FR-044~046 | ✅ (세션) |
| API-205 | C→S | `skill` | 위인 스킬·천사 소환 | FR-034, FR-035 | ✅ (세션) |
| API-206 | C→S | `armor` | 보유 갑주 사용 | FR-037 | ✅ (세션) |
| API-207 | C→S | `topout` | 게임 오버 | FR-007, FR-023 | ✅ (세션) |
| API-208 | C→S | `quizAnswer` | 말씀 대결 응답 | FR-041 | ✅ (세션) |
| API-209 | C→S | `reaction` | 리액션 3종 | FR-064, C-009 | ✅ (세션) |
| API-210 | C→S | `quit` | 연습 그만하기 | FR-023, UC-006 6a | ✅ (세션) |
| API-251 | S→C | `joined` | 방 입장 확인·참가자 정보 | FR-008 | — |
| API-252 | S→C | `start` | 라운드 시작 (같은 시드·카운트다운·해금 단계·은혜) | FR-005, FR-010, FR-047, FR-062 | — |
| API-253 | S→C | `opponentState` | 상대 보드 스냅샷 | FR-006 | — |
| API-254 | S→C | `attack` | 받는 공격 (쓰레기·악한 영) | FR-024~031, NFR-002 | — |
| API-255 | S→C | `effect` | 스킬·천사·갑주·예수님·특수 칸·상쇄 연출·적용 지시 | FR-014~017, FR-025, FR-035, FR-037, FR-039, FR-045, FR-053, FR-054 | — |
| API-256 | S→C | `playerStatus` | 내 믿음 게이지·쿨다운·갑주·봉인·은혜 | FR-033, FR-034, FR-036, FR-062 | — |
| API-257 | S→C | `quizStart` | 말씀 대결 문제 (두 보드 정지) | FR-040, FR-041, FR-043 | — |
| API-258 | S→C | `quizLock` | 오답 3초 잠금 | FR-041 | — |
| API-259 | S→C | `quizResult` | 판정·보상·해설·니어미스 시간차 | FR-041, FR-042, C-003 | — |
| API-260 | S→C | `reaction` | 상대 리액션 표시 | FR-064 | — |
| API-261 | S→C | `roundEnd` | 라운드 승패·통계 | FR-007 | — |
| API-262 | S→C | `matchEnd` | 경기 승패·통계·레이팅 변화·개인 기록·성장·업적·대표 구절 | FR-007, FR-009, FR-063, FR-065, FR-066, FR-068, FR-070 | — |
| API-290 | S→C | `error` | 거부·오류 통지 (두 소켓 공통) | NFR-003, FR-032 | — |

---

## 2. 공통 규약

### 2.1 기본 항목

| 항목 | 규격 |
|:---|:---|
| Base URL (로컬 — 이번 실행) | `http://localhost:5173` (Vite) — `/api/*`·`/ws/*`는 Vite 프록시가 `127.0.0.1:8787`(wrangler dev)로 전달. 브라우저는 한 출처만 사용 |
| Base URL (운영 설계) | 클라이언트 빌드 변수 `VITE_SERVER_ORIGIN`(예: Workers 도메인), HTTPS/WSS — 이번 실행 미배포(C-008) |
| 버전 | 경로 버전 없음 (1차 출시 단일 버전). 프로토콜 호환성은 클라이언트·서버가 같은 `client/js/net/protocol.js`를 번들하는 것으로 보장 (D-12) |
| 콘텐츠 타입 | HTTP 요청·응답 `application/json; charset=utf-8`. WS는 UTF-8 JSON 텍스트 프레임 (바이너리 프레임 거부) |
| 문자 정규화 | 서버는 모든 문자열 입력을 NFC 정규화 + 앞뒤 공백 trim 후 검증 |
| 시간 | 응답의 일시 = ISO-8601 UTC 문자열, 기간·남은 시간 = 정수 ms, 서버 시각(`startAt`·`deadlineAt`·`resumeAt`) = 서버 epoch ms |
| 응답 헤더 (HTTP) | `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` |

### 2.2 인증 방식 (요약 — 상세 §5)

| 경로 | 방식 |
|:---|:---|
| HTTP API-002~004 | `Authorization: Bearer <게스트 토큰>` |
| WS API-101·102·201 | 메시지 본문 `token` 필드 (브라우저 WebSocket은 헤더를 붙일 수 없음 — A §4.3 `join`의 `token` 필드 원문) |
| WS 그 밖의 C→S 메시지 | 같은 소켓에서 인증된 세션(소켓 첨부 `guestId`)으로 귀속 — 인증 전 수신 시 `NOT_AUTHENTICATED` |

### 2.3 공통 응답 형식 (율법 — HTTP)

```json
{
  "success": true,
  "data": { "guestId": "3f6c0d2e-7a51-4b8e-9c1d-2a4f6e8b0c13" },
  "meta": { "page": 1, "size": 20, "totalCount": 37, "totalPages": 2 }
}
```

```json
{
  "success": false,
  "error": { "code": "NICKNAME_TAKEN", "message": "이미 사용 중인 닉네임입니다." }
}
```

- `meta`는 목록 조회(API-003)에서만. `error.message`는 사용자에게 보여 줄 한국어 문구(내부 정보·스택 미포함 — 봉인 제1계명).

### 2.4 WebSocket 메시지 봉투 (공통 응답 형식의 WS 적용 — D-30)

| 방향 | 형식 | 예 |
|:---|:---|:---|
| C→S | `{ "type": string, "data": object }` | `{ "type": "clear", "data": { "seq": 418, "lines": 4, "combo": 0, "b2b": false, "tspin": false, "pieceCount": 57, "specials": [] } }` |
| S→C 성공 | `{ "type": string, "success": true, "data": object }` | `{ "type": "attack", "success": true, "data": { "attackId": 12, "spiritId": "abaddon", "garbage": 4, "holeColumn": 6, "duration": 0, "params": { "columns": [1, 4, 8] }, "fromSlot": 1 } }` |
| S→C 실패 | `{ "type": "error", "success": false, "error": { "code": string, "message": string, "ref": string, "retryAfterMs": integer } }` | `{ "type": "error", "success": false, "error": { "code": "COOLDOWN", "message": "아직 다시 쓸 수 없습니다.", "ref": "skill", "retryAfterMs": 8200 } }` |

- 프레임 최대 4096바이트 — 초과 시 `INVALID_MESSAGE` 후 무시.
- 알 수 없는 `type`, `data`가 객체가 아님, 정의되지 않은 추가 필드 → `INVALID_MESSAGE` (추가 필드 거부 = 자유 텍스트 경로 차단, C-009).
- `retryAfterMs`는 쿨다운·봉인·빈도 제한 거부에서만 포함.

### 2.5 페이징 규칙 (API-003)

| 파라미터 | 기본 | 범위 | 규칙 |
|:---|:---:|:---|:---|
| page | 1 | 1 이상 정수 | 범위 밖·정수 아님 → `INVALID_PARAM` |
| size | 20 | 1~50 정수 | 〃 |
| 정렬 | — | 고정 | `created_at DESC` (최신순 — FR-069) |
| meta | — | — | `page`, `size`, `totalCount`, `totalPages`(= ceil(totalCount/size), 0건이면 0) |

### 2.6 수신 메시지 스키마 검증 표 (NFR-003 — `worker/src/protocol/validate.ts`)

| 필드 | 타입 | 규칙 |
|:---|:---|:---|
| token | string | 43자, `^[A-Za-z0-9_-]{43}$` (256비트 base64url) |
| heroId | string | CODE-003 4종 |
| mode | string | `random`·`invite`·`bot`·`practice` |
| roomCode | string | 대문자 변환 후 `^[A-HJ-NP-Z2-9]{6}$` |
| botLevel | string | `easy`·`normal`·`hard` |
| roomId (경로) | string | UUID v4 형식 |
| seq | integer | 0 ≤ seq ≤ 2^31−1, 소켓별 직전 값보다 큼 (`state`·`clear`·`topout` 공유 카운터) |
| board | string | 정확히 200자, `^[0-9a-i]{200}$` (CODE-009) |
| active | object | `type` 1~7, `rot` 0~3, `x` −2~9, `y` −2~21 (정수) 또는 null |
| score | integer | 0 ~ 99,999,999 |
| garbageIn | integer | 0 이상, 소켓별 단조 증가 (누적 삽입 쓰레기 줄 수) |
| lines | integer | 1~4 |
| combo | integer | 0~99 |
| b2b, tspin | boolean | — |
| pieceCount | integer | 0 ~ 100,000, 단조 증가 |
| specials | array | 길이 0~4, 원소 `{ kind: "word"·"jericho"·"manna"·"armor", pieceIndex: 정수 0 ~ pieceCount, armorId: CODE-006 (kind=armor일 때만) }` |
| skillId | string | `hero_` + CODE-003 또는 `angel_` + CODE-004 |
| armorId | string | CODE-006 |
| quizId | string | `^q\d{3}$` |
| choice | integer | 0~3 |
| reactionId | string | CODE-010 3종 |
| nickname (HTTP) | string | NFC·trim 후 `^[가-힣A-Za-z0-9_]{2,12}$` |

### 2.7 빈도 제한 (D-31 — `worker/src/protocol/rate-limit.ts`)

| 대상 | 한도 | 초과 처리 |
|:---|:---|:---|
| `state` | 20회/초 (정상 송신 12Hz) | 초과분 무시 |
| `clear` | 10회/초 | `RATE_LIMITED` + 무시 |
| `skill`, `armor` | 각 4회/초 | `RATE_LIMITED` |
| `quizAnswer` | 4회/초 | `RATE_LIMITED` |
| `reaction` | 1회/1.5초 (CODE-010) | 초과분 무시 (UC-017 E2) |
| `join`, `createRoom`, `cancel` | 소켓당 3회/10초 | `RATE_LIMITED` |
| 위반 누적 | 같은 소켓 10초 안에 `RATE_LIMITED` 3회 | 연결 종료 코드 4008 |
| HTTP `POST /api/guest` | 요청 출처 주소당 5회/분 (`CF-Connecting-IP`, 로컬은 루프백 주소) — 메모리 카운터, 주소는 저장하지 않음 | 429 `RATE_LIMITED` |
| HTTP 조회 API | 토큰당 30회/분 | 429 `RATE_LIMITED` |

### 2.8 서버 권한·부정행위 방지 규칙 (A §4.3 기본선 — FR-032, REQ-007)

| # | 규칙 | 판정 지점 | 위반 시 |
|:--|:---|:---|:---|
| R-01 | 공격력·악한 영 종류·쓰레기 구멍 열은 서버(`attack.ts`)만 결정. 클라이언트는 `clear`에 줄 정보만 보냄 | GameRoom | — (클라이언트에 결정 필드 없음) |
| R-02 | `seq`는 소켓별 엄격 증가. 역행·중복 `state`는 조용히 버리고, 역행 `clear`·`topout`은 거부 | progress-guard | `SEQ_REJECTED`, 공격 없음, 로그 |
| R-03 | `clear.pieceCount`는 직전 `clear`보다 커야 함 (줄 삭제는 새로 고정된 블록마다 1회) | progress-guard | `PROGRESS_REJECTED` |
| R-04 | 칸 보존 법칙: 누적 삭제 줄 × 10 ≤ `pieceCount` × 4 + `garbageIn` × 9 ("블록 수보다 많은 줄 삭제" 차단) | progress-guard | `PROGRESS_REJECTED` |
| R-05 | 블록 속도: 최근 5초 `pieceCount` 증가 ≤ 100 (초당 20개 — 하드 드롭 연타 상한) | progress-guard | `PROGRESS_REJECTED` |
| R-06 | 콤보 일관성: 직전 `clear`의 `pieceCount` + 1 = 이번 `pieceCount`이면 `combo` = 직전 + 1, 아니면 `combo` = 0 | progress-guard | `PROGRESS_REJECTED` |
| R-07 | B2B 일관성: `b2b` = true는 직전 삭제가 테트리스 또는 T-Spin이었고 그 사이 다른 종류 삭제가 없을 때만 | progress-guard | `PROGRESS_REJECTED` |
| R-08 | `tspin` = true는 `lines` ≤ 3일 때만 | validate | `INVALID_MESSAGE` |
| R-09 | 특수·갑주 칸: 서버가 같은 시드 스트림으로 `pieceIndex`의 굴림값을 재계산해, 그 칸 종류가 해금 단계·모드에서 허용되고 굴림값이 해당 종류 최대 확률 이하이며 갑주 종류가 일치할 때만 인정. 같은 `pieceIndex` 2회 인정 금지 | specials.ts | 해당 칸만 무효 (`PROGRESS_REJECTED`), 줄 삭제 공격은 정상 처리 |
| R-10 | 믿음 게이지·쿨다운·봉인·갑주 보유는 서버 값만 유효. `playerStatus`로만 화면에 반영 | faith·angels·armor | `FAITH_INSUFFICIENT`·`COOLDOWN`·`ANGEL_SEALED`·`ARMOR_NOT_OWNED` |
| R-11 | 말씀 대결 정답은 `quizResult` 전까지 클라이언트로 보내지 않음. 도착순은 서버 수신 시각. 마감 후 응답 무시 | quiz-duel | `QUIZ_CLOSED` / `QUIZ_LOCKED` |
| R-12 | 경기 결과·레이팅·진행 기록·업적은 서버만 기록. 클라이언트 쓰기 API 없음 | results | — |
| R-13 | GameRoom은 Matchmaker가 예약한 명단(게스트 ID·위인)과 일치하는 `join`만 수락. 한 게스트의 두 번째 연결은 거부 | game-room | `NOT_IN_ROOM`·`HERO_MISMATCH`·`DUPLICATE_SESSION` |
| R-14 | 상대 보드는 서버가 검증한 `state`(필드 화이트리스트 재직렬화)만 `opponentState`로 중계 | message-router | 무효 `state`는 중계 안 함 |
| R-15 | 보드 내용 자체(위기 판정·쓰레기 줄 수)는 클라이언트 보고값을 사용한다 — 서버 권한 범위는 A §4.3 기본선(공격력·영·게이지·쿨다운·진행 검증)이며, 보드 전체 서버 시뮬레이션은 범위 밖으로 기록 | jesus-event·hero-skills | — |

---

## 3. API 상세 명세

### API-001: 게스트 닉네임 입장

| 항목 | 내용 |
|:---|:---|
| API-ID | API-001 |
| Method | POST |
| Endpoint | `/api/guest` |
| 설명 | 닉네임 검증·중복 확인 후 게스트 ID·토큰 발급, 프로필(레이팅 1000)·진행 기록 생성 |
| 연결 REQ | REQ-002, FR-012, NFR-003, NFR-008 |
| 연결 UC | UC-001 (정상 4단계, E1, E2, E4) |
| 인증 필요 | ❌ |
| 연결 TBL | TBL-001, TBL-003, TBL-201 |

**요청(Request):**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| nickname | String (Body) | ✅ | 닉네임 | NFC·trim 후 2~12자, 한글 완성형·영문·숫자·밑줄만. 빈 문자열 거부 |

**응답(Response) — 성공 (201):**
```json
{
  "success": true,
  "data": {
    "guestId": "3f6c0d2e-7a51-4b8e-9c1d-2a4f6e8b0c13",
    "nickname": "다윗의물맷돌",
    "token": "Qm9vayBvZiB0aGUgQ292ZW5hbnQgLSBFeG9kdXMgMjQ",
    "rating": 1000,
    "createdAt": "2026-10-19T14:20:31.512Z"
  }
}
```

**응답 — 실패 (4xx/5xx):**
```json
{ "success": false, "error": { "code": "NICKNAME_TAKEN", "message": "이미 사용 중인 닉네임입니다." } }
```

**비즈니스 에러:**
| 에러 코드 | HTTP | 설명 |
|:---|:---:|:---|
| INVALID_BODY | 400 | JSON 아님·`nickname` 누락·추가 필드 |
| INVALID_NICKNAME | 400 | 길이·문자 규칙 위반 ("닉네임 규칙(길이·문자)을 확인하세요") |
| NICKNAME_TAKEN | 409 | 대소문자 무시 중복 |
| RATE_LIMITED | 429 | 출처당 5회/분 초과 |
| STORE_UNAVAILABLE | 503 | 저장소 연결 실패 (Supabase 모드 연결 실패 포함 — UC-021 E2) |

### API-002: 토큰 검증·프로필 복원

| 항목 | 내용 |
|:---|:---|
| API-ID | API-002 |
| Method | GET |
| Endpoint | `/api/guest/me` |
| 설명 | 브라우저에 저장된 토큰을 검증하고 프로필을 반환, `last_seen_at` 갱신 |
| 연결 REQ | REQ-002, FR-012 |
| 연결 UC | UC-001 (1a, E3) |
| 인증 필요 | ✅ |
| 연결 TBL | TBL-001, TBL-201 |

**요청(Request):**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| Authorization | String (Header) | ✅ | `Bearer <token>` | §2.6 token 형식 |

**응답 — 성공 (200):**
```json
{
  "success": true,
  "data": { "guestId": "3f6c0d2e-7a51-4b8e-9c1d-2a4f6e8b0c13", "nickname": "다윗의물맷돌", "rating": 1016 }
}
```

**응답 — 실패:**
| 에러 코드 | HTTP | 설명 |
|:---|:---:|:---|
| UNAUTHORIZED | 401 | 헤더 없음·형식 오류 |
| INVALID_TOKEN | 401 | 해시 일치 프로필 없음 → 클라이언트는 TBL-201 삭제 후 입장 화면 (UC-001 E3) |
| RATE_LIMITED | 429 | 토큰당 30회/분 초과 |
| STORE_UNAVAILABLE | 503 | 저장소 실패 |

### API-003: 내 전적 조회

| 항목 | 내용 |
|:---|:---|
| API-ID | API-003 |
| Method | GET |
| Endpoint | `/api/matches` |
| 설명 | 내가 슬롯 1 또는 2로 참여한 경기를 최신순으로 페이지 조회 |
| 연결 REQ | REQ-014, FR-069 |
| 연결 UC | UC-018 |
| 인증 필요 | ✅ |
| 연결 TBL | TBL-002, TBL-001 |

**요청(Request):**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| Authorization | String (Header) | ✅ | `Bearer <token>` | §2.6 |
| page | Integer (Query) | ⬜ | 페이지 | 기본 1, 1 이상 |
| size | Integer (Query) | ⬜ | 페이지 크기 | 기본 20, 1~50 |

**응답 — 성공 (200):**
```json
{
  "success": true,
  "data": [
    {
      "matchId": "8d1f3b2a-6c4e-4f19-8a7b-0e2d5c9f1a34",
      "mode": "random",
      "opponent": { "nickname": "바울의옥문", "isBot": false, "botLevel": null },
      "myHero": "david",
      "opponentHero": "paul",
      "result": "win",
      "endReason": "topout",
      "rounds": [2, 1],
      "durationMs": 412870,
      "ratingDelta": 16,
      "createdAt": "2026-10-19T14:31:02.004Z"
    },
    {
      "matchId": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      "mode": "bot",
      "opponent": { "nickname": null, "isBot": true, "botLevel": "normal" },
      "myHero": "peter",
      "opponentHero": "solomon",
      "result": "loss",
      "endReason": "topout",
      "rounds": [1, 2],
      "durationMs": 288110,
      "ratingDelta": null,
      "createdAt": "2026-10-19T14:12:45.731Z"
    }
  ],
  "meta": { "page": 1, "size": 20, "totalCount": 2, "totalPages": 1 }
}
```

> `rounds`는 [내 승수, 상대 승수]. 0건이면 `data: []`, `totalCount: 0` → 화면 "아직 경기 기록이 없습니다" (UC-018 4a).

**응답 — 실패:**
| 에러 코드 | HTTP | 설명 |
|:---|:---:|:---|
| UNAUTHORIZED / INVALID_TOKEN | 401 | 토큰 문제 (UC-018 E2) |
| INVALID_PARAM | 400 | page·size 범위 위반 |
| RATE_LIMITED | 429 | 30회/분 초과 |
| STORE_UNAVAILABLE | 503 | 조회 실패 (UC-018 E1 재시도 버튼) |

### API-004: 랭킹 조회

| 항목 | 내용 |
|:---|:---|
| API-ID | API-004 |
| Method | GET |
| Endpoint | `/api/rankings` |
| 설명 | 레이팅 상위 100명과 (토큰이 있으면) 내 순위 |
| 연결 REQ | REQ-015, FR-071 |
| 연결 UC | UC-019 |
| 인증 필요 | ⬜ 선택 — 랭킹은 전체 공개(A §4.4), 내 순위는 토큰 필요 |
| 연결 TBL | TBL-006, TBL-001 |

**요청(Request):**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| Authorization | String (Header) | ⬜ | `Bearer <token>` | 있으면 §2.6 형식, 무효면 401 |

**응답 — 성공 (200):**
```json
{
  "success": true,
  "data": {
    "top": [
      { "rank": 1, "nickname": "다윗의물맷돌", "rating": 1112, "isMe": true },
      { "rank": 2, "nickname": "바울의옥문", "rating": 1048, "isMe": false }
    ],
    "me": { "rank": 1, "nickname": "다윗의물맷돌", "rating": 1112 }
  }
}
```

> 토큰이 없으면 `me: null`, `isMe`는 모두 false. 100위 밖이면 `top`에 내 행이 없고 `me`로 따로 표시 (UC-019 3a).

**응답 — 실패:**
| 에러 코드 | HTTP | 설명 |
|:---|:---:|:---|
| INVALID_TOKEN | 401 | 보낸 토큰이 무효 |
| RATE_LIMITED | 429 | 초과 |
| STORE_UNAVAILABLE | 503 | 조회 실패 (UC-019 E1) |

### API-005: Matchmaker WebSocket 연결

| 항목 | 내용 |
|:---|:---|
| API-ID | API-005 |
| Method | GET (`Upgrade: websocket`) |
| Endpoint | `/ws/matchmaker` |
| 설명 | Worker가 업그레이드 요청을 Matchmaker DO(`idFromName("global")`)로 전달, `ctx.acceptWebSocket`(Hibernation) |
| 연결 REQ | REQ-004, REQ-005, REQ-006, FR-018~021, FR-023, C-006 |
| 연결 UC | UC-003, UC-004, UC-005, UC-006 |
| 인증 필요 | ✅ — 연결 후 10초 안에 `join` 또는 `createRoom`(token 포함)이 없으면 종료 4001 |
| 연결 TBL | TBL-001, TBL-003, TBL-005 |

**요청(Request):**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| Upgrade | Header | ✅ | `websocket` | 아니면 426 |
| Origin | Header | ✅ | 요청 출처 | 허용 목록(로컬 `http://localhost:5173`, `http://127.0.0.1:5173`)과 일치 — 교차 사이트 WebSocket 탈취 차단 |

**응답 — 성공 (101 Switching Protocols):** 이후 §3 API-101~154 메시지 교환.

**응답 — 실패:**
| 에러 코드 | HTTP / 종료 코드 | 설명 |
|:---|:---:|:---|
| UPGRADE_REQUIRED | 426 | WebSocket 요청 아님 |
| ORIGIN_FORBIDDEN | 403 | 허용되지 않은 Origin |
| NOT_AUTHENTICATED | 4001 | 10초 안에 인증 메시지 없음 |

### API-006: GameRoom WebSocket 연결

| 항목 | 내용 |
|:---|:---|
| API-ID | API-006 |
| Method | GET (`Upgrade: websocket`) |
| Endpoint | `/ws/room/:roomId` |
| 설명 | Worker가 `idFromName(roomId)` GameRoom으로 전달. 방은 Matchmaker의 `init` RPC로 초기화된 경우에만 수락 |
| 연결 REQ | REQ-001, FR-008, C-006 |
| 연결 UC | UC-003~UC-017 |
| 인증 필요 | ✅ — 연결 후 10초 안에 `join` 없으면 종료 4001 |
| 연결 TBL | TBL-001 (토큰 검증), TBL-002·003·004 (경기 종료 시 기록) |

**요청(Request):**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| roomId | String (Path) | ✅ | `matched.roomId` | UUID v4 형식, 아니면 400 |
| Upgrade / Origin | Header | ✅ | API-005와 같음 | 같음 |

**응답 — 성공 (101):** 이후 API-201~262 교환.

**응답 — 실패:**
| 에러 코드 | HTTP / 종료 코드 | 설명 |
|:---|:---:|:---|
| INVALID_PARAM | 400 | roomId 형식 오류 |
| ROOM_NOT_FOUND | 404 | 초기화되지 않았거나 종료된 방 |
| UPGRADE_REQUIRED / ORIGIN_FORBIDDEN | 426 / 403 | API-005와 같음 |

### API-101: `join` (Matchmaker)

| 항목 | 내용 |
|:---|:---|
| API-ID | API-101 |
| Method | WS C→S |
| Endpoint | `/ws/matchmaker` · `type: "join"` |
| 설명 | 모드별 배정 요청. `random` → 대기열(API-151) 후 짝 성사 시 API-153. `invite` + `roomCode` → 코드 검증 후 방장과 함께 API-153. `bot` → 봇 방 생성, 봇 위인 무작위 배정 후 API-153. `practice` → 1인 방 생성 후 API-153 |
| 연결 REQ | FR-008 (`join { token, heroId, roomCode? }`), FR-018, FR-019, FR-021, FR-023 |
| 연결 UC | UC-003 (1~4), UC-004 (4~6), UC-005 (1~3), UC-006 (1) |
| 인증 필요 | ✅ (token) |
| 연결 TBL | TBL-001, TBL-003, TBL-005 |

**요청(Request) — `data`:**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| token | String | ✅ | 게스트 토큰 | §2.6 |
| heroId | String | ✅ | 고른 위인 | CODE-003 |
| mode | String | ✅ | 모드 | CODE-001 |
| roomCode | String | mode=invite일 때 ✅ | 초대 코드 | §2.6, 그 외 모드에서는 금지 |
| botLevel | String | mode=bot일 때 ✅ | 봇 난이도 | CODE-002, 그 외 모드에서는 금지 |

```json
{ "type": "join", "data": { "token": "Qm9vayBvZiB0aGUgQ292ZW5hbnQgLSBFeG9kdXMgMjQ", "heroId": "david", "mode": "random" } }
```

**응답 — 성공:** `random` → API-151 `queued`, 짝 성사 시 API-153 `matched`. 그 외 → 즉시 API-153.

**매칭 규칙 (FR-018):** 새 대기자가 들어오면 대기열에서 레이팅 차이 |Ra − Rb|가 가장 작은 상대와 짝짓는다(동률은 먼저 기다린 사람). 대기자가 1명뿐이면 차이와 무관하게 짝짓는다 (UC-003 3a). 같은 게스트의 중복 대기는 거부.

**응답 — 실패 (API-290 `error`):**
| 에러 코드 | 종료 | 설명 |
|:---|:---:|:---|
| INVALID_MESSAGE | — | 스키마 위반 |
| INVALID_TOKEN | 4001 | 토큰 무효 → 클라이언트 UC-001 (UC-003 E3) |
| ALREADY_QUEUED | — | 이미 대기 중 또는 다른 소켓에서 대기 중 |
| INVITE_NOT_FOUND | — | 없는·만료된·닫힌 코드 ("초대 코드를 찾을 수 없습니다" — UC-004 E1) |
| ROOM_FULL | — | 이미 두 명 (`status` = full — UC-004 E2) |
| OWN_INVITE | — | 방장이 자기 코드로 입장 |
| STORE_UNAVAILABLE | — | 프로필·진행 기록 조회 실패 |
| RATE_LIMITED | — | §2.7 |

### API-102: `createRoom`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-102 |
| Method | WS C→S |
| Endpoint | `/ws/matchmaker` · `type: "createRoom"` |
| 설명 | 방장이 초대 방을 만들고 코드를 받는다. 방장은 이 소켓을 열어 둔 채 기다리고, 친구가 코드로 입장하면 API-153을 받는다 |
| 연결 REQ | FR-019 |
| 연결 UC | UC-004 (1~2, 2a, E3) |
| 인증 필요 | ✅ (token) |
| 연결 TBL | TBL-005, TBL-001 |

**요청(Request) — `data`:**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| token | String | ✅ | 게스트 토큰 | §2.6 |
| heroId | String | ✅ | 방장 위인 | CODE-003 |

**응답 — 성공:** API-152 `roomCreated`.

**수명 규칙:** 발급 후 10분 안에 친구가 없으면 코드 `closed` + API-154(`expired`). 방장 소켓이 끊기면 즉시 `closed` (UC-004 E3). 방장 1명당 열린 코드 1개.

**응답 — 실패:**
| 에러 코드 | 설명 |
|:---|:---|
| INVALID_MESSAGE / INVALID_TOKEN | 스키마·토큰 |
| ALREADY_QUEUED | 이미 랜덤 대기 중이거나 열린 코드 보유 |
| CODE_EXHAUSTED | 재발급 5회 모두 충돌 (사실상 발생하지 않는 방어 경로) |
| RATE_LIMITED | §2.7 |

### API-103: `cancel`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-103 |
| Method | WS C→S |
| Endpoint | `/ws/matchmaker` · `type: "cancel"` |
| 설명 | 랜덤 대기 취소(대기열 제거) 또는 열린 초대 코드 닫기 |
| 연결 REQ | FR-020 |
| 연결 UC | UC-003 2a, UC-004 2a |
| 인증 필요 | ✅ (인증된 소켓 세션) |
| 연결 TBL | TBL-005 |

**요청(Request) — `data`:** 빈 객체 `{}` (필드 없음 — 추가 필드는 `INVALID_MESSAGE`).

**응답 — 성공:** API-154 `cancelled` (`reason: "user"`). 소켓이 끊겨도 같은 정리를 서버가 수행한다 (`webSocketClose` — FR-020 "연결이 끊기면 대기열에서 제거").

**응답 — 실패:**
| 에러 코드 | 설명 |
|:---|:---|
| NOT_AUTHENTICATED | 인증 전 |
| NOTHING_TO_CANCEL | 대기·열린 코드 없음 |

### API-151: `queued`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-151 |
| Method | WS S→C |
| Endpoint | `/ws/matchmaker` · `type: "queued"` |
| 설명 | 랜덤 대기열 등록 확인 — 매칭 대기 화면 표시 |
| 연결 REQ | FR-018 |
| 연결 UC | UC-003 (2) |
| 인증 필요 | — |
| 연결 TBL | — (대기열은 소켓 첨부 상태 — 테이블 아님) |

**응답(Response) — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| mode | String | `random` |
| queuedAt | Integer | 서버 epoch ms |

```json
{ "type": "queued", "success": true, "data": { "mode": "random", "queuedAt": 1792420831512 } }
```

### API-152: `roomCreated`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-152 |
| Method | WS S→C |
| Endpoint | `/ws/matchmaker` · `type: "roomCreated"` |
| 설명 | 초대 코드 발급 결과 — "친구를 기다리는 중" 화면에 코드 표시 |
| 연결 REQ | FR-019 |
| 연결 UC | UC-004 (2) |
| 인증 필요 | — |
| 연결 TBL | TBL-005 |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| roomCode | String | 6자 코드 |
| roomId | String | 예약된 방 ID (UUID) |
| expiresAt | String | 만료 일시 (ISO) |

```json
{ "type": "roomCreated", "success": true, "data": { "roomCode": "K7PX4Q", "roomId": "c2b7e1d4-9f3a-4e6b-8d20-5a1c7f9e3b46", "expiresAt": "2026-10-19T14:40:31.512Z" } }
```

### API-153: `matched`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-153 |
| Method | WS S→C |
| Endpoint | `/ws/matchmaker` · `type: "matched"` |
| 설명 | 짝 성사 (FR-008 원문 `matched { roomId, opponent: { nickname, heroId } }`). Matchmaker는 이 메시지 직전에 GameRoom `init`(방 ID·모드·명단·봇 난이도)을 RPC로 완료한다. 클라이언트는 수신 즉시 API-006 연결 |
| 연결 REQ | FR-008, FR-018, FR-019, FR-021, FR-023 |
| 연결 UC | UC-003 (4), UC-004 (6), UC-005 (3), UC-006 (1) |
| 인증 필요 | — |
| 연결 TBL | TBL-001 (상대 닉네임·레이팅) |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| roomId | String | 방 ID |
| mode | String | CODE-001 |
| slot | Integer | 내 슬롯 1·2 (봇·연습은 1) |
| opponent | Object 또는 null | `{ nickname: String 또는 null, heroId, isBot: Boolean, botLevel: String 또는 null }` — 연습은 null |

```json
{ "type": "matched", "success": true, "data": { "roomId": "c2b7e1d4-9f3a-4e6b-8d20-5a1c7f9e3b46", "mode": "bot", "slot": 1, "opponent": { "nickname": null, "heroId": "solomon", "isBot": true, "botLevel": "normal" } } }
```

### API-154: `cancelled`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-154 |
| Method | WS S→C |
| Endpoint | `/ws/matchmaker` · `type: "cancelled"` |
| 설명 | 대기 또는 초대 방 종료 통지 — 클라이언트는 로비로 |
| 연결 REQ | FR-020, FR-019 |
| 연결 UC | UC-003 2a, UC-004 2a |
| 인증 필요 | — |
| 연결 TBL | TBL-005 |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| reason | String | `user`(취소) · `expired`(초대 10분 경과) |

### API-201: `join` (GameRoom)

| 항목 | 내용 |
|:---|:---|
| API-ID | API-201 |
| Method | WS C→S |
| Endpoint | `/ws/room/:roomId` · `type: "join"` |
| 설명 | 방 입장. 토큰 → 게스트 ID → 예약 명단 일치(R-13) 확인 후 소켓 첨부에 `guestId`·`slot` 기록 |
| 연결 REQ | FR-008, NFR-003 |
| 연결 UC | UC-003 (5 전), UC-004 (5), UC-005, UC-006 |
| 인증 필요 | ✅ (token) |
| 연결 TBL | TBL-001 |

**요청(Request) — `data`:**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| token | String | ✅ | 게스트 토큰 | §2.6 |
| heroId | String | ✅ | 위인 | 예약 명단의 위인과 같아야 함 |

**응답 — 성공:** API-251 `joined`. 예약된 사람이 모두 `join`하지 않은 채 15초가 지나면, 들어온 쪽에 `error OPPONENT_LEFT` 후 방 종료 → 클라이언트는 같은 모드로 매칭 대기에 자동 복귀 (UC-003 E2).

**응답 — 실패:**
| 에러 코드 | 종료 | 설명 |
|:---|:---:|:---|
| INVALID_TOKEN | 4001 | 토큰 무효 |
| NOT_IN_ROOM | 4003 | 명단에 없는 게스트 |
| HERO_MISMATCH | 4003 | 위인 불일치 |
| DUPLICATE_SESSION | 4003 | 같은 게스트의 두 번째 연결 |
| OPPONENT_LEFT | 1000 | 시작 전 상대 미입장·이탈 |

### API-202: `ready`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-202 |
| Method | WS C→S |
| Endpoint | `/ws/room/:roomId` · `type: "ready"` |
| 설명 | 준비 완료. 사람 플레이어 전원 `ready` → API-252 `start` (봇은 항상 준비됨) |
| 연결 REQ | FR-005, FR-008 |
| 연결 UC | UC-003 (5~6), UC-004 (6) |
| 인증 필요 | ✅ (세션) |
| 연결 TBL | TBL-003 (해금 단계·은혜 계산 입력) |

**요청 — `data`:** 빈 객체 `{}`.

**응답 — 성공:** API-252 `start` (전원 준비 시).

**응답 — 실패:**
| 에러 코드 | 설명 |
|:---|:---|
| NOT_AUTHENTICATED | `join` 전 |
| GAME_NOT_RUNNING | 이미 시작·종료된 방 |

### API-203: `state`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-203 |
| Method | WS C→S |
| Endpoint | `/ws/room/:roomId` · `type: "state"` |
| 설명 | 내 보드 스냅샷 12Hz (FR-008 원문 `{ seq, board(압축), active, score }`). 서버는 검증 후 상대에게 API-253으로 중계하고, 위기 판정(D-18)·대기 쓰레기 장부(D-16) 입력으로 쓴다 |
| 연결 REQ | FR-006, FR-025, FR-055, FR-039 |
| 연결 UC | UC-007 (7) |
| 인증 필요 | ✅ (세션) |
| 연결 TBL | — (메모리) |

**요청 — `data`:**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| seq | Integer | ✅ | 송신 순번 | R-02 |
| board | String | ✅ | 200자 압축 보드 | CODE-009 |
| active | Object 또는 null | ✅ | 낙하 중 블록 | §2.6 |
| score | Integer | ✅ | 점수 | §2.6 |
| garbageIn | Integer | ✅ | 누적 삽입 쓰레기 줄 수 | 단조 증가 |

**응답 — 성공:** 응답 없음 (상대에게 API-253).
**응답 — 실패:** 역행 `seq`·스키마 위반은 조용히 버림 (12Hz 스트림에 오류 응답을 쌓지 않음), 빈도 초과도 무시 (§2.7).

### API-204: `clear`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-204 |
| Method | WS C→S |
| Endpoint | `/ws/room/:roomId` · `type: "clear"` |
| 설명 | 줄 삭제 1회 보고 (FR-008 원문 `{ seq, lines, combo, b2b, tspin, pieceCount }` + 지운 특수 칸 `specials`). 서버 처리 순서: ① 진행 검증(R-02~R-09) ② 게이지 충전(은혜 ×1.15) ③ 특수 칸 효과(만나 +25, 여리고 +1·3×3, 갑주 획득, 말씀 → 말씀 대결) ④ 공격력 계산 ⑤ 내 대기 공격 상쇄 ⑥ 상대 방어(방패·검·미가엘·베드로·흉배·은혜 −1) ⑦ 영 결정·방해 상한 ⑧ API-254/255/256 송신 |
| 연결 REQ | FR-004, FR-024~026, FR-031~033, FR-036, FR-040, FR-044~047, FR-062, NFR-002 |
| 연결 UC | UC-007 (6), UC-008, UC-011 (2~3), UC-014 |
| 인증 필요 | ✅ (세션) |
| 연결 TBL | TBL-108 (수치), TBL-103 (영 후보) |

**요청 — `data`:**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| seq | Integer | ✅ | 순번 | R-02 |
| lines | Integer | ✅ | 지운 줄 수 | 1~4 |
| combo | Integer | ✅ | 콤보 (연속 삭제 블록 수 − 1) | R-06 |
| b2b | Boolean | ✅ | 백투백 | R-07 |
| tspin | Boolean | ✅ | T-Spin | R-08 |
| pieceCount | Integer | ✅ | 지금까지 고정된 블록 수 | R-03~R-05 |
| specials | Array | ✅ | 이번에 지운 특수·갑주 칸 | §2.6, R-09 (없으면 `[]`) |

```json
{ "type": "clear", "data": { "seq": 418, "lines": 4, "combo": 0, "b2b": true, "tspin": false, "pieceCount": 57, "specials": [ { "kind": "armor", "pieceIndex": 51, "armorId": "shield_of_faith" } ] } }
```

**응답 — 성공:** 보낸 쪽에 API-255 `effect`(`attackSent` 또는 `offset`)와 API-256, 받는 쪽에 API-254 `attack`(잔여 공격이 있을 때). 1줄 삭제(공격력 0)는 게이지·특수 칸만 처리 (UC-008 E2). 연습 모드는 ④~⑦ 없음.

**응답 — 실패:**
| 에러 코드 | 설명 |
|:---|:---|
| SEQ_REJECTED | R-02 위반 — 공격 없음, 로그 (UC-007 E4) |
| PROGRESS_REJECTED | R-03~R-07·R-09 위반 — 공격 없음(R-09는 해당 칸만 무효) |
| GAME_NOT_RUNNING | 라운드 진행 중 아님·말씀 대결 정지 중 |
| RATE_LIMITED | §2.7 |

### API-205: `skill`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-205 |
| Method | WS C→S |
| Endpoint | `/ws/room/:roomId` · `type: "skill"` |
| 설명 | 위인 스킬 또는 천사 소환 (FR-008 원문 `skill`(`skillId`), 스킬 = 위인 스킬 + 천사 소환 — spec-tablet §9.8 #10). 서버가 게이지·쿨다운·봉인·모드를 검증하고 차감 후 API-255로 양측에 알림 |
| 연결 REQ | FR-014~017, FR-034, FR-035 |
| 연결 UC | UC-009, UC-010 |
| 인증 필요 | ✅ (세션) |
| 연결 TBL | TBL-101, TBL-102, TBL-108 |

**요청 — `data`:**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| skillId | String | ✅ | `hero_david` 등 / `angel_michael` 등 | §2.6. 위인 스킬은 내 위인 것만 |

**응답 — 성공:** API-255 `effect` (`kind: "hero"` 또는 `"angel"`, `action`은 TBL-101·102 정의) + API-256.

**효과 적용 주체:** 다윗 → 상대 클라이언트가 자기 보드에서 가장 높은 열 꼭대기 블록 3개 제거 (빈 보드면 연출만, 게이지는 차감 — UC-009 5b). 솔로몬·가브리엘 → 내 클라이언트 힌트·미리보기. 베드로 → 서버가 10초간 나에게 오는 쓰레기를 0으로. 바울·섬기는 영들 → 내 클라이언트가 맨 아래 쓰레기 줄 제거(부족하면 있는 만큼 — UC-009 5a). 그룹 → 서버가 내 대기 쓰레기 2줄 감소(`offset`). 스랍 → 서버·내 클라이언트가 저주(deception·control·speed·납) 해제. 미가엘 → 대기·다음 1회 dragon·angel_of_light 상쇄.

**응답 — 실패:**
| 에러 코드 | 설명 |
|:---|:---|
| FAITH_INSUFFICIENT | 게이지 부족 ("믿음이 부족합니다") |
| COOLDOWN | 쿨다운 중 (`retryAfterMs` = 남은 시간) |
| ANGEL_SEALED | 바사 왕국의 군주 봉인 중 (`retryAfterMs`) |
| NOT_ALLOWED_IN_MODE | 연습 모드에서 천사 |
| INVALID_SKILL | 내 위인이 아닌 위인 스킬 |
| GAME_NOT_RUNNING | 라운드 종료·말씀 대결 정지 중 — 클라이언트 입력 무시 (UC-009 E3) |

### API-206: `armor`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-206 |
| Method | WS C→S |
| Endpoint | `/ws/room/:roomId` · `type: "armor"` |
| 설명 | 보유 갑주 1개 사용 (FR-037 "사용자가 키로 사용"). 서버가 보유 확인 후 소모하고 효과를 장전·적용 |
| 연결 REQ | FR-037, FR-038 |
| 연결 UC | UC-011 (4~6) |
| 인증 필요 | ✅ (세션) |
| 연결 TBL | TBL-104, TBL-105 |

**요청 — `data`:**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| armorId | String | ✅ | 갑주 | CODE-006, 보유 중 |

**응답 — 성공:** API-255 `effect`(`kind: "armor"`) + API-256. 허리띠·신·투구는 해당 범주의 진행 중 효과 즉시 해제 + 다음 1회 무효(OQ #8). 흉배는 다음 받는 공격 쓰레기 −2. 방패는 다음 공격 1회(쓰레기·영) 완전 차단. 검은 다음 받는 공격 1회를 보낸 쪽에 그대로 되돌림(되돌린 공격은 다시 되돌릴 수 없음, 받을 공격이 없으면 대기 — UC-011 E2).

**응답 — 실패:**
| 에러 코드 | 설명 |
|:---|:---|
| ARMOR_NOT_OWNED | 보유하지 않음 ("보유한 갑주가 없습니다" — UC-011 E1) |
| NOT_ALLOWED_IN_MODE | 연습 모드 |
| GAME_NOT_RUNNING | 진행 중 아님 |

### API-207: `topout`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-207 |
| Method | WS C→S |
| Endpoint | `/ws/room/:roomId` · `type: "topout"` |
| 설명 | 내 보드 게임 오버. 대전: 상대가 라운드 승자 → API-261, 2승이면 API-262. 연습: 세션 종료 → API-262(`mode: practice`) |
| 연결 REQ | FR-007, FR-023 |
| 연결 UC | UC-007 E3, UC-015 (1~5), UC-006 (6) |
| 인증 필요 | ✅ (세션) |
| 연결 TBL | TBL-002, TBL-003, TBL-004 (경기 종료 시) |

**요청 — `data`:**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| seq | Integer | ✅ | 순번 | R-02 |
| pieceCount | Integer | ✅ | 고정 블록 수 | 직전 이상 |

**동시 topout:** 같은 처리 단위에서 두 `topout`이 오면 먼저 도착한 쪽이 패배 (UC-015 E1).

**응답 — 실패:** `SEQ_REJECTED`, `GAME_NOT_RUNNING`.

### API-208: `quizAnswer`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-208 |
| Method | WS C→S |
| Endpoint | `/ws/room/:roomId` · `type: "quizAnswer"` |
| 설명 | 말씀 대결 응답. 서버 수신 시각으로 도착순 판정 — 첫 정답자가 승자, 오답은 3초 잠금 |
| 연결 REQ | FR-041, FR-042 |
| 연결 UC | UC-013 (4~5, E1, E3) |
| 인증 필요 | ✅ (세션) |
| 연결 TBL | TBL-107 |

**요청 — `data`:**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| quizId | String | ✅ | 진행 중 문항 | 현재 문항과 일치 |
| choice | Integer | ✅ | 고른 보기 | 0~3 |

**응답 — 성공:** 오답 → API-258 `quizLock`. 정답 → (첫 정답이면) 다른 플레이어의 응답·마감을 기다리지 않고 판정 확정, 늦은 정답자를 위해 마감까지 응답 시각만 수집 후 API-259 (니어미스 `deltaMs`).

**응답 — 실패:**
| 에러 코드 | 설명 |
|:---|:---|
| QUIZ_CLOSED | 진행 중 대결 없음·마감 후·다른 문항 (응답 무시 — UC-013 E3) |
| QUIZ_LOCKED | 3초 잠금 중 (`retryAfterMs`) |
| QUIZ_ALREADY_ANSWERED | 이미 정답 처리됨 |

### API-209: `reaction` (C→S)

| 항목 | 내용 |
|:---|:---|
| API-ID | API-209 |
| Method | WS C→S |
| Endpoint | `/ws/room/:roomId` · `type: "reaction"` |
| 설명 | 리액션 3종 전송 — 사람 대 사람이면 상대에게 API-260, 봇 대전이면 내 화면에만 표시하고 서버는 중계하지 않음 (UC-017 1a) |
| 연결 REQ | FR-064, C-009 |
| 연결 UC | UC-017 |
| 인증 필요 | ✅ (세션) |
| 연결 TBL | — (CODE-010) |

**요청 — `data`:**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| reactionId | String | ✅ | 리액션 | CODE-010 3종 — 그 외 값·자유 텍스트 거부 |

**응답 — 실패:** `INVALID_REACTION` (UC-017 E1), 빈도 초과는 무시 (UC-017 E2).

### API-210: `quit`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-210 |
| Method | WS C→S |
| Endpoint | `/ws/room/:roomId` · `type: "quit"` |
| 설명 | 연습 일시정지 메뉴 "그만하기" — 세션 종료 후 API-262(`mode: practice`, 개인 기록) |
| 연결 REQ | FR-023 |
| 연결 UC | UC-006 6a |
| 인증 필요 | ✅ (세션) |
| 연결 TBL | TBL-003 |

**요청 — `data`:** 빈 객체 `{}`.
**응답 — 실패:** `NOT_ALLOWED_IN_MODE` (대전 방에서 `quit` — 대전 이탈은 연결 종료로만, FR-009).

### API-251: `joined`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-251 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "joined"` |
| 설명 | 방 입장 확인 — 대전 화면 골격 준비 |
| 연결 REQ | FR-008 |
| 연결 UC | UC-003, UC-004, UC-005, UC-006 |
| 인증 필요 | — |
| 연결 TBL | TBL-001 |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| roomId | String | 방 ID |
| mode | String | CODE-001 |
| slot | Integer | 내 슬롯 |
| players | Array | `{ slot, nickname(봇은 null), heroId, isBot, botLevel }` 목록 |
| bestOf | Integer | 3 (연습은 1) |

### API-252: `start`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-252 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "start"` |
| 설명 | 라운드 시작 (FR-008 원문 `start { seed, countdown }`). 두 플레이어에게 같은 시드 |
| 연결 REQ | FR-001, FR-005, FR-010, FR-047, FR-062 |
| 연결 UC | UC-003 (6), UC-015 (4) |
| 인증 필요 | — |
| 연결 TBL | TBL-003 (단계·은혜), TBL-108 |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| round | Integer | 라운드 번호 1~3 |
| seed | Integer | 32비트 부호 없는 정수 (`crypto.getRandomValues`) |
| countdown | Integer | 3000 (ms) |
| startAt | Integer | 카운트다운 종료 서버 시각 |
| stage | Integer | 해금 단계 CODE-012 (대전은 낮은 쪽) |
| grace | Boolean | 이 라운드 내 은혜 보정 여부 (내 것만 — 상대에게 비공개, "은은하게 표시") |
| matchElapsedMs | Integer | 경기 시작 후 경과 ms (중력 곡선 — D-23) |
| score | Array | 현재 라운드 승수 [슬롯1, 슬롯2] |

```json
{ "type": "start", "success": true, "data": { "round": 2, "seed": 2718281828, "countdown": 3000, "startAt": 1792420934000, "stage": 2, "grace": false, "matchElapsedMs": 96250, "score": [1, 0] } }
```

### API-253: `opponentState`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-253 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "opponentState"` |
| 설명 | 상대 보드 스냅샷 중계 (R-14). 봇 대전은 서버 봇 보드를 같은 형식으로 12Hz 송신 |
| 연결 REQ | FR-006 |
| 연결 UC | UC-007 (7) |
| 인증 필요 | — |
| 연결 TBL | — |

**응답 — `data`:** `{ slot, seq, board, active, score }` (API-203 필드 중 `garbageIn` 제외).

### API-254: `attack`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-254 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "attack"` |
| 설명 | 받는 공격 (FR-008 원문 `attack { spiritId, garbage, holeColumn, duration }`). 클라이언트는 쓰레기를 대기 큐(경고 게이지)에 넣고 다음 비삭제 고정 때 삽입, 영 효과는 즉시 적용 |
| 연결 REQ | FR-024~031, FR-049, FR-053, FR-054, NFR-002 |
| 연결 UC | UC-008 (6~9) |
| 인증 필요 | — |
| 연결 TBL | TBL-103, TBL-108 |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| attackId | Integer | 방 내 공격 순번 |
| fromSlot | Integer | 보낸 슬롯 |
| spiritId | String 또는 null | 적용된 영 (방해 상한·방어로 미적용이면 null) |
| garbage | Integer | 쓰레기 줄 수 (방어·은혜 반영 후, 0 가능) |
| holeColumn | Integer | 구멍 열 0~9 |
| duration | Integer | 영 효과 지속 ms (즉시형·줄 단위형은 0) |
| params | Object | 영 효과 매개변수 (예: wind `{ "direction": "left" }`, abaddon `{ "columns": [1,4,8] }`, wickedness `{ "clearsToExpire": 4 }`) |
| reflected | Boolean | 성령의 검으로 되돌아온 공격 여부 |

### API-255: `effect`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-255 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "effect"` |
| 설명 | 천사·갑주·스킬·예수님·특수 칸·상쇄·공격 발사 연출과 적용 지시 (FR-008 원문 "effect: 천사, 갑주, 스킬 발동 연출"). 양측(또는 대상 측)에 송신 |
| 연결 REQ | FR-014~017, FR-025, FR-035, FR-037, FR-039, FR-045, FR-046, FR-053, FR-054 |
| 연결 UC | UC-008, UC-009, UC-010, UC-011, UC-012, UC-014 |
| 인증 필요 | — |
| 연결 TBL | TBL-101, TBL-102, TBL-104, TBL-106 |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| kind | String | CODE-013 |
| id | String | 스킬·천사·갑주·영·특수 칸 ID (`jesus`는 `overcome_the_world`) |
| bySlot | Integer | 발동 슬롯 |
| targetSlot | Integer | 적용 대상 슬롯 |
| action | Object | 적용 지시 (TBL-101·102·104 `action`과 같은 형식, 예: `{ "type": "removeBottomGarbage", "rows": 3 }`, offset `{ "type": "offset", "rows": 2 }`, jesus `{ "type": "overcome", "clearCurses": true, "clearVision": true, "removeGarbageRows": 2 }`) |
| verseRef | String 또는 null | 자막 구절 (TBL-106) |
| durationMs | Integer | 연출·효과 지속 |

```json
{ "type": "effect", "success": true, "data": { "kind": "jesus", "id": "overcome_the_world", "bySlot": 2, "targetSlot": 2, "action": { "type": "overcome", "clearCurses": true, "clearVision": true, "removeGarbageRows": 3 }, "verseRef": "John 16:33", "durationMs": 4000 } }
```

> 예수님 이벤트(FR-039, C-002): 서버가 (게이지 100 + 최신 `state`에서 위험선 진입)을 감지하면 경기당 1회 발동, 게이지 미소모, 쓰레기 줄 절반(내림) 제거 — 클라이언트는 얼굴 없는 빛·실루엣 연출과 John 16:33·John 1:5 표시.

### API-256: `playerStatus`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-256 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "playerStatus"` |
| 설명 | 내 서버 측 상태가 바뀔 때마다 나에게만 송신 (FR-033 "게이지 값은 서버가 관리하고 화면에 표시") |
| 연결 REQ | FR-033, FR-034, FR-035, FR-036, FR-062 |
| 연결 UC | UC-009, UC-010, UC-011 |
| 인증 필요 | — |
| 연결 TBL | TBL-108 |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| faith | Integer | 0~100 |
| cooldowns | Object | 스킬 ID → 남은 ms (0이면 사용 가능) |
| armor | Array | 보유 갑주 ID 목록 (종류별 최대 1) |
| wards | Object | 장전된 방어: `{ "vision": 1, "shield": true, "reflect": false, "breastplate": false, "michael": 0 }` |
| sealedMs | Integer | 천사 봉인 남은 ms |
| pendingGarbage | Integer | 서버 장부상 대기 쓰레기 줄 |
| grace | Boolean | 은혜 보정 적용 중 |
| jesusUsed | Boolean | 이번 경기 예수님 이벤트 사용 여부 |

### API-257: `quizStart`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-257 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "quizStart"` |
| 설명 | 말씀 대결 개시 — 양측 동시 송신, 두 보드 정지. 정답은 포함하지 않음(R-11) |
| 연결 REQ | FR-040, FR-041, FR-043 |
| 연결 UC | UC-013 (2~3) |
| 인증 필요 | — |
| 연결 TBL | TBL-107 |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| quizId | String | 문항 ID |
| type | String | person·event·fill_blank |
| difficulty | Integer | 1~3 |
| question | String | 문제 |
| choices | Array | 4개 보기 |
| timeLimitMs | Integer | 10000 |
| deadlineAt | Integer | 서버 마감 시각 |
| trigger | String | `wordBlock` 또는 `timer` |

### API-258: `quizLock`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-258 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "quizLock"` |
| 설명 | 오답 응답자에게 3초 잠금 통지 |
| 연결 REQ | FR-041 |
| 연결 UC | UC-013 E1 |
| 인증 필요 | — |
| 연결 TBL | TBL-108 |

**응답 — `data`:** `{ quizId: String, lockedMs: 3000 }`

### API-259: `quizResult`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-259 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "quizResult"` |
| 설명 | 판정·보상·해설·니어미스. `resumeAt`에 두 보드 동시 재개 |
| 연결 REQ | FR-041, FR-042, C-003 |
| 연결 UC | UC-013 (5~8, 5a) |
| 인증 필요 | — |
| 연결 TBL | TBL-107, TBL-106, TBL-104 |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| quizId | String | 문항 |
| correctIndex | Integer | 정답 0~3 |
| winnerSlot | Integer 또는 null | 첫 정답자 (아무도 못 맞히면 null — 보상 없음) |
| reward | Object 또는 null | `{ "type": "faith", "amount": 50 }` 또는 `{ "type": "armor", "armorId": "helmet_of_salvation" }` |
| deltaMs | Integer 또는 null | 둘 다 정답일 때 늦은 쪽 기준 도착 시간 차 (니어미스 "0.12초 차이!") |
| explanation | String | 해설 |
| verse | Object | `{ ref, kjv, ko }` — KJV 원문 + 직접 번역 + 출처 |
| resumeAt | Integer | 재개 서버 시각 (결과 표시 3000ms 후) |

### API-260: `reaction` (S→C)

| 항목 | 내용 |
|:---|:---|
| API-ID | API-260 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "reaction"` |
| 설명 | 상대 리액션을 상대 보드 근처에 잠깐 표시 |
| 연결 REQ | FR-064 |
| 연결 UC | UC-017 (3) |
| 인증 필요 | — |
| 연결 TBL | — |

**응답 — `data`:** `{ fromSlot: Integer, reactionId: String }`

### API-261: `roundEnd`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-261 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "roundEnd"` |
| 설명 | 라운드 승패 (FR-008 원문 `roundEnd: 승패, 통계`). 2승 전이면 `nextRoundAt` 후 새 시드로 API-252 |
| 연결 REQ | FR-007, FR-067 |
| 연결 UC | UC-015 (2~4) |
| 인증 필요 | — |
| 연결 TBL | TBL-003 (메모리 누적 — 경기 종료 시 저장) |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| round | Integer | 라운드 번호 |
| winnerSlot | Integer | 승자 |
| reason | String | `topout` |
| score | Array | 누적 승수 |
| stats | Object | 라운드 통계 (슬롯별 `linesCleared`, `maxCombo`, `attackSent`) |
| nextRoundAt | Integer 또는 null | 다음 라운드 시작 서버 시각 (경기 종료면 null) |

### API-262: `matchEnd`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-262 |
| Method | WS S→C |
| Endpoint | `/ws/room/:roomId` · `type: "matchEnd"` |
| 설명 | 경기 종료 (FR-008 원문 `matchEnd: 승패, 통계`). 서버가 저장소에 기록(D-20)한 뒤 송신. 연습 세션 종료도 같은 메시지(`mode: practice`, `winnerSlot: null`) |
| 연결 REQ | FR-007, FR-009, FR-063, FR-065, FR-066, FR-068, FR-070 |
| 연결 UC | UC-015 (5~8), UC-016, UC-006 (6) |
| 인증 필요 | — |
| 연결 TBL | TBL-002, TBL-003, TBL-004, TBL-106 |

**응답 — `data`:**
| 필드 | 타입 | 설명 |
|:---|:---|:---|
| mode | String | CODE-001 |
| winnerSlot | Integer 또는 null | 경기 승자 (연습 null) |
| reason | String | `topout` · `disconnect` · `practiceEnd` |
| score | Array | 최종 승수 |
| durationMs | Integer | 경기 시간 |
| stats | Object | TBL-002 stats 구조 (내·상대) |
| ratingDelta | Integer 또는 null | 내 레이팅 변화 (사람 대 사람만) |
| rating | Integer 또는 null | 갱신 후 레이팅 |
| record | Object | 개인 기록 `{ maxCombo, attackPerMin, quizAccuracy }` (연습은 `playTimeMs` 포함) |
| growth | Object 또는 null | 직전 기록 대비 차이 (첫 기록이면 null) |
| achievements | Array | 이번에 새로 달성한 업적 ID |
| verseRef | String | 대표 구절 (architecture §11 #14) |
| victoryVerseRef | String 또는 null | 승자 화면 구절 `2 Timothy 4:7` (FR-007) |
| saved | Boolean | 저장 성공 여부 — false면 "기록 저장에 실패했습니다" (UC-015 E2) |

```json
{ "type": "matchEnd", "success": true, "data": { "mode": "random", "winnerSlot": 1, "reason": "disconnect", "score": [1, 0], "durationMs": 133420, "stats": { "p1": { "maxCombo": 5, "linesCleared": 31, "tetrises": 2, "attackSent": 14, "attackPerMin": 6.3, "quizCorrect": 1, "quizAnswered": 1, "skillsUsed": 1, "angelsUsed": 0, "armorUsed": 1, "jesusEvent": false }, "p2": { "maxCombo": 3, "linesCleared": 22, "tetrises": 0, "attackSent": 7, "attackPerMin": 3.1, "quizCorrect": 0, "quizAnswered": 1, "skillsUsed": 0, "angelsUsed": 1, "armorUsed": 0, "jesusEvent": false }, "rounds": [ { "round": 1, "winnerSlot": 1, "durationMs": 98120 } ], "quizCount": 1, "verseRef": "Ephesians 6:16" }, "ratingDelta": 16, "rating": 1016, "record": { "maxCombo": 5, "attackPerMin": 6.3, "quizAccuracy": 1.0 }, "growth": { "maxCombo": 2, "attackPerMin": 1.4, "quizAccuracy": 0.5 }, "achievements": [], "verseRef": "Ephesians 6:16", "victoryVerseRef": "2 Timothy 4:7", "saved": true } }
```

**이탈 처리 (FR-009, UC-016):** `start` 이후 `matchEnd` 이전에 한 사람의 소켓이 닫히면(`webSocketClose`·`webSocketError`) 즉시 이탈 판정 → 남은 쪽 승리(`reason: disconnect`), 이탈자 패배 기록, 사람 대 사람이면 Elo 반영. 봇 대전에서 사람이 이탈하면 봇 승리로 기록. 두 사람 모두 끊기면 무효(기록 없음 — UC-016 E1). 진행 중 말씀 대결은 취소 (UC-013 E2). 경기 복귀는 없다 (N-02 보존).

### API-290: `error`

| 항목 | 내용 |
|:---|:---|
| API-ID | API-290 |
| Method | WS S→C |
| Endpoint | 두 소켓 공통 · `type: "error"` |
| 설명 | 거부·오류 통지 (§2.4 실패 봉투). 클라이언트는 `ref`(거부된 메시지 종류)와 `code`로 화면 피드백을 고른다 |
| 연결 REQ | NFR-003, FR-032, FR-034 |
| 연결 UC | 전 UC의 예외 경로 |
| 인증 필요 | — |
| 연결 TBL | — |

**응답 — `error`:** `{ code: String(§4), message: String, ref: String, retryAfterMs: Integer(선택) }`

---

## 4. 에러 코드 정의

### 4.1 HTTP 상태코드

| HTTP | 의미 | 사용 |
|:---:|:---|:---|
| 200 | 성공 | API-002~004 |
| 201 | 생성 | API-001 |
| 101 | 프로토콜 전환 | API-005, API-006 |
| 400 | 잘못된 요청 | INVALID_BODY, INVALID_NICKNAME, INVALID_PARAM |
| 401 | 인증 실패 | UNAUTHORIZED, INVALID_TOKEN |
| 403 | 금지 | ORIGIN_FORBIDDEN |
| 404 | 없음 | NOT_FOUND(정의되지 않은 경로), ROOM_NOT_FOUND |
| 405 | 메서드 불가 | METHOD_NOT_ALLOWED |
| 409 | 충돌 | NICKNAME_TAKEN |
| 426 | 업그레이드 필요 | UPGRADE_REQUIRED |
| 429 | 빈도 초과 | RATE_LIMITED |
| 500 | 서버 오류 | INTERNAL_ERROR ("잠시 후 다시 시도하세요" — 내부 정보 미포함) |
| 503 | 저장소 불가 | STORE_UNAVAILABLE |

### 4.2 비즈니스 에러 코드 (HTTP·WS 공통 — CODE-015)

| 에러 코드 | 채널 | 사용자 문구 (클라이언트 표시) | 발생 API |
|:---|:---|:---|:---|
| INVALID_BODY | HTTP | 요청 형식이 올바르지 않습니다. | API-001 |
| INVALID_NICKNAME | HTTP | 닉네임 규칙(길이·문자)을 확인하세요. | API-001 |
| NICKNAME_TAKEN | HTTP | 이미 사용 중인 닉네임입니다. | API-001 |
| UNAUTHORIZED | HTTP | 입장 정보가 필요합니다. | API-002, API-003 |
| INVALID_TOKEN | HTTP·WS | 입장 정보가 올바르지 않습니다. | API-002~004, API-101, API-102, API-201 |
| INVALID_PARAM | HTTP | 요청 값이 올바르지 않습니다. | API-003, API-006 |
| NOT_FOUND / METHOD_NOT_ALLOWED | HTTP | 요청을 처리할 수 없습니다. | 라우터 |
| ORIGIN_FORBIDDEN / UPGRADE_REQUIRED | HTTP | 연결할 수 없습니다. | API-005, API-006 |
| ROOM_NOT_FOUND | HTTP | 방을 찾을 수 없습니다. | API-006 |
| RATE_LIMITED | HTTP·WS | 요청이 너무 잦습니다. | 전 API |
| STORE_UNAVAILABLE | HTTP·WS | 기록 저장소에 연결할 수 없습니다. | API-001~004, API-101 |
| INTERNAL_ERROR | HTTP·WS | 잠시 후 다시 시도하세요. | 전 API |
| INVALID_MESSAGE | WS | 잘못된 메시지입니다. | 전 C→S |
| NOT_AUTHENTICATED | WS | 입장 정보가 필요합니다. | API-005, API-006, 인증 전 메시지 |
| ALREADY_QUEUED | WS | 이미 상대를 찾는 중입니다. | API-101, API-102 |
| INVITE_NOT_FOUND | WS | 초대 코드를 찾을 수 없습니다. | API-101 |
| ROOM_FULL | WS | 이미 가득 찬 방입니다. | API-101 |
| OWN_INVITE | WS | 내가 만든 초대 코드입니다. | API-101 |
| CODE_EXHAUSTED | WS | 초대 코드를 만들지 못했습니다. 다시 시도하세요. | API-102 |
| NOTHING_TO_CANCEL | WS | 취소할 대기가 없습니다. | API-103 |
| NOT_IN_ROOM | WS | 이 방의 참가자가 아닙니다. | API-201 |
| HERO_MISMATCH | WS | 선택한 위인이 일치하지 않습니다. | API-201 |
| DUPLICATE_SESSION | WS | 이미 다른 창에서 접속 중입니다. | API-201 |
| OPPONENT_LEFT | WS | 상대가 나갔습니다. | API-201, API-202 |
| GAME_NOT_RUNNING | WS | (표시 없음 — 입력 무시) | API-202, API-204~207 |
| SEQ_REJECTED | WS | (표시 없음 — 서버 로그) | API-204, API-207 |
| PROGRESS_REJECTED | WS | (표시 없음 — 서버 로그) | API-204 |
| FAITH_INSUFFICIENT | WS | 믿음이 부족합니다. | API-205 |
| COOLDOWN | WS | 아직 다시 쓸 수 없습니다. (남은 시간 표시) | API-205 |
| ANGEL_SEALED | WS | 천사 소환이 봉인되었습니다. (남은 시간 표시) | API-205 |
| INVALID_SKILL | WS | 사용할 수 없는 스킬입니다. | API-205 |
| NOT_ALLOWED_IN_MODE | WS | 이 모드에서는 쓸 수 없습니다. | API-205, API-206, API-210 |
| ARMOR_NOT_OWNED | WS | 보유한 갑주가 없습니다. | API-206 |
| QUIZ_CLOSED | WS | (표시 없음 — 응답 무시) | API-208 |
| QUIZ_LOCKED | WS | 잠시 후 다시 고를 수 있습니다. | API-208 |
| QUIZ_ALREADY_ANSWERED | WS | (표시 없음) | API-208 |
| INVALID_REACTION | WS | (표시 없음 — 거부) | API-209 |
| BOT_FAILURE | WS | 경기를 계속할 수 없습니다. | API-262 대체 — 봇 처리 오류 시 경기 무효·전적 미기록 (UC-005 E2) |

### 4.3 WebSocket 종료 코드

| 코드 | 의미 | 클라이언트 처리 |
|:---:|:---|:---|
| 1000 | 정상 종료 (경기 종료·방 종료·`OPPONENT_LEFT`) | 결과 화면 또는 로비 |
| 1001 | 서버 종료 | 로비 + 재연결(로비 소켓만 — partysocket) |
| 4001 | 인증 실패 (`INVALID_TOKEN`·`NOT_AUTHENTICATED`) | TBL-201 삭제 후 입장 화면 |
| 4003 | 방 참가 자격 없음 (`NOT_IN_ROOM`·`HERO_MISMATCH`·`DUPLICATE_SESSION`) | 로비 |
| 4004 | 방 없음 | 로비 |
| 4008 | 빈도 위반 누적 | 로비 + 안내 |

> GameRoom 소켓은 partysocket 자동 재연결을 **끈다** (대전 중 끊김 = 이탈 — OQ #18, N-02 보존). Matchmaker 소켓만 자동 재연결하며, 재연결 후 로비 상태로 시작한다 (UC-003 E1).

---

## 5. 인증/인가 규격 (봉인의 율법 제4계명·제7계명 연동)

### 5.1 게스트 토큰 수명주기

| 단계 | 규격 |
|:---|:---|
| 발급 | API-001 성공 시 Worker가 `crypto.getRandomValues(32바이트)` → base64url 43자 토큰 생성 |
| 저장 (서버) | `token_hash = hex(SHA-256(token))`만 TBL-001에 저장 — 평문 토큰은 응답 1회 후 서버에 남지 않음 (봉인 제3계명) |
| 저장 (브라우저) | TBL-201 `swt.guest` |
| 제시 | HTTP `Authorization: Bearer`, WS 첫 메시지 `token` |
| 검증 | 형식 검사 → SHA-256 → `idx_profiles_token_hash` 조회 → 일치 프로필의 `guestId` |
| 만료 | 시간 만료 없음 (게스트 정체성 = 브라우저 저장 수명). 서버 측 무효화는 유출 대응 절차에서만 (architecture §9 제9계명) |
| 분실 | 새 닉네임으로 새 게스트 시작 (spec-tablet §9.11 라운드 3) |
| 전송 보호 | 운영 HTTPS/WSS. 로컬은 루프백 바인딩 |

### 5.2 인가 매트릭스 (최소 권한 — 제7계명)

| 자원 | 읽기 | 쓰기 |
|:---|:---|:---|
| 내 프로필 (TBL-001) | 본인 토큰 (API-002) | 생성만 (API-001). 레이팅은 서버(GameRoom 결과 기록)만 |
| 다른 사람 프로필 | 닉네임·레이팅만 (API-004 랭킹, API-153 상대 정보) | 불가 |
| 전적 (TBL-002) | 본인이 참여한 경기만 (API-003) | 서버만 (D-20) |
| 진행 기록·업적 (TBL-003·004) | 본인 — `matchEnd`의 `record`·`growth`·`achievements`로만 | 서버만 |
| 초대 코드 (TBL-005) | 코드를 아는 사람이 입장 시도 (API-101) | 방장 생성·취소 (API-102·103), 서버 만료 |
| 게임 판정 상태 | 본인 `playerStatus`, 상대는 보드 스냅샷만 (상대 게이지·은혜·갑주 비공개) | 서버만 (§2.8) |
| Supabase | 클라이언트 접근 경로 없음 (anon 키 미배포), RLS 전면 거부 + Worker service role | Worker만 |

### 5.3 최소 수집 (제4계명)

- 요청 본문으로 받는 개인 식별 정보는 **닉네임 1개**뿐이다. 이메일·실명·기기 식별자를 받는 API는 없다 (NFR-008).
- 빈도 제한용 출처 주소는 메모리 카운터에서만 쓰고 저장·로그하지 않는다.
- 응답에 다른 사람의 게스트 ID를 노출하는 곳: 없음 (랭킹 `isMe`는 서버가 계산한 불리언). 단, TBL-006 뷰의 `guest_id`는 서버 내부에서만 사용.

### 5.4 클라이언트 측 보호

| 항목 | 규격 |
|:---|:---|
| XSS (localStorage 토큰 보호) | 닉네임·문항 등 모든 동적 텍스트는 `textContent`로만 삽입 (`innerHTML` 금지), `index.html`에 CSP 메타: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'` |
| 비밀 | 클라이언트 번들에 비밀 0개 — 빌드 산출물에서 `SUPABASE`·`service_role` 문자열 검사 (NFR-004 측정) |
| 외부 리소스 | 폰트·그래픽·사운드 외부 요청 0건 (NFR-005) |

---

## 6. 정경화 조건

- [x] 모든 API에 요청/응답 상세 정의 완료 (§3 — HTTP 4, WS 엔드포인트 2, WS 메시지 24, 공통 에러 1)
- [x] 공통 응답 형식 준수 확인 (§2.3 HTTP, §2.4 WS 봉투)
- [x] 모든 API에 연결 REQ, UC, TBL 기재 (§3 각 표 — 테이블이 없는 메시지는 "—"와 사유)
- [x] 에러 코드 정의 완료 (§4 — HTTP 13, 비즈니스 40, WS 종료 6)
- [x] 인증 필요 API에 인증 규격 명시 (§2.2, §5)
- [x] 봉인의 율법 제4계명(최소 수집)·제7계명(접근 통제) 준수 (§5.2, §5.3)
- [x] RTM에 모든 API-ID 등재 (`rtm-covenant-언약추적.md` §1 API-ID 열)
