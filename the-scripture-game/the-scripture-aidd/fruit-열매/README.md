<!-- README.md — 로컬 실행·테스트·저장소 전환 안내만 (문서) -->
<!-- TASK-070 | REQ-016 REQ-017 FR-072 FR-073 C-004 | ARCH-017 | UC-021 · UC-022 · data-ark §7 로컬 초기화 · D-17 -->

# 영적 전쟁 테트리스 — 로컬 실행 안내

KJV 성경을 바탕으로 한 실시간 2인 대전 테트리스입니다. 외부 서비스 키 없이 이 폴더(`fruit-열매/`)에서 명령 두 개로 전부 동작합니다.

## 1. 준비물

| 항목 | 버전 | 비고 |
|:---|:---|:---|
| Node.js | **22.12 이상** (22.x 권장) | `package.json` `engines` |
| npm | 10.x 또는 11.x | 아래 참고 |
| 브라우저 | 최신 Chrome·Edge·Firefox·Safari | 휴대폰은 세로 화면 |

> **npm 10에 관하여:** `package-lock.json`은 npm 11로 한 번 만들었습니다 — npm 10.9.x는 lockfile이 **없는** 상태에서 vitest 5의 피어 의존성 묶음을 풀다 `Cannot read properties of null (reading 'edgesOut')`로 멈추는 버그가 있습니다. 저장소에 들어 있는 lockfile을 그대로 두고 `npm install`을 실행하면 npm 10에서도 정상 설치됩니다. lockfile을 지우거나 새로 만들어야 하면 `npx npm@11 install`을 쓰세요. 버전 앞에 `^`·`~`를 붙이지 않고 lockfile로 고정합니다.

## 2. 실행 (키 0개)

```bash
npm install
npm run dev
```

- `npm run dev`는 먼저 `scripts/check-ports.mjs`(predev)로 5173·8787 포트를 검사한 뒤 두 서버를 함께 띄웁니다.
  - `client` — Vite 개발 서버 **http://localhost:5173**
  - `worker` — `wrangler dev` **http://127.0.0.1:8787** (Workers + Durable Objects를 로컬 workerd로 실행, Cloudflare 로그인 불필요)
- 브라우저에서 **http://localhost:5173** 을 엽니다. 클라이언트는 `/api`·`/ws` 상대 경로만 쓰고 Vite가 8787로 넘겨 줍니다(WebSocket 포함).
- 2인 대전은 창 2개(또는 일반 창 + 시크릿 창)로 각자 다른 닉네임으로 입장한 뒤 「대전 — 랜덤」을 고르거나, 한쪽이 「초대 코드」로 방을 만들고 다른 쪽이 6자 코드를 입력합니다. 혼자서는 AI 봇(쉬움·보통·어려움)이나 연습 모드를 고르세요.
- 끄기: 터미널에서 `Ctrl+C` — 두 서버가 함께 종료됩니다(`concurrently -k`).
- wrangler 사용 통계 전송을 끄고 싶으면 `WRANGLER_SEND_METRICS=false npm run dev` (키가 아닙니다).

**소리:** 브라우저 정책 때문에 소리는 첫 입력(클릭·키 누름·터치) 때 시작됩니다. 첫 화면의 안내를 누르거나 아무 키나 누르세요. 음량·음소거·흔들림·섬광 세기는 「옵션」에서 바꿉니다(현재 세션에만 적용).

**브라우저 저장:** `localStorage` 키 `swt.guest` 1개(게스트 ID·닉네임·토큰)만 씁니다. 지우면 다음 방문 때 새 닉네임으로 다시 입장합니다.

## 3. 조작

**키보드 (물리 키 위치 기준 — 한글 입력 상태에서도 동작):**

| 동작 | 키 | 동작 | 키 |
|:---|:---|:---|:---|
| 좌우 이동 | `←` `→` | 소프트 드롭 | `↓` |
| 하드 드롭 | `Space` | 홀드 | `C` 또는 왼쪽 `Shift` |
| 시계 방향 회전 | `↑` 또는 `X` | 반시계 방향 회전 | `Z` 또는 왼쪽 `Ctrl` |
| 위인 스킬 | `A` | 천사 5종 (미가엘·가브리엘·그룹·스랍·섬기는 영들) | `1`~`5` |
| 전신갑주 6종 (허리띠·흉배·신·방패·투구·검) | `Q` `W` `E` `R` `T` `Y` | 리액션 (🙏·🔥·😇) | `8` `9` `0` |
| 말씀 대결 보기 고르기 | `1`~`4` (퀴즈 창이 열린 동안) | 옵션(대전) / 일시정지(연습) | `Esc` |

**휴대폰 (세로 화면 — 내 보드와 아래 제스처 패드에서):** 가로로 끌면 이동, 천천히 아래로 끌면 소프트 드롭, 아래로 튕기면 하드 드롭, 위로 튕기면 홀드, 탭하면 회전(오른쪽 절반 = 시계 방향, 왼쪽 절반 = 반시계 방향). 스킬·천사·갑주·리액션은 버튼을 탭하고, 길게 누르면 설명만 봅니다. 대전 중 휴대폰을 가로로 돌리면 세로로 돌려 달라는 안내가 나옵니다. 흔들림이 켜져 있으면 진동으로도 알려 줍니다.

## 4. 테스트·검사·빌드

```bash
npm test               # Vitest 단위 테스트 (client · worker · content 프로젝트를 한 번에)
npm run check:content  # 콘텐츠 검사 — KJV 출처, 퀴즈 60문항 이상, 상성표 14종 등 (실패 시 종료 코드 1)
npm run build          # 정적 빌드 → client/dist/ (git 제외)
npx tsc -p worker --noEmit   # Worker TypeScript 형식 검사
```

**E2E (Playwright, 브라우저 2개 대전):** `npm run test:e2e` — 설정은 `playwright.config.js`(테스트 폴더 `client/e2e/`, 서버가 꺼져 있으면 `npm run dev`를 스스로 띄움). (E2E 시나리오 파일은 `client/e2e/`에 둡니다 — 폴더가 비어 있으면 실행할 테스트가 없다고 끝납니다.) 브라우저가 미리 설치된 환경에서는 경로를 알려 줍니다.

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npm run test:e2e
```

- 설치된 브라우저가 없으면 `npx playwright install chromium`을 먼저 실행합니다(@playwright/test 1.56.1 = chromium-1194).
- GPU가 없는 서버·컨테이너(헤드리스)에서는 WebGL을 소프트웨어로 그리도록 크로미움 실행 인자 `--use-gl=swiftshader --enable-unsafe-swiftshader`(또는 `--use-angle=swiftshader`)를 테스트의 `launchOptions.args`에 넣습니다. 이 경우 프레임 수가 낮은 것은 정상입니다(성능 판정은 실제 GPU에서).

## 5. 기록 저장소 — 기본은 로컬 SQLite, 원하면 Supabase

**기본 (키 없음):** 전적·랭킹·게스트는 Durable Object 내장 SQLite에 저장되며 파일은 `worker/.wrangler/state/`에 남습니다(git 제외). **원장 초기화** = 서버를 끈 뒤 `worker/.wrangler/state/` 폴더 삭제 → 다음 실행 때 빈 원장으로 시작합니다(모든 게스트·전적·랭킹이 사라지고, 브라우저의 `swt.guest`는 다음 방문 때 거부되어 다시 입장하게 됩니다).

**Supabase (선택):** 자기 Supabase 프로젝트를 쓰려면

1. Supabase 프로젝트에 `supabase/migrations/0001_init.sql`을 적용합니다(SQL 편집기 또는 Supabase CLI). 모든 표에 RLS가 켜지고 anon·authenticated 권한은 회수됩니다 — service role만 접근합니다.
2. `worker/.dev.vars.example`을 `worker/.dev.vars`로 복사하고 두 값을 채웁니다.
   ```
   SUPABASE_URL=https://<프로젝트>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service role 키>
   ```
3. `npm run dev`를 다시 시작합니다. **두 값이 모두 채워져 있으면** Worker가 자동으로 Supabase 어댑터를 쓰고, 하나라도 비어 있으면 로컬 SQLite를 씁니다. 화면·명령은 그대로입니다. 두 저장소의 데이터는 서로 옮겨지지 않습니다(전환 = 새 저장소로 시작). 연결에 실패하면 서버 로그에 `storage_fail`이 남고 화면은 "기록 저장소에 연결할 수 없습니다"를 보여 줍니다.

> **비밀값 규칙:** `.dev.vars`는 `.gitignore`에 있어 커밋되지 않습니다 — 절대 커밋하거나 공유하지 마세요. service role 키는 Worker 환경에만 있고 클라이언트 번들에는 Supabase 문자열이 하나도 들어가지 않습니다(클라이언트는 Supabase에 직접 접속하지 않음). Vite 개발 서버도 `.dev.vars`·`.wrangler/`·`content/quiz.json`을 내주지 않습니다(`client/vite.config.js` `server.fs.deny`).
>
> **키가 새어 나갔다면:** ① Supabase 대시보드(Project Settings → API)에서 service role 키를 재발급(rotate)해 옛 키를 무효화하고 ② `worker/.dev.vars`의 값을 새 키로 바꾼 뒤 서버를 다시 시작합니다(운영 환경이라면 `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`로 교체). 게스트 토큰은 원장에 SHA-256 해시로만 저장되므로 원장이 유출되어도 토큰 원문은 복원되지 않습니다.

## 6. 문제 해결

| 증상 | 해결 |
|:---|:---|
| `npm run dev`가 `[check-ports] 포트 충돌…`을 출력하고 멈춤 | 5173 또는 8787을 다른 프로그램(대개 이전에 띄운 개발 서버)이 쓰고 있습니다. 출력된 안내대로 `lsof -i :5173` / `lsof -i :8787`(Windows: `netstat -ano \| findstr :5173`)로 PID를 찾아 종료한 뒤 다시 실행하세요. 포트는 다른 번호로 바꾸지 않습니다(Vite 프록시·Origin 허용 목록이 이 번호에 맞춰져 있음). |
| `npm install`이 `reading 'edgesOut'`로 실패 | lockfile이 없거나 바뀐 상태에서 npm 10을 쓴 경우입니다. `git checkout package-lock.json` 후 다시 설치하거나 `npx npm@11 install`. |
| 화면에 "허용되지 않은 접속 경로입니다"(403) | `http://localhost:5173` 또는 `http://127.0.0.1:5173`로 접속하세요. 다른 주소는 `worker/wrangler.toml`의 `ALLOWED_ORIGINS`에 없습니다. |
| 소리가 나지 않음 | 화면을 한 번 클릭하거나 키를 누르세요. 「옵션」에서 음소거·음량을 확인하세요. |
| 닉네임 입장이 "요청이 너무 잦습니다"(429) | 한 접속 주소에서 1분에 5번까지 게스트를 만들 수 있습니다. 1분 뒤 다시 시도하세요. |
| 입장 정보가 올바르지 않다며 다시 닉네임을 물음 | 원장을 초기화했거나 저장소를 바꾼 경우입니다. 새 닉네임으로 입장하면 됩니다. |
