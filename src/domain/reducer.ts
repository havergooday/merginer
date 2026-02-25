import { canEquipToSlot } from "@/domain/equipment";
import { validateForge } from "@/domain/forge";
import { canUpgradeForge, getCraftCost, getEnhanceOreCost, getNextForgeUpgradeCost } from "@/domain/forgeEconomy";
import { clampHpToMax, getMaxHp } from "@/domain/hp";
import { randomInt } from "@/domain/rng";
import { calcBestPlus } from "@/domain/selectors";
import {
  createInitialGameState,
  INITIAL_HP,
  type EquipmentItem,
  type EquipmentKind,
  type GameState,
} from "@/domain/state";

export type Action =
  | { type: "EXPLORE_F1" }
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

const addItem = (state: GameState, kind: EquipmentKind): GameState => {
  const craftCost = getCraftCost(state.forgeLevel);
  if (state.ironOre < craftCost) {
    return state;
  }

  const crafted = createEquipmentItem(state.nextItemId, kind, 0);
  const equipmentItems = [...state.equipmentItems, crafted];
  return {
    ...state,
    ironOre: state.ironOre - craftCost,
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

export const reducer = (state: GameState, action: Action): GameState => {
  const hp = Number.isFinite(state.hp) ? state.hp : INITIAL_HP;
  const restCount = Number.isFinite(state.restCount) ? state.restCount : 0;

  switch (action.type) {
    case "EXPLORE_F1": {
      if (hp <= 0) {
        return state;
      }

      const { value: gain, nextSeed } = randomInt(state.seed, 1, 3);
      return {
        ...state,
        ironOre: state.ironOre + gain,
        exploreCount: state.exploreCount + 1,
        seed: nextSeed,
        hp: Math.max(0, hp - 1),
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
      const remainingItems = state.equipmentItems.filter(
        (item) => item.id !== target.id && item.id !== material.id,
      );
      const enhancedItem = createEquipmentItem(state.nextItemId, target.kind, target.plus + 1);
      const equipmentItems = [...remainingItems, enhancedItem];

      return {
        ...state,
        ironOre: state.ironOre - getEnhanceOreCost(target.plus),
        equipmentItems,
        bestPlus: calcBestPlus(equipmentItems),
        nextItemId: state.nextItemId + 1,
      };
    }
    case "UPGRADE_FORGE": {
      if (!canUpgradeForge(state.forgeLevel)) {
        return state;
      }
      if (state.ironOre < state.forgeUpgradeCost) {
        return state;
      }

      const nextLevel = state.forgeLevel + 1;
      const nextCost = canUpgradeForge(nextLevel)
        ? getNextForgeUpgradeCost(state.forgeUpgradeCost)
        : state.forgeUpgradeCost;

      return {
        ...state,
        ironOre: state.ironOre - state.forgeUpgradeCost,
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


