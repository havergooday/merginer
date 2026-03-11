# 실게임 기준 자동 밸런스 테스트 계획 v2 (수동 제외)

## 목표
- 수동 플레이 없이 자동 시뮬레이션만으로 3층 도달/클리어 가능성을 판정한다.
- 1차 라운드 표본은 정책별 30세션(총 90세션)으로 고정한다.

## 실행 고정값
- preset: `all`
- sessionsPerPolicy: `30`
- seedBase: `20260310`
- 시작조건: `1층만 개방`, `초기 철광석 0`

## 실행 절차
1. 사전 검증
   - `pnpm run test:fast`
   - `pnpm run test:analysis`
   - `pnpm build`
2. 수집
   - `pnpm run balance:collect -- --preset all --sessions 30 --seedBase 20260310`
3. 판정
   - `pnpm run balance:verdict -- --input reports/balance/summary.csv --baseline reports/balance/verdict.baseline.json`

## 핵심 KPI
- 1순위: `3층 도달/클리어율`
- 보조: `stagnationAbortRate`, `enhance6to9`, `pairMissing`, `resourceConversionCount`, `plus6TimeP50`

## 해석 원칙
- 이번 라운드는 자동 정책의 방향성 검증 단계다.
- 합격/불합격보다 병목 위치(전환, pair, 정체)를 우선 판독한다.
- 다음 개선은 한 번에 1개 축만 수정해 인과를 유지한다.
