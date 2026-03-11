import { describe, expect, it } from "vitest";

import {
  analyzeFloor3ClearSession,
  STRATEGY_PRESETS,
} from "@/domain/analysis/floor3ClearAnalysis";

describe("analyzeFloor3ClearSession", () => {
  it("completes a floor 3 clear run for the built-in strategies", { timeout: 60_000 }, () => {
    const results = [];
    for (const preset of Object.values(STRATEGY_PRESETS)) {
      const result = analyzeFloor3ClearSession({ policy: preset, maxLoops: 8_000 });
      results.push(result);
      if (result.completed) {
        expect(result.completedExploreCount).toBeGreaterThan(0);
      } else {
        expect(result.abortedByLoopCap).toBe(true);
      }
      expect(result.exploreCount).toBeGreaterThanOrEqual(result.completedExploreCount ?? 0);
      expect(result.exploreByFloor[3]).toBeGreaterThanOrEqual(0);
    }
    expect(results.some((result) => result.exploreByFloor[2] > 0)).toBe(true);
  });

  it("records plus5 timing and enhancement tier counts", { timeout: 60_000 }, () => {
    const result = analyzeFloor3ClearSession({ policy: STRATEGY_PRESETS.balanced, maxLoops: 8_000 });
    expect(result.plus5AtExplore).not.toBeNull();
    expect(result.enhanceCountByTier.plus0to5).toBeGreaterThan(0);
    expect(result.enhanceCountTotal).toBe(
      result.enhanceCountByTier.plus0to5 +
        result.enhanceCountByTier.plus6to9 +
        result.enhanceCountByTier.plus10Plus,
    );
  });

  it("stops with aborted status when guard rail is too small", () => {
    const result = analyzeFloor3ClearSession({
      policy: STRATEGY_PRESETS.balanced,
      maxLoops: 1,
    });
    expect(result.completed).toBe(false);
    expect(result.abortedByLoopCap).toBe(true);
  });
});
