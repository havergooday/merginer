import { INITIAL_HP, type EquipmentItem } from "@/domain/state";

export const calcBestPlus = (equipmentItems: EquipmentItem[]): number => {
  return equipmentItems.reduce((maxPlus, item) => (item.plus > maxPlus ? item.plus : maxPlus), 0);
};

export const calcAttack = (bestPlus: number): number => 5 + bestPlus * 2;

export const calcAttackFromEquipped = (equippedWeaponItemId: string | null, equipmentItems: EquipmentItem[]): number => {
  if (!equippedWeaponItemId) {
    return 5;
  }

  const equipped = equipmentItems.find((item) => item.id === equippedWeaponItemId && item.kind === "weapon");
  const plus = equipped ? equipped.plus : 0;
  return 5 + plus * 2;
};

export const calcMaxHpFromEquippedArmor = (equippedArmorItemId: string | null, equipmentItems: EquipmentItem[]): number => {
  if (!equippedArmorItemId) {
    return INITIAL_HP;
  }

  const equipped = equipmentItems.find((item) => item.id === equippedArmorItemId && item.kind === "armor");
  const bonus = equipped ? equipped.plus : 0;
  return INITIAL_HP + bonus;
};
