"use client";

import { useEffect, useMemo, useReducer, useState } from "react";

import { type CombineRecipe, type ForgeSubTab, type ResourceLocation } from "@/components/ResourcePreviewCard";
import { validateForge } from "@/domain/forge";
import {
  ORE_TO_STEEL_COST,
  STEEL_TO_MITHRIL_COST,
  canCraftMithril,
  canCraftSteel,
  canUpgradeForge,
  getCraftCost,
  getEnhanceBaseSuccessRate,
  getEnhanceBonusRate,
  getEnhanceFinalSuccessRate,
  getRequiredForgeLevelForEnhance,
} from "@/domain/forgeEconomy";
import { reducer } from "@/domain/reducer";
import { calcAttackFromEquipped, calcMaxHpFromEquippedArmor } from "@/domain/selectors";
import { createInitialGameState } from "@/domain/state";
import { canAssignToForgeMaterial, canAssignToForgeTarget } from "@/domain/usecases/itemSelection";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useExploreProgress } from "@/hooks/useExploreProgress";
import { useForgeSlots } from "@/hooks/useForgeSlots";
import { useRestCountdown } from "@/hooks/useRestCountdown";
import { loadState, saveState } from "@/lib/storage";

import { formatMaterialCost, forgeReasonText, type TextScaleMode, TEXT_SCALE_PIXELS } from "./constants";

const getInitialState = () => {
  const stored = loadState();
  return stored ?? createInitialGameState();
};

export const useHomeGameState = () => {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  const [textScaleMode, setTextScaleMode] = useState<TextScaleMode>("small");
  const [resourceLocation, setResourceLocation] = useState<ResourceLocation>("village");
  const [forgeSubTab, setForgeSubTab] = useState<ForgeSubTab>("craft");
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string | null>(null);
  const { logs: activityLogs, pushLog } = useActivityLog();

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${TEXT_SCALE_PIXELS[textScaleMode]}px`;
  }, [textScaleMode]);

  const equippedWeapon = useMemo(
    () => state.equipmentItems.find((item) => item.id === state.equippedWeaponItemId) ?? null,
    [state.equipmentItems, state.equippedWeaponItemId],
  );
  const equippedArmor = useMemo(
    () => state.equipmentItems.find((item) => item.id === state.equippedArmorItemId) ?? null,
    [state.equipmentItems, state.equippedArmorItemId],
  );

  const maxHp = useMemo(
    () => calcMaxHpFromEquippedArmor(state.equippedArmorItemId, state.equipmentItems),
    [state.equippedArmorItemId, state.equipmentItems],
  );
  const currentHp = Math.max(0, Math.min(state.hp, maxHp));
  const attack = useMemo(
    () => calcAttackFromEquipped(state.equippedWeaponItemId, state.equipmentItems),
    [state.equippedWeaponItemId, state.equipmentItems],
  );
  const enhanceFailStreak = Number.isFinite(state.enhanceFailStreak) ? state.enhanceFailStreak : 0;

  const inventoryBaseItems = useMemo(
    () =>
      state.equipmentItems.filter(
        (item) => item.id !== state.equippedWeaponItemId && item.id !== state.equippedArmorItemId,
      ),
    [state.equipmentItems, state.equippedWeaponItemId, state.equippedArmorItemId],
  );
  const inventoryBaseMap = useMemo(() => new Map(inventoryBaseItems.map((item) => [item.id, item])), [inventoryBaseItems]);
  const forgeSlots = useForgeSlots(inventoryBaseMap);

  const inventoryItems = useMemo(
    () =>
      inventoryBaseItems.filter(
        (item) => item.id !== forgeSlots.forgeTargetItemId && item.id !== forgeSlots.forgeMaterialItemId,
      ),
    [inventoryBaseItems, forgeSlots.forgeTargetItemId, forgeSlots.forgeMaterialItemId],
  );
  const resolvedSelectedInventoryItemId = useMemo(
    () => (selectedInventoryItemId && inventoryItems.some((item) => item.id === selectedInventoryItemId) ? selectedInventoryItemId : null),
    [inventoryItems, selectedInventoryItemId],
  );
  const selectedInventoryItem = useMemo(
    () =>
      resolvedSelectedInventoryItemId
        ? inventoryItems.find((item) => item.id === resolvedSelectedInventoryItemId) ?? null
        : null,
    [inventoryItems, resolvedSelectedInventoryItemId],
  );
  const canSelectAsTarget = canAssignToForgeTarget(resolvedSelectedInventoryItemId, forgeSlots.forgeMaterialItemId);
  const canSelectAsMaterial = canAssignToForgeMaterial(resolvedSelectedInventoryItemId, forgeSlots.forgeTargetItemId);

  const craftCost = useMemo(() => getCraftCost(state.forgeLevel), [state.forgeLevel]);
  const canCraftSteelNow = useMemo(
    () => canCraftSteel(state.forgeLevel, state.materials.ironOre),
    [state.forgeLevel, state.materials.ironOre],
  );
  const canCraftMithrilNow = useMemo(
    () => canCraftMithril(state.forgeLevel, state.materials.steelOre),
    [state.forgeLevel, state.materials.steelOre],
  );
  const canUpgradeForgeNow = useMemo(
    () => canUpgradeForge(state.forgeLevel) && state.materials.ironOre >= state.forgeUpgradeCost,
    [state.forgeLevel, state.materials.ironOre, state.forgeUpgradeCost],
  );

  const combineRecipes = useMemo<CombineRecipe[]>(() => {
    const steelBlockedReason =
      state.forgeLevel < 2 ? "대장간 레벨이 부족합니다" : state.materials.ironOre < ORE_TO_STEEL_COST ? "재료가 부족합니다" : undefined;
    const mithrilBlockedReason =
      state.forgeLevel < 4
        ? "대장간 레벨이 부족합니다"
        : state.materials.steelOre < STEEL_TO_MITHRIL_COST
          ? "재료가 부족합니다"
          : undefined;

    const steelRecipes: CombineRecipe[] = Array.from({ length: 7 }, (_, index) => ({
      id: `steel-${index + 1}`,
      name: "강철석",
      costText: `철광석 ${ORE_TO_STEEL_COST}개`,
      canCraft: canCraftSteelNow,
      blockedReason: steelBlockedReason,
    }));

    return [
      ...steelRecipes,
      {
        id: "mithril-1",
        name: "미스릴",
        costText: `강철석 ${STEEL_TO_MITHRIL_COST}개`,
        canCraft: canCraftMithrilNow,
        blockedReason: mithrilBlockedReason,
      },
    ];
  }, [canCraftMithrilNow, canCraftSteelNow, state.forgeLevel, state.materials.ironOre, state.materials.steelOre]);

  const forgeValidation = useMemo(
    () => validateForge(state, forgeSlots.selectedTarget?.id ?? null, forgeSlots.selectedMaterial?.id ?? null),
    [state, forgeSlots.selectedTarget, forgeSlots.selectedMaterial],
  );
  const forgeGuide =
    forgeValidation.ok
      ? `강화 준비 완료: +${forgeValidation.target.plus} -> +${forgeValidation.target.plus + 1} (${formatMaterialCost(
          forgeValidation.target.plus,
        )}, 요구 대장간 ${getRequiredForgeLevelForEnhance(forgeValidation.target.plus)} / 현재 ${state.forgeLevel})`
      : forgeReasonText[forgeValidation.reason];

  const enhanceBaseRate = useMemo(
    () => (forgeSlots.selectedTarget ? getEnhanceBaseSuccessRate(forgeSlots.selectedTarget.plus) : 0),
    [forgeSlots.selectedTarget],
  );
  const enhanceBonusRate = useMemo(
    () => (forgeSlots.selectedTarget ? getEnhanceBonusRate(enhanceFailStreak) : 0),
    [enhanceFailStreak, forgeSlots.selectedTarget],
  );
  const enhanceFinalRate = useMemo(
    () =>
      forgeSlots.selectedTarget
        ? getEnhanceFinalSuccessRate(forgeSlots.selectedTarget.plus, enhanceFailStreak)
        : 0,
    [enhanceFailStreak, forgeSlots.selectedTarget],
  );

  const { enhanceRequirementLine1, enhanceRequirementLine2 } = useMemo(() => {
    const target = forgeSlots.selectedTarget;
    if (!target) {
      return {
        enhanceRequirementLine1: "필요 재료: 대상 슬롯에 장비를 넣어주세요",
        enhanceRequirementLine2: "요구 대장간: -",
      };
    }

    const requiredLevel = getRequiredForgeLevelForEnhance(target.plus);
    return {
      enhanceRequirementLine1: `필요 재료: ${formatMaterialCost(target.plus)}`,
      enhanceRequirementLine2: `요구 대장간: Lv${requiredLevel} (현재 Lv${state.forgeLevel})`,
    };
  }, [forgeSlots.selectedTarget, state.forgeLevel]);

  const enhanceRequirementLine3 = useMemo(() => {
    if (!forgeSlots.selectedTarget) {
      return "대상 아이템을 넣어주세요";
    }
    if (!forgeSlots.selectedMaterial) {
      return "재료를 넣어주세요";
    }
    if (forgeValidation.ok) {
      return "강화가 가능합니다";
    }
    return forgeReasonText[forgeValidation.reason];
  }, [forgeSlots.selectedMaterial, forgeSlots.selectedTarget, forgeValidation]);

  const canUseRestNow = currentHp < maxHp && !state.isExploring;
  const { isResting, restRemainingSec, triggerRest } = useRestCountdown(dispatch, canUseRestNow);

  const {
    session: exploreSession,
    startExplore,
    confirmExplore,
    exploreSpeedMode,
    setExploreSpeedMode,
  } = useExploreProgress({
    currentFloor: state.currentFloor,
    currentHp,
    attack,
    isExploring: state.isExploring,
    isResting,
    presentationMode: "event",
    dispatch,
  });

  const displayedCurrentHp =
    state.isExploring && exploreSession ? Math.max(0, Math.min(exploreSession.popupCurrentHp, maxHp)) : currentHp;

  return {
    state,
    dispatch,
    textScaleMode,
    setTextScaleMode,
    resourceLocation,
    setResourceLocation,
    forgeSubTab,
    setForgeSubTab,
    selectedInventoryItemId,
    setSelectedInventoryItemId,
    activityLogs,
    pushLog,
    equippedWeapon,
    equippedArmor,
    maxHp,
    currentHp,
    displayedCurrentHp,
    attack,
    enhanceFailStreak,
    inventoryItems,
    forgeSlots,
    resolvedSelectedInventoryItemId,
    selectedInventoryItem,
    canSelectAsTarget,
    canSelectAsMaterial,
    craftCost,
    canCraftSteelNow,
    canCraftMithrilNow,
    canUpgradeForgeNow,
    combineRecipes,
    forgeValidation,
    forgeGuide,
    enhanceBaseRate,
    enhanceBonusRate,
    enhanceFinalRate,
    enhanceRequirementLine1,
    enhanceRequirementLine2,
    enhanceRequirementLine3,
    canUseRestNow,
    isResting,
    restRemainingSec,
    triggerRest,
    exploreSession,
    startExplore,
    confirmExplore,
    exploreSpeedMode,
    setExploreSpeedMode,
  };
};
