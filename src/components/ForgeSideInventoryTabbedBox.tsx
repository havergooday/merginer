import { useState } from "react";
import type { EquipmentItem } from "@/domain/state";

type InventoryTab = "equipment" | "materials";

type ForgeSideInventoryTabbedBoxProps = {
  ironOre: number;
  steelOre: number;
  mithril: number;
  inventoryItems: EquipmentItem[];
  selectedInventoryItemId: string | null;
  selectedInventoryItem: EquipmentItem | null;
  isActionLocked: boolean;
  onSelectInventoryItem: (itemId: string) => void;
};

const equipmentLabel = (item: EquipmentItem) => `${item.kind === "weapon" ? "검" : "갑옷"} +${item.plus}`;

export const ForgeSideInventoryTabbedBox = ({
  ironOre,
  steelOre,
  mithril,
  inventoryItems,
  selectedInventoryItemId,
  selectedInventoryItem,
  isActionLocked,
  onSelectInventoryItem,
}: ForgeSideInventoryTabbedBoxProps) => {
  const [tab, setTab] = useState<InventoryTab>("equipment");
  const canUseEquipList = !isActionLocked;

  return (
    <aside className="resource-side-box">
      <div className="resource-side-box-header">
        <h3 className="resource-side-box-title">인벤토리</h3>
        <div className="resource-side-tabs">
          <button
            type="button"
            className={`resource-side-tab ${tab === "equipment" ? "is-active" : ""}`}
            onClick={() => setTab("equipment")}
          >
            장비
          </button>
          <button
            type="button"
            className={`resource-side-tab ${tab === "materials" ? "is-active" : ""}`}
            onClick={() => setTab("materials")}
          >
            재료
          </button>
        </div>
      </div>

      {tab === "equipment" ? (
        <div className="resource-side-body">
          <div className="resource-card-stat-row">
            <span>선택 장비</span>
            <span>{selectedInventoryItem ? `${equipmentLabel(selectedInventoryItem)} (${selectedInventoryItem.id})` : "없음"}</span>
          </div>
          <div className="resource-side-item-list">
            {inventoryItems.length === 0 ? (
              <p className="resource-card-note">보유 장비 없음</p>
            ) : (
              inventoryItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`resource-side-item ${selectedInventoryItemId === item.id ? "is-selected" : ""}`}
                  onClick={() => onSelectInventoryItem(item.id)}
                  disabled={!canUseEquipList}
                >
                  <span>{item.id}</span>
                  <span>{equipmentLabel(item)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="resource-side-body">
          <div className="resource-card-stat-row"><span>철광석</span><span>{ironOre}</span></div>
          <div className="resource-card-stat-row"><span>강철석</span><span>{steelOre}</span></div>
          <div className="resource-card-stat-row"><span>미스릴</span><span>{mithril}</span></div>
        </div>
      )}
    </aside>
  );
};

