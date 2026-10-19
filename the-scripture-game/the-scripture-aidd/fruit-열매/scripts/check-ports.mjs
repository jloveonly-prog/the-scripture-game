// check-ports.mjs — 5173·8787 포트 점유 검사 후 충돌 포트·해결 방법 출력만 (predev)
// TASK-001-1 | REQ-016 FR-073 | UC-021 E1 | ARCH-017 | task-wall A-11
import net from "node:net";

// architecture §4 / devguide §1.3: client = vite 5173, worker = wrangler dev 8787 (127.0.0.1)
const PORTS = [
  { port: 5173, owner: "client (Vite 개발 서버)" },
  { port: 8787, owner: "worker (wrangler dev)" },
];

/**
 * 포트를 잠시 열어 보아 사용 가능 여부를 판정한다.
 * @param {number} port
 * @returns {Promise<{free: boolean, code: string | null}>}
 */
function probe(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      resolve({ free: false, code: err && err.code ? String(err.code) : "UNKNOWN" });
    });
    server.once("listening", () => {
      server.close(() => resolve({ free: true, code: null }));
    });
    try {
      server.listen({ port, host: "127.0.0.1", exclusive: true });
    } catch (err) {
      resolve({ free: false, code: err && err.code ? String(err.code) : "UNKNOWN" });
    }
  });
}

async function main() {
  const busy = [];
  for (const entry of PORTS) {
    const result = await probe(entry.port);
    if (!result.free) busy.push({ ...entry, code: result.code });
  }
  if (busy.length === 0) return 0;

  // UC-021 E1: 실행 로그에 충돌 포트와 해결 방법 출력
  console.error("[check-ports] 포트 충돌로 npm run dev를 시작할 수 없습니다.");
  for (const entry of busy) {
    console.error(`  - 포트 ${entry.port} (${entry.owner}) 사용 중 [${entry.code}]`);
  }
  console.error("[check-ports] 해결 방법:");
  for (const entry of busy) {
    console.error(`  1) 점유 프로세스 확인: lsof -i :${entry.port}  (Windows: netstat -ano | findstr :${entry.port})`);
    console.error(`  2) 이전에 띄운 개발 서버라면 종료: kill <PID>  (Windows: taskkill /PID <PID> /F)`);
  }
  console.error("  3) 포트를 비운 뒤 다시 실행: npm run dev");
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("[check-ports] 포트 검사 중 오류:", err && err.message ? err.message : err);
    process.exit(1);
  });
