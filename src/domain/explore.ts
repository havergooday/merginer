import type { Floor, MaterialStock } from "@/domain/state";

export type ExploreLog = {
  stage: number;
  monsterHp: number;
  monsterAttack: number;
  damageTaken: number;
  hpAfter: number;
  reward: MaterialStock;
};

export type ExploreResult = {
  logs: ExploreLog[];
  totalReward: MaterialStock;
  finalHp: number;
  clearedStage: number;
  endReason: "DEFEATED" | "FLOOR_CLEARED";
};

const getStageTier = (stage: number): 1 | 2 | 3 | 4 => {
  if (stage <= 3) {
    return 1;
  }
  if (stage <= 6) {
    return 2;
  }
  if (stage <= 9) {
    return 3;
  }
  return 4;
};

export const getMonsterStats = (floor: Floor, stage: number): { hp: number; attack: number } => {
  const tier = getStageTier(stage);
  if (floor === 1) {
    if (tier === 1) return { hp: 5, attack: 1 };
    if (tier === 2) return { hp: 7, attack: 2 };
    if (tier === 3) return { hp: 9, attack: 3 };
    return { hp: 20, attack: 5 };
  }
  if (floor === 2) {
    if (tier === 1) return { hp: 9, attack: 2 };
    if (tier === 2) return { hp: 11, attack: 3 };
    if (tier === 3) return { hp: 13, attack: 4 };
    return { hp: 26, attack: 6 };
  }
  if (tier === 1) return { hp: 13, attack: 3 };
  if (tier === 2) return { hp: 15, attack: 4 };
  if (tier === 3) return { hp: 17, attack: 5 };
  return { hp: 32, attack: 8 };
};

export const getStageReward = (floor: Floor, stage: number): MaterialStock => {
  const tier = getStageTier(stage);
  if (floor === 1) {
    if (tier === 1) return { ironOre: 1, steelOre: 0, mithril: 0 };
    if (tier === 2) return { ironOre: 2, steelOre: 0, mithril: 0 };
    if (tier === 3) return { ironOre: 3, steelOre: 0, mithril: 0 };
    return { ironOre: 5, steelOre: 0, mithril: 0 };
  }
  if (floor === 2) {
    if (tier === 1) return { ironOre: 2, steelOre: 1, mithril: 0 };
    if (tier === 2) return { ironOre: 3, steelOre: 1, mithril: 0 };
    if (tier === 3) return { ironOre: 4, steelOre: 2, mithril: 0 };
    return { ironOre: 6, steelOre: 3, mithril: 0 };
  }
  if (tier === 1) return { ironOre: 3, steelOre: 2, mithril: 1 };
  if (tier === 2) return { ironOre: 4, steelOre: 3, mithril: 1 };
  if (tier === 3) return { ironOre: 5, steelOre: 4, mithril: 2 };
  return { ironOre: 8, steelOre: 5, mithril: 3 };
};

type SimulateExploreInput = {
  floor: Floor;
  hp: number;
  attack: number;
};

export const simulateExplore = ({ floor, hp, attack }: SimulateExploreInput): ExploreResult => {
  let currentHp = Math.max(0, hp);
  const currentAttack = Math.max(1, attack);

  const logs: ExploreLog[] = [];
  const totalReward: MaterialStock = { ironOre: 0, steelOre: 0, mithril: 0 };

  for (let stage = 1; stage <= 10; stage += 1) {
    const monster = getMonsterStats(floor, stage);
    const reward = getStageReward(floor, stage);

    const hits = Math.ceil(monster.hp / currentAttack);
    const damageTaken = Math.max(0, hits - 1) * monster.attack;
    currentHp = Math.max(0, currentHp - damageTaken);

    totalReward.ironOre += reward.ironOre;
    totalReward.steelOre += reward.steelOre;
    totalReward.mithril += reward.mithril;

    logs.push({
      stage,
      monsterHp: monster.hp,
      monsterAttack: monster.attack,
      damageTaken,
      hpAfter: currentHp,
      reward,
    });

    if (currentHp <= 0) {
      return {
        logs,
        totalReward,
        finalHp: 0,
        clearedStage: stage,
        endReason: "DEFEATED",
      };
    }
  }

  return {
    logs,
    totalReward,
    finalHp: currentHp,
    clearedStage: 10,
    endReason: "FLOOR_CLEARED",
  };
};
