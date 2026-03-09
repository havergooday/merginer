import type { ResourceLocation, ResourcePreviewCardActionProps } from "@/components/resource-card/types";

type ResourceCardNavigationProps = {
  isCommonNavigationLocked: boolean;
  location: ResourceLocation;
  actions: ResourcePreviewCardActionProps;
};

export const ResourceCardNavigation = ({
  isCommonNavigationLocked,
  location,
  actions,
}: ResourceCardNavigationProps) => {
  const getButtonClassName = (target: ResourceLocation) => {
    const classes = ["resource-card-utility-btn"];
    if (location === target) {
      classes.push("is-current");
    }
    if (isCommonNavigationLocked) {
      classes.push("is-locked");
    }
    return classes.join(" ");
  };

  return (
    <div className="resource-card-utility-slot">
      <button
        type="button"
        className={getButtonClassName("village")}
        onClick={actions.onGoVillage}
        disabled={isCommonNavigationLocked}
        aria-disabled={isCommonNavigationLocked}
      >
        마을
      </button>
      <button
        type="button"
        className={getButtonClassName("inn")}
        onClick={actions.onGoInn}
        disabled={isCommonNavigationLocked}
        aria-disabled={isCommonNavigationLocked}
      >
        여관
      </button>
      <button
        type="button"
        className={getButtonClassName("forge")}
        onClick={actions.onGoForge}
        disabled={isCommonNavigationLocked}
        aria-disabled={isCommonNavigationLocked}
      >
        대장간
      </button>
      <button
        type="button"
        className={getButtonClassName("explore")}
        onClick={actions.onGoExplore}
        disabled={isCommonNavigationLocked}
        aria-disabled={isCommonNavigationLocked}
      >
        탐사
      </button>
    </div>
  );
};
