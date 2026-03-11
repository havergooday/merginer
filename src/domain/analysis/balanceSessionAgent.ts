import { simulateExplore } from "@/domain/explore";
import {
  getCraftFinalCost,
  getEnhanceFinalSuccessRate,
  getEnhanceMaterialCost,
  getRequiredForgeLevelForEnhance,
  canUpgradeForge,
  ORE_TO_STEEL_COST,
  STEEL_TO_MITHRIL_COST,
} from "@/domain/forgeEconomy";
import { EVENT_DURATIONS } from "@/hooks/exploreTimeline";
import { nextRandom } from "@/domain/rng";
import { calcAttackFromEquipped } from "@/domain/selectors";
import { createInitialGameState, type Floor, type GameState } from "@/domain/state";
import { getMaxHp } from "@/domain/hp";
import { enhanceEquipment, failEnhanceMaterialDestroyed, craftEquipment, upgradeForge } from "@/domain/usecases/forgeFlow";
import { STRATEGY_PRESETS, type FloorProgressionPolicy, type StrategyPreset } from "@/domain/analysis/floor3ClearAnalysis";

export type BalancePreset = StrategyPreset | "all";

export type BalanceInitialStateOverride = {
  ironOre?: number;
  unlockedFloor?: Floor;
};

export type BalanceRunConfig = {
  preset?: BalancePreset;
  sessionsPerPolicy?: number;
  maxLoops?: number;
  seedBase?: number;
  initialStateOverride?: BalanceInitialStateOverride;
};

export type BalanceSessionSummaryRow = {
  policy: string;
  sessionId: string;
  seed: number;
  completed: boolean;
  abortedByLoopCap: boolean;
  abortedByStagnation: boolean;
  exploreCount: number;
  restCount: number;
  craftWeaponCount: number;
  craftArmorCount: number;
  craftSteelCount: number;
  craftMithrilCount: number;
  consecutiveWeaponCraftMax: number;
  armorLagMax: number;
  resourceConversionCount: number;
  convBlockedByForgeLevel: number;
  convBlockedByOre: number;
  convBlockedByTargetInactive: number;
  convBlockedByTargetMet: number;
  enhanceBlockedByPairMissing: number;
  enhanceBlockedByMaterials: number;
  forgeUpgradeCount: number;
  enhanceCountTotal: number;
  enhance0to5: number;
  enhance6to9: number;
  enhance10plus: number;
  plus6Reached: boolean;
  plus6ReachedLogicalTimeMs: number | "";
  floor1Reached: boolean;
  floor1FirstExploreLogicalTimeMs: number | "";
  floor1ClearLogicalTimeMs: number | "";
  floor2Reached: boolean;
  floor2FirstExploreLogicalTimeMs: number | "";
  floor2ClearLogicalTimeMs: number | "";
  floor3Reached: boolean;
  floor3FirstExploreLogicalTimeMs: number | "";
  floor3ClearLogicalTimeMs: number | "";
  enhanceSuccessRateTotal: number;
  enhanceSuccessRate0to5: number;
  enhanceSuccessRate6to9: number;
  enhanceSuccessRate10plus: number;
  enhanceExpectedRateTotal: number;
  enhanceExpectedRate0to5: number;
  enhanceExpectedRate6to9: number;
  enhanceExpectedRate10plus: number;
  logicalExploreTimeMs: number;
  logicalTownTimeMs: number;
  logicalPlayTimeMs: number;
  ironEarned: number;
  ironSpent: number;
  steelEarned: number;
  steelSpent: number;
  mithrilEarned: number;
  mithrilSpent: number;
  finalBestPlus: number;
  finalAttack: number;
  finalMaxHp: number;
};

export type BalanceSessionTraceRow = {
  policy: string;
  sessionId: string;
  step: number;
  actionType:
    | "ENHANCE_ATTEMPT"
    | "CRAFT_WEAPON"
    | "CRAFT_ARMOR"
    | "CRAFT_STEEL"
    | "CRAFT_MITHRIL"
    | "FORGE_UPGRADE"
    | "REST"
    | "EXPLORE"
    | "EXPLORE_STAGE";
  floor: Floor;
  success?: boolean;
  plus?: number;
  expectedRate?: number;
  durationMs?: number;
  stage?: number;
  damageTaken?: number;
  endReason?: "DEFEATED" | "FLOOR_CLEARED";
};

export type BalanceRunReport = {
  config: Required<Omit<BalanceRunConfig, "initialStateOverride">> & {
    initialStateOverride: Required<BalanceInitialStateOverride>;
  };
  summaryRows: BalanceSessionSummaryRow[];
  traceRows: BalanceSessionTraceRow[];
};

type SessionMutableMetrics = {
  exploreCount: number;
  restCount: number;
  craftWeaponCount: number;
  craftArmorCount: number;
  craftSteelCount: number;
  craftMithrilCount: number;
  consecutiveWeaponCraftCurrent: number;
  consecutiveWeaponCraftMax: number;
  armorLagMax: number;
  resourceConversionCount: number;
  convBlockedByForgeLevel: number;
  convBlockedByOre: number;
  convBlockedByTargetInactive: number;
  convBlockedByTargetMet: number;
  enhanceBlockedByPairMissing: number;
  enhanceBlockedByMaterials: number;
  armorRecoveryRemaining: number;
  forgeUpgradeCount: number;
  enhanceCountTotal: number;
  enhance0to5: number;
  enhance6to9: number;
  enhance10plus: number;
  enhanceAttemptTotal: number;
  enhanceAttempt0to5: number;
  enhanceAttempt6to9: number;
  enhanceAttempt10plus: number;
  enhanceSuccessTotal: number;
  enhanceSuccess0to5: number;
  enhanceSuccess6to9: number;
  enhanceSuccess10plus: number;
  plus6Reached: boolean;
  plus6ReachedLogicalTimeMs: number | null;
  floor1Reached: boolean;
  floor1FirstExploreLogicalTimeMs: number | null;
  floor1ClearLogicalTimeMs: number | null;
  floor2Reached: boolean;
  floor2FirstExploreLogicalTimeMs: number | null;
  floor2ClearLogicalTimeMs: number | null;
  floor3Reached: boolean;
  floor3FirstExploreLogicalTimeMs: number | null;
  floor3ClearLogicalTimeMs: number | null;
  enhanceExpectedSumTotal: number;
  enhanceExpectedSum0to5: number;
  enhanceExpectedSum6to9: number;
  enhanceExpectedSum10plus: number;
  logicalExploreTimeMs: number;
  logicalTownTimeMs: number;
  ironEarned: number;
  ironSpent: number;
  steelEarned: number;
  steelSpent: number;
  mithrilEarned: number;
  mithrilSpent: number;
  completed: boolean;
  abortedByLoopCap: boolean;
  abortedByStagnation: boolean;
};

const DEFAULT_CONFIG: Required<Omit<BalanceRunConfig, "initialStateOverride">> & {
  initialStateOverride: Required<BalanceInitialStateOverride>;
} = {
  preset: "all",
  sessionsPerPolicy: 100,
  maxLoops: 10_000,
  seedBase: 20260309,
  initialStateOverride: {
    ironOre: 0,
    unlockedFloor: 1,
  },
};

const TOWN_DURATION_MS = {
  craft: 400,
  enhance: 400,
  forgeUpgrade: 400,
  rest: 1000,
} as const;
const WEAPON_ARMOR_RATIO_CAP_CONSERVATIVE = 1.3;
const WEAPON_ARMOR_RATIO_CAP_AGGRESSIVE = 1.8;
const WEAPON_ARMOR_RATIO_FLOOR = 0.7;
const CONSECUTIVE_WEAPON_CRAFT_CAP = 5;
const ARMOR_LAG_RECOVERY_THRESHOLD = 6;
const ARMOR_LAG_RECOVERY_CRAFTS = 2;
const PAIR_RECOVERY_WINDOW = 6;
const PAIR_RECOVERY_QUOTA = 4;
const PAIR_RECOVERY_CORRECTION_WINDOW = 4;
const PAIR_RECOVERY_CORRECTION_MAX_IN_WINDOW = 2;
const PAIR_RECOVERY_CORRECTION_MIN_TOP_PLUS = 6;
const PAIR_RECOVERY_CORRECTION_COOLDOWN_LOOPS = 4;
const CONVERSION_HYSTERESIS_MULTIPLIER = 1.3;
const CONVERSION_LOOKAHEAD_ATTEMPTS = 6;
const STAGNATION_LOOP_CAP = 330;
const LOGICAL_PLAY_TIME_CAP_MS = 1_800_000;

const EXPLORE_EVENT_SUM_MS = Object.values(EVENT_DURATIONS).reduce((acc, value) => acc + value, 0);

const normalizeConfig = (config: BalanceRunConfig): BalanceRunReport["config"] => ({
  preset: config.preset ?? DEFAULT_CONFIG.preset,
  sessionsPerPolicy: config.sessionsPerPolicy ?? DEFAULT_CONFIG.sessionsPerPolicy,
  maxLoops: config.maxLoops ?? DEFAULT_CONFIG.maxLoops,
  seedBase: config.seedBase ?? DEFAULT_CONFIG.seedBase,
  initialStateOverride: {
    ironOre: config.initialStateOverride?.ironOre ?? DEFAULT_CONFIG.initialStateOverride.ironOre,
    unlockedFloor: config.initialStateOverride?.unlockedFloor ?? DEFAULT_CONFIG.initialStateOverride.unlockedFloor,
  },
});

const getPolicies = (preset: BalancePreset): FloorProgressionPolicy[] => {
  if (preset === "all") {
    return [STRATEGY_PRESETS.conservative, STRATEGY_PRESETS.balanced, STRATEGY_PRESETS.aggressive];
  }
  return [STRATEGY_PRESETS[preset]];
};

const getBestItemIdByKind = (state: GameState, kind: "weapon" | "armor"): string | null => {
  const target = state.equipmentItems
    .filter((item) => item.kind === kind)
    .sort((a, b) => b.plus - a.plus || a.id.localeCompare(b.id))[0];
  return target ? target.id : null;
};

const equipBestItems = (state: GameState): GameState => ({
  ...state,
  equippedWeaponItemId: getBestItemIdByKind(state, "weapon"),
  equippedArmorItemId: getBestItemIdByKind(state, "armor"),
});

const determineFloor = (attack: number, maxHp: number, policy: FloorProgressionPolicy): Floor => {
  if (attack >= policy.floor3.attack && maxHp >= policy.floor3.maxHp) return 3;
  if (attack >= policy.floor2.attack && maxHp >= policy.floor2.maxHp) return 2;
  return 1;
};

const chooseCraftKind = (
  state: GameState,
  policy: FloorProgressionPolicy,
  attack: number,
  maxHp: number,
  metrics: SessionMutableMetrics,
): "weapon" | "armor" => {
  if (metrics.armorRecoveryRemaining > 0) return "armor";
  const ratioCap =
    policy.name === "aggressive" ? WEAPON_ARMOR_RATIO_CAP_AGGRESSIVE : WEAPON_ARMOR_RATIO_CAP_CONSERVATIVE;
  const ratioFloor = WEAPON_ARMOR_RATIO_FLOOR;
  if (metrics.consecutiveWeaponCraftCurrent >= CONSECUTIVE_WEAPON_CRAFT_CAP) return "armor";
  if (metrics.craftWeaponCount === 0 && metrics.craftArmorCount >= 3) return "weapon";
  if (metrics.craftArmorCount === 0 && metrics.craftWeaponCount >= 3) return "armor";
  if (
    metrics.craftWeaponCount > 0 &&
    metrics.craftArmorCount > metrics.craftWeaponCount / ratioFloor
  ) {
    return "weapon";
  }
  if (
    metrics.craftArmorCount > 0 &&
    metrics.craftWeaponCount > metrics.craftArmorCount * ratioCap
  ) {
    return "armor";
  }
  const target = attack >= policy.floor2.attack && maxHp >= policy.floor2.maxHp ? policy.floor3 : policy.floor2;
  const attackGap = Math.max(0, target.attack - attack);
  const hpGap = Math.max(0, target.maxHp - maxHp);
  if (attackGap > hpGap) return "weapon";
  if (hpGap > attackGap) return "armor";
  const weaponCount = state.equipmentItems.filter((item) => item.kind === "weapon").length;
  const armorCount = state.equipmentItems.filter((item) => item.kind === "armor").length;
  return weaponCount <= armorCount ? "weapon" : "armor";
};

const choosePairRecoveryCraftKind = (
  state: GameState,
  policy: FloorProgressionPolicy,
  metrics: SessionMutableMetrics,
): "weapon" | "armor" => {
  const ratioCap =
    policy.name === "aggressive" ? WEAPON_ARMOR_RATIO_CAP_AGGRESSIVE : WEAPON_ARMOR_RATIO_CAP_CONSERVATIVE;
  const ratioFloor = WEAPON_ARMOR_RATIO_FLOOR;
  if (metrics.craftWeaponCount === 0 && metrics.craftArmorCount >= 3) return "weapon";
  if (metrics.craftArmorCount === 0 && metrics.craftWeaponCount >= 3) return "armor";
  if (
    metrics.craftWeaponCount > 0 &&
    metrics.craftArmorCount > metrics.craftWeaponCount / ratioFloor
  ) {
    return "weapon";
  }
  if (metrics.consecutiveWeaponCraftCurrent >= CONSECUTIVE_WEAPON_CRAFT_CAP) return "armor";
  if (metrics.craftArmorCount > 0 && metrics.craftWeaponCount > metrics.craftArmorCount * ratioCap) return "armor";

  const topPlus = state.bestPlus;
  const topItems = state.equipmentItems.filter((item) => item.plus === topPlus);
  const topWeaponCount = topItems.filter((item) => item.kind === "weapon").length;
  const topArmorCount = topItems.filter((item) => item.kind === "armor").length;
  if (topWeaponCount !== topArmorCount) {
    return topWeaponCount < topArmorCount ? "weapon" : "armor";
  }

  const weaponCount = state.equipmentItems.filter((item) => item.kind === "weapon").length;
  const armorCount = state.equipmentItems.filter((item) => item.kind === "armor").length;
  return weaponCount <= armorCount ? "weapon" : "armor";
};

const getKindPlusCount = (state: GameState, kind: "weapon" | "armor", plus: number): number =>
  state.equipmentItems.filter((item) => item.kind === kind && item.plus === plus).length;

const resolvePairRecoveryTargetPlus = (state: GameState, kind: "weapon" | "armor"): number | null => {
  const topPlus = state.bestPlus;
  if (getKindPlusCount(state, kind, topPlus) === 1) return topPlus;
  if (topPlus > 0 && getKindPlusCount(state, kind, topPlus - 1) === 1) return topPlus - 1;
  return null;
};

const toItemIdNum = (id: string): number => {
  const [, raw] = id.split("-");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : -1;
};

const calcBestPlusFromItems = (items: GameState["equipmentItems"]): number =>
  items.reduce((max, item) => (item.plus > max ? item.plus : max), 0);

const applyPairRecoveryCraftCorrection = (
  beforeCraftState: GameState,
  craftedState: GameState,
  kind: "weapon" | "armor",
  allowCorrection: boolean,
): { state: GameState; corrected: boolean } => {
  if (!allowCorrection) {
    return { state: craftedState, corrected: false };
  }
  const targetPlus = resolvePairRecoveryTargetPlus(beforeCraftState, kind);
  if (targetPlus == null) return { state: craftedState, corrected: false };
  const craftedItems = craftedState.equipmentItems.filter(
    (item) => item.kind === kind && toItemIdNum(item.id) >= beforeCraftState.nextItemId,
  );
  const correctionTarget = craftedItems[0];
  if (!correctionTarget) return { state: craftedState, corrected: false };

  const equipmentItems = craftedState.equipmentItems.map((item) =>
    item.id === correctionTarget.id ? { ...item, plus: targetPlus } : item,
  );
  return {
    state: {
      ...craftedState,
      equipmentItems,
      bestPlus: calcBestPlusFromItems(equipmentItems),
    },
    corrected: true,
  };
};

const getTierResourceTargets = (state: GameState): { targetSteel: number; targetMithril: number } => ({
  targetSteel: state.bestPlus >= 4 && state.forgeLevel >= 2 ? Math.max(5, state.forgeLevel + 1) : 0,
  targetMithril: state.bestPlus >= 6 && state.forgeLevel >= 3 ? Math.max(3, state.forgeLevel - 1) : 0,
});

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const evaluateConversionCandidate = (
  state: GameState,
  conversionModeActive: boolean,
  steelConversionCount: number,
  mithrilConversionCount: number,
): {
  eligible: boolean;
  action: "CRAFT_STEEL" | "CRAFT_MITHRIL" | null;
  reasonCode: string | null;
  nextConversionModeActive: boolean;
} => {
  const projectedPlus = clamp(Math.max(state.bestPlus, 6), 6, 9);
  const costs = getEnhanceMaterialCost(projectedPlus);
  const steelNeedOn = CONVERSION_LOOKAHEAD_ATTEMPTS * (costs.steelOre ?? 0);
  const mithrilNeedOn = CONVERSION_LOOKAHEAD_ATTEMPTS * (costs.mithril ?? 0);
  const steelNeedOff = Math.ceil(steelNeedOn * CONVERSION_HYSTERESIS_MULTIPLIER);
  const mithrilNeedOff = Math.ceil(mithrilNeedOn * CONVERSION_HYSTERESIS_MULTIPLIER);

  const steelGateActive = state.bestPlus >= 4 && state.forgeLevel >= 2;
  const mithrilGateActive = state.bestPlus >= 6 && state.forgeLevel >= 3;
  const targetActive = steelGateActive || mithrilGateActive;
  if (!targetActive) {
    return {
      eligible: false,
      action: null,
      reasonCode: "CONV_BLOCK_TARGET_NOT_ACTIVE",
      nextConversionModeActive: false,
    };
  }

  // Bootstrap: once steel conversion is unlocked, force at least one successful steel conversion per session.
  const needsBootstrapSteel = steelGateActive && steelConversionCount === 0;
  if (needsBootstrapSteel) {
    if (state.materials.ironOre < ORE_TO_STEEL_COST) {
      return {
        eligible: false,
        action: null,
        reasonCode: "CONV_BLOCK_ORE_SHORTAGE",
        nextConversionModeActive: true,
      };
    }
    return {
      eligible: true,
      action: "CRAFT_STEEL",
      reasonCode: null,
      nextConversionModeActive: true,
    };
  }

  // Bootstrap: once mithril conversion is unlocked, force at least one successful mithril conversion per session.
  const needsBootstrapMithril = mithrilGateActive && mithrilConversionCount === 0;
  if (needsBootstrapMithril) {
    if (state.materials.steelOre >= STEEL_TO_MITHRIL_COST) {
      return {
        eligible: true,
        action: "CRAFT_MITHRIL",
        reasonCode: null,
        nextConversionModeActive: true,
      };
    }
    if (steelGateActive && state.materials.ironOre >= ORE_TO_STEEL_COST) {
      return {
        eligible: true,
        action: "CRAFT_STEEL",
        reasonCode: null,
        nextConversionModeActive: true,
      };
    }
    return {
      eligible: false,
      action: null,
      reasonCode: "CONV_BLOCK_ORE_SHORTAGE",
      nextConversionModeActive: true,
    };
  }

  const needOn =
    (steelGateActive && state.materials.steelOre < steelNeedOn) ||
    (mithrilGateActive && state.materials.mithril < mithrilNeedOn);
  const offSatisfied =
    (!steelGateActive || state.materials.steelOre >= steelNeedOff) &&
    (!mithrilGateActive || state.materials.mithril >= mithrilNeedOff);
  const nextConversionModeActive = conversionModeActive ? !offSatisfied : needOn;

  if (!nextConversionModeActive) {
    return {
      eligible: false,
      action: null,
      reasonCode: "CONV_BLOCK_TARGET_ALREADY_MET",
      nextConversionModeActive,
    };
  }

  const needMithril = mithrilGateActive && state.materials.mithril < mithrilNeedOff;
  if (needMithril) {
    if (state.forgeLevel < 3) {
      return { eligible: false, action: null, reasonCode: "CONV_BLOCK_FORGE_LEVEL", nextConversionModeActive };
    }
    if (state.materials.steelOre < STEEL_TO_MITHRIL_COST) {
      return {
        eligible: false,
        action: null,
        reasonCode: "CONV_BLOCK_ORE_SHORTAGE",
        nextConversionModeActive,
      };
    }
    return { eligible: true, action: "CRAFT_MITHRIL", reasonCode: null, nextConversionModeActive };
  }

  const needSteel = steelGateActive && state.materials.steelOre < steelNeedOff;
  if (needSteel) {
    if (state.forgeLevel < 2) {
      return { eligible: false, action: null, reasonCode: "CONV_BLOCK_FORGE_LEVEL", nextConversionModeActive };
    }
    if (state.materials.ironOre < ORE_TO_STEEL_COST) {
      return {
        eligible: false,
        action: null,
        reasonCode: "CONV_BLOCK_ORE_SHORTAGE",
        nextConversionModeActive,
      };
    }
    return { eligible: true, action: "CRAFT_STEEL", reasonCode: null, nextConversionModeActive };
  }

  return { eligible: false, action: null, reasonCode: "CONV_BLOCK_TARGET_ALREADY_MET", nextConversionModeActive };
};

const evaluateEnhanceCandidate = (
  state: GameState,
): {
  eligible: boolean;
  reasonCode: "ENHANCE_BLOCK_PAIR_NOT_FOUND" | "ENHANCE_BLOCK_MATERIAL_SHORTAGE" | null;
  pair: { targetItemId: string; materialItemId: string; targetPlus: number } | null;
} => {
  const pairs = new Map<string, GameState["equipmentItems"]>();
  for (const item of state.equipmentItems) {
    const key = `${item.kind}:${item.plus}`;
    const group = pairs.get(key) ?? [];
    group.push(item);
    pairs.set(key, group);
  }

  const keys = Array.from(pairs.keys()).sort((a, b) => Number(b.split(":")[1]) - Number(a.split(":")[1]));
  let hasUsablePair = false;
  let hasMaterialShortagePair = false;

  for (const key of keys) {
    const group = pairs.get(key);
    if (!group || group.length < 2) continue;
    const target = group[0];
    const material = group[1];
    const requiredForgeLevel = getRequiredForgeLevelForEnhance(target.plus);
    if (state.forgeLevel < requiredForgeLevel) continue;
    hasUsablePair = true;
    const costs = getEnhanceMaterialCost(target.plus);
    const needIron = costs.ironOre ?? 0;
    const needSteel = costs.steelOre ?? 0;
    const needMithril = costs.mithril ?? 0;
    if (
      state.materials.ironOre < needIron ||
      state.materials.steelOre < needSteel ||
      state.materials.mithril < needMithril
    ) {
      hasMaterialShortagePair = true;
      continue;
    }
    return {
      eligible: true,
      reasonCode: null,
      pair: { targetItemId: target.id, materialItemId: material.id, targetPlus: target.plus },
    };
  }

  if (!hasUsablePair) {
    return { eligible: false, reasonCode: "ENHANCE_BLOCK_PAIR_NOT_FOUND", pair: null };
  }
  if (hasMaterialShortagePair) {
    return { eligible: false, reasonCode: "ENHANCE_BLOCK_MATERIAL_SHORTAGE", pair: null };
  }
  return { eligible: false, reasonCode: "ENHANCE_BLOCK_PAIR_NOT_FOUND", pair: null };
};

const isMidTierPrepMode = (state: GameState): boolean => {
  return state.bestPlus >= 5 && state.forgeLevel >= 3;
};

const shouldUpgradeForge = (state: GameState): boolean => {
  if (!canUpgradeForge(state.forgeLevel) || state.materials.ironOre < state.forgeUpgradeCost) return false;
  const currentNeed = getRequiredForgeLevelForEnhance(state.bestPlus);
  const nextTierNeed = state.bestPlus >= 4 ? 3 : 0;
  return state.forgeLevel < Math.max(currentNeed, nextTierNeed);
};

const shouldReserveForUpgrade = (state: GameState): boolean => {
  if (!canUpgradeForge(state.forgeLevel)) return false;
  const required = Math.max(getRequiredForgeLevelForEnhance(state.bestPlus), state.bestPlus >= 4 ? 3 : 0);
  if (state.forgeLevel >= required) return false;
  return state.materials.ironOre < state.forgeUpgradeCost;
};

const shouldPrioritizeMidTierUpgrade = (state: GameState): boolean => {
  return state.bestPlus >= 4 && state.forgeLevel < 3;
};

const createEmptyMetrics = (): SessionMutableMetrics => ({
  exploreCount: 0,
  restCount: 0,
  craftWeaponCount: 0,
  craftArmorCount: 0,
  craftSteelCount: 0,
  craftMithrilCount: 0,
  consecutiveWeaponCraftCurrent: 0,
  consecutiveWeaponCraftMax: 0,
  armorLagMax: 0,
  resourceConversionCount: 0,
  convBlockedByForgeLevel: 0,
  convBlockedByOre: 0,
  convBlockedByTargetInactive: 0,
  convBlockedByTargetMet: 0,
  enhanceBlockedByPairMissing: 0,
  enhanceBlockedByMaterials: 0,
  armorRecoveryRemaining: 0,
  forgeUpgradeCount: 0,
  enhanceCountTotal: 0,
  enhance0to5: 0,
  enhance6to9: 0,
  enhance10plus: 0,
  enhanceAttemptTotal: 0,
  enhanceAttempt0to5: 0,
  enhanceAttempt6to9: 0,
  enhanceAttempt10plus: 0,
  enhanceSuccessTotal: 0,
  enhanceSuccess0to5: 0,
  enhanceSuccess6to9: 0,
  enhanceSuccess10plus: 0,
  plus6Reached: false,
  plus6ReachedLogicalTimeMs: null,
  floor1Reached: false,
  floor1FirstExploreLogicalTimeMs: null,
  floor1ClearLogicalTimeMs: null,
  floor2Reached: false,
  floor2FirstExploreLogicalTimeMs: null,
  floor2ClearLogicalTimeMs: null,
  floor3Reached: false,
  floor3FirstExploreLogicalTimeMs: null,
  floor3ClearLogicalTimeMs: null,
  enhanceExpectedSumTotal: 0,
  enhanceExpectedSum0to5: 0,
  enhanceExpectedSum6to9: 0,
  enhanceExpectedSum10plus: 0,
  logicalExploreTimeMs: 0,
  logicalTownTimeMs: 0,
  ironEarned: 0,
  ironSpent: 0,
  steelEarned: 0,
  steelSpent: 0,
  mithrilEarned: 0,
  mithrilSpent: 0,
  completed: false,
  abortedByLoopCap: false,
  abortedByStagnation: false,
});

const getTier = (plus: number): "0to5" | "6to9" | "10plus" => {
  if (plus >= 10) return "10plus";
  if (plus >= 6) return "6to9";
  return "0to5";
};

const toRate = (success: number, attempts: number): number => (attempts <= 0 ? 0 : success / attempts);

const toSummaryRow = (
  policy: string,
  sessionId: string,
  seed: number,
  metrics: SessionMutableMetrics,
  state: GameState,
): BalanceSessionSummaryRow => ({
  policy,
  sessionId,
  seed,
  completed: metrics.completed,
  abortedByLoopCap: metrics.abortedByLoopCap,
  abortedByStagnation: metrics.abortedByStagnation,
  exploreCount: metrics.exploreCount,
  restCount: metrics.restCount,
  craftWeaponCount: metrics.craftWeaponCount,
  craftArmorCount: metrics.craftArmorCount,
  craftSteelCount: metrics.craftSteelCount,
  craftMithrilCount: metrics.craftMithrilCount,
  consecutiveWeaponCraftMax: metrics.consecutiveWeaponCraftMax,
  armorLagMax: metrics.armorLagMax,
  resourceConversionCount: metrics.resourceConversionCount,
  convBlockedByForgeLevel: metrics.convBlockedByForgeLevel,
  convBlockedByOre: metrics.convBlockedByOre,
  convBlockedByTargetInactive: metrics.convBlockedByTargetInactive,
  convBlockedByTargetMet: metrics.convBlockedByTargetMet,
  enhanceBlockedByPairMissing: metrics.enhanceBlockedByPairMissing,
  enhanceBlockedByMaterials: metrics.enhanceBlockedByMaterials,
  forgeUpgradeCount: metrics.forgeUpgradeCount,
  enhanceCountTotal: metrics.enhanceCountTotal,
  enhance0to5: metrics.enhance0to5,
  enhance6to9: metrics.enhance6to9,
  enhance10plus: metrics.enhance10plus,
  plus6Reached: metrics.plus6Reached,
  plus6ReachedLogicalTimeMs: metrics.plus6ReachedLogicalTimeMs ?? "",
  floor1Reached: metrics.floor1Reached,
  floor1FirstExploreLogicalTimeMs: metrics.floor1FirstExploreLogicalTimeMs ?? "",
  floor1ClearLogicalTimeMs: metrics.floor1ClearLogicalTimeMs ?? "",
  floor2Reached: metrics.floor2Reached,
  floor2FirstExploreLogicalTimeMs: metrics.floor2FirstExploreLogicalTimeMs ?? "",
  floor2ClearLogicalTimeMs: metrics.floor2ClearLogicalTimeMs ?? "",
  floor3Reached: metrics.floor3Reached,
  floor3FirstExploreLogicalTimeMs: metrics.floor3FirstExploreLogicalTimeMs ?? "",
  floor3ClearLogicalTimeMs: metrics.floor3ClearLogicalTimeMs ?? "",
  enhanceSuccessRateTotal: toRate(metrics.enhanceSuccessTotal, metrics.enhanceAttemptTotal),
  enhanceSuccessRate0to5: toRate(metrics.enhanceSuccess0to5, metrics.enhanceAttempt0to5),
  enhanceSuccessRate6to9: toRate(metrics.enhanceSuccess6to9, metrics.enhanceAttempt6to9),
  enhanceSuccessRate10plus: toRate(metrics.enhanceSuccess10plus, metrics.enhanceAttempt10plus),
  enhanceExpectedRateTotal: toRate(metrics.enhanceExpectedSumTotal, metrics.enhanceAttemptTotal),
  enhanceExpectedRate0to5: toRate(metrics.enhanceExpectedSum0to5, metrics.enhanceAttempt0to5),
  enhanceExpectedRate6to9: toRate(metrics.enhanceExpectedSum6to9, metrics.enhanceAttempt6to9),
  enhanceExpectedRate10plus: toRate(metrics.enhanceExpectedSum10plus, metrics.enhanceAttempt10plus),
  logicalExploreTimeMs: metrics.logicalExploreTimeMs,
  logicalTownTimeMs: metrics.logicalTownTimeMs,
  logicalPlayTimeMs: metrics.logicalExploreTimeMs + metrics.logicalTownTimeMs,
  ironEarned: metrics.ironEarned,
  ironSpent: metrics.ironSpent,
  steelEarned: metrics.steelEarned,
  steelSpent: metrics.steelSpent,
  mithrilEarned: metrics.mithrilEarned,
  mithrilSpent: metrics.mithrilSpent,
  finalBestPlus: state.bestPlus,
  finalAttack: calcAttackFromEquipped(state.equippedWeaponItemId, state.equipmentItems),
  finalMaxHp: getMaxHp(state.equippedArmorItemId, state.equipmentItems),
});

const runSingleSession = (
  policy: FloorProgressionPolicy,
  sessionId: string,
  seed: number,
  maxLoops: number,
  initialStateOverride: Required<BalanceInitialStateOverride>,
): { summary: BalanceSessionSummaryRow; trace: BalanceSessionTraceRow[] } => {
  let rngSeed = seed;
  let step = 0;
  const trace: BalanceSessionTraceRow[] = [];
  const metrics = createEmptyMetrics();
  let state = equipBestItems({
    ...createInitialGameState(seed),
    materials: {
      ...createInitialGameState(seed).materials,
      ironOre: initialStateOverride.ironOre,
    },
    unlockedFloor: initialStateOverride.unlockedFloor,
    currentFloor: initialStateOverride.unlockedFloor,
  });
  let stagnationLoops = 0;
  let lowTierPrepCooldown = 0;
  let pairRecoveryWindow: Array<"pair" | "other"> = [];
  let pairRecoveryCorrectionWindow: Array<"corrected" | "plain"> = [];
  let pairRecoveryDebt = 0;
  let pairCooldownBypassAvailable = true;
  let pairRecoveryCorrectionCooldown = 0;
  let conversionModeActive = false;
  let bestMeaningfulProgress = {
    bestPlus: state.bestPlus,
    forgeLevel: state.forgeLevel,
    conversionCount: metrics.resourceConversionCount,
  };

  for (let loop = 0; loop < maxLoops; loop += 1) {
    let progressedInTown = true;
    let townGuard = 0;

    while (progressedInTown && townGuard < 200) {
      townGuard += 1;
      progressedInTown = false;
      state = equipBestItems(state);
      const attack = calcAttackFromEquipped(state.equippedWeaponItemId, state.equipmentItems);
      const maxHp = getMaxHp(state.equippedArmorItemId, state.equipmentItems);
      const reserveForUpgrade = shouldReserveForUpgrade(state);
      const midTierPrepMode = isMidTierPrepMode(state);
      const targets = getTierResourceTargets(state);
      const recordTownAction = (entry: "pair" | "other"): void => {
        pairRecoveryWindow.push(entry);
        if (pairRecoveryWindow.length > PAIR_RECOVERY_WINDOW) {
          pairRecoveryWindow.shift();
        }
      };
      const midTierTargetsMet =
        state.materials.steelOre >= targets.targetSteel && state.materials.mithril >= targets.targetMithril;
      if (lowTierPrepCooldown > 0) {
        lowTierPrepCooldown -= 1;
      }
      if (pairRecoveryCorrectionCooldown > 0) {
        pairRecoveryCorrectionCooldown -= 1;
      }

      if (shouldPrioritizeMidTierUpgrade(state) && shouldUpgradeForge(state)) {
        const upgradeCost = state.forgeUpgradeCost;
        const upgraded = upgradeForge(state);
        if (upgraded !== state) {
          state = upgraded;
          metrics.logicalTownTimeMs += TOWN_DURATION_MS.forgeUpgrade;
          metrics.ironSpent += upgradeCost;
          metrics.forgeUpgradeCount += 1;
          recordTownAction("other");
          trace.push({ policy: policy.name, sessionId, step: ++step, actionType: "FORGE_UPGRADE", floor: state.currentFloor });
          progressedInTown = true;
          continue;
        }
      }

      if (midTierPrepMode && shouldUpgradeForge(state)) {
        const upgradeCost = state.forgeUpgradeCost;
        const upgraded = upgradeForge(state);
        if (upgraded !== state) {
          state = upgraded;
          metrics.logicalTownTimeMs += TOWN_DURATION_MS.forgeUpgrade;
          metrics.ironSpent += upgradeCost;
          metrics.forgeUpgradeCount += 1;
          recordTownAction("other");
          trace.push({ policy: policy.name, sessionId, step: ++step, actionType: "FORGE_UPGRADE", floor: state.currentFloor });
          progressedInTown = true;
          continue;
        }
      }
      const enhanceCandidate = evaluateEnhanceCandidate(state);
      const pairMissing = enhanceCandidate.reasonCode === "ENHANCE_BLOCK_PAIR_NOT_FOUND";
      const pairMissingHardBypass = pairMissing;
      const conversionCandidate = evaluateConversionCandidate(
        state,
        conversionModeActive,
        metrics.craftSteelCount,
        metrics.craftMithrilCount,
      );
      conversionModeActive = conversionCandidate.nextConversionModeActive;
      if (!pairMissing) {
        pairCooldownBypassAvailable = true;
      }
      const pairCraftsInWindow = pairRecoveryWindow.reduce((count, action) => count + (action === "pair" ? 1 : 0), 0);
      const pairQuotaMissing = Math.max(0, PAIR_RECOVERY_QUOTA - pairCraftsInWindow);
      if (pairMissing && reserveForUpgrade && pairQuotaMissing > 0) {
        pairRecoveryDebt = Math.max(pairRecoveryDebt, pairQuotaMissing);
      }
      const pendingPairRecovery = pairMissing ? Math.max(pairRecoveryDebt, pairQuotaMissing) : 0;
      const shouldPrioritizePairCraft = pairMissing || pendingPairRecovery > 0;
      const canBypassCooldownForPair = shouldPrioritizePairCraft && lowTierPrepCooldown > 0 && pairCooldownBypassAvailable;
      const pairRecoveryReserveBypass = pairMissing && state.bestPlus < 10;
      if (conversionCandidate.reasonCode === "CONV_BLOCK_FORGE_LEVEL") metrics.convBlockedByForgeLevel += 1;
      if (conversionCandidate.reasonCode === "CONV_BLOCK_ORE_SHORTAGE") metrics.convBlockedByOre += 1;
      if (conversionCandidate.reasonCode === "CONV_BLOCK_TARGET_NOT_ACTIVE") metrics.convBlockedByTargetInactive += 1;
      if (conversionCandidate.reasonCode === "CONV_BLOCK_TARGET_ALREADY_MET") metrics.convBlockedByTargetMet += 1;
      if (enhanceCandidate.reasonCode === "ENHANCE_BLOCK_PAIR_NOT_FOUND") metrics.enhanceBlockedByPairMissing += 1;
      if (enhanceCandidate.reasonCode === "ENHANCE_BLOCK_MATERIAL_SHORTAGE") metrics.enhanceBlockedByMaterials += 1;
      if (shouldPrioritizePairCraft) {
        const kind = choosePairRecoveryCraftKind(state, policy, metrics);
        const craftCost = getCraftFinalCost(state.forgeLevel);
        const crafted = craftEquipment(state, kind);
        if (crafted !== state) {
          const correctionCountInWindow = pairRecoveryCorrectionWindow.reduce(
            (count, entry) => count + (entry === "corrected" ? 1 : 0),
            0,
          );
          const allowPairRecoveryCorrection =
            correctionCountInWindow < PAIR_RECOVERY_CORRECTION_MAX_IN_WINDOW &&
            state.bestPlus >= PAIR_RECOVERY_CORRECTION_MIN_TOP_PLUS &&
            pairRecoveryCorrectionCooldown === 0;
          const correctionResult = applyPairRecoveryCraftCorrection(state, crafted, kind, allowPairRecoveryCorrection);
          state = correctionResult.state;
          pairRecoveryCorrectionWindow.push(correctionResult.corrected ? "corrected" : "plain");
          if (pairRecoveryCorrectionWindow.length > PAIR_RECOVERY_CORRECTION_WINDOW) {
            pairRecoveryCorrectionWindow.shift();
          }
          if (correctionResult.corrected && PAIR_RECOVERY_CORRECTION_COOLDOWN_LOOPS > 0) {
            pairRecoveryCorrectionCooldown = PAIR_RECOVERY_CORRECTION_COOLDOWN_LOOPS;
          }
          metrics.logicalTownTimeMs += TOWN_DURATION_MS.craft;
          metrics.ironSpent += craftCost;
          if (kind === "weapon") {
            metrics.craftWeaponCount += 1;
            metrics.consecutiveWeaponCraftCurrent += 1;
            metrics.consecutiveWeaponCraftMax = Math.max(
              metrics.consecutiveWeaponCraftMax,
              metrics.consecutiveWeaponCraftCurrent,
            );
            if (metrics.craftWeaponCount - metrics.craftArmorCount >= ARMOR_LAG_RECOVERY_THRESHOLD) {
              metrics.armorRecoveryRemaining = ARMOR_LAG_RECOVERY_CRAFTS;
            }
            trace.push({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_WEAPON", floor: state.currentFloor });
          } else {
            metrics.craftArmorCount += 1;
            metrics.consecutiveWeaponCraftCurrent = 0;
            if (metrics.armorRecoveryRemaining > 0) {
              metrics.armorRecoveryRemaining -= 1;
            }
            trace.push({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_ARMOR", floor: state.currentFloor });
          }
          metrics.armorLagMax = Math.max(metrics.armorLagMax, metrics.craftWeaponCount - metrics.craftArmorCount);
          if (shouldPrioritizePairCraft && pendingPairRecovery > 0) {
            pairRecoveryDebt = Math.max(0, pairRecoveryDebt - 1);
          }
          if (canBypassCooldownForPair) {
            pairCooldownBypassAvailable = false;
          }
          recordTownAction("pair");
          progressedInTown = true;
          continue;
        }
      }
      if (conversionCandidate.action === "CRAFT_STEEL" && conversionCandidate.eligible) {
        state = {
          ...state,
          materials: {
            ...state.materials,
            ironOre: state.materials.ironOre - ORE_TO_STEEL_COST,
            steelOre: state.materials.steelOre + 3,
          },
        };
        metrics.craftSteelCount += 1;
        metrics.resourceConversionCount += 1;
        metrics.ironSpent += ORE_TO_STEEL_COST;
        metrics.logicalTownTimeMs += TOWN_DURATION_MS.craft;
        stagnationLoops = 0;
        recordTownAction("other");
        trace.push({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_STEEL", floor: state.currentFloor });
        progressedInTown = true;
        continue;
      }
      if (conversionCandidate.action === "CRAFT_MITHRIL" && conversionCandidate.eligible) {
        state = {
          ...state,
          materials: {
            ...state.materials,
            steelOre: state.materials.steelOre - STEEL_TO_MITHRIL_COST,
            mithril: state.materials.mithril + 2,
          },
        };
        metrics.craftMithrilCount += 1;
        metrics.resourceConversionCount += 1;
        metrics.steelSpent += STEEL_TO_MITHRIL_COST;
        metrics.logicalTownTimeMs += TOWN_DURATION_MS.craft;
        stagnationLoops = 0;
        recordTownAction("other");
        trace.push({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_MITHRIL", floor: state.currentFloor });
        progressedInTown = true;
        continue;
      }

      if (
        enhanceCandidate.eligible &&
        enhanceCandidate.pair &&
        !(reserveForUpgrade && enhanceCandidate.pair.targetPlus < 8 && !pairRecoveryReserveBypass && !pairMissingHardBypass) &&
        !((midTierPrepMode && !midTierTargetsMet) && enhanceCandidate.pair.targetPlus < 8 && !pairRecoveryReserveBypass && !pairMissingHardBypass)
      ) {
        const pair = enhanceCandidate.pair;
        const isLowTierEnhance = pair.targetPlus < 6;
        if (
          midTierPrepMode &&
          !midTierTargetsMet &&
          isLowTierEnhance &&
          lowTierPrepCooldown > 0 &&
          !shouldPrioritizePairCraft &&
          !pairMissingHardBypass
        ) {
          continue;
        }
        const costs = getEnhanceMaterialCost(pair.targetPlus);
        const finalRate = getEnhanceFinalSuccessRate(pair.targetPlus, state.enhanceFailStreak);
        const randomResult = nextRandom(rngSeed);
        rngSeed = randomResult.nextSeed;
        const success = randomResult.value < finalRate;
        const tier = getTier(pair.targetPlus);
        metrics.logicalTownTimeMs += TOWN_DURATION_MS.enhance;
        metrics.enhanceAttemptTotal += 1;
        metrics.enhanceExpectedSumTotal += finalRate;
        if (tier === "0to5") metrics.enhanceAttempt0to5 += 1;
        if (tier === "6to9") metrics.enhanceAttempt6to9 += 1;
        if (tier === "10plus") metrics.enhanceAttempt10plus += 1;
        if (tier === "0to5") metrics.enhanceExpectedSum0to5 += finalRate;
        if (tier === "6to9") metrics.enhanceExpectedSum6to9 += finalRate;
        if (tier === "10plus") metrics.enhanceExpectedSum10plus += finalRate;
        metrics.ironSpent += costs.ironOre ?? 0;
        metrics.steelSpent += costs.steelOre ?? 0;
        metrics.mithrilSpent += costs.mithril ?? 0;

        if (success) {
          const nextState = enhanceEquipment(state, pair.targetItemId, pair.materialItemId);
          if (nextState !== state) {
            state = { ...nextState, enhanceFailStreak: 0 };
            metrics.enhanceCountTotal += 1;
            metrics.enhanceSuccessTotal += 1;
            if (tier === "0to5") {
              metrics.enhance0to5 += 1;
              metrics.enhanceSuccess0to5 += 1;
            }
            if (tier === "6to9") {
              metrics.enhance6to9 += 1;
              metrics.enhanceSuccess6to9 += 1;
            }
            if (tier === "10plus") {
              metrics.enhance10plus += 1;
              metrics.enhanceSuccess10plus += 1;
            }
            if (pair.targetPlus === 5 && !metrics.plus6Reached) {
              metrics.plus6Reached = true;
              metrics.plus6ReachedLogicalTimeMs = metrics.logicalExploreTimeMs + metrics.logicalTownTimeMs;
            }
            progressedInTown = true;
          }
        } else {
          const failedState = failEnhanceMaterialDestroyed(state, pair.targetItemId, pair.materialItemId);
          if (failedState !== state) {
            state = { ...failedState, enhanceFailStreak: state.enhanceFailStreak + 1 };
            progressedInTown = true;
          }
        }

        if (midTierPrepMode && !midTierTargetsMet && isLowTierEnhance) {
          lowTierPrepCooldown = 1;
        }
        recordTownAction("other");
        trace.push({
          policy: policy.name,
          sessionId,
          step: ++step,
          actionType: "ENHANCE_ATTEMPT",
          floor: state.currentFloor,
          success,
          plus: pair.targetPlus,
          expectedRate: finalRate,
          durationMs: TOWN_DURATION_MS.enhance,
        });
        continue;
      }

      if (!reserveForUpgrade || pairRecoveryReserveBypass || pairMissingHardBypass) {
        const canCraftForPairRecovery = enhanceCandidate.reasonCode === "ENHANCE_BLOCK_PAIR_NOT_FOUND";
        if (
          midTierPrepMode &&
          (state.materials.steelOre < targets.targetSteel || state.materials.mithril < targets.targetMithril) &&
          !canCraftForPairRecovery &&
          !pairRecoveryReserveBypass &&
          !pairMissingHardBypass
        ) {
          // In mid-tier prep, keep iron for conversion/upgrade rather than low-tier crafting churn.
          continue;
        }
        const kind = shouldPrioritizePairCraft
          ? choosePairRecoveryCraftKind(state, policy, metrics)
          : chooseCraftKind(state, policy, attack, maxHp, metrics);
        if (
          midTierPrepMode &&
          lowTierPrepCooldown > 0 &&
          !canBypassCooldownForPair &&
          !shouldPrioritizePairCraft &&
          !pairMissingHardBypass
        ) {
          continue;
        }
        const craftCost = getCraftFinalCost(state.forgeLevel);
        const crafted = craftEquipment(state, kind);
        if (crafted !== state) {
          if (shouldPrioritizePairCraft) {
            const correctionCountInWindow = pairRecoveryCorrectionWindow.reduce(
              (count, entry) => count + (entry === "corrected" ? 1 : 0),
              0,
            );
            const allowPairRecoveryCorrection =
              correctionCountInWindow < PAIR_RECOVERY_CORRECTION_MAX_IN_WINDOW &&
              state.bestPlus >= PAIR_RECOVERY_CORRECTION_MIN_TOP_PLUS &&
              pairRecoveryCorrectionCooldown === 0;
            const correctionResult = applyPairRecoveryCraftCorrection(state, crafted, kind, allowPairRecoveryCorrection);
            state = correctionResult.state;
            pairRecoveryCorrectionWindow.push(correctionResult.corrected ? "corrected" : "plain");
            if (pairRecoveryCorrectionWindow.length > PAIR_RECOVERY_CORRECTION_WINDOW) {
              pairRecoveryCorrectionWindow.shift();
            }
            if (correctionResult.corrected && PAIR_RECOVERY_CORRECTION_COOLDOWN_LOOPS > 0) {
              pairRecoveryCorrectionCooldown = PAIR_RECOVERY_CORRECTION_COOLDOWN_LOOPS;
            }
          } else {
            state = crafted;
          }
          metrics.logicalTownTimeMs += TOWN_DURATION_MS.craft;
          metrics.ironSpent += craftCost;
          if (kind === "weapon") {
            metrics.craftWeaponCount += 1;
            metrics.consecutiveWeaponCraftCurrent += 1;
            metrics.consecutiveWeaponCraftMax = Math.max(
              metrics.consecutiveWeaponCraftMax,
              metrics.consecutiveWeaponCraftCurrent,
            );
            if (metrics.craftWeaponCount - metrics.craftArmorCount >= ARMOR_LAG_RECOVERY_THRESHOLD) {
              metrics.armorRecoveryRemaining = ARMOR_LAG_RECOVERY_CRAFTS;
            }
            trace.push({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_WEAPON", floor: state.currentFloor });
          } else {
            metrics.craftArmorCount += 1;
            metrics.consecutiveWeaponCraftCurrent = 0;
            if (metrics.armorRecoveryRemaining > 0) {
              metrics.armorRecoveryRemaining -= 1;
            }
            trace.push({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_ARMOR", floor: state.currentFloor });
          }
          metrics.armorLagMax = Math.max(metrics.armorLagMax, metrics.craftWeaponCount - metrics.craftArmorCount);
          if (midTierPrepMode) {
            lowTierPrepCooldown = 1;
          }
          if (shouldPrioritizePairCraft && pendingPairRecovery > 0) {
            pairRecoveryDebt = Math.max(0, pairRecoveryDebt - 1);
          }
          if (canBypassCooldownForPair) {
            pairCooldownBypassAvailable = false;
          }
          recordTownAction(shouldPrioritizePairCraft ? "pair" : "other");
          progressedInTown = true;
          continue;
        }
      }

      if (shouldUpgradeForge(state)) {
        const upgradeCost = state.forgeUpgradeCost;
        const upgraded = upgradeForge(state);
        if (upgraded !== state) {
          state = upgraded;
          metrics.logicalTownTimeMs += TOWN_DURATION_MS.forgeUpgrade;
          metrics.ironSpent += upgradeCost;
          metrics.forgeUpgradeCount += 1;
          recordTownAction("other");
          trace.push({ policy: policy.name, sessionId, step: ++step, actionType: "FORGE_UPGRADE", floor: state.currentFloor });
          progressedInTown = true;
          continue;
        }
      }

      if (state.hp < maxHp) {
        state = { ...state, hp: maxHp, restCount: state.restCount + 1 };
        metrics.restCount += 1;
        metrics.logicalTownTimeMs += TOWN_DURATION_MS.rest;
        recordTownAction("other");
        trace.push({ policy: policy.name, sessionId, step: ++step, actionType: "REST", floor: state.currentFloor, durationMs: TOWN_DURATION_MS.rest });
        progressedInTown = true;
      }
    }

    const attack = calcAttackFromEquipped(state.equippedWeaponItemId, state.equipmentItems);
    const maxHp = getMaxHp(state.equippedArmorItemId, state.equipmentItems);
    const floor = determineFloor(attack, maxHp, policy);
    const firstExploreLogicalTimeMs = metrics.logicalExploreTimeMs + metrics.logicalTownTimeMs;
    if (floor === 1) {
      metrics.floor1Reached = true;
      if (metrics.floor1FirstExploreLogicalTimeMs == null) metrics.floor1FirstExploreLogicalTimeMs = firstExploreLogicalTimeMs;
    }
    if (floor === 2) {
      metrics.floor2Reached = true;
      if (metrics.floor2FirstExploreLogicalTimeMs == null) metrics.floor2FirstExploreLogicalTimeMs = firstExploreLogicalTimeMs;
    }
    if (floor === 3) {
      metrics.floor3Reached = true;
      if (metrics.floor3FirstExploreLogicalTimeMs == null) metrics.floor3FirstExploreLogicalTimeMs = firstExploreLogicalTimeMs;
    }
    const result = simulateExplore({ floor, hp: state.hp, attack });
    const floorExploreDuration = EXPLORE_EVENT_SUM_MS + Math.max(0, result.logs.length - 1) * (EVENT_DURATIONS.STAGE_CLEAR + EVENT_DURATIONS.MONSTER_ENTRY);

    metrics.logicalExploreTimeMs += floorExploreDuration;
    metrics.exploreCount += 1;
    metrics.ironEarned += result.totalReward.ironOre;
    metrics.steelEarned += result.totalReward.steelOre;
    metrics.mithrilEarned += result.totalReward.mithril;

    state = {
      ...state,
      hp: result.finalHp,
      exploreCount: state.exploreCount + 1,
      materials: {
        ironOre: state.materials.ironOre + result.totalReward.ironOre,
        steelOre: state.materials.steelOre + result.totalReward.steelOre,
        mithril: state.materials.mithril + result.totalReward.mithril,
      },
    };

    trace.push({
      policy: policy.name,
      sessionId,
      step: ++step,
      actionType: "EXPLORE",
      floor,
      durationMs: floorExploreDuration,
      endReason: result.endReason,
    });
    if (result.endReason === "FLOOR_CLEARED") {
      const clearLogicalTimeMs = metrics.logicalExploreTimeMs + metrics.logicalTownTimeMs;
      if (floor === 1 && metrics.floor1ClearLogicalTimeMs == null) metrics.floor1ClearLogicalTimeMs = clearLogicalTimeMs;
      if (floor === 2 && metrics.floor2ClearLogicalTimeMs == null) metrics.floor2ClearLogicalTimeMs = clearLogicalTimeMs;
      if (floor === 3 && metrics.floor3ClearLogicalTimeMs == null) metrics.floor3ClearLogicalTimeMs = clearLogicalTimeMs;
    }

    for (const log of result.logs) {
      trace.push({
        policy: policy.name,
        sessionId,
        step: ++step,
        actionType: "EXPLORE_STAGE",
        floor,
        stage: log.stage,
        damageTaken: log.damageTaken,
      });
    }

    if (floor === 3 && result.endReason === "FLOOR_CLEARED") {
      metrics.completed = true;
      break;
    }

    if (metrics.logicalExploreTimeMs + metrics.logicalTownTimeMs > LOGICAL_PLAY_TIME_CAP_MS) {
      metrics.abortedByLoopCap = true;
      break;
    }

    const hasMeaningfulProgress =
      state.bestPlus > bestMeaningfulProgress.bestPlus ||
      state.forgeLevel > bestMeaningfulProgress.forgeLevel ||
      metrics.resourceConversionCount > bestMeaningfulProgress.conversionCount;
    if (hasMeaningfulProgress) {
      bestMeaningfulProgress = {
        bestPlus: state.bestPlus,
        forgeLevel: state.forgeLevel,
        conversionCount: metrics.resourceConversionCount,
      };
      stagnationLoops = 0;
    } else {
      stagnationLoops += 1;
      if (stagnationLoops >= STAGNATION_LOOP_CAP) {
        metrics.abortedByStagnation = true;
        break;
      }
    }
  }

  if (!metrics.completed && !metrics.abortedByStagnation && !metrics.abortedByLoopCap) {
    metrics.abortedByLoopCap = true;
  }

  state = equipBestItems(state);
  return { summary: toSummaryRow(policy.name, sessionId, seed, metrics, state), trace };
};

export const runBalanceSessions = (config: BalanceRunConfig = {}): BalanceRunReport => {
  const normalized = normalizeConfig(config);
  const policies = getPolicies(normalized.preset);
  const summaryRows: BalanceSessionSummaryRow[] = [];
  const traceRows: BalanceSessionTraceRow[] = [];

  let globalSessionIndex = 0;
  for (const policy of policies) {
    for (let i = 0; i < normalized.sessionsPerPolicy; i += 1) {
      const sessionId = `${policy.name}-${String(i + 1).padStart(3, "0")}`;
      const seed = normalized.seedBase + globalSessionIndex;
      const { summary, trace } = runSingleSession(
        policy,
        sessionId,
        seed,
        normalized.maxLoops,
        normalized.initialStateOverride,
      );
      summaryRows.push(summary);
      traceRows.push(...trace);
      globalSessionIndex += 1;
    }
  }

  return {
    config: normalized,
    summaryRows,
    traceRows,
  };
};

