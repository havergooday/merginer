import { describe, expect, it } from "vitest";

import { isValidStateV7, migrateLegacyState } from "@/lib/storage";

describe("storage migrations", () => {
  it("migrates legacy sword map with equippedPlus", () => {
    const migrated = migrateLegacyState({
      ironOre: 0,
      exploreCount: 1,
      seed: 123,
      swords: { 0: 1, 2: 1 },
      equippedPlus: 2,
    });

    expect(migrated).not.toBeNull();
    expect(migrated?.equipmentItems.some((item) => item.kind === "weapon")).toBe(true);
    expect(migrated?.equippedWeaponItemId).not.toBeNull();
    expect(migrated?.forgeLevel).toBe(0);
    expect(migrated?.forgeUpgradeCost).toBe(100);
  });

  it("migrates v5-style swordItems to equipmentItems", () => {
    const migrated = migrateLegacyState({
      ironOre: 3,
      exploreCount: 5,
      seed: 555,
      swordItems: [
        { id: "s-1", plus: 0 },
        { id: "s-2", plus: 1 },
      ],
      equippedItemId: "s-2",
    });

    expect(migrated).not.toBeNull();
    expect(migrated?.equipmentItems.every((item) => item.kind === "weapon")).toBe(true);
  });

  it("accepts fully valid v7 state", () => {
    const state = {
      ironOre: 1,
      exploreCount: 0,
      restCount: 0,
      equipmentItems: [{ id: "i-1", kind: "weapon", plus: 0 }],
      bestPlus: 0,
      seed: 1,
      hp: 10,
      equippedWeaponItemId: null,
      equippedArmorItemId: null,
      nextItemId: 2,
      forgeLevel: 0,
      forgeUpgradeCost: 100,
    };

    expect(isValidStateV7(state)).toBe(true);
  });
});

