import { describe, expect, it } from "vitest";

import { reducer } from "@/domain/reducer";
import { createInitialGameState, type GameState } from "@/domain/state";

describe("reducer", () => {
  it("crafts armor and weapon with level-based craft cost", () => {
    let state: GameState = { ...createInitialGameState(), materials: { ironOre: 20, steelOre: 0, mithril: 0 } };
    state = reducer(state, { type: "CRAFT_WEAPON" });
    state = reducer(state, { type: "CRAFT_ARMOR" });

    expect(state.materials.ironOre).toBe(0);
    expect(state.equipmentItems.some((item) => item.kind === "weapon")).toBe(true);
    expect(state.equipmentItems.some((item) => item.kind === "armor")).toBe(true);
  });

  it("equips armor without increasing current hp", () => {
    const state: GameState = {
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
    expect(next.hp).toBeLessThanOrEqual(14);
  });

  it("starts explore and waits for explicit result apply", () => {
    const state: GameState = {
      ...createInitialGameState(),
      hp: 10,
      currentFloor: 1,
      equippedWeaponItemId: null,
      materials: { ironOre: 0, steelOre: 0, mithril: 0 },
    };

    const exploring = reducer(state, { type: "START_EXPLORE" });
    expect(exploring.isExploring).toBe(true);
    expect(exploring.currentStage).toBe(1);
    expect(exploring.exploreCount).toBe(state.exploreCount + 1);

    const applied = reducer(exploring, {
      type: "APPLY_EXPLORE_RESULT",
      result: {
        finalHp: 4,
        clearedStage: 5,
        reward: { ironOre: 9, steelOre: 1, mithril: 0 },
      },
    });
    expect(applied.isExploring).toBe(false);
    expect(applied.currentStage).toBe(0);
    expect(applied.hp).toBe(4);
    expect(applied.materials).toEqual({ ironOre: 9, steelOre: 1, mithril: 0 });
  });

  it("blocks town actions while exploring", () => {
    const state: GameState = {
      ...createInitialGameState(),
      isExploring: true,
      currentStage: 3,
      materials: { ironOre: 999, steelOre: 999, mithril: 999 },
    };

    expect(reducer(state, { type: "CRAFT_WEAPON" })).toEqual(state);
    expect(reducer(state, { type: "FORGE_ENHANCE", targetItemId: "i-1", materialItemId: "i-1" })).toEqual(state);
    expect(reducer(state, { type: "REST" })).toEqual(state);
    expect(reducer(state, { type: "EQUIP", itemId: "i-1", slot: "weapon" })).toEqual(state);
    expect(reducer(state, { type: "SET_FLOOR", floor: 2 })).toEqual(state);
  });

  it("ignores result apply when not exploring", () => {
    const state: GameState = createInitialGameState();
    const next = reducer(state, {
      type: "APPLY_EXPLORE_RESULT",
      result: {
        finalHp: 0,
        clearedStage: 0,
        reward: { ironOre: 999, steelOre: 999, mithril: 999 },
      },
    });
    expect(next).toEqual(state);
  });

  it("applies floor 1-like reward as payload", () => {
    let state: GameState = {
      ...createInitialGameState(),
      hp: 100,
      currentFloor: 1,
      materials: { ironOre: 0, steelOre: 0, mithril: 0 },
    };

    state = reducer(state, { type: "START_EXPLORE" });
    state = reducer(state, {
      type: "APPLY_EXPLORE_RESULT",
      result: {
        finalHp: 80,
        clearedStage: 10,
        reward: { ironOre: 23, steelOre: 0, mithril: 0 },
      },
    });

    expect(state.materials.ironOre).toBeGreaterThan(0);
    expect(state.materials.steelOre).toBe(0);
    expect(state.materials.mithril).toBe(0);
  });

  it("applies floor 2-like reward as payload", () => {
    let state: GameState = {
      ...createInitialGameState(),
      hp: 100,
      currentFloor: 2,
      materials: { ironOre: 0, steelOre: 0, mithril: 0 },
    };

    state = reducer(state, { type: "START_EXPLORE" });
    state = reducer(state, {
      type: "APPLY_EXPLORE_RESULT",
      result: {
        finalHp: 60,
        clearedStage: 10,
        reward: { ironOre: 29, steelOre: 11, mithril: 0 },
      },
    });

    expect(state.materials.ironOre).toBeGreaterThan(0);
    expect(state.materials.steelOre).toBeGreaterThan(0);
    expect(state.materials.mithril).toBe(0);
  });

  it("applies floor 3-like reward as payload", () => {
    let state: GameState = {
      ...createInitialGameState(),
      hp: 100,
      currentFloor: 3,
      materials: { ironOre: 0, steelOre: 0, mithril: 0 },
    };

    state = reducer(state, { type: "START_EXPLORE" });
    state = reducer(state, {
      type: "APPLY_EXPLORE_RESULT",
      result: {
        finalHp: 50,
        clearedStage: 10,
        reward: { ironOre: 37, steelOre: 18, mithril: 7 },
      },
    });

    expect(state.materials.ironOre).toBeGreaterThan(0);
    expect(state.materials.steelOre).toBeGreaterThan(0);
    expect(state.materials.mithril).toBeGreaterThan(0);
  });

  it("forges +6 and consumes iron+steel", () => {
    const state: GameState = {
      ...createInitialGameState(),
      forgeLevel: 3,
      materials: { ironOre: 6, steelOre: 6, mithril: 0 },
      equipmentItems: [
        { id: "i-1", kind: "weapon" as const, plus: 6 },
        { id: "i-2", kind: "weapon" as const, plus: 6 },
      ],
      nextItemId: 3,
    };

    const next = reducer(state, { type: "FORGE_ENHANCE", targetItemId: "i-1", materialItemId: "i-2" });
    expect(next.materials).toEqual({ ironOre: 0, steelOre: 0, mithril: 0 });
    expect(next.equipmentItems).toEqual([{ id: "i-3", kind: "weapon", plus: 7 }]);
  });

  it("upgrades forge with increasing cost and caps at level 10", () => {
    let state: GameState = {
      ...createInitialGameState(),
      materials: { ironOre: 5000, steelOre: 0, mithril: 0 },
      forgeLevel: 9,
      forgeUpgradeCost: 3845,
    };

    state = reducer(state, { type: "UPGRADE_FORGE" });
    expect(state.forgeLevel).toBe(10);
    expect(state.materials.ironOre).toBe(5000 - 3845);
    expect(state.forgeUpgradeCost).toBe(3845);

    const afterCap = reducer(state, { type: "UPGRADE_FORGE" });
    expect(afterCap).toEqual(state);
  });
});
