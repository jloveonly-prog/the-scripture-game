---
id: SKILL-05
name: "광야 (Wilderness)"
phase: "B_구현"
step: "05.test-wilderness-광야"
depends_on: [SKILL-04, covenant-book-언약책]
---

# SKILL-05: 광야 (05.test-wilderness-광야)

> *"Think it not strange concerning the fiery trial which is to try you."* — 1 Peter 4:12 (KJV)

## 📋 목적 (Purpose)
구현된 코드의 무결성과 성능을 **불의 시험**으로 검증한다. 테스트 시나리오를 작성하고 실행하며, 실패 시 Phase 4로 돌아가 성화의 회개(디버깅)를 반복한다.

## 🔗 사전 조건
- ✅ SKILL-04 완료 (코딩 완료)
- 📂 `fruit-열매/` 소스 코드 존재

## ⚔️ 전신갑주 착용

🎭 **수석 QA 엔지니어**로 행동하라.
- **법의학적 현장 재구성**: 버그를 '사건 현장'으로 대하며 에러 로그를 시간대별로 역추적
- **화이트해커의 침투 테스트 사고법**: 시스템을 다운시킬 근본 원인을 집요하게 추적

## 📎 태깅 대상

**필수:**
- `@fruit-열매/` (소스 코드)
- `@bible-성경/01/spec-tablet-명세서.md`
- `@statute-율법/05.test-wilderness-광야/*`

## 💬 실행 프롬프트

```markdown
# [광야] 05.test — 불의 시험

구현된 fruit-열매/ 소스 코드를 검증하라.

## ⚠️ 시험 전 선행: 이상 징후 먼저 스캔하라

> *"Prove all things; hold fast that which is good."* — 1 Thessalonians 5:21 (KJV)

체계적 테스트에 들어가기 전에, 먼저 "왜 이것만 다른가?"를 질문하라:

```
## 이상 징후 스캔
| 항목 | 스캔 질문 | 발견 여부 |
|:--|:--|:--|
| 코드 복잡도 | 전체 코드 중 유독 길거나 복잡한 함수가 있는가? | ✅/⚠️ |
| API 일관성 | 전체 API 중 응답 구조가 혼자만 다른 엔드포인트가 있는가? | ✅/⚠️ |
| 설계-코드 일치 | bible-성경 설계와 다르게 구현된 모듈이 있는가? | ✅/⚠️ |
| REQ 연결 | 주석된 REQ-ID가 없는 코드가 있는가? (근거 불명) | ✅/⚠️ |
```
⚠️ 마크된 항목을 제일 먼저 집중 검증하라. 이상 징후를 먼저 잡으면 테스트 범위가 90% 줄어든다.

## ⚠️ 0단계: 3겹 검증 — 세 방향에서 동시에 시험하라

> *"Prove all things; hold fast that which is good."* — 1 Thessalonians 5:21

### 🧪 1겹: 자동화 단위/통합 테스트 (코드 정합성)

#### ⚠️ 필수 — 이 단계를 건너뛰면 Phase 5는 실패다

**테스트 코드를 작성하고, 실행하고, 전체 통과를 확인하라.**
curl 수동 실행은 자동화 테스트를 **대체하지 않는다.**

#### 테스트 프레임워크 선택

| 기술 스택 | 자동화 테스트 프레임워크 | 실행 명령 |
|:---|:---|:---|
| **Node.js / TypeScript** | **`node:test` (내장, 권장)** — 설치 불필요 | `node --test` 또는 `tsx --test` |
| **Java / Spring** | JUnit 5 + Mockito | `./mvnw test` 또는 `./gradlew test` |
| **Python** | pytest | `pytest -v` |
| **Go** | testing (내장) | `go test ./...` |
| **C# / .NET** | xUnit 또는 NUnit | `dotnet test` |
| **Rust** | 내장 (#[test]) | `cargo test` |
| **PHP** | PHPUnit | `./vendor/bin/phpunit` |

> **왜 `node:test`인가?** Node.js v18+에 내장. npm install 불필요. 외부 의존성 0. 호환성 오류 원천 차단.
> vitest/Jest는 버전 호환 오류 위험이 있다 (벤치마크에서 실제 발생). 내장 도구를 쓰라.

#### 필수 실행 절차

**1단계: 테스트 파일 생성** — `fruit-열매/tests/` 에 작성하라.

**2단계: 테스트 범위 — 2-tier 필수 (DB 단위 + HTTP 통합)**

> 🚨 **DB 단위 테스트만으로는 불합격. HTTP 통합 테스트를 반드시 포함하라.**

| Tier | 범위 | 필수 | 검증 대상 |
|:---|:---|:---:|:---|
| **Tier 1: DB 단위** | DB CRUD 동작 | ✅ | 쿼리 함수가 올바른 데이터를 반환하는가 |
| **Tier 2: HTTP 통합** | 라우트/엔드포인트 | ✅ | HTTP 요청 → 응답 상태코드 + 본문 검증 |

**Tier 2 HTTP 통합 테스트 코드 패턴 (언어별):**

```typescript
// === Node.js (Hono) — node:test ===
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/index'  // ← SKILL-04에서 export 필수

describe('HTTP 통합 테스트', () => {
  test('GET / → 200', async () => {
    const res = await app.request('/')
    assert.equal(res.status, 200)
  })
  test('GET /board → 200', async () => {
    const res = await app.request('/board')
    assert.equal(res.status, 200)
  })
  test('POST /board 빈 제목 → 400', async () => {
    const res = await app.request('/board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ title: '', content: '내용' }).toString()
    })
    assert.equal(res.status, 400)
  })
  test('GET /board/99999 → 404', async () => {
    const res = await app.request('/board/99999')
    assert.equal(res.status, 404)
  })
})
```

```java
// === Java (Spring Boot) — JUnit 5 + MockMvc ===
@SpringBootTest
@AutoConfigureMockMvc
class BoardControllerTest {
    @Autowired MockMvc mvc;
    @Test void getBoard_returns200() throws Exception {
        mvc.perform(get("/board")).andExpect(status().isOk());
    }
    @Test void postBoard_emptyTitle_returns400() throws Exception {
        mvc.perform(post("/board").param("title", "").param("content", "내용"))
           .andExpect(status().isBadRequest());
    }
}
```

```python
# === Python (FastAPI) — pytest + TestClient ===
from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)

def test_get_board():
    r = client.get("/board")
    assert r.status_code == 200

def test_post_board_empty_title():
    r = client.post("/board", data={"title": "", "content": "내용"})
    assert r.status_code == 400
```

```go
// === Go (Gin) — httptest ===
func TestGetBoard(t *testing.T) {
    router := SetupRouter()
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("GET", "/board", nil)
    router.ServeHTTP(w, req)
    assert.Equal(t, 200, w.Code)
}
```

> 위는 언어별 참조 패턴이다. 기술 스택에 맞는 패턴을 선택하되,
> **HTTP 요청 → 상태코드 검증**이라는 구조는 모든 언어에서 동일하다.

**3단계: 격리** — 인메모리 DB 또는 테스트 전용 DB 사용. 실서버 의존 금지.

**4단계: 매니페스트 test 명령으로 실행** — `npm test` (또는 해당 언어 명령)로 실행 → **전체 통과 확인.**
Phase 4(SKILL-04)에서 등록한 test 명령으로 테스트를 돌려라.
실패 시 Phase 4(회개)로 돌아가 수정 후 재실행.

> ❌ DB 단위 테스트만 작성하고 HTTP 통합 테스트를 건너뛴 경우 → **1겹 미이행. Phase 5 불합격.**
> ❌ 테스트 파일을 작성하지 않고 curl만 실행한 경우 → **1겹 미이행. Phase 5 불합격.**

### 📋 2겹: RTM 기반 인수 테스트 (설계 방식 검증)

`bible-성경/01/rtm-covenant-언약추적.md`의 **REQ-ID 원문**을 기준으로 검증하라.

**⚠️ REQ-ID 원문 그대로 시나리오를 작성하라. AI 해석을 추가하지 마라.**

**⚠️ RTM 오염 경고**: RTM이 spec.md(오해석된 설계)를 기반으로 작성됐다면 RTM 자체가 오염됐다.
RTM의 REQ-ID 원문이 req.md 원문과 일치하는지 먼저 교차 확인하라.
RTM 원문 ≠ req.md 원문이면 → 2겹 결과를 신뢰하지 말고 3겹 결과를 우선하라.

#### ⭐ 성전 꼭대기 시험 — Spec 인용 변조 탐지

> *"Cast thyself down: for it is written..."* — Matthew 4:6
>
> **사탄도 "기록되었으되"를 사용한다. Spec을 인용하되 단어를 바꿔 거짓 근거를 만든다.**
> 이것이 유다형 공격의 원형 — 겉으로 Spec을 따르는 척하지만 핵심이 변조된 패턴이다.

RTM의 각 REQ 원문을 req.md와 **단어 단위로** 대조하라:

```
## Spec 인용 변조 탐지 체크리스트

| REQ-ID | req.md 원문 (정확한 문자) | RTM에 기록된 원문 | 변조 여부 |
|:---|:---|:---|:---:|
| REQ-001 | {req.md 그대로 복사} | {RTM에 기록된 문구} | ✅ 일치 / ❌ 변조 |

변조 탐지 패턴:
  - 동사 교체: "스캔해서" → "스캔 및 생성하여" ← 범위 확장
  - 조건 추가: "게시판 1개" → "게시판 1개 (CRUD 포함)" ← 해석 주입
  - 단어 삭제: "구글 QR code 스캔해서" → "QR 스캔" ← 맥락 축소
  - 순서 변경: 주어·목적어 위치 변경으로 행위 방향 역전
```

> ❌ 변조 발견 시 → RTM을 req.md 원문으로 즉시 교정 후 설계 재검토
> ⚠️ "더 명확하게 쓰려고" 바꿨어도 변조는 변조다 — Spec 원문이 절대 기준

```
## RTM 인수 테스트
| REQ-ID | RTM 원문 | req.md 원문과 일치? | 테스트 시나리오 | 결과 |
|:--|:--|:--:|:--|:--:|
| REQ-001 | {rtm.md REQ-001 원문} | ✅/❌ | Given {사용자 행위} / When {조작} / Then {결과} | ✅/❌ |
```

### 🔍 3겹: req.md 원점 검증 (설계 문서 참조 금지)

> *"Study to shew thyself approved unto God, a workman that needeth not to be ashamed, **rightly dividing the word of truth**."* — 2 Timothy 2:15 (KJV)

**bible-성경/ 설계 문서를 닫아라.** `hearing-들음/req.md`만 보고 실행 중인 서버를 검증하라.
"req.md를 처음 본 사람이 이 앱을 쓰면 만족하는가?" 관점으로:

**⚠️ 핵심 동사를 반드시 검증 항목으로 포함하라 (이것이 가장 먼저다)**
req.md에서 동사(행위어)를 먼저 추출하고, 그 동사가 실제로 구현됐는지 검증하라.
동사를 검증 항목에서 누락하면 방향 오해석을 통과시킨다.

```
## 3겹 검증 항목
| req.md 원문 | 추출된 동사(How) | 검증 질문 | 결과 |
|:--|:--|:--|:--:|
| {req.md 문장} | {핵심 동사} | {동사}하는 기능이 코드에 존재하는가? | ✅/❌ |
```

```bash
# 실제 HTTP로 요구사항 충족 여부 확인
curl GET /   → req.md가 요구한 행위(동사)가 화면에 존재하는가?
```

⚠️ **2겹이 통과해도 3겹이 실패하면** → 설계 해석 자체가 틀린 것이다. Phase 1(들음)부터 재검토하라.

### 🚫 범위 초과 검증 (Scope Creep 차단)

> *"What thing soever I command you, observe to do it: thou shalt not add thereto, nor diminish from it."* — Deuteronomy 12:32 (KJV)

구현된 **모든 기능**을 목록화하고, req.md와 대조하라.
**req.md에 없는 기능은 할루시네이션(죄)이다. 제거하거나 사용자 승인을 받아라.**

```
## 범위 검증 체크리스트
| 구현된 기능 | req.md 근거 | 판정 |
|:--|:--|:--:|
| {기능 1} | {req.md 어느 문장?} | ✅ 근거 있음 / ❌ 없음(제거) |
| {기능 2} | ... | |
```

→ ❌ 항목이 있으면 해당 기능을 제거하라. 더하지도 빼지도 말라 (신명기 12:32).

→ 인수 테스트 코드는 `fruit-열매/tests/acceptance/`에 작성하라.

### 🏋️ 4겹: 성능 테스트 (Performance Test)

> *"Thou shalt not tempt the Lord thy God."* — Matthew 4:7 (KJV)

기능이 동작해도 **느리면 사용자가 떠난다.** 아래 항목을 측정하라:

```
## 성능 테스트 체크리스트
| 항목 | 기준 | 측정 결과 | 판정 |
|:--|:--|:--|:--:|
| 페이지 로드 시간 | < 3초 (또는 프로젝트 기준) | {측정값} | ✅/❌ |
| API 응답 시간 | < 500ms (또는 프로젝트 기준) | {측정값} | ✅/❌ |
| 동시 요청 처리 | 기준 TPS 달성 | {측정값} | ✅/❌ |
| 메모리 누수 | 장시간 실행 후 메모리 안정 | {측정값} | ✅/❌ |
```

> ⚠️ 성능 기준은 Phase 1(들음)의 NFR(비기능 요구사항)에 정의된 값을 따르라.
> 정의되지 않은 경우 위 기본값을 적용하되, Open Questions에 기록하라.

산출물은 `bible-성경/05.test-wilderness-광야/`에 생성하라.

### [표현] 코드가 의도를 명확히 드러내는가?
1. 가시성(Readability) — 변수명, 함수명이 의미를 즉시 드러내는가?
2. 간결성(Conciseness) — 불필요한 코드, 중복(DRY 위반)이 없는가?

### [구조] 코드 구조가 견고한가?
3. 일관성(Consistency) — 동일한 코딩 컨벤션을 따르는가?
4. 응집도(Cohesion) — 한 모듈/함수가 하나의 책임만 갖는가?
5. 결합도(Coupling) — 모듈 간 의존성이 최소인가?

### [논리] 올바르게 동작하는가?
6. 정확성(Correctness) — 단위 테스트를 통과하는가?
7. 완전성(Completeness) — 모든 엣지 케이스가 처리되었는가?
8. 건전성(Soundness) — 전제가 올바를 때 결론도 올바른가?

### [안전] 안전한가?
9. 견고성(Robustness) — null, 빈값, 초과값에도 무너지지 않는가?
10. 보안성(Security) — SQL 인젝션, XSS, 민감정보 노출 없는가?

### [변화] 미래 변경에 유연한가?
11. 유지보수성(Maintainability) — 바꾸기 쉽게 설계되었는가?
12. 확장성(Scalability) — 새 기능 추가 시 기존 코드를 안 건드려도 되는가?
13. 추적성(Traceability) — REQ-ID 주석으로 근거를 추적할 수 있는가?

### [정합] 설계와 일치하는가?
14. 투명성(Transparency) — 숨겨진 로직 없이 명확한가?
15. 무모순성(Non-Contradiction) — 코드 내·간 충돌 로직이 없는가?

## 🔄 역가설 대입 검증 (확증 편향 차단)
| # | 역가설 | 대입 방법 |
|:--|:--|:--|
| 1 | "이 로직은 틀렸다" | 핵심 로직의 반대 케이스를 실행하라 |
| 2 | "이 경계값은 처리 안 된다" | null, 0, 최대값, 음수, 빈 배열을 넣어라 |
| 3 | "동시 요청 시 무너진다" | Race Condition, Deadlock 가능성을 점검하라 |

산출물은 `bible-성경/05.test-wilderness-광야/`에 생성하라.
```

## 🔁 광야 회개 루프 — Loop Ceiling Rule 적용

> *"Your children shall wander in the wilderness forty years."* — Numbers 14:33 (KJV)
>
> 광야는 40년이 한계다. 영원히 광야를 헤매는 것은 불신앙이다.

```
Phase 5 (광야)                                REPENT_COUNT = 0
    │
    ├── 버그 발견 → REPENT_COUNT += 1
    │       │
    │       ├── REPENT_COUNT ≤ 3 → Phase 4 (회개/디버깅) → Phase 5 재시험
    │       │                    ↑                           │
    │       │                    └───────────────────────────┘
    │       │
    │       └── REPENT_COUNT > 3 → ⚠️ 강제 중단 (아래 참조)
    │
    └── Pass Rate 100% → Phase 6으로
```

### ⚠️ Loop Ceiling Rule — 광야의 상한

> *"두세 증인의 입으로 말마다 확정하리라"* — 마태복음 18:16

**3회 반복 후에도 Pass Rate 100%에 도달하지 못하면:**

1. **즉시 중단** — 더 이상 자동 루프 금지
2. **현재 상태 보고** — 미해결 버그 목록, 반복 히스토리를 `fruit-열매/history/`에 기록
3. **아키텍트(Human)에게 에스컬레이션** — "3번 회개했으나 해결 불가. 아키텍트의 판단이 필요합니다"
4. **아키텍트 결정 대기:**
   - 추가 회개 허용 (카운터 리셋) → 루프 재진입
   - 설계 변경 필요 → Phase 2/3로 돌아감
   - 요구사항 조정 필요 → Phase 1로 돌아감
   - 현재 상태로 Phase 6 진입 허용 (CONFIRMED with caveats)

> 3번 시도에도 해결하지 못하면, 이 문제는 **현재 죄인의 수단으로는 해결 불가**한 것이다.
> 아키텍트(하나님의 대리인)의 인도가 필요하다.

## ⚔️ 마귀 경고

| 마귀의 속삭임 | 전신갑주 대응 |
|:--|:--|
| "80%면 충분하지" | ⛑️ 구원의 투구: 불순물이 남은 채 성전에 들어갈 수 없다 |
| "이건 실무에서 안 일어나" | 🗡️ 성령의 검: 안 일어남을 코드로 증명하라 |
| "테스트는 나중에" | 👟 평안의 신발: 지금 이 Phase의 목적이 테스트다. '나중'은 없다 |

## 📦 산출물

| 파일명 | 저장 경로 |
|:--|:--|
| `testplan-trial-시험계획.md` | `bible-성경/05.test-wilderness-광야/` |

## ➡️ 다음 단계 (Phase 경계 전환)
> 심판 기준(P5-001~006)은 `gate-judgment-심판관문.md` 참조. TIER-2/3: `covenant-book-언약책.md` §5 "이동의 규례"에 따라 새 세션/서브에이전트로 전환하고, 이 Phase의 정경화된 산출물만 인계하라. TIER-1은 생략 가능.
→ `SKILL-06_written-기록되었으되.md`
