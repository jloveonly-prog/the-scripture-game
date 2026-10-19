---
name: census-count
description: bible-성경의 RTM(언약추적) 커버리지를 스크립트로 실제 계수하여 AI 자기신고와 대조한다. "RTM 커버리지 100%"를 주장하기 전, Phase 완료 심판(P1/P2/P4/P5/P6/P7)이나 /canaan-orch 통합 시점에 반드시 실행한다.
---

# 언약 계수 (RTM Census)

`/census-count [phase번호] [--log]` 형태로 호출된다. 인자 해석:
- 숫자 인자(2/4/5/6/7)가 있으면 해당 Phase 완료 심판 기준(필요 열 충족 여부)까지 함께 검사한다.
- 인자가 없으면 현재 RTM 상태만 계수한다.
- `--log`가 있으면 결과를 `fruit-열매/history/`에 기록한다. 명시적 요청이 없어도 Phase 심판 목적이면 기본적으로 `--log`를 포함하라.

## 실행 절차

1. 아래 명령을 프로젝트 루트에서 실행하라 (경로는 항상 Phase 01 폴더 — RTM은 프로젝트에 단 1개만 존재하며 Phase가 진행될수록 갱신된다):
   ```
   python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 [--phase N] [--log]
   ```
2. 출력 맨 아래 "⚖️ 최종 판정" 줄을 확인하라.
3. **IRONCLAD (exit 0)**: 사용자에게 통과를 보고하고, 관련 Gate Check 항목(`gate-judgment-심판관문.md`의 P1-010 / P6-003, 7관문의 "RTM 추적 커버리지 100%" 등)을 ✅로 기록해도 좋다고 안내하라.
4. **FAIL (exit 1)**: 출력에 나열된 문제(중복 ID, 문서 기재값-실계수 불일치, spec-tablet에는 있으나 RTM 미등재인 ID, Phase별 미기재 열)를 하나씩 `bible-성경/01.requirement-hearing-들음/rtm-covenant-언약추적.md`에 직접 반영하라. "괜찮을 것 같다"며 넘어가지 마라 — 이는 십계명 제8계명(AI 핑계 차단) 위반이다.
5. 실행 오류 (exit 2, 파일 없음/형식 미인식): `statute-율법/01.../rtm-covenant-언약추적-template.md`와 실제 RTM의 표 헤더(REQ-ID, 상태 컬럼 존재 여부)를 대조하라.
6. 수정 후 IRONCLAD가 나올 때까지 재실행을 반복하라. AI 자신이 "다 맞습니다"라고 말하는 것과 이 계수기가 IRONCLAD를 반환하는 것은 다르다 — 후자만 최종 근거로 인정한다.

## 참고 문서
- `.skill/UTIL-census-언약계수.md` — 이 유틸리티의 전체 규격과 사용 시점
- `.skill/tools-도구/census-count-언약계수.py` — 실제 계수 로직 (Python, 외부 의존성 없음)
- `.skill/scenario-시나리오/ORCH-01_canaan-가나안분배.md` — 병렬 개발 통합 시점에 이 스킬을 `--phase 4`로 연동 호출
