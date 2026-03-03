#!/usr/bin/env node

const INITIAL_HP = 10;
const MAX_FORGE_LEVEL = 10;
const BASE_CRAFT_COST = 10;
const MIN_CRAFT_COST = 5;
const BASE_FORGE_UPGRADE_COST = 100;

const STRATEGY_PRESETS = {
  conservative: {
    name: "conservative",
    floor2: { attack: 4, maxHp: 16 },
    floor3: { attack: 8, maxHp: 24 },
  },
  balanced: {
    name: "balanced",
    floor2: { attack: 3, maxHp: 14 },
    floor3: { attack: 6, maxHp: 20 },
  },
  aggressive: {
    name: "aggressive",
    floor2: { attack: 2, maxHp: 12 },
    floor3: { attack: 5, maxHp: 16 },
  },
};

const parseArgs = (argv) => {
  const args = {
    balancedDelta: 1,
    maxLoops: 100_000,
    json: false,
    out: null,
    top: 10,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--delta" && next) {
      args.balancedDelta = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--max-loops" && next) {
      args.maxLoops = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--top" && next) {
      args.top = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--out" && next) {
      args.out = next;
      i += 1;
    }
  }
  return args;
};

const getCraftCost = (forgeLevel) => {
  const effectiveLevel = Math.max(0, Math.min(MAX_FORGE_LEVEL, Math.floor(forgeLevel)));
  return Math.max(MIN_CRAFT_COST, BASE_CRAFT_COST - Math.floor((effectiveLevel + 1) / 2));
};

const getNextForgeUpgradeCost = (currentCost) => Math.ceil(currentCost * 1.5);

const canUpgradeForge = (forgeLevel) => forgeLevel < MAX_FORGE_LEVEL;

const getRequiredForgeLevelForEnhance = (plus) => {
  const normalizedPlus = Math.max(0, Math.floor(plus));
  if (normalizedPlus >= 10) return 5;
  if (normalizedPlus >= 6) return 3;
  return 0;
};

const getEnhanceMaterialCost = (plus) => {
  const normalizedPlus = Math.max(0, Math.floor(plus));
  if (normalizedPlus >= 10) {
    return { ironOre: normalizedPlus, steelOre: 0, mithril: normalizedPlus };
  }
  if (normalizedPlus >= 6) {
    return { ironOre: normalizedPlus, steelOre: normalizedPlus, mithril: 0 };
  }
  return { ironOre: normalizedPlus, steelOre: 0, mithril: 0 };
};

const getStageTier = (stage) => {
  if (stage <= 3) return 1;
  if (stage <= 6) return 2;
  if (stage <= 9) return 3;
  return 4;
};

const getMonsterStats = (floor, stage) => {
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

const getStageReward = (floor, stage) => {
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

const simulateExplore = ({ floor, hp, attack }) => {
  let currentHp = Math.max(0, hp);
  const currentAttack = Math.max(1, attack);
  const totalReward = { ironOre: 0, steelOre: 0, mithril: 0 };
  for (let stage = 1; stage <= 10; stage += 1) {
    const monster = getMonsterStats(floor, stage);
    const reward = getStageReward(floor, stage);
    const hits = Math.ceil(monster.hp / currentAttack);
    const damageTaken = Math.max(0, hits - 1) * monster.attack;
    currentHp = Math.max(0, currentHp - damageTaken);
    totalReward.ironOre += reward.ironOre;
    totalReward.steelOre += reward.steelOre;
    totalReward.mithril += reward.mithril;
    if (currentHp <= 0) {
      return { totalReward, finalHp: 0, endReason: "DEFEATED" };
    }
  }
  return { totalReward, finalHp: currentHp, endReason: "FLOOR_CLEARED" };
};

const getBestItemIdByKind = (items, kind) => {
  const target = items
    .filter((item) => item.kind === kind)
    .sort((a, b) => b.plus - a.plus || a.id.localeCompare(b.id))[0];
  return target ? target.id : null;
};

const getEquippedPlus = (state, kind) => {
  const equippedId = kind === "weapon" ? state.equippedWeaponItemId : state.equippedArmorItemId;
  if (!equippedId) return 0;
  const target = state.equipmentItems.find((item) => item.id === equippedId && item.kind === kind);
  return target ? target.plus : 0;
};

const getAttack = (state) => 1 + getEquippedPlus(state, "weapon");
const getMaxHp = (state) => INITIAL_HP + getEquippedPlus(state, "armor") * 2;

const determineFloor = (attack, maxHp, policy) => {
  if (attack >= policy.floor3.attack && maxHp >= policy.floor3.maxHp) return 3;
  if (attack >= policy.floor2.attack && maxHp >= policy.floor2.maxHp) return 2;
  return 1;
};

const makeInitialState = () => ({
  materials: { ironOre: 0, steelOre: 0, mithril: 0 },
  exploreCount: 0,
  restCount: 0,
  equipmentItems: [{ id: "i-1", kind: "weapon", plus: 0 }],
  bestPlus: 0,
  hp: INITIAL_HP,
  equippedWeaponItemId: null,
  equippedArmorItemId: null,
  nextItemId: 2,
  forgeLevel: 0,
  forgeUpgradeCost: BASE_FORGE_UPGRADE_COST,
});

const equipBest = (state) => ({
  ...state,
  equippedWeaponItemId: getBestItemIdByKind(state.equipmentItems, "weapon"),
  equippedArmorItemId: getBestItemIdByKind(state.equipmentItems, "armor"),
});

const recalcBestPlus = (items) => items.reduce((max, item) => (item.plus > max ? item.plus : max), 0);

const chooseEnhancePair = (state) => {
  const candidates = state.equipmentItems;
  const grouped = new Map();
  for (const item of candidates) {
    const key = `${item.kind}:${item.plus}`;
    const group = grouped.get(key) ?? [];
    group.push(item);
    grouped.set(key, group);
  }

  const keys = Array.from(grouped.keys()).sort((a, b) => Number(b.split(":")[1]) - Number(a.split(":")[1]));
  for (const key of keys) {
    const group = grouped.get(key);
    if (!group || group.length < 2) continue;
    const target = group[0];
    const material = group[1];
    if (target.plus !== material.plus || target.kind !== material.kind) continue;
    const requiredForge = getRequiredForgeLevelForEnhance(target.plus);
    if (requiredForge > state.forgeLevel) continue;
    const cost = getEnhanceMaterialCost(target.plus);
    if (state.materials.ironOre < cost.ironOre) continue;
    if (state.materials.steelOre < cost.steelOre) continue;
    if (state.materials.mithril < cost.mithril) continue;
    return { target, material };
  }
  return null;
};

const chooseCraftKind = (state, policy, attack, maxHp) => {
  const target = attack >= policy.floor2.attack && maxHp >= policy.floor2.maxHp ? policy.floor3 : policy.floor2;
  if (attack < target.attack) return "weapon";
  if (maxHp < target.maxHp) return "armor";
  const weaponCount = state.equipmentItems.filter((item) => item.kind === "weapon").length;
  const armorCount = state.equipmentItems.filter((item) => item.kind === "armor").length;
  return weaponCount <= armorCount ? "weapon" : "armor";
};

const runSingle = (policy, maxLoops) => {
  let state = equipBest(makeInitialState());
  const metrics = {
    name: policy.name,
    completed: false,
    abortedByLoopCap: false,
    completedExploreCount: null,
    exploreCount: 0,
    restCount: 0,
    forgeUpgradeCount: 0,
    craftWeaponCount: 0,
    craftArmorCount: 0,
    enhanceCountTotal: 0,
    enhanceCountByTier: { plus0to5: 0, plus6to9: 0, plus10Plus: 0 },
    exploreByFloor: { 1: 0, 2: 0, 3: 0 },
    plus5AtExplore: null,
    finalBestPlus: 0,
    finalAttack: 1,
    finalMaxHp: INITIAL_HP,
  };

  for (let loop = 0; loop < maxLoops; loop += 1) {
    state = equipBest(state);
    const attack = getAttack(state);
    const maxHp = getMaxHp(state);

    const pair = chooseEnhancePair(state);
    if (pair) {
      const nextPlus = pair.target.plus + 1;
      const cost = getEnhanceMaterialCost(pair.target.plus);
      const remaining = state.equipmentItems.filter((item) => item.id !== pair.target.id && item.id !== pair.material.id);
      const enhanced = { id: `i-${state.nextItemId}`, kind: pair.target.kind, plus: nextPlus };
      state = {
        ...state,
        equippedWeaponItemId:
          state.equippedWeaponItemId === pair.target.id || state.equippedWeaponItemId === pair.material.id
            ? null
            : state.equippedWeaponItemId,
        equippedArmorItemId:
          state.equippedArmorItemId === pair.target.id || state.equippedArmorItemId === pair.material.id
            ? null
            : state.equippedArmorItemId,
        materials: {
          ironOre: state.materials.ironOre - cost.ironOre,
          steelOre: state.materials.steelOre - cost.steelOre,
          mithril: state.materials.mithril - cost.mithril,
        },
        equipmentItems: [...remaining, enhanced],
        bestPlus: recalcBestPlus([...remaining, enhanced]),
        nextItemId: state.nextItemId + 1,
      };
      metrics.enhanceCountTotal += 1;
      if (pair.target.plus >= 10) metrics.enhanceCountByTier.plus10Plus += 1;
      else if (pair.target.plus >= 6) metrics.enhanceCountByTier.plus6to9 += 1;
      else metrics.enhanceCountByTier.plus0to5 += 1;
      if (metrics.plus5AtExplore === null && state.bestPlus >= 5) metrics.plus5AtExplore = state.exploreCount;
      continue;
    }

    const requiredForge = getRequiredForgeLevelForEnhance(state.bestPlus);
    const reserveForUpgrade =
      canUpgradeForge(state.forgeLevel) &&
      state.forgeLevel < requiredForge &&
      state.materials.ironOre < state.forgeUpgradeCost;

    const craftCost = getCraftCost(state.forgeLevel);
    const craftKind = chooseCraftKind(state, policy, attack, maxHp);
    if (!reserveForUpgrade && state.materials.ironOre >= craftCost) {
      const crafted = { id: `i-${state.nextItemId}`, kind: craftKind, plus: 0 };
      state = {
        ...state,
        materials: { ...state.materials, ironOre: state.materials.ironOre - craftCost },
        equipmentItems: [...state.equipmentItems, crafted],
        bestPlus: recalcBestPlus([...state.equipmentItems, crafted]),
        nextItemId: state.nextItemId + 1,
      };
      if (craftKind === "weapon") metrics.craftWeaponCount += 1;
      else metrics.craftArmorCount += 1;
      if (metrics.plus5AtExplore === null && state.bestPlus >= 5) metrics.plus5AtExplore = state.exploreCount;
      continue;
    }

    if (
      canUpgradeForge(state.forgeLevel) &&
      state.forgeLevel < requiredForge &&
      state.materials.ironOre >= state.forgeUpgradeCost
    ) {
      const nextLevel = state.forgeLevel + 1;
      state = {
        ...state,
        materials: { ...state.materials, ironOre: state.materials.ironOre - state.forgeUpgradeCost },
        forgeLevel: nextLevel,
        forgeUpgradeCost: canUpgradeForge(nextLevel) ? getNextForgeUpgradeCost(state.forgeUpgradeCost) : state.forgeUpgradeCost,
      };
      metrics.forgeUpgradeCount += 1;
      continue;
    }

    if (state.hp < maxHp) {
      state = { ...state, hp: maxHp, restCount: state.restCount + 1 };
      metrics.restCount += 1;
      continue;
    }

    const floor = determineFloor(attack, maxHp, policy);
    const explore = simulateExplore({ floor, hp: state.hp, attack });
    state = {
      ...state,
      hp: explore.finalHp,
      exploreCount: state.exploreCount + 1,
      materials: {
        ironOre: state.materials.ironOre + explore.totalReward.ironOre,
        steelOre: state.materials.steelOre + explore.totalReward.steelOre,
        mithril: state.materials.mithril + explore.totalReward.mithril,
      },
    };
    metrics.exploreByFloor[floor] += 1;
    metrics.exploreCount = state.exploreCount;
    if (metrics.plus5AtExplore === null && state.bestPlus >= 5) metrics.plus5AtExplore = state.exploreCount;

    if (floor === 3 && explore.endReason === "FLOOR_CLEARED") {
      metrics.completed = true;
      metrics.completedExploreCount = state.exploreCount;
      break;
    }
  }

  if (!metrics.completed) metrics.abortedByLoopCap = true;
  state = equipBest(state);
  metrics.finalBestPlus = state.bestPlus;
  metrics.finalAttack = getAttack(state);
  metrics.finalMaxHp = getMaxHp(state);
  return metrics;
};

const createDefaultPolicies = (delta) => {
  const policies = [STRATEGY_PRESETS.conservative, STRATEGY_PRESETS.balanced, STRATEGY_PRESETS.aggressive];
  const base = STRATEGY_PRESETS.balanced;
  const deltas = Array.from({ length: delta * 2 + 1 }, (_, i) => i - delta);
  for (const dAtk2 of deltas) {
    for (const dHp2 of deltas) {
      for (const dAtk3 of deltas) {
        for (const dHp3 of deltas) {
          if (dAtk2 === 0 && dHp2 === 0 && dAtk3 === 0 && dHp3 === 0) continue;
          const floor2 = {
            attack: Math.max(1, base.floor2.attack + dAtk2),
            maxHp: Math.max(1, base.floor2.maxHp + dHp2),
          };
          const floor3 = {
            attack: Math.max(1, base.floor3.attack + dAtk3),
            maxHp: Math.max(1, base.floor3.maxHp + dHp3),
          };
          if (floor3.attack < floor2.attack || floor3.maxHp < floor2.maxHp) continue;
          policies.push({
            name: `balanced[a2${dAtk2 >= 0 ? "+" : ""}${dAtk2},h2${dHp2 >= 0 ? "+" : ""}${dHp2},a3${dAtk3 >= 0 ? "+" : ""}${dAtk3},h3${dHp3 >= 0 ? "+" : ""}${dHp3}]`,
            floor2,
            floor3,
          });
        }
      }
    }
  }
  return policies;
};

const sortReports = (a, b) => {
  if (a.completed !== b.completed) return a.completed ? -1 : 1;
  if (a.exploreCount !== b.exploreCount) return a.exploreCount - b.exploreCount;
  return a.restCount - b.restCount;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const policies = createDefaultPolicies(options.balancedDelta);
  const reports = policies.map((policy) => runSingle(policy, options.maxLoops)).sort(sortReports);

  const topRows = reports.slice(0, options.top).map((report) => ({
    name: report.name,
    explore: report.exploreCount,
    rest: report.restCount,
    plus5At: report.plus5AtExplore,
    floor1: report.exploreByFloor[1],
    floor2: report.exploreByFloor[2],
    floor3: report.exploreByFloor[3],
  }));
  console.table(topRows);

  if (options.json || options.out) {
    const output = {
      generatedAt: new Date().toISOString(),
      options,
      policyCount: policies.length,
      top: reports.slice(0, options.top),
      all: reports,
    };
    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
    }
    if (options.out) {
      const fs = await import("node:fs/promises");
      await fs.mkdir((await import("node:path")).dirname(options.out), { recursive: true });
      await fs.writeFile(options.out, JSON.stringify(output, null, 2), "utf8");
      console.log(`saved: ${options.out}`);
    }
  }
};

main();
