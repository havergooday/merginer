import type { ResourcePreviewCardActionProps } from "@/components/ResourcePreviewCard";
import type { Floor } from "@/domain/state";

type CreateResourceActionsArgs = {
  onGoVillage: () => void;
  onGoInn: () => void;
  onGoForge: () => void;
  onGoExplore: () => void;
  onSetForgeSubTab: ResourcePreviewCardActionProps["onSetForgeSubTab"];
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
  onClickEquipSlot: ResourcePreviewCardActionProps["onClickEquipSlot"];
  onConfirmUnequip: ResourcePreviewCardActionProps["onConfirmUnequip"];
};

export const createResourceActions = (args: CreateResourceActionsArgs): ResourcePreviewCardActionProps => ({
  onGoVillage: args.onGoVillage,
  onGoInn: args.onGoInn,
  onGoForge: args.onGoForge,
  onGoExplore: args.onGoExplore,
  onSetForgeSubTab: args.onSetForgeSubTab,
  onSetFloor: args.onSetFloor,
  onExploreStart: args.onExploreStart,
  onExploreConfirm: args.onExploreConfirm,
  onRest: args.onRest,
  onCraftWeapon: args.onCraftWeapon,
  onCraftArmor: args.onCraftArmor,
  onCraftSteel: args.onCraftSteel,
  onCraftMithril: args.onCraftMithril,
  onUpgradeForge: args.onUpgradeForge,
  onClickTargetSlot: args.onClickTargetSlot,
  onClickMaterialSlot: args.onClickMaterialSlot,
  onForge: args.onForge,
  onClickEquipSlot: args.onClickEquipSlot,
  onConfirmUnequip: args.onConfirmUnequip,
});
