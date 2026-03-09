import type { CombineRecipe, CombineRecipeId } from "@/components/resource-card/types";

type ForgeCombinePanelProps = {
  isActionLocked: boolean;
  visibleCombineRecipes: CombineRecipe[];
  selectedCombineRecipeId: CombineRecipeId;
  selectedCombineRecipe: CombineRecipe | null;
  setSelectedCombineRecipeId: (id: CombineRecipeId) => void;
  combinePageIndex: number;
  goPrevPage: () => void;
  goNextPage: () => void;
  combinePageCount: number;
  onCraftByRecipeId: (id: CombineRecipeId) => void;
};

export const ForgeCombinePanel = ({
  isActionLocked,
  visibleCombineRecipes,
  selectedCombineRecipeId,
  selectedCombineRecipe,
  setSelectedCombineRecipeId,
  combinePageIndex,
  goPrevPage,
  goNextPage,
  combinePageCount,
  onCraftByRecipeId,
}: ForgeCombinePanelProps) => (
  <div className="resource-combine-panel">
    <div className="resource-combine-page-shell">
      <div className="resource-combine-page-list">
        {visibleCombineRecipes.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            className={`resource-combine-row ${selectedCombineRecipeId === recipe.id ? "is-selected" : ""}`}
            onClick={() => setSelectedCombineRecipeId(recipe.id)}
            disabled={isActionLocked}
          >
            <span className="resource-combine-left">{recipe.name} 조합</span>
            <span className="resource-combine-right">{recipe.costText}</span>
          </button>
        ))}
      </div>
    </div>

    <div className="resource-combine-page-row">
      <div className="resource-combine-page-nav">
        <button
          type="button"
          className="resource-combine-page-btn"
          onClick={goPrevPage}
          disabled={isActionLocked || combinePageIndex <= 0}
        >
          {"<"}
        </button>
        <span className="resource-combine-page-indicator">{String(combinePageIndex + 1).padStart(3, "0")}</span>
        <button
          type="button"
          className="resource-combine-page-btn"
          onClick={goNextPage}
          disabled={isActionLocked || combinePageIndex >= combinePageCount - 1}
        >
          {">"}
        </button>
      </div>
    </div>

    <div className="resource-combine-action-area">
      <p className={`resource-combine-status ${selectedCombineRecipe?.canCraft ? "is-ready" : ""}`}>
        {selectedCombineRecipe
          ? selectedCombineRecipe.canCraft
            ? "조합이 가능합니다"
            : selectedCombineRecipe.blockedReason ?? "조합할 수 없습니다"
          : "조합 항목을 선택해 주세요"}
      </p>
      <button
        type="button"
        className="resource-card-action-btn resource-card-action-btn-wide resource-combine-craft-btn"
        onClick={() => {
          if (selectedCombineRecipe?.canCraft) {
            onCraftByRecipeId(selectedCombineRecipe.id);
          }
        }}
        disabled={isActionLocked || !selectedCombineRecipe || !selectedCombineRecipe.canCraft}
      >
        조합
      </button>
    </div>
  </div>
);
