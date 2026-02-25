import { getMaxHp } from "@/domain/hp";
import type { EquipmentItem } from "@/domain/state";

export const calcBestPlus = (equipmentItems: EquipmentItem[]): number => {
  return equipmentItems.reduce((maxPlus, item) => (item.plus > maxPlus ? item.plus : maxPlus), 0);
};

export const calcAttack = (bestPlus: number): number => 1 + bestPlus;

export const calcAttackFromEquipped = (equippedWeaponItemId: string | null, equipmentItems: EquipmentItem[]): number => {
  if (!equippedWeaponItemId) {
    return 1;
  }

  const equipped = equipmentItems.find((item) => item.id === equippedWeaponItemId && item.kind === "weapon");
  const plus = equipped ? equipped.plus : 0;
  return 1 + plus;
};

export const calcMaxHpFromEquippedArmor = (equippedArmorItemId: string | null, equipmentItems: EquipmentItem[]): number => {
  return getMaxHp(equippedArmorItemId, equipmentItems);
};

