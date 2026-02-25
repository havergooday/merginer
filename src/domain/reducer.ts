import { randomInt } from "@/domain/rng";
import { calcBestPlus, calcMaxHpFromEquippedArmor } from "@/domain/selectors";
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
  | { type: "EQUIP"; itemId: string; slot: EquipmentKind }
  | { type: "UNEQUIP"; slot: EquipmentKind }
  | { type: "REST" }
  | { type: "RESET" };

const createEquipmentItem = (idNum: number, kind: EquipmentKind, plus: number): EquipmentItem => ({
  id: `i-${idNum}`,
  kind,
  plus,
});

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
    case "CRAFT_WEAPON": {
      if (state.ironOre < 10) {
        return state;
      }

      const crafted = createEquipmentItem(state.nextItemId, "weapon", 0);
      const equipmentItems = [...state.equipmentItems, crafted];
      return {
        ...state,
        ironOre: state.ironOre - 10,
        equipmentItems,
        bestPlus: calcBestPlus(equipmentItems),
        nextItemId: state.nextItemId + 1,
      };
    }
    case "CRAFT_ARMOR": {
      if (state.ironOre < 10) {
        return state;
      }

      const crafted = createEquipmentItem(state.nextItemId, "armor", 0);
      const equipmentItems = [...state.equipmentItems, crafted];
      return {
        ...state,
        ironOre: state.ironOre - 10,
        equipmentItems,
        bestPlus: calcBestPlus(equipmentItems),
        nextItemId: state.nextItemId + 1,
      };
    }
    case "FORGE_ENHANCE": {
      const { targetItemId, materialItemId } = action;
      if (targetItemId === materialItemId || state.ironOre < 1) {
        return state;
      }

      const target = state.equipmentItems.find((item) => item.id === targetItemId);
      const material = state.equipmentItems.find((item) => item.id === materialItemId);

      if (!target || !material) {
        return state;
      }

      if (
        state.equippedWeaponItemId === targetItemId ||
        state.equippedWeaponItemId === materialItemId ||
        state.equippedArmorItemId === targetItemId ||
        state.equippedArmorItemId === materialItemId
      ) {
        return state;
      }

      if (target.plus !== material.plus || target.kind !== material.kind) {
        return state;
      }

      const remainingItems = state.equipmentItems.filter(
        (item) => item.id !== targetItemId && item.id !== materialItemId,
      );
      const enhancedItem = createEquipmentItem(state.nextItemId, target.kind, target.plus + 1);
      const equipmentItems = [...remainingItems, enhancedItem];

      return {
        ...state,
        ironOre: state.ironOre - 1,
        equipmentItems,
        bestPlus: calcBestPlus(equipmentItems),
        nextItemId: state.nextItemId + 1,
      };
    }
    case "EQUIP": {
      const { itemId, slot } = action;
      const item = state.equipmentItems.find((candidate) => candidate.id === itemId);
      if (!item || item.kind !== slot) {
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

      return {
        ...state,
        equippedArmorItemId: itemId,
      };
    }
    case "UNEQUIP": {
      if (action.slot === "weapon") {
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

      const nextMaxHp = calcMaxHpFromEquippedArmor(null, state.equipmentItems);
      const nextHp = Math.min(hp, nextMaxHp);
      return {
        ...state,
        hp: nextHp,
        equippedArmorItemId: null,
      };
    }
    case "RESET":
      return createInitialGameState(state.seed);
    case "REST": {
      const maxHp = calcMaxHpFromEquippedArmor(state.equippedArmorItemId, state.equipmentItems);
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
