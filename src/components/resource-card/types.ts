import type { EquipmentItem, Floor } from "@/domain/state";
import type { ActivityLogEntry } from "@/hooks/useActivityLog";
import type {
  ExploreEventType,
  ExploreSessionViewModel,
  ExploreSpeedMode,
  ExploreTimelineEvent,
} from "@/hooks/useExploreProgress";

export type ResourceLocation = "village" | "inn" | "forge" | "explore";
export type ForgeSubTab = "craft" | "enhance" | "combine";
export type CombineRecipeId = string;
export type EnhanceFxState = "idle" | "attempt" | "success" | "fail";
export type ExploreUnitState = "hidden" | "entry" | "idle" | "attack" | "hit" | "dead";

export type ExploreCinematicArtState = {
  isCinematic: boolean;
  stageLabel: string;
  bgKey: string;
  eventType: ExploreEventType | null;
  entryMode: "both" | "monster-only" | "none";
  activeActor: "player" | "monster" | null;
  playerState: ExploreUnitState;
  monsterState: ExploreUnitState;
  monsterHpCurrent: number;
  monsterHpMax: number;
};

export type CombineRecipe = {
  id: CombineRecipeId;
  name: string;
  costText: string;
  canCraft: boolean;
  blockedReason?: string;
};

export type ResourcePreviewCardActionProps = {
  onGoVillage: () => void;
  onGoInn: () => void;
  onGoForge: () => void;
  onGoExplore: () => void;
  onSetForgeSubTab: (tab: ForgeSubTab) => void;
  onSetFloor: (floor: Floor) => void;
  onExploreStart: () => void;
  onExploreConfirm: () => void;
  onRest: () => void;
  onCraftWeapon: () => void;
  onCraftArmor: () => void;
  onCraftSteel: () => void;
  onCraftMithril: () => void;
  onUpgradeForge: () => void;
  onClickTargetSlot: () => void;
  onClickMaterialSlot: () => void;
  onForge: () => void;
  onClickEquipSlot: (slot: "weapon" | "armor") => void;
  onConfirmUnequip: (slot: "weapon" | "armor") => void;
};

export type ResourcePreviewCardProps = {
  location: ResourceLocation;
  forgeSubTab: ForgeSubTab;
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
  exploreCurrentEvent: ExploreTimelineEvent | null;
  exploreVisibleEvents: ExploreTimelineEvent[];
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
  onCraftByRecipeId: (id: CombineRecipeId) => void;
  activityLogs: ActivityLogEntry[];
  actions: ResourcePreviewCardActionProps;
  frameSrc?: string;
  artSrc?: string;
};
