"use client";

import { useEffect, useMemo, useReducer, useState } from "react";

import { CharacterStats } from "@/components/CharacterStats";
import { ExplorePanel } from "@/components/ExplorePanel";
import { ForgePanel } from "@/components/ForgePanel";
import { InnPanel } from "@/components/InnPanel";
import { InventoryPanel } from "@/components/InventoryPanel";
import { MaterialInventoryPanel } from "@/components/MaterialInventoryPanel";
import { type ExploreResult, simulateExplore } from "@/domain/explore";
import { validateForge } from "@/domain/forge";
import {
  canUpgradeForge,
  getCraftCost,
  getEnhanceMaterialCost,
  getRequiredForgeLevelForEnhance,
} from "@/domain/forgeEconomy";
import { reducer } from "@/domain/reducer";
import { calcAttackFromEquipped, calcMaxHpFromEquippedArmor } from "@/domain/selectors";
import { createInitialGameState, type Floor } from "@/domain/state";
import { useForgeSlots } from "@/hooks/useForgeSlots";
import { formatAsMmSs, useRestCountdown } from "@/hooks/useRestCountdown";
import { loadState, saveState } from "@/lib/storage";

const getInitialState = () => {
  const stored = loadState();
  return stored ?? createInitialGameState();
};

const forgeReasonText: Record<string, string> = {
  MISSING_SELECTION: "강화할 장비 2개를 슬롯에 넣어주세요.",
  SAME_ITEM: "같은 칸에 같은 장비를 두 번 넣을 수 없습니다.",
  ITEM_NOT_FOUND: "장비를 다시 선택해 주세요.",
  EQUIPPED_ITEM: "장착 중인 장비는 강화 재료로 사용할 수 없습니다.",
  KIND_MISMATCH: "같은 종류(검/갑옷)의 장비만 강화할 수 있습니다.",
  PLUS_MISMATCH: "동일한 강화 단계의 장비 2개가 필요합니다.",
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

const getExploreEndReasonText = (result: ExploreResult): string => {
  if (result.endReason === "DEFEATED") {
    return `HP가 0이 되어 ${result.clearedStage}단계에서 탐험이 종료되었습니다.`;
  }
  return "1-10까지 모두 클리어하고 마을로 복귀했습니다.";
};

export default function Home() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  const [exploreResult, setExploreResult] = useState<ExploreResult | null>(null);
  const [visibleLogCount, setVisibleLogCount] = useState(0);
  const [isExploreResultReady, setIsExploreResultReady] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

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

  const attack = useMemo(
    () => calcAttackFromEquipped(state.equippedWeaponItemId, state.equipmentItems),
    [state.equippedWeaponItemId, state.equipmentItems],
  );

  useEffect(() => {
    if (!state.isExploring || !exploreResult) {
      return;
    }

    const totalSteps = exploreResult.logs.length;
    if (totalSteps === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setVisibleLogCount((prev) => {
        const next = prev + 1;
        if (next >= totalSteps) {
          window.clearInterval(timer);
          setIsExploreResultReady(true);
          return totalSteps;
        }
        return next;
      });
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [state.isExploring, exploreResult]);

  const craftCost = useMemo(() => getCraftCost(state.forgeLevel), [state.forgeLevel]);
  const canUpgradeForgeNow = useMemo(
    () => canUpgradeForge(state.forgeLevel) && state.materials.ironOre >= state.forgeUpgradeCost,
    [state.forgeLevel, state.materials.ironOre, state.forgeUpgradeCost],
  );

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

  const canUseRestNow = currentHp < maxHp && !state.isExploring;
  const { isResting, restRemainingSec, triggerRest } = useRestCountdown(dispatch, canUseRestNow);

  const handleDragStart = (itemId: string) => (event: React.DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData("text/plain", itemId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleForge = () => {
    if (!forgeValidation.ok) {
      return;
    }

    dispatch({
      type: "FORGE_ENHANCE",
      targetItemId: forgeValidation.target.id,
      materialItemId: forgeValidation.material.id,
    });
    forgeSlots.clearSlots();
  };

  const handleExploreStart = () => {
    if (state.isExploring || currentHp <= 0 || isResting) {
      return;
    }

    const result = simulateExplore({
      floor: state.currentFloor,
      hp: currentHp,
      attack,
    });

    setExploreResult(result);
    setVisibleLogCount(0);
    setIsExploreResultReady(result.logs.length === 0);
    dispatch({ type: "START_EXPLORE" });
  };

  const visibleLogs = exploreResult ? exploreResult.logs.slice(0, visibleLogCount) : [];
  const latestLog = visibleLogs[visibleLogs.length - 1];
  const popupCurrentHp = latestLog ? latestLog.hpAfter : currentHp;
  const popupCurrentStage = latestLog ? latestLog.stage : 0;

  const handleConfirmExplore = () => {
    if (!exploreResult) {
      return;
    }

    dispatch({
      type: "APPLY_EXPLORE_RESULT",
      result: {
        finalHp: exploreResult.finalHp,
        clearedStage: exploreResult.clearedStage,
        reward: exploreResult.totalReward,
      },
    });

    setExploreResult(null);
    setVisibleLogCount(0);
    setIsExploreResultReady(false);
  };

  return (
    <>
      <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
        <section className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h1 className="text-2xl font-bold">강화 실험장 (MVP-D)</h1>
          <p className="mt-1 text-sm text-slate-600">검/갑옷을 제작하고 자동 탐험으로 재료를 수집하세요.</p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <CharacterStats
              currentHp={currentHp}
              maxHp={maxHp}
              attack={attack}
              bestPlus={state.bestPlus}
              exploreCount={state.exploreCount}
              restCount={state.restCount}
              equippedWeapon={equippedWeapon}
              equippedArmor={equippedArmor}
            />

            <MaterialInventoryPanel materials={state.materials} />

            <ForgePanel
              ironOre={state.materials.ironOre}
              forgeLevel={state.forgeLevel}
              craftCost={craftCost}
              forgeUpgradeCost={state.forgeUpgradeCost}
              canCraftWeapon={state.materials.ironOre >= craftCost}
              canCraftArmor={state.materials.ironOre >= craftCost}
              canUpgradeForgeAction={canUpgradeForgeNow}
              isTownLocked={state.isExploring}
              selectedTarget={forgeSlots.selectedTarget}
              selectedMaterial={forgeSlots.selectedMaterial}
              canForge={forgeValidation.ok}
              forgeGuide={forgeGuide}
              onCraftWeapon={() => dispatch({ type: "CRAFT_WEAPON" })}
              onCraftArmor={() => dispatch({ type: "CRAFT_ARMOR" })}
              onUpgradeForge={() => dispatch({ type: "UPGRADE_FORGE" })}
              onDropTarget={(itemId) => forgeSlots.handleDropToForgeSlot("target", itemId)}
              onDropMaterial={(itemId) => forgeSlots.handleDropToForgeSlot("material", itemId)}
              onForge={handleForge}
              onClearSlots={forgeSlots.clearSlots}
            />

            <InnPanel
              canUseRest={canUseRestNow && !isResting}
              isResting={isResting}
              restLabel={formatAsMmSs(restRemainingSec)}
              isTownLocked={state.isExploring}
              onRest={triggerRest}
              onReset={() => dispatch({ type: "RESET" })}
            />

            <ExplorePanel
              currentFloor={state.currentFloor}
              currentStage={state.currentStage}
              currentHp={currentHp}
              maxHp={maxHp}
              attack={attack}
              canExplore={currentHp > 0 && !isResting && !state.isExploring}
              isExploring={state.isExploring}
              onExploreStart={handleExploreStart}
              onSetFloor={(floor: Floor) => dispatch({ type: "SET_FLOOR", floor })}
            />
          </div>

          <InventoryPanel
            equippedWeapon={equippedWeapon}
            equippedArmor={equippedArmor}
            inventoryItems={inventoryItems}
            isTownLocked={state.isExploring}
            onDragStart={handleDragStart}
            onDropEquip={(slot, itemId) => {
              const item = inventoryBaseMap.get(itemId);
              if (!item) {
                return;
              }
              dispatch({ type: "EQUIP", itemId: item.id, slot });
            }}
            onUnequip={(slot) => dispatch({ type: "UNEQUIP", slot })}
          />
        </section>
      </main>

      {state.isExploring && exploreResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl ring-1 ring-slate-200">
            <h2 className="text-lg font-bold">탐험 진행</h2>
            <p className="mt-2 text-sm text-slate-700">
              현재 단계: {state.currentFloor}-{popupCurrentStage > 0 ? popupCurrentStage : 1}
            </p>
            <p className="mt-1 text-sm text-slate-700">현재 체력: {popupCurrentHp}/{maxHp}</p>
            <p className="mt-1 text-sm text-slate-700">진행률: {visibleLogs.length}/10</p>

            <div className="mt-4 max-h-52 overflow-y-auto rounded-md bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
              {visibleLogs.length === 0 ? (
                <p className="text-slate-500">탐험 시작 준비 중...</p>
              ) : (
                <ul className="space-y-1">
                  {visibleLogs.map((log) => (
                    <li key={log.stage}>
                      {state.currentFloor}-{log.stage} 클리어 | 피해 -{log.damageTaken} | HP {log.hpAfter} | 보상 철 {log.reward.ironOre}
                      {log.reward.steelOre > 0 ? ` / 강 ${log.reward.steelOre}` : ""}
                      {log.reward.mithril > 0 ? ` / 미 ${log.reward.mithril}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isExploreResultReady ? (
              <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
                <p className="font-medium">탐험 종료</p>
                <p className="mt-1">{getExploreEndReasonText(exploreResult)}</p>
                <p className="mt-1">
                  총 보상: 철광석 {exploreResult.totalReward.ironOre}
                  {exploreResult.totalReward.steelOre > 0 ? `, 강철석 ${exploreResult.totalReward.steelOre}` : ""}
                  {exploreResult.totalReward.mithril > 0 ? `, 미스릴 ${exploreResult.totalReward.mithril}` : ""}
                </p>
                <button
                  type="button"
                  className="mt-3 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
                  onClick={handleConfirmExplore}
                >
                  확인
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">단계별 진행을 계산 중입니다...</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}