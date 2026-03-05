import { describe, expect, it } from "vitest";

import {
  createDefaultFloor3GridPolicies,
  runFloor3GridSearch,
} from "@/domain/analysis/floor3GridSearch";

describe("runFloor3GridSearch", () => {
  it("returns sorted reports with baseline presets", { timeout: 20_000 }, () => {
    const reports = runFloor3GridSearch({
      policies: createDefaultFloor3GridPolicies({ balancedDelta: 1 }).slice(0, 8),
      maxLoops: 5_000,
    });

    expect(reports.length).toBeGreaterThanOrEqual(3);
    const baselineNames = new Set(["conservative", "balanced", "aggressive"]);
    const baselineReports = reports.filter((report) => baselineNames.has(report.name));
    expect(baselineReports.length).toBe(3);
    expect(baselineReports.every((report) => report.completed || report.abortedByLoopCap)).toBe(true);

    for (let i = 1; i < reports.length; i += 1) {
      const prev = reports[i - 1];
      const curr = reports[i];
      expect(prev.exploreCount <= curr.exploreCount).toBe(true);
    }
  });

  it("keeps result shape stable for reporting", { timeout: 20_000 }, () => {
    const reports = runFloor3GridSearch({
      policies: createDefaultFloor3GridPolicies({ balancedDelta: 1 }).slice(0, 3),
      maxLoops: 3_000,
    });
    for (const report of reports) {
      expect(report).toMatchObject({
        name: expect.any(String),
        completed: expect.any(Boolean),
        exploreCount: expect.any(Number),
        restCount: expect.any(Number),
        plus5AtExplore: expect.anything(),
        exploreByFloor: {
          1: expect.any(Number),
          2: expect.any(Number),
          3: expect.any(Number),
        },
      });
    }
  });
});
