import type { CombineRecipe, EnhanceFxState, ResourcePreviewCardActionProps, ResourcePreviewCardProps } from "@/components/ResourcePreviewCard";
import type { EquipmentItem, Floor } from "@/domain/state";
import type { ActivityLogEntry } from "@/hooks/useActivityLog";
import type { ExploreSessionViewModel, ExploreSpeedMode, ExploreTimelineEvent } from "@/hooks/useExploreProgress";

type BuildResourceCardPropsArgs = {
  location: ResourcePreviewCardProps["location"];
  forgeSubTab: ResourcePreviewCardProps["forgeSubTab"];
  currentHp: number;
  maxHp: number;
  attack: number;
  currentFloor: Floor;
  currentStage: number;
  unlockedFloor: Floor;
  canExplore: boolean;
  isExploring: boolean;
  exploreSession: ExploreSessionViewModel | null;
  exploreSpeedMode: ExploreSpeedMode;
  onChangeExploreSpeedMode: (mode: ExploreSpeedMode) => void;
  equippedWeapon: EquipmentItem | null;
  equippedArmor: EquipmentItem | null;
  isResting: boolean;
  restLabel: string;
  canUseRest: boolean;
  isActionLocked: boolean;
  ironOre: number;
  steelOre: number;
  mithril: number;
  forgeLevel: number;
  craftCost: number;
  forgeUpgradeCost: number;
  canCraftWeapon: boolean;
  canCraftArmor: boolean;
  canCraftSteel: boolean;
  canCraftMithril: boolean;
  canUpgradeForgeAction: boolean;
  selectedInventoryItem: EquipmentItem | null;
  selectedTarget: EquipmentItem | null;
  selectedMaterial: EquipmentItem | null;
  canSelectAsTarget: boolean;
  canSelectAsMaterial: boolean;
  canForge: boolean;
  forgeGuide: string;
  enhanceRequirementLine1: string;
  enhanceRequirementLine2: string;
  enhanceRequirementLine3: string;
  enhanceBaseRate: number;
  enhanceBonusRate: number;
  enhanceFinalRate: number;
  enhanceFxState: EnhanceFxState;
  combineRecipes: CombineRecipe[];
  onCraftByRecipeId: (id: string) => void;
  activityLogs: ActivityLogEntry[];
  actions: ResourcePreviewCardActionProps;
};

export const buildResourceCardProps = (args: BuildResourceCardPropsArgs): ResourcePreviewCardProps => {
  const exploreCurrentEvent: ExploreTimelineEvent | null = args.exploreSession?.currentEvent ?? null;
  const exploreVisibleEvents: ExploreTimelineEvent[] = args.exploreSession?.visibleEvents ?? [];

  return {
    location: args.location,
    forgeSubTab: args.forgeSubTab,
    currentHp: args.currentHp,
    maxHp: args.maxHp,
    attack: args.attack,
    currentFloor: args.currentFloor,
    currentStage: args.currentStage,
    unlockedFloor: args.unlockedFloor,
    canExplore: args.canExplore,
    isExploring: args.isExploring,
    exploreSession: args.exploreSession,
    exploreSpeedMode: args.exploreSpeedMode,
    onChangeExploreSpeedMode: args.onChangeExploreSpeedMode,
    exploreCurrentEvent,
    exploreVisibleEvents,
    equippedWeapon: args.equippedWeapon,
    equippedArmor: args.equippedArmor,
    isResting: args.isResting,
    restLabel: args.restLabel,
    canUseRest: args.canUseRest,
    isActionLocked: args.isActionLocked,
    ironOre: args.ironOre,
    steelOre: args.steelOre,
    mithril: args.mithril,
    forgeLevel: args.forgeLevel,
    craftCost: args.craftCost,
    forgeUpgradeCost: args.forgeUpgradeCost,
    canCraftWeapon: args.canCraftWeapon,
    canCraftArmor: args.canCraftArmor,
    canCraftSteel: args.canCraftSteel,
    canCraftMithril: args.canCraftMithril,
    canUpgradeForgeAction: args.canUpgradeForgeAction,
    selectedInventoryItem: args.selectedInventoryItem,
    selectedTarget: args.selectedTarget,
    selectedMaterial: args.selectedMaterial,
    canSelectAsTarget: args.canSelectAsTarget,
    canSelectAsMaterial: args.canSelectAsMaterial,
    canForge: args.canForge,
    forgeGuide: args.forgeGuide,
    enhanceRequirementLine1: args.enhanceRequirementLine1,
    enhanceRequirementLine2: args.enhanceRequirementLine2,
    enhanceRequirementLine3: args.enhanceRequirementLine3,
    enhanceBaseRate: args.enhanceBaseRate,
    enhanceBonusRate: args.enhanceBonusRate,
    enhanceFinalRate: args.enhanceFinalRate,
    enhanceFxState: args.enhanceFxState,
    combineRecipes: args.combineRecipes,
    onCraftByRecipeId: args.onCraftByRecipeId,
    activityLogs: args.activityLogs,
    actions: args.actions,
  };
};
