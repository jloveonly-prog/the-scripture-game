# ✉️ 서신 — 기반 배치 (00.jerusalem-예루살렘)

> ⚠️ **파생 문서(Derived).** 이 서신은 원본이 아니다. 직접 수정 금지 — 원본을 고친 뒤 이 서신을 재생성하라.
> 원본: `bible-성경/01.requirement-hearing-들음/spec-tablet-명세서.md`, `bible-성경/02.architecture-foundation-기초/architecture-temple-성전설계.md`, `bible-성경/02.architecture-foundation-기초/api-gate-성문.md`, `bible-성경/02.architecture-foundation-기초/data-ark-법궤.md`
> 생성일: 2026-10-20 / 생성 기준: RTM 설계 변경 이력 최종 행 = 2026-10-20 (재각 R1)

## 지역 개요
- TASK-ID: TASK-001
- 지역: 00.jerusalem-예루살렘
- 이 지역 태스크: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007 ← 상태·짝 배정은 task-wall 참조. 여기 복사하지 않는다.
- 선행 지역: 없음(첫 지역)

## REQ 원문 발췌

### REQ-016
| REQ-016 | 외부 서비스 키 없이 `npm install && npm run dev` 한 번으로 전부 동작해야 한다. Supabase는 환경변수가 있을 때만 쓰는 어댑터로 둔다 | High | FR-072~FR-074 |
— 출처: bible-성경/01.requirement-hearing-들음/spec-tablet-명세서.md §4.1 REQ-016

### FR-072 · FR-073 · FR-074
| FR-072 | 저장소 어댑터 자동 전환 | `.dev.vars`에 Supabase 키가 없으면 Durable Object 내장 SQLite(로컬 파일)에 저장. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 설정되면 Supabase Postgres 어댑터로 자동 전환. 두 어댑터는 같은 저장 인터페이스(프로필·경기·랭킹) | High | 서두, A §4.4, §4.6 |
| FR-073 | 단일 명령 로컬 실행 | 저장소 루트에서 `npm install && npm run dev` 한 번으로 Vite 개발 서버와 `wrangler dev`(Workers + Durable Objects, 로그인 불필요)가 함께 뜨고, 브라우저 2개로 대전할 수 있다 | High | 서두, A §4.6 |
| FR-074 | 공용 게임 콘텐츠 | `content/` JSON(heroes, angels, spirits, verses, quiz, 상성표)을 클라이언트와 서버가 함께 쓴다. verses는 ref·kjv·ko 형식 | High | A §4.2, §4.5, §8 |
— 출처: bible-성경/01.requirement-hearing-들음/spec-tablet-명세서.md §4.2 REQ-016 REQ-017

### NFR-004 · NFR-007
| NFR-004 | 보안(봉인의 율법 제1·2계명) | Supabase service role 키는 Worker 환경변수(`.dev.vars` / `wrangler secret`)에만 두고 클라이언트 번들에 절대 포함하지 않는다. 클라이언트에는 anon 공개 키만. `.dev.vars`는 git 제외 | 빌드 산출물 문자열 검사 | A §4.4 |
| NFR-007 | 유지보수 | 라이브러리는 개발 시점 최신 안정판으로 lockfile 고정, 출시 2주 미만 버전 회피 | package-lock.json 확인 | A §5.6 |
— 출처: bible-성경/01.requirement-hearing-들음/spec-tablet-명세서.md §5

## 설계 발췌

### architecture §4.6 포트·프록시·단일 명령 (일부)
| Vite 프록시 | `/api` → `http://127.0.0.1:8787`, `/ws` → `ws://127.0.0.1:8787` (`ws: true`) | 브라우저는 5173 한 출처만 사용 |
| Vite 파일 접근 | `server.fs.allow`에 `fruit-열매/` 루트 포함 | `content/*.json` import 허용 (FR-074) |
| 비밀 파일 | `worker/.dev.vars` (없으면 로컬 모드), 예시 `worker/.dev.vars.example`(빈 값) | NFR-004 |
— 출처: bible-성경/02.architecture-foundation-기초/architecture-temple-성전설계.md §4.6

### data-ark §7.1 DO SQLite 마이그레이션 (일부)
- `wrangler.toml`의 DO 마이그레이션은 `new_sqlite_classes = ["Matchmaker", "GameRoom"]` (태그 `v1`). GameRoom은 방 명단 보관에 KV형 `ctx.storage`만 쓰고 SQL 테이블은 만들지 않는다.
— 출처: bible-성경/02.architecture-foundation-기초/data-ark-법궤.md §7.1

### api-gate §2.4 WebSocket 메시지 봉투 (일부)
- 프레임 최대 4096바이트 — 초과 시 `INVALID_MESSAGE` 후 무시.
- 알 수 없는 `type`, `data`가 객체가 아님, 정의되지 않은 추가 필드 → `INVALID_MESSAGE` (추가 필드 거부 = 자유 텍스트 경로 차단, C-009).
— 출처: bible-성경/02.architecture-foundation-기초/api-gate-성문.md §2.4
