# 🚪 API 명세서 — 성경 검색 앱 (Example)

> **비유(Parable):** 이 문서는 실제 프로젝트에서 API 명세서가 어떻게 작성되는지 보여주는 **참조 예시**이다.
> 실제 산출물 작성 시 이것을 참고하고, 규격은 `statute-율법/02/api-gate-성문-template.md`를 따르라.

---

## 공통 규약

| 항목 | 규격 |
|:---|:---|
| Base URL | `https://api.scripture-search.com/api/v1` |
| 인증 방식 | Bearer Token (JWT) |
| 콘텐츠 타입 | application/json |

---

## API 전체 목록

| API-ID | Method | Endpoint | 설명 | 연결 REQ | 인증 |
|:---|:---|:---|:---|:---|:---:|
| API-001 | GET | /search?q={keyword} | 키워드 검색 | FR-001 | ❌ |
| API-002 | GET | /verses/{book}/{chapter}/{verse} | 구절 조회 | FR-002 | ❌ |
| API-003 | POST | /auth/register | 회원가입 | REQ-002 | ❌ |
| API-004 | POST | /auth/login | 로그인 | REQ-002 | ❌ |
| API-005 | POST | /bookmarks | 북마크 추가 | FR-003 | ✅ |
| API-006 | DELETE | /bookmarks/{id} | 북마크 삭제 | FR-003 | ✅ |

---

## API 상세 명세

### API-001: 키워드 검색

| 항목 | 내용 |
|:---|:---|
| API-ID | API-001 |
| Method | GET |
| Endpoint | /search |
| 설명 | KJV 66권 전문 키워드 검색 |
| 연결 REQ | REQ-001, FR-001 |
| 연결 UC | UC-001 |
| 인증 필요 | ❌ |
| 연결 TBL | TBL-002 (verses) |

**요청(Request):**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| q | String (Query) | ✅ | 검색 키워드 | 최소 2자, 최대 100자 |
| book | String (Query) | ⬜ | 특정 책 필터 | 유효한 책 이름 |
| page | Integer (Query) | ⬜ | 페이지 번호 | 기본값 1, 최소 1 |
| size | Integer (Query) | ⬜ | 페이지 크기 | 기본값 20, 최대 100 |

**응답 — 성공 (200):**
```json
{
  "success": true,
  "data": [
    {
      "verseId": 23145,
      "book": "Romans",
      "chapter": 10,
      "verse": 17,
      "content": "So then faith cometh by hearing, and hearing by the word of God.",
      "highlight": "So then <em>faith</em> cometh by hearing"
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "totalCount": 245,
    "totalPages": 13
  }
}
```

**응답 — 실패:**
| 에러 코드 | HTTP | 설명 |
|:---|:---:|:---|
| EMPTY_QUERY | 400 | 검색어가 비어있음 |
| QUERY_TOO_SHORT | 400 | 검색어 2자 미만 |
| INVALID_BOOK | 400 | 존재하지 않는 책 이름 |

---

### API-005: 북마크 추가

| 항목 | 내용 |
|:---|:---|
| API-ID | API-005 |
| Method | POST |
| Endpoint | /bookmarks |
| 설명 | 구절 북마크 추가 |
| 연결 REQ | REQ-003, FR-003 |
| 연결 UC | UC-003 |
| 인증 필요 | ✅ |
| 연결 TBL | TBL-004 (bookmarks) |

**요청(Request):**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| verseId | Long (Body) | ✅ | 구절 ID | 유효한 verse ID |

**응답 — 성공 (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "verseId": 23145,
    "createdAt": "2026-01-20T10:30:00Z"
  }
}
```

**응답 — 실패:**
| 에러 코드 | HTTP | 설명 |
|:---|:---:|:---|
| UNAUTHORIZED | 401 | 로그인 필요 |
| VERSE_NOT_FOUND | 404 | 존재하지 않는 구절 |
| ALREADY_BOOKMARKED | 409 | 이미 북마크됨 |
