"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { type ForgeSubTab, type ResourceLocation } from "@/components/ResourcePreviewCard";
import type { ForgeValidationResult } from "@/domain/forge";
import { getEnhanceBonusRate } from "@/domain/forgeEconomy";
import type { Action } from "@/domain/reducer";
import type { EquipmentKind, Floor, GameState } from "@/domain/state";

import { createResourceActions } from "./createResourceActions";
import { type EnhanceFxState, ENHANCE_FX_DURATION, forgeReasonText } from "./constants";

type UseHomeForgeActionsArgs = {
  state: GameState;
  dispatch: Dispatch<Action>;
  resourceLocation: ResourceLocation;
  setResourceLocation: Dispatch<SetStateAction<ResourceLocation>>;
  forgeSubTab: ForgeSubTab;
  setForgeSubTab: Dispatch<SetStateAction<ForgeSubTab>>;
  setSelectedInventoryItemId: Dispatch<SetStateAction<string | null>>;
  selectedInventoryItem: { id: string; kind: "weapon" | "armor" } | null;
  resolvedSelectedInventoryItemId: string | null;
  forgeSlots: {
    selectedTarget: { id: string } | null;
    selectedMaterial: { id: string } | null;
    setForgeTargetItemId: (id: string | null) => void;
    setForgeMaterialItemId: (id: string | null) => void;
    handleDropToForgeSlot: (slot: "target" | "material", itemId: string) => void;
    clearSlots: () => void;
  };
  forgeValidation: ForgeValidationResult;
  enhanceFinalRate: number;
  enhanceFailStreak: number;
  pushLog: (text: string, tone?: "info" | "success" | "warn") => void;
  startExplore: () => void;
  confirmExplore: () => void;
  triggerRest: () => void;
};

export const useHomeForgeActions = ({
  state,
  dispatch,
  resourceLocation,
  setResourceLocation,
  forgeSubTab,
  setForgeSubTab,
  setSelectedInventoryItemId,
  selectedInventoryItem,
  resolvedSelectedInventoryItemId,
  forgeSlots,
  forgeValidation,
  enhanceFinalRate,
  enhanceFailStreak,
  pushLog,
  startExplore,
  confirmExplore,
  triggerRest,
}: UseHomeForgeActionsArgs) => {
  const [enhanceFxState, setEnhanceFxState] = useState<EnhanceFxState>("idle");
  const enhanceFxTimerRef = useRef<number | null>(null);
  const inResourceEnhanceMode = resourceLocation === "forge" && forgeSubTab === "enhance";

  useEffect(() => {
    return () => {
      if (enhanceFxTimerRef.current !== null) {
        window.clearTimeout(enhanceFxTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!inResourceEnhanceMode && enhanceFxState !== "idle") {
      setEnhanceFxState("idle");
    }
  }, [enhanceFxState, inResourceEnhanceMode]);

  const triggerEnhanceFx = useCallback((nextState: EnhanceFxState) => {
    if (enhanceFxTimerRef.current !== null) {
      window.clearTimeout(enhanceFxTimerRef.current);
    }
    setEnhanceFxState(nextState);
    if (nextState === "idle") {
      return;
    }
    const duration = ENHANCE_FX_DURATION[nextState];
    enhanceFxTimerRef.current = window.setTimeout(() => {
      setEnhanceFxState("idle");
    }, duration);
  }, []);

  const handleForge = useCallback(() => {
    triggerEnhanceFx("attempt");
    pushLog("강화 시도", "info");

    if (!forgeValidation.ok) {
      triggerEnhanceFx("fail");
      pushLog(`강화 실패: ${forgeReasonText[forgeValidation.reason]}`, "warn");
      return;
    }

    if (!inResourceEnhanceMode) {
      dispatch({
        type: "FORGE_ENHANCE",
        targetItemId: forgeValidation.target.id,
        materialItemId: forgeValidation.material.id,
      });
      triggerEnhanceFx("success");
      pushLog("강화 성공!", "success");
      forgeSlots.clearSlots();
      return;
    }

    const success = Math.random() < enhanceFinalRate;
    if (success) {
      dispatch({
        type: "FORGE_ENHANCE_SUCCESS",
        targetItemId: forgeValidation.target.id,
        materialItemId: forgeValidation.material.id,
      });
      pushLog("강화 성공!", "success");
      triggerEnhanceFx("success");
      forgeSlots.clearSlots();
      return;
    }

    dispatch({
      type: "FORGE_ENHANCE_FAIL_MATERIAL_DESTROYED",
      targetItemId: forgeValidation.target.id,
      materialItemId: forgeValidation.material.id,
    });
    pushLog("강화 실패: 재료 장비가 파괴되었습니다.", "warn");
    pushLog(`실패 보정 누적: +${(getEnhanceBonusRate(enhanceFailStreak + 1) * 100).toFixed(1)}%`, "info");
    triggerEnhanceFx("fail");
    forgeSlots.setForgeMaterialItemId(null);
  }, [dispatch, enhanceFailStreak, enhanceFinalRate, forgeSlots, forgeValidation, inResourceEnhanceMode, pushLog, triggerEnhanceFx]);

  const handleResourceEquipSlotClick = useCallback(
    (slot: EquipmentKind) => {
      if (state.isExploring || resourceLocation !== "village") {
        return;
      }
      if (!selectedInventoryItem) {
        return;
      }
      if (selectedInventoryItem.kind !== slot) {
        setSelectedInventoryItemId(null);
        return;
      }
      dispatch({ type: "EQUIP", itemId: selectedInventoryItem.id, slot });
    },
    [dispatch, resourceLocation, selectedInventoryItem, setSelectedInventoryItemId, state.isExploring],
  );

  const handleResourceConfirmUnequip = useCallback(
    (slot: EquipmentKind) => {
      if (state.isExploring || resourceLocation !== "village") {
        return;
      }
      dispatch({ type: "UNEQUIP", slot });
    },
    [dispatch, resourceLocation, state.isExploring],
  );

  const handleResetGame = useCallback(() => {
    if (enhanceFxTimerRef.current !== null) {
      window.clearTimeout(enhanceFxTimerRef.current);
      enhanceFxTimerRef.current = null;
    }
    setEnhanceFxState("idle");
    setSelectedInventoryItemId(null);
    setResourceLocation("village");
    setForgeSubTab("craft");
    forgeSlots.clearSlots();
    dispatch({ type: "RESET" });
    pushLog("게임 상태가 초기화되었습니다.", "info");
  }, [dispatch, forgeSlots, pushLog, setForgeSubTab, setResourceLocation, setSelectedInventoryItemId]);

  const onCraftByRecipeId = useCallback(
    (id: string) => {
      if (id.startsWith("steel")) {
        dispatch({ type: "CRAFT_STEEL" });
        return;
      }
      dispatch({ type: "CRAFT_MITHRIL" });
    },
    [dispatch],
  );

  const resourceActions = useMemo(
    () =>
      createResourceActions({
        onGoVillage: () => setResourceLocation("village"),
        onGoInn: () => setResourceLocation("inn"),
        onGoForge: () => {
          setResourceLocation("forge");
          setForgeSubTab("craft");
        },
        onGoExplore: () => setResourceLocation("explore"),
        onSetForgeSubTab: setForgeSubTab,
        onSetFloor: (floor: Floor) => dispatch({ type: "SET_FLOOR", floor }),
        onExploreStart: startExplore,
        onExploreConfirm: confirmExplore,
        onRest: triggerRest,
        onCraftWeapon: () => dispatch({ type: "CRAFT_WEAPON" }),
        onCraftArmor: () => dispatch({ type: "CRAFT_ARMOR" }),
        onCraftSteel: () => dispatch({ type: "CRAFT_STEEL" }),
        onCraftMithril: () => dispatch({ type: "CRAFT_MITHRIL" }),
        onUpgradeForge: () => dispatch({ type: "UPGRADE_FORGE" }),
        onClickTargetSlot: () => {
          if (resolvedSelectedInventoryItemId) {
            forgeSlots.handleDropToForgeSlot("target", resolvedSelectedInventoryItemId);
            return;
          }
          if (forgeSlots.selectedTarget) {
            forgeSlots.setForgeTargetItemId(null);
          }
        },
        onClickMaterialSlot: () => {
          if (resolvedSelectedInventoryItemId) {
            forgeSlots.handleDropToForgeSlot("material", resolvedSelectedInventoryItemId);
            return;
          }
          if (forgeSlots.selectedMaterial) {
            forgeSlots.setForgeMaterialItemId(null);
          }
        },
        onForge: handleForge,
        onClickEquipSlot: handleResourceEquipSlotClick,
        onConfirmUnequip: handleResourceConfirmUnequip,
      }),
    [
      confirmExplore,
      dispatch,
      forgeSlots,
      handleForge,
      handleResourceConfirmUnequip,
      handleResourceEquipSlotClick,
      resolvedSelectedInventoryItemId,
      setForgeSubTab,
      setResourceLocation,
      startExplore,
      triggerRest,
    ],
  );

  return {
    enhanceFxState,
    handleResetGame,
    onCraftByRecipeId,
    resourceActions,
  };
};
