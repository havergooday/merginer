import { BASE_FORGE_UPGRADE_COST, MAX_FORGE_LEVEL } from "@/domain/forgeEconomy";
import type { EquipmentItem, Floor, GameState, MaterialStock } from "@/domain/state";

export const STORAGE_KEY = "reinforce-lab-state";
export const STATE_VERSION = 9;

export type PersistedState = {
  stateVersion: number;
  gameState: GameState;
};

export type LegacyState = Partial<GameState> & {
  swords?: Record<string, number>;
  equippedPlus?: number | null;
  swordItems?: Array<{ id: string; plus: number }>;
  equippedItemId?: string | null;
  ironOre?: number;
  materials?: Partial<MaterialStock>;
  currentFloor?: number;
};

export type PersistedStateParser = (value: unknown) => GameState | null;

export const isEquipmentItem = (value: unknown): value is EquipmentItem => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const v = value as Partial<EquipmentItem>;
  return typeof v.id === "string" && typeof v.plus === "number" && (v.kind === "weapon" || v.kind === "armor");
};

export const calcBestPlusFromItems = (items: EquipmentItem[]): number => {
  return items.reduce((maxPlus, item) => (item.plus > maxPlus ? item.plus : maxPlus), 0);
};

export const calcArmorBonus = (items: EquipmentItem[], equippedArmorItemId: string | null): number => {
  if (!equippedArmorItemId) {
    return 0;
  }

  const armor = items.find((item) => item.id === equippedArmorItemId && item.kind === "armor");
  return armor ? armor.plus : 0;
};

export const maxItemNumber = (items: EquipmentItem[]): number => {
  return items.reduce((maxNum, item) => {
    const match = item.id.match(/-(\d+)$/);
    if (!match) {
      return maxNum;
    }

    const idNum = Number(match[1]);
    return idNum > maxNum ? idNum : maxNum;
  }, 0);
};

export const expandSwordMapToItems = (swords: Record<string, number>, startId: number = 1): EquipmentItem[] => {
  const items: EquipmentItem[] = [];
  let idNum = startId;

  const sortedEntries = Object.entries(swords)
    .map(([plusText, count]) => ({ plus: Number(plusText), count: Math.floor(count) }))
    .filter((entry) => Number.isInteger(entry.plus) && entry.plus >= 0 && entry.count > 0)
    .sort((a, b) => a.plus - b.plus);

  for (const entry of sortedEntries) {
    for (let i = 0; i < entry.count; i += 1) {
      items.push({ id: `i-${idNum}`, kind: "weapon", plus: entry.plus });
      idNum += 1;
    }
  }

  return items;
};

export const clampForgeLevel = (level: number): number => {
  return Math.max(0, Math.min(MAX_FORGE_LEVEL, Math.floor(level)));
};

export const defaultForgeUpgradeCost = BASE_FORGE_UPGRADE_COST;

export const normalizeFloor = (floor: number | undefined): Floor => {
  if (floor === 2) {
    return 2;
  }
  if (floor === 3) {
    return 3;
  }
  return 1;
};

export const normalizeMaterials = (value: unknown, fallbackIronOre: number): MaterialStock => {
  const base = typeof value === "object" && value !== null ? (value as Partial<MaterialStock>) : {};
  const ironOre =
    typeof base.ironOre === "number"
      ? base.ironOre
      : typeof fallbackIronOre === "number"
        ? fallbackIronOre
        : 0;

  return {
    ironOre,
    steelOre: typeof base.steelOre === "number" ? base.steelOre : 0,
    mithril: typeof base.mithril === "number" ? base.mithril : 0,
  };
};

export const isValidStateV9 = (value: unknown): value is GameState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const v = value as Partial<GameState>;
  const materials = v.materials as Partial<MaterialStock> | undefined;
  if (
    typeof v.exploreCount !== "number" ||
    typeof v.restCount !== "number" ||
    typeof v.bestPlus !== "number" ||
    typeof v.seed !== "number" ||
    typeof v.hp !== "number" ||
    !Array.isArray(v.equipmentItems) ||
    typeof v.nextItemId !== "number" ||
    typeof v.forgeLevel !== "number" ||
    typeof v.forgeUpgradeCost !== "number" ||
    (v.unlockedFloor !== undefined && v.unlockedFloor !== 1 && v.unlockedFloor !== 2 && v.unlockedFloor !== 3) ||
    !materials ||
    typeof materials.ironOre !== "number" ||
    typeof materials.steelOre !== "number" ||
    typeof materials.mithril !== "number" ||
    (v.currentFloor !== 1 && v.currentFloor !== 2 && v.currentFloor !== 3) ||
    typeof v.currentStage !== "number" ||
    typeof v.isExploring !== "boolean"
  ) {
    return false;
  }

  if (!v.equipmentItems.every((item) => isEquipmentItem(item))) {
    return false;
  }

  if (!(v.equippedWeaponItemId === null || typeof v.equippedWeaponItemId === "string")) {
    return false;
  }
  if (!(v.equippedArmorItemId === null || typeof v.equippedArmorItemId === "string")) {
    return false;
  }

  if (
    typeof v.equippedWeaponItemId === "string" &&
    !v.equipmentItems.some((item) => item.id === v.equippedWeaponItemId && item.kind === "weapon")
  ) {
    return false;
  }
  if (
    typeof v.equippedArmorItemId === "string" &&
    !v.equipmentItems.some((item) => item.id === v.equippedArmorItemId && item.kind === "armor")
  ) {
    return false;
  }

  return true;
};
