import type { Floor, GameState, MaterialStock } from "@/domain/state";

export type ExploreApplyResult = {
  finalHp: number;
  clearedStage: number;
  endReason: "DEFEATED" | "FLOOR_CLEARED";
  reward: MaterialStock;
};

export const normalizeFloor = (floor: number): Floor => {
  if (floor <= 1) {
    return 1;
  }
  if (floor >= 3) {
    return 3;
  }
  return 2;
};

export const canStartExplore = (state: GameState, hp: number, playerAttack: number): boolean => {
  return !state.isExploring && hp > 0 && playerAttack > 0;
};

export const startExplore = (state: GameState): GameState => {
  return {
    ...state,
    isExploring: true,
    currentStage: 1,
    exploreCount: state.exploreCount + 1,
  };
};

export const applyExploreResult = (state: GameState, result: ExploreApplyResult): GameState => {
  const unlockedFloor =
    result.endReason === "FLOOR_CLEARED" && result.clearedStage >= 10
      ? state.currentFloor === 1
        ? 2
        : state.currentFloor === 2
          ? 3
          : 3
      : state.unlockedFloor;

  return {
    ...state,
    materials: {
      ironOre: state.materials.ironOre + result.reward.ironOre,
      steelOre: state.materials.steelOre + result.reward.steelOre,
      mithril: state.materials.mithril + result.reward.mithril,
    },
    hp: Math.max(0, result.finalHp),
    unlockedFloor,
    currentFloor: state.currentFloor > unlockedFloor ? unlockedFloor : state.currentFloor,
    currentStage: 0,
    isExploring: false,
  };
};
