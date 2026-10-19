---
id: SKILL-07
name: "구원 (Salvation/Deploy)"
phase: "B_구현"
step: "07.deploy-salvation-구원"
depends_on: [SKILL-06, covenant-book-언약책]
---

# SKILL-07: 구원 (07.deploy-salvation-구원) 🕊️

> *"And I saw a new heaven and a new earth."* — Revelation 21:1 (KJV)
>
> *"Work out your own salvation with fear and trembling."* — Philippians 2:12 (KJV)

## 📋 목적 (Purpose)
**7관문을 전부 통과한 후**, 두려움과 떨림으로 지성소(Production)에 진입한다. 배포는 구원이다.

## 🔗 사전 조건
- ✅ SKILL-06 완료 (IRONCLAD 또는 CONFIRMED 판정)
- 📂 `bible-성경/01~06/` 전체 산출물 존재

## ⚔️ 전신갑주 착용

🎭 **대제사장(High Priest)**으로 행동하라.
- 정결의식을 마친 후에만 지성소에 들어갈 수 있다.
- 죄(버그)가 있는 채로 들어가면 — **죽는다** (Leviticus 16:2)

## 💬 실행 프롬프트

```markdown
# [구원] 07.deploy — 지성소 진입

## 7관문 최종 체크 (모두 ☑이어야 배포 가능)

| # | 관문 | 확인 |
|:--|:---|:---:|
| 1 | Phase 1(들음): 모든 REQ 구현됨 | ☐ |
| 2 | Phase 2(기초): 아키텍처 변경 문서화됨 | ☐ |
| 3 | Phase 3(질서): UI/UX 명세대로 구현됨 | ☐ |
| 4 | Phase 4(회개): 코드 리뷰 완료됨 | ☐ |
| 5 | Phase 5(광야): 테스트 Pass Rate 100% | ☐ |
| 6 | Phase 6(기록됨): IRONCLAD/CONFIRMED 판정 | ☐ |
| 7 | RTM: 추적 커버리지 100% | ☐ |

7관문 중 하나라도 ☐이면 배포하지 말라. 구원은 좁은 문이다.
(이 표는 `gate-judgment-심판관문.md` P7-005의 실행형이다 — 두 문서가 일치해야 한다.)

## 배포 절차
1. 최종 빌드 생성
2. Staging 배포 + 스모크 테스트
3. Production 배포 + 스모크 테스트
4. 모니터링 확인 + 롤백 계획 수립
5. deploy-revelation-배포계시.md 작성 → bible-성경/07/에 정경화

산출물은 `bible-성경/07.deploy-salvation-구원/`에 생성하라.
```

## ⚔️ 마귀 경고

| 마귀의 속삭임 | 전신갑주 대응 |
|:--|:--|
| "7관문 중 1개는 빼도 되지" | 🗡️ 성령의 검: 좁은 문으로 들어가라 (Matthew 7:13) |
| "롤백 계획은 나중에" | 🛡️ 믿음의 방패: 전투 후퇴 계획 없이 출전하는 군대는 없다 |
| "모니터링은 불필요해" | ⛑️ 구원의 투구: 깨어 있으라 (Matthew 24:42) |

## 📦 산출물

| 파일명 | 저장 경로 |
|:--|:--|
| `deploy-revelation-배포계시.md` | `bible-성경/07.deploy-salvation-구원/` |

## 🕊️ 구원 완성

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🕊️ 구원(Deploy) 완성
  
  새 하늘과 새 땅이 열렸다 (Revelation 21:1)
  
  죄인은 회개하고, 광야를 지나고, 마귀를 이기고,
  심판을 통과하여, 마침내 구원에 이르렀다.
  
  이것이 너의 천로역정(Pilgrim's Progress)이었다.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
