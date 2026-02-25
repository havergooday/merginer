import { describe, expect, it } from "vitest";

import { validateForge } from "@/domain/forge";
import { createInitialGameState, type GameState } from "@/domain/state";

const makeState = (): GameState => ({
  ...createInitialGameState(),
  materials: { ironOre: 50, steelOre: 50, mithril: 50 },
  equipmentItems: [
    { id: "i-1", kind: "weapon", plus: 0 },
    { id: "i-2", kind: "weapon", plus: 0 },
    { id: "i-3", kind: "armor", plus: 0 },
  ],
});

describe("validateForge", () => {
  it("accepts same-kind same-plus pair with materials", () => {
    const result = validateForge(makeState(), "i-1", "i-2");
    expect(result.ok).toBe(true);
  });

  it("accepts +0 forge with zero ore", () => {
    const state = { ...makeState(), materials: { ironOre: 0, steelOre: 0, mithril: 0 } };
    const result = validateForge(state, "i-1", "i-2");
    expect(result.ok).toBe(true);
  });

  it("rejects pair when item kind differs", () => {
    const result = validateForge(makeState(), "i-1", "i-3");
    expect(result).toEqual({ ok: false, reason: "KIND_MISMATCH" });
  });

  it("rejects when iron ore is insufficient for plus level", () => {
    const state = {
      ...makeState(),
      materials: { ironOre: 4, steelOre: 0, mithril: 0 },
      equipmentItems: [
        { id: "i-1", kind: "weapon" as const, plus: 5 },
        { id: "i-2", kind: "weapon" as const, plus: 5 },
        { id: "i-3", kind: "armor" as const, plus: 0 },
      ],
    };
    const result = validateForge(state, "i-1", "i-2");
    expect(result).toEqual({ ok: false, reason: "INSUFFICIENT_IRON_ORE" });
  });

  it("requires forge level 3+ for +6~+9 tier", () => {
    const lowLevel = {
      ...makeState(),
      forgeLevel: 2,
      equipmentItems: [
        { id: "i-1", kind: "weapon" as const, plus: 6 },
        { id: "i-2", kind: "weapon" as const, plus: 6 },
      ],
    };
    expect(validateForge(lowLevel, "i-1", "i-2")).toEqual({
      ok: false,
      reason: "FORGE_LEVEL_TOO_LOW_FOR_STEEL",
    });

    const enoughLevel = { ...lowLevel, forgeLevel: 3 };
    expect(validateForge(enoughLevel, "i-1", "i-2").ok).toBe(true);
  });

  it("requires steel ore for +6 tier", () => {
    const state = {
      ...makeState(),
      forgeLevel: 3,
      materials: { ironOre: 6, steelOre: 0, mithril: 0 },
      equipmentItems: [
        { id: "i-1", kind: "weapon" as const, plus: 6 },
        { id: "i-2", kind: "weapon" as const, plus: 6 },
      ],
    };
    expect(validateForge(state, "i-1", "i-2")).toEqual({
      ok: false,
      reason: "INSUFFICIENT_STEEL_ORE",
    });
  });

  it("requires forge level 5+ for +10 tier", () => {
    const lowLevel = {
      ...makeState(),
      forgeLevel: 4,
      equipmentItems: [
        { id: "i-1", kind: "weapon" as const, plus: 10 },
        { id: "i-2", kind: "weapon" as const, plus: 10 },
      ],
    };
    expect(validateForge(lowLevel, "i-1", "i-2")).toEqual({
      ok: false,
      reason: "FORGE_LEVEL_TOO_LOW_FOR_MITHRIL",
    });

    const enoughLevel = { ...lowLevel, forgeLevel: 5 };
    expect(validateForge(enoughLevel, "i-1", "i-2").ok).toBe(true);
  });

  it("requires mithril for +10 tier", () => {
    const state = {
      ...makeState(),
      forgeLevel: 5,
      materials: { ironOre: 10, steelOre: 0, mithril: 0 },
      equipmentItems: [
        { id: "i-1", kind: "weapon" as const, plus: 10 },
        { id: "i-2", kind: "weapon" as const, plus: 10 },
      ],
    };
    expect(validateForge(state, "i-1", "i-2")).toEqual({
      ok: false,
      reason: "INSUFFICIENT_MITHRIL",
    });
  });
});
