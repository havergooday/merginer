import { useExploreSelection } from "@/components/resource-card/hooks/useExploreSelection";
import type { ResourcePreviewCardProps } from "@/components/resource-card/types";

const ENABLE_EXPLORE_RESULT_LOCK_DIM = false;

type ExploreBodyProps = Pick<
  ResourcePreviewCardProps,
  | "isExploring"
  | "exploreSession"
  | "exploreSpeedMode"
  | "onChangeExploreSpeedMode"
  | "exploreCurrentEvent"
  | "exploreVisibleEvents"
  | "currentFloor"
  | "unlockedFloor"
  | "canExplore"
  | "isActionLocked"
  | "actions"
>;

export const ExploreBody = ({
  isExploring,
  exploreSession,
  exploreSpeedMode,
  onChangeExploreSpeedMode,
  exploreCurrentEvent,
  exploreVisibleEvents,
  currentFloor,
  unlockedFloor,
  canExplore,
  isActionLocked,
  actions,
}: ExploreBodyProps) => {
  const {
    selectedExploreCardId,
    explorePageIndex,
    setExplorePageIndex,
    explorePageCount,
    visibleExploreCards,
    selectedExploreCard,
    onToggleExploreCard,
  } = useExploreSelection({
    currentFloor,
    unlockedFloor,
    isExploring,
    onSetFloor: actions.onSetFloor,
  });

  if (!isExploring) {
    return (
      <div className="resource-explore-panel">
        <div className="resource-explore-floor-list-shell">
          <div className="resource-explore-floor-list">
            {visibleExploreCards.map((card) => {
              const isSelected = selectedExploreCardId === card.id;
              const isBlocked = card.id > unlockedFloor;
              const statusText = isBlocked ? "탐사불가" : isSelected ? "선택" : "선택가능";
              return (
                <button
                  key={`explore-floor-${card.id}`}
                  type="button"
                  className={`resource-explore-floor-banner ${isSelected ? "is-selected" : ""} ${
                    isBlocked ? "is-blocked" : ""
                  }`}
                  onClick={() => onToggleExploreCard(card.id, card.actualFloor, isBlocked)}
                  disabled={isActionLocked || isBlocked}
                >
                  <div className="resource-explore-floor-texts">
                    <span className="resource-explore-floor-title">
                      {card.id}층 - {card.zone}
                    </span>
                    <span className="resource-explore-floor-status">{statusText}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="resource-explore-page-row">
          <div className="resource-explore-page-nav">
            <button
              type="button"
              className="resource-explore-page-btn"
              onClick={() => setExplorePageIndex((prev) => Math.max(0, prev - 1))}
              disabled={isActionLocked || explorePageIndex <= 0}
            >
              {"<"}
            </button>
            <span className="resource-explore-page-indicator">
              {String(explorePageIndex + 1).padStart(3, "0")}
            </span>
            <button
              type="button"
              className="resource-explore-page-btn"
              onClick={() => setExplorePageIndex((prev) => Math.min(explorePageCount - 1, prev + 1))}
              disabled={isActionLocked || explorePageIndex >= explorePageCount - 1}
            >
              {">"}
            </button>
          </div>
        </div>
        <div className="resource-explore-start-row">
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
    );
  }

  if (exploreSession && exploreSession.isResultReady) {
    return (
      <div className={`resource-explore-result-panel ${ENABLE_EXPLORE_RESULT_LOCK_DIM ? "is-lock-pending" : ""}`}>
        <div className="resource-explore-result-box">
          <div className="resource-card-stat-row">
            <span>상태</span>
            <span>탐험 종료</span>
          </div>
          <p className="resource-card-note">
            {exploreSession.result.endReason === "DEFEATED"
              ? `HP가 0이 되어 ${exploreSession.result.clearedStage} 스테이지에서 탐험이 종료되었습니다.`
              : "1-10을 모두 클리어하여 탐험을 완료했습니다."}
          </p>
          <p className="resource-card-note">
            총 보상: 철광석 {exploreSession.result.totalReward.ironOre}
            {exploreSession.result.totalReward.steelOre > 0
              ? `, 강철석 ${exploreSession.result.totalReward.steelOre}`
              : ""}
            {exploreSession.result.totalReward.mithril > 0
              ? `, 미스릴 ${exploreSession.result.totalReward.mithril}`
              : ""}
          </p>
        </div>
        {ENABLE_EXPLORE_RESULT_LOCK_DIM ? (
          <div className="resource-explore-lock-dim" aria-hidden="true">
            <p className="resource-explore-lock-message">결과 확인 전에는 이동할 수 없습니다</p>
            <p className="resource-explore-lock-sub">확인 버튼을 누르면 이동이 해제됩니다</p>
          </div>
        ) : null}
        <button
          type="button"
          className="resource-card-action-btn resource-card-action-btn-wide resource-explore-result-confirm-btn"
          onClick={actions.onExploreConfirm}
        >
          확인
        </button>
      </div>
    );
  }

  const progressFxClass =
    exploreCurrentEvent?.type === "STAGE_ENTRY"
      ? "explore-fx-entry"
      : exploreCurrentEvent?.type === "MONSTER_ENTRY"
        ? "explore-fx-entry"
      : exploreCurrentEvent?.type === "ATTACK_SWING"
        ? "explore-fx-player-attack"
        : exploreCurrentEvent?.type === "HIT_REACT"
          ? "explore-fx-monster-attack"
          : exploreCurrentEvent?.type === "DEATH_FALL"
            ? "explore-fx-death-fall"
            : exploreCurrentEvent?.type === "STAGE_CLEAR"
            ? "explore-fx-stage-clear"
            : "explore-fx-end";

  return (
    <div className={`resource-explore-progress-panel ${progressFxClass}`}>
      <p className="resource-explore-progress-text">
        {exploreCurrentEvent?.text ?? exploreVisibleEvents[exploreVisibleEvents.length - 1]?.text ?? "탐험중..."}
      </p>
      <div className="resource-explore-speed-controls">
        <button
          type="button"
          className={`resource-explore-speed-btn ${exploreSpeedMode === "normal" ? "is-active" : ""}`}
          onClick={() => onChangeExploreSpeedMode("normal")}
          disabled={isActionLocked && !exploreSession}
        >
          일반
        </button>
        <button
          type="button"
          className={`resource-explore-speed-btn ${exploreSpeedMode === "fast" ? "is-active" : ""}`}
          onClick={() => onChangeExploreSpeedMode("fast")}
          disabled={isActionLocked && !exploreSession}
        >
          빠르게
        </button>
        <button
          type="button"
          className={`resource-explore-speed-btn ${exploreSpeedMode === "veryFast" ? "is-active" : ""}`}
          onClick={() => onChangeExploreSpeedMode("veryFast")}
          disabled={isActionLocked && !exploreSession}
        >
          매우빠르게
        </button>
      </div>
    </div>
  );
};



