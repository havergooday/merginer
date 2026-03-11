import { getEnhanceMaterialCost } from "@/domain/forgeEconomy";

export type EnhanceFxState = "idle" | "attempt" | "success" | "fail";
export type TextScaleMode = "small" | "medium" | "large";

export const ENHANCE_FX_DURATION: Record<EnhanceFxState, number> = {
  idle: 0,
  attempt: 180,
  success: 520,
  fail: 1040,
};

export const TEXT_SCALE_PIXELS: Record<TextScaleMode, number> = {
  small: 17.5,
  medium: 18.5,
  large: 19.5,
};

export const forgeReasonText: Record<string, string> = {
  MISSING_SELECTION: "강화할 장비 2개를 슬롯에 넣어주세요.",
  SAME_ITEM: "같은 칸에 같은 장비를 두 번 넣을 수 없습니다.",
  ITEM_NOT_FOUND: "장비를 다시 선택해 주세요.",
  EQUIPPED_ITEM: "장착 중인 장비는 강화 재료로 사용할 수 없습니다.",
  KIND_MISMATCH: "같은 장비끼리만 합성이 가능합니다",
  PLUS_MISMATCH: "같은 등급의 장비만 합성이 가능합니다",
  FORGE_LEVEL_TOO_LOW_FOR_STEEL: "강철석 강화는 대장간 3레벨 이상 필요합니다.",
  FORGE_LEVEL_TOO_LOW_FOR_MITHRIL: "미스릴 강화는 대장간 5레벨 이상 필요합니다.",
  INSUFFICIENT_IRON_ORE: "철광석이 부족합니다.",
  INSUFFICIENT_STEEL_ORE: "강철석이 부족합니다.",
  INSUFFICIENT_MITHRIL: "미스릴이 부족합니다.",
};

export const formatMaterialCost = (plus: number): string => {
  const cost = getEnhanceMaterialCost(plus);
  const parts: string[] = [];
  if ((cost.ironOre ?? 0) > 0) {
    parts.push(`철광석 ${cost.ironOre}`);
  }
  if ((cost.steelOre ?? 0) > 0) {
    parts.push(`강철석 ${cost.steelOre}`);
  }
  if ((cost.mithril ?? 0) > 0) {
    parts.push(`미스릴 ${cost.mithril}`);
  }
  return parts.length > 0 ? parts.join(" + ") : "추가 재료 없음";
};
