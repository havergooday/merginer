import { describe, expect, it } from "vitest";

import { validateForge } from "@/domain/forge";
import { createInitialGameState, type GameState } from "@/domain/state";

const makeState = (): GameState => ({
  ...createInitialGameState(),
  ironOre: 10,
  equipmentItems: [
    { id: "i-1", kind: "weapon", plus: 0 },
    { id: "i-2", kind: "weapon", plus: 0 },
    { id: "i-3", kind: "armor", plus: 0 },
  ],
});

describe("validateForge", () => {
  it("accepts same-kind same-plus pair with ore", () => {
    const result = validateForge(makeState(), "i-1", "i-2");
    expect(result.ok).toBe(true);
  });

  it("accepts +0 forge with zero ore", () => {
    const state = { ...makeState(), ironOre: 0 };
    const result = validateForge(state, "i-1", "i-2");
    expect(result.ok).toBe(true);
  });

  it("rejects pair when item kind differs", () => {
    const result = validateForge(makeState(), "i-1", "i-3");
    expect(result).toEqual({ ok: false, reason: "KIND_MISMATCH" });
  });

  it("rejects when ore is insufficient for plus level", () => {
    const state = {
      ...makeState(),
      ironOre: 4,
      equipmentItems: [
        { id: "i-1", kind: "weapon" as const, plus: 5 },
        { id: "i-2", kind: "weapon" as const, plus: 5 },
        { id: "i-3", kind: "armor" as const, plus: 0 },
      ],
    };
    const result = validateForge(state, "i-1", "i-2");
    expect(result).toEqual({ ok: false, reason: "INSUFFICIENT_ORE" });
  });
});
