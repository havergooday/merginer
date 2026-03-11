import type { MaterialStock } from "@/domain/state";

export const MAX_FORGE_LEVEL = 12;
export const MIN_CRAFT_COST = 5;
export const BASE_CRAFT_COST = 8;
export const BASE_FORGE_UPGRADE_COST = 36;
export const ORE_TO_STEEL_COST = 45;
export const STEEL_TO_MITHRIL_COST = 50;

export const getCraftCost = (forgeLevel: number): number => {
  const effectiveLevel = Math.max(0, Math.min(MAX_FORGE_LEVEL, Math.floor(forgeLevel)));
  return Math.max(MIN_CRAFT_COST, BASE_CRAFT_COST - Math.floor((effectiveLevel + 1) / 2));
};

export const getCraftedPlusByForgeLevel = (forgeLevel: number): number => {
  const level = Math.max(0, Math.floor(forgeLevel));
  if (level >= 12) return 5;
  if (level >= 10) return 4;
  if (level >= 8) return 3;
  if (level >= 6) return 2;
  if (level >= 4) return 1;
  if (level >= 2) return 0;
  return 0;
};

export const getCraftFinalCost = (forgeLevel: number): number => {
  const baseCost = getCraftCost(forgeLevel);
  const craftedPlus = getCraftedPlusByForgeLevel(forgeLevel);
  return Math.ceil(baseCost * (1 + craftedPlus * 0.18));
};

export const getNextForgeUpgradeCost = (currentCost: number): number => {
  return Math.ceil(currentCost * 1.35);
};

export const canUpgradeForge = (forgeLevel: number): boolean => {
  return forgeLevel < MAX_FORGE_LEVEL;
};

export const canCraftSteel = (forgeLevel: number, ironOre: number): boolean => {
  return forgeLevel >= 2 && ironOre >= ORE_TO_STEEL_COST;
};

export const canCraftMithril = (forgeLevel: number, steelOre: number): boolean => {
  return forgeLevel >= 4 && steelOre >= STEEL_TO_MITHRIL_COST;
};

export const getEnhanceOreCost = (plus: number): number => {
  return Math.max(0, Math.floor(plus));
};

export const getRequiredForgeLevelForEnhance = (plus: number): number => {
  const normalizedPlus = Math.max(0, Math.floor(plus));
  if (normalizedPlus >= 10) {
    return 5;
  }
  if (normalizedPlus >= 6) {
    return 3;
  }
  return 0;
};

export type MaterialCost = Partial<Record<keyof MaterialStock, number>>;

export const getEnhanceMaterialCost = (plus: number): MaterialCost => {
  const normalizedPlus = Math.max(0, Math.floor(plus));
  if (normalizedPlus >= 10) {
    return { ironOre: normalizedPlus, mithril: normalizedPlus };
  }
  if (normalizedPlus >= 8) {
    return { ironOre: normalizedPlus, steelOre: Math.max(4, normalizedPlus - 3), mithril: 1 };
  }
  if (normalizedPlus >= 6) {
    return { ironOre: normalizedPlus, steelOre: Math.max(4, normalizedPlus - 2), mithril: 1 };
  }
  return { ironOre: normalizedPlus };
};

export const ENHANCE_BONUS_STEP = 0.03;
export const ENHANCE_BONUS_MAX = 0.24;

export const getEnhanceBaseSuccessRate = (plus: number): number => {
  const normalizedPlus = Math.max(0, Math.floor(plus));
  if (normalizedPlus <= 5) {
    return Math.max(0.75, 0.95 - normalizedPlus * 0.04);
  }
  if (normalizedPlus <= 9) {
    return Math.max(0.5, 0.7 - (normalizedPlus - 6) * 0.07);
  }
  return Math.max(0.3, 0.4 - (normalizedPlus - 10) * 0.02);
};

export const getEnhanceBonusRate = (
  failStreak: number,
  bonusStep: number = ENHANCE_BONUS_STEP,
  maxBonus: number = ENHANCE_BONUS_MAX,
): number => {
  const normalizedFailStreak = Math.max(0, Math.floor(failStreak));
  return Math.min(maxBonus, normalizedFailStreak * bonusStep);
};

export const getEnhanceFinalSuccessRate = (
  plus: number,
  failStreak: number,
  bonusStep?: number,
  maxBonus?: number,
): number => {
  const baseRate = getEnhanceBaseSuccessRate(plus);
  const bonusRate = getEnhanceBonusRate(failStreak, bonusStep, maxBonus);
  return Math.min(0.95, baseRate + bonusRate);
};
