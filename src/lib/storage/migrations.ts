import { INITIAL_HP, type EquipmentItem, type GameState } from "@/domain/state";
import {
  calcArmorBonus,
  calcBestPlusFromItems,
  clampForgeLevel,
  defaultForgeUpgradeCost,
  expandSwordMapToItems,
  isEquipmentItem,
  maxItemNumber,
  normalizeFloor,
  normalizeMaterials,
  type LegacyState,
} from "@/lib/storage/schema";

export const migrateLegacyState = (value: unknown): GameState | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const v = value as LegacyState;

  if (typeof v.exploreCount !== "number" || typeof v.seed !== "number") {
    return null;
  }

  let equipmentItems: EquipmentItem[] = [];

  if (Array.isArray(v.equipmentItems) && v.equipmentItems.every((item) => isEquipmentItem(item))) {
    equipmentItems = v.equipmentItems;
  } else if (
    Array.isArray(v.swordItems) &&
    v.swordItems.every((item) => typeof item.id === "string" && typeof item.plus === "number")
  ) {
    equipmentItems = v.swordItems.map((item) => ({ id: item.id, kind: "weapon", plus: item.plus }));
  } else if (typeof v.swords === "object" && v.swords !== null) {
    equipmentItems = expandSwordMapToItems(v.swords, 1);
  } else {
    return null;
  }

  const equippedWeaponByExplicit =
    typeof v.equippedWeaponItemId === "string" &&
    equipmentItems.some((item) => item.id === v.equippedWeaponItemId && item.kind === "weapon")
      ? v.equippedWeaponItemId
      : null;

  const equippedWeaponByLegacyId =
    equippedWeaponByExplicit ??
    (typeof v.equippedItemId === "string" &&
    equipmentItems.some((item) => item.id === v.equippedItemId && item.kind === "weapon")
      ? v.equippedItemId
      : null);

  const equippedWeaponItemId =
    equippedWeaponByLegacyId ??
    (typeof v.equippedPlus === "number"
      ? (equipmentItems.find((item) => item.kind === "weapon" && item.plus === v.equippedPlus)?.id ?? null)
      : null);

  const equippedArmorItemId =
    typeof v.equippedArmorItemId === "string" &&
    equipmentItems.some((item) => item.id === v.equippedArmorItemId && item.kind === "armor")
      ? v.equippedArmorItemId
      : null;

  const derivedNextId = maxItemNumber(equipmentItems) + 1;
  const nextItemId =
    typeof v.nextItemId === "number" && Number.isInteger(v.nextItemId) && v.nextItemId >= derivedNextId
      ? v.nextItemId
      : derivedNextId;

  const maxHp = INITIAL_HP + calcArmorBonus(equipmentItems, equippedArmorItemId) * 2;
  const hp = typeof v.hp === "number" ? Math.min(Math.max(0, v.hp), maxHp) : maxHp;

  const forgeLevel = typeof v.forgeLevel === "number" ? clampForgeLevel(v.forgeLevel) : 0;
  const forgeUpgradeCost =
    typeof v.forgeUpgradeCost === "number" && Number.isFinite(v.forgeUpgradeCost) && v.forgeUpgradeCost > 0
      ? Math.ceil(v.forgeUpgradeCost)
      : defaultForgeUpgradeCost;

  const fallbackIronOre = typeof v.ironOre === "number" ? v.ironOre : 0;
  const materials = normalizeMaterials(v.materials, fallbackIronOre);

  return {
    materials,
    exploreCount: v.exploreCount,
    restCount: typeof v.restCount === "number" ? v.restCount : 0,
    equipmentItems,
    bestPlus: calcBestPlusFromItems(equipmentItems),
    seed: v.seed,
    hp,
    equippedWeaponItemId,
    equippedArmorItemId,
    nextItemId,
    forgeLevel,
    forgeUpgradeCost,
    unlockedFloor: normalizeFloor(typeof v.unlockedFloor === "number" ? v.unlockedFloor : v.currentFloor),
    currentFloor: normalizeFloor(v.currentFloor),
    currentStage: 0,
    isExploring: false,
  };
};
