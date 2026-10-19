#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
census-count-언약계수.py — RTM(언약추적) 커버리지 자동 계수기

> "이스라엘 자손의 온 회중 각 남자의 수를 그들의 종족과 조상의 가문에 따라
>  그 명수대로 계수하라." — Numbers(민수기) 1:2 (KJV: "Take ye the sum of all
>  the congregation... by their families... every male... by their polls.")

민수기의 인구 조사(Census)는 "말로만 다 있다고 믿는 것"이 아니라
지파장이 실제로 한 사람씩 세어 명부에 올리는 행위였다. 이 스크립트는
AI가 rtm-covenant-언약추적.md의 "커버리지 요약"에 스스로 적어 넣은 수치를
그대로 믿지 않고, 표 본문을 처음부터 다시 계수(census)한다.

"하나도 잃어버리지 않겠다" (John 6:39) — spec-tablet-명세서.md에 등장하는
모든 REQ/FR/NFR/C ID가 RTM에 최소 한 번은 등재되어 있는지도 대조한다.

사용법:
    python census-count-언약계수.py bible-성경/01.requirement-hearing-들음
    python census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 6
    python census-count-언약계수.py bible-성경/01.requirement-hearing-들음 --phase 7 --log

종료 코드:
    0 = 심판 통과 (문서 기재값과 실계수 일치 + 요청한 Phase 조건 충족)
    1 = 심판 불합격 (불일치/누락 발견) — 회개(수정) 후 재심판하라
    2 = 실행 오류 (파일을 찾을 수 없거나 표 형식을 인식할 수 없음)
"""

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

# Windows 콘솔(cp949) 환경에서도 한글/이모지가 깨지지 않도록 표준출력을 UTF-8로 강제한다.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

STATUS_LABELS = {
    "✅": "완전추적",
    "🔄": "부분추적",
    "⬜": "미추적",
    "❌": "누락확인",
}

# 표 셀 안에서 ID 전체가 정확히 이 형태여야 유효한 행으로 인정한다 (REQ-001, FR-012, NFR-003, C-001 등)
ID_CELL = re.compile(r"^[A-Z]{1,4}-\d{3,}$")
# spec-tablet-명세서.md 원문 스캔용 (문장 속에 섞여 있어도 잡아낸다)
ID_SCAN = re.compile(r"\b[A-Z]{1,4}-\d{3,}\b")

# Phase별로 반드시 채워져 있어야 하는 열 (RTM 템플릿의 "언약추적 갱신 규칙" 표 기준)
PHASE_REQUIRED_COLUMNS = {
    2: ["ARCH-ID", "API-ID", "TBL-ID"],
    4: ["코드 모듈"],
    5: ["테스트 ID"],
}
# Phase 6, 7은 별도로 "상태 == ✅ 전 행" 을 검사한다 (아래 main 참조)


def parse_rtm_table(text: str):
    """'추적 매트릭스' 표를 파싱해 [{열이름: 값}, ...] 리스트로 반환한다."""
    rows = []
    header = None
    in_table = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line.startswith("|"):
            in_table = False
            header = None
            continue
        # 셀이 **굵게** 표시된 경우(예: **REQ-001**)도 정상 인식하도록 '*'를 함께 제거한다.
        cells = [c.strip().strip("*").strip() for c in line.strip("|").split("|")]
        if all(re.fullmatch(r":?-{2,}:?", c) for c in cells):
            continue  # 구분선(---) 행
        if header is None:
            if "REQ-ID" in cells and any("상태" in c for c in cells):
                header = cells
                in_table = True
            continue
        if not in_table or len(cells) != len(header):
            continue
        row = dict(zip(header, cells))
        if ID_CELL.match(row.get("REQ-ID", "")):
            rows.append(row)
    return rows


def parse_stated_summary(text: str):
    """'커버리지 요약' 표에서 사람/AI가 적어 넣은 수치를 파싱한다."""
    stated = {}
    # 라벨/수치 어느 쪽이든 **굵게** 표시될 수 있으므로 매칭 전 '**'를 제거한다.
    plain = text.replace("**", "")
    patterns = {
        "total": r"전체\s*REQ\s*수\s*\|\s*(\d+)",
        "done": r"완전\s*추적\(✅\)\s*\|\s*(\d+)",
        "partial": r"부분\s*추적\(🔄\)\s*\|\s*(\d+)",
        "untracked": r"미추적\(⬜\)\s*\|\s*(\d+)",
        "coverage_pct": r"커버리지\s*\|\s*(\d+(?:\.\d+)?)\s*%",
    }
    for key, pat in patterns.items():
        m = re.search(pat, plain)
        if m:
            stated[key] = float(m.group(1)) if key == "coverage_pct" else int(m.group(1))
    return stated


def find_project_root(start: Path) -> Path | None:
    """phase_dir에서 위로 올라가며 bible-성경/과 fruit-열매/를 모두 가진 프로젝트 루트를 찾는다."""
    for candidate in [start.resolve(), *start.resolve().parents]:
        if (candidate / "bible-성경").is_dir() and (candidate / "fruit-열매").is_dir():
            return candidate
    return None


def write_history_log(project_root: Path, summary_line: str):
    history_dir = project_root / "fruit-열매" / "history"
    history_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now()
    log_path = history_dir / f"{now:%Y-%m-%d}.md"
    entry = f"[{now:%H:%M:%S}] [census-count-언약계수 실행] ➡️ {summary_line}\n"
    with log_path.open("a", encoding="utf-8") as f:
        f.write(entry)
    print(f"\n📖 기록의 서에 기록됨: {log_path}")


def main():
    parser = argparse.ArgumentParser(
        description="RTM(언약추적) 커버리지 자동 계수기 — AI의 자기신고를 다시 계수한다."
    )
    parser.add_argument(
        "phase_dir",
        help="RTM/spec-tablet이 있는 디렉토리. 보통 'bible-성경/01.requirement-hearing-들음'",
    )
    parser.add_argument(
        "--phase",
        type=int,
        choices=range(1, 8),
        help="이 Phase 완료 심판 기준으로 열 충족 여부까지 검사 (2/4/5/6/7 지원)",
    )
    parser.add_argument(
        "--log", action="store_true", help="결과를 fruit-열매/history/에 기록"
    )
    args = parser.parse_args()

    phase_dir = Path(args.phase_dir)
    rtm_path = phase_dir / "rtm-covenant-언약추적.md"
    spec_path = phase_dir / "spec-tablet-명세서.md"

    if not rtm_path.exists():
        print(f"❌ RTM 파일을 찾을 수 없다: {rtm_path}")
        sys.exit(2)

    rtm_text = rtm_path.read_text(encoding="utf-8")
    rows = parse_rtm_table(rtm_text)
    stated = parse_stated_summary(rtm_text)

    if not rows:
        print("❌ RTM 표에서 유효한 REQ-ID 행을 찾지 못했다.")
        print("   헤더 행에 'REQ-ID'와 '상태' 컬럼이 정확히 있는지 확인하라.")
        sys.exit(2)

    problems = []

    # ── 1. 실계수 ──────────────────────────────────────────────
    counts = {"✅": 0, "🔄": 0, "⬜": 0, "❌": 0}
    seen = {}
    duplicates = set()
    for row in rows:
        req_id = row["REQ-ID"]
        status = row.get("상태", "")
        if req_id in seen:
            duplicates.add(req_id)
        seen[req_id] = row
        counts[status] = counts.get(status, 0) + 1

    total = len(seen)
    done = counts.get("✅", 0)
    computed_coverage = round(done / total * 100, 1) if total else 0.0

    print("=" * 64)
    print(f"📜 언약 계수 (RTM Census) — {rtm_path}")
    print("=" * 64)
    print(f"실계수 고유 ID 수: {total}")
    for icon, label in STATUS_LABELS.items():
        print(f"  {icon} {label}: {counts.get(icon, 0)}건")
    other = {k: v for k, v in counts.items() if k not in STATUS_LABELS}
    if other:
        print(f"  ⚠️  알 수 없는 상태 아이콘: {other}")
        problems.append(f"상태 범례(✅/🔄/⬜/❌)에 없는 아이콘 사용: {other}")
    print(f"실계수 커버리지: {computed_coverage}%  ( ✅ {done} / {total} )")

    if duplicates:
        print(f"  ❌ 중복 등재 ID: {sorted(duplicates)}")
        problems.append(f"RTM에 같은 ID가 두 번 이상 등재됨: {sorted(duplicates)}")

    # ── 2. 문서 기재 요약 vs 실계수 대조 ──────────────────────
    print("-" * 64)
    if stated:
        print("문서에 기재된 '커버리지 요약'과 실계수 대조:")
        actuals = {
            "total": total,
            "done": done,
            "partial": counts.get("🔄", 0),
            "untracked": counts.get("⬜", 0),
        }
        labels = {
            "total": "전체 REQ 수",
            "done": "완전 추적(✅)",
            "partial": "부분 추적(🔄)",
            "untracked": "미추적(⬜)",
        }
        for key, label in labels.items():
            actual = actuals[key]
            stated_v = stated.get(key)
            mark = "✅" if stated_v == actual else "❌"
            print(f"  {mark} {label}: 문서기재={stated_v}  실계수={actual}")
            if stated_v is not None and stated_v != actual:
                problems.append(f"'{label}' 불일치 — 문서기재={stated_v}, 실계수={actual}")
        if "coverage_pct" in stated:
            diff_ok = abs(stated["coverage_pct"] - computed_coverage) < 0.05
            mark = "✅" if diff_ok else "❌"
            print(f"  {mark} 커버리지 %: 문서기재={stated['coverage_pct']}%  실계수={computed_coverage}%")
            if not diff_ok:
                problems.append(
                    f"커버리지 % 불일치 — 문서기재={stated['coverage_pct']}%, 실계수={computed_coverage}%"
                )
        else:
            problems.append("커버리지 요약 표에서 '커버리지' 항목을 찾지 못했다")
    else:
        print("  ❌ '커버리지 요약' 표를 찾지 못했다 (필수 섹션 누락)")
        problems.append("커버리지 요약 표 누락")

    # ── 3. spec-tablet 원문 전수 대조 ("하나도 잃어버리지 않겠다") ──
    print("-" * 64)
    if spec_path.exists():
        spec_ids = set(ID_SCAN.findall(spec_path.read_text(encoding="utf-8")))
        rtm_ids = set(seen.keys())
        missing = sorted(spec_ids - rtm_ids)
        print(f"spec-tablet-명세서.md 원문 대조 (원문 ID {len(spec_ids)}개 발견):")
        if missing:
            print(f"  ❌ spec-tablet에는 있으나 RTM에 전혀 등재되지 않은 ID {len(missing)}건: {missing}")
            problems.append(f"spec-tablet에 있으나 RTM 미등재: {missing}")
        else:
            print("  ✅ spec-tablet의 모든 ID가 RTM에 최소 1회 등재되어 있다.")
    else:
        print(f"  ⚠️  spec-tablet-명세서.md를 찾지 못해 원문 대조는 생략 ({spec_path})")

    # ── 4. Phase별 열 충족 심판 (선택) ────────────────────────
    if args.phase:
        print("-" * 64)
        print(f"Phase {args.phase} 완료 심판 (언약추적 갱신 규칙 대조):")
        if args.phase in PHASE_REQUIRED_COLUMNS:
            for col in PHASE_REQUIRED_COLUMNS[args.phase]:
                empty_ids = [
                    r["REQ-ID"]
                    for r in rows
                    if not r.get(col, "").strip() or r.get(col, "").strip() in ("—", "-", "")
                ]
                mark = "✅" if not empty_ids else "❌"
                print(f"  {mark} '{col}' 열 — 미기재 {len(empty_ids)}건" + (f": {empty_ids}" if empty_ids else ""))
                if empty_ids:
                    problems.append(f"Phase {args.phase} 요구사항 위반 — '{col}' 열 미기재: {empty_ids}")
        if args.phase in (6, 7):
            unfinished = [r["REQ-ID"] for r in rows if r.get("상태") != "✅"]
            mark = "✅" if not unfinished else "❌"
            print(f"  {mark} 전 행 완전추적(✅) 여부 — 미완료 {len(unfinished)}건" + (f": {unfinished}" if unfinished else ""))
            if unfinished:
                problems.append(f"Phase {args.phase} 진입 조건 위반 — 미완전추적 ID: {unfinished}")

    # ── 최종 판정 ──────────────────────────────────────────────
    print("=" * 64)
    if not problems:
        verdict = "IRONCLAD"
        print("⚖️  최종 판정: ✅ IRONCLAD — 언약을 하나도 잃어버리지 않았다.")
    else:
        verdict = "FAIL"
        print(f"⚖️  최종 판정: ❌ FAIL — {len(problems)}건의 불일치/누락 발견. 회개(수정) 후 재심판하라.")
        for p in problems:
            print(f"   - {p}")
    print("=" * 64)

    if args.log:
        project_root = find_project_root(phase_dir)
        if project_root:
            summary = (
                f"{verdict} | 실계수 {total}건(✅{done}/🔄{counts.get('🔄',0)}/⬜{counts.get('⬜',0)}/❌{counts.get('❌',0)}) "
                f"| 커버리지 {computed_coverage}%"
                + (f" | Phase {args.phase} 심판" if args.phase else "")
                + (f" | 문제 {len(problems)}건" if problems else "")
            )
            write_history_log(project_root, summary)
        else:
            print("⚠️  fruit-열매/를 찾지 못해 기록의 서에 기록하지 못했다 (--log 무시됨)")

    sys.exit(0 if verdict == "IRONCLAD" else 1)


if __name__ == "__main__":
    main()
