import { ForgeCombinePanel } from "@/components/resource-card/body/forge/ForgeCombinePanel";
import { ForgeCraftPanel } from "@/components/resource-card/body/forge/ForgeCraftPanel";
import { ForgeEnhancePanel } from "@/components/resource-card/body/forge/ForgeEnhancePanel";
import { useCombineSelection } from "@/components/resource-card/hooks/useCombineSelection";
import type { ResourcePreviewCardProps } from "@/components/resource-card/types";

type ForgeBodyProps = Pick<
  ResourcePreviewCardProps,
  | "forgeSubTab"
  | "isActionLocked"
  | "canCraftWeapon"
  | "canCraftArmor"
  | "craftCost"
  | "forgeUpgradeCost"
  | "canUpgradeForgeAction"
  | "selectedTarget"
  | "selectedMaterial"
  | "enhanceRequirementLine1"
  | "enhanceRequirementLine2"
  | "enhanceRequirementLine3"
  | "enhanceBaseRate"
  | "enhanceBonusRate"
  | "enhanceFinalRate"
  | "enhanceFxState"
  | "canForge"
  | "combineRecipes"
  | "onCraftByRecipeId"
  | "actions"
>;

export const ForgeBody = ({
  forgeSubTab,
  isActionLocked,
  canCraftWeapon,
  canCraftArmor,
  craftCost,
  forgeUpgradeCost,
  canUpgradeForgeAction,
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
  combineRecipes,
  onCraftByRecipeId,
  actions,
}: ForgeBodyProps) => {
  const {
    selectedCombineRecipeId,
    setSelectedCombineRecipeId,
    selectedCombineRecipe,
    combinePageIndex,
    goPrevPage,
    goNextPage,
    combinePageCount,
    visibleCombineRecipes,
  } = useCombineSelection(combineRecipes);

  return (
    <div className="resource-forge-body">
      <div className="resource-forge-tab-row">
        <button
          type="button"
          className={`resource-forge-tab ${forgeSubTab === "craft" ? "is-active" : ""}`}
          onClick={() => actions.onSetForgeSubTab("craft")}
          disabled={isActionLocked}
        >
          제작
        </button>
        <button
          type="button"
          className={`resource-forge-tab ${forgeSubTab === "enhance" ? "is-active" : ""}`}
          onClick={() => actions.onSetForgeSubTab("enhance")}
          disabled={isActionLocked}
        >
          강화
        </button>
        <button
          type="button"
          className={`resource-forge-tab ${forgeSubTab === "combine" ? "is-active" : ""}`}
          onClick={() => actions.onSetForgeSubTab("combine")}
          disabled={isActionLocked}
        >
          조합
        </button>
      </div>

      {forgeSubTab === "craft" ? (
        <ForgeCraftPanel
          isActionLocked={isActionLocked}
          canCraftWeapon={canCraftWeapon}
          canCraftArmor={canCraftArmor}
          craftCost={craftCost}
          forgeUpgradeCost={forgeUpgradeCost}
          canUpgradeForgeAction={canUpgradeForgeAction}
          onCraftWeapon={actions.onCraftWeapon}
          onCraftArmor={actions.onCraftArmor}
          onUpgradeForge={actions.onUpgradeForge}
        />
      ) : null}

      {forgeSubTab === "enhance" ? (
        <ForgeEnhancePanel
          isActionLocked={isActionLocked}
          selectedTarget={selectedTarget}
          selectedMaterial={selectedMaterial}
          enhanceRequirementLine1={enhanceRequirementLine1}
          enhanceRequirementLine2={enhanceRequirementLine2}
          enhanceRequirementLine3={enhanceRequirementLine3}
          enhanceBaseRate={enhanceBaseRate}
          enhanceBonusRate={enhanceBonusRate}
          enhanceFinalRate={enhanceFinalRate}
          enhanceFxState={enhanceFxState}
          canForge={canForge}
          onClickTargetSlot={actions.onClickTargetSlot}
          onClickMaterialSlot={actions.onClickMaterialSlot}
          onForge={actions.onForge}
        />
      ) : null}

      {forgeSubTab === "combine" ? (
        <ForgeCombinePanel
          isActionLocked={isActionLocked}
          visibleCombineRecipes={visibleCombineRecipes}
          selectedCombineRecipeId={selectedCombineRecipeId}
          selectedCombineRecipe={selectedCombineRecipe}
          setSelectedCombineRecipeId={setSelectedCombineRecipeId}
          combinePageIndex={combinePageIndex}
          goPrevPage={goPrevPage}
          goNextPage={goNextPage}
          combinePageCount={combinePageCount}
          onCraftByRecipeId={onCraftByRecipeId}
        />
      ) : null}
    </div>
  );
};
