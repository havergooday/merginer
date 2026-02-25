"use client";

import { useEffect, useMemo, useReducer } from "react";

import { CharacterStats } from "@/components/CharacterStats";
import { ExplorePanel } from "@/components/ExplorePanel";
import { ForgePanel } from "@/components/ForgePanel";
import { InnPanel } from "@/components/InnPanel";
import { InventoryPanel } from "@/components/InventoryPanel";
import { validateForge } from "@/domain/forge";
import { canUpgradeForge, getCraftCost, getEnhanceOreCost } from "@/domain/forgeEconomy";
import { reducer } from "@/domain/reducer";
import { calcAttackFromEquipped, calcMaxHpFromEquippedArmor } from "@/domain/selectors";
import { createInitialGameState } from "@/domain/state";
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
  INSUFFICIENT_ORE: "강화 단계와 같은 수의 철광석이 필요합니다.",
};

export default function Home() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

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

  const inventoryBaseMap = useMemo(() => new Map(inventoryBaseItems.map((item) => [item.id, item])), [inventoryBaseItems]);

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

  const craftCost = useMemo(() => getCraftCost(state.forgeLevel), [state.forgeLevel]);
  const canUpgradeForgeNow = useMemo(
    () => canUpgradeForge(state.forgeLevel) && state.ironOre >= state.forgeUpgradeCost,
    [state.forgeLevel, state.ironOre, state.forgeUpgradeCost],
  );

  const forgeValidation = useMemo(
    () => validateForge(state, forgeSlots.selectedTarget?.id ?? null, forgeSlots.selectedMaterial?.id ?? null),
    [state, forgeSlots.selectedTarget, forgeSlots.selectedMaterial],
  );

  const forgeGuide =
    forgeValidation.ok
      ? `강화 준비 완료: +${forgeValidation.target.plus} -> +${forgeValidation.target.plus + 1} (철광석 ${getEnhanceOreCost(forgeValidation.target.plus)}개)`
      : forgeReasonText[forgeValidation.reason];

  const canUseRestNow = currentHp < maxHp;
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

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
      <section className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-2xl font-bold">강화 실험장 (MVP-D)</h1>
        <p className="mt-1 text-sm text-slate-600">검/갑옷을 제작하고 드래그로 장착 또는 강화하세요.</p>

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

          <ForgePanel
            ironOre={state.ironOre}
            forgeLevel={state.forgeLevel}
            craftCost={craftCost}
            forgeUpgradeCost={state.forgeUpgradeCost}
            canCraftWeapon={state.ironOre >= craftCost}
            canCraftArmor={state.ironOre >= craftCost}
            canUpgradeForgeAction={canUpgradeForgeNow}
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
            onRest={triggerRest}
            onReset={() => dispatch({ type: "RESET" })}
          />

          <ExplorePanel canExplore={currentHp > 0 && !isResting} onExplore={() => dispatch({ type: "EXPLORE_F1" })} />
        </div>

        <InventoryPanel
          equippedWeapon={equippedWeapon}
          equippedArmor={equippedArmor}
          inventoryItems={inventoryItems}
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
  );
}


