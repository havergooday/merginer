import { describe, expect, it } from "vitest";

import {
  canAssignToForgeMaterial,
  canAssignToForgeTarget,
  toggleSelectedItemId,
} from "@/domain/usecases/itemSelection";

describe("item selection helpers", () => {
  it("toggles selected item id on repeated click", () => {
    expect(toggleSelectedItemId(null, "i-1")).toBe("i-1");
    expect(toggleSelectedItemId("i-1", "i-1")).toBeNull();
  });

  it("allows assigning selected item to target when not matching material slot", () => {
    expect(canAssignToForgeTarget("i-1", "i-2")).toBe(true);
    expect(canAssignToForgeTarget("i-1", "i-1")).toBe(false);
  });

  it("allows assigning selected item to material when not matching target slot", () => {
    expect(canAssignToForgeMaterial("i-1", "i-2")).toBe(true);
    expect(canAssignToForgeMaterial("i-1", "i-1")).toBe(false);
  });
});

