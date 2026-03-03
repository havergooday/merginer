import type { EquipmentItem, EquipmentKind } from "@/domain/state";

type InventoryPanelProps = {
  equippedWeapon: EquipmentItem | null;
  equippedArmor: EquipmentItem | null;
  inventoryItems: EquipmentItem[];
  selectedItemId: string | null;
  isTownLocked: boolean;
  onSelectItem: (itemId: string) => void;
  onEquipSelectedItem: () => void;
  onUnequip: (slot: EquipmentKind) => void;
};

const slotText = (item: EquipmentItem | null, label: string) => {
  if (!item) {
    return `${label} 아이템 없음`;
  }
  return `${label} +${item.plus} (${item.id}) - 클릭 시 장착 해제`;
};

export const InventoryPanel = ({
  equippedWeapon,
  equippedArmor,
  inventoryItems,
  selectedItemId,
  isTownLocked,
  onSelectItem,
  onEquipSelectedItem,
  onUnequip,
}: InventoryPanelProps) => {
  const selectedItem = inventoryItems.find((item) => item.id === selectedItemId) ?? null;
  const selectBadgeClass = selectedItem ? "ui-badge ui-badge-ready" : "ui-badge ui-badge-blocked";

  return (
    <section className="rounded-lg bg-transparent p-0 ring-0">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={selectBadgeClass}>{selectedItem ? "장착 대상 선택됨" : "선택 필요"}</span>
        <div className="kv-row grow">
          <span className="kv-label">SELECTED</span>
          <span className="kv-value">
            {selectedItem
              ? `${selectedItem.kind === "weapon" ? "검" : "갑옷"} +${selectedItem.plus} (${selectedItem.id})`
              : "없음"}
          </span>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn ui-btn-primary px-3 py-1.5"
          onClick={onEquipSelectedItem}
          disabled={isTownLocked || !selectedItem}
        >
          선택 아이템 장착
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-[color:var(--ui-text-dim)]">무기 장착 슬롯 (클릭 해제)</p>
          <div className="min-h-24 rounded-lg border-2 border-dashed border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-2">
            {equippedWeapon ? (
              <button
                type="button"
                className="kv-row w-full text-left"
                onClick={() => onUnequip("weapon")}
                disabled={isTownLocked}
              >
                <span className="kv-label">WEAPON</span>
                <span className="kv-value">{slotText(equippedWeapon, "검")}</span>
              </button>
            ) : (
              <p className="text-xs text-[color:var(--ui-text-dim)]">{slotText(null, "검")}</p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-[color:var(--ui-text-dim)]">갑옷 장착 슬롯 (클릭 해제)</p>
          <div className="min-h-24 rounded-lg border-2 border-dashed border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-2">
            {equippedArmor ? (
              <button
                type="button"
                className="kv-row w-full text-left"
                onClick={() => onUnequip("armor")}
                disabled={isTownLocked}
              >
                <span className="kv-label">ARMOR</span>
                <span className="kv-value">{slotText(equippedArmor, "갑옷")}</span>
              </button>
            ) : (
              <p className="text-xs text-[color:var(--ui-text-dim)]">{slotText(null, "갑옷")}</p>
            )}
          </div>
        </div>
      </div>

      {inventoryItems.length === 0 ? (
        <p className="mt-3 text-sm text-[color:var(--ui-text-dim)]">보유한 장비가 없습니다.</p>
      ) : (
        <div className="mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-5">
          {inventoryItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item.id)}
              className={`aspect-square rounded-md border p-2 text-left disabled:cursor-not-allowed ${
                selectedItemId === item.id
                  ? "border-[color:var(--ui-accent)] bg-[color:var(--ui-surface)] ring-2 ring-[color:var(--ui-accent)]/30"
                  : "border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] hover:border-[color:var(--ui-accent)]"
              }`}
              disabled={isTownLocked}
            >
              <div className="text-xs text-[color:var(--ui-text-dim)]">{item.id}</div>
              <div className="mt-1 text-sm font-semibold">{item.kind === "weapon" ? "검" : "갑옷"}</div>
              <div className="text-base font-bold">+{item.plus}</div>
              <div className="mt-2 text-xs text-[color:var(--ui-accent)]">클릭: 선택</div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

