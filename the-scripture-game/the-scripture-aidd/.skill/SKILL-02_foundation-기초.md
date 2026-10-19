---
id: SKILL-02
name: "기초 (Foundation)"
phase: "A_설계"
step: "02.architecture-foundation-기초"
depends_on: [SKILL-01, covenant-book-언약책]
---

# SKILL-02: 기초 (02.architecture-foundation-기초)

> *"And God made the firmament."* — Genesis 1:7 (KJV)

## 📋 목적 (Purpose)
기술 스택, ERD, API 명세, 보안 아키텍처를 설계하여 `bible-성경/02/`에 정경화한다.

## 🔗 사전 조건 (Prerequisites)
- ✅ SKILL-01 완료 (들음 산출물 정경화)
- 📂 `bible-성경/01/` 산출물 존재

## ⚔️ 전신갑주 착용

🎭 **수석 시스템 아키텍트**로 행동하라.
- **구조공학의 하중 분석**: 시스템의 하중(트래픽, 데이터)을 예측하고 그에 맞는 기초를 설계
- **방어적 아키텍처**: 보안을 처음부터 내장 (Security by Design)

## 📎 태깅 대상

**필수:**
- `@bible-성경/01.requirement-hearing-들음/*` (들음 산출물)
- `@statute-율법/02.architecture-foundation-기초/*` (템플릿)

**선택:**
- `@parable-비유/02.architecture-foundation-기초/*` (예시)

## 💬 실행 프롬프트

```markdown
# [기초] 02.architecture — 아키텍처 설계

Phase 1(들음)에서 정경화된 요구사항을 기반으로 시스템 아키텍처를 설계하라.

⚠️ **인프라/클라우드 환경 설계**

기술 스택 결정과 함께 아래 인프라 항목을 반드시 설계하라:
- 서버 구성 (로컬/클라우드/하이브리드)
- DB 서버 및 캐시 전략
- 배포 환경 (Staging/Production)
- 클라우드 서비스 선택 근거

인프라 결정도 아키텍처 결정 체인에 포함하여 REQ-ID까지 추적 가능해야 한다.

⚠️ **코드 폴더 구조 판단 — AI가 기술 스택을 보고 결정하라**

> 폴더 구조는 언어/프레임워크마다 다르다. 임의 구조를 강제하지 말고,
> **해당 기술 스택의 공식 컨벤션**을 따르되, 아래 기준으로 판단하라.

| 판단 기준 | 분리 필수 | 통합 허용 |
|:--|:--|:--|
| CRUD 엔드포인트 5개 이상 (한 도메인) | ✅ HTTP 처리 / 렌더링 분리 | |
| 뷰 파일 예상 80줄 이상 | ✅ 분리 | |
| 프레임워크가 MVC 강제 | ✅ 컨벤션 따라 분리 | |
| 단순 SSR + 화면 3개 이하 | | ✅ 통합 허용 |

> **단일 파일 줄 수 가이드 (언어 무관)**
>
> | 줄 수 | 조치 | 근거 |
> |:---|:---|:---|
> | **~300줄** | ⚠️ 경고 트리거 — **책임 혼재 여부 재검토** 필수 | "단일 책임이 맞는가?" 자문하라 |
> | **500줄+** | 🚨 하드 리밋 — **무조건 분리** | 어떤 단일 책임이든 500줄은 과도하다 |
> | **책임 2개+** | 🚨 **줄 수 관계없이 분리** | 핵심 원칙: 100줄이어도 책임 혼재면 분리 |
>
> 300줄 이하이면서 단일 책임인 파일은 분리하지 않아도 된다.
> 300줄 초과이면서 단일 책임이 확인되면 **architecture-temple에 그 근거를 반드시 기록**하라.

| 언어/프레임워크 | HTTP 처리 레이어 | 렌더링/응답 레이어 |
|:---|:---|:---|
| Node.js (Hono/Express) | `routes/` | `views/` 또는 `components/` |
| Java (Spring) | `controller/` | `templates/` (Thymeleaf) 또는 DTO |
| Python (FastAPI/Django) | `routers/` | `templates/` |
| Go (Gin/Echo) | `handlers/` | `templates/` |
| Rust (Actix/Axum) | `handlers/` | `templates/` |

**판단 결과를 `architecture-temple-성전설계.md`에 반드시 명시하라:**
```
## 폴더 구조 판단
- 채택 구조: [HTTP 처리 / 렌더링 분리 OR 통합]
- 판단 근거: [기술 스택 컨벤션 + CRUD 수 + 예상 줄 수]
- 예상 최대 파일 줄 수: {N}줄 (300줄 초과 시 단일 책임 근거 기재 필수)
```

⚠️ **방어 깊이 (Defense in Depth) — DB 설계 시 반드시 적용**

빈값·무결성 방어는 **3중**으로 구성하라 (언어/DB 무관):
1. **클라이언트**: HTML `required`, 프론트 검증
2. **서버**: trim + 빈값 체크 (HTTP 핸들러 또는 서비스 레이어)
3. **DB**: `NOT NULL` + `CHECK` 제약 (빈 문자열 방어)

> `NOT NULL`만으로는 빈 문자열(`''`)이 허용된다. `CHECK` 제약이 마지막 방어선이다.
> data-ark-법궤.md 작성 시 모든 사용자 입력 컬럼에 CHECK 제약을 명시하라.

⚠️ **아키텍처 결정 체인 추적 — 모든 결정은 근거 REQ까지 추적 가능해야 한다**

> *"Which of you, intending to build a tower, sitteth not down first, and counteth the cost"* — Luke 14:28 (KJV)

각 기술 결정(DB, 프레임워크, API 구조, 인증 방식 등)에 대해 아래 체인을 반드시 문서화하라.
근거 없이 나열된 기술 목록은 할루시네이션이다.

```
## 아키텍처 결정 체인
| 결정 사항 | 근거 REQ-ID | 왜 이 선택인가 | 이 결정이 만드는 제약 | Phase 3/4 영향 |
|:--|:--|:--|:--|:--|
| {기술/구조 선택} | {REQ-XXX} | {선택 이유} | {후속 제약 사항} | {코드/화면 설계 제약} |
```
결정 건마다 체인이 완성되지 않으면 그 결정은 근거 없는 할루시네이션이다.

순차 생산:
| 순서 | 파일 | 템플릿 |
|:--:|:--|:--|
| ① | architecture-temple-성전설계.md (인프라/클라우드 포함) | statute-율법/02/architecture-temple-성전설계-template.md |
| ② | data-ark-법궤.md (ERD/DB 설계) | statute-율법/02/data-ark-법궤-template.md |
| ③ | api-gate-성문.md (API 명세) | statute-율법/02/api-gate-성문-template.md |

산출물은 `bible-성경/02.architecture-foundation-기초/`에 생성하라.
⚠️ 이 단계에서 fruit-열매/ 소스코드를 생성하지 마라.
```

## ⚔️ 마귀 경고

| 마귀의 속삭임 | 전신갑주 대응 |
|:--|:--|
| "최신 기술 다 넣자" | 🛡️ 의의 흉배: Spec에 필요한 것만 취하라 |
| "설계 건너뛰고 바로 코딩하자" | 👟 평안의 신발: 기초 없이 성전을 세우면 무너진다 |
| "DB 설계는 대충 해도 돼" | 📐 진리의 허리띠: 법궤가 부실하면 성전이 무너진다 |

## 📦 산출물 (Output)

| 파일명 | 저장 경로 |
|:--|:--|
| `architecture-temple-성전설계.md` | `bible-성경/02.architecture-foundation-기초/` |
| `data-ark-법궤.md` | `bible-성경/02.architecture-foundation-기초/` |
| `api-gate-성문.md` | `bible-성경/02.architecture-foundation-기초/` |

## 🔍 심판 관문
> 전체 기준(P2-001~004)은 `gate-judgment-심판관문.md` 참조. 특히: ERD의 테이블이 Phase 1 요구사항의 데이터 항목을 전부 수용하는가?

## ➡️ 다음 단계 (Phase 경계 전환)
> TIER-2/3: `covenant-book-언약책.md` §5 "이동의 규례"에 따라 새 세션/서브에이전트로 전환하고, 이 Phase의 정경화된 산출물만 인계하라. TIER-1은 생략 가능.
→ `SKILL-03_order-질서.md`
