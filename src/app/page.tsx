"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { reducer } from "@/domain/reducer";
import { calcAttackFromEquipped, calcMaxHpFromEquippedArmor } from "@/domain/selectors";
import { createInitialGameState } from "@/domain/state";
import type { EquipmentKind } from "@/domain/state";
import { loadState, saveState } from "@/lib/storage";

const getInitialState = () => {
  const stored = loadState();
  return stored ?? createInitialGameState();
};

const REST_UNTIL_KEY = "reinforce-rest-until";
const REST_DELAY_MS = 3000;

const formatAsMmSs = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export default function Home() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  const [forgeTargetItemId, setForgeTargetItemId] = useState<string | null>(null);
  const [forgeMaterialItemId, setForgeMaterialItemId] = useState<string | null>(null);
  const [isResting, setIsResting] = useState(false);
  const [restRemainingSec, setRestRemainingSec] = useState(0);
  const restTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    return () => {
      if (restTimeoutRef.current) {
        clearTimeout(restTimeoutRef.current);
      }
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
      }
    };
  }, []);

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
  const canExplore = currentHp > 0;
  const canRest = currentHp < maxHp;
  const canUseRest = canRest && !isResting;
  const canCraftWeapon = state.ironOre >= 10;
  const canCraftArmor = state.ironOre >= 10;

  const attack = useMemo(
    () => calcAttackFromEquipped(state.equippedWeaponItemId, state.equipmentItems),
    [state.equippedWeaponItemId, state.equipmentItems],
  );

  const unequippedItems = useMemo(
    () =>
      state.equipmentItems.filter(
        (item) => item.id !== state.equippedWeaponItemId && item.id !== state.equippedArmorItemId,
      ),
    [state.equipmentItems, state.equippedWeaponItemId, state.equippedArmorItemId],
  );

  const inventoryItems = useMemo(
    () =>
      unequippedItems.filter(
        (item) =>
          item.id !== forgeTargetItemId &&
          item.id !== forgeMaterialItemId,
      ),
    [unequippedItems, forgeTargetItemId, forgeMaterialItemId],
  );

  const inventoryItemMap = useMemo(() => {
    return new Map(unequippedItems.map((item) => [item.id, item]));
  }, [unequippedItems]);

  const selectedTarget = forgeTargetItemId ? inventoryItemMap.get(forgeTargetItemId) ?? null : null;
  const selectedMaterial = forgeMaterialItemId ? inventoryItemMap.get(forgeMaterialItemId) ?? null : null;

  const hasEnoughForgeOre = state.ironOre >= 1;
  const isForgePairValid =
    !!selectedTarget &&
    !!selectedMaterial &&
    selectedTarget.id !== selectedMaterial.id &&
    selectedTarget.plus === selectedMaterial.plus &&
    selectedTarget.kind === selectedMaterial.kind;
  const canForge = isForgePairValid && hasEnoughForgeOre;

  const forgeGuide = (() => {
    if (!selectedTarget || !selectedMaterial) {
      return "강화할 장비 2개를 슬롯에 넣어주세요.";
    }
    if (selectedTarget.id === selectedMaterial.id) {
      return "같은 칸에 같은 장비를 두 번 넣을 수 없습니다.";
    }
    if (selectedTarget.kind !== selectedMaterial.kind) {
      return "같은 종류(검/갑옷)의 장비만 강화할 수 있습니다.";
    }
    if (selectedTarget.plus !== selectedMaterial.plus) {
      return "동일한 강화 단계의 장비 2개가 필요합니다.";
    }
    if (!hasEnoughForgeOre) {
      return "철광석 1개가 추가로 필요합니다.";
    }
    return `강화 준비 완료: +${selectedTarget.plus} -> +${selectedTarget.plus + 1}`;
  })();

  const handleDragStart = (itemId: string) => (event: React.DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData("text/plain", itemId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDropToForgeSlot = (slot: "target" | "material") => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain");
    const dragged = inventoryItemMap.get(itemId);
    if (!dragged) {
      return;
    }

    if (slot === "target") {
      if (itemId === forgeMaterialItemId) {
        return;
      }
      setForgeTargetItemId(itemId);
      return;
    }

    if (itemId === forgeTargetItemId) {
      return;
    }
    setForgeMaterialItemId(itemId);
  };

  const handleDropToEquipSlot = (slot: EquipmentKind) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain");
    const dragged = inventoryItemMap.get(itemId);
    if (!dragged || dragged.kind !== slot) {
      return;
    }

    dispatch({ type: "EQUIP", itemId: dragged.id, slot });
  };

  const handleForge = () => {
    if (!canForge || !selectedTarget || !selectedMaterial) {
      return;
    }

    dispatch({ type: "FORGE_ENHANCE", targetItemId: selectedTarget.id, materialItemId: selectedMaterial.id });
    setForgeTargetItemId(null);
    setForgeMaterialItemId(null);
  };

  const stopRestTimers = useCallback(() => {
    if (restTimeoutRef.current) {
      clearTimeout(restTimeoutRef.current);
      restTimeoutRef.current = null;
    }
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
  }, []);

  const startRestCountdown = useCallback(
    (restUntil: number, persist: boolean) => {
      const now = Date.now();
      const remainingMs = Math.max(0, restUntil - now);

      stopRestTimers();
      setIsResting(true);
      setRestRemainingSec(Math.max(0, Math.ceil(remainingMs / 1000)));

      if (persist) {
        window.localStorage.setItem(REST_UNTIL_KEY, String(restUntil));
      }

      restIntervalRef.current = setInterval(() => {
        const leftMs = Math.max(0, restUntil - Date.now());
        setRestRemainingSec(Math.max(0, Math.ceil(leftMs / 1000)));
      }, 1000);

      restTimeoutRef.current = setTimeout(() => {
        dispatch({ type: "REST" });
        stopRestTimers();
        setIsResting(false);
        setRestRemainingSec(0);
        window.localStorage.removeItem(REST_UNTIL_KEY);
      }, remainingMs);
    },
    [dispatch, stopRestTimers],
  );

  useEffect(() => {
    const raw = window.localStorage.getItem(REST_UNTIL_KEY);
    if (!raw) {
      return;
    }

    const restUntil = Number(raw);
    if (!Number.isFinite(restUntil)) {
      window.localStorage.removeItem(REST_UNTIL_KEY);
      return;
    }

    const now = Date.now();
    if (restUntil <= now) {
      dispatch({ type: "REST" });
      window.localStorage.removeItem(REST_UNTIL_KEY);
      return;
    }

    const starter = setTimeout(() => {
      startRestCountdown(restUntil, false);
    }, 0);

    return () => clearTimeout(starter);
  }, [dispatch, startRestCountdown]);

  const handleRest = () => {
    if (!canUseRest) {
      return;
    }

    const restUntil = Date.now() + REST_DELAY_MS;
    startRestCountdown(restUntil, true);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
      <section className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-2xl font-bold">강화 실험장 (MVP-D)</h1>
        <p className="mt-1 text-sm text-slate-600">검/갑옷을 제작하고 드래그로 장착 또는 강화하세요.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">캐릭터 스텟</h2>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                체력: {currentHp}/{maxHp}
              </div>
              <div>공격력: {attack}</div>
              <div>최고 강화: +{state.bestPlus}</div>
              <div>탐사 횟수: {state.exploreCount}</div>
              <div>휴식 횟수: {state.restCount}</div>
              <div>무기 장착: {equippedWeapon ? `+${equippedWeapon.plus} 검` : "없음"}</div>
              <div>갑옷 장착: {equippedArmor ? `+${equippedArmor.plus} 갑옷` : "없음"}</div>
            </div>
          </section>

          <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">마을 - 대장간</h2>
            <p className="mt-2 text-sm">철광석: {state.ironOre}개</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
                onClick={() => dispatch({ type: "CRAFT_WEAPON" })}
                disabled={!canCraftWeapon}
              >
                검 제작 (철광석 10)
              </button>
              <button
                type="button"
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-teal-300"
                onClick={() => dispatch({ type: "CRAFT_ARMOR" })}
                disabled={!canCraftArmor}
              >
                갑옷 제작 (철광석 10)
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-slate-600">강화 대상 슬롯</p>
                <div
                  className="min-h-24 rounded-lg border-2 border-dashed border-slate-300 bg-white p-2"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDropToForgeSlot("target")}
                >
                  {selectedTarget ? (
                    <div className="rounded-md bg-slate-100 p-2 text-sm">
                      {selectedTarget.kind === "weapon" ? "검" : "갑옷"} +{selectedTarget.plus} ({selectedTarget.id})
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">인벤토리에서 드래그</p>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-600">강화 재료 슬롯</p>
                <div
                  className="min-h-24 rounded-lg border-2 border-dashed border-slate-300 bg-white p-2"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDropToForgeSlot("material")}
                >
                  {selectedMaterial ? (
                    <div className="rounded-md bg-slate-100 p-2 text-sm">
                      {selectedMaterial.kind === "weapon" ? "검" : "갑옷"} +{selectedMaterial.plus} ({selectedMaterial.id})
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">인벤토리에서 드래그</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={handleForge}
                disabled={!canForge}
              >
                강화 실행
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                onClick={() => {
                  setForgeTargetItemId(null);
                  setForgeMaterialItemId(null);
                }}
              >
                슬롯 비우기
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600">{forgeGuide}</p>
            <p className="mt-1 text-xs text-slate-600">강화 비용: 동일 종류/동일 단계 장비 2개 + 철광석 1개</p>
          </section>

          <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">마을 - 여관</h2>
            <p className="mt-2 text-sm">체력이 부족하면 휴식으로 최대 체력까지 회복합니다.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-amber-300 hover:bg-amber-600"
                onClick={handleRest}
                disabled={!canUseRest}
              >
                {isResting ? `휴식 중... ${formatAsMmSs(restRemainingSec)}` : "휴식 (체력 회복)"}
              </button>
              <button
                type="button"
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                onClick={() => dispatch({ type: "RESET" })}
              >
                리셋
              </button>
            </div>
          </section>

          <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">탐사 - 층</h2>
            <p className="mt-2 text-sm">현재 개방 층: 1층 (철광석 1~3 획득)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300 hover:bg-blue-700"
                onClick={() => dispatch({ type: "EXPLORE_F1" })}
                disabled={!canExplore}
              >
                1층 탐사
              </button>
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold">인벤토리</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-slate-600">무기 장착 슬롯 (드래그 장착 / 클릭 해제)</p>
              <div
                className="min-h-24 rounded-lg border-2 border-dashed border-violet-300 bg-white p-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDropToEquipSlot("weapon")}
              >
                {equippedWeapon ? (
                  <button
                    type="button"
                    className="w-full rounded-md bg-violet-50 p-2 text-left text-sm hover:bg-violet-100"
                    onClick={() => dispatch({ type: "UNEQUIP", slot: "weapon" })}
                  >
                    검 +{equippedWeapon.plus} ({equippedWeapon.id}) - 클릭 시 장착 해제
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">검 아이템을 여기로 드래그</p>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-600">갑옷 장착 슬롯 (드래그 장착 / 클릭 해제)</p>
              <div
                className="min-h-24 rounded-lg border-2 border-dashed border-emerald-300 bg-white p-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDropToEquipSlot("armor")}
              >
                {equippedArmor ? (
                  <button
                    type="button"
                    className="w-full rounded-md bg-emerald-50 p-2 text-left text-sm hover:bg-emerald-100"
                    onClick={() => dispatch({ type: "UNEQUIP", slot: "armor" })}
                  >
                    갑옷 +{equippedArmor.plus} ({equippedArmor.id}) - 클릭 시 장착 해제
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">갑옷 아이템을 여기로 드래그</p>
                )}
              </div>
            </div>
          </div>

          {inventoryItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">보유한 장비가 없습니다.</p>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {inventoryItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  draggable
                  onDragStart={handleDragStart(item.id)}
                  className="aspect-square rounded-md border border-slate-300 bg-white p-2 text-left hover:border-indigo-400"
                >
                  <div className="text-xs text-slate-500">{item.id}</div>
                  <div className="mt-1 text-sm font-semibold">{item.kind === "weapon" ? "검" : "갑옷"}</div>
                  <div className="text-base font-bold">+{item.plus}</div>
                  <div className="mt-2 text-xs text-indigo-600">드래그: 대장간/장착 슬롯</div>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
