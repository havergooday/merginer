import type { EquipmentItem, EquipmentKind } from "@/domain/state";

type InventoryPanelProps = {
  equippedWeapon: EquipmentItem | null;
  equippedArmor: EquipmentItem | null;
  inventoryItems: EquipmentItem[];
  onDragStart: (itemId: string) => (event: React.DragEvent<HTMLButtonElement>) => void;
  onDropEquip: (slot: EquipmentKind, itemId: string) => void;
  onUnequip: (slot: EquipmentKind) => void;
};

const slotText = (item: EquipmentItem | null, label: string) => {
  if (!item) {
    return `${label} 아이템을 여기로 드래그`;
  }
  return `${label} +${item.plus} (${item.id}) - 클릭 시 장착 해제`;
};

export const InventoryPanel = ({
  equippedWeapon,
  equippedArmor,
  inventoryItems,
  onDragStart,
  onDropEquip,
  onUnequip,
}: InventoryPanelProps) => {
  const handleDrop = (slot: EquipmentKind) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain");
    onDropEquip(slot, itemId);
  };

  return (
    <section className="mt-4 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold">인벤토리</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-slate-600">무기 장착 슬롯 (드래그 장착 / 클릭 해제)</p>
          <div
            className="min-h-24 rounded-lg border-2 border-dashed border-violet-300 bg-white p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop("weapon")}
          >
            {equippedWeapon ? (
              <button
                type="button"
                className="w-full rounded-md bg-violet-50 p-2 text-left text-sm hover:bg-violet-100"
                onClick={() => onUnequip("weapon")}
              >
                {slotText(equippedWeapon, "검")}
              </button>
            ) : (
              <p className="text-xs text-slate-500">{slotText(null, "검")}</p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-600">갑옷 장착 슬롯 (드래그 장착 / 클릭 해제)</p>
          <div
            className="min-h-24 rounded-lg border-2 border-dashed border-emerald-300 bg-white p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop("armor")}
          >
            {equippedArmor ? (
              <button
                type="button"
                className="w-full rounded-md bg-emerald-50 p-2 text-left text-sm hover:bg-emerald-100"
                onClick={() => onUnequip("armor")}
              >
                {slotText(equippedArmor, "갑옷")}
              </button>
            ) : (
              <p className="text-xs text-slate-500">{slotText(null, "갑옷")}</p>
            )}
          </div>
        </div>
      </div>

      {inventoryItems.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">보유한 장비가 없습니다.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {inventoryItems.map((item) => (
            <button
              key={item.id}
              type="button"
              draggable
              onDragStart={onDragStart(item.id)}
              className="aspect-square rounded-md border border-slate-300 bg-white p-2 text-left hover:border-indigo-400"
            >
              <div className="text-xs text-slate-500">{item.id}</div>
              <div className="mt-1 text-sm font-semibold">{item.kind === "weapon" ? "검" : "갑옷"}</div>
              <div className="text-base font-bold">+{item.plus}</div>
              <div className="mt-2 text-xs text-indigo-600">드래그: 대장간/장착 슬롯</div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

