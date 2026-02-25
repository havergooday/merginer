import type { Floor } from "@/domain/state";

type ExplorePanelProps = {
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
  return (
    <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold">탐사 - 층</h2>
      <p className="mt-2 text-sm">체력: {currentHp}/{maxHp}</p>
      <p className="mt-1 text-sm">공격력: {attack}</p>
      <p className="mt-1 text-sm">현재 위치: {currentFloor}층 {currentStage > 0 ? `${currentFloor}-${currentStage}` : "마을"}</p>
      <p className="mt-1 text-xs text-slate-600">{floorHint[currentFloor]}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {[1, 2, 3].map((floor) => (
          <button
            key={floor}
            type="button"
            className="rounded-md bg-slate-200 px-3 py-1 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            onClick={() => onSetFloor(floor as Floor)}
            disabled={isExploring}
          >
            {floor}층 선택
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300 hover:bg-blue-700"
          onClick={onExploreStart}
          disabled={!canExplore}
        >
          {isExploring ? "탐험 진행 중..." : "탐사 시작"}
        </button>
      </div>
    </section>
  );
};
