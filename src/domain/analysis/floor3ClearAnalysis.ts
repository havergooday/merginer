import { simulateExplore } from "@/domain/explore";
import { canUpgradeForge, getRequiredForgeLevelForEnhance } from "@/domain/forgeEconomy";
import { getMaxHp } from "@/domain/hp";
import { calcAttackFromEquipped } from "@/domain/selectors";
import { createInitialGameState, type EquipmentItem, type Floor, type GameState } from "@/domain/state";
import { craftEquipment, enhanceEquipment, upgradeForge } from "@/domain/usecases/forgeFlow";

export type StrategyPreset = "conservative" | "balanced" | "aggressive";

export type FloorThreshold = {
  attack: number;
  maxHp: number;
};

export type FloorProgressionPolicy = {
  name: string;
  floor2: FloorThreshold;
  floor3: FloorThreshold;
};

export type EnhanceTierCount = {
  plus0to5: number;
  plus6to9: number;
  plus10Plus: number;
};

export type SessionMetrics = {
  policyName: string;
  completed: boolean;
  abortedByLoopCap: boolean;
  completedExploreCount: number | null;
  exploreCount: number;
  restCount: number;
  forgeUpgradeCount: number;
  craftWeaponCount: number;
  craftArmorCount: number;
  enhanceCountTotal: number;
  enhanceCountByTier: EnhanceTierCount;
  exploreByFloor: Record<Floor, number>;
  plus5AtExplore: number | null;
  finalBestPlus: number;
  finalAttack: number;
  finalMaxHp: number;
};

export const STRATEGY_PRESETS: Record<StrategyPreset, FloorProgressionPolicy> = {
  conservative: {
    name: "conservative",
    floor2: { attack: 4, maxHp: 16 },
    floor3: { attack: 8, maxHp: 24 },
  },
  balanced: {
    name: "balanced",
    floor2: { attack: 3, maxHp: 14 },
    floor3: { attack: 8, maxHp: 24 },
  },
  aggressive: {
    name: "aggressive",
    floor2: { attack: 2, maxHp: 12 },
    floor3: { attack: 8, maxHp: 22 },
  },
};

type AnalyzeOptions = {
  policy: FloorProgressionPolicy;
  maxLoops?: number;
};

const defaultEnhanceTierCount = (): EnhanceTierCount => ({
  plus0to5: 0,
  plus6to9: 0,
  plus10Plus: 0,
});

const getBestItemIdByKind = (items: EquipmentItem[], kind: "weapon" | "armor"): string | null => {
  const target = items
    .filter((item) => item.kind === kind)
    .sort((a, b) => b.plus - a.plus || a.id.localeCompare(b.id))[0];
  return target ? target.id : null;
};

const equipBestItems = (state: GameState): GameState => {
  const bestWeaponId = getBestItemIdByKind(state.equipmentItems, "weapon");
  const bestArmorId = getBestItemIdByKind(state.equipmentItems, "armor");
  return {
    ...state,
    equippedWeaponItemId: bestWeaponId,
    equippedArmorItemId: bestArmorId,
  };
};

const determineFloor = (attack: number, maxHp: number, policy: FloorProgressionPolicy): Floor => {
  if (attack >= policy.floor3.attack && maxHp >= policy.floor3.maxHp) {
    return 3;
  }
  if (attack >= policy.floor2.attack && maxHp >= policy.floor2.maxHp) {
    return 2;
  }
  return 1;
};

const chooseCraftKind = (state: GameState, policy: FloorProgressionPolicy, attack: number, maxHp: number): "weapon" | "armor" => {
  const target = attack >= policy.floor2.attack && maxHp >= policy.floor2.maxHp ? policy.floor3 : policy.floor2;
  if (attack < target.attack) {
    return "weapon";
  }
  if (maxHp < target.maxHp) {
    return "armor";
  }

  const weaponCount = state.equipmentItems.filter((item) => item.kind === "weapon").length;
  const armorCount = state.equipmentItems.filter((item) => item.kind === "armor").length;
  return weaponCount <= armorCount ? "weapon" : "armor";
};

const chooseEnhancePair = (state: GameState): { targetItemId: string; materialItemId: string; targetPlus: number } | null => {
  const candidates = state.equipmentItems;
  const pairs = new Map<string, EquipmentItem[]>();

  for (const item of candidates) {
    const key = `${item.kind}:${item.plus}`;
    const group = pairs.get(key) ?? [];
    group.push(item);
    pairs.set(key, group);
  }

  const keys = Array.from(pairs.keys()).sort((a, b) => {
    const plusA = Number(a.split(":")[1]);
    const plusB = Number(b.split(":")[1]);
    return plusB - plusA;
  });

  for (const key of keys) {
    const group = pairs.get(key);
    if (!group || group.length < 2) {
      continue;
    }

    const target = group[0];
    const material = group[1];
    const requiredForgeLevel = getRequiredForgeLevelForEnhance(target.plus);
    if (requiredForgeLevel > state.forgeLevel) {
      continue;
    }
    const required = target.plus;
    if (state.materials.ironOre < required) {
      continue;
    }
    if (target.plus >= 6 && state.materials.steelOre < required) {
      continue;
    }
    if (target.plus >= 8 && state.materials.mithril < 2) {
      continue;
    }
    if (target.plus >= 6 && target.plus <= 7 && state.materials.mithril < 1) {
      continue;
    }
    if (target.plus >= 10 && state.materials.mithril < required) {
      continue;
    }

    return {
      targetItemId: target.id,
      materialItemId: material.id,
      targetPlus: target.plus,
    };
  }

  return null;
};

const shouldUpgradeForge = (state: GameState): boolean => {
  if (!canUpgradeForge(state.forgeLevel) || state.materials.ironOre < state.forgeUpgradeCost) {
    return false;
  }
  const required = getRequiredForgeLevelForEnhance(state.bestPlus);
  return state.forgeLevel < required;
};

const shouldReserveForUpgrade = (state: GameState): boolean => {
  if (!canUpgradeForge(state.forgeLevel)) {
    return false;
  }
  const required = getRequiredForgeLevelForEnhance(state.bestPlus);
  if (state.forgeLevel >= required) {
    return false;
  }
  return state.materials.ironOre < state.forgeUpgradeCost;
};

const recordPlusFive = (metrics: SessionMetrics, state: GameState): void => {
  if (metrics.plus5AtExplore !== null) {
    return;
  }
  if (state.bestPlus >= 5) {
    metrics.plus5AtExplore = state.exploreCount;
  }
};

const addEnhanceTierCount = (count: EnhanceTierCount, targetPlus: number): void => {
  if (targetPlus >= 10) {
    count.plus10Plus += 1;
    return;
  }
  if (targetPlus >= 6) {
    count.plus6to9 += 1;
    return;
  }
  count.plus0to5 += 1;
};

export const analyzeFloor3ClearSession = ({ policy, maxLoops = 10_000 }: AnalyzeOptions): SessionMetrics => {
  let state = equipBestItems(createInitialGameState());
  const metrics: SessionMetrics = {
    policyName: policy.name,
    completed: false,
    abortedByLoopCap: false,
    completedExploreCount: null,
    exploreCount: 0,
    restCount: 0,
    forgeUpgradeCount: 0,
    craftWeaponCount: 0,
    craftArmorCount: 0,
    enhanceCountTotal: 0,
    enhanceCountByTier: defaultEnhanceTierCount(),
    exploreByFloor: { 1: 0, 2: 0, 3: 0 },
    plus5AtExplore: null,
    finalBestPlus: state.bestPlus,
    finalAttack: calcAttackFromEquipped(state.equippedWeaponItemId, state.equipmentItems),
    finalMaxHp: getMaxHp(state.equippedArmorItemId, state.equipmentItems),
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

      const pair = chooseEnhancePair(state);
      if (pair) {
        const forgeReadyState: GameState = {
          ...state,
          equippedWeaponItemId:
            state.equippedWeaponItemId === pair.targetItemId || state.equippedWeaponItemId === pair.materialItemId
              ? null
              : state.equippedWeaponItemId,
          equippedArmorItemId:
            state.equippedArmorItemId === pair.targetItemId || state.equippedArmorItemId === pair.materialItemId
              ? null
              : state.equippedArmorItemId,
        };
        const next = enhanceEquipment(forgeReadyState, pair.targetItemId, pair.materialItemId);
        if (next !== state) {
          state = next;
          metrics.enhanceCountTotal += 1;
          addEnhanceTierCount(metrics.enhanceCountByTier, pair.targetPlus);
          recordPlusFive(metrics, state);
          progressedInTown = true;
          continue;
        }
      }

      const reserveForUpgrade = shouldReserveForUpgrade(state);
      if (!reserveForUpgrade) {
        const kind = chooseCraftKind(state, policy, attack, maxHp);
        const crafted = craftEquipment(state, kind);
        if (crafted !== state) {
          state = crafted;
          if (kind === "weapon") {
            metrics.craftWeaponCount += 1;
          } else {
            metrics.craftArmorCount += 1;
          }
          recordPlusFive(metrics, state);
          progressedInTown = true;
          continue;
        }
      }

      if (shouldUpgradeForge(state)) {
        const upgraded = upgradeForge(state);
        if (upgraded !== state) {
          state = upgraded;
          metrics.forgeUpgradeCount += 1;
          progressedInTown = true;
          continue;
        }
      }

      if (state.hp < maxHp) {
        state = {
          ...state,
          hp: maxHp,
          restCount: state.restCount + 1,
        };
        metrics.restCount += 1;
        progressedInTown = true;
      }
    }

    const attack = calcAttackFromEquipped(state.equippedWeaponItemId, state.equipmentItems);
    const maxHp = getMaxHp(state.equippedArmorItemId, state.equipmentItems);
    const floor = determineFloor(attack, maxHp, policy);
    const result = simulateExplore({
      floor,
      hp: state.hp,
      attack,
    });
    metrics.exploreByFloor[floor] += 1;
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
    metrics.exploreCount = state.exploreCount;
    recordPlusFive(metrics, state);

    if (floor === 3 && result.endReason === "FLOOR_CLEARED") {
      metrics.completed = true;
      metrics.completedExploreCount = state.exploreCount;
      break;
    }
  }

  if (!metrics.completed) {
    metrics.abortedByLoopCap = true;
  }

  state = equipBestItems(state);
  metrics.finalBestPlus = state.bestPlus;
  metrics.finalAttack = calcAttackFromEquipped(state.equippedWeaponItemId, state.equipmentItems);
  metrics.finalMaxHp = getMaxHp(state.equippedArmorItemId, state.equipmentItems);
  return metrics;
};
