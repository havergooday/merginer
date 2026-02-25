import type { Floor, GameState, MaterialStock } from "@/domain/state";

export type ExploreApplyResult = {
  finalHp: number;
  clearedStage: number;
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
  return {
    ...state,
    materials: {
      ironOre: state.materials.ironOre + result.reward.ironOre,
      steelOre: state.materials.steelOre + result.reward.steelOre,
      mithril: state.materials.mithril + result.reward.mithril,
    },
    hp: Math.max(0, result.finalHp),
    currentStage: 0,
    isExploring: false,
  };
};
