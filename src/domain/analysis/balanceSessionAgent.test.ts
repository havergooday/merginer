import { describe, expect, it } from "vitest";

import { runBalanceSessions } from "@/domain/analysis/balanceSessionAgent";

describe("runBalanceSessions", () => {
  it("returns deterministic summaries for same config", () => {
    const config = {
      preset: "balanced" as const,
      sessionsPerPolicy: 3,
      maxLoops: 300,
      seedBase: 42,
      initialStateOverride: {
        ironOre: 0,
        unlockedFloor: 1 as const,
      },
    };

    const first = runBalanceSessions(config);
    const second = runBalanceSessions(config);
    expect(first.summaryRows).toEqual(second.summaryRows);
  });

  it("produces summary rows per session", () => {
    const report = runBalanceSessions({
      preset: "all",
      sessionsPerPolicy: 2,
      maxLoops: 200,
      seedBase: 20260309,
    });

    expect(report.summaryRows.length).toBe(6);
    expect(report.traceRows.length).toBeGreaterThan(0);
    const one = report.summaryRows[0];
    expect(one.logicalPlayTimeMs).toBe(one.logicalExploreTimeMs + one.logicalTownTimeMs);
  });

  it("keeps conversion and stagnation fields in summary rows", () => {
    const report = runBalanceSessions({
      preset: "all",
      sessionsPerPolicy: 2,
      maxLoops: 200,
      seedBase: 20260310,
      initialStateOverride: {
        ironOre: 0,
        unlockedFloor: 1,
      },
    });

    const one = report.summaryRows[0];
    expect(typeof one.resourceConversionCount).toBe("number");
    expect(typeof one.craftSteelCount).toBe("number");
    expect(typeof one.craftMithrilCount).toBe("number");
    expect(typeof one.abortedByStagnation).toBe("boolean");
  });
});
