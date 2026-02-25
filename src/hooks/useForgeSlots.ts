import { useMemo, useState } from "react";

import type { EquipmentItem } from "@/domain/state";

type Slot = "target" | "material";

export const useForgeSlots = (itemMap: Map<string, EquipmentItem>) => {
  const [forgeTargetItemId, setForgeTargetItemId] = useState<string | null>(null);
  const [forgeMaterialItemId, setForgeMaterialItemId] = useState<string | null>(null);

  const selectedTarget = useMemo(
    () => (forgeTargetItemId ? itemMap.get(forgeTargetItemId) ?? null : null),
    [forgeTargetItemId, itemMap],
  );
  const selectedMaterial = useMemo(
    () => (forgeMaterialItemId ? itemMap.get(forgeMaterialItemId) ?? null : null),
    [forgeMaterialItemId, itemMap],
  );

  const handleDropToForgeSlot = (slot: Slot, itemId: string) => {
    const dragged = itemMap.get(itemId);
    if (!dragged) {
      return;
    }

    if (slot === "target") {
      if (itemId === forgeMaterialItemId) {
        return;
      }
      setForgeTargetItemId(itemId);
      return;
    }

    if (itemId === forgeTargetItemId) {
      return;
    }
    setForgeMaterialItemId(itemId);
  };

  const clearSlots = () => {
    setForgeTargetItemId(null);
    setForgeMaterialItemId(null);
  };

  return {
    forgeTargetItemId,
    forgeMaterialItemId,
    selectedTarget,
    selectedMaterial,
    setForgeTargetItemId,
    setForgeMaterialItemId,
    handleDropToForgeSlot,
    clearSlots,
  };
};

