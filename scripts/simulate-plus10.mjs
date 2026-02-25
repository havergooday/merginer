#!/usr/bin/env node

const MODULUS = 2147483647;
const MULTIPLIER = 48271;
const DEFAULT_HP = 10;

const parseArgs = (argv) => {
  const options = {
    runs: 100000,
    targetPlus: 10,
    initialSeed: 123456789,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--runs" && next) {
      options.runs = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--target-plus" && next) {
      options.targetPlus = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--initial-seed" && next) {
      options.initialSeed = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
    }
  }

  if (!Number.isInteger(options.runs) || options.runs <= 0) {
    throw new Error("--runs must be a positive integer");
  }
  if (!Number.isInteger(options.targetPlus) || options.targetPlus < 0) {
    throw new Error("--target-plus must be an integer >= 0");
  }
  if (!Number.isFinite(options.initialSeed)) {
    throw new Error("--initial-seed must be a finite number");
  }

  return options;
};

const normalizeSeed = (seed) => {
  const normalized = Math.abs(Math.trunc(seed)) % MODULUS;
  return normalized === 0 ? 1 : normalized;
};

const randomInt = (seed, min, max) => {
  const current = normalizeSeed(seed);
  const nextSeed = (current * MULTIPLIER) % MODULUS;
  const value = nextSeed / MODULUS;
  const intValue = Math.floor(value * (max - min + 1)) + min;
  return { value: intValue, nextSeed };
};

const calcBestPlus = (swords) => {
  let best = 0;
  for (const [plusText, count] of Object.entries(swords)) {
    if (count <= 0) {
      continue;
    }
    const plus = Number(plusText);
    if (plus > best) {
      best = plus;
    }
  }
  return best;
};

const fuseAll = (swords) => {
  let changed = true;
  while (changed) {
    changed = false;
    const entries = Object.keys(swords)
      .map((key) => Number(key))
      .sort((a, b) => a - b);

    for (const plus of entries) {
      const count = swords[plus] ?? 0;
      if (count < 2) {
        continue;
      }

      const pairs = Math.floor(count / 2);
      swords[plus] -= pairs * 2;
      if (swords[plus] <= 0) {
        delete swords[plus];
      }
      swords[plus + 1] = (swords[plus + 1] ?? 0) + pairs;
      changed = true;
    }
  }
};

const runSingleSimulation = (targetPlus, startSeed) => {
  let seed = normalizeSeed(startSeed);
  let hp = DEFAULT_HP;
  let ironOre = 0;
  let exploreCount = 0;
  let restCount = 0;
  const swords = { 0: 1 };

  while (calcBestPlus(swords) < targetPlus) {
    if (hp <= 0) {
      hp = DEFAULT_HP;
      restCount += 1;
      continue;
    }

    const roll = randomInt(seed, 1, 3);
    seed = roll.nextSeed;
    ironOre += roll.value;
    hp -= 1;
    exploreCount += 1;

    while (ironOre >= 10) {
      ironOre -= 10;
      swords[0] = (swords[0] ?? 0) + 1;
      fuseAll(swords);
    }
  }

  return { exploreCount, restCount };
};

const mean = (values) => values.reduce((acc, v) => acc + v, 0) / values.length;

const stdDev = (values, avg) => {
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));

  const exploreSamples = [];
  const restSamples = [];

  for (let i = 0; i < options.runs; i += 1) {
    const runSeed = normalizeSeed(options.initialSeed + i * 9973);
    const result = runSingleSimulation(options.targetPlus, runSeed);
    exploreSamples.push(result.exploreCount);
    restSamples.push(result.restCount);
  }

  const avgExploreCount = mean(exploreSamples);
  const avgRestCount = mean(restSamples);
  const stdExploreCount = stdDev(exploreSamples, avgExploreCount);
  const stdRestCount = stdDev(restSamples, avgRestCount);

  const output = {
    runs: options.runs,
    targetPlus: options.targetPlus,
    avgExploreCount,
    avgRestCount,
    stdExploreCount,
    stdRestCount,
    minExploreCount: Math.min(...exploreSamples),
    maxExploreCount: Math.max(...exploreSamples),
    minRestCount: Math.min(...restSamples),
    maxRestCount: Math.max(...restSamples),
    exploreToRestRatio: avgRestCount / avgExploreCount,
  };

  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.table(output);
};

main();
