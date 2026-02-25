import { canEquipToSlot } from "@/domain/equipment";
import { clampHpToMax, getMaxHp } from "@/domain/hp";
import type { EquipmentKind, GameState } from "@/domain/state";

export const equipToSlot = (state: GameState, itemId: string, slot: EquipmentKind, hp: number): GameState => {
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

export const unequipFromSlot = (state: GameState, slot: EquipmentKind, hp: number): GameState => {
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
