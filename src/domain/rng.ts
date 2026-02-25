export type RngResult = {
  value: number;
  nextSeed: number;
};

const MODULUS = 2147483647;
const MULTIPLIER = 48271;

const normalizeSeed = (seed: number): number => {
  const normalized = Math.abs(Math.trunc(seed)) % MODULUS;
  return normalized === 0 ? 1 : normalized;
};

export const nextRandom = (seed: number): RngResult => {
  const current = normalizeSeed(seed);
  const nextSeed = (current * MULTIPLIER) % MODULUS;
  return {
    value: nextSeed / MODULUS,
    nextSeed,
  };
};

export const randomInt = (seed: number, min: number, max: number): RngResult => {
  const { value, nextSeed } = nextRandom(seed);
  const clampedMin = Math.ceil(min);
  const clampedMax = Math.floor(max);
  const intValue = Math.floor(value * (clampedMax - clampedMin + 1)) + clampedMin;

  return {
    value: intValue,
    nextSeed,
  };
};

