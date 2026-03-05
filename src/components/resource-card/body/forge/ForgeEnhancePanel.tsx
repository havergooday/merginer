import { slotLabel } from "@/components/resource-card/constants";
import type { EnhanceFxState } from "@/components/resource-card/types";
import type { EquipmentItem } from "@/domain/state";

type ForgeEnhancePanelProps = {
  isActionLocked: boolean;
  selectedTarget: EquipmentItem | null;
  selectedMaterial: EquipmentItem | null;
  enhanceRequirementLine1: string;
  enhanceRequirementLine2: string;
  enhanceRequirementLine3: string;
  enhanceBaseRate: number;
  enhanceBonusRate: number;
  enhanceFinalRate: number;
  enhanceFxState: EnhanceFxState;
  canForge: boolean;
  onClickTargetSlot: () => void;
  onClickMaterialSlot: () => void;
  onForge: () => void;
};

export const ForgeEnhancePanel = ({
  isActionLocked,
  selectedTarget,
  selectedMaterial,
  enhanceRequirementLine1,
  enhanceRequirementLine2,
  enhanceRequirementLine3,
  enhanceBaseRate,
  enhanceBonusRate,
  enhanceFinalRate,
  enhanceFxState,
  canForge,
  onClickTargetSlot,
  onClickMaterialSlot,
  onForge,
}: ForgeEnhancePanelProps) => (
  <div className={`resource-enhance-panel enhance-fx-${enhanceFxState}`}>
    <div className="resource-enhance-slots">
      <div className="resource-enhance-slot-col">
        <button
          type="button"
          className="resource-enhance-slot-box resource-enhance-slot-box-btn"
          onClick={onClickTargetSlot}
          disabled={isActionLocked}
        >
          <p className="resource-enhance-slot-title">대상 슬롯</p>
          <p className="resource-enhance-slot-value">{selectedTarget ? slotLabel(selectedTarget) : "비어 있음"}</p>
        </button>
      </div>
      <div className="resource-enhance-slot-col">
        <button
          type="button"
          className="resource-enhance-slot-box resource-enhance-slot-box-btn"
          onClick={onClickMaterialSlot}
          disabled={isActionLocked}
        >
          <p className="resource-enhance-slot-title">재료 슬롯</p>
          <p className="resource-enhance-slot-value">
            {selectedMaterial ? slotLabel(selectedMaterial) : "비어 있음"}
          </p>
        </button>
      </div>
    </div>

    <div className="resource-enhance-requirement">
      <p>{enhanceRequirementLine1}</p>
      <p>{enhanceRequirementLine2}</p>
      <p className={`resource-enhance-reason ${enhanceRequirementLine3 === "강화가 가능합니다" ? "is-ready" : ""}`}>
        {enhanceRequirementLine3}
      </p>
      <p className="resource-enhance-rate">기본 확률: {(enhanceBaseRate * 100).toFixed(1)}%</p>
      <p className="resource-enhance-rate">실패 보정: +{(enhanceBonusRate * 100).toFixed(1)}%</p>
      <p className="resource-enhance-rate is-final">최종 확률: {(enhanceFinalRate * 100).toFixed(1)}%</p>
    </div>

    <button
      type="button"
      className="resource-card-action-btn resource-card-action-btn-wide resource-enhance-execute-btn"
      onClick={onForge}
      disabled={isActionLocked || !canForge}
    >
      강화 실행
    </button>
  </div>
);
