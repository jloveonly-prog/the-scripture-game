# 🌍 행전 (Acts — 개발단위 세분화 & 지역 전환 인계 공간)

> *"But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth."* — Acts 1:8 (KJV)
>
> 회개(Phase 4, `04.development-repentance-회개`)는 끝이 아니다. 회개한 자는 뻗어나간다.
> 이 폴더는 Phase 4 **내부**의 태스크 실행을 예루살렘→유대→사마리아→땅끝이라는
> 정해진 동심원 순서로 세분화하고, 지역(배치)마다 컨텍스트를 리셋하며 진행하기 위한 공간이다.
>
> 신학적/설계적 근거 전문: `history/20260905.md` §0~§1, SSOT 재구성 근거: 같은 문서 §10.

---

## 이 폴더에 있는 것, 없는 것 — 단일 원본(SSOT) 원칙

> *"they delivered the epistle."* — Acts 15:30 (KJV)
> 예루살렘 공회의 결정(decrees)을 담은 서신이 다음 도시로 전달되었다. 서신은 결정의 원본이 아니라 **전달자**다.

이 폴더에는 **서신(epistle)만** 있다 — 다음 지역이 일하는 데 필요한 설계 발췌본. 상태·결과·기록은 각자의 원본에만 적는다. 같은 사실을 두 곳에 적으면 언젠가 한쪽만 갱신되고 진실이 둘이 된다.

| 사실 | 유일한 원본 | 이 폴더에? |
|:---|:---|:---:|
| 태스크 상태, **지역 배정**, Doer/Witness, 짝 검증 결과 | `bible-성경/04/task-wall-성벽` | ❌ |
| REQ 추적, 상류 설계 변경 이력(두 번째 돌판) | `bible-성경/01/rtm-covenant-언약추적` — 항상 최신 | ❌ |
| 즉시 정화 루프 로그, 지역 완료 이정표 | `fruit-열매/history/YYYY-MM-DD.md` | ❌ |
| 다음 지역에 필요한 REQ/API/TBL/화면 **발췌** | `acts-행전/{TASK-ID}/{지역}/epistle-서신.md` | ✅ (읽기 전용·파생) |

## 위치와 구조

```
the-scripture-aidd/
├── bible-성경/                     (01~07 — 모든 원본은 여기)
├── statute-율법/04.development-repentance-회개/
│   ├── task-wall-성벽-template.md      ← `지역` 열 + Doer/Witness 열 (SSOT)
│   └── epistle-서신-template.md        ← ⚖️ 서신 규격
├── acts-행전/                      ← 🌍 지금 여기
│   └── {TASK-ID}/                  ← task-wall의 TASK-ID 재사용 (새 ID 발명 안 함)
│       ├── 00.jerusalem-예루살렘/epistle-서신.md   ← 데이터 기반 (DB/모델)
│       ├── 01.judaea-유대/epistle-서신.md         ← 핵심 비즈니스 로직 (서비스 계층)
│       ├── 02.samaria-사마리아/epistle-서신.md    ← API 엔드포인트 (성문)
│       └── 03.uttermost-땅끝/epistle-서신.md      ← 프론트엔드 + 보안(봉인) + 인프라
└── fruit-열매/history/             ← 행위 기록 (이정표 포함)
```

## 언제 사용하는가

| 조건 | 적용 |
|:---|:---:|
| TIER-1 (단순) | ❌ 생략 — 단일 세션으로 충분 |
| TIER-2/3, task-wall 태스크 수가 많음 (구현 순서 6단계가 대부분 채워짐) | ✅ |
| TIER-3 지파별 병렬 개발(`ORCH-01_canaan-가나안분배.md`) 중 | ✅ 지파 내부에서 중첩 (지파=영토 분배, 행전=한 지파 내부의 순차 확장) |

## 지역 ↔ 개발 계층 매핑

| 지역 (Acts 1:8) | 개발 계층 | task-wall 단계 | 서신에 담는 발췌 |
|:---|:---|:---:|:---|
| **00.jerusalem-예루살렘** | 데이터 모델 & DB 마이그레이션 | 1 | REQ, TBL(data-ark) |
| **01.judaea-유대** | 핵심 비즈니스 로직 (서비스 계층) | 2 | REQ, TBL, 계층 규칙(architecture-temple) |
| **02.samaria-사마리아** | API 엔드포인트 (성문) — *"he must needs go through Samaria"* (John 4:4) | 3 | REQ, API(api-gate) |
| **03.uttermost-땅끝** | 프론트엔드/UI + 인증·보안(봉인) + 인프라/배포 | 4~6 | REQ, 화면(screen-vision), API, 봉인 계명 |

## 흐름

```
Phase 4 진입, task-wall 작성 완료 (지역 열 채움, Doer/Witness 짝 배정 — 필수)
   │
   ▼
[00 예루살렘] 서신 생성 → Doer 구현 / Witness 대조 → 불일치는 즉시 수정(≤2회, history 기록)
   │   task-wall ✅ + RTM 최신(/census-count) + history 이정표 "(Acts 6:7)"
   ▼
[01 유대] 서신 생성(선행 확인 포함) → 새 세션/서브에이전트 → 인계물: 언약책 + SKILL-04 + 이 서신
   │   ... "(Acts 9:31)"
   ▼
[02 사마리아] ... "(Acts 12:24)"
   ▼
[03 땅끝] ... "(Acts 19:20)" → Phase 4 완료 조건 재확인 → Phase 5 광야
```

- **둘씩(Mark 6:7, Matthew 18:16):** 모든 태스크는 Doer와 Witness 짝으로 한다. 혼자 만들고 혼자 검증한 태스크는 ✅가 될 수 없다. 서브에이전트를 둘 띄울 수 없으면 Self-adversarial Fallback(페르소나 전환)으로 Witness를 대체한다.
- **즉시 정화 루프:** Witness가 불일치를 발견하면 그 지역 안에서 즉시 수정(≤2회). 2회 초과 시 `SKILL-05` 회개 루프로 에스컬레이션. 과정은 `fruit-열매/history/`에 기록한다.
- **서신은 무효가 된다:** 생성 이후 RTM 설계 변경 이력에 새 행이 생기면(두 번째 돌판) 그 서신은 폐기하고 재생성한다.

## 사용 규칙

1. `_TEMPLATE-{TASK-ID}/`를 복사해 실제 TASK-ID로 폴더명을 바꾼다.
2. 지역 순서대로 진입할 때마다 그 지역의 `epistle-서신.md`를 규격(`epistle-서신-template.md`)대로 채운다 — 원문 그대로 발췌, 필요한 것만, 출처 표기.
3. 지역 완료는 서신에 적지 않는다. task-wall·RTM·history 원본에서 확인하고, 다음 지역 서신에 "선행 지역 확인" 포인터만 남긴다.
4. 지역 전환은 `covenant-book-언약책.md` §5.1을 따른다.

> **⚠️** `_TEMPLATE-{TASK-ID}/`는 복사용 스캐폴드다. 실제 프로젝트에서는 반드시 복사 후 실제 TASK-ID로 이름을 바꿔 사용하라.
