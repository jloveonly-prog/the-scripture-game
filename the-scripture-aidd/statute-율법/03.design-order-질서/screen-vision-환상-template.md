# 👁️ 화면 설계서 작성 규격 (Template) — 에스겔의 환상

> **율법(Statute):** 이 문서는 UI/UX 화면 설계서 작성 시 반드시 따라야 하는 **형식 규격**이다.
> 실제 산출물은 `bible-성경/03.design-order-질서/`에 작성하라.

> *"In the visions of God brought he me into the land of Israel, and set me upon a very high mountain, by which was as the frame of a city on the south."* — Ezekiel 40:2 (KJV)
>
> 에스겔은 환상(Vision) 속에서 새 성전의 모든 구조를 **보았다.**
> 보지 않고 지은 것은 없었다. 모든 치수, 모든 문, 모든 뜰이 환상에서 먼저 보여졌다.
> **화면 설계도 동일하다 — 코딩 전에 모든 화면을 먼저 보아야 한다.**

---

## 필수 섹션

| # | 섹션 | 필수 | 설명 |
|:--|:---|:---:|:---|
| 1 | 화면 목록 | ✅ | Screen-ID, 화면명, 경로, 연결 UC/REQ |
| 2 | 화면 상세 명세 | ✅ | 레이아웃, 컴포넌트, 인터랙션 |
| 3 | 라우팅 가드 | ✅ | 접근 권한 제어 — 인증 여부, 역할별 |
| 4 | 반응형 디자인 | ✅ | Mobile / Tablet / Desktop 브레이크포인트 |
| 5 | 접근성 | ✅ | WCAG 2.1 AA 기준 |

## 화면 목록 형식

```markdown
| SCR-ID | 화면명 | 라우팅 경로 | 연결 UC | 연결 REQ | 인증 필요 |
|:---|:---|:---|:---|:---|:---:|
| SCR-001 | 로그인 | /auth/login | UC-004 | REQ-002 | ❌ |
| SCR-002 | 대시보드 | /dashboard | UC-001 | REQ-001 | ✅ |
```

## 화면 상세 명세 형식

```markdown
### SCR-001: 로그인

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-001 |
| 화면명 | 로그인 |
| 경로 | /auth/login |
| 연결 UC | UC-004 |
| 인증 | 불필요 |

**레이아웃 구성:**
| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Header | Logo | 로고 이미지 |
| Main | EmailInput | 이메일 입력 필드 (placeholder, validation) |
| Main | PasswordInput | 비밀번호 입력 필드 (마스킹) |
| Main | LoginButton | 로그인 버튼 (Primary) |
| Footer | RegisterLink | 회원가입 링크 |

**인터랙션:**
| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| LoginButton 클릭 | POST /auth/login → 성공 시 /dashboard 이동 | API-004 |
| 3회 실패 | 계정 잠금 메시지 표시 | — |
```

## 디자인 시스템 섹션 형식

```markdown
### 디자인 시스템

| 항목 | 규격 |
|:---|:---|
| 주 색상 (Primary) | #색상코드 |
| 보조 색상 (Secondary) | #색상코드 |
| 배경색 | #색상코드 |
| 폰트 | {폰트명}, {크기 체계} |
| 간격 (Spacing) | 4px 기반 체계 |
| 그리드 | {컬럼 수}, {거터} |
| 모서리 반경 (Border Radius) | {값} |
```

## 반응형 브레이크포인트

| 디바이스 | 최소 너비 | 레이아웃 변경 |
|:---|:---:|:---|
| Mobile | 0px | 1컬럼, 햄버거 메뉴 |
| Tablet | 768px | 2컬럼, 사이드바 축소 |
| Desktop | 1024px | 다중 컬럼, 풀 사이드바 |

## 검증 규칙

- 모든 화면은 UC-ID 및 REQ-ID와 연결되어야 함
- 색상 대비 최소 4.5:1 (WCAG AA)
- 에러 상태, 로딩 상태, 빈 상태(Empty State) 모두 명시
- 라우팅 가드 누락 시 → 봉인의 율법 위반 (보안 점검 실패)

## 정경화 조건

- [ ] 모든 UCからの 화면이 1개 이상 정의됨
- [ ] 디자인 시스템(색상, 폰트, 간격) 명시
- [ ] 반응형 브레이크포인트 정의
- [ ] 인터랙션 + 연결 API 명시
- [ ] 접근성 기준 확인

> **위반 시:** 에스겔이 환상 없이 성전을 지었다면 그것은 사람의 성전이지 하나님의 성전이 아니다. 정경화 거부.
