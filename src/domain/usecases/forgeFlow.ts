import { validateForge } from "@/domain/forge";
import {
  canUpgradeForge,
  getCraftCost,
  getEnhanceMaterialCost,
  getNextForgeUpgradeCost,
} from "@/domain/forgeEconomy";
import { calcBestPlus } from "@/domain/selectors";
import type { EquipmentItem, EquipmentKind, GameState } from "@/domain/state";

const createEquipmentItem = (idNum: number, kind: EquipmentKind, plus: number): EquipmentItem => ({
  id: `i-${idNum}`,
  kind,
  plus,
});

export const getEquippedWeaponPlus = (state: GameState): number => {
  if (!state.equippedWeaponItemId) {
    return 0;
  }
  const weapon = state.equipmentItems.find(
    (item) => item.id === state.equippedWeaponItemId && item.kind === "weapon",
  );
  return weapon ? weapon.plus : 0;
};

export const getPlayerAttack = (state: GameState): number => {
  return 1 + getEquippedWeaponPlus(state);
};

export const craftEquipment = (state: GameState, kind: EquipmentKind): GameState => {
  const craftCost = getCraftCost(state.forgeLevel);
  if (state.materials.ironOre < craftCost) {
    return state;
  }

  const crafted = createEquipmentItem(state.nextItemId, kind, 0);
  const equipmentItems = [...state.equipmentItems, crafted];
  return {
    ...state,
    materials: {
      ...state.materials,
      ironOre: state.materials.ironOre - craftCost,
    },
    equipmentItems,
    bestPlus: calcBestPlus(equipmentItems),
    nextItemId: state.nextItemId + 1,
  };
};

export const enhanceEquipment = (state: GameState, targetItemId: string, materialItemId: string): GameState => {
  const validation = validateForge(state, targetItemId, materialItemId);
  if (!validation.ok) {
    return state;
  }

  const { target, material } = validation;
  const requiredMaterials = getEnhanceMaterialCost(target.plus);
  const remainingItems = state.equipmentItems.filter(
    (item) => item.id !== target.id && item.id !== material.id,
  );
  const enhancedItem = createEquipmentItem(state.nextItemId, target.kind, target.plus + 1);
  const equipmentItems = [...remainingItems, enhancedItem];

  return {
    ...state,
    materials: {
      ironOre: state.materials.ironOre - (requiredMaterials.ironOre ?? 0),
      steelOre: state.materials.steelOre - (requiredMaterials.steelOre ?? 0),
      mithril: state.materials.mithril - (requiredMaterials.mithril ?? 0),
    },
    equipmentItems,
    bestPlus: calcBestPlus(equipmentItems),
    nextItemId: state.nextItemId + 1,
  };
};

export const upgradeForge = (state: GameState): GameState => {
  if (!canUpgradeForge(state.forgeLevel)) {
    return state;
  }
  if (state.materials.ironOre < state.forgeUpgradeCost) {
    return state;
  }

  const nextLevel = state.forgeLevel + 1;
  const nextCost = canUpgradeForge(nextLevel)
    ? getNextForgeUpgradeCost(state.forgeUpgradeCost)
    : state.forgeUpgradeCost;

  return {
    ...state,
    materials: {
      ...state.materials,
      ironOre: state.materials.ironOre - state.forgeUpgradeCost,
    },
    forgeLevel: nextLevel,
    forgeUpgradeCost: nextCost,
  };
};
