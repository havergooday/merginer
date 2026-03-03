import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { EquipmentItem, Floor } from "@/domain/state";
/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element */
import type { ActivityLogEntry } from "@/hooks/useActivityLog";
import type { ExploreSessionViewModel } from "@/hooks/useExploreProgress";

export type ResourceLocation = "village" | "inn" | "forge" | "explore";
export type ForgeSubTab = "craft" | "enhance" | "combine";
export type CombineRecipeId = string;
export type CombineRecipe = {
  id: CombineRecipeId;
  name: string;
  costText: string;
  canCraft: boolean;
  blockedReason?: string;
};

export type ResourcePreviewCardActionProps = {
  onGoVillage: () => void;
  onGoInn: () => void;
  onGoForge: () => void;
  onGoExplore: () => void;
  onSetForgeSubTab: (tab: ForgeSubTab) => void;
  onSetFloor: (floor: Floor) => void;
  onExploreStart: () => void;
  onExploreConfirm: () => void;
  onRest: () => void;
  onCraftWeapon: () => void;
  onCraftArmor: () => void;
  onCraftSteel: () => void;
  onCraftMithril: () => void;
  onUpgradeForge: () => void;
  onClickTargetSlot: () => void;
  onClickMaterialSlot: () => void;
  onForge: () => void;
  onClickEquipSlot: (slot: "weapon" | "armor") => void;
  onConfirmUnequip: (slot: "weapon" | "armor") => void;
};

export type ResourcePreviewCardProps = {
  location: ResourceLocation;
  forgeSubTab: ForgeSubTab;
  currentHp: number;
  maxHp: number;
  attack: number;
  currentFloor: Floor;
  currentStage: number;
  unlockedFloor: Floor;
  canExplore: boolean;
  isExploring: boolean;
  exploreSession: ExploreSessionViewModel | null;
  equippedWeapon: EquipmentItem | null;
  equippedArmor: EquipmentItem | null;
  isResting: boolean;
  restLabel: string;
  canUseRest: boolean;
  isActionLocked: boolean;
  ironOre: number;
  steelOre: number;
  mithril: number;
  forgeLevel: number;
  craftCost: number;
  forgeUpgradeCost: number;
  canCraftWeapon: boolean;
  canCraftArmor: boolean;
  canCraftSteel: boolean;
  canCraftMithril: boolean;
  canUpgradeForgeAction: boolean;
  selectedInventoryItem: EquipmentItem | null;
  selectedTarget: EquipmentItem | null;
  selectedMaterial: EquipmentItem | null;
  canSelectAsTarget: boolean;
  canSelectAsMaterial: boolean;
  canForge: boolean;
  forgeGuide: string;
  enhanceRequirementLine1: string;
  enhanceRequirementLine2: string;
  enhanceRequirementLine3: string;
  combineRecipes: CombineRecipe[];
  onCraftByRecipeId: (id: CombineRecipeId) => void;
  activityLogs: ActivityLogEntry[];
  actions: ResourcePreviewCardActionProps;
  frameSrc?: string;
  artSrc?: string;
};

const slotLabel = (item: EquipmentItem) => `${item.kind === "weapon" ? "검" : "갑옷"} +${item.plus} (${item.id})`;
const exploreFloorCards: Array<{ id: number; actualFloor: Floor; zone: string }> = [
  { id: 1, actualFloor: 1, zone: "산림" },
  { id: 2, actualFloor: 2, zone: "동굴" },
  { id: 3, actualFloor: 3, zone: "동굴" },
  { id: 4, actualFloor: 1, zone: "산림" },
  { id: 5, actualFloor: 1, zone: "산림" },
  { id: 6, actualFloor: 1, zone: "산림" },
  { id: 7, actualFloor: 1, zone: "산림" },
  { id: 8, actualFloor: 1, zone: "산림" },
  { id: 9, actualFloor: 1, zone: "산림" },
  { id: 10, actualFloor: 1, zone: "산림" },
];
const EXPLORE_ITEMS_PER_PAGE = 3;

export const ResourcePreviewCard = ({
  location,
  forgeSubTab,
  currentHp,
  maxHp,
  attack,
  currentFloor,
  currentStage,
  unlockedFloor,
  canExplore,
  isExploring,
  exploreSession,
  equippedWeapon,
  equippedArmor,
  isResting,
  restLabel,
  canUseRest,
  isActionLocked,
  ironOre,
  steelOre,
  mithril,
  forgeLevel,
  craftCost,
  forgeUpgradeCost,
  canCraftWeapon,
  canCraftArmor,
  canCraftSteel,
  canCraftMithril,
  canUpgradeForgeAction,
  selectedInventoryItem,
  selectedTarget,
  selectedMaterial,
  canSelectAsTarget,
  canSelectAsMaterial,
  canForge,
  forgeGuide,
  enhanceRequirementLine1,
  enhanceRequirementLine2,
  enhanceRequirementLine3,
  combineRecipes,
  onCraftByRecipeId,
  activityLogs,
  actions,
  frameSrc = "/assets/ui/frames/card-frame.png",
  artSrc,
}: ResourcePreviewCardProps) => {
  const locationName = location === "village" ? "마을" : location === "inn" ? "여관" : location === "forge" ? "대장간" : "탐사";
  const artLabel = location === "village" ? "VILLAGE" : location === "inn" ? "INN" : location === "forge" ? "FORGE" : "EXPLORE";
  const isInnNavigationLocked = isResting;
  const isCommonNavigationLocked = isActionLocked || (location === "inn" && isInnNavigationLocked);

  const headerTitle = location === "explore" && isExploring ? `탐사 - ${currentFloor}층` : locationName;
  const headerStatus = `HP ${String(currentHp).padStart(2, "0")} / ${String(maxHp).padStart(2, "0")} [ --- ] / ATK : ${String(attack).padStart(3, "0")}`;

  const overlayLogs =
    location === "explore" && isExploring && exploreSession
      ? exploreSession.visibleLogs.slice(-3).map((log) => ({
          id: `explore-${log.stage}`,
          text: `${currentFloor}-${log.stage} 클리어 피해 -${log.damageTaken} 보상 철${log.reward.ironOre}`,
          tone: "info" as const,
          fading: false,
        }))
      : activityLogs;

  const [pendingUnequipSlot, setPendingUnequipSlot] = useState<"weapon" | "armor" | null>(null);
  const [selectedCombineRecipeId, setSelectedCombineRecipeId] = useState<CombineRecipeId>("steel-1");
  const [selectedExploreCardId, setSelectedExploreCardId] = useState<number | null>(null);
  const [explorePageIndex, setExplorePageIndex] = useState(0);
  const villageBodyRef = useRef<HTMLDivElement | null>(null);
  const selectedCombineRecipe = combineRecipes.find((recipe) => recipe.id === selectedCombineRecipeId) ?? null;
  const explorePageCount = Math.ceil(exploreFloorCards.length / EXPLORE_ITEMS_PER_PAGE);
  const visibleExploreCards = exploreFloorCards.slice(
    explorePageIndex * EXPLORE_ITEMS_PER_PAGE,
    (explorePageIndex + 1) * EXPLORE_ITEMS_PER_PAGE,
  );
  const selectedExploreCard = selectedExploreCardId
    ? exploreFloorCards.find((card) => card.id === selectedExploreCardId) ?? null
    : null;

  useEffect(() => {
    if (combineRecipes.length === 0) {
      return;
    }
    if (!combineRecipes.some((recipe) => recipe.id === selectedCombineRecipeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCombineRecipeId(combineRecipes[0].id);
    }
  }, [combineRecipes, selectedCombineRecipeId]);

  useEffect(() => {
    if (!isExploring) {
      return;
    }
    const cardFromCurrentFloor =
      exploreFloorCards.find((card) => card.id === currentFloor) ??
      exploreFloorCards.find((card) => card.actualFloor === currentFloor) ??
      null;
    if (!cardFromCurrentFloor) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedExploreCardId(cardFromCurrentFloor.id);
    setExplorePageIndex(Math.floor((cardFromCurrentFloor.id - 1) / EXPLORE_ITEMS_PER_PAGE));
  }, [currentFloor, isExploring]);


  useEffect(() => {
    if (location !== "village" || isExploring || selectedInventoryItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingUnequipSlot(null);
    }
  }, [location, isExploring, selectedInventoryItem]);

  useEffect(() => {
    if (!pendingUnequipSlot) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const pendingSelector = ".resource-village-equip-slot[data-slot=\"" + pendingUnequipSlot + "\"]";
      if (target.closest(pendingSelector)) {
        return;
      }
      if (villageBodyRef.current && villageBodyRef.current.contains(target)) {
        setPendingUnequipSlot(null);
        return;
      }
      setPendingUnequipSlot(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [pendingUnequipSlot]);

  const handleVillageEquipSlotClick = (slot: "weapon" | "armor") => {
    if (isActionLocked) {
      return;
    }

    const equippedItem = slot === "weapon" ? equippedWeapon : equippedArmor;
    if (selectedInventoryItem) {
      actions.onClickEquipSlot(slot);
      setPendingUnequipSlot(null);
      return;
    }

    if (!equippedItem) {
      setPendingUnequipSlot(null);
      return;
    }

    if (pendingUnequipSlot === slot) {
      actions.onConfirmUnequip(slot);
      setPendingUnequipSlot(null);
      return;
    }

    setPendingUnequipSlot(slot);
  };
  return (
    <section className="resource-card-frame" style={{ "--resource-frame-src": "url(" + frameSrc + ")" } as CSSProperties}>
      <div className="resource-card-content">
        <header className="resource-card-header-slot">
          <div className="resource-card-title">{headerTitle}</div>
          <div className="resource-card-location">{headerStatus}</div>
        </header>

        <div className="resource-card-separator" aria-hidden />

        <div className="resource-card-art-slot">
          {artSrc ? (
            <img src={artSrc} alt={artLabel} className="resource-card-art-image" />
          ) : (
            <div className="resource-card-art-placeholder">{artLabel}</div>
          )}
          <div className="resource-art-log-overlay" aria-live="polite">
            {overlayLogs.map((entry) => (
              <p
                key={entry.id}
                className={["resource-art-log-line", entry.tone === "success" ? "is-success" : entry.tone === "warn" ? "is-warn" : "", entry.fading ? "is-fading" : ""].join(" ").trim()}
              >
                {entry.text}
              </p>
            ))}
          </div>
        </div>

        <div className="resource-card-separator" aria-hidden />

        <div className={`resource-card-body-slot ${location === "village" ? "is-village" : ""} ${location === "inn" ? "is-inn" : ""} ${location === "forge" ? "is-forge" : ""} ${location === "explore" ? "is-explore" : ""}`}>
          {location === "village" ? (
            <div className="resource-village-body" ref={villageBodyRef}>
              <div className="resource-village-layout">
                <div className="resource-village-character-box">
                  <span className="resource-village-character-label">캐릭터</span>
                </div>

                <div className="resource-village-equip-stack">
                  <button
                    type="button"
                    className={`resource-village-equip-slot ${pendingUnequipSlot === "weapon" ? "is-pending-unequip" : ""}`}
                    data-slot="weapon"
                    onClick={() => handleVillageEquipSlotClick("weapon")}
                    disabled={isActionLocked}
                  >
                    <span className="resource-village-slot-label">{pendingUnequipSlot === "weapon" ? "해제" : "무기"}</span>
                    <span className="resource-village-slot-plus">
                      {pendingUnequipSlot === "weapon" ? "다시 클릭" : equippedWeapon ? `+${equippedWeapon.plus}` : "-"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`resource-village-equip-slot ${pendingUnequipSlot === "armor" ? "is-pending-unequip" : ""}`}
                    data-slot="armor"
                    onClick={() => handleVillageEquipSlotClick("armor")}
                    disabled={isActionLocked}
                  >
                    <span className="resource-village-slot-label">{pendingUnequipSlot === "armor" ? "해제" : "갑옷"}</span>
                    <span className="resource-village-slot-plus">
                      {pendingUnequipSlot === "armor" ? "다시 클릭" : equippedArmor ? `+${equippedArmor.plus}` : "-"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {location === "inn" ? (
            <div className="resource-inn-body">
              <div className="resource-inn-layout">
                <div className="resource-inn-action-stack">
                  <button
                    type="button"
                    className="resource-card-action-btn resource-inn-action-btn"
                    onClick={actions.onRest}
                    disabled={isActionLocked || isResting || !canUseRest}
                  >
                    {isResting ? `휴식 중... ${restLabel}` : "휴식"}
                  </button>
                  <button
                    type="button"
                    className="resource-card-action-btn resource-inn-action-btn"
                    disabled
                  >
                    여관 업그레이드
                  </button>
                </div>
                <div className="resource-inn-npc-box">
                  <span className="resource-inn-npc-label">NPC</span>
                </div>
              </div>
            </div>
          ) : null}

          {location === "forge" ? (
            <div className="resource-forge-body">
              <div className="resource-forge-tab-row">
                <button
                  type="button"
                  className={`resource-forge-tab ${forgeSubTab === "craft" ? "is-active" : ""}`}
                  onClick={() => actions.onSetForgeSubTab("craft")}
                  disabled={isActionLocked}
                >
                  제작
                </button>
                <button
                  type="button"
                  className={`resource-forge-tab ${forgeSubTab === "enhance" ? "is-active" : ""}`}
                  onClick={() => actions.onSetForgeSubTab("enhance")}
                  disabled={isActionLocked}
                >
                  강화
                </button>
                <button
                  type="button"
                  className={`resource-forge-tab ${forgeSubTab === "combine" ? "is-active" : ""}`}
                  onClick={() => actions.onSetForgeSubTab("combine")}
                  disabled={isActionLocked}
                >
                  조합
                </button>
              </div>

              {forgeSubTab === "craft" ? (
                <div className="resource-craft-grid">
                  <div className="resource-craft-top-row">
                    <button type="button" className="resource-card-action-btn" onClick={actions.onCraftWeapon} disabled={isActionLocked || !canCraftWeapon}>
                      검 제작
                    </button>
                    <button type="button" className="resource-card-action-btn" onClick={actions.onCraftArmor} disabled={isActionLocked || !canCraftArmor}>
                      갑옷 제작
                    </button>
                  </div>
                  <div className="resource-craft-bottom-row">
                    <div className="resource-craft-preview-box">
                      <div className="resource-craft-info-section">
                        <p className="resource-craft-info-row">제작 비용: 철광석 {craftCost}</p>
                        <p className="resource-craft-info-row">강화 비용: 철광석 {forgeUpgradeCost}</p>
                      </div>
                      <div className="resource-craft-guide-section">
                        <p className="resource-craft-guide-line">대장간 강화 시 제작 비용이 감소합니다.</p>
                        <p className="resource-craft-guide-line">조합 해금: Lv2 강철석 / Lv4 미스릴</p>
                        <p className="resource-craft-guide-line">강화 재료: +6부터 강철석, +10부터 미스릴</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="resource-card-action-btn resource-craft-upgrade-btn"
                      onClick={actions.onUpgradeForge}
                      disabled={isActionLocked || !canUpgradeForgeAction}
                    >
                      대장간 강화
                    </button>
                  </div>
                </div>
              ) : null}

              {forgeSubTab === "enhance" ? (
                <div className="resource-enhance-panel">
                  <div className="resource-enhance-slots">
                    <div className="resource-enhance-slot-col">
                      <button
                        type="button"
                        className="resource-enhance-slot-box resource-enhance-slot-box-btn"
                        onClick={actions.onClickTargetSlot}
                        disabled={isActionLocked}
                      >
                        <p className="resource-enhance-slot-title">대상 슬롯</p>
                        <p className="resource-enhance-slot-value">{selectedTarget ? slotLabel(selectedTarget) : "비어있음"}</p>
                      </button>
                    </div>
                    <div className="resource-enhance-slot-col">
                      <button
                        type="button"
                        className="resource-enhance-slot-box resource-enhance-slot-box-btn"
                        onClick={actions.onClickMaterialSlot}
                        disabled={isActionLocked}
                      >
                        <p className="resource-enhance-slot-title">재료 슬롯</p>
                        <p className="resource-enhance-slot-value">{selectedMaterial ? slotLabel(selectedMaterial) : "비어있음"}</p>
                      </button>
                    </div>
                  </div>

                  <div className="resource-enhance-requirement">
                    <p>{enhanceRequirementLine1}</p>
                    <p>{enhanceRequirementLine2}</p>
                    <p className={`resource-enhance-reason ${enhanceRequirementLine3 === "강화가 가능합니다" ? "is-ready" : ""}`}>
                      {enhanceRequirementLine3}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="resource-card-action-btn resource-card-action-btn-wide resource-enhance-execute-btn"
                    onClick={actions.onForge}
                    disabled={isActionLocked || !canForge}
                  >
                    강화 실행
                  </button>
                </div>
              ) : null}

              {forgeSubTab === "combine" ? (
                <div className="resource-combine-panel">
                  <div className="resource-combine-list-shell">
                    <div className="resource-combine-list">
                      {combineRecipes.map((recipe) => (
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

                  <div className="resource-combine-action-area">
                    <p className={`resource-combine-status ${selectedCombineRecipe?.canCraft ? "is-ready" : ""}`}>
                      {selectedCombineRecipe
                        ? selectedCombineRecipe.canCraft
                          ? "조합이 가능합니다"
                          : selectedCombineRecipe.blockedReason ?? "조합할 수 없습니다"
                        : "조합 항목을 선택해주세요"}
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
              ) : null}
            </div>
          ) : null}

          {location === "explore" ? (
            !isExploring ? (
              <div className="resource-explore-panel">
                <div className="resource-explore-floor-list-shell">
                  <div className="resource-explore-floor-list">
                    {visibleExploreCards.map((card) => {
                      const isSelected = selectedExploreCardId === card.id;
                      const isBlocked = card.id > unlockedFloor;
                      const statusText = isBlocked ? "탐사불가" : isSelected ? "선택" : "탐사가능";
                      return (
                        <button
                          key={`explore-floor-${card.id}`}
                          type="button"
                          className={`resource-explore-floor-banner ${isSelected ? "is-selected" : ""} ${isBlocked ? "is-blocked" : ""}`}
                          onClick={() => {
                            if (isBlocked) {
                              return;
                            }
                            const next = selectedExploreCardId === card.id ? null : card.id;
                            setSelectedExploreCardId(next);
                            if (next !== null) {
                              actions.onSetFloor(card.actualFloor);
                            }
                          }}
                          disabled={isActionLocked || isBlocked}
                        >
                          <div className="resource-explore-floor-texts">
                            <span className="resource-explore-floor-title">{card.id}층 - {card.zone}</span>
                            <span className="resource-explore-floor-status">{statusText}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="resource-explore-action-area">
                  <div className="resource-explore-page-nav">
                    <button
                      type="button"
                      className="resource-explore-page-btn"
                      onClick={() => setExplorePageIndex((prev) => Math.max(0, prev - 1))}
                      disabled={isActionLocked || explorePageIndex <= 0}
                    >
                      {"<"}
                    </button>
                    <span className="resource-explore-page-indicator">{String(explorePageIndex + 1).padStart(3, "0")}</span>
                    <button
                      type="button"
                      className="resource-explore-page-btn"
                      onClick={() => setExplorePageIndex((prev) => Math.min(explorePageCount - 1, prev + 1))}
                      disabled={isActionLocked || explorePageIndex >= explorePageCount - 1}
                    >
                      {">"}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="resource-card-action-btn resource-card-action-btn-wide resource-explore-start-btn"
                    onClick={actions.onExploreStart}
                    disabled={isActionLocked || !canExplore || !selectedExploreCard}
                  >
                    탐사 시작
                  </button>
                </div>
              </div>
            ) : exploreSession && exploreSession.isResultReady ? (
              <div className="resource-explore-result-panel">
                <div className="resource-explore-result-box">
                  <div className="resource-card-stat-row"><span>상태</span><span>탐험 종료</span></div>
                  <p className="resource-card-note">
                    {exploreSession.result.endReason === "DEFEATED"
                      ? `HP가 0이 되어 ${exploreSession.result.clearedStage}단계에서 종료되었습니다.`
                      : "1-10까지 모두 클리어하고 마을로 복귀합니다."}
                  </p>
                  <p className="resource-card-note">
                    총 보상: 철광석 {exploreSession.result.totalReward.ironOre}
                    {exploreSession.result.totalReward.steelOre > 0 ? `, 강철석 ${exploreSession.result.totalReward.steelOre}` : ""}
                    {exploreSession.result.totalReward.mithril > 0 ? `, 미스릴 ${exploreSession.result.totalReward.mithril}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="resource-card-action-btn resource-card-action-btn-wide resource-explore-result-confirm-btn"
                  onClick={actions.onExploreConfirm}
                >
                  확인
                </button>
              </div>
            ) : (
              <div className="resource-explore-progress-simple">탐험중...</div>
            )
          ) : null}
        </div>

        <div className="resource-card-separator" aria-hidden />

        <div className="resource-card-utility-slot">
          <>
            <button type="button" className="resource-card-utility-btn" onClick={actions.onGoVillage} disabled={isCommonNavigationLocked}>마을</button>
            <button type="button" className="resource-card-utility-btn" onClick={actions.onGoInn} disabled={isCommonNavigationLocked}>여관</button>
            <button type="button" className="resource-card-utility-btn" onClick={actions.onGoForge} disabled={isCommonNavigationLocked}>대장간</button>
            <button type="button" className="resource-card-utility-btn" onClick={actions.onGoExplore} disabled={isCommonNavigationLocked}>탐사</button>
          </>
        </div>
      </div>
    </section>
  );
};












