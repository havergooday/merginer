import { useEffect, useRef, useState } from "react";

import type { EquipmentItem } from "@/domain/state";

type UsePendingUnequipArgs = {
  isActionLocked: boolean;
  isExploring: boolean;
  location: "village" | "inn" | "forge" | "explore";
  selectedInventoryItem: EquipmentItem | null;
  equippedWeapon: EquipmentItem | null;
  equippedArmor: EquipmentItem | null;
  onClickEquipSlot: (slot: "weapon" | "armor") => void;
  onConfirmUnequip: (slot: "weapon" | "armor") => void;
};

export const usePendingUnequip = ({
  isActionLocked,
  isExploring,
  location,
  selectedInventoryItem,
  equippedWeapon,
  equippedArmor,
  onClickEquipSlot,
  onConfirmUnequip,
}: UsePendingUnequipArgs) => {
  const [pendingUnequipSlot, setPendingUnequipSlot] = useState<"weapon" | "armor" | null>(null);
  const villageBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (location !== "village" || isExploring || selectedInventoryItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingUnequipSlot(null);
    }
  }, [location, isExploring, selectedInventoryItem]);

  useEffect(() => {
    if (!pendingUnequipSlot) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const pendingSelector = `.resource-village-equip-slot[data-slot="${pendingUnequipSlot}"]`;
      if (target.closest(pendingSelector)) {
        return;
      }
      if (villageBodyRef.current && villageBodyRef.current.contains(target)) {
        setPendingUnequipSlot(null);
        return;
      }
      setPendingUnequipSlot(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [pendingUnequipSlot]);

  const onVillageEquipSlotClick = (slot: "weapon" | "armor") => {
    if (isActionLocked) {
      return;
    }

    const equippedItem = slot === "weapon" ? equippedWeapon : equippedArmor;
    if (selectedInventoryItem) {
      onClickEquipSlot(slot);
      setPendingUnequipSlot(null);
      return;
    }

    if (!equippedItem) {
      setPendingUnequipSlot(null);
      return;
    }

    if (pendingUnequipSlot === slot) {
      onConfirmUnequip(slot);
      setPendingUnequipSlot(null);
      return;
    }

    setPendingUnequipSlot(slot);
  };

  return {
    villageBodyRef,
    pendingUnequipSlot,
    onVillageEquipSlotClick,
  };
};

