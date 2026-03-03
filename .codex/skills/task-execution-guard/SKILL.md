---
name: task-execution-guard
description: Minimal execution routine for todo-first progress and mandatory completion verification.
---

# Task Execution Guard (Minimal)

## Purpose
모든 작업을 간결하게 수행하되, 아래 2가지를 항상 강제한다.
1. 시작 시 TODO 체크리스트 표시 + 단계별 갱신
2. 종료 시 `pnpm build` 검증

## Required Flow

### 1) Start: Restate + TODO
요청을 짧게 재진술한 뒤, 아래 형식으로 TODO를 먼저 제시한다.

- `[ ] Step 1: ...`
- `[ ] Step 2: ...`
- `[ ] Step 3: ...`

진행 시 상태를 갱신한다.
- `[~]` 현재 수행 중 (한 번에 1개만)
- `[x]` 완료

### 2) Execute: One step at a time
- TODO 순서대로 실행한다.
- 중간 상태 변경 시 체크리스트를 갱신해 사용자에게 보여준다.

### 3) Finish: Mandatory verification
완료 보고 전에 반드시 아래를 수행한다.

1. Build check
- `pnpm build`
- 실패 시 오류 요약 후 수정 반복

`pnpm build`가 미완료 또는 실패 상태면 작업 완료로 선언하지 않는다.

## Minimal Report Template

### Progress
- `[x] Step 1: ...`
- `[x] Step 2: ...`
- `[x] Step 3: ...`

### Verification
- Build: pass/fail

### Result
- 변경 파일 목록
- 핵심 변경 요약
