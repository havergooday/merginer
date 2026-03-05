import { useEffect, useState } from "react";

import type { CombineRecipe, CombineRecipeId } from "@/components/resource-card/types";

export const useCombineSelection = (combineRecipes: CombineRecipe[]) => {
  const [selectedCombineRecipeId, setSelectedCombineRecipeId] = useState<CombineRecipeId>("steel-1");

  useEffect(() => {
    if (combineRecipes.length === 0) {
      return;
    }
    if (!combineRecipes.some((recipe) => recipe.id === selectedCombineRecipeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCombineRecipeId(combineRecipes[0].id);
    }
  }, [combineRecipes, selectedCombineRecipeId]);

  const selectedCombineRecipe =
    combineRecipes.find((recipe) => recipe.id === selectedCombineRecipeId) ?? null;

  return {
    selectedCombineRecipeId,
    setSelectedCombineRecipeId,
    selectedCombineRecipe,
  };
};

