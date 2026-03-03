import type { EquipmentItem } from "@/domain/state";

type ForgePanelProps = {
  ironOre: number;
  forgeLevel: number;
  craftCost: number;
  forgeUpgradeCost: number;
  canCraftWeapon: boolean;
  canCraftArmor: boolean;
  canCraftSteel: boolean;
  canCraftMithril: boolean;
  canUpgradeForgeAction: boolean;
  isTownLocked: boolean;
  selectedInventoryItem: EquipmentItem | null;
  selectedTarget: EquipmentItem | null;
  selectedMaterial: EquipmentItem | null;
  canSelectAsTarget: boolean;
  canSelectAsMaterial: boolean;
  canForge: boolean;
  forgeGuide: string;
  onCraftWeapon: () => void;
  onCraftArmor: () => void;
  onCraftSteel: () => void;
  onCraftMithril: () => void;
  onUpgradeForge: () => void;
  onSelectAsTarget: () => void;
  onSelectAsMaterial: () => void;
  onForge: () => void;
  onClearTarget: () => void;
  onClearMaterial: () => void;
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
  canCraftSteel,
  canCraftMithril,
  canUpgradeForgeAction,
  isTownLocked,
  selectedInventoryItem,
  selectedTarget,
  selectedMaterial,
  canSelectAsTarget,
  canSelectAsMaterial,
  canForge,
  forgeGuide,
  onCraftWeapon,
  onCraftArmor,
  onCraftSteel,
  onCraftMithril,
  onUpgradeForge,
  onSelectAsTarget,
  onSelectAsMaterial,
  onForge,
  onClearTarget,
  onClearMaterial,
  onClearSlots,
}: ForgePanelProps) => {
  const actionBadgeClass = isTownLocked
    ? "ui-badge ui-badge-locked"
    : canForge
      ? "ui-badge ui-badge-ready"
      : "ui-badge ui-badge-blocked";

  return (
    <section className="rounded-lg bg-transparent p-0 ring-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">강화 작업</p>
        <span className={actionBadgeClass}>{isTownLocked ? "잠금" : canForge ? "실행 가능" : "조건 부족"}</span>
      </div>
      <div className="kv-grid mt-2">
        <div className="kv-row">
          <span className="kv-label">IRON</span>
          <span className="kv-value">{ironOre}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">FORGE LEVEL</span>
          <span className="kv-value">{forgeLevel}/10</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">CRAFT COST</span>
          <span className="kv-value">철광석 {craftCost}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">UPGRADE COST</span>
          <span className="kv-value">철광석 {forgeUpgradeCost}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={onUpgradeForge}
          disabled={isTownLocked || !canUpgradeForgeAction}
        >
          {forgeLevel >= 10 ? "최대 레벨 도달" : `대장간 강화 (철광석 ${forgeUpgradeCost})`}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn ui-btn-secondary"
          onClick={onCraftSteel}
          disabled={isTownLocked || !canCraftSteel}
        >
          강철석 조합 (철광석 100 to 강철석 1)
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-secondary"
          onClick={onCraftMithril}
          disabled={isTownLocked || !canCraftMithril}
        >
          미스릴 조합 (강철석 100 to 미스릴 1)
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={onCraftWeapon}
          disabled={isTownLocked || !canCraftWeapon}
        >
          검 제작 (철광석 {craftCost})
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={onCraftArmor}
          disabled={isTownLocked || !canCraftArmor}
        >
          갑옷 제작 (철광석 {craftCost})
        </button>
      </div>

      <div className="kv-row mt-3">
        <span className="kv-label">SELECTED</span>
        <span className="kv-value">{selectedInventoryItem ? slotLabel(selectedInventoryItem) : "없음"}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          onClick={onSelectAsTarget}
          disabled={isTownLocked || !canSelectAsTarget}
        >
          선택 아이템 대상 지정
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          onClick={onSelectAsMaterial}
          disabled={isTownLocked || !canSelectAsMaterial}
        >
          선택 아이템 재료 지정
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-[color:var(--ui-text-dim)]">강화 대상 슬롯</p>
          <div className="min-h-24 rounded-lg border-2 border-dashed border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-2">
            {selectedTarget ? (
              <div>
                <div className="kv-row">
                  <span className="kv-label">TARGET</span>
                  <span className="kv-value">{slotLabel(selectedTarget)}</span>
                </div>
                <button
                  type="button"
                  className="ui-btn ui-btn-neutral mt-2 px-2 py-1 text-xs"
                  onClick={onClearTarget}
                  disabled={isTownLocked}
                >
                  대상 비우기
                </button>
              </div>
            ) : (
              <p className="text-xs text-[color:var(--ui-text-dim)]">인벤토리에서 선택 후 버튼 클릭</p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-[color:var(--ui-text-dim)]">강화 재료 슬롯</p>
          <div className="min-h-24 rounded-lg border-2 border-dashed border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-2">
            {selectedMaterial ? (
              <div>
                <div className="kv-row">
                  <span className="kv-label">MATERIAL</span>
                  <span className="kv-value">{slotLabel(selectedMaterial)}</span>
                </div>
                <button
                  type="button"
                  className="ui-btn ui-btn-neutral mt-2 px-2 py-1 text-xs"
                  onClick={onClearMaterial}
                  disabled={isTownLocked}
                >
                  재료 비우기
                </button>
              </div>
            ) : (
              <p className="text-xs text-[color:var(--ui-text-dim)]">인벤토리에서 선택 후 버튼 클릭</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={onForge}
          disabled={isTownLocked || !canForge}
        >
          강화 실행
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          onClick={onClearSlots}
          disabled={isTownLocked}
        >
          슬롯 비우기
        </button>
      </div>
      <div className="kv-row mt-2">
        <span className="kv-label">STATUS</span>
        <span className="kv-value">{canForge ? "준비 완료. 강화 실행 버튼을 눌러 진행" : `원인: ${forgeGuide} / 해결: 조건을 맞춘 뒤 다시 시도`}</span>
      </div>
      <p className="mt-1 text-xs text-[color:var(--ui-text-dim)]">
        강화 비용: 동일 종류/동일 단계 장비 2개 + 재료 자동 소모. +0~+5는 철광석 n개, +6~+9는 철광석 n + 강철석 n개
        (대장간 3+), +10+는 철광석 n + 미스릴 n개 (대장간 5+)
      </p>
      <p className="mt-1 text-xs text-[color:var(--ui-text-dim)]">
        조합: 대장간 2+에서 철광석 100 to 강철석 1, 대장간 4+에서 강철석 100 to 미스릴 1
      </p>
    </section>
  );
};

