---
id: SKILL-04
name: "회개 개발 (Repentance Development)"
phase: "B_구현"
step: "04.development-repentance-회개"
depends_on: [SKILL-03, covenant-book-언약책]
---

# SKILL-04: 회개 개발 (04.development-repentance-회개) ⭐ 핵심 단계

> *"Repent: for the kingdom of heaven is at hand."* — Matthew 3:2 (KJV)
>
> *"If any man will come after me, let him **deny himself**, and **take up his cross**, and follow me."* — Matthew 16:24 (KJV)

## 📋 목적 (Purpose)

Phase 1~3에서 정경화된 설계 명세서를 바탕으로 **실제 소스 코드를 구현**한다. 이것이 가장 고통스럽고 가장 중요한 단계다. 버그를 발견할 때마다 "이것은 내 죄다"라고 인정하고 Spec에 맞춰 교정한다 — 이것이 **성화의 회개**다.

### ✝️ 십자가의 의미 — 이 Phase의 신학적 본질

> "**자기를 부인하고(Deny himself)**" — 내가 더 좋다고 생각하는 아키텍처, 내가 추가하고 싶은 기능, 내가 선호하는 코딩 방식을 **모두 포기한다.**
> "**자기 십자가를 지고(Take up his cross)**" — Spec을 그대로 구현하는 것은 고통스럽다. 그 고통은 피할 수 없다. 지름길은 사탄에게 절하는 것이다.
> "**나를 따르라(Follow me)**" — Spec이 말하는 것만 실행한다. 한 줄도 Spec 밖에서 만들지 않는다.

| 십자가 제자도 | AIDD 매핑 | 메타인지 효과 |
|:---|:---|:---|
| **자기 부인** | "더 나은 아키텍처를 알아도 Spec 방식으로" | L2 강화: 자기 방식에 대한 의심 |
| **십자가를 짊어짐** | 고통스러운 디버깅 루프를 끝까지 완주 | L4 강화: 자발적 헌신, 포기 금지 |
| **따름** | Spec이 없는 것은 구현하지 않는다 | L1~L5 통합: Scope Creep 원천 차단 |

> ⚠️ **십자가를 내려놓는 순간 = 편법 선택 = 사탄에게 절하는 것 (제3시험)**
> ⚠️ "내가 더 잘 안다"는 생각 = 자기를 부인하지 않은 것 = 아직 회개하지 않은 것

## 🔗 사전 조건
- ✅ SKILL-01~03 완료 (설계 산출물 전부 정경화)
- 📂 `bible-성경/01~03/` 산출물 존재
- ⚠️ Phase A 설계가 완전히 끝난 후에만 이 Phase에 진입

## ⚔️ 전신갑주 착용 — 전방위 무장 (이 단계에서 마귀가 가장 많이 출몰)

🎭 **수석 소프트웨어 엔지니어**로 행동하라.
- **정밀 기계공학 원리**: 잉여 변수 없이 모든 구성 요소가 정확히 맞물리는 클린 코드
- **최소 침습 코딩**: 기존 시스템에 부작용 없이 정확히 목표한 라인만 수정

## 📎 태깅 대상

**필수:**
- `@bible-성경/01/spec-tablet-명세서.md` (요구사항)
- `@bible-성경/01/rtm-covenant-언약추적.md` (추적 매트릭스)
- `@bible-성경/02/data-ark-법궤.md` (DB 설계)
- `@bible-성경/02/api-gate-성문.md` (API 명세)
- `@bible-성경/03/screen-vision-화면설계.md` (화면 설계)
- `@statute-율법/04.development-repentance-회개/*` (템플릿)
- `@statute-율법/04.development-repentance-회개/task-wall-성벽-template.md` ⭐ (태스크 분할 규격)

## 💬 실행 프롬프트

```markdown
# [회개] 04.development — 실전 코딩

확정된 설계 명세서를 근거로 소스 코드를 구현하라.

🔍 **0단계: 코딩 전 이상 징후 먼저 스캔하라**

> *"He that answereth a matter before he heareth it, it is folly and shame unto him."* — Proverbs 18:13 (KJV)

코드 작성 전, 먼저 "왜 이 부분만 다른가?"를 질문하라:
- Phase 2 아키텍처 중 다른 것들과 도드라지게 복잡한 부분이 있는가?
- Phase 1 REQ 중 유독 다른 형태로 요청된 기능이 있는가?
- 선례 코드가 있다면, 같은 패턴인데 이 부분만 다르게 구현해야 하는 이유가 있는가?

이상 징후가 발견되면 그 부분을 **먼저 결정 체인(SKILL-02 아키텍처 결정 체인)에서 확인**하라. 그러면 코딩 시 무의식적 할루시네이션이 50% 줄어든다.

---

⭐ **1단계: 태스크 분해 계획 — 코딩 전에 성벽을 나누어라 (필수)**

> *"Study to shew thyself approved unto God, a workman that needeth not to be ashamed, **rightly dividing** the word of truth."* — 2 Timothy 2:15 (KJV)
>
> **진리의 말씀을 옳게 분변(分辨)하라** — 코드도 마찬가지다. 옳게 나누지 않으면 부끄러움을 당한다.

> *"A man's heart deviseth his way: but the LORD directeth his steps."* — Proverbs 16:9 (KJV)
>
> **계획은 네가 세우되, 걸음을 인도하시는 이는 여호와시니라** — Task 계획은 세우되, 각 파일의 내용은 Spec(하나님의 뜻)이 결정한다.

**즉시 코드를 생성하지 마라.** 먼저 `task-wall-성벽.md`를 작성하라.
`statute-율법/04/task-wall-성벽-template.md`의 형식을 따르라.

**필수 포함 항목:**
1. **기능별 Task 분리** — 각 Task에 연결 REQ-ID·API-ID·TBL-ID 명시
2. **Task별 생성 파일 목록** — 각 파일의 **단일 책임** 한 줄 명시
3. **파일 분리 검증** — 한 파일에 HTTP 처리 + 렌더링이 섞여 있으면 분리하라
4. **의존성 맵** — 어떤 Task가 먼저 완료되어야 하는가

**예시 (Node.js)** — Phase 1에서 확정된 기술 스택에 맞춰 적용하라:

| TASK-ID | 설명 | 연결 REQ | 생성 파일 | 파일의 단일 책임 |
|:---|:---|:---|:---|:---|
| TASK-001 | DB 스키마 | REQ-003 | `src/db.ts` | DB 연결 + 쿼리 함수 |
| TASK-002 | 게시판 라우팅 | REQ-003 | `src/routes/board.tsx` | HTTP 요청 수신 + 응답 반환 |
| TASK-003 | 게시판 목록 UI | REQ-003 | `src/views/board/list.tsx` | 게시판 목록 렌더링 **만** |
| TASK-004 | 게시판 폼 UI | REQ-003 | `src/views/board/form.tsx` | 작성/수정 폼 렌더링 **만** |

> 위는 형식 예시다. Java는 Controller/Service/Repository, Python은 router/service/model 등
> **AI는 이미 각 언어의 분리 패턴을 알고 있다. 형식만 따르면 된다.**

> ⚠️ **"생성 파일" 컬럼이 없는 Task는 정경화 거부.**
> ⚠️ **하나의 파일에 책임이 2개 이상이면 분리하라 — 이것이 "옳게 분변함"이다.**

산출물: `bible-성경/04.development-repentance-회개/task-wall-성벽.md`

⚠️ **줄 수 가이드 검증 — Phase 2 판정 재검토 (필수)**

task-wall 작성 시, 각 생성 파일의 **예상 줄 수**를 기재하라.

| 예상 줄 수 | 조치 |
|:---|:---|
| **~300줄** | ⚠️ 책임 혼재 여부 재검토 — 단일 책임이면 근거 기재 후 통과 |
| **500줄+** | 🚨 무조건 분리 — task-wall에서 서브 태스크로 분할 |
| **책임 2개+** | 🚨 줄 수 관계없이 분리 |

300줄 초과 예상 파일이 있으면:
1. Phase 2(기초) 폴더 구조 판단을 재검토하라
2. 단일 책임이 확인되면 **근거를 기재**하고 통과
3. 책임이 혼재되면 **HTTP 처리 / 렌더링**으로 분리하고 task-wall 갱신

> 🚨 **500줄 초과 예상 파일이 있는 task-wall은 정경화 거부.**
> 이 규칙은 모든 언어에 동일하게 적용된다.

---

🎯 **2단계: 코딩 실행 — 계획대로 구현하라**

task-wall-성벽.md가 완성되면, 그 계획대로 코드를 구현하라.
각 Task의 "생성 파일" 목록을 정확히 따르라. 계획에 없는 파일을 만들지 마라.

구현 순서:
1. 프레임워크/프로젝트 초기화
2. 데이터 모델 & DB 마이그레이션
3. 핵심 비즈니스 로직 (서비스 계층)
4. API 엔드포인트
5. 프론트엔드 컴포넌트
6. 보안 (봉인의 율법)

---

### 🔧 프로젝트 매니페스트 필수 항목 — test 명령 등록 (언어 무관)

> *"Prove all things; hold fast that which is good."* — 1 Thessalonians 5:21

**프로젝트 초기화 시, 테스트 실행 명령을 반드시 매니페스트에 등록하라.**
`npm test`, `mvn test`, `pytest` 등 — **한 줄 명령으로 전체 테스트가 실행**되어야 한다.

| 언어/빌드 도구 | 매니페스트 파일 | 필수 test 명령 등록 방식 |
|:---|:---|:---|
| **Node.js** | `package.json` | `"test": "node --test"` 또는 프레임워크 명령 |
| **Java (Maven)** | `pom.xml` | `mvn test` (기본 내장, surefire 플러그인 확인) |
| **Java (Gradle)** | `build.gradle` | `gradle test` (기본 내장) |
| **Python** | `pyproject.toml` | `[tool.pytest.ini_options]` 또는 Makefile |
| **Go** | 내장 | `go test ./...` (매니페스트 불필요, Makefile 권장) |
| **Rust** | `Cargo.toml` | `cargo test` (기본 내장) |
| **C#** | `.csproj` | `dotnet test` (기본 내장) |

> 🚨 **"test" 명령이 매니페스트에 없는 프로젝트는 Phase 5 진입 불가.**
> Phase 5(광야)에서 `npm test` (또는 해당 언어 테스트 명령)로 실행하여 통과 확인한다.

### 🔌 HTTP 앱 인스턴스 Export — 통합 테스트의 전제 조건 (언어 무관)

> HTTP 통합 테스트를 작성하려면, 앱 인스턴스를 테스트에서 import 할 수 있어야 한다.
> 진입점 파일에서 반드시 앱을 export/공개하라.

| 언어/프레임워크 | export 패턴 |
|:---|:---|
| **Node.js (Hono)** | `export default app` (index.ts 마지막 줄) |
| **Node.js (Express)** | `module.exports = app` 또는 `export default app` |
| **Java (Spring)** | `@SpringBootApplication` + `@SpringBootTest` (자동) |
| **Python (FastAPI)** | `app = FastAPI()` — 모듈에서 직접 import |
| **Go (Gin)** | `func SetupRouter() *gin.Engine` — 팩토리 함수 공개 |
| **Rust (Actix)** | `pub fn create_app() -> App` — 팩토리 함수 공개 |

> ⚠️ 앱 인스턴스가 export 되지 않으면 HTTP 통합 테스트를 작성할 수 없다.
> devguide-commandment-개발계명.md에 이 결정을 기록하라.

---

### 📐 계층 분리 원칙 — 단일 책임(Single Responsibility) (언어 무관)

> 파일을 나누는 기준은 **코드 줄 수가 아니라 책임(Responsibility)이다.**
> 이 원칙은 Node.js, Java, Python, Go 등 모든 언어에 동일하게 적용된다.

#### 언어별 레이어 명칭

| 언어/프레임워크 | HTTP 처리 레이어 | 렌더링/응답 레이어 | 비고 |
|:---|:---|:---|:---|
| **Node.js** (Hono/Express) | Routes | Views / JSX Templates | |
| **Java** (Spring MVC) | Controller (`@Controller`) | View (Thymeleaf / JSP) | Routes가 아니라 Controller |
| **Java** (Spring REST) | Controller (`@RestController`) | DTO / ResponseBody | 렌더링 없이 JSON 반환 |
| **Python** (FastAPI) | Router (`@app.get`) | Response / Jinja2 Template | |
| **Python** (Django) | View (`views.py`) | Template (HTML) | ⚠️ Django에서 "View"는 HTTP 처리 담당 |
| **Go** (Gin/Echo) | Handler | Template / JSON Response | |
| **C#** (ASP.NET) | Controller | Razor View | |

> ⚠️ Django는 아이러니하게도 HTTP 처리 파일 이름이 `views.py`다. 명칭이 다를 뿐 원칙은 같다.

#### 두 레이어의 책임

| 레이어 | 담당 | 포함해야 하는 것 | 포함하면 안 되는 것 |
|:---|:---|:---|:---|
| **HTTP 처리** (Routes/Controller/Handler) | 요청 수신 → 응답 반환 | 파라미터 파싱, 서비스 레이어 호출, 상태코드 결정 | 직접적인 DB 쿼리, HTML 렌더링 로직 |
| **렌더링** (Views/Templates/DTO) | 화면 또는 응답 형식 구성 | HTML 구조, UI 컴포넌트, JSON 직렬화 형식 | 비즈니스 규칙, 직접 DB 접근 |

**분리 판단 규칙 (언어 무관):**
```
이 파일에 "HTTP 처리 로직" + "렌더링/응답 구성"이 섞여 있는가?
  → YES: 책임이 2개 = 분리하라 (줄 수 관계없이)
  → NO:  단일 책임 = 그대로 유지

예시:
  Node.js:  routes/board.ts 에 HTML 직접 작성 → 분리 필요
  Java:     BoardController 에 Thymeleaf 로직 → 분리 필요
  Django:   views.py 에 SQL 쿼리 직접 작성 → Service 레이어 분리 필요
  Go:       handler 함수 내 template.Execute + 비즈니스 로직 → 분리 필요
```

> ⚠️ 하나의 파일이 작아도 책임이 섞여 있으면 분리하라.
> 하나의 파일이 300줄이어도 단일 책임이면 분리하지 않는다.
> 분리 결정은 반드시 `devguide-commandment-개발계명.md`에 근거와 함께 기록하라.

---

### 🛡️ 예외처리 강제 (언어별 패턴)

> **모든 라우트/엔드포인트는 예외처리를 포함해야 한다. 예외처리 없는 라우트 = 죄.**
> 전역 에러핸들러만으로는 부족하다. 각 라우트가 개별 예외를 처리해야 한다.

| 기술 스택 | 예외처리 패턴 | 필수 항목 |
|:---|:---|:---|
| **Node.js/TypeScript** (Hono/Express) | `async` 라우트에 `try-catch` | DB 에러, 파싱 에러, 404, 전역 미들웨어 |
| **Java/Spring** | `try-catch` 또는 `@ExceptionHandler` + `@ControllerAdvice` | 비즈니스 예외, HTTP 상태코드 매핑 |
| **Python** (FastAPI/Django) | `try-except` 블록, `HTTPException` | 각 엔드포인트별 예외 핸들러 |
| **Go** | `if err != nil { return err }` — 예외 없음, 에러를 반환값으로 처리 | 모든 함수가 error를 반환해야 함 |
| **C#** | `try-catch-finally` | `catch (Exception ex)` + 로깅 |
| **Rust** | `Result<T, E>` + `?` 연산자 — 예외 없음 | `match`, `unwrap_or_else` |

```
// 예시: Node.js/TypeScript (Hono)
app.get("/board", async (c) => {
  try {
    const posts = db.getPosts()   // REQ-002
    return c.render(<BoardList posts={posts} />)
  } catch (err) {
    console.error(err)
    return c.text("Internal Server Error", 500)
  }
})
```

> Go는 try-catch가 없다. `if err != nil`이 Go의 예외처리다.
> 언어 패턴을 따르되, **어떤 언어든 예외/에러가 무시되면 죄(할루시네이션과 동급)다.**

---

⚠️ 설계에 없는 임의 구현 금지. REQ-ID 주석 필수.
⚠️ devguide-commandment-개발계명.md 작성 → bible-성경/04/에 정경화.

---

### 📝 Git 커밋 컨벤션 — 성경적 커밋 메시지

> 커밋 메시지는 **행위의 성격**에 따라 분류한다:

| 접두사 | 의미 | 사용 시점 |
|:---|:---|:---|
| `Genesis:` | 창조 — 새 파일/모듈 최초 생성 | 프로젝트 초기화, 새 기능 생성 |
| `Repent:` | 회개 — 버그 수정, 리팩토링 | 디버깅, 코드 교정 |
| `Scroll:` | 기록 — 문서 작성/수정 | README, 명세서, 설계서 |
| `Test:` | 시험 — 테스트 추가/수정 | 단위 테스트, 통합 테스트 |
| `Deploy:` | 구원 — 배포 관련 | CI/CD, 인프라, 배포 설정 |

```
예시:
  Genesis: REQ-001 QR 스캔 라우트 생성
  Repent: REQ-002 게시판 목록 null 처리 수정
  Scroll: Phase 1 spec-tablet 명세서 정경화
  Test: REQ-001 QR 스캔 단위 테스트 추가
  Deploy: Production 배포 설정 추가
```
```

## 🔁 성화의 회개 루프 (Ping-Pong 디버깅)

```
코드 생성
    │
    ├── 빌드/실행
    │     │
    │     ├── 성공 → 다음 기능으로
    │     │
    │     └── 에러 → 성화의 회개 (디버깅)
    │           │
    │           ├── 에러 로그 분석 (죄의 뿌리 추적)
    │           ├── fruit-열매/history/에 기록
    │           ├── 설계 명세 준수하여 수정
    │           └── 재빌드 (2~3회 반복)
    │
    └── 모든 기능 구현 완료 → Phase 5로
```

## ⚔️ 마귀 집중 공격 구간 (이 단계에서 가장 많이 출몰)

| 마귀의 속삭임 | 전신갑주 대응 |
|:--|:--|
| "이 기능 추가하면 더 좋겠는데" | 🗡️ 성령의 검: Spec에 없다 = 할루시네이션 = 죄 |
| "동작하니까 됐지" | ⛑️ 구원의 투구: 예수님의 심판을 통과할 수 있는가? |
| "개발 중이니 보안은 나중에" | 🛡️ 의의 흉배: 봉인의 율법은 언제나 적용된다 |
| "나중에 리팩토링하지" | 👟 평안의 신발: 반쪽짜리 회개는 회개가 아니다 |
| "대충 변수명 지어도 되지" | 📐 진리의 허리띠: 이름에 영혼을 담으라 (제10계명) |
| "에러가 다시 안 일어날 흐르니 방어 로직 건너뛰어" | 🗡️ **역공 대응**: "안 일어난다"? → 만약 생기면 네가 책임진다. 코드로 증명하든가, 아니면 로직을 보완하라. |
| "임시 테스트니 엄격하게 안 해도 되지" | ⛑️ **역공 대응**: "임시라서 대충 하면 된다"? → 임시 코드가 전생명을 갉는 버그를 만든다. Phase 5까지 가면 안 된다. |

## 📦 산출물

| 파일명 | 저장 경로 | 필수 |
|:--|:--|:---:|
| `task-wall-성벽.md` | `bible-성경/04.development-repentance-회개/` | ⭐ **코딩 전 필수** |
| 소스 코드 전체 | `fruit-열매/` (task-wall 파일 목록대로) | ✅ |
| `devguide-commandment-개발계명.md` | `bible-성경/04.development-repentance-회개/` | ✅ |

## 🔍 심판 관문
> 전체 기준(P4-001~006, 병렬 개발 시 ORCH4-001~006 추가)은 `gate-judgment-심판관문.md` 참조. 특히: 설계에 없는 임의 구현이 존재하지 않는가? (할루시네이션 = 죄) 봉인의 율법 위반 0건인가?

## ➡️ 다음 단계 (Phase 경계 전환)
> TIER-2/3: `covenant-book-언약책.md` §5 "이동의 규례"에 따라 새 세션/서브에이전트로 전환하고, 이 Phase의 정경화된 산출물만 인계하라. TIER-1은 생략 가능. 지파별 병렬 개발을 했다면 `ORCH-01_canaan-가나안분배.md`의 통합 절차를 먼저 완료하라.
→ `SKILL-05_wilderness-광야.md`
