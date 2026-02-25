import {
  getEnhanceMaterialCost,
  getRequiredForgeLevelForEnhance,
} from "@/domain/forgeEconomy";
import type { EquipmentItem, GameState, MaterialStock } from "@/domain/state";

export type ForgeFailureReason =
  | "MISSING_SELECTION"
  | "SAME_ITEM"
  | "ITEM_NOT_FOUND"
  | "EQUIPPED_ITEM"
  | "KIND_MISMATCH"
  | "PLUS_MISMATCH"
  | "FORGE_LEVEL_TOO_LOW_FOR_STEEL"
  | "FORGE_LEVEL_TOO_LOW_FOR_MITHRIL"
  | "INSUFFICIENT_IRON_ORE"
  | "INSUFFICIENT_STEEL_ORE"
  | "INSUFFICIENT_MITHRIL";

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

const hasEnoughMaterial = (materials: MaterialStock, key: keyof MaterialStock, need: number): boolean => {
  return materials[key] >= need;
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

  const requiredForgeLevel = getRequiredForgeLevelForEnhance(target.plus);
  if (requiredForgeLevel === 3 && state.forgeLevel < requiredForgeLevel) {
    return { ok: false, reason: "FORGE_LEVEL_TOO_LOW_FOR_STEEL" };
  }
  if (requiredForgeLevel === 5 && state.forgeLevel < requiredForgeLevel) {
    return { ok: false, reason: "FORGE_LEVEL_TOO_LOW_FOR_MITHRIL" };
  }

  const requiredMaterials = getEnhanceMaterialCost(target.plus);
  const requiredIron = requiredMaterials.ironOre ?? 0;
  const requiredSteel = requiredMaterials.steelOre ?? 0;
  const requiredMithril = requiredMaterials.mithril ?? 0;

  if (!hasEnoughMaterial(state.materials, "ironOre", requiredIron)) {
    return { ok: false, reason: "INSUFFICIENT_IRON_ORE" };
  }
  if (!hasEnoughMaterial(state.materials, "steelOre", requiredSteel)) {
    return { ok: false, reason: "INSUFFICIENT_STEEL_ORE" };
  }
  if (!hasEnoughMaterial(state.materials, "mithril", requiredMithril)) {
    return { ok: false, reason: "INSUFFICIENT_MITHRIL" };
  }

  return { ok: true, target, material };
};
