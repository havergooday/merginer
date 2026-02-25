import { getEnhanceOreCost } from "@/domain/forgeEconomy";
import type { EquipmentItem, GameState } from "@/domain/state";

export type ForgeFailureReason =
  | "MISSING_SELECTION"
  | "SAME_ITEM"
  | "ITEM_NOT_FOUND"
  | "EQUIPPED_ITEM"
  | "KIND_MISMATCH"
  | "PLUS_MISMATCH"
  | "INSUFFICIENT_ORE";

export type ForgeValidationResult =
  | {
      ok: true;
      target: EquipmentItem;
      material: EquipmentItem;
    }
  | {
      ok: false;
      reason: ForgeFailureReason;
    };

export const validateForge = (
  state: GameState,
  targetItemId: string | null,
  materialItemId: string | null,
): ForgeValidationResult => {
  if (!targetItemId || !materialItemId) {
    return { ok: false, reason: "MISSING_SELECTION" };
  }

  if (targetItemId === materialItemId) {
    return { ok: false, reason: "SAME_ITEM" };
  }

  const target = state.equipmentItems.find((item) => item.id === targetItemId);
  const material = state.equipmentItems.find((item) => item.id === materialItemId);
  if (!target || !material) {
    return { ok: false, reason: "ITEM_NOT_FOUND" };
  }

  if (
    state.equippedWeaponItemId === targetItemId ||
    state.equippedWeaponItemId === materialItemId ||
    state.equippedArmorItemId === targetItemId ||
    state.equippedArmorItemId === materialItemId
  ) {
    return { ok: false, reason: "EQUIPPED_ITEM" };
  }

  if (target.kind !== material.kind) {
    return { ok: false, reason: "KIND_MISMATCH" };
  }

  if (target.plus !== material.plus) {
    return { ok: false, reason: "PLUS_MISMATCH" };
  }

  const requiredOre = getEnhanceOreCost(target.plus);
  if (state.ironOre < requiredOre) {
    return { ok: false, reason: "INSUFFICIENT_ORE" };
  }

  return { ok: true, target, material };
};
