import { canEquipToSlot } from "@/domain/equipment";
import { validateForge } from "@/domain/forge";
import {
  canUpgradeForge,
  getCraftCost,
  getEnhanceMaterialCost,
  getNextForgeUpgradeCost,
} from "@/domain/forgeEconomy";
import { clampHpToMax, getMaxHp } from "@/domain/hp";
import { calcBestPlus } from "@/domain/selectors";
import {
  createInitialGameState,
  INITIAL_HP,
  type EquipmentItem,
  type EquipmentKind,
  type Floor,
  type GameState,
  type MaterialStock,
} from "@/domain/state";

type ExploreApplyResult = {
  finalHp: number;
  clearedStage: number;
  reward: MaterialStock;
};

export type Action =
  | { type: "SET_FLOOR"; floor: Floor }
  | { type: "START_EXPLORE" }
  | { type: "APPLY_EXPLORE_RESULT"; result: ExploreApplyResult }
  | { type: "CRAFT_WEAPON" }
  | { type: "CRAFT_ARMOR" }
  | { type: "FORGE_ENHANCE"; targetItemId: string; materialItemId: string }
  | { type: "UPGRADE_FORGE" }
  | { type: "EQUIP"; itemId: string; slot: EquipmentKind }
  | { type: "UNEQUIP"; slot: EquipmentKind }
  | { type: "REST" }
  | { type: "RESET" };

const createEquipmentItem = (idNum: number, kind: EquipmentKind, plus: number): EquipmentItem => ({
  id: `i-${idNum}`,
  kind,
  plus,
});

const getEquippedWeaponPlus = (state: GameState): number => {
  if (!state.equippedWeaponItemId) {
    return 0;
  }
  const weapon = state.equipmentItems.find(
    (item) => item.id === state.equippedWeaponItemId && item.kind === "weapon",
  );
  return weapon ? weapon.plus : 0;
};

const getPlayerAttack = (state: GameState): number => {
  return 1 + getEquippedWeaponPlus(state);
};

const addItem = (state: GameState, kind: EquipmentKind): GameState => {
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

const equipItem = (state: GameState, itemId: string, slot: EquipmentKind, hp: number): GameState => {
  const item = state.equipmentItems.find((candidate) => candidate.id === itemId);
  if (!canEquipToSlot(item, slot)) {
    return state;
  }

  if (slot === "weapon") {
    if (state.equippedWeaponItemId === itemId) {
      return state;
    }

    return {
      ...state,
      equippedWeaponItemId: itemId,
    };
  }

  if (state.equippedArmorItemId === itemId) {
    return state;
  }

  const nextState = {
    ...state,
    equippedArmorItemId: itemId,
  };
  const maxHp = getMaxHp(nextState.equippedArmorItemId, nextState.equipmentItems);
  return {
    ...nextState,
    hp: clampHpToMax(hp, maxHp),
  };
};

const unequipItem = (state: GameState, slot: EquipmentKind, hp: number): GameState => {
  if (slot === "weapon") {
    if (state.equippedWeaponItemId === null) {
      return state;
    }

    return {
      ...state,
      equippedWeaponItemId: null,
    };
  }

  if (state.equippedArmorItemId === null) {
    return state;
  }

  const nextState = {
    ...state,
    equippedArmorItemId: null,
  };
  const maxHp = getMaxHp(nextState.equippedArmorItemId, nextState.equipmentItems);

  return {
    ...nextState,
    hp: clampHpToMax(hp, maxHp),
  };
};

const normalizeFloor = (floor: number): Floor => {
  if (floor <= 1) {
    return 1;
  }
  if (floor >= 3) {
    return 3;
  }
  return 2;
};

export const reducer = (state: GameState, action: Action): GameState => {
  const hp = Number.isFinite(state.hp) ? state.hp : INITIAL_HP;
  const restCount = Number.isFinite(state.restCount) ? state.restCount : 0;

  if (state.isExploring) {
    if (action.type !== "APPLY_EXPLORE_RESULT" && action.type !== "RESET") {
      return state;
    }
  }

  switch (action.type) {
    case "SET_FLOOR": {
      const nextFloor = normalizeFloor(action.floor);
      if (nextFloor === state.currentFloor) {
        return state;
      }
      return {
        ...state,
        currentFloor: nextFloor,
      };
    }
    case "START_EXPLORE": {
      if (state.isExploring || hp <= 0) {
        return state;
      }
      if (getPlayerAttack(state) <= 0) {
        return state;
      }
      return {
        ...state,
        isExploring: true,
        currentStage: 1,
        exploreCount: state.exploreCount + 1,
      };
    }
    case "APPLY_EXPLORE_RESULT": {
      if (!state.isExploring) {
        return state;
      }

      return {
        ...state,
        materials: {
          ironOre: state.materials.ironOre + action.result.reward.ironOre,
          steelOre: state.materials.steelOre + action.result.reward.steelOre,
          mithril: state.materials.mithril + action.result.reward.mithril,
        },
        hp: Math.max(0, action.result.finalHp),
        currentStage: 0,
        isExploring: false,
      };
    }
    case "CRAFT_WEAPON":
      return addItem(state, "weapon");
    case "CRAFT_ARMOR":
      return addItem(state, "armor");
    case "FORGE_ENHANCE": {
      const validation = validateForge(state, action.targetItemId, action.materialItemId);
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
    }
    case "UPGRADE_FORGE": {
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
    }
    case "EQUIP":
      return equipItem(state, action.itemId, action.slot, hp);
    case "UNEQUIP":
      return unequipItem(state, action.slot, hp);
    case "RESET":
      return createInitialGameState(state.seed);
    case "REST": {
      const maxHp = getMaxHp(state.equippedArmorItemId, state.equipmentItems);
      if (hp === maxHp) {
        return state;
      }

      return {
        ...state,
        hp: maxHp,
        restCount: restCount + 1,
      };
    }
    default:
      return state;
  }
};