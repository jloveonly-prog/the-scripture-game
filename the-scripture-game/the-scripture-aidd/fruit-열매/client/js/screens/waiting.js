// waiting.js — SCR-004 DOM 구성·로비 소켓 이벤트 표시만
// TASK-064-2 | REQ-001 REQ-004 REQ-005 REQ-006 FR-005 FR-008 FR-018~FR-021 FR-023 C-006 | SCR-004 (a)~(e) |
// API-005~API-011 API-019 API-031 | UC-003 1~6·2a·E1~E3, UC-004 1~6·2a·E1~E3, UC-005 1~3, UC-006 입장 |
// design-vision §3.4 WF-004·§4.1 매칭 대기 → 대전·§4.5 치명 오류 | screen-vision §2 SCR-004·§5 SCR-004
import { rules } from "../content.js";
import { connectLobby } from "../net/lobby-socket.js";
import { connectRoom } from "../net/room-socket.js";
import { session, beginBattle, endBattle } from "../store/session.js";
import { esc, emblemSvg, spinnerHtml } from "./shell.js";
import { BOT_LEVELS } from "./lobby.js";

/** (e) 상대 발견 연출 최소 시간 (design-vision §3.4 e) */
const SPLASH_MS = 1200;
const ALPHABET = rules.invite.alphabet;
const CODE_LEN = rules.invite.length;
const mmss = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const levelKo = (id) => BOT_LEVELS.find(([k]) => k === id)?.[1] ?? "";

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  const f = session.flow;
  const p = session.profile;
  root.innerHTML = `<main class="scr scr-waiting"><div class="wait-box" data-box></div></main>`;
  const box = /** @type {HTMLElement} */ (root.querySelector("[data-box]"));
  /** @type {ReturnType<typeof connectLobby> | null} */ let lobby = null;
  let alive = true;
  let started = false;
  let timer = 0;
  const badge = `<p class="my-badge">${emblemSvg(f.heroId, 32)} ${esc(p.nickname)} · 레이팅 ${p.rating}</p>`;
  const tick = (fn) => {
    clearInterval(timer);
    fn();
    timer = window.setInterval(fn, 1000);
  };

  /** (a)(b)(d) 회전 표시 + 상태 문장 @param {string} status @param {string} [extra] @param {boolean} [cancel] */
  function spin(status, extra = "", cancel = true) {
    box.innerHTML = `${extra}${spinnerHtml()}<p class="status" role="status">${status}
      <span class="elapsed" data-elapsed></span></p>${badge}
      ${cancel ? `<div class="wait-actions"><button type="button" class="btn btn-secondary" data-cancel>취소</button>
      </div>` : ""}`;
    box.querySelector("[data-cancel]")?.addEventListener("click", cancel_);
  }
  /** 오류 문장 칸 + 버튼 @param {string} msg @param {Array<[string, () => void]>} actions */
  function errorPanel(msg, actions) {
    clearInterval(timer);
    const btn = ([t], i) => `<button type="button" class="btn ${i ? "btn-secondary" : "btn-primary"}" data-i="${i}">
      ${esc(t)}</button>`;
    box.innerHTML = `<p class="field-error" role="alert">${esc(msg)}</p>
      <div class="wait-actions">${actions.map(btn).join("")}</div>`;
    box.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => actions[Number(
      /** @type {HTMLElement} */ (b).dataset.i)][1]()));
  }
  const toLobby = () => ctx.nav("#/lobby");
  function cancel_() {
    lobby?.cancel(); // API-008 → 서버 Close 1000 cancelled
    lobby = null;
    toLobby();
  }

  /** API-005·API-007 로비 소켓 연결 → 즉시 join @param {string} [roomCode] */
  function join(roomCode) {
    lobby?.close();
    const msg = { token: session.token, heroId: f.heroId, mode: f.mode };
    if (f.mode === "bot") Object.assign(msg, { botLevel: f.botLevel });
    if (roomCode) Object.assign(msg, { roomCode });
    if (f.mode === "bot" || f.mode === "practice") spin("전장을 준비하는 중…", "", false); // (d)
    else if (!roomCode) spin(f.mode === "random" ? "상대를 찾는 중…" : "초대 코드를 받는 중…");
    lobby = connectLobby({
      join: msg,
      onWaiting: (d) => (d.inviteCode ? showCode(d) : showRandom()),
      onMatched: (d) => matched(d),
      onError: (e) => lobbyError(e, roomCode),
      onFail: () => errorPanel("서버에 연결할 수 없습니다", [["로비로", toLobby]]), // UC-003 E1 3회 실패
    });
  }
  function showRandom() {
    const t0 = Date.now();
    spin("상대를 찾는 중…");
    tick(() => { const el = box.querySelector("[data-elapsed]"); if (el) el.textContent = mmss(Date.now() - t0); });
  }
  /** (b) 방장 — 6칸 큰 글자(선택 가능), 만료까지 mm:ss @param {{ inviteCode: string, inviteExpiresAt: string }} d */
  function showCode(d) {
    const label = `초대 코드 ${d.inviteCode.split("").join(" ")}`;
    spin("친구를 기다리는 중…", `<p class="status">친구에게 이 코드를 알려 주세요</p>
      <div class="code-cells code-display" aria-label="${esc(label)}">${d.inviteCode.split("").map((c) =>
        `<span class="code-cell">${esc(c)}</span>`).join("")}</div><p>코드 만료까지 <span data-expire></span></p>`);
    const until = Date.parse(d.inviteExpiresAt);
    tick(() => { const el = box.querySelector("[data-expire]"); if (el) el.textContent = mmss(until - Date.now()); });
  }
  /** (c) 코드로 입장 — 6칸 입력(자동 대문자·허용 문자 외 무시·붙여넣기 분배) @param {string} [error] @param {string} [keep] */
  function showCodeInput(error = "", keep = "") {
    clearInterval(timer);
    box.innerHTML = `<p class="status">초대 코드를 입력하세요</p>
      <div class="code-cells">${Array.from({ length: CODE_LEN }, (_, i) => `<input class="code-cell"
        autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="초대 코드 ${i + 1}번째 글자"
        value="${esc(keep[i] ?? "")}" />`).join("")}</div>
      <p class="field-error" role="alert" data-err>${esc(error)}</p>
      <div class="wait-actions"><button type="button" class="btn btn-primary" data-go aria-disabled="true">입장하기</button>
      <button type="button" class="btn btn-secondary" data-back>취소</button></div>`;
    const cells = /** @type {HTMLInputElement[]} */ ([...box.querySelectorAll("input.code-cell")]);
    const go = /** @type {HTMLElement} */ (box.querySelector("[data-go]"));
    const code = () => cells.map((c) => c.value).join("");
    const refresh = () => go.setAttribute("aria-disabled", String(code().length !== CODE_LEN));
    const clean = (s) => s.toUpperCase().split("").filter((ch) => ALPHABET.includes(ch)).join("");
    cells.forEach((c, i) => {
      // 붙여넣기 6자 분배 (칸마다 1자 — maxlength를 두면 브라우저가 첫 글자만 남기므로 여기서 나눈다)
      c.addEventListener("paste", (e) => {
        e.preventDefault();
        c.value = clean(e.clipboardData?.getData("text") ?? "");
        c.dispatchEvent(new Event("input"));
      });
      c.addEventListener("input", (ev) => {
        // 이미 찬 칸에 한 글자 입력 = 바꿔 쓰기, 그 밖의 여러 글자 = 붙여넣기·자동완성
        const typed = /** @type {InputEvent} */ (ev).inputType === "insertText";
        const v = typed ? clean(c.value).slice(-1) : clean(c.value);
        if (v.length > 1) { // 붙여넣기·자동완성 분배
          v.split("").slice(0, CODE_LEN - i).forEach((ch, k) => { cells[i + k].value = ch; });
          cells[Math.min(CODE_LEN - 1, i + v.length)].focus();
        } else {
          c.value = v;
          if (v && i < CODE_LEN - 1) cells[i + 1].focus();
        }
        refresh();
      });
      c.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !c.value && i > 0) cells[i - 1].focus();
        if (e.key === "Enter") go.click();
      });
    });
    go.addEventListener("click", () => {
      if (code().length !== CODE_LEN) return;
      join(code());
    });
    box.querySelector("[data-back]")?.addEventListener("click", toLobby); // 소켓 연 적 없음 → 그대로 로비
    refresh();
    cells[Math.min(keep.length, CODE_LEN - 1)].focus();
  }

  /** API-031 로비 오류 (design-vision §4.5 치명 오류 예외 표) @param {{ code: string, message: string }} e @param {string} [rc] */
  function lobbyError(e, rc) {
    lobby = null;
    if (!alive) return;
    if (e.code === "UNAUTHORIZED") return ctx.unauthorized();
    if (e.code === "INVITE_NOT_FOUND" || e.code === "INVITE_FULL") return showCodeInput(e.message, rc ?? "");
    if (e.code === "INVITE_EXPIRED") return errorPanel(e.message, [["새 코드 만들기", () => join()], ["로비로", toLobby]]);
    if (e.code === "ALREADY_QUEUED") return errorPanel(e.message, [["로비로", toLobby]]);
    errorPanel(e.message, [["다시 시도", () => join(rc)], ["로비로", toLobby]]);
  }

  /** API-010 matched → 대전 세션 → (e) 상대 발견 ≥1,200ms → API-006 방 소켓 → API-011 ready @param {any} d */
  function matched(d) {
    lobby = null;
    if (!alive) return;
    clearInterval(timer);
    beginBattle(d, null);
    if (d.mode === "practice" || !d.opponent) return openRoom(d);
    const o = d.opponent;
    const oppName = o.isBot ? `봇 (${levelKo(o.botLevel)})` : esc(o.nickname ?? "");
    box.innerHTML = `<div class="splash" role="status" aria-label="상대 발견">
      <div class="side">${emblemSvg(f.heroId, 128)}<b>${esc(p.nickname)}</b><span>레이팅 ${p.rating}</span></div>
      <div class="vs" aria-hidden="true">VS</div>
      <div class="side">${emblemSvg(o.heroId, 128)}<b>${oppName}</b>
        ${o.isBot ? "" : `<span>레이팅 ${o.rating}</span>`}</div>
    </div>`;
    ctx.shell.audio.sfx.play("SFX-13", { angel: "michael" }); // 미가엘 화음 0.6초 (§4.1)
    setTimeout(() => alive && openRoom(d), SPLASH_MS);
  }
  /** @param {any} d matched */
  function openRoom(d) {
    const room = connectRoom({ roomId: d.roomId, token: session.token, ticket: d.ticket, onClose: (info) => {
      if (!alive || started) return;
      if (info.error) return roomError(info.error);
      errorPanel("서버에 연결할 수 없습니다", [["로비로", toLobby]]);
    } });
    if (session.battle) session.battle.room = room;
    room.listen((type, data) => {
      if (type !== "start" || started || !session.battle) return;
      // API-019 첫 start → 대전 세션에 넣고 #/battle (카운트다운은 대전 화면이 시작)
      started = true;
      room.listen(null);
      session.battle.start = { ...data, receivedAt: performance.now() };
      ctx.shell.veilCover().then(() => ctx.nav("#/battle"));
    });
  }
  /** API-031 방(ready 단계) 오류 @param {{ code: string, message: string }} e */
  function roomError(e) {
    endBattle();
    if (e.code === "UNAUTHORIZED") return ctx.unauthorized();
    if (e.code === "OPPONENT_LEFT") {
      ctx.shell.toast("상대가 나갔습니다"); // UC-003 E2 — 랜덤이면 다시 대기, 초대·봇이면 로비
      return f.mode === "random" ? join() : toLobby();
    }
    errorPanel(e.message, [["다시 시도", () => join()], ["로비로", toLobby]]);
  }

  if (f.mode === "invite" && f.inviteAction === "join") showCodeInput();
  else join();
  return {
    unmount() {
      alive = false;
      clearInterval(timer);
      lobby?.close();
      if (!started) endBattle();
    },
  };
}
