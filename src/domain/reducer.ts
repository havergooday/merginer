import { getMaxHp } from "@/domain/hp";
import {
  ORE_TO_STEEL_COST,
  STEEL_TO_MITHRIL_COST,
  canCraftMithril,
  canCraftSteel,
} from "@/domain/forgeEconomy";
import {
  createInitialGameState,
  INITIAL_HP,
  type Floor,
  type GameState,
} from "@/domain/state";
import {
  applyExploreResult,
  canStartExplore,
  normalizeFloor,
  startExplore,
  type ExploreApplyResult,
} from "@/domain/usecases/exploreFlow";
import { equipToSlot, unequipFromSlot } from "@/domain/usecases/equipmentFlow";
import {
  craftEquipment,
  enhanceEquipment,
  getPlayerAttack,
  upgradeForge,
} from "@/domain/usecases/forgeFlow";

export type Action =
  | { type: "SET_FLOOR"; floor: Floor }
  | { type: "START_EXPLORE" }
  | { type: "APPLY_EXPLORE_RESULT"; result: ExploreApplyResult }
  | { type: "CRAFT_WEAPON" }
  | { type: "CRAFT_ARMOR" }
  | { type: "CRAFT_STEEL" }
  | { type: "CRAFT_MITHRIL" }
  | { type: "FORGE_ENHANCE"; targetItemId: string; materialItemId: string }
  | { type: "UPGRADE_FORGE" }
  | { type: "EQUIP"; itemId: string; slot: "weapon" | "armor" }
  | { type: "UNEQUIP"; slot: "weapon" | "armor" }
  | { type: "REST" }
  | { type: "RESET" };

export const reducer = (state: GameState, action: Action): GameState => {
  const hp = Number.isFinite(state.hp) ? state.hp : INITIAL_HP;
  const restCount = Number.isFinite(state.restCount) ? state.restCount : 0;

  if (state.isExploring && action.type !== "APPLY_EXPLORE_RESULT" && action.type !== "RESET") {
    return state;
  }

  switch (action.type) {
    case "SET_FLOOR": {
      const nextFloor = Math.min(normalizeFloor(action.floor), state.unlockedFloor) as Floor;
      if (nextFloor === state.currentFloor) {
        return state;
      }
      return {
        ...state,
        currentFloor: nextFloor,
      };
    }
    case "START_EXPLORE": {
      const playerAttack = getPlayerAttack(state);
      if (!canStartExplore(state, hp, playerAttack)) {
        return state;
      }
      return startExplore(state);
    }
    case "APPLY_EXPLORE_RESULT": {
      if (!state.isExploring) {
        return state;
      }
      return applyExploreResult(state, action.result);
    }
    case "CRAFT_WEAPON":
      return craftEquipment(state, "weapon");
    case "CRAFT_ARMOR":
      return craftEquipment(state, "armor");
    case "CRAFT_STEEL": {
      if (!canCraftSteel(state.forgeLevel, state.materials.ironOre)) {
        return state;
      }
      return {
        ...state,
        materials: {
          ...state.materials,
          ironOre: state.materials.ironOre - ORE_TO_STEEL_COST,
          steelOre: state.materials.steelOre + 1,
        },
      };
    }
    case "CRAFT_MITHRIL": {
      if (!canCraftMithril(state.forgeLevel, state.materials.steelOre)) {
        return state;
      }
      return {
        ...state,
        materials: {
          ...state.materials,
          steelOre: state.materials.steelOre - STEEL_TO_MITHRIL_COST,
          mithril: state.materials.mithril + 1,
        },
      };
    }
    case "FORGE_ENHANCE":
      return enhanceEquipment(state, action.targetItemId, action.materialItemId);
    case "UPGRADE_FORGE":
      return upgradeForge(state);
    case "EQUIP":
      return equipToSlot(state, action.itemId, action.slot, hp);
    case "UNEQUIP":
      return unequipFromSlot(state, action.slot, hp);
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
