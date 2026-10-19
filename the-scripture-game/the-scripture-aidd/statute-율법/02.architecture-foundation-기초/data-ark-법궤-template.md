# 🏛️ 데이터 설계서 작성 규격 (Template)

> **율법(Statute):** 이 문서는 데이터 아키텍처(ERD/DDL) 설계서 작성 시 반드시 따라야 하는 **형식 규격**이다.
> 실제 산출물은 `bible-성경/02.architecture-foundation-기초/`에 작성하라.
> 작성 예시는 `parable-비유/02.architecture-foundation-기초/`를 참조하라.

> *"And thou shalt make an ark of shittim wood ... And thou shalt put into the ark the testimony which I shall give thee."* — Exodus 25:10,16 (KJV)
>
> 법궤(Ark)는 하나님의 증거물(Testimony)을 담는 그릇이다.
> 데이터베이스는 시스템의 증거(데이터)를 담는 그릇이다.
> 법궤의 치수가 하나님의 Spec대로 정확해야 했듯, 테이블 구조도 Spec대로 정확해야 한다.
> **치수가 틀린 법궤에는 증거물을 담을 수 없다. 구조가 틀린 DB에는 데이터를 담을 수 없다.**

---

## 필수 섹션 (Mandatory Sections)

아래 섹션이 하나라도 누락되면 정경화(Canonize) 불가:

| # | 섹션 | 필수 | 설명 |
|:--|:---|:---:|:---|
| 1 | 데이터 아키텍처 개요 | ✅ | DBMS 종류, 스키마 전략, 네이밍 규칙 |
| 2 | ERD (엔티티 관계도) | ✅ | 전체 테이블 관계도 (Mermaid erDiagram 또는 이미지) |
| 3 | 테이블 정의서 | ✅ | 테이블별 상세 정의 (아래 형식) |
| 4 | 공통 코드 정의 | ✅ | 상태 코드, 에러 코드, 분류 코드 목록 |
| 5 | 인덱스 전략 | ✅ | 주요 쿼리 패턴 기반 인덱스 설계 |
| 6 | 데이터 무결성 규칙 | ✅ | FK, Unique, Check 제약조건 명시 |
| 7 | 마이그레이션/시드 전략 | ⬜ | 초기 데이터, 마이그레이션 계획 (해당 시) |

## 테이블 정의서 형식 (테이블별 반복)

```markdown
### TBL-{번호}: {테이블명} ({한글명})

> **목적:** {이 테이블이 존재하는 이유 — Spec 근거}
> **연결 REQ:** REQ-{번호}

| # | 컬럼명 | 타입 | NULL | PK | FK | Default | 설명 |
|:--|:---|:---|:---:|:---:|:---|:---|:---|
| 1 | id | BIGINT | ❌ | ✅ | — | AUTO_INCREMENT | 기본키 |
| 2 | user_id | BIGINT | ❌ | — | TBL-001.id | — | 회원 참조 |
| 3 | status | VARCHAR(20) | ❌ | — | — | 'ACTIVE' | 상태코드 |
| 4 | created_at | TIMESTAMP | ❌ | — | — | CURRENT_TIMESTAMP | 생성일시 |
| 5 | updated_at | TIMESTAMP | ❌ | — | — | CURRENT_TIMESTAMP | 수정일시 |

**인덱스:**
| 인덱스명 | 컬럼 | 유형 | 사유 |
|:---|:---|:---|:---|
| idx_{테이블}_{컬럼} | {컬럼} | BTREE | {주요 조회 패턴} |

**제약조건:**
- UNIQUE: {컬럼 조합}
- CHECK: {비즈니스 규칙}

> ⚠️ **NOT NULL ≠ 빈값 방어** — NOT NULL은 NULL만 차단한다. 빈 문자열(`''`)은 허용된다.
> 사용자 입력 텍스트 컬럼에는 반드시 CHECK 제약을 추가하라:
> ```sql
> -- 예시 (SQLite/PostgreSQL/MySQL 공통)
> title   TEXT NOT NULL CHECK(length(trim(title)) > 0),
> content TEXT NOT NULL CHECK(length(trim(content)) > 0)
> ```
> 이것이 방어 깊이(Defense in Depth)의 3번째 층 — DB가 마지막 방어선이다.
```

## ID 규칙

| 대상 | 접두어 | 예시 |
|:---|:---|:---|
| 테이블 | TBL- | TBL-001 |
| 공통코드 그룹 | CODE- | CODE-001 |

## 네이밍 규칙 (율법)

| 대상 | 규칙 | 예시 |
|:---|:---|:---|
| 테이블명 | snake_case, 복수형 | `users`, `orders` |
| 컬럼명 | snake_case | `created_at`, `user_id` |
| FK 컬럼 | {참조테이블 단수}_id | `user_id`, `order_id` |
| 인덱스 | idx_{테이블}_{컬럼} | `idx_orders_user_id` |
| PK | id (단일 PK 시) | `id` |

## 성경적 검증 규칙

- **"치수대로 만들라"(Exodus 25:10):** 모든 테이블의 모든 컬럼에 타입, NULL 허용 여부, 기본값이 명시되어야 한다. 치수가 빠진 법궤는 법궤가 아니다.
- **"목적 없는 것은 존재하지 않는다"(Ecclesiastes 3:1):** 모든 테이블에 목적(Purpose)과 연결 REQ가 기재되어야 한다. Spec에 근거 없는 테이블은 할루시네이션이다.
- **"관계를 끊지 마라"(Matthew 19:6):** 모든 FK 관계가 명시적으로 정의되어야 한다. 암묵적 관계(FK 없이 Join)는 끊어진 언약과 같다.
- **"두 주인을 섬기지 마라"(Matthew 6:24):** 하나의 데이터는 하나의 테이블에만 존재해야 한다 (정규화). 중복 데이터는 두 주인을 섬기는 것이다.

## 정경화 조건

- [ ] ERD에 모든 테이블과 관계가 표현됨
- [ ] 모든 테이블에 목적 + 연결 REQ 기재
- [ ] 모든 컬럼에 타입, NULL, Default 명시
- [ ] FK 관계 전부 명시적 정의
- [ ] 공통 코드 목록 작성 완료
- [ ] RTM에 모든 TBL-ID 등재

> **위반 시:** 치수 없는 법궤에 증거물을 담을 수 없다. 정경화 거부.
