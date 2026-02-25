import { describe, expect, it } from "vitest";

import { getCraftCost, getEnhanceOreCost, getNextForgeUpgradeCost } from "@/domain/forgeEconomy";

describe("forgeEconomy", () => {
  it("reduces craft cost at odd forge levels with floor and min 5", () => {
    expect(getCraftCost(0)).toBe(10);
    expect(getCraftCost(1)).toBe(9);
    expect(getCraftCost(2)).toBe(9);
    expect(getCraftCost(3)).toBe(8);
    expect(getCraftCost(5)).toBe(7);
    expect(getCraftCost(7)).toBe(6);
    expect(getCraftCost(10)).toBe(5);
    expect(getCraftCost(99)).toBe(5);
  });

  it("calculates forge upgrade cost with ceil 1.5x", () => {
    expect(getNextForgeUpgradeCost(100)).toBe(150);
    expect(getNextForgeUpgradeCost(150)).toBe(225);
    expect(getNextForgeUpgradeCost(225)).toBe(338);
  });

  it("calculates enhance ore cost from plus level", () => {
    expect(getEnhanceOreCost(0)).toBe(0);
    expect(getEnhanceOreCost(5)).toBe(5);
    expect(getEnhanceOreCost(5.9)).toBe(5);
    expect(getEnhanceOreCost(-1)).toBe(0);
  });
});
