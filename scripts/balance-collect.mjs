#!/usr/bin/env node

import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const INITIAL_HP = 10;
const MAX_FORGE_LEVEL = 12;
const BASE_CRAFT_COST = 8;
const MIN_CRAFT_COST = 5;
const BASE_FORGE_UPGRADE_COST = 36;

const EVENT_DURATIONS = {
  STAGE_ENTRY: 700,
  MONSTER_ENTRY: 560,
  ATTACK_SWING: 450,
  HIT_REACT: 500,
  DEATH_FALL: 800,
  STAGE_CLEAR: 500,
  EXPLORE_END: 650,
};

const TOWN_DURATION_MS = { craft: 400, enhance: 400, forgeUpgrade: 400, rest: 1000 };
const EXPLORE_EVENT_SUM_MS = Object.values(EVENT_DURATIONS).reduce((a, b) => a + b, 0);
const ORE_TO_STEEL_COST = 45;
const STEEL_TO_MITHRIL_COST = 50;
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
const LOGICAL_PLAY_TIME_CAP_MS = 1800000;
const MIN_TRACKED_PLUS = 1;
const MAX_TRACKED_PLUS = 12;

const STRATEGY_PRESETS = {
  conservative: { name: "conservative", floor2: { attack: 4, maxHp: 16 }, floor3: { attack: 8, maxHp: 24 } },
  balanced: { name: "balanced", floor2: { attack: 3, maxHp: 14 }, floor3: { attack: 8, maxHp: 24 } },
  aggressive: { name: "aggressive", floor2: { attack: 2, maxHp: 12 }, floor3: { attack: 8, maxHp: 22 } },
};

const MODULUS = 2147483647;
const MULTIPLIER = 48271;
const normalizeSeed = (seed) => {
  const normalized = Math.abs(Math.trunc(seed)) % MODULUS;
  return normalized === 0 ? 1 : normalized;
};
const nextRandom = (seed) => {
  const current = normalizeSeed(seed);
  const nextSeed = (current * MULTIPLIER) % MODULUS;
  return { value: nextSeed / MODULUS, nextSeed };
};

const getCraftCost = (forgeLevel) => {
  const effective = Math.max(0, Math.min(MAX_FORGE_LEVEL, Math.floor(forgeLevel)));
  return Math.max(MIN_CRAFT_COST, BASE_CRAFT_COST - Math.floor((effective + 1) / 2));
};
const getCraftedPlusByForgeLevel = (forgeLevel) => {
  const level = Math.max(0, Math.floor(forgeLevel));
  if (level >= 12) return 5;
  if (level >= 10) return 4;
  if (level >= 8) return 3;
  if (level >= 6) return 2;
  if (level >= 4) return 1;
  if (level >= 2) return 0;
  return 0;
};
const getCraftFinalCost = (forgeLevel) => {
  const baseCost = getCraftCost(forgeLevel);
  const craftedPlus = getCraftedPlusByForgeLevel(forgeLevel);
  return Math.ceil(baseCost * (1 + craftedPlus * 0.18));
};
const canUpgradeForge = (forgeLevel) => forgeLevel < MAX_FORGE_LEVEL;
const getNextForgeUpgradeCost = (cost) => Math.ceil(cost * 1.35);
const getRequiredForgeLevelForEnhance = (plus) => {
  const n = Math.max(0, Math.floor(plus));
  if (n >= 10) return 5;
  if (n >= 6) return 3;
  return 0;
};
const getEnhanceMaterialCost = (plus) => {
  const n = Math.max(0, Math.floor(plus));
  if (n >= 10) return { ironOre: n, steelOre: 0, mithril: n };
  if (n >= 8) return { ironOre: n, steelOre: Math.max(4, n - 3), mithril: 1 };
  if (n >= 6) return { ironOre: n, steelOre: Math.max(4, n - 2), mithril: 1 };
  return { ironOre: n, steelOre: 0, mithril: 0 };
};
const getEnhanceBaseSuccessRate = (plus) => {
  const n = Math.max(0, Math.floor(plus));
  if (n <= 5) return Math.max(0.75, 0.95 - n * 0.04);
  if (n <= 9) return Math.max(0.5, 0.7 - (n - 6) * 0.07);
  return Math.max(0.3, 0.4 - (n - 10) * 0.02);
};
const getEnhanceBonusRate = (failStreak) => Math.min(0.24, Math.max(0, Math.floor(failStreak)) * 0.03);
const getEnhanceFinalSuccessRate = (plus, failStreak) => Math.min(0.95, getEnhanceBaseSuccessRate(plus) + getEnhanceBonusRate(failStreak));

const getStageTier = (stage) => (stage <= 3 ? 1 : stage <= 6 ? 2 : stage <= 9 ? 3 : 4);
const getMonsterStats = (floor, stage) => {
  const tier = getStageTier(stage);
  if (floor === 1) {
    if (tier === 1) return { hp: 5, attack: 1 };
    if (tier === 2) return { hp: 7, attack: 2 };
    if (tier === 3) return { hp: 9, attack: 3 };
    return { hp: 20, attack: 5 };
  }
  if (floor === 2) {
    if (tier === 1) return { hp: 9, attack: 2 };
    if (tier === 2) return { hp: 11, attack: 3 };
    if (tier === 3) return { hp: 13, attack: 4 };
    return { hp: 26, attack: 6 };
  }
  if (tier === 1) return { hp: 13, attack: 3 };
  if (tier === 2) return { hp: 15, attack: 4 };
  if (tier === 3) return { hp: 17, attack: 5 };
  return { hp: 32, attack: 6 };
};
const getStageReward = (floor, stage) => {
  const tier = getStageTier(stage);
  const withIronBoost = (reward) => ({ ...reward, ironOre: Math.ceil(reward.ironOre * 1.1) });
  const withFloor2MidBoost = (reward) => ({
    ...reward,
    ironOre: Math.ceil(reward.ironOre * 1.2),
    steelOre: Math.ceil(reward.steelOre * 1.2),
  });
  const withHighTierBoost = (reward) => ({
    ironOre: Math.ceil(reward.ironOre * 1.6),
    steelOre: Math.ceil(reward.steelOre * 1.6),
    mithril: Math.ceil(reward.mithril * 1.6),
  });
  if (floor === 1) {
    if (tier === 1) return withIronBoost({ ironOre: 1, steelOre: 0, mithril: 0 });
    if (tier === 2) return withIronBoost({ ironOre: 2, steelOre: 0, mithril: 0 });
    if (tier === 3) return withIronBoost({ ironOre: 3, steelOre: 0, mithril: 0 });
    return withIronBoost({ ironOre: 5, steelOre: 0, mithril: 0 });
  }
  if (floor === 2) {
    if (tier === 1) return withIronBoost({ ironOre: 3, steelOre: 1, mithril: 0 });
    if (tier === 2) return withFloor2MidBoost(withIronBoost({ ironOre: 4, steelOre: 1, mithril: 0 }));
    if (tier === 3) return withFloor2MidBoost(withIronBoost({ ironOre: 5, steelOre: 2, mithril: 0 }));
    return withHighTierBoost(withIronBoost({ ironOre: 6, steelOre: 2, mithril: 0 }));
  }
  if (tier === 1) return withHighTierBoost(withIronBoost({ ironOre: 3, steelOre: 2, mithril: 2 }));
  if (tier === 2) return withHighTierBoost(withIronBoost({ ironOre: 4, steelOre: 3, mithril: 2 }));
  if (tier === 3) return withHighTierBoost(withIronBoost({ ironOre: 5, steelOre: 4, mithril: 3 }));
  return withHighTierBoost(withIronBoost({ ironOre: 8, steelOre: 5, mithril: 4 }));
};

const simulateExplore = ({ floor, hp, attack }) => {
  let currentHp = Math.max(0, hp);
  const currentAttack = Math.max(1, attack);
  const logs = [];
  const totalReward = { ironOre: 0, steelOre: 0, mithril: 0 };
  for (let stage = 1; stage <= 10; stage += 1) {
    const monster = getMonsterStats(floor, stage);
    const reward = getStageReward(floor, stage);
    const hits = Math.ceil(monster.hp / currentAttack);
    const damageTaken = Math.max(0, hits - 1) * monster.attack;
    currentHp = Math.max(0, currentHp - damageTaken);
    totalReward.ironOre += reward.ironOre;
    totalReward.steelOre += reward.steelOre;
    totalReward.mithril += reward.mithril;
    logs.push({ stage, damageTaken, reward, hpAfter: currentHp });
    if (currentHp <= 0) {
      return { logs, totalReward, finalHp: 0, clearedStage: stage, endReason: "DEFEATED" };
    }
  }
  return { logs, totalReward, finalHp: currentHp, clearedStage: 10, endReason: "FLOOR_CLEARED" };
};

const getBestItemIdByKind = (items, kind) => {
  const target = items.filter((item) => item.kind === kind).sort((a, b) => b.plus - a.plus || a.id.localeCompare(b.id))[0];
  return target ? target.id : null;
};
const equipBestItems = (state) => ({ ...state, equippedWeaponItemId: getBestItemIdByKind(state.equipmentItems, "weapon"), equippedArmorItemId: getBestItemIdByKind(state.equipmentItems, "armor") });
const calcBestPlus = (items) => items.reduce((max, item) => (item.plus > max ? item.plus : max), 0);
const calcAttack = (state) => {
  if (!state.equippedWeaponItemId) return 1;
  const weapon = state.equipmentItems.find((item) => item.id === state.equippedWeaponItemId && item.kind === "weapon");
  return 1 + (weapon ? weapon.plus : 0);
};
const calcMaxHp = (state) => {
  if (!state.equippedArmorItemId) return INITIAL_HP;
  const armor = state.equipmentItems.find((item) => item.id === state.equippedArmorItemId && item.kind === "armor");
  return INITIAL_HP + (armor ? armor.plus * 5 : 0);
};
const determineFloor = (attack, maxHp, policy) => {
  if (attack >= policy.floor3.attack && maxHp >= policy.floor3.maxHp) return 3;
  if (attack >= policy.floor2.attack && maxHp >= policy.floor2.maxHp) return 2;
  return 1;
};
const chooseCraftKind = (state, policy, attack, maxHp, metrics) => {
  if (metrics.armorRecoveryRemaining > 0) return "armor";
  const ratioCap = policy.name === "aggressive" ? WEAPON_ARMOR_RATIO_CAP_AGGRESSIVE : WEAPON_ARMOR_RATIO_CAP_CONSERVATIVE;
  const ratioFloor = WEAPON_ARMOR_RATIO_FLOOR;
  if (metrics.consecutiveWeaponCraftCurrent >= CONSECUTIVE_WEAPON_CRAFT_CAP) return "armor";
  if (metrics.craftWeaponCount === 0 && metrics.craftArmorCount >= 3) return "weapon";
  if (metrics.craftArmorCount === 0 && metrics.craftWeaponCount >= 3) return "armor";
  if (metrics.craftWeaponCount > 0 && metrics.craftArmorCount > metrics.craftWeaponCount / ratioFloor) return "weapon";
  if (metrics.craftArmorCount > 0 && metrics.craftWeaponCount > metrics.craftArmorCount * ratioCap) return "armor";
  const target = attack >= policy.floor2.attack && maxHp >= policy.floor2.maxHp ? policy.floor3 : policy.floor2;
  const attackGap = Math.max(0, target.attack - attack);
  const hpGap = Math.max(0, target.maxHp - maxHp);
  if (attackGap > hpGap) return "weapon";
  if (hpGap > attackGap) return "armor";
  const weaponCount = state.equipmentItems.filter((item) => item.kind === "weapon").length;
  const armorCount = state.equipmentItems.filter((item) => item.kind === "armor").length;
  return weaponCount <= armorCount ? "weapon" : "armor";
};
const choosePairRecoveryCraftKind = (state, policy, metrics) => {
  const ratioCap = policy.name === "aggressive" ? WEAPON_ARMOR_RATIO_CAP_AGGRESSIVE : WEAPON_ARMOR_RATIO_CAP_CONSERVATIVE;
  const ratioFloor = WEAPON_ARMOR_RATIO_FLOOR;
  if (metrics.craftWeaponCount === 0 && metrics.craftArmorCount >= 3) return "weapon";
  if (metrics.craftArmorCount === 0 && metrics.craftWeaponCount >= 3) return "armor";
  if (metrics.craftWeaponCount > 0 && metrics.craftArmorCount > metrics.craftWeaponCount / ratioFloor) return "weapon";
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
const getKindPlusCount = (state, kind, plus) =>
  state.equipmentItems.filter((item) => item.kind === kind && item.plus === plus).length;
const resolvePairRecoveryTargetPlus = (state, kind) => {
  const topPlus = state.bestPlus;
  if (getKindPlusCount(state, kind, topPlus) === 1) return topPlus;
  if (topPlus > 0 && getKindPlusCount(state, kind, topPlus - 1) === 1) return topPlus - 1;
  return null;
};
const createCraftedItems = ({ state, kind, craftCount, defaultPlus, pairRecovery, allowCorrection }) => {
  let corrected = false;
  const targetPlus = pairRecovery && allowCorrection ? resolvePairRecoveryTargetPlus(state, kind) : null;
  const items = Array.from({ length: craftCount }, (_, index) => {
    let plus = defaultPlus;
    if (pairRecovery && !corrected && targetPlus != null) {
      plus = targetPlus;
      corrected = true;
    }
    return {
      id: `i-${state.nextItemId + index}`,
      kind,
      plus,
    };
  });
  return { items, corrected };
};
const chooseEnhancePair = (state) => {
  const pairs = new Map();
  for (const item of state.equipmentItems) {
    const key = `${item.kind}:${item.plus}`;
    const group = pairs.get(key) ?? [];
    group.push(item);
    pairs.set(key, group);
  }
  const keys = Array.from(pairs.keys()).sort((a, b) => Number(b.split(":")[1]) - Number(a.split(":")[1]));
  for (const key of keys) {
    const group = pairs.get(key);
    if (!group || group.length < 2) continue;
    const target = group[0];
    const material = group[1];
    const req = getRequiredForgeLevelForEnhance(target.plus);
    if (state.forgeLevel < req) continue;
    const cost = getEnhanceMaterialCost(target.plus);
    if (state.materials.ironOre < cost.ironOre || state.materials.steelOre < cost.steelOre || state.materials.mithril < cost.mithril) continue;
    return { target, material };
  }
  return null;
};
const shouldUpgradeForge = (state) => {
  if (!canUpgradeForge(state.forgeLevel) || state.materials.ironOre < state.forgeUpgradeCost) return false;
  const currentNeed = getRequiredForgeLevelForEnhance(state.bestPlus);
  const nextTierNeed = state.bestPlus >= 4 ? 3 : 0;
  return state.forgeLevel < Math.max(currentNeed, nextTierNeed);
};
const shouldReserveForUpgrade = (state) => {
  if (!canUpgradeForge(state.forgeLevel)) return false;
  const required = Math.max(getRequiredForgeLevelForEnhance(state.bestPlus), state.bestPlus >= 4 ? 3 : 0);
  return state.forgeLevel < required && state.materials.ironOre < state.forgeUpgradeCost;
};
const shouldPrioritizeMidTierUpgrade = (state) => state.bestPlus >= 4 && state.forgeLevel < 3;
const getTier = (plus) => (plus >= 10 ? "10plus" : plus >= 6 ? "6to9" : "0to5");
const getTierResourceTargets = (state) => ({
  targetSteel: state.bestPlus >= 4 && state.forgeLevel >= 2 ? Math.max(5, state.forgeLevel + 1) : 0,
  targetMithril: state.bestPlus >= 6 && state.forgeLevel >= 3 ? Math.max(3, state.forgeLevel - 1) : 0,
});
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isMidTierPrepMode = (state) => state.bestPlus >= 5 && state.forgeLevel >= 3;
const evaluateConversionCandidate = (
  state,
  conversionModeActive,
  steelConversionCount,
  mithrilConversionCount,
) => {
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
    return { eligible: false, action: null, reasonCode: "CONV_BLOCK_TARGET_NOT_ACTIVE", nextConversionModeActive: false };
  }

  // Bootstrap: once steel conversion is unlocked, force at least one successful steel conversion per session.
  const needsBootstrapSteel = steelGateActive && steelConversionCount === 0;
  if (needsBootstrapSteel) {
    if (state.materials.ironOre < ORE_TO_STEEL_COST) {
      return { eligible: false, action: null, reasonCode: "CONV_BLOCK_ORE_SHORTAGE", nextConversionModeActive: true };
    }
    return { eligible: true, action: "CRAFT_STEEL", reasonCode: null, nextConversionModeActive: true };
  }

  const needsBootstrapMithril = mithrilGateActive && mithrilConversionCount === 0;
  if (needsBootstrapMithril) {
    if (state.materials.steelOre >= STEEL_TO_MITHRIL_COST) {
      return { eligible: true, action: "CRAFT_MITHRIL", reasonCode: null, nextConversionModeActive: true };
    }
    if (steelGateActive && state.materials.ironOre >= ORE_TO_STEEL_COST) {
      return { eligible: true, action: "CRAFT_STEEL", reasonCode: null, nextConversionModeActive: true };
    }
    return { eligible: false, action: null, reasonCode: "CONV_BLOCK_ORE_SHORTAGE", nextConversionModeActive: true };
  }

  const needOn =
    (steelGateActive && state.materials.steelOre < steelNeedOn) ||
    (mithrilGateActive && state.materials.mithril < mithrilNeedOn);
  const offSatisfied =
    (!steelGateActive || state.materials.steelOre >= steelNeedOff) &&
    (!mithrilGateActive || state.materials.mithril >= mithrilNeedOff);
  const nextConversionModeActive = conversionModeActive ? !offSatisfied : needOn;
  if (!nextConversionModeActive) {
    return { eligible: false, action: null, reasonCode: "CONV_BLOCK_TARGET_ALREADY_MET", nextConversionModeActive };
  }

  const needMithril = mithrilGateActive && state.materials.mithril < mithrilNeedOff;
  if (needMithril) {
    if (state.forgeLevel < 3) return { eligible: false, action: null, reasonCode: "CONV_BLOCK_FORGE_LEVEL", nextConversionModeActive };
    if (state.materials.steelOre < STEEL_TO_MITHRIL_COST) return { eligible: false, action: null, reasonCode: "CONV_BLOCK_ORE_SHORTAGE", nextConversionModeActive };
    return { eligible: true, action: "CRAFT_MITHRIL", reasonCode: null, nextConversionModeActive };
  }

  const needSteel = steelGateActive && state.materials.steelOre < steelNeedOff;
  if (needSteel) {
    if (state.forgeLevel < 2) return { eligible: false, action: null, reasonCode: "CONV_BLOCK_FORGE_LEVEL", nextConversionModeActive };
    if (state.materials.ironOre < ORE_TO_STEEL_COST) return { eligible: false, action: null, reasonCode: "CONV_BLOCK_ORE_SHORTAGE", nextConversionModeActive };
    return { eligible: true, action: "CRAFT_STEEL", reasonCode: null, nextConversionModeActive };
  }

  return { eligible: false, action: null, reasonCode: "CONV_BLOCK_TARGET_ALREADY_MET", nextConversionModeActive };
};

const evaluateEnhanceCandidate = (state) => {
  const pairs = new Map();
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
    const req = getRequiredForgeLevelForEnhance(target.plus);
    if (state.forgeLevel < req) continue;
    hasUsablePair = true;
    const cost = getEnhanceMaterialCost(target.plus);
    if (state.materials.ironOre < cost.ironOre || state.materials.steelOre < cost.steelOre || state.materials.mithril < cost.mithril) {
      hasMaterialShortagePair = true;
      continue;
    }
    return { eligible: true, reasonCode: null, pair: { target, material } };
  }

  if (!hasUsablePair) return { eligible: false, reasonCode: "ENHANCE_BLOCK_PAIR_NOT_FOUND", pair: null };
  if (hasMaterialShortagePair) return { eligible: false, reasonCode: "ENHANCE_BLOCK_MATERIAL_SHORTAGE", pair: null };
  return { eligible: false, reasonCode: "ENHANCE_BLOCK_PAIR_NOT_FOUND", pair: null };
};

const createPlusMilestones = () => {
  const milestones = {};
  for (let plus = MIN_TRACKED_PLUS; plus <= MAX_TRACKED_PLUS; plus += 1) {
    milestones[`plus${plus}ReachedLogicalTimeMs`] = null;
  }
  return milestones;
};

const recordPlusMilestones = (metrics, state) => {
  const logicalTimeMs = metrics.logicalExploreTimeMs + metrics.logicalTownTimeMs;
  for (let plus = MIN_TRACKED_PLUS; plus <= MAX_TRACKED_PLUS; plus += 1) {
    const key = `plus${plus}ReachedLogicalTimeMs`;
    if (state.bestPlus >= plus && metrics[key] == null) {
      metrics[key] = logicalTimeMs;
    }
  }
};

const toPlusMilestoneSummary = (metrics) => {
  const summary = {};
  for (let plus = MIN_TRACKED_PLUS; plus <= MAX_TRACKED_PLUS; plus += 1) {
    const key = `plus${plus}ReachedLogicalTimeMs`;
    summary[key] = metrics[key] ?? "";
  }
  return summary;
};

const toDecisionSnapshot = (state, attack, maxHp, reserveForUpgrade, midTierPrepMode) => ({
  bestPlus: state.bestPlus,
  forgeLevel: state.forgeLevel,
  hp: state.hp,
  attack,
  maxHp,
  ironOre: state.materials.ironOre,
  steelOre: state.materials.steelOre,
  mithril: state.materials.mithril,
  reserveForUpgrade,
  midTierPrepMode,
});

const parseArgs = (argv) => {
  const args = { preset: "all", sessions: 100, maxLoops: 10000, seedBase: 20260309, outDir: "reports/balance", initialIron: 0, initialUnlockedFloor: 1 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (!next) continue;
    if (arg === "--preset") { args.preset = next; i += 1; continue; }
    if (arg === "--sessions") { args.sessions = Number(next); i += 1; continue; }
    if (arg === "--maxLoops") { args.maxLoops = Number(next); i += 1; continue; }
    if (arg === "--seedBase") { args.seedBase = Number(next); i += 1; continue; }
    if (arg === "--outDir") { args.outDir = next; i += 1; continue; }
    if (arg === "--initial-iron") { args.initialIron = Number(next); i += 1; continue; }
    if (arg === "--initial-unlocked-floor") { args.initialUnlockedFloor = Number(next); i += 1; }
  }
  return args;
};

const policiesFromPreset = (preset) => {
  if (preset === "all") return [STRATEGY_PRESETS.conservative, STRATEGY_PRESETS.balanced, STRATEGY_PRESETS.aggressive];
  return [STRATEGY_PRESETS[preset] ?? STRATEGY_PRESETS.balanced];
};

const runSingleSession = (policy, sessionId, seed, maxLoops, initialIron, initialUnlockedFloor, onTrace, onDecisionTrace) => {
  let step = 0;
  let rngSeed = seed;
  const emitTrace = (row) => {
    if (typeof onTrace === "function") {
      onTrace(row);
    }
  };
  const emitDecisionTrace = (row) => {
    if (typeof onDecisionTrace === "function") {
      onDecisionTrace(row);
    }
  };
  const metrics = {
    completed: false,
    abortedByLoopCap: false,
    abortedByStagnation: false,
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
    ...createPlusMilestones(),
  };

  let state = equipBestItems({
    materials: { ironOre: initialIron, steelOre: 0, mithril: 0 },
    exploreCount: 0,
    restCount: 0,
    equipmentItems: [{ id: "i-1", kind: "weapon", plus: 0 }],
    bestPlus: 0,
    seed,
    hp: INITIAL_HP,
    equippedWeaponItemId: null,
    equippedArmorItemId: null,
    nextItemId: 2,
    forgeLevel: 0,
    forgeUpgradeCost: BASE_FORGE_UPGRADE_COST,
    unlockedFloor: initialUnlockedFloor,
    currentFloor: initialUnlockedFloor,
    currentStage: 0,
    isExploring: false,
    enhanceFailStreak: 0,
  });
  let stagnationLoops = 0;
  let lowTierPrepCooldown = 0;
  let pairRecoveryWindow = [];
  let pairRecoveryCorrectionWindow = [];
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
      recordPlusMilestones(metrics, state);
      const attack = calcAttack(state);
      const maxHp = calcMaxHp(state);
      const reserveForUpgrade = shouldReserveForUpgrade(state);
      const midTierPrepMode = isMidTierPrepMode(state);
      const targets = getTierResourceTargets(state);
      const midTierTargetsMet =
        state.materials.steelOre >= targets.targetSteel && state.materials.mithril >= targets.targetMithril;
      if (lowTierPrepCooldown > 0) lowTierPrepCooldown -= 1;
      if (pairRecoveryCorrectionCooldown > 0) pairRecoveryCorrectionCooldown -= 1;
      const canUpgradeNow = shouldUpgradeForge(state);
      const forceMidTierUpgrade = shouldPrioritizeMidTierUpgrade(state) && canUpgradeNow;
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
      const recordTownAction = (entry) => {
        pairRecoveryWindow.push(entry);
        if (pairRecoveryWindow.length > PAIR_RECOVERY_WINDOW) {
          pairRecoveryWindow.shift();
        }
      };
      const canCraftForPairRecovery = enhanceCandidate.reasonCode === "ENHANCE_BLOCK_PAIR_NOT_FOUND";
      const craftBlockedByMidPrep = midTierPrepMode && !midTierTargetsMet && !canCraftForPairRecovery && !pairMissingHardBypass;
      const craftBlockedByReserve = reserveForUpgrade && !pairRecoveryReserveBypass && !pairMissingHardBypass;
      const craftAllowed =
        !craftBlockedByReserve &&
        !(craftBlockedByMidPrep && !pairRecoveryReserveBypass) &&
        !(midTierPrepMode && lowTierPrepCooldown > 0 && !canBypassCooldownForPair && !shouldPrioritizePairCraft && !pairMissingHardBypass);
      const candidates = [
        {
          candidate: "FORGE_UPGRADE",
          eligible: forceMidTierUpgrade || (canUpgradeNow && !forceMidTierUpgrade),
          reasonCode: forceMidTierUpgrade || canUpgradeNow ? null : "FORGE_BLOCK_NOT_REQUIRED_OR_ORE_SHORTAGE",
        },
        {
          candidate: "MATERIAL_CONVERSION",
          eligible: conversionCandidate.eligible,
          reasonCode: conversionCandidate.reasonCode,
        },
        {
          candidate: "ENHANCE",
          eligible:
            enhanceCandidate.eligible &&
            !(reserveForUpgrade && enhanceCandidate.pair?.target.plus < 8 && !pairRecoveryReserveBypass && !pairMissingHardBypass) &&
            !((midTierPrepMode && !midTierTargetsMet) && enhanceCandidate.pair?.target.plus < 8 && !pairRecoveryReserveBypass && !pairMissingHardBypass) &&
            !(
              midTierPrepMode &&
              !midTierTargetsMet &&
              (enhanceCandidate.pair?.target.plus ?? 0) < 6 &&
              lowTierPrepCooldown > 0 &&
              !shouldPrioritizePairCraft &&
              !pairMissingHardBypass
            ),
          reasonCode:
            !enhanceCandidate.eligible
              ? enhanceCandidate.reasonCode
              : (reserveForUpgrade && enhanceCandidate.pair?.target.plus < 8 && !pairRecoveryReserveBypass && !pairMissingHardBypass)
                ? "ENHANCE_BLOCK_RESERVE_FOR_UPGRADE"
                : ((midTierPrepMode && !midTierTargetsMet) && (enhanceCandidate.pair?.target.plus ?? 0) < 8 && !pairRecoveryReserveBypass && !pairMissingHardBypass)
                  ? "ENHANCE_BLOCK_MID_PREP_TARGET_UNMET"
                  : (
                      midTierPrepMode &&
                      !midTierTargetsMet &&
                      (enhanceCandidate.pair?.target.plus ?? 0) < 6 &&
                      lowTierPrepCooldown > 0 &&
                      !shouldPrioritizePairCraft &&
                      !pairMissingHardBypass
                    )
                    ? "ENHANCE_BLOCK_LOW_TIER_COOLDOWN"
                    : null,
        },
        {
          candidate: "CRAFT",
          eligible: craftAllowed,
          reasonCode:
            craftBlockedByReserve
              ? "CRAFT_BLOCK_RESERVE_FOR_UPGRADE"
              : craftBlockedByMidPrep
                ? "CRAFT_BLOCK_MID_PREP_TARGET_UNMET"
                : midTierPrepMode && lowTierPrepCooldown > 0
                  ? "CRAFT_BLOCK_LOW_TIER_COOLDOWN"
                  : null,
        },
        {
          candidate: "REST",
          eligible: state.hp < maxHp,
          reasonCode: state.hp < maxHp ? null : "REST_BLOCK_HP_FULL",
        },
      ];
      let selectedAction = "NONE";

      if (forceMidTierUpgrade) {
        const upgradeCost = state.forgeUpgradeCost;
        state = {
          ...state,
          materials: { ...state.materials, ironOre: state.materials.ironOre - upgradeCost },
          forgeLevel: state.forgeLevel + 1,
          forgeUpgradeCost: canUpgradeForge(state.forgeLevel + 1) ? getNextForgeUpgradeCost(upgradeCost) : upgradeCost,
        };
        metrics.logicalTownTimeMs += TOWN_DURATION_MS.forgeUpgrade;
        metrics.ironSpent += upgradeCost;
        metrics.forgeUpgradeCount += 1;
        recordTownAction("other");
        emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "FORGE_UPGRADE", floor: state.currentFloor });
        selectedAction = "FORGE_UPGRADE";
        emitDecisionTrace({
          policy: policy.name,
          sessionId,
          loop,
          stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
          candidates,
          selectedAction,
        });
        progressedInTown = true;
        continue;
      }
      if (midTierPrepMode && canUpgradeNow) {
        const upgradeCost = state.forgeUpgradeCost;
        state = {
          ...state,
          materials: { ...state.materials, ironOre: state.materials.ironOre - upgradeCost },
          forgeLevel: state.forgeLevel + 1,
          forgeUpgradeCost: canUpgradeForge(state.forgeLevel + 1) ? getNextForgeUpgradeCost(upgradeCost) : upgradeCost,
        };
        metrics.logicalTownTimeMs += TOWN_DURATION_MS.forgeUpgrade;
        metrics.ironSpent += upgradeCost;
        metrics.forgeUpgradeCount += 1;
        recordTownAction("other");
        emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "FORGE_UPGRADE", floor: state.currentFloor });
        selectedAction = "FORGE_UPGRADE";
        emitDecisionTrace({
          policy: policy.name,
          sessionId,
          loop,
          stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
          candidates,
          selectedAction,
        });
        progressedInTown = true;
        continue;
      }
      if (conversionCandidate.reasonCode === "CONV_BLOCK_FORGE_LEVEL") metrics.convBlockedByForgeLevel += 1;
      if (conversionCandidate.reasonCode === "CONV_BLOCK_ORE_SHORTAGE") metrics.convBlockedByOre += 1;
      if (conversionCandidate.reasonCode === "CONV_BLOCK_TARGET_NOT_ACTIVE") metrics.convBlockedByTargetInactive += 1;
      if (conversionCandidate.reasonCode === "CONV_BLOCK_TARGET_ALREADY_MET") metrics.convBlockedByTargetMet += 1;
      if (enhanceCandidate.reasonCode === "ENHANCE_BLOCK_PAIR_NOT_FOUND") metrics.enhanceBlockedByPairMissing += 1;
      if (enhanceCandidate.reasonCode === "ENHANCE_BLOCK_MATERIAL_SHORTAGE") metrics.enhanceBlockedByMaterials += 1;
      if (shouldPrioritizePairCraft) {
        const kind = choosePairRecoveryCraftKind(state, policy, metrics);
        const cost = getCraftFinalCost(state.forgeLevel);
        if (state.materials.ironOre >= cost) {
          const craftedPlus = getCraftedPlusByForgeLevel(state.forgeLevel);
          const craftCount = state.forgeLevel >= 8 ? 2 : 1;
          const correctionCountInWindow = pairRecoveryCorrectionWindow.reduce(
            (count, entry) => count + (entry === "corrected" ? 1 : 0),
            0,
          );
          const allowPairRecoveryCorrection =
            correctionCountInWindow < PAIR_RECOVERY_CORRECTION_MAX_IN_WINDOW &&
            state.bestPlus >= PAIR_RECOVERY_CORRECTION_MIN_TOP_PLUS &&
            pairRecoveryCorrectionCooldown === 0;
          const crafted = createCraftedItems({
            state,
            kind,
            craftCount,
            defaultPlus: craftedPlus,
            pairRecovery: true,
            allowCorrection: allowPairRecoveryCorrection,
          });
          const equipmentItems = [...state.equipmentItems, ...crafted.items];
          pairRecoveryCorrectionWindow.push(crafted.corrected ? "corrected" : "plain");
          if (pairRecoveryCorrectionWindow.length > PAIR_RECOVERY_CORRECTION_WINDOW) {
            pairRecoveryCorrectionWindow.shift();
          }
          if (crafted.corrected && PAIR_RECOVERY_CORRECTION_COOLDOWN_LOOPS > 0) {
            pairRecoveryCorrectionCooldown = PAIR_RECOVERY_CORRECTION_COOLDOWN_LOOPS;
          }
          state = { ...state, materials: { ...state.materials, ironOre: state.materials.ironOre - cost }, equipmentItems, bestPlus: calcBestPlus(equipmentItems), nextItemId: state.nextItemId + craftCount };
          metrics.logicalTownTimeMs += TOWN_DURATION_MS.craft;
          metrics.ironSpent += cost;
          if (kind === "weapon") {
            metrics.craftWeaponCount += 1;
            metrics.consecutiveWeaponCraftCurrent += 1;
            metrics.consecutiveWeaponCraftMax = Math.max(metrics.consecutiveWeaponCraftMax, metrics.consecutiveWeaponCraftCurrent);
            if (metrics.craftWeaponCount - metrics.craftArmorCount >= ARMOR_LAG_RECOVERY_THRESHOLD) {
              metrics.armorRecoveryRemaining = ARMOR_LAG_RECOVERY_CRAFTS;
            }
            emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_WEAPON", floor: state.currentFloor });
            selectedAction = "CRAFT_WEAPON";
          } else {
            metrics.craftArmorCount += 1;
            metrics.consecutiveWeaponCraftCurrent = 0;
            if (metrics.armorRecoveryRemaining > 0) metrics.armorRecoveryRemaining -= 1;
            emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_ARMOR", floor: state.currentFloor });
            selectedAction = "CRAFT_ARMOR";
          }
          metrics.armorLagMax = Math.max(metrics.armorLagMax, metrics.craftWeaponCount - metrics.craftArmorCount);
          if (shouldPrioritizePairCraft && pendingPairRecovery > 0) {
            pairRecoveryDebt = Math.max(0, pairRecoveryDebt - 1);
          }
          if (canBypassCooldownForPair) {
            pairCooldownBypassAvailable = false;
          }
          recordTownAction("pair");
          emitDecisionTrace({
            policy: policy.name,
            sessionId,
            loop,
            stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
            candidates,
            selectedAction,
          });
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
        emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_STEEL", floor: state.currentFloor });
        selectedAction = "CRAFT_STEEL";
        emitDecisionTrace({
          policy: policy.name,
          sessionId,
          loop,
          stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
          candidates,
          selectedAction,
        });
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
        emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_MITHRIL", floor: state.currentFloor });
        selectedAction = "CRAFT_MITHRIL";
        emitDecisionTrace({
          policy: policy.name,
          sessionId,
          loop,
          stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
          candidates,
          selectedAction,
        });
        progressedInTown = true;
        continue;
      }
      if (
        enhanceCandidate.eligible &&
        enhanceCandidate.pair &&
        !(reserveForUpgrade && enhanceCandidate.pair.target.plus < 8 && !pairRecoveryReserveBypass && !pairMissingHardBypass) &&
        !((midTierPrepMode && !midTierTargetsMet) && enhanceCandidate.pair.target.plus < 8 && !pairRecoveryReserveBypass && !pairMissingHardBypass)
      ) {
        const targetPlus = enhanceCandidate.pair.target.plus;
        const isLowTierEnhance = targetPlus < 6;
        if (
          midTierPrepMode &&
          !midTierTargetsMet &&
          isLowTierEnhance &&
          lowTierPrepCooldown > 0 &&
          !shouldPrioritizePairCraft &&
          !pairMissingHardBypass
        ) {
          emitDecisionTrace({
            policy: policy.name,
            sessionId,
            loop,
            stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
            candidates,
            selectedAction,
          });
          continue;
        }
        const tier = getTier(targetPlus);
        const finalRate = getEnhanceFinalSuccessRate(targetPlus, state.enhanceFailStreak);
        const randomResult = nextRandom(rngSeed);
        rngSeed = randomResult.nextSeed;
        const success = randomResult.value < finalRate;
        const costs = getEnhanceMaterialCost(targetPlus);
        metrics.logicalTownTimeMs += TOWN_DURATION_MS.enhance;
        metrics.enhanceAttemptTotal += 1;
        metrics.enhanceExpectedSumTotal += finalRate;
        if (tier === "0to5") { metrics.enhanceAttempt0to5 += 1; metrics.enhanceExpectedSum0to5 += finalRate; }
        if (tier === "6to9") { metrics.enhanceAttempt6to9 += 1; metrics.enhanceExpectedSum6to9 += finalRate; }
        if (tier === "10plus") { metrics.enhanceAttempt10plus += 1; metrics.enhanceExpectedSum10plus += finalRate; }
        metrics.ironSpent += costs.ironOre;
        metrics.steelSpent += costs.steelOre;
        metrics.mithrilSpent += costs.mithril;

        if (success) {
          const remaining = state.equipmentItems.filter((item) => item.id !== enhanceCandidate.pair.target.id && item.id !== enhanceCandidate.pair.material.id);
          const enhanced = { id: `i-${state.nextItemId}`, kind: enhanceCandidate.pair.target.kind, plus: enhanceCandidate.pair.target.plus + 1 };
          const equipmentItems = [...remaining, enhanced];
          state = {
            ...state,
            materials: {
              ironOre: state.materials.ironOre - costs.ironOre,
              steelOre: state.materials.steelOre - costs.steelOre,
              mithril: state.materials.mithril - costs.mithril,
            },
            equipmentItems,
            bestPlus: calcBestPlus(equipmentItems),
            nextItemId: state.nextItemId + 1,
            enhanceFailStreak: 0,
            equippedWeaponItemId: state.equippedWeaponItemId === enhanceCandidate.pair.target.id || state.equippedWeaponItemId === enhanceCandidate.pair.material.id ? null : state.equippedWeaponItemId,
            equippedArmorItemId: state.equippedArmorItemId === enhanceCandidate.pair.target.id || state.equippedArmorItemId === enhanceCandidate.pair.material.id ? null : state.equippedArmorItemId,
          };
          metrics.enhanceCountTotal += 1;
          metrics.enhanceSuccessTotal += 1;
          if (tier === "0to5") { metrics.enhance0to5 += 1; metrics.enhanceSuccess0to5 += 1; }
          if (tier === "6to9") { metrics.enhance6to9 += 1; metrics.enhanceSuccess6to9 += 1; }
          if (tier === "10plus") { metrics.enhance10plus += 1; metrics.enhanceSuccess10plus += 1; }
          if (targetPlus === 5 && !metrics.plus6Reached) {
            metrics.plus6Reached = true;
            metrics.plus6ReachedLogicalTimeMs = metrics.logicalExploreTimeMs + metrics.logicalTownTimeMs;
          }
          progressedInTown = true;
        } else {
          const equipmentItems = state.equipmentItems.filter((item) => item.id !== enhanceCandidate.pair.material.id);
          state = {
            ...state,
            materials: {
              ironOre: state.materials.ironOre - costs.ironOre,
              steelOre: state.materials.steelOre - costs.steelOre,
              mithril: state.materials.mithril - costs.mithril,
            },
            equipmentItems,
            bestPlus: calcBestPlus(equipmentItems),
            enhanceFailStreak: state.enhanceFailStreak + 1,
          };
          progressedInTown = true;
        }
        if (midTierPrepMode && !midTierTargetsMet && isLowTierEnhance) lowTierPrepCooldown = 1;
        recordTownAction("other");
        emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "ENHANCE_ATTEMPT", floor: state.currentFloor, success, plus: targetPlus, expectedRate: finalRate, durationMs: TOWN_DURATION_MS.enhance });
        selectedAction = "ENHANCE";
        emitDecisionTrace({
          policy: policy.name,
          sessionId,
          loop,
          stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
          candidates,
          selectedAction,
        });
        continue;
      }

      if (!reserveForUpgrade || pairRecoveryReserveBypass || pairMissingHardBypass) {
        if (
          midTierPrepMode &&
          (state.materials.steelOre < targets.targetSteel || state.materials.mithril < targets.targetMithril) &&
          !canCraftForPairRecovery &&
          !pairRecoveryReserveBypass &&
          !pairMissingHardBypass
        ) {
          emitDecisionTrace({
            policy: policy.name,
            sessionId,
            loop,
            stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
            candidates,
            selectedAction,
          });
          continue;
        }
        if (
          midTierPrepMode &&
          lowTierPrepCooldown > 0 &&
          !canBypassCooldownForPair &&
          !shouldPrioritizePairCraft &&
          !pairMissingHardBypass
        ) {
          emitDecisionTrace({
            policy: policy.name,
            sessionId,
            loop,
            stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
            candidates,
            selectedAction,
          });
          continue;
        }
        const kind = shouldPrioritizePairCraft
          ? choosePairRecoveryCraftKind(state, policy, metrics)
          : chooseCraftKind(state, policy, attack, maxHp, metrics);
        const cost = getCraftFinalCost(state.forgeLevel);
        if (state.materials.ironOre >= cost) {
          const craftedPlus = getCraftedPlusByForgeLevel(state.forgeLevel);
          const craftCount = state.forgeLevel >= 8 ? 2 : 1;
          const correctionCountInWindow = pairRecoveryCorrectionWindow.reduce(
            (count, entry) => count + (entry === "corrected" ? 1 : 0),
            0,
          );
          const allowPairRecoveryCorrection =
            shouldPrioritizePairCraft &&
            correctionCountInWindow < PAIR_RECOVERY_CORRECTION_MAX_IN_WINDOW &&
            state.bestPlus >= PAIR_RECOVERY_CORRECTION_MIN_TOP_PLUS &&
            pairRecoveryCorrectionCooldown === 0;
          const crafted = createCraftedItems({
            state,
            kind,
            craftCount,
            defaultPlus: craftedPlus,
            pairRecovery: shouldPrioritizePairCraft,
            allowCorrection: allowPairRecoveryCorrection,
          });
          const equipmentItems = [...state.equipmentItems, ...crafted.items];
          if (shouldPrioritizePairCraft) {
            pairRecoveryCorrectionWindow.push(crafted.corrected ? "corrected" : "plain");
            if (pairRecoveryCorrectionWindow.length > PAIR_RECOVERY_CORRECTION_WINDOW) {
              pairRecoveryCorrectionWindow.shift();
            }
            if (crafted.corrected && PAIR_RECOVERY_CORRECTION_COOLDOWN_LOOPS > 0) {
              pairRecoveryCorrectionCooldown = PAIR_RECOVERY_CORRECTION_COOLDOWN_LOOPS;
            }
          }
          state = { ...state, materials: { ...state.materials, ironOre: state.materials.ironOre - cost }, equipmentItems, bestPlus: calcBestPlus(equipmentItems), nextItemId: state.nextItemId + craftCount };
          metrics.logicalTownTimeMs += TOWN_DURATION_MS.craft;
          metrics.ironSpent += cost;
          if (kind === "weapon") {
            metrics.craftWeaponCount += 1;
            metrics.consecutiveWeaponCraftCurrent += 1;
            metrics.consecutiveWeaponCraftMax = Math.max(metrics.consecutiveWeaponCraftMax, metrics.consecutiveWeaponCraftCurrent);
            if (metrics.craftWeaponCount - metrics.craftArmorCount >= ARMOR_LAG_RECOVERY_THRESHOLD) {
              metrics.armorRecoveryRemaining = ARMOR_LAG_RECOVERY_CRAFTS;
            }
            emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_WEAPON", floor: state.currentFloor });
            selectedAction = "CRAFT_WEAPON";
          } else {
            metrics.craftArmorCount += 1;
            metrics.consecutiveWeaponCraftCurrent = 0;
            if (metrics.armorRecoveryRemaining > 0) metrics.armorRecoveryRemaining -= 1;
            emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "CRAFT_ARMOR", floor: state.currentFloor });
            selectedAction = "CRAFT_ARMOR";
          }
          metrics.armorLagMax = Math.max(metrics.armorLagMax, metrics.craftWeaponCount - metrics.craftArmorCount);
          if (midTierPrepMode) lowTierPrepCooldown = 1;
          if (shouldPrioritizePairCraft && pendingPairRecovery > 0) {
            pairRecoveryDebt = Math.max(0, pairRecoveryDebt - 1);
          }
          if (canBypassCooldownForPair) {
            pairCooldownBypassAvailable = false;
          }
          recordTownAction(shouldPrioritizePairCraft ? "pair" : "other");
          emitDecisionTrace({
            policy: policy.name,
            sessionId,
            loop,
            stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
            candidates,
            selectedAction,
          });
          progressedInTown = true;
          continue;
        }
      }

      if (canUpgradeNow) {
        const upgradeCost = state.forgeUpgradeCost;
        state = {
          ...state,
          materials: { ...state.materials, ironOre: state.materials.ironOre - upgradeCost },
          forgeLevel: state.forgeLevel + 1,
          forgeUpgradeCost: canUpgradeForge(state.forgeLevel + 1) ? getNextForgeUpgradeCost(upgradeCost) : upgradeCost,
        };
        metrics.logicalTownTimeMs += TOWN_DURATION_MS.forgeUpgrade;
        metrics.ironSpent += upgradeCost;
        metrics.forgeUpgradeCount += 1;
        recordTownAction("other");
        emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "FORGE_UPGRADE", floor: state.currentFloor });
        selectedAction = "FORGE_UPGRADE";
        emitDecisionTrace({
          policy: policy.name,
          sessionId,
          loop,
          stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
          candidates,
          selectedAction,
        });
        progressedInTown = true;
        continue;
      }

      if (state.hp < maxHp) {
        state = { ...state, hp: maxHp, restCount: state.restCount + 1 };
        metrics.logicalTownTimeMs += TOWN_DURATION_MS.rest;
        metrics.restCount += 1;
        recordTownAction("other");
        emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "REST", floor: state.currentFloor, durationMs: TOWN_DURATION_MS.rest });
        selectedAction = "REST";
        emitDecisionTrace({
          policy: policy.name,
          sessionId,
          loop,
          stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
          candidates,
          selectedAction,
        });
        progressedInTown = true;
      } else {
        emitDecisionTrace({
          policy: policy.name,
          sessionId,
          loop,
          stateSnapshot: toDecisionSnapshot(state, attack, maxHp, reserveForUpgrade, midTierPrepMode),
          candidates,
          selectedAction,
        });
      }
    }

    const attack = calcAttack(state);
    const maxHp = calcMaxHp(state);
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
    const floorDuration = EXPLORE_EVENT_SUM_MS + Math.max(0, result.logs.length - 1) * (EVENT_DURATIONS.STAGE_CLEAR + EVENT_DURATIONS.MONSTER_ENTRY);

    metrics.logicalExploreTimeMs += floorDuration;
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

    emitTrace({ policy: policy.name, sessionId, step: ++step, actionType: "EXPLORE", floor, durationMs: floorDuration, endReason: result.endReason });
    // Keep trace output stable while avoiding extreme I/O volume for large session batches.
    if (result.endReason === "FLOOR_CLEARED") {
      const clearLogicalTimeMs = metrics.logicalExploreTimeMs + metrics.logicalTownTimeMs;
      if (floor === 1 && metrics.floor1ClearLogicalTimeMs == null) metrics.floor1ClearLogicalTimeMs = clearLogicalTimeMs;
      if (floor === 2 && metrics.floor2ClearLogicalTimeMs == null) metrics.floor2ClearLogicalTimeMs = clearLogicalTimeMs;
      if (floor === 3 && metrics.floor3ClearLogicalTimeMs == null) metrics.floor3ClearLogicalTimeMs = clearLogicalTimeMs;
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

  if (!metrics.completed && !metrics.abortedByStagnation && !metrics.abortedByLoopCap) metrics.abortedByLoopCap = true;

  state = equipBestItems(state);
  const rate = (s, a) => (a > 0 ? s / a : 0);
  const summary = {
    policy: policy.name,
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
    ...toPlusMilestoneSummary(metrics),
    floor1Reached: metrics.floor1Reached,
    floor1FirstExploreLogicalTimeMs: metrics.floor1FirstExploreLogicalTimeMs ?? "",
    floor1ClearLogicalTimeMs: metrics.floor1ClearLogicalTimeMs ?? "",
    floor2Reached: metrics.floor2Reached,
    floor2FirstExploreLogicalTimeMs: metrics.floor2FirstExploreLogicalTimeMs ?? "",
    floor2ClearLogicalTimeMs: metrics.floor2ClearLogicalTimeMs ?? "",
    floor3Reached: metrics.floor3Reached,
    floor3FirstExploreLogicalTimeMs: metrics.floor3FirstExploreLogicalTimeMs ?? "",
    floor3ClearLogicalTimeMs: metrics.floor3ClearLogicalTimeMs ?? "",
    enhanceSuccessRateTotal: rate(metrics.enhanceSuccessTotal, metrics.enhanceAttemptTotal),
    enhanceSuccessRate0to5: rate(metrics.enhanceSuccess0to5, metrics.enhanceAttempt0to5),
    enhanceSuccessRate6to9: rate(metrics.enhanceSuccess6to9, metrics.enhanceAttempt6to9),
    enhanceSuccessRate10plus: rate(metrics.enhanceSuccess10plus, metrics.enhanceAttempt10plus),
    enhanceExpectedRateTotal: rate(metrics.enhanceExpectedSumTotal, metrics.enhanceAttemptTotal),
    enhanceExpectedRate0to5: rate(metrics.enhanceExpectedSum0to5, metrics.enhanceAttempt0to5),
    enhanceExpectedRate6to9: rate(metrics.enhanceExpectedSum6to9, metrics.enhanceAttempt6to9),
    enhanceExpectedRate10plus: rate(metrics.enhanceExpectedSum10plus, metrics.enhanceAttempt10plus),
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
    finalAttack: calcAttack(state),
    finalMaxHp: calcMaxHp(state),
  };

  return summary;
};

const escapeCsv = (value) => {
  const str = String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
  return str;
};
const rowsToCsv = (rows) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => escapeCsv(row[h] ?? "")).join(","));
  return lines.join("\n");
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const policies = policiesFromPreset(args.preset);
  const summaryRows = [];
  let traceRowCount = 0;
  const outDir = path.resolve(args.outDir);
  await mkdir(outDir, { recursive: true });
  const summaryPath = path.join(outDir, "summary.csv");
  const tracePath = path.join(outDir, "trace.jsonl");
  const decisionTracePath = path.join(outDir, "decision-trace.jsonl");
  const metaPath = path.join(outDir, "run-meta.json");
  const traceStream = createWriteStream(tracePath, { encoding: "utf8", flags: "w" });
  const decisionTraceEnabled = args.sessions <= 10;
  const decisionTraceStream = createWriteStream(decisionTracePath, { encoding: "utf8", flags: "w" });
  let decisionTraceRowCount = 0;

  let globalSessionIndex = 0;
  for (const policy of policies) {
    for (let i = 0; i < args.sessions; i += 1) {
      const sessionId = `${policy.name}-${String(i + 1).padStart(3, "0")}`;
      const seed = args.seedBase + globalSessionIndex;
      const summary = runSingleSession(
        policy,
        sessionId,
        seed,
        args.maxLoops,
        args.initialIron,
        args.initialUnlockedFloor,
        (row) => {
          traceStream.write(`${JSON.stringify(row)}\n`);
          traceRowCount += 1;
        },
        decisionTraceEnabled
          ? (row) => {
              decisionTraceStream.write(`${JSON.stringify(row)}\n`);
              decisionTraceRowCount += 1;
            }
          : undefined,
      );
      summaryRows.push(summary);
      globalSessionIndex += 1;
    }
  }

  await new Promise((resolve, reject) => {
    traceStream.end((error) => (error ? reject(error) : resolve()));
  });
  await new Promise((resolve, reject) => {
    decisionTraceStream.end((error) => (error ? reject(error) : resolve()));
  });

  await writeFile(summaryPath, `${rowsToCsv(summaryRows)}\n`, "utf8");
  await writeFile(metaPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    config: {
      preset: args.preset,
      sessionsPerPolicy: args.sessions,
      maxLoops: args.maxLoops,
      seedBase: args.seedBase,
      initialStateOverride: { ironOre: args.initialIron, unlockedFloor: args.initialUnlockedFloor },
    },
    summaryRowCount: summaryRows.length,
    traceRowCount,
    decisionTrace: {
      enabled: decisionTraceEnabled,
      rowCount: decisionTraceRowCount,
      path: decisionTracePath,
    },
  }, null, 2), "utf8");

  console.log(`[balance:collect] done -> ${outDir}`);
  console.log(`[balance:collect] summary: ${summaryPath}`);
  console.log(`[balance:collect] trace: ${tracePath}`);
  console.log(`[balance:collect] decision-trace: ${decisionTracePath} (${decisionTraceEnabled ? "enabled" : "disabled"})`);
  console.log(`[balance:collect] meta: ${metaPath}`);
};

main().catch((error) => {
  console.error("[balance:collect] failed", error);
  process.exit(1);
});



