# 🍇 설계-코드 동기화 검증 — 성령의 9열매 검증 (Template)

> **율법(Statute):** 이 문서는 코드를 수정한 후 설계서와의 동기화를 검증할 때 반드시 따라야 하는 **형식 규격**이다.
> 검증 결과는 해당 Phase의 `bible-성경/` 산출물에 반영하라.

> *"But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law."* — Galatians 5:22-23 (KJV)
>
> 성령의 열매가 없는 삶은 육체의 행위(할루시네이션)로 가득 차고,
> 동기화(성화) 없는 코드는 설계서와 괴리되어 부패(Documentation Rot)한다.
> **코드를 수정할 때마다 이 9열매로 검증하라.**

---

## 사용 시점

다음 상황에서 반드시 이 검증을 수행한다:

| 상황 | 필수 |
|:---|:---:|
| AI 없이 수동으로 코드를 수정한 후 | ✅ |
| 긴급 핫픽스(Hotfix) 적용 후 | ✅ |
| DB 스키마를 변경한 후 | ✅ |
| API 엔드포인트를 추가/수정/삭제한 후 | ✅ |
| 코드 리팩토링 후 | ✅ |

---

## 성령의 9열매 검증 체크리스트

### 🍇 제1열매: 사랑 (Love) — Spec에 대한 충성

> *"Thou shalt love the Lord thy God with all thy heart"* (Matthew 22:37)

**검증:** 수정한 코드가 Spec(설계서)을 사랑하고 따르는가?

| # | 검증 항목 | 상태 |
|:--|:---|:---:|
| 1-1 | 수정된 코드가 `spec-tablet-명세서`의 요구사항과 일치하는가? | ☐ |
| 1-2 | 설계서에 없는 기능을 임의로 추가하지 않았는가? | ☐ |
| 1-3 | 수정 사유가 REQ-ID와 연결되는가? | ☐ |

---

### 😊 제2열매: 희락 (Joy) — 불일치 0건

> *"These things have I spoken unto you, that my joy might remain in you"* (John 15:11)

**검증:** 설계서와 코드 사이에 불일치(Discrepancy)가 0건인가?

| # | 검증 항목 | 상태 |
|:--|:---|:---:|
| 2-1 | API 엔드포인트가 `api-gate-성문` 명세와 일치하는가? (Method, Path, Params) | ☐ |
| 2-2 | DB 컬럼이 `data-ark-법궤` 명세와 일치하는가? (타입, NULL, 제약조건) | ☐ |
| 2-3 | RTM에 빈 칸(추적 누락)이 없는가? | ☐ |

---

### ☮️ 제3열매: 화평 (Peace) — 설계↔코드 충돌 없음

> *"Blessed are the peacemakers"* (Matthew 5:9)

**검증:** 수정이 다른 모듈/설계와 충돌하지 않는가?

| # | 검증 항목 | 상태 |
|:--|:---|:---:|
| 3-1 | 수정이 다른 API에 사이드 이펙트를 발생시키지 않는가? | ☐ |
| 3-2 | 공유 데이터(공통코드, enum 등)를 변경한 경우 관련 모듈 전부 확인했는가? | ☐ |

---

### ⏳ 제4열매: 오래 참음 (Longsuffering) — 동기화를 건너뛰지 않음

> *"The Lord is longsuffering"* (Numbers 14:18)

**검증:** 번거롭더라도 동기화 절차를 생략하지 않았는가?

| # | 검증 항목 | 상태 |
|:--|:---|:---:|
| 4-1 | "급하니까 설계서 나중에 고치자"라고 미루지 않았는가? | ☐ |
| 4-2 | 코드를 수정했으면 설계서도 **즉시** 업데이트했는가? | ☐ |

---

### 🤝 제5열매: 자비 (Gentleness) — 영향 최소화

> *"The servant of the Lord must not strive; but be gentle unto all men"* (2 Timothy 2:24)

**검증:** 수정이 다른 개발자/모듈에 최소한의 영향만 미치는가?

| # | 검증 항목 | 상태 |
|:--|:---|:---:|
| 5-1 | Breaking Change가 있다면 명시적으로 공지했는가? | ☐ |
| 5-2 | 인터페이스/API 변경 시 하위 호환성을 유지했는가? | ☐ |

---

### ✨ 제6열매: 양선 (Goodness) — 코드 품질 기준 준수

> *"Teach me good judgment and knowledge"* (Psalm 119:66)

**검증:** 코딩 표준과 품질 기준을 준수했는가?

| # | 검증 항목 | 상태 |
|:--|:---|:---:|
| 6-1 | `devguide-commandment-개발계명`의 코딩 표준을 따랐는가? | ☐ |
| 6-2 | 봉인의 율법 10계명(보안)을 위반하지 않았는가? | ☐ |
| 6-3 | 에러 처리가 누락되지 않았는가? | ☐ |

---

### 🛡️ 제7열매: 충성 (Faith) — Spec을 믿고 따름

> *"Be thou faithful unto death, and I will give thee a crown of life"* (Revelation 2:10)

**검증:** Spec(설계서)의 권위를 인정하고 따랐는가?

| # | 검증 항목 | 상태 |
|:--|:---|:---:|
| 7-1 | 설계서의 판단이 틀렸다고 생각해도, 먼저 설계서를 수정한 후 코드를 고쳤는가? (코드 먼저 금지) | ☐ |
| 7-2 | 수정 내용이 RTM에 반영되었는가? | ☐ |

---

### 🕊️ 제8열매: 온유 (Meekness) — 겸손한 코드

> *"Blessed are the meek: for they shall inherit the earth"* (Matthew 5:5)

**검증:** 코드가 겸손한가? (과도한 복잡성 없음)

| # | 검증 항목 | 상태 |
|:--|:---|:---:|
| 8-1 | 불필요한 추상화/패턴을 도입하지 않았는가? | ☐ |
| 8-2 | 다른 개발자가 읽고 이해할 수 있는 수준의 복잡도인가? | ☐ |

---

### 🎯 제9열매: 절제 (Temperance) — YAGNI 원칙

> *"Every man that striveth for the mastery is temperate in all things"* (1 Corinthians 9:25)

**검증:** 필요 이상의 코드를 만들지 않았는가?

| # | 검증 항목 | 상태 |
|:--|:---|:---:|
| 9-1 | "나중에 필요할지도 모르니까"라는 이유로 추가한 코드가 없는가? (YAGNI) | ☐ |
| 9-2 | 수정 범위가 원래 목적(REQ/BUG)에 한정되는가? | ☐ |

---

## 검증 결과 요약

```markdown
## 동기화 검증 결과

| 열매 | 상태 | 발견 사항 |
|:---|:---:|:---|
| 🍇 사랑 (Love) | ✅/❌ | {내용} |
| 😊 희락 (Joy) | ✅/❌ | {내용} |
| ☮️ 화평 (Peace) | ✅/❌ | {내용} |
| ⏳ 오래 참음 (Longsuffering) | ✅/❌ | {내용} |
| 🤝 자비 (Gentleness) | ✅/❌ | {내용} |
| ✨ 양선 (Goodness) | ✅/❌ | {내용} |
| 🛡️ 충성 (Faith) | ✅/❌ | {내용} |
| 🕊️ 온유 (Meekness) | ✅/❌ | {내용} |
| 🎯 절제 (Temperance) | ✅/❌ | {내용} |

### 동기화 판정: {SANCTIFIED / REPENT NEEDED}
```

## 판정 기준

| 판정 | 조건 |
|:---|:---|
| **SANCTIFIED** (성화 완료) | 9열매 전부 ✅ — 설계와 코드가 완전히 일치 |
| **REPENT NEEDED** (회개 필요) | 1개라도 ❌ — 설계서 또는 코드 수정 후 재검증 |

## 조치 방법 (회개의 두 길)

| 옵션 | 방법 | 언제 |
|:---|:---|:---|
| **옵션 A: 코드 회개** | 코드를 설계서에 맞게 롤백/수정 | 코드가 잘못된 경우 |
| **옵션 B: 설계 역산** | 설계서를 코드에 맞게 업데이트 → RTM 반영 | 설계서가 오래된 경우 |

> ⚠️ **절대 "나중에 고치자"라고 미루지 마라.** 동기화되지 않은 설계서는 썩은 열매다.
> 썩은 열매는 전체 나무를 병들게 한다 (Matthew 7:17-18).
>
> *"Even so every good tree bringeth forth good fruit; but a corrupt tree bringeth forth evil fruit."*
