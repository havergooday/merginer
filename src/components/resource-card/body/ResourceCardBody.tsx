import { ExploreBody } from "@/components/resource-card/body/ExploreBody";
import { ForgeBody } from "@/components/resource-card/body/ForgeBody";
import { InnBody } from "@/components/resource-card/body/InnBody";
import { VillageBody } from "@/components/resource-card/body/VillageBody";
import { usePendingUnequip } from "@/components/resource-card/hooks/usePendingUnequip";
import type { ResourcePreviewCardProps } from "@/components/resource-card/types";

const VillageBodyContainer = (props: ResourcePreviewCardProps) => {
  const { villageBodyRef, pendingUnequipSlot, onVillageEquipSlotClick } = usePendingUnequip({
    isActionLocked: props.isActionLocked,
    isExploring: props.isExploring,
    location: props.location,
    selectedInventoryItem: props.selectedInventoryItem,
    equippedWeapon: props.equippedWeapon,
    equippedArmor: props.equippedArmor,
    onClickEquipSlot: props.actions.onClickEquipSlot,
    onConfirmUnequip: props.actions.onConfirmUnequip,
  });

  return (
    <VillageBody
      isActionLocked={props.isActionLocked}
      equippedWeapon={props.equippedWeapon}
      equippedArmor={props.equippedArmor}
      pendingUnequipSlot={pendingUnequipSlot}
      villageBodyRef={villageBodyRef}
      onVillageEquipSlotClick={onVillageEquipSlotClick}
    />
  );
};

export const ResourceCardBody = (props: ResourcePreviewCardProps) => {
  if (props.location === "village") {
    return <VillageBodyContainer {...props} />;
  }

  if (props.location === "inn") {
    return (
      <InnBody
        isActionLocked={props.isActionLocked}
        isResting={props.isResting}
        restLabel={props.restLabel}
        canUseRest={props.canUseRest}
        onRest={props.actions.onRest}
      />
    );
  }

  if (props.location === "forge") {
    return (
      <ForgeBody
        forgeSubTab={props.forgeSubTab}
        isActionLocked={props.isActionLocked}
        canCraftWeapon={props.canCraftWeapon}
        canCraftArmor={props.canCraftArmor}
        craftCost={props.craftCost}
        forgeUpgradeCost={props.forgeUpgradeCost}
        canUpgradeForgeAction={props.canUpgradeForgeAction}
        selectedTarget={props.selectedTarget}
        selectedMaterial={props.selectedMaterial}
        enhanceRequirementLine1={props.enhanceRequirementLine1}
        enhanceRequirementLine2={props.enhanceRequirementLine2}
        enhanceRequirementLine3={props.enhanceRequirementLine3}
        enhanceBaseRate={props.enhanceBaseRate}
        enhanceBonusRate={props.enhanceBonusRate}
        enhanceFinalRate={props.enhanceFinalRate}
        enhanceFxState={props.enhanceFxState}
        canForge={props.canForge}
        combineRecipes={props.combineRecipes}
        onCraftByRecipeId={props.onCraftByRecipeId}
        actions={props.actions}
      />
    );
  }

  return (
    <ExploreBody
      isExploring={props.isExploring}
      exploreSession={props.exploreSession}
      exploreSpeedMode={props.exploreSpeedMode}
      onChangeExploreSpeedMode={props.onChangeExploreSpeedMode}
      exploreCurrentEvent={props.exploreCurrentEvent}
      exploreVisibleEvents={props.exploreVisibleEvents}
      currentFloor={props.currentFloor}
      unlockedFloor={props.unlockedFloor}
      canExplore={props.canExplore}
      isActionLocked={props.isActionLocked}
      actions={props.actions}
    />
  );
};
