import { useEffect, useMemo, useState } from "react";

import { EXPLORE_ITEMS_PER_PAGE, exploreFloorCards } from "@/components/resource-card/constants";
import type { Floor } from "@/domain/state";

type UseExploreSelectionArgs = {
  currentFloor: Floor;
  unlockedFloor: Floor;
  isExploring: boolean;
  onSetFloor: (floor: Floor) => void;
};

export const useExploreSelection = ({
  currentFloor,
  unlockedFloor,
  isExploring,
  onSetFloor,
}: UseExploreSelectionArgs) => {
  const [selectedExploreCardId, setSelectedExploreCardId] = useState<number | null>(null);
  const [explorePageIndex, setExplorePageIndex] = useState(0);

  const explorePageCount = Math.ceil(exploreFloorCards.length / EXPLORE_ITEMS_PER_PAGE);
  const visibleExploreCards = exploreFloorCards.slice(
    explorePageIndex * EXPLORE_ITEMS_PER_PAGE,
    (explorePageIndex + 1) * EXPLORE_ITEMS_PER_PAGE,
  );
  const selectedExploreCard = useMemo(
    () =>
      selectedExploreCardId
        ? exploreFloorCards.find((card) => card.id === selectedExploreCardId) ?? null
        : null,
    [selectedExploreCardId],
  );

  useEffect(() => {
    if (!isExploring) {
      return;
    }
    const cardFromCurrentFloor =
      exploreFloorCards.find((card) => card.id === currentFloor) ??
      exploreFloorCards.find((card) => card.actualFloor === currentFloor) ??
      null;
    if (!cardFromCurrentFloor) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedExploreCardId(cardFromCurrentFloor.id);
    setExplorePageIndex(Math.floor((cardFromCurrentFloor.id - 1) / EXPLORE_ITEMS_PER_PAGE));
  }, [currentFloor, isExploring]);

  const onToggleExploreCard = (cardId: number, actualFloor: Floor, isBlocked: boolean) => {
    if (isBlocked) {
      return;
    }
    const next = selectedExploreCardId === cardId ? null : cardId;
    setSelectedExploreCardId(next);
    if (next !== null) {
      onSetFloor(actualFloor);
    }
  };

  return {
    selectedExploreCardId,
    explorePageIndex,
    setExplorePageIndex,
    explorePageCount,
    visibleExploreCards,
    selectedExploreCard,
    onToggleExploreCard,
    unlockedFloor,
  };
};

