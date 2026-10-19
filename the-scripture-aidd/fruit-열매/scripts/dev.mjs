// TASK-001 · REQ-016 · FR-073 · C-004 · D-28 — `npm run dev` 한 번으로 wrangler dev(:8787)와 Vite(:5173)를 함께 띄운다.
// 단일 책임: 두 개발 서버 프로세스의 동시 기동·출력 접두어·동반 종료. 외부 의존성 없음 (architecture §3.1 — 스택 밖 도구 미추가).
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IS_WINDOWS = process.platform === 'win32';

/** 기동할 npm 스크립트 — worker 먼저(프록시 대상), 그다음 client (루트 package.json `dev:worker`·`dev:client`). */
const TARGETS = [
  { label: 'worker', script: 'dev:worker' },
  { label: 'client', script: 'dev:client' },
];

const children = new Map();
let shuttingDown = false;

/** 자식 환경 — wrangler 첫 실행 원격 측정 질의를 끈다 (architecture §4.6). */
function childEnv() {
  return { ...process.env, WRANGLER_SEND_METRICS: 'false' };
}

/** 한 줄씩 `[label] ` 접두어를 붙여 출력한다. */
function pipeWithPrefix(stream, label, out) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) out.write(`[${label}] ${line}\n`);
  });
  stream.on('end', () => {
    if (buffer.length > 0) out.write(`[${label}] ${buffer}\n`);
  });
}

/** 자식 프로세스 트리를 끝낸다 (Windows는 셸 아래 트리 전체를 taskkill). */
function killTree(child) {
  if (!child || child.exitCode !== null || child.pid === undefined) return;
  try {
    if (IS_WINDOWS) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  } catch (err) {
    process.stderr.write(`[dev] 프로세스 종료 실패 (${child.pid}): ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** 한쪽이 끝나면 다른 쪽도 끝내고 같은 종료 코드로 나간다. */
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.values()) killTree(child);
  process.exitCode = code;
}

function start({ label, script }) {
  // Node 20.12+ 보안 수정으로 Windows의 npm.cmd는 셸을 거쳐야만 실행된다. 셸 모드에서는 인자 배열 대신
  // 고정 명령 문자열 하나를 넘긴다 (DEP0190 회피 — 문자열은 TARGETS 상수뿐이라 주입 경로 없음).
  const child = IS_WINDOWS
    ? spawn(`npm run ${script}`, { cwd: ROOT, shell: true, env: childEnv(), stdio: ['ignore', 'pipe', 'pipe'] })
    : spawn('npm', ['run', script], { cwd: ROOT, env: childEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
  children.set(label, child);
  pipeWithPrefix(child.stdout, label, process.stdout);
  pipeWithPrefix(child.stderr, label, process.stderr);
  child.on('error', (err) => {
    process.stderr.write(`[dev] ${label} 기동 실패: ${err.message}\n`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      process.stderr.write(`[dev] ${label} 종료 (code=${code ?? 'null'}, signal=${signal ?? 'none'}) — 나머지 서버도 종료합니다.\n`);
      if (label === 'client' && code !== 0) {
        process.stderr.write('[dev] 5173 포트가 사용 중이면 그 프로그램을 닫고 다시 실행하세요. (UC-021 E1)\n');
      }
    }
    shutdown(code ?? 1);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

process.stdout.write('[dev] wrangler dev → http://127.0.0.1:8787 · Vite → http://localhost:5173 (외부 키 불필요)\n');
for (const target of TARGETS) start(target);
