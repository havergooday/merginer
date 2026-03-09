import { useEffect, useState } from "react";

import type { CombineRecipe, CombineRecipeId } from "@/components/resource-card/types";

const COMBINE_ITEMS_PER_PAGE = 3;

export const useCombineSelection = (combineRecipes: CombineRecipe[]) => {
  const [selectedCombineRecipeId, setSelectedCombineRecipeId] = useState<CombineRecipeId>("steel-1");
  const [combinePageIndex, setCombinePageIndex] = useState(0);

  useEffect(() => {
    if (combineRecipes.length === 0) {
      return;
    }
    if (!combineRecipes.some((recipe) => recipe.id === selectedCombineRecipeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCombineRecipeId(combineRecipes[0].id);
    }
  }, [combineRecipes, selectedCombineRecipeId]);

  const combinePageCount = Math.max(1, Math.ceil(combineRecipes.length / COMBINE_ITEMS_PER_PAGE));

  useEffect(() => {
    if (combinePageIndex >= combinePageCount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCombinePageIndex(combinePageCount - 1);
    }
  }, [combinePageCount, combinePageIndex]);

  const visibleCombineRecipes = combineRecipes.slice(
    combinePageIndex * COMBINE_ITEMS_PER_PAGE,
    (combinePageIndex + 1) * COMBINE_ITEMS_PER_PAGE,
  );

  const selectedCombineRecipe =
    combineRecipes.find((recipe) => recipe.id === selectedCombineRecipeId) ?? null;

  const goToPage = (nextPageIndex: number) => {
    if (combineRecipes.length === 0) {
      return;
    }
    const safePageIndex = Math.max(0, Math.min(combinePageCount - 1, nextPageIndex));
    setCombinePageIndex(safePageIndex);
    const nextVisibleRecipes = combineRecipes.slice(
      safePageIndex * COMBINE_ITEMS_PER_PAGE,
      (safePageIndex + 1) * COMBINE_ITEMS_PER_PAGE,
    );
    if (nextVisibleRecipes.length > 0) {
      setSelectedCombineRecipeId(nextVisibleRecipes[0].id);
    }
  };

  const goPrevPage = () => goToPage(combinePageIndex - 1);
  const goNextPage = () => goToPage(combinePageIndex + 1);

  return {
    selectedCombineRecipeId,
    setSelectedCombineRecipeId,
    combinePageIndex,
    goPrevPage,
    goNextPage,
    combinePageCount,
    visibleCombineRecipes,
    selectedCombineRecipe,
  };
};
