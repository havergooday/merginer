export const MAX_FORGE_LEVEL = 10;
export const MIN_CRAFT_COST = 5;
export const BASE_CRAFT_COST = 10;
export const BASE_FORGE_UPGRADE_COST = 100;

export const getCraftCost = (forgeLevel: number): number => {
  const effectiveLevel = Math.max(0, Math.min(MAX_FORGE_LEVEL, Math.floor(forgeLevel)));
  return Math.max(MIN_CRAFT_COST, BASE_CRAFT_COST - Math.floor((effectiveLevel + 1) / 2));
};

export const getNextForgeUpgradeCost = (currentCost: number): number => {
  return Math.ceil(currentCost * 1.5);
};

export const canUpgradeForge = (forgeLevel: number): boolean => {
  return forgeLevel < MAX_FORGE_LEVEL;
};

export const getEnhanceOreCost = (plus: number): number => {
  return Math.max(0, Math.floor(plus));
};

