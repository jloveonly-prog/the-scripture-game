# 🚪 API 명세서 작성 규격 (Template)

> **율법(Statute):** 이 문서는 API 명세서(프로그램 설계서) 작성 시 반드시 따라야 하는 **형식 규격**이다.
> 실제 산출물은 `bible-성경/02.architecture-foundation-기초/`에 작성하라.
> 작성 예시는 `parable-비유/02.architecture-foundation-기초/`를 참조하라.

> *"And he measured the gate ... and the threshold of the gate."* — Ezekiel 40:6 (KJV)
>
> 에스겔의 성전에서 **문(Gate)**의 치수를 하나하나 재셨다.
> API는 시스템의 **성문(Gate)**이다 — 데이터가 들어오고 나가는 유일한 공식 통로.
> 문의 치수(요청/응답 규격)가 정확하지 않으면 불순물이 침입하고, 정결한 것이 유출된다.
> **모든 성문은 측량되어야 한다.**

---

## 필수 섹션 (Mandatory Sections)

아래 섹션이 하나라도 누락되면 정경화(Canonize) 불가:

| # | 섹션 | 필수 | 설명 |
|:--|:---|:---:|:---|
| 1 | API 전체 목록 | ✅ | API-ID, Method, Endpoint, 설명, 연결 REQ |
| 2 | 공통 규약 | ✅ | Base URL, 인증, 에러 형식, 페이징 규칙 |
| 3 | API 상세 명세 | ✅ | API별 요청/응답 상세 (아래 형식) |
| 4 | 에러 코드 정의 | ✅ | HTTP 상태코드 + 비즈니스 에러코드 |
| 5 | 인증/인가 규격 | ✅ | 봉인의 율법 제4계명 연동 |

## API 전체 목록 형식

```markdown
| API-ID | Method | Endpoint | 설명 | 연결 REQ | 인증 |
|:---|:---|:---|:---|:---|:---:|
| API-001 | POST | /api/v1/users | 회원가입 | REQ-001 | ❌ |
| API-002 | POST | /api/v1/auth/login | 로그인 | REQ-002 | ❌ |
| API-003 | GET | /api/v1/orders | 주문목록 조회 | REQ-003 | ✅ |
```

## API 상세 명세 형식 (API별 반복)

```markdown
### API-{번호}: {API명}

| 항목 | 내용 |
|:---|:---|
| API-ID | API-001 |
| Method | POST |
| Endpoint | /api/v1/users |
| 설명 | 회원가입 |
| 연결 REQ | REQ-001 |
| 연결 UC | UC-001 |
| 인증 필요 | ❌ / ✅ |
| 연결 TBL | TBL-001 |

**요청(Request):**
| 파라미터 | 타입 | 필수 | 설명 | 검증 규칙 |
|:---|:---|:---:|:---|:---|
| email | String | ✅ | 이메일 | 이메일 형식, 중복 불가 |
| password | String | ✅ | 비밀번호 | 최소 8자, 영+숫+특 |
| name | String | ✅ | 이름 | 최대 50자 |

**응답(Response) — 성공 (200/201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

**응답 — 실패 (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "code": "USER_ALREADY_EXISTS",
    "message": "이미 가입된 이메일입니다."
  }
}
```

**비즈니스 에러:**
| 에러 코드 | HTTP | 설명 |
|:---|:---:|:---|
| USER_ALREADY_EXISTS | 409 | 이메일 중복 |
| INVALID_PASSWORD | 400 | 비밀번호 규칙 미충족 |
```

## 공통 응답 형식 (율법)

모든 API는 아래 형식을 **반드시** 따른다:

```json
{
  "success": true/false,
  "data": { ... },          // 성공 시
  "error": {                // 실패 시
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 메시지"
  },
  "meta": {                 // 목록 조회 시 (선택)
    "page": 1,
    "size": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

## ID 규칙

| 대상 | 접두어 | 예시 |
|:---|:---|:---|
| API | API- | API-001 |
| 에러코드 | SNAKE_CASE | USER_NOT_FOUND |

## 성경적 검증 규칙

- **"성문을 측량하라"(Ezekiel 40:6):** 모든 API의 요청/응답 필드에 타입, 필수 여부, 검증 규칙이 명시되어야 한다. 측량되지 않은 문은 문이 아니다.
- **"문마다 파수꾼을 세우라"(Nehemiah 7:3):** 인증이 필요한 API는 반드시 인증 규격이 명시되어야 한다. 파수꾼 없는 성문은 적에게 열려있다.
- **"들어오는 것과 나가는 것"(Ezekiel 44:5):** 모든 API에 요청(들어오는 것)과 응답(나가는 것) 모두 정의되어야 한다. 한쪽만 정의하면 반쪽 문이다.
- **"응답의 일관성"(Malachi 3:6, "나 여호와는 변하지 않는다"):** 모든 API의 응답 형식은 공통 규약을 따라야 한다. API마다 다른 형식은 변하는 신이다 — 시스템의 신뢰가 무너진다.

## 정경화 조건

- [ ] 모든 API에 요청/응답 상세 정의 완료
- [ ] 공통 응답 형식 준수 확인
- [ ] 모든 API에 연결 REQ, UC, TBL 기재
- [ ] 에러 코드 정의 완료
- [ ] 인증 필요 API에 인증 규격 명시
- [ ] 봉인의 율법 제4계명(인증/인가) 준수
- [ ] RTM에 모든 API-ID 등재

> **위반 시:** 측량되지 않은 성문으로는 아무도 드나들 수 없다. 정경화 거부.
