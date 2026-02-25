import type { EquipmentItem } from "@/domain/state";

type ForgePanelProps = {
  ironOre: number;
  forgeLevel: number;
  craftCost: number;
  forgeUpgradeCost: number;
  canCraftWeapon: boolean;
  canCraftArmor: boolean;
  canUpgradeForgeAction: boolean;
  selectedTarget: EquipmentItem | null;
  selectedMaterial: EquipmentItem | null;
  canForge: boolean;
  forgeGuide: string;
  onCraftWeapon: () => void;
  onCraftArmor: () => void;
  onUpgradeForge: () => void;
  onDropTarget: (itemId: string) => void;
  onDropMaterial: (itemId: string) => void;
  onForge: () => void;
  onClearSlots: () => void;
};

const slotLabel = (item: EquipmentItem) => `${item.kind === "weapon" ? "검" : "갑옷"} +${item.plus} (${item.id})`;

export const ForgePanel = ({
  ironOre,
  forgeLevel,
  craftCost,
  forgeUpgradeCost,
  canCraftWeapon,
  canCraftArmor,
  canUpgradeForgeAction,
  selectedTarget,
  selectedMaterial,
  canForge,
  forgeGuide,
  onCraftWeapon,
  onCraftArmor,
  onUpgradeForge,
  onDropTarget,
  onDropMaterial,
  onForge,
  onClearSlots,
}: ForgePanelProps) => {
  const makeDrop = (handler: (itemId: string) => void) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain");
    handler(itemId);
  };

  return (
    <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold">마을 - 대장간</h2>
      <p className="mt-2 text-sm">철광석: {ironOre}개</p>
      <p className="mt-1 text-sm">대장간 레벨: {forgeLevel}/10</p>
      <p className="mt-1 text-sm">현재 제작비: 철광석 {craftCost}</p>
      <p className="mt-1 text-sm">다음 강화 비용: 철광석 {forgeUpgradeCost}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
          onClick={onUpgradeForge}
          disabled={!canUpgradeForgeAction}
        >
          {forgeLevel >= 10 ? "최대 레벨 도달" : `대장간 강화 (철광석 ${forgeUpgradeCost})`}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
          onClick={onCraftWeapon}
          disabled={!canCraftWeapon}
        >
          검 제작 (철광석 {craftCost})
        </button>
        <button
          type="button"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-teal-300"
          onClick={onCraftArmor}
          disabled={!canCraftArmor}
        >
          갑옷 제작 (철광석 {craftCost})
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-slate-600">강화 대상 슬롯</p>
          <div
            className="min-h-24 rounded-lg border-2 border-dashed border-slate-300 bg-white p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={makeDrop(onDropTarget)}
          >
            {selectedTarget ? (
              <div className="rounded-md bg-slate-100 p-2 text-sm">{slotLabel(selectedTarget)}</div>
            ) : (
              <p className="text-xs text-slate-500">인벤토리에서 드래그</p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-600">강화 재료 슬롯</p>
          <div
            className="min-h-24 rounded-lg border-2 border-dashed border-slate-300 bg-white p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={makeDrop(onDropMaterial)}
          >
            {selectedMaterial ? (
              <div className="rounded-md bg-slate-100 p-2 text-sm">{slotLabel(selectedMaterial)}</div>
            ) : (
              <p className="text-xs text-slate-500">인벤토리에서 드래그</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={onForge}
          disabled={!canForge}
        >
          강화 실행
        </button>
        <button
          type="button"
          className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          onClick={onClearSlots}
        >
          슬롯 비우기
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-600">{forgeGuide}</p>
      <p className="mt-1 text-xs text-slate-600">강화 비용: 동일 종류/동일 단계 장비 2개 + 철광석(현재 단계 수치)</p>
    </section>
  );
};


