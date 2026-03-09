import type { EquipmentItem } from "@/domain/state";

type ForgeSideInventorySplitBoxProps = {
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
const equipmentKindLabel = (item: EquipmentItem) => (item.kind === "weapon" ? "검" : "갑옷");
const equipmentIconSrc = (item: EquipmentItem) =>
  item.kind === "weapon" ? "/assets/ui/icon/icon_weapon.png" : "/assets/ui/icon/icon_armor.png";

export const ForgeSideInventorySplitBox = ({
  ironOre,
  steelOre,
  mithril,
  inventoryItems,
  selectedInventoryItemId,
  selectedInventoryItem,
  isActionLocked,
  onSelectInventoryItem,
}: ForgeSideInventorySplitBoxProps) => {
  const canUseEquipList = !isActionLocked;

  return (
    <div className="resource-side-stack">
      <aside className="resource-side-box">
        <div className="resource-side-box-header">
          <h3 className="resource-side-box-title">인벤토리-장비</h3>
        </div>
        <div className="resource-side-body">
          <div className="resource-card-stat-row">
            <span>선택 장비</span>
            <span>{selectedInventoryItem ? equipmentLabel(selectedInventoryItem) : "없음"}</span>
          </div>
          <div className="resource-side-item-list resource-side-item-list-equip">
            {inventoryItems.length === 0 ? (
              <p className="resource-card-note">보유 장비 없음</p>
            ) : (
              inventoryItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`resource-side-item resource-side-item-equip ${selectedInventoryItemId === item.id ? "is-selected" : ""}`}
                  onClick={() => onSelectInventoryItem(item.id)}
                  disabled={!canUseEquipList}
                >
                  <span className="resource-side-item-equip-plus">+{item.plus}</span>
                  <span className="resource-side-item-equip-sprite" aria-hidden>
                    <img className="resource-side-item-equip-image" src={equipmentIconSrc(item)} alt="" />
                  </span>
                  <span className="resource-side-item-equip-label">{equipmentKindLabel(item)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      <aside className="resource-side-material-box">
        <div className="resource-side-box-header">
          <h3 className="resource-side-box-title">재료</h3>
        </div>
        <div className="resource-side-body">
          <div className="resource-card-stat-row"><span>철광석</span><span>{ironOre}</span></div>
          <div className="resource-card-stat-row"><span>강철석</span><span>{steelOre}</span></div>
          <div className="resource-card-stat-row"><span>미스릴</span><span>{mithril}</span></div>
        </div>
      </aside>
    </div>
  );
};
