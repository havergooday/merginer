import type { ResourcePreviewCardActionProps } from "@/components/resource-card/types";

type ResourceCardNavigationProps = {
  isCommonNavigationLocked: boolean;
  actions: ResourcePreviewCardActionProps;
};

export const ResourceCardNavigation = ({
  isCommonNavigationLocked,
  actions,
}: ResourceCardNavigationProps) => {
  const lockedClassName = isCommonNavigationLocked ? " is-locked" : "";

  return (
    <div className="resource-card-utility-slot">
      <button
        type="button"
        className={`resource-card-utility-btn${lockedClassName}`}
        onClick={actions.onGoVillage}
        disabled={isCommonNavigationLocked}
        aria-disabled={isCommonNavigationLocked}
      >
        마을
      </button>
      <button
        type="button"
        className={`resource-card-utility-btn${lockedClassName}`}
        onClick={actions.onGoInn}
        disabled={isCommonNavigationLocked}
        aria-disabled={isCommonNavigationLocked}
      >
        여관
      </button>
      <button
        type="button"
        className={`resource-card-utility-btn${lockedClassName}`}
        onClick={actions.onGoForge}
        disabled={isCommonNavigationLocked}
        aria-disabled={isCommonNavigationLocked}
      >
        대장간
      </button>
      <button
        type="button"
        className={`resource-card-utility-btn${lockedClassName}`}
        onClick={actions.onGoExplore}
        disabled={isCommonNavigationLocked}
        aria-disabled={isCommonNavigationLocked}
      >
        탐사
      </button>
    </div>
  );
};
