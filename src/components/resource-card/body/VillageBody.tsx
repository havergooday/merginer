import type { RefObject } from "react";

import type { EquipmentItem } from "@/domain/state";

type VillageBodyProps = {
  isActionLocked: boolean;
  equippedWeapon: EquipmentItem | null;
  equippedArmor: EquipmentItem | null;
  pendingUnequipSlot: "weapon" | "armor" | null;
  villageBodyRef: RefObject<HTMLDivElement | null>;
  onVillageEquipSlotClick: (slot: "weapon" | "armor") => void;
};

export const VillageBody = ({
  isActionLocked,
  equippedWeapon,
  equippedArmor,
  pendingUnequipSlot,
  villageBodyRef,
  onVillageEquipSlotClick,
}: VillageBodyProps) => (
  <div className="resource-village-body" ref={villageBodyRef}>
    <div className="resource-village-layout">
      <div className="resource-village-character-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/character/knight_i.png" alt="캐릭터" className="resource-village-character-image" />
      </div>

      <div className="resource-village-equip-stack">
        <button
          type="button"
          className={`resource-village-equip-slot ${
            pendingUnequipSlot === "weapon" ? "is-pending-unequip" : ""
          }`}
          data-slot="weapon"
          onClick={() => onVillageEquipSlotClick("weapon")}
          disabled={isActionLocked}
        >
          <span className="resource-village-slot-label">
            {pendingUnequipSlot === "weapon" ? "해제" : "무기"}
          </span>
          <span className="resource-village-slot-plus">
            {pendingUnequipSlot === "weapon" ? "다시 클릭" : equippedWeapon ? `+${equippedWeapon.plus}` : "-"}
          </span>
        </button>

        <button
          type="button"
          className={`resource-village-equip-slot ${
            pendingUnequipSlot === "armor" ? "is-pending-unequip" : ""
          }`}
          data-slot="armor"
          onClick={() => onVillageEquipSlotClick("armor")}
          disabled={isActionLocked}
        >
          <span className="resource-village-slot-label">
            {pendingUnequipSlot === "armor" ? "해제" : "갑옷"}
          </span>
          <span className="resource-village-slot-plus">
            {pendingUnequipSlot === "armor" ? "다시 클릭" : equippedArmor ? `+${equippedArmor.plus}` : "-"}
          </span>
        </button>
      </div>
    </div>
  </div>
);
