# ✉️ 서신 — 03.uttermost-땅끝 / {TASK-ID}

> ⚠️ **파생 문서(Derived).** 이 서신은 원본이 아니다. 직접 수정 금지 — 원본을 고친 뒤 이 서신을 재생성하라.
> 원본: `bible-성경/01.requirement-hearing-들음/spec-tablet-명세서.md`, `bible-성경/02.architecture-foundation-기초/api-gate-성문.md`, `bible-성경/03.design-order-질서/screen-vision-환상.md`, `bible-성경/03.design-order-질서/design-vision-디자인명세.md`, `statute-율법/04.development-repentance-회개/security-seal-봉인.md`
> 생성일: {YYYY-MM-DD} / 생성 기준: RTM 설계 변경 이력 최종 행 = {변경일 또는 "없음"}
>
> **규격:** `statute-율법/04.development-repentance-회개/epistle-서신-template.md`
> **이 지역의 개발 계층:** 프론트엔드/UI + 인증·보안(봉인) + 인프라/배포 (task-wall 4~6단계)
> 스캐폴드다 — `_TEMPLATE-{TASK-ID}/` 전체를 복사해 실제 TASK-ID로 폴더명을 바꾼 뒤 채우라.

## 지역 개요
- TASK-ID: {task-wall의 TASK-ID}
- 지역: 03.uttermost-땅끝
- 이 지역 태스크: {TASK-006, ...} ← 상태·짝 배정은 task-wall 참조. 여기 복사하지 않는다.
- 선행 지역: 02.samaria-사마리아

## 선행 지역 확인
- task-wall 확인: {TASK-004, TASK-005} ✅, 짝 검증 ✅ (확인일 {YYYY-MM-DD})
- history 이정표: fruit-열매/history/{YYYY-MM-DD}.md [{HH:mm}] 사마리아 배치 완료

## REQ 원문 발췌
### {REQ-ID} {요약}
{spec-tablet의 해당 항목 원문 그대로}
— 출처: bible-성경/01/spec-tablet-명세서.md {REQ-ID}

## 설계 발췌
### {SCR-ID} {화면명}
{screen-vision의 해당 화면 원문 그대로 — 레이아웃, 연결 UC, 호출 API}
— 출처: bible-성경/03/screen-vision-환상.md {SCR-ID}

### {API-ID} (이 화면이 호출하는 것만)
{api-gate 해당 항목 원문 그대로}
— 출처: bible-성경/02/api-gate-성문.md {API-ID}

### 봉인의 율법 — 이 지역에 해당하는 계명만
{security-seal의 해당 계명 원문 그대로}
— 출처: statute-율법/04/security-seal-봉인.md 제{N}계명

> 이 지역 완료 = Phase 4 전체 완료 조건 재확인 (모든 REQ 구현, 봉인 10계명 위반 0건, RTM 코드 모듈 열 전부 채움 — `/census-count`로 실계수)
