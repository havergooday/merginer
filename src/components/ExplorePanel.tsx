import type { Floor } from "@/domain/state";

type ExplorePanelProps = {
  unlockedFloor: Floor;
  currentFloor: Floor;
  currentStage: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  canExplore: boolean;
  isExploring: boolean;
  onExploreStart: () => void;
  onSetFloor: (floor: Floor) => void;
};

const floorHint: Record<Floor, string> = {
  1: "1층: 철광석 중심 파밍",
  2: "2층: 철광석 + 강철석",
  3: "3층: 철광석 + 강철석 + 미스릴",
};

export const ExplorePanel = ({
  unlockedFloor,
  currentFloor,
  currentStage,
  currentHp,
  maxHp,
  attack,
  canExplore,
  isExploring,
  onExploreStart,
  onSetFloor,
}: ExplorePanelProps) => {
  const actionBadgeClass = isExploring
    ? "ui-badge ui-badge-locked"
    : canExplore
      ? "ui-badge ui-badge-ready"
      : "ui-badge ui-badge-blocked";

  return (
    <section className="rounded-lg bg-transparent p-0 ring-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">탐험 진행</h2>
        <span className={actionBadgeClass}>{isExploring ? "진행 중" : canExplore ? "출발 가능" : "조건 부족"}</span>
      </div>
      <div className="kv-grid mt-2">
        <div className="kv-row">
          <span className="kv-label">HP</span>
          <span className="kv-value">{currentHp}/{maxHp}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">ATK</span>
          <span className="kv-value">{attack}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">LOCATION</span>
          <span className="kv-value">{currentFloor}층 {currentStage > 0 ? `${currentFloor}-${currentStage}` : "마을"}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-[color:var(--ui-text-dim)]">{floorHint[currentFloor]}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {[1, 2, 3].map((floor) => (
          <button
            key={floor}
            type="button"
            className="ui-btn ui-btn-neutral px-3 py-1"
            onClick={() => onSetFloor(floor as Floor)}
            disabled={isExploring || floor > unlockedFloor}
          >
            {floor}층 {floor > unlockedFloor ? "잠김" : "선택"}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn ui-btn-secondary"
          onClick={onExploreStart}
          disabled={!canExplore}
        >
          {isExploring ? "탐험 진행 중..." : "탐사 시작"}
        </button>
      </div>
    </section>
  );
};
