import { describe, expect, it } from "vitest";

import { clampHpToMax, getMaxHp } from "@/domain/hp";

describe("hp helpers", () => {
  it("computes max hp from equipped armor plus", () => {
    const maxHp = getMaxHp("i-10", [
      { id: "i-1", kind: "weapon", plus: 3 },
      { id: "i-10", kind: "armor", plus: 2 },
    ]);
    expect(maxHp).toBe(14);
  });

  it("clamps hp to max range", () => {
    expect(clampHpToMax(15, 12)).toBe(12);
    expect(clampHpToMax(-1, 12)).toBe(0);
    expect(clampHpToMax(8, 12)).toBe(8);
  });
});

