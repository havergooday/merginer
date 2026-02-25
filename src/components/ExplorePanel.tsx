type ExplorePanelProps = {
  canExplore: boolean;
  onExplore: () => void;
};

export const ExplorePanel = ({ canExplore, onExplore }: ExplorePanelProps) => {
  return (
    <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold">탐사 - 층</h2>
      <p className="mt-2 text-sm">현재 개방 층: 1층 (철광석 1~3 획득)</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300 hover:bg-blue-700"
          onClick={onExplore}
          disabled={!canExplore}
        >
          1층 탐사
        </button>
      </div>
    </section>
  );
};

