import { describe, expect, it } from "vitest";

import { reducer } from "@/domain/reducer";
import { createInitialGameState } from "@/domain/state";

describe("reducer", () => {
  it("crafts armor and weapon with level-based craft cost", () => {
    let state = { ...createInitialGameState(), ironOre: 20 };
    state = reducer(state, { type: "CRAFT_WEAPON" });
    state = reducer(state, { type: "CRAFT_ARMOR" });

    expect(state.ironOre).toBe(0);
    expect(state.equipmentItems.some((item) => item.kind === "weapon")).toBe(true);
    expect(state.equipmentItems.some((item) => item.kind === "armor")).toBe(true);
  });

  it("equips armor without increasing current hp", () => {
    const state = {
      ...createInitialGameState(),
      hp: 2,
      equipmentItems: [
        { id: "i-1", kind: "weapon" as const, plus: 0 },
        { id: "i-2", kind: "armor" as const, plus: 2 },
      ],
      equippedArmorItemId: null,
    };

    const next = reducer(state, { type: "EQUIP", itemId: "i-2", slot: "armor" });
    expect(next.equippedArmorItemId).toBe("i-2");
    expect(next.hp).toBe(2);
  });

  it("forges +0 with zero ore cost", () => {
    const state = {
      ...createInitialGameState(),
      ironOre: 0,
      equipmentItems: [
        { id: "i-1", kind: "weapon" as const, plus: 0 },
        { id: "i-2", kind: "weapon" as const, plus: 0 },
      ],
      nextItemId: 3,
    };

    const next = reducer(state, { type: "FORGE_ENHANCE", targetItemId: "i-1", materialItemId: "i-2" });
    expect(next.ironOre).toBe(0);
    expect(next.equipmentItems).toEqual([{ id: "i-3", kind: "weapon", plus: 1 }]);
  });

  it("forges same-kind same-plus items and consumes ore equal to plus", () => {
    const state = {
      ...createInitialGameState(),
      ironOre: 5,
      equipmentItems: [
        { id: "i-1", kind: "weapon" as const, plus: 5 },
        { id: "i-2", kind: "weapon" as const, plus: 5 },
      ],
      nextItemId: 3,
    };

    const next = reducer(state, { type: "FORGE_ENHANCE", targetItemId: "i-1", materialItemId: "i-2" });
    expect(next.ironOre).toBe(0);
    expect(next.equipmentItems).toEqual([{ id: "i-3", kind: "weapon", plus: 6 }]);
  });

  it("upgrades forge with increasing cost and caps at level 10", () => {
    let state = { ...createInitialGameState(), ironOre: 5000, forgeLevel: 9, forgeUpgradeCost: 3845 };

    state = reducer(state, { type: "UPGRADE_FORGE" });
    expect(state.forgeLevel).toBe(10);
    expect(state.ironOre).toBe(5000 - 3845);
    expect(state.forgeUpgradeCost).toBe(3845);

    const afterCap = reducer(state, { type: "UPGRADE_FORGE" });
    expect(afterCap).toEqual(state);
  });
});
