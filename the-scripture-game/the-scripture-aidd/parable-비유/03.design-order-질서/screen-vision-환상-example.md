# 👁️ 화면 설계서 — 성경 검색 앱 (Example)

> **비유(Parable):** 이 문서는 실제 프로젝트에서 화면 설계서가 어떻게 작성되는지 보여주는 **참조 예시**이다.
> 실제 산출물 작성 시 이것을 참고하고, 규격은 `statute-율법/03/screen-vision-환상-template.md`를 따르라.

---

## 화면 목록

| SCR-ID | 화면명 | 라우팅 경로 | 연결 UC | 연결 REQ | 인증 |
|:---|:---|:---|:---|:---|:---:|
| SCR-001 | 검색 (홈) | / | UC-001, UC-002 | REQ-001 | ❌ |
| SCR-002 | 구절 상세 | /verse/:book/:chapter/:verse | UC-001 | REQ-001, REQ-003 | ❌ |
| SCR-003 | 로그인 | /auth/login | UC-004 | REQ-002 | ❌ |
| SCR-004 | 회원가입 | /auth/register | UC-005 | REQ-002 | ❌ |
| SCR-005 | 내 북마크 | /bookmarks | UC-003 | REQ-003 | ✅ |

---

## 디자인 시스템

| 항목 | 규격 |
|:---|:---|
| 주 색상 (Primary) | #1E3A5F (Deep Blue — 성경의 깊이) |
| 보조 색상 (Secondary) | #D4AF37 (Gold — 말씀의 귀중함) |
| 배경색 | #FAFAF5 (Warm White — 양피지 느낌) |
| 폰트 | Noto Serif KR (본문), Inter (UI) |
| 간격 (Spacing) | 4px 기반 (4, 8, 12, 16, 24, 32, 48) |
| 모서리 반경 | 8px (카드), 4px (버튼) |

---

## 화면 상세

### SCR-001: 검색 (홈)

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-001 |
| 화면명 | 검색 (홈) |
| 경로 | / |
| 연결 UC | UC-001 (키워드 검색), UC-002 (구절 검색) |
| 인증 | 불필요 |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Header | Logo + NavMenu | 로고 + 로그인/내 북마크 링크 |
| Hero | SearchBar | 검색창 (placeholder: "Search the Word...") |
| Hero | BookFilter | 책 선택 드롭다운 (선택) |
| Main | SearchResults | 검색 결과 목록 (책명, 장:절, 본문 하이라이트) |
| Main | Pagination | 페이지네이션 (20개씩) |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| SearchBar Enter/Click | GET /search?q={keyword} → 결과 표시 | API-001 |
| BookFilter 선택 | 검색 범위를 선택한 책으로 제한 | API-001 |
| 결과 항목 클릭 | /verse/:book/:chapter/:verse 로 이동 | — |

### SCR-002: 구절 상세

| 항목 | 내용 |
|:---|:---|
| Screen-ID | SCR-002 |
| 화면명 | 구절 상세 |
| 경로 | /verse/:book/:chapter/:verse |

**레이아웃 구성:**

| 영역 | 컴포넌트 | 설명 |
|:---|:---|:---|
| Header | Breadcrumb | Genesis > Chapter 1 > Verse 1 |
| Main | VerseText | 구절 본문 (KJV 원문, 큰 글자) |
| Main | ContextVerses | 전후 5절 표시 (작은 글자) |
| Sidebar | BookmarkButton | 북마크 토글 (♡/♥) |
| Sidebar | HighlightPicker | 하이라이트 색상 선택 (4색) |
| Footer | PrevNext | 이전 절 / 다음 절 네비게이션 |

**인터랙션:**

| 이벤트 | 동작 | 연결 API |
|:---|:---|:---|
| BookmarkButton 클릭 | 로그인 → POST /bookmarks, 비로그인 → 로그인 안내 | API-005 |
| HighlightPicker 선택 | POST /highlights (색상 저장) | — |

---

## 반응형 디자인

| 디바이스 | 최소 너비 | 레이아웃 변경 |
|:---|:---:|:---|
| Mobile | 0px | 1컬럼, SearchBar 전체 너비, Sidebar → 하단 고정 |
| Tablet | 768px | 2컬럼, SearchResults + Sidebar 병렬 |
| Desktop | 1024px | 3컬럼, 좌측 BookList + 중앙 Content + 우측 Sidebar |
