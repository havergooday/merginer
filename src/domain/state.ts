export type EquipmentKind = "weapon" | "armor";

export type EquipmentItem = {
  id: string;
  kind: EquipmentKind;
  plus: number;
};

export type Floor = 1 | 2 | 3;

export type MaterialStock = {
  ironOre: number;
  steelOre: number;
  mithril: number;
};

export type GameState = {
  materials: MaterialStock;
  exploreCount: number;
  restCount: number;
  equipmentItems: EquipmentItem[];
  bestPlus: number;
  seed: number;
  hp: number;
  equippedWeaponItemId: string | null;
  equippedArmorItemId: string | null;
  nextItemId: number;
  forgeLevel: number;
  forgeUpgradeCost: number;
  currentFloor: Floor;
  currentStage: number;
  isExploring: boolean;
};

export const INITIAL_SEED = 123456789;
export const INITIAL_HP = 10;

export const createInitialGameState = (seed: number = INITIAL_SEED): GameState => ({
  materials: {
    ironOre: 0,
    steelOre: 0,
    mithril: 0,
  },
  exploreCount: 0,
  restCount: 0,
  equipmentItems: [{ id: "i-1", kind: "weapon", plus: 0 }],
  bestPlus: 0,
  seed,
  hp: INITIAL_HP,
  equippedWeaponItemId: null,
  equippedArmorItemId: null,
  nextItemId: 2,
  forgeLevel: 0,
  forgeUpgradeCost: 100,
  currentFloor: 1,
  currentStage: 0,
  isExploring: false,
});
