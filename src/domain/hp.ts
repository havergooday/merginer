import { INITIAL_HP, type EquipmentItem } from "@/domain/state";

export const getArmorBonus = (
  equippedArmorItemId: string | null,
  equipmentItems: EquipmentItem[],
): number => {
  if (!equippedArmorItemId) {
    return 0;
  }

  const armor = equipmentItems.find((item) => item.id === equippedArmorItemId && item.kind === "armor");
  return armor ? armor.plus : 0;
};

export const getMaxHp = (equippedArmorItemId: string | null, equipmentItems: EquipmentItem[]): number => {
  return INITIAL_HP + getArmorBonus(equippedArmorItemId, equipmentItems);
};

export const clampHpToMax = (hp: number, maxHp: number): number => {
  return Math.max(0, Math.min(hp, maxHp));
};

