import type { EquipmentItem, EquipmentKind } from "@/domain/state";

export const canEquipToSlot = (item: EquipmentItem | null | undefined, slot: EquipmentKind): boolean => {
  return !!item && item.kind === slot;
};

