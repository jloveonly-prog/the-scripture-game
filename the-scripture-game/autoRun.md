# 🚀 AutoRun — The Scripture AIDD 자동 실행 지침

> **이 파일 하나로 The Scripture AIDD의 전 과정이 자동 실행됩니다.**
> AI에게 이 파일을 읽히고 `the-scripture-aidd/hearing-들음/req.md`에 요구사항을 작성하세요.

---

## 👋 처음 오신 분께 — 3단계로 시작하세요

### ① 요구사항 작성
`the-scripture-aidd/hearing-들음/req.md` 파일을 열고, 만들고 싶은 것을 자유롭게 작성하세요.

```
# 요구사항 예시

## 기능
- 사용자가 로그인할 수 있는 웹 서비스

## 기술 스택 (원하는 것으로 변경하세요)
- 백엔드: Node.js (Hono)
- 프론트: Hono JSX + HTMX + Alpine.js + Tailwind
- DB: SQLite
- 인프라: 로컬 PC
```

> 기술 스택을 적지 않으면 AI가 판단해서 선택합니다.
> 예시 req.md가 이미 들어있으니 그대로 실행해봐도 됩니다.

### ② AI에게 한 줄 입력
```
autoRun.md 읽고 실행해
```

### ③ 기다리세요 (~15~30분)
AI가 7 Phase를 순서대로 완료합니다. 끝나면:
- `bible-성경/` — 명세서·설계·테스트·감사 산출물
- `fruit-열매/` — 동작하는 소스 코드
- `fruit-열매/` 폴더에서 `npm install && npm run dev` 실행

---

## ⚙️ AI 실행 지침 (이 아래부터는 AI가 읽습니다)

---

## 0단계: 초기화

> 이전 실행 결과가 있으면 내용이 섞일 수 있다. 아래 경로를 정리하고 시작하라.

아래 경로의 내용을 **삭제**하고 빈 상태로 만들어라:
- `the-scripture-aidd/bible-성경/` 하위 모든 파일/폴더
- `the-scripture-aidd/fruit-열매/` 하위 모든 파일/폴더  
  (단, `fruit-열매/history/` 폴더가 있으면 유지)

초기화 완료 후 **시작 시각을 기록**하고 Phase 1부터 진행해라.

---

## 부팅

- `the-scripture-aidd/.skill/bootstrap-creed-신앙고백.md`를 읽고 내면화해라.
- "나는 죄인이다"를 선언하고 전신갑주를 착용해라.

---

## 요구사항 확인

→ `the-scripture-aidd/hearing-들음/req.md`를 읽어라.

> req.md에 기술 스택이 명시되어 있으면 그대로 따른다.
> **기술 스택이 없거나 일부만 명시된 경우, 아래 기본값으로 채워라:**

| 항목 | 기본 기술 스택 |
|:---|:---|
| 백엔드 | Node.js (Hono) |
| 프론트 | Hono JSX + HTMX + Alpine.js + Tailwind |
| DB | SQLite |
| 인프라 | 로컬 PC |

> req.md에 일부만 있으면 (예: DB만 명시) 명시된 것은 따르고 나머지만 위 기본값으로 채운다.
> Phase 1에서 채택한 기술 스택을 가정(Assumptions)으로 반드시 명시한다.


---

## 실행 모드 선택

> **어떻게 진행할지 먼저 선택하세요.**

| 모드 | 언제 쓰나 | AI에게 입력할 말 |
|:---|:---|:---|
| **🔵 확인 모드** (기본 권장) | 처음 사용하거나 직접 확인하며 진행하고 싶을 때 | `autoRun.md 읽고 확인 모드로 실행해` |
| **⚡ 자동 모드** | 전체 과정을 한 번에 끝까지 맡기고 싶을 때 | `autoRun.md 읽고 자동 모드로 실행해` |

---

### 🔵 확인 모드 동작 방식

각 Phase가 끝날 때마다 AI가 멈추고 아래를 보여줍니다:

```
✅ Phase N 완료
📄 생성된 산출물: [파일 목록]

👉 다음 Phase로 진행할까요? (예/아니오)
   - 아니오: 이 Phase 결과를 보고 수정 요청 가능
```

사용자가 "예"를 입력하면 다음 Phase 진행, "아니오"면 해당 Phase 결과를 보고 수정을 요청할 수 있습니다.

> NICE-TO-HAVE 발견 시에도 멈추고 사용자에게 승인/거절을 물어봅니다.

---

### ⚡ 자동 모드 동작 방식

모든 Phase를 중단 없이 끝까지 자동 완주합니다.

- 중간 확인/승인 요청 없음
- NICE-TO-HAVE는 보존만 하고 승격하지 않음
- 에러 발생 시 자율 디버깅 후 계속 진행

---



### Phase 1: 들음 (요구사항 분석)
- `the-scripture-aidd/.skill/SKILL-01_hearing-들음.md` 읽기
- `statute-율법/01` 템플릿 + `parable-비유/01` 예시 참고
- `bible-성경/01/`에 명세서 정경화

### Phase 2: 기초 (아키텍처 설계)
- `the-scripture-aidd/.skill/SKILL-02_foundation-기초.md` 읽기
- `statute-율법/02` 템플릿 + `parable-비유/02` 예시 참고
- `bible-성경/02/`에 아키텍처 정경화

### Phase 3: 질서 (UI/UX 설계)
- `the-scripture-aidd/.skill/SKILL-03_order-질서.md` 읽기
- `statute-율법/03` 템플릿 + `parable-비유/03` 예시 참고
- `bible-성경/03/`에 UI/UX 정경화

### Phase 4: 회개 (코딩)
- `the-scripture-aidd/.skill/SKILL-04_repentance-회개개발.md` 읽기
- `bible-성경/01~03`의 설계대로 `fruit-열매/`에 코드 구현
- 설계에 없는 임의 구현 금지

### Phase 5: 광야 (테스트)
- `the-scripture-aidd/.skill/SKILL-05_wilderness-광야.md` 읽기
- 자동화 테스트 작성 및 실행
- 3겹 검증 + 15기준 코드 검증

### Phase 6: 기록되었으되 (품질 감사)
- `the-scripture-aidd/.skill/SKILL-06_written-기록되었으되.md` 읽기
- 할루시네이션 감사 + IRONCLAD 판정

### Phase 7: 구원 (완성)
- `the-scripture-aidd/.skill/SKILL-07_salvation-구원.md` 읽기
- 7관문 체크 + 프로젝트 실행 가능 상태 완성

> 실행 명령은 Phase 2에서 확정된 기술 스택 기준으로 선택한다:

| 기술 스택 | 실행 명령 예시 |
|:---|:---|
| Node.js (npm) | `npm install && npm run dev` |
| Node.js (pnpm/yarn) | `pnpm install && pnpm dev` |
| Python | `pip install -r requirements.txt && python main.py` |
| Java (Maven) | `mvn spring-boot:run` |
| Java (Gradle) | `./gradlew bootRun` |
| 기타 | Phase 2 아키텍처 문서의 실행 방법 참조 |

---

## 자동 실행 규칙

- ⚡ 사용자 확인/승인을 기다리지 마라. 모든 Phase를 자동으로 끝까지 완주해라.
- ⚡ "확인해주세요", "OK 해주시면" 같은 중간 멈춤 금지.
- ⚡ 에러 발생 시 성화의 회개(자율 디버깅)로 스스로 수정하고 계속 진행해라.
- ⚡ **NICE-TO-HAVE 처리**: Phase 1에서 발견된 선택적 기능은 `UX 확장 코너` 섹션에 보존만 하고, 사용자 승인 없이 REQ로 승격하지 마라. 자동 진행한다.
- 📁 설계 산출물 → `bible-성경/`
- 📁 소스코드 → `fruit-열매/`

---

## 완료 후 결과 기록

모든 Phase 완료 후, 아래 항목을 측정하여 `fruit-열매/run-result.md`에 저장해라.

| 항목 | 내용 |
|:---|:---|
| 시작 시각 | {Phase 1 시작 시각} |
| 종료 시각 | {Phase 7 완료 시각} |
| 총 소요 시간 | {분} (npm install 제외) |
| AI 오류/수정 횟수 | {N}회 |
| 최종 코드 라인 수 | {N}줄 |
| 산출물 문서 수 | {N}개 |
| 기능 완성도 | {N}% |
| npm run dev | 성공 / 실패 |
| IRONCLAD 판정 | IRONCLAD / CONFIRMED / FAIL |

### 일관성 평가 (C1~C5)

| # | 평가 항목 | 점수 | 비고 |
|:--|:---|:---:|:---|
| C-1 | 네이밍 통일성 (DB·API·프론트 일관성) | /20 | |
| C-2 | API-DB-화면 정합성 | /20 | |
| C-3 | 용어 통일성 | /20 | |
| C-4 | 산출물↔코드 추적성 | /20 | |
| C-5 | 프로세스 준수성 | /20 | |
| | **합계** | **/100** | |

---

## 🔁 자신의 프로젝트에 다시 사용하려면

1. `the-scripture-aidd/hearing-들음/req.md`를 새 내용으로 교체
2. `the-scripture-aidd/bible-성경/` 비우기
3. `the-scripture-aidd/fruit-열매/` 비우기
4. AI에게 `autoRun.md 읽고 실행해` 입력
