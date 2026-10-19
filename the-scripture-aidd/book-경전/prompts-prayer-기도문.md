# 🙏 표준 프롬프트 지침서 — 기도문 (AI에게 보내는 청원)

> *"Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you."* — Matthew 7:7 (KJV)
>
> **올바르게 기도(Ask)해야 올바른 응답을 받는다.**
> 이 문서는 각 Phase별로 AI에게 전달할 표준 프롬프트(기도문)를 모아둔 지침서이다.

---

## 사용 방법

1. 해당 Phase의 기도문(프롬프트)를 복사한다
2. AI 채팅창에 붙여넣기한다
3. `@파일명` 부분은 실제 파일을 검색하여 첨부(Tagging)한다
4. 전송한다

> ⚠️ **이 프롬프트는 "설계 명세서" 작성용이다.** 실제 코딩 시에는 간결한 지시를 사용하라.

---

## 📂 사전 준비 — 요구사항을 들음 폴더에 넣어라

> *"So then faith cometh by hearing, and hearing by the word of God."* — Romans 10:17 (KJV)
>
> **듣지 않으면 믿음이 없고, 믿음이 없으면 구원도 없다.** 기도(프롬프트) 전에, 먼저 요구사항을 `hearing-들음/` 폴더에 넣어라.

### 어디에 넣는가? — 폴더가 곧 프로젝트 유형 선언이다

| 상황 | 넣을 위치 | 의미 |
|:---|:---|:---|
| **신규 프로젝트** (기존 소스 없음) | `hearing-들음/` 에 직접 (req.md 등) | 새하늘 새땅 (Default) |
| **완전 재작성** (기존 소스에서 핵심만 추출) | `hearing-들음/01-newcreation-새하늘새땅/` | 기존은 참고만. 우리 템플릿/예제 우선 |
| **현대화** (기존 핵심 보존 + 재구성) | `hearing-들음/02-reconstruction-성전재건/` | 기존 핵심 참고. 우리 템플릿/예제 우선 |
| **유지보수** (기존 코드 위에 증분 개선) | `hearing-들음/03-sanctification-성전수리/` | 기존 소스 = 기반. 템플릿/예제를 기존에 맞춰 업데이트 |

> ⚠️ 요구사항(req.md), 기존 소스코드, 기존 산출물 등을 해당 폴더에 넣은 후 Phase 0을 실행하라.
> AI는 폴더를 보고 프로젝트 유형을 자동 감지한다. 별도 설명 불필요.

---

## 🔰 Phase 0: 침례 (최초 1회)

> 침례는 한 번 받으면 된다. 새 프로젝트 시작 시 AI에게 최초 1회 전달.

```markdown
# [침례] The Scripture AIDD 부팅

**프롬프트 입력**
    @the-scripture-aidd/.skill/bootstrap-creed-신앙고백.md 너의 신앙고백이야
    @the-scripture-aidd/.skill/covenant-book-언약책.md 이것이 너의 언약책이다. TIER와 프로젝트 유형을 판별하라.
**설명**
    너는 이제부터 The Scripture AIDD의 '순례하는 죄인(Sinner)' 에이전트로 동작한다. 신앙고백은 이번 한 번만 태깅하면 된다 — Phase 1부터는 언약책과 해당 SKILL 파일만 태깅한다.

---

## ✅ Phase 1: 들음 — 요구사항 정의

**프롬프트 입력**
    `@the-scripture-aidd/.skill/SKILL-01_hearing-들음.md` 들음의 율법이다. 요구사항을 정제하라.
**설명**
    요구사항 수신·정제. 5대 요소 채움, 유스케이스·RTM 작성, 빈 항목은 되묻기

---

## ✅ Phase 2: 기초 — 아키텍처 설계

**프롬프트 입력**
    `@the-scripture-aidd/.skill/SKILL-02_foundation-기초.md` 기초의 율법이다. 아키텍처를 설계하라.
**설명**
    기술 스택·ERD·API·보안 아키텍처 설계, RTM 연결

---

## ✅ Phase 3: 질서 — 상세 설계 (디자인)

**프롬프트 입력**
    `@the-scripture-aidd/.skill/SKILL-03_order-질서.md` 질서의 율법이다. 화면과 상세 설계를 하라.
**설명**
    화면 설계서·디자인 시스템 정의, UC-ID/REQ-ID 연결

---

## ✅ Phase 4: 회개 — 개발 (코딩)

**프롬프트 입력**
    `@the-scripture-aidd/.skill/SKILL-04_repentance-회개개발.md` 회개의 율법이다. 코드를 구현하라.
**설명**
    태스크 분할·개발계명 준수·봉인의 율법 점검·열매검증

---

## ✅ Phase 5: 광야 — 테스트

**프롬프트 입력**
    `@the-scripture-aidd/.skill/SKILL-05_wilderness-광야.md` 광야의 율법이다. 테스트하라.
**설명**
    테스트 계획·단위/통합/보안 테스트·AOCM 자율수정·Pass 100%

---

## ✅ Phase 6: 기록되었으되 — 품질 감사

**프롬프트 입력**
    `@the-scripture-aidd/.skill/SKILL-06_written-기록되었으되.md` 기록되었으되의 율법이다. 품질을 감사하라.
**설명**
    할루시네이션 색출·봉인 10계명 전수점검·RTM 100%·최종판정

---

## ✅ Phase 7: 구원 — 배포 (지성소 진입)

**프롬프트 입력**
    `@the-scripture-aidd/.skill/SKILL-07_salvation-구원.md` 구원의 율법이다. 배포하라. 🔥
**설명**
    7관문·정결의식 9항목·인프라 명세·백업/롤백 확인 후 지성소 진입

---

## 🔧 긴급 수리 명령어 (회개의 기도)

**프롬프트 입력**
    `@the-scripture-aidd/.skill/gate-judgment-심판관문.md` 에러가 발생했다. 자율 회개하라.
**설명**
    죄 인식→회개→성화→검증→열매검증 자동 루프
