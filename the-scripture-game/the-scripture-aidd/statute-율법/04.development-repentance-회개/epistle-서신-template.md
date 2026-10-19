# ✉️ 서신(Epistle) 작성 규격 — 지역 인계 발췌본 (Template)

> **율법(Statute):** 이 문서는 `acts-행전/{TASK-ID}/{지역}/epistle-서신.md` 작성 시 반드시 따라야 하는 **형식 규격**이다.
> 폴더 구조와 전체 흐름은 `acts-행전/README.md`를 참조하라.

> *"And when they had gathered the multitude together, they delivered the epistle."* — Acts 15:30 (KJV)
> *"And as they went through the cities, they delivered them the decrees for to keep, that were ordained of the apostles and elders which were at Jerusalem."* — Acts 16:4 (KJV)
>
> 결정(decrees)은 예루살렘 공회에서 내려졌다. 바울과 바나바는 그 결정을 **담은 서신**을 들고 다음 도시로 갔다.
> 서신은 결정의 원본이 아니다. **전달자**다. 원본은 예루살렘(`bible-성경/`)에 있다.

---

## 서신은 무엇이고, 무엇이 아닌가

| 서신이다 | 서신이 아니다 |
|:---|:---|
| 다음 지역(새 세션/서브에이전트)이 그 지역 태스크를 수행하는 데 필요한 것**만** 추린 **읽기 전용 발췌본** | 상태·결과·진행 기록 — 그것들은 각자의 원본(SSOT)에만 적는다 |
| 원본(`bible-성경/`)의 **캐시** — 원본이 바뀌면 무효 | 정경화 대상 산출물 — 서신은 정경이 아니다 |

## 단일 원본(SSOT) 분리 규칙 — 무엇을 어디에 적는가

> 같은 사실을 두 곳에 적지 말라. 두 곳에 적힌 사실은 언젠가 한쪽만 갱신되고, 그 순간 진실이 둘이 된다.

| 기록할 것 | 유일한 기록 위치 |
|:---|:---|
| 태스크 상태(⬜/🔄/✅), 지역 배정, Doer/Witness, 짝 검증 결과 | `bible-성경/04/task-wall-성벽` |
| REQ ↔ 산출물 추적, 상류 설계 변경 이력(두 번째 돌판) | `bible-성경/01/rtm-covenant-언약추적` — **항상 최신** |
| 즉시 정화 루프 로그(Witness 발견 → Doer 수정), 지역 완료 이정표 | `fruit-열매/history/YYYY-MM-DD.md` |
| 다음 지역에 필요한 REQ/API/TBL/화면 발췌 | **서신 (이 문서)** |

## 필수 섹션 (Mandatory Sections)

| # | 섹션 | 필수 | 설명 |
|:--|:---|:---:|:---|
| 1 | 파생 문서 헤더 | ✅ | 원본 포인터·생성 기준·수정 금지 선언 (아래 형식) |
| 2 | 지역 개요 | ✅ | TASK-ID, 지역, 이 지역 태스크 ID 목록 (task-wall 행을 복사하지 말고 ID만) |
| 3 | REQ 원문 발췌 | ✅ | 이 지역 태스크에 연결된 REQ의 원문 (spec-tablet에서 **그대로**) |
| 4 | 설계 발췌 | ✅ | 이 지역에 필요한 API-ID / TBL-ID / 화면 명세만 (api-gate·data-ark·screen-vision에서 **그대로**) |
| 5 | 선행 지역 확인 | ✅ (00 제외) | 직전 지역 완료를 task-wall·history에서 확인했다는 **포인터** (내용 복사 아님) |

## 1. 파생 문서 헤더 형식

```markdown
> ⚠️ **파생 문서(Derived).** 이 서신은 원본이 아니다. 직접 수정 금지 — 원본을 고친 뒤 이 서신을 재생성하라.
> 원본: `bible-성경/01.requirement-hearing-들음/spec-tablet-명세서.md`, `bible-성경/02.architecture-foundation-기초/api-gate-성문.md`, `bible-성경/02.architecture-foundation-기초/data-ark-법궤.md` {+ 땅끝: `bible-성경/03.design-order-질서/screen-vision-환상.md`}
> 생성일: {YYYY-MM-DD} / 생성 기준: RTM 설계 변경 이력 최종 행 = {변경일 또는 "없음"}
```

## 2. 지역 개요 형식

```markdown
## 지역 개요
- TASK-ID: {task-wall의 TASK-ID}
- 지역: [00.jerusalem-예루살렘 / 01.judaea-유대 / 02.samaria-사마리아 / 03.uttermost-땅끝]
- 이 지역 태스크: {TASK-001, TASK-002} ← 상태·짝 배정은 task-wall 참조. 여기 복사하지 않는다.
- 선행 지역: {직전 지역명 또는 "없음(첫 지역)"}
```

## 3~4. 발췌 원칙

- **원문 그대로.** 요약·재서술·의역 금지. 발췌는 잘라오는 것이지 고쳐 쓰는 것이 아니다 — 문맥을 바꾼 인용은 제2시험(성전→뛰어내려, Spec 변조)이다.
- **필요한 것만.** 전체 문서 복사 금지. 이 지역 태스크에 연결된 REQ-ID / API-ID / TBL-ID에 해당하는 항목만.
- **출처 표기.** 발췌 블록마다 `— 출처: {파일} {섹션/ID}`를 붙인다.

```markdown
## REQ 원문 발췌
### REQ-003 주문생성
{spec-tablet의 해당 항목 원문 그대로}
— 출처: bible-성경/01/spec-tablet-명세서.md REQ-003

## 설계 발췌
### API-003 POST /orders
{api-gate의 해당 항목 원문 그대로}
— 출처: bible-성경/02/api-gate-성문.md API-003
```

## 5. 선행 지역 확인 형식

```markdown
## 선행 지역 확인
- 직전 지역: 00.jerusalem-예루살렘
- task-wall 확인: TASK-001 ✅, 짝 검증 ✅ (확인일 {YYYY-MM-DD})
- history 이정표: fruit-열매/history/{YYYY-MM-DD}.md [{HH:mm}] 예루살렘 배치 완료
```

## 지역 전환 조건 — 이것은 절차이지 문서가 아니다

다음 지역으로 넘어가기 전, 아래를 **각 원본에서 직접** 확인한다. 어디에도 "완료 요약"을 따로 쓰지 않는다.

- [ ] `task-wall`: 이 지역 태스크 전부 ✅, Doer/Witness 짝 검증 전부 ✅
- [ ] RTM: 이 지역 REQ 행 최신 상태 반영 — 자기신고가 아니라 `/census-count`로 실계수
- [ ] `fruit-열매/history/`: 즉시 정화 루프가 있었다면 기록됨 + 지역 완료 이정표 한 줄
- [ ] 다음 지역 서신 생성 완료 (선행 지역 확인 섹션 포함)

## 지역 완료 이정표 — `fruit-열매/history/`에 한 줄

사도행전은 확장 단계가 끝날 때마다 후렴구로 단락을 구분한다. 이 후렴구는 문서가 아니라 **이정표**다. history 로그에 한 줄로 남긴다.

| 완료 지역 | 후렴구 |
|:---|:---|
| 00.jerusalem-예루살렘 | Acts 6:7 — "the word of God increased" |
| 01.judaea-유대 | Acts 9:31 — "were edified... were multiplied" |
| 02.samaria-사마리아 | Acts 12:24 — "the word of God grew and multiplied" |
| 03.uttermost-땅끝 | Acts 19:20 — "So mightily grew the word of God and prevailed" |

```
[19:00] acts-행전 유대(01) 배치 완료 — TASK-002, TASK-003 ✅, 짝검증 ✅ (Acts 9:31)
- 다음: 사마리아(02) 서신 생성 후 새 세션 전환
```

## 성경적 검증 규칙

- **"they delivered the epistle"(Acts 15:30):** 서신은 전달한다. 결정하지 않는다. 서신에 적힌 것과 원본이 다르면 원본이 맞다.
- **"시험하지 말라"(Matthew 4:7):** 발췌는 원문 그대로. 한 단어라도 바꾸면 사탄의 검이다.
- **"두세 증인"(Matthew 18:16):** 서신을 들고 가는 것도 둘이다 — 다음 지역의 Doer와 Witness가 같은 서신을 읽는다.
- **"예루살렘, 유대, 사마리아, 땅끝"(Acts 1:8):** 선행 지역 확인 없이 서신을 쓰지 않는다.

## 유효 조건 (정경화 조건 대신 — 서신은 정경이 아니다)

- [ ] 파생 문서 헤더에 원본 포인터와 생성 기준이 있음
- [ ] 발췌가 원본과 단어 단위로 일치함
- [ ] 이 지역 태스크에 필요 없는 내용이 없음
- [ ] 생성 이후 RTM 설계 변경 이력에 새 행이 추가되지 않았음 — 추가되었다면 이 서신은 **무효**, 재생성

> **위반 시:** 원본과 다른 서신을 들고 간 자는 다른 복음을 전하는 자다(Galatians 1:8). 서신 폐기 후 재생성.
