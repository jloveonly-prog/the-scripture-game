# CLAUDE.md

이 파일은 Claude Code가 이 디렉토리에서 작업할 때 항상 따라야 하는 규칙을 담습니다.

## Backup 폴더 정책 (생태계 공통 규칙)

- `backup/` 폴더 및 그 하위의 모든 파일/폴더는 **git으로 절대 커밋하지 않는다.**
  - `.gitignore`에 `**/backup/` 규칙이 있는지 먼저 확인하고 없으면 추가한다.
- `backup/` 하위 내용은 **어떤 공개 채널에도 절대 노출하지 않는다.**
- 공개하고 싶은 문서는 애초에 `backup/`에 두지 않는다.
- 이 정책은 `D:\00.TheScriptureMaster` 생태계(00~06, 99) 전체에 공통 적용된다.

## 이 디렉토리 (06.TheScriptureGame — 실험실)

- 핵심 파이프라인(00~05)에 속하지 않는 독립 실험 유닛입니다. 성경적 소재를 게임 형식으로 구현합니다.

## 개발 파이프라인 (The Scripture AIDD)

- 이 폴더의 게임은 `the-scripture-aidd/` 프레임워크(원본: jloveonly-prog/the-scripture-aidd, 동기화 커밋은 `the-scripture-aidd/AIDD_SOURCE.txt`)로 개발한다. 실행 지침은 `autoRun.md`.
- 원본 요구사항: `요구사항.md`, `게임재미설계-학술자료.md` → 스냅샷: `the-scripture-aidd/hearing-들음/req.md`
- 설계 산출물: `the-scripture-aidd/bible-성경/`, 소스 코드: `the-scripture-aidd/fruit-열매/`
- `statute-율법/`, `parable-비유/`, `book-경전/`, `.skill/`은 읽기 전용이다. 프레임워크를 갱신할 때는 원본 저장소에서 다시 복사하고 `AIDD_SOURCE.txt`를 갱신한다.
