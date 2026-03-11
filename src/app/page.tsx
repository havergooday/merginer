"use client";

import { useMemo } from "react";

import { buildResourceCardProps } from "@/app/home/buildResourceCardProps";
import { useHomeForgeActions } from "@/app/home/useHomeForgeActions";
import { useHomeGameState } from "@/app/home/useHomeGameState";
import { ForgeSideInventorySplitBox } from "@/components/ForgeSideInventorySplitBox";
import { ResourcePreviewCard } from "@/components/ResourcePreviewCard";
import { toggleSelectedItemId } from "@/domain/usecases/itemSelection";
import { formatAsMmSs } from "@/hooks/useRestCountdown";

export default function Home() {
  const game = useHomeGameState();
  const { enhanceFxState, handleResetGame, onCraftByRecipeId, resourceActions } = useHomeForgeActions({
    state: game.state,
    dispatch: game.dispatch,
    resourceLocation: game.resourceLocation,
    setResourceLocation: game.setResourceLocation,
    forgeSubTab: game.forgeSubTab,
    setForgeSubTab: game.setForgeSubTab,
    setSelectedInventoryItemId: game.setSelectedInventoryItemId,
    selectedInventoryItem: game.selectedInventoryItem,
    resolvedSelectedInventoryItemId: game.resolvedSelectedInventoryItemId,
    forgeSlots: game.forgeSlots,
    forgeValidation: game.forgeValidation,
    enhanceFinalRate: game.enhanceFinalRate,
    enhanceFailStreak: game.enhanceFailStreak,
    pushLog: game.pushLog,
    startExplore: game.startExplore,
    confirmExplore: game.confirmExplore,
    triggerRest: game.triggerRest,
  });

  const resourceCardProps = useMemo(
    () =>
      buildResourceCardProps({
        location: game.resourceLocation,
        forgeSubTab: game.forgeSubTab,
        currentHp: game.displayedCurrentHp,
        maxHp: game.maxHp,
        attack: game.attack,
        currentFloor: game.state.currentFloor,
        currentStage: game.state.currentStage,
        unlockedFloor: game.state.unlockedFloor,
        canExplore: game.currentHp > 0 && !game.isResting && !game.state.isExploring,
        isExploring: game.state.isExploring,
        exploreSession: game.exploreSession,
        exploreSpeedMode: game.exploreSpeedMode,
        onChangeExploreSpeedMode: game.setExploreSpeedMode,
        equippedWeapon: game.equippedWeapon,
        equippedArmor: game.equippedArmor,
        isResting: game.isResting,
        restLabel: formatAsMmSs(game.restRemainingSec),
        canUseRest: game.canUseRestNow && !game.isResting,
        isActionLocked: game.state.isExploring,
        ironOre: game.state.materials.ironOre,
        steelOre: game.state.materials.steelOre,
        mithril: game.state.materials.mithril,
        forgeLevel: game.state.forgeLevel,
        craftCost: game.craftCost,
        forgeUpgradeCost: game.state.forgeUpgradeCost,
        canCraftWeapon: game.state.materials.ironOre >= game.craftCost,
        canCraftArmor: game.state.materials.ironOre >= game.craftCost,
        canCraftSteel: game.canCraftSteelNow,
        canCraftMithril: game.canCraftMithrilNow,
        canUpgradeForgeAction: game.canUpgradeForgeNow,
        selectedInventoryItem: game.selectedInventoryItem,
        selectedTarget: game.forgeSlots.selectedTarget,
        selectedMaterial: game.forgeSlots.selectedMaterial,
        canSelectAsTarget: game.canSelectAsTarget,
        canSelectAsMaterial: game.canSelectAsMaterial,
        canForge: game.forgeValidation.ok,
        forgeGuide: game.forgeGuide,
        enhanceRequirementLine1: game.enhanceRequirementLine1,
        enhanceRequirementLine2: game.enhanceRequirementLine2,
        enhanceRequirementLine3: game.enhanceRequirementLine3,
        enhanceBaseRate: game.enhanceBaseRate,
        enhanceBonusRate: game.enhanceBonusRate,
        enhanceFinalRate: game.enhanceFinalRate,
        enhanceFxState,
        combineRecipes: game.combineRecipes,
        onCraftByRecipeId,
        activityLogs: game.activityLogs,
        actions: resourceActions,
      }),
    [enhanceFxState, game, onCraftByRecipeId, resourceActions],
  );

  return (
    <main className="min-h-screen p-3 text-[color:var(--ui-text)] sm:p-4">
      <section className="mx-auto mb-3 max-w-7xl">
        <div className="window-panel ui-mode-bar flex items-center justify-end gap-3 p-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <button
                type="button"
                className={`ui-btn px-2 py-1 ${game.textScaleMode === "small" ? "ui-btn-primary" : "ui-btn-neutral"}`}
                onClick={() => game.setTextScaleMode("small")}
              >
                소
              </button>
              <button
                type="button"
                className={`ui-btn px-2 py-1 ${game.textScaleMode === "medium" ? "ui-btn-primary" : "ui-btn-neutral"}`}
                onClick={() => game.setTextScaleMode("medium")}
              >
                중
              </button>
              <button
                type="button"
                className={`ui-btn px-2 py-1 ${game.textScaleMode === "large" ? "ui-btn-primary" : "ui-btn-neutral"}`}
                onClick={() => game.setTextScaleMode("large")}
              >
                대
              </button>
              <button type="button" className="ui-btn ui-btn-danger px-2 py-1" onClick={handleResetGame}>
                리셋
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="resource-ui-layout mx-auto max-w-7xl">
        <ResourcePreviewCard {...resourceCardProps} />

        <ForgeSideInventorySplitBox
          ironOre={game.state.materials.ironOre}
          steelOre={game.state.materials.steelOre}
          mithril={game.state.materials.mithril}
          inventoryItems={game.inventoryItems}
          selectedInventoryItemId={game.resolvedSelectedInventoryItemId}
          selectedInventoryItem={game.selectedInventoryItem}
          isActionLocked={game.state.isExploring}
          onSelectInventoryItem={(itemId) =>
            game.setSelectedInventoryItemId((current) => toggleSelectedItemId(current, itemId))
          }
        />
      </section>
    </main>
  );
}

