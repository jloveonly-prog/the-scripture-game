# 🔨 개발 가이드 — 성경 검색 앱 (Example)

> **비유(Parable):** 개발 가이드가 어떻게 작성되는지 보여주는 **참조 예시**이다.

---

## 1. 프로젝트 설정

| 항목 | 내용 |
|:---|:---|
| 언어 | TypeScript |
| 프레임워크 | Next.js 14 |
| 패키지 매니저 | pnpm |
| 린터 | ESLint + Prettier |

## 2. 디렉토리 구조

```
src/
├── app/
│   ├── page.tsx          # 메인 검색 페이지
│   ├── verse/[id]/       # 구절 상세 페이지
│   └── api/
│       ├── search/       # GET /api/search
│       └── bookmarks/    # POST/DELETE /api/bookmarks
├── components/
│   ├── SearchBar.tsx
│   ├── VerseCard.tsx
│   └── BookmarkButton.tsx
├── lib/
│   ├── db.ts             # Supabase 연결 (ENV 사용 — 봉인 제2계명)
│   └── auth.ts           # JWT 인증 (봉인 제7계명)
└── types/
    └── index.ts
```

## 3. 모듈별 개발 현황

| 모듈 | 관련 REQ | 상태 | 코드 리뷰 |
|:---|:---|:---:|:---:|
| SearchBar | FR-001 | ✅ | ✅ |
| VerseCard | FR-002 | ✅ | ✅ |
| BookmarkButton | FR-003 | ✅ | ✅ |
| Auth (JWT) | REQ-002 | ✅ | ✅ |

## 4. Git 커밋 예시

```
Genesis(search): KJV 풀텍스트 검색 모듈 생성
Genesis(auth): JWT 인증 미들웨어 생성
Repent(search): 검색 결과 페이지네이션 버그 수정
Scroll(readme): API 명세 업데이트
```
