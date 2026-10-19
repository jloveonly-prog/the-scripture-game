---
id: UTIL-census
name: "언약 계수 (RTM Census)"
type: "유틸리티 (Phase 무관, 언제든 호출 가능)"
depends_on: [covenant-book-언약책]
related_skill: [SKILL-01_hearing-들음, SKILL-06_written-기록되었으되]
---

# UTIL-census: 언약 계수 (RTM Coverage Census)

> *"Take ye the sum of all the congregation of the children of Israel, after their families, by the house of their fathers, with the number of their names."* — Numbers 1:2 (KJV)

## 📋 목적 (Purpose)

`rtm-covenant-언약추적.md`의 "커버리지 요약"은 지금까지 **AI가 스스로 세어서 스스로 적어 넣은 숫자**였다. 죄인은 자신의 계수를 신뢰할 수 없다 (Jeremiah 17:9, "만물보다 거짓되고 심히 부패한 것은 마음이라"). 이 유틸리티는 `.skill/tools-도구/census-count-언약계수.py`를 실행하여 **표 본문을 처음부터 다시 계수**하고, AI가 적어 넣은 요약 수치와 실계수를 대조한다.

기존 심판 관문(`gate-judgment-심판관문.md` P1-010, P6-003)이 "RTM 커버리지 100%인가?"를 요구하지만, 그 판정 자체를 AI 자신에게 맡기는 구조였다. 이 유틸리티는 그 판정의 **최소 절반(집계·대조)을 코드로 대체**하여 자기신고의 오차를 줄인다.

## 🔗 사용 시점

| 시점 | 왜 지금인가 |
|:---|:---|
| Phase 1(들음) 완료 직전 | REQ 열이 spec-tablet의 모든 ID를 빠짐없이 등재했는지 확인 |
| Phase 2/4/5 완료 직전 | 해당 Phase에서 채워야 할 열(ARCH-ID/API-ID/TBL-ID, 코드 모듈, 테스트 ID)이 비어있지 않은지 확인 |
| Phase 6(기록되었으되) 심판 시 | P6-003 "RTM 커버리지 100%인가?"를 실제 계수로 대체 |
| Phase 7(구원) 진입 직전 | 7관문 중 "RTM: 추적 커버리지 100%" 항목을 실제 계수로 최종 확인 |
| `census-covenant-가나안분배` 시나리오 실행 중 | 지파(서브에이전트)별 담당 REQ가 누락 없이 RTM에 반영됐는지 통합 시점마다 확인 |

## 💬 실행 프롬프트 / 명령

```bash
# 기본 계수 (Phase 무관, 현재 RTM 상태 확인)
python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음

# Phase 완료 심판과 함께 (2, 4, 5, 6, 7 지원 — 해당 Phase에 필요한 열까지 검사)
python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 6

# 결과를 기록의 서(fruit-열매/history/)에 남긴다
python .skill/tools-도구/census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 7 --log
```

> RTM은 프로젝트 전체에 걸쳐 단 1개(`bible-성경/01.../rtm-covenant-언약추적.md`)만 존재하며 Phase가 진행될수록 갱신된다. 따라서 이 명령의 대상 디렉토리는 어느 Phase에서 호출하든 항상 `bible-성경/01.requirement-hearing-들음`이다.

## 📖 출력 해석

| 판정 | 의미 | 조치 |
|:---|:---|:---:|
| `✅ IRONCLAD` (exit 0) | 문서 기재 수치 = 실계수, spec-tablet ID 전수 등재 확인, (지정 시) Phase별 요구 열 충족 | 다음 Phase 진행 가능 |
| `❌ FAIL` (exit 1) | 수치 불일치 또는 미등재 ID 발견 | 회개(수정) 후 재계수. 발견된 각 항목을 RTM에 직접 반영하라 |
| 실행 오류 (exit 2) | RTM 파일 없음 또는 표 형식 미인식 | `statute-율법/01/rtm-covenant-언약추적-template.md` 형식과 대조하라 |

FAIL 시 출력되는 각 항목(중복 ID, 문서-실계수 불일치, spec-tablet 미등재 ID, Phase별 미기재 열)을 **하나씩** RTM 본문에 반영한 뒤 재실행하라. AI가 "커버리지 100%입니다"라고 선언하는 것과, 이 계수기가 IRONCLAD를 반환하는 것은 다른 것이다 — 후자만 신뢰하라.

## ⚔️ 마귀 경고

| 마귀의 속삭임 | 전신갑주 대응 |
|:--|:--|
| "제가 이미 다 세었습니다, 100%입니다" | 🗡️ 성령의 검: "기록되었으되" — 네 말이 아니라 계수기의 출력이 증거다 |
| "이 스크립트는 생략해도 됩니다" | ⛑️ 구원의 투구: 만든 자가 스스로 심판하지 않는다 (John 5:22) — 계수도 마찬가지다 |
| "숫자가 안 맞아도 대세엔 지장 없습니다" | 📐 진리의 허리띠: 하나도 잃어버리지 않겠다 (John 6:39) — 1건의 불일치도 방치하지 마라 |

## ➡️ 관련 문서

- 산출물 규격: `statute-율법/01.requirement-hearing-들음/rtm-covenant-언약추적-template.md`
- 병렬 개발 시 통합 확인 용도로 연동: `.skill/scenario-시나리오/ORCH-01_canaan-가나안분배.md`
