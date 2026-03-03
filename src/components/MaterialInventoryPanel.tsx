import type { MaterialStock } from "@/domain/state";

type MaterialInventoryPanelProps = {
  materials: MaterialStock;
};

export const MaterialInventoryPanel = ({ materials }: MaterialInventoryPanelProps) => {
  return (
    <section className="window-panel p-4">
      <h2 className="window-title">재료 인벤토리</h2>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div className="info-line">철광석: {materials.ironOre}</div>
        <div className="info-line">강철석: {materials.steelOre}</div>
        <div className="info-line">미스릴: {materials.mithril}</div>
      </div>
      <p className="mt-2 text-xs text-[color:var(--ui-text-dim)]">재료는 강화/제작 시 자동으로 확인되고 소모됩니다.</p>
    </section>
  );
};
