import type { EquipmentItem, GameState } from "@/domain/state";
import { INITIAL_HP } from "@/domain/state";

const STORAGE_KEY = "reinforce-lab-state";
const STATE_VERSION = 6;

type PersistedState = {
  stateVersion: number;
  gameState: GameState;
};

type LegacyState = Partial<GameState> & {
  swords?: Record<string, number>;
  equippedPlus?: number | null;
  swordItems?: Array<{ id: string; plus: number }>;
  equippedItemId?: string | null;
};

const isEquipmentItem = (value: unknown): value is EquipmentItem => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const v = value as Partial<EquipmentItem>;
  return (
    typeof v.id === "string" &&
    typeof v.plus === "number" &&
    (v.kind === "weapon" || v.kind === "armor")
  );
};

const calcBestPlusFromItems = (items: EquipmentItem[]): number => {
  return items.reduce((maxPlus, item) => (item.plus > maxPlus ? item.plus : maxPlus), 0);
};

const calcArmorBonus = (items: EquipmentItem[], equippedArmorItemId: string | null): number => {
  if (!equippedArmorItemId) {
    return 0;
  }

  const armor = items.find((item) => item.id === equippedArmorItemId && item.kind === "armor");
  return armor ? armor.plus : 0;
};

const maxItemNumber = (items: EquipmentItem[]): number => {
  return items.reduce((maxNum, item) => {
    const match = item.id.match(/-(\d+)$/);
    if (!match) {
      return maxNum;
    }

    const idNum = Number(match[1]);
    return idNum > maxNum ? idNum : maxNum;
  }, 0);
};

const expandSwordMapToItems = (swords: Record<string, number>, startId: number = 1): EquipmentItem[] => {
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

const isValidGameState = (value: unknown): value is GameState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const v = value as Partial<GameState>;
  if (
    typeof v.ironOre !== "number" ||
    typeof v.exploreCount !== "number" ||
    typeof v.restCount !== "number" ||
    typeof v.bestPlus !== "number" ||
    typeof v.seed !== "number" ||
    typeof v.hp !== "number" ||
    !Array.isArray(v.equipmentItems) ||
    typeof v.nextItemId !== "number"
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

const migrateGameState = (value: unknown): GameState | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const v = value as LegacyState;

  if (typeof v.ironOre !== "number" || typeof v.exploreCount !== "number" || typeof v.seed !== "number") {
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

  const maxHp = INITIAL_HP + calcArmorBonus(equipmentItems, equippedArmorItemId);
  const hp = typeof v.hp === "number" ? Math.min(Math.max(0, v.hp), maxHp) : maxHp;

  return {
    ironOre: v.ironOre,
    exploreCount: v.exploreCount,
    restCount: typeof v.restCount === "number" ? v.restCount : 0,
    equipmentItems,
    bestPlus: calcBestPlusFromItems(equipmentItems),
    seed: v.seed,
    hp,
    equippedWeaponItemId,
    equippedArmorItemId,
    nextItemId,
  };
};

export const loadState = (): GameState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (
      parsed.stateVersion !== STATE_VERSION &&
      parsed.stateVersion !== 5 &&
      parsed.stateVersion !== 4 &&
      parsed.stateVersion !== 3 &&
      parsed.stateVersion !== 2 &&
      parsed.stateVersion !== 1
    ) {
      return null;
    }

    if (isValidGameState(parsed.gameState)) {
      return parsed.gameState;
    }

    return migrateGameState(parsed.gameState);
  } catch {
    return null;
  }
};

export const saveState = (gameState: GameState): void => {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PersistedState = {
    stateVersion: STATE_VERSION,
    gameState,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};
