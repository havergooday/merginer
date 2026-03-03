export const toggleSelectedItemId = (currentSelectedItemId: string | null, clickedItemId: string): string | null => {
  return currentSelectedItemId === clickedItemId ? null : clickedItemId;
};

export const canAssignToForgeTarget = (
  selectedItemId: string | null,
  forgeMaterialItemId: string | null,
): boolean => {
  return !!selectedItemId && selectedItemId !== forgeMaterialItemId;
};

export const canAssignToForgeMaterial = (
  selectedItemId: string | null,
  forgeTargetItemId: string | null,
): boolean => {
  return !!selectedItemId && selectedItemId !== forgeTargetItemId;
};

