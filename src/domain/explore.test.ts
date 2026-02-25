import { describe, expect, it } from "vitest";

import { simulateExplore } from "@/domain/explore";

describe("simulateExplore", () => {
  it("clears full floor 1 when attack/hp are sufficient", () => {
    const result = simulateExplore({ floor: 1, hp: 100, attack: 3 });
    expect(result.endReason).toBe("FLOOR_CLEARED");
    expect(result.clearedStage).toBe(10);
    expect(result.logs.length).toBe(10);
    expect(result.totalReward).toEqual({ ironOre: 23, steelOre: 0, mithril: 0 });
    expect(result.finalHp).toBeGreaterThan(0);
  });

  it("stops early with defeated reason when hp reaches zero", () => {
    const result = simulateExplore({ floor: 1, hp: 1, attack: 1 });
    expect(result.endReason).toBe("DEFEATED");
    expect(result.clearedStage).toBe(1);
    expect(result.logs.length).toBe(1);
    expect(result.finalHp).toBe(0);
  });
});
