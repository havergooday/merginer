"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { ForgeSideInventorySplitBox } from "@/components/ForgeSideInventorySplitBox";
import {
  type CombineRecipe,
  ResourcePreviewCard,
  type ForgeSubTab,
  type ResourceLocation,
} from "@/components/ResourcePreviewCard";
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
  getEnhanceMaterialCost,
  getRequiredForgeLevelForEnhance,
} from "@/domain/forgeEconomy";
import { reducer } from "@/domain/reducer";
import { calcAttackFromEquipped, calcMaxHpFromEquippedArmor } from "@/domain/selectors";
import { createInitialGameState, type EquipmentKind, type Floor } from "@/domain/state";
import {
  canAssignToForgeMaterial,
  canAssignToForgeTarget,
  toggleSelectedItemId,
} from "@/domain/usecases/itemSelection";
import { useExploreProgress } from "@/hooks/useExploreProgress";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useForgeSlots } from "@/hooks/useForgeSlots";
import { formatAsMmSs, useRestCountdown } from "@/hooks/useRestCountdown";
import { loadState, saveState } from "@/lib/storage";

type EnhanceFxState = "idle" | "attempt" | "success" | "fail";
type TextScaleMode = "small" | "medium" | "large";
const ENHANCE_FX_DURATION: Record<EnhanceFxState, number> = {
  idle: 0,
  attempt: 180,
  success: 520,
  fail: 1040,
};
const TEXT_SCALE_PIXELS: Record<TextScaleMode, number> = {
  small: 17.5,
  medium: 18.5,
  large: 19.5,
};

const getInitialState = () => {
  const stored = loadState();
  return stored ?? createInitialGameState();
};

const forgeReasonText: Record<string, string> = {
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

const formatMaterialCost = (plus: number): string => {
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

export default function Home() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  const [textScaleMode, setTextScaleMode] = useState<TextScaleMode>("small");
  const [resourceLocation, setResourceLocation] = useState<ResourceLocation>("village");
  const [forgeSubTab, setForgeSubTab] = useState<ForgeSubTab>("craft");
  const [enhanceFxState, setEnhanceFxState] = useState<EnhanceFxState>("idle");
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string | null>(null);
  const enhanceFxTimerRef = useRef<number | null>(null);
  const { logs: activityLogs, pushLog } = useActivityLog();

  useEffect(() => {
    return () => {
      if (enhanceFxTimerRef.current !== null) {
        window.clearTimeout(enhanceFxTimerRef.current);
      }
    };
  }, []);

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

  const inventoryBaseItems = useMemo(
    () =>
      state.equipmentItems.filter(
        (item) => item.id !== state.equippedWeaponItemId && item.id !== state.equippedArmorItemId,
      ),
    [state.equipmentItems, state.equippedWeaponItemId, state.equippedArmorItemId],
  );

  const inventoryBaseMap = useMemo(
    () => new Map(inventoryBaseItems.map((item) => [item.id, item])),
    [inventoryBaseItems],
  );

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

  const attack = useMemo(
    () => calcAttackFromEquipped(state.equippedWeaponItemId, state.equipmentItems),
    [state.equippedWeaponItemId, state.equipmentItems],
  );
  const enhanceFailStreak = Number.isFinite(state.enhanceFailStreak) ? state.enhanceFailStreak : 0;

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
      state.forgeLevel < 2
        ? "대장간 레벨이 부족합니다"
        : state.materials.ironOre < ORE_TO_STEEL_COST
          ? "재료가 부족합니다"
          : undefined;
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

  const inResourceEnhanceMode = resourceLocation === "forge" && forgeSubTab === "enhance";

  useEffect(() => {
    if (!inResourceEnhanceMode && enhanceFxState !== "idle") {
      setEnhanceFxState("idle");
    }
  }, [enhanceFxState, inResourceEnhanceMode]);

  const triggerEnhanceFx = (nextState: EnhanceFxState) => {
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
  };

  const handleForge = () => {
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
  };


  const handleResourceEquipSlotClick = (slot: EquipmentKind) => {
    if (state.isExploring || resourceLocation !== "village") {
      return;
    }

    if (!selectedInventoryItem) {
      return;
    }

    if (selectedInventoryItem.kind !== slot) {
      return;
    }

    dispatch({ type: "EQUIP", itemId: selectedInventoryItem.id, slot });
  };

  const handleResourceConfirmUnequip = (slot: EquipmentKind) => {
    if (state.isExploring || resourceLocation !== "village") {
      return;
    }
    dispatch({ type: "UNEQUIP", slot });
  };
  const resourceActions = {
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
      if (forgeSlots.selectedTarget) {
        forgeSlots.setForgeTargetItemId(null);
        return;
      }
      if (resolvedSelectedInventoryItemId) {
        forgeSlots.handleDropToForgeSlot("target", resolvedSelectedInventoryItemId);
      }
    },
    onClickMaterialSlot: () => {
      if (forgeSlots.selectedMaterial) {
        forgeSlots.setForgeMaterialItemId(null);
        return;
      }
      if (resolvedSelectedInventoryItemId) {
        forgeSlots.handleDropToForgeSlot("material", resolvedSelectedInventoryItemId);
      }
    },
    onForge: handleForge,
    onClickEquipSlot: handleResourceEquipSlotClick,
    onConfirmUnequip: handleResourceConfirmUnequip,
  };

  return (
    <>
      <main className="min-h-screen p-3 text-[color:var(--ui-text)] sm:p-4">
        <section className="mx-auto mb-3 max-w-7xl">
          <div className="window-panel ui-mode-bar flex items-center justify-end gap-3 p-2">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  className={`ui-btn px-2 py-1 ${textScaleMode === "small" ? "ui-btn-primary" : "ui-btn-neutral"}`}
                  onClick={() => setTextScaleMode("small")}
                >
                  소
                </button>
                <button
                  type="button"
                  className={`ui-btn px-2 py-1 ${textScaleMode === "medium" ? "ui-btn-primary" : "ui-btn-neutral"}`}
                  onClick={() => setTextScaleMode("medium")}
                >
                  중
                </button>
                <button
                  type="button"
                  className={`ui-btn px-2 py-1 ${textScaleMode === "large" ? "ui-btn-primary" : "ui-btn-neutral"}`}
                  onClick={() => setTextScaleMode("large")}
                >
                  대
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="resource-ui-layout mx-auto max-w-7xl">
          <ResourcePreviewCard
            location={resourceLocation}
            forgeSubTab={forgeSubTab}
            currentHp={displayedCurrentHp}
            maxHp={maxHp}
            attack={attack}
            currentFloor={state.currentFloor}
            currentStage={state.currentStage}
            unlockedFloor={state.unlockedFloor}
            canExplore={currentHp > 0 && !isResting && !state.isExploring}
            isExploring={state.isExploring}
            exploreSession={exploreSession}
            exploreSpeedMode={exploreSpeedMode}
            onChangeExploreSpeedMode={setExploreSpeedMode}
            exploreCurrentEvent={exploreSession?.currentEvent ?? null}
            exploreVisibleEvents={exploreSession?.visibleEvents ?? []}
            equippedWeapon={equippedWeapon}
            equippedArmor={equippedArmor}
            isResting={isResting}
            restLabel={formatAsMmSs(restRemainingSec)}
            canUseRest={canUseRestNow && !isResting}
            isActionLocked={state.isExploring}
            ironOre={state.materials.ironOre}
            steelOre={state.materials.steelOre}
            mithril={state.materials.mithril}
            forgeLevel={state.forgeLevel}
            craftCost={craftCost}
            forgeUpgradeCost={state.forgeUpgradeCost}
            canCraftWeapon={state.materials.ironOre >= craftCost}
            canCraftArmor={state.materials.ironOre >= craftCost}
            canCraftSteel={canCraftSteelNow}
            canCraftMithril={canCraftMithrilNow}
            canUpgradeForgeAction={canUpgradeForgeNow}
            selectedInventoryItem={selectedInventoryItem}
            selectedTarget={forgeSlots.selectedTarget}
            selectedMaterial={forgeSlots.selectedMaterial}
            canSelectAsTarget={canSelectAsTarget}
            canSelectAsMaterial={canSelectAsMaterial}
            canForge={forgeValidation.ok}
            forgeGuide={forgeGuide}
            enhanceRequirementLine1={enhanceRequirementLine1}
            enhanceRequirementLine2={enhanceRequirementLine2}
            enhanceRequirementLine3={enhanceRequirementLine3}
            enhanceBaseRate={enhanceBaseRate}
            enhanceBonusRate={enhanceBonusRate}
            enhanceFinalRate={enhanceFinalRate}
            enhanceFxState={enhanceFxState}
            combineRecipes={combineRecipes}
            onCraftByRecipeId={(id) => {
              if (id.startsWith("steel")) {
                dispatch({ type: "CRAFT_STEEL" });
                return;
              }
              dispatch({ type: "CRAFT_MITHRIL" });
            }}
            activityLogs={activityLogs}
            actions={resourceActions}
          />

          <ForgeSideInventorySplitBox
            ironOre={state.materials.ironOre}
            steelOre={state.materials.steelOre}
            mithril={state.materials.mithril}
            inventoryItems={inventoryItems}
            selectedInventoryItemId={resolvedSelectedInventoryItemId}
            selectedInventoryItem={selectedInventoryItem}
            isActionLocked={state.isExploring}
            onSelectInventoryItem={(itemId) =>
              setSelectedInventoryItemId((current) => toggleSelectedItemId(current, itemId))
            }
          />
        </section>
      </main>
    </>
  );
}












