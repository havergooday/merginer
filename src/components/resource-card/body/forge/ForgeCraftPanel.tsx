type ForgeCraftPanelProps = {
  isActionLocked: boolean;
  canCraftWeapon: boolean;
  canCraftArmor: boolean;
  craftCost: number;
  forgeUpgradeCost: number;
  canUpgradeForgeAction: boolean;
  onCraftWeapon: () => void;
  onCraftArmor: () => void;
  onUpgradeForge: () => void;
};

export const ForgeCraftPanel = ({
  isActionLocked,
  canCraftWeapon,
  canCraftArmor,
  craftCost,
  forgeUpgradeCost,
  canUpgradeForgeAction,
  onCraftWeapon,
  onCraftArmor,
  onUpgradeForge,
}: ForgeCraftPanelProps) => (
  <div className="resource-craft-grid">
    <div className="resource-craft-top-row">
      <button
        type="button"
        className="resource-card-action-btn"
        onClick={onCraftWeapon}
        disabled={isActionLocked || !canCraftWeapon}
      >
        검 제작
      </button>
      <button
        type="button"
        className="resource-card-action-btn"
        onClick={onCraftArmor}
        disabled={isActionLocked || !canCraftArmor}
      >
        갑옷 제작
      </button>
    </div>
    <div className="resource-craft-bottom-row">
      <div className="resource-craft-preview-box">
        <div className="resource-craft-info-section">
          <p className="resource-craft-info-row">제작 비용: 철광석 {craftCost}</p>
          <p className="resource-craft-info-row">강화 비용: 철광석 {forgeUpgradeCost}</p>
        </div>
        <div className="resource-craft-guide-section">
          <p className="resource-craft-guide-line">대장간 강화 시 제작 비용이 감소합니다.</p>
          <p className="resource-craft-guide-line">조합 해금: Lv2 강철석 / Lv4 미스릴</p>
          <p className="resource-craft-guide-line">강화 재료: +6부터 강철석, +10부터 미스릴</p>
        </div>
      </div>
      <button
        type="button"
        className="resource-card-action-btn resource-craft-upgrade-btn"
        onClick={onUpgradeForge}
        disabled={isActionLocked || !canUpgradeForgeAction}
      >
        대장간 강화
      </button>
    </div>
  </div>
);
