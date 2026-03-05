import { describe, expect, it } from "vitest";

import {
  canCraftMithril,
  canCraftSteel,
  getEnhanceBaseSuccessRate,
  getEnhanceBonusRate,
  getEnhanceFinalSuccessRate,
  getCraftCost,
  getEnhanceMaterialCost,
  getEnhanceOreCost,
  getNextForgeUpgradeCost,
  getRequiredForgeLevelForEnhance,
} from "@/domain/forgeEconomy";

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

  it("returns required forge level by enhance tier", () => {
    expect(getRequiredForgeLevelForEnhance(0)).toBe(0);
    expect(getRequiredForgeLevelForEnhance(5)).toBe(0);
    expect(getRequiredForgeLevelForEnhance(6)).toBe(3);
    expect(getRequiredForgeLevelForEnhance(9)).toBe(3);
    expect(getRequiredForgeLevelForEnhance(10)).toBe(5);
    expect(getRequiredForgeLevelForEnhance(15)).toBe(5);
  });

  it("returns material costs by enhance tier", () => {
    expect(getEnhanceMaterialCost(5)).toEqual({ ironOre: 5 });
    expect(getEnhanceMaterialCost(6)).toEqual({ ironOre: 6, steelOre: 6 });
    expect(getEnhanceMaterialCost(10)).toEqual({ ironOre: 10, mithril: 10 });
  });

  it("checks steel crafting unlock and 100:1 boundary", () => {
    expect(canCraftSteel(1, 100)).toBe(false);
    expect(canCraftSteel(2, 99)).toBe(false);
    expect(canCraftSteel(2, 100)).toBe(true);
  });

  it("checks mithril crafting unlock and 100:1 boundary", () => {
    expect(canCraftMithril(3, 100)).toBe(false);
    expect(canCraftMithril(4, 99)).toBe(false);
    expect(canCraftMithril(4, 100)).toBe(true);
  });

  it("returns enhance base success rate on gradual decay curve", () => {
    expect(getEnhanceBaseSuccessRate(0)).toBeCloseTo(0.9);
    expect(getEnhanceBaseSuccessRate(5)).toBeCloseTo(0.7);
    expect(getEnhanceBaseSuccessRate(6)).toBeCloseTo(0.65);
    expect(getEnhanceBaseSuccessRate(9)).toBeCloseTo(0.45);
    expect(getEnhanceBaseSuccessRate(10)).toBeCloseTo(0.4);
  });

  it("caps fail-streak bonus rate and applies to final success rate", () => {
    expect(getEnhanceBonusRate(0)).toBeCloseTo(0);
    expect(getEnhanceBonusRate(3)).toBeCloseTo(0.09);
    expect(getEnhanceBonusRate(999)).toBeCloseTo(0.24);
    expect(getEnhanceFinalSuccessRate(5, 3)).toBeCloseTo(0.79);
  });
});
