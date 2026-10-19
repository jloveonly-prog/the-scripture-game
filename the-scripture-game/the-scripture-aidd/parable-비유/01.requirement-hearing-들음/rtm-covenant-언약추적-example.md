# 📜 요구사항 추적 매트릭스(RTM) — 성경 검색 앱 (Example)

> **비유(Parable):** 이 문서는 실제 프로젝트에서 RTM이 어떻게 작성되는지 보여주는 **참조 예시**이다.
> 실제 산출물 작성 시 이것을 참고하고, 규격은 `statute-율법/01/rtm-covenant-언약추적-template.md`를 따르라.

---

## 추적 매트릭스

| REQ-ID | 요구사항 요약 | UC-ID | ARCH-ID | API-ID | TBL-ID | 코드 모듈 | 테스트 ID | 상태 |
|:---|:---|:---|:---|:---|:---|:---|:---|:---:|
| REQ-001 | KJV 전문 검색 | UC-001, UC-002 | ARCH-001 | API-001, API-002 | TBL-001 | SearchService | TC-001~003 | ✅ |
| REQ-002 | 사용자 계정 관리 | UC-004, UC-005 | ARCH-002 | API-003, API-004 | TBL-002 | AuthService | TC-004~006 | ✅ |
| REQ-003 | 북마크/하이라이트 | UC-003 | ARCH-003 | API-005, API-006 | TBL-003 | BookmarkService | TC-007~009 | ✅ |
| FR-001 | 키워드 검색 | UC-001 | ARCH-001 | API-001 | TBL-001 | SearchService.searchByKeyword | TC-001 | ✅ |
| FR-002 | 구절 검색 | UC-002 | ARCH-001 | API-002 | TBL-001 | SearchService.searchByVerse | TC-002 | ✅ |
| FR-003 | 북마크 | UC-003 | ARCH-003 | API-005 | TBL-003 | BookmarkService.toggle | TC-007 | ✅ |
| NFR-001 | 검색 응답 2초 이내 | — | ARCH-001 | — | — | — | TC-010 | ✅ |
| NFR-002 | 비밀번호 암호화 저장 | — | ARCH-002 | — | TBL-002 | AuthService | TC-011 | ✅ |

---

## 커버리지 요약

| 지표 | 수치 |
|:---|:---:|
| 전체 REQ 수 | 8 |
| 완전 추적(✅) | 8 |
| 부분 추적(🔄) | 0 |
| 미추적(⬜) | 0 |
| **커버리지** | **100%** |

> ✅ Phase 7(구원) 진입 조건 충족. 단 하나의 REQ도 잃어버리지 않았다.
