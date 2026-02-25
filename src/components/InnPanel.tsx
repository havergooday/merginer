type InnPanelProps = {
  canUseRest: boolean;
  isResting: boolean;
  restLabel: string;
  isTownLocked: boolean;
  onRest: () => void;
  onReset: () => void;
};

export const InnPanel = ({ canUseRest, isResting, restLabel, isTownLocked, onRest, onReset }: InnPanelProps) => {
  return (
    <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold">마을 - 여관</h2>
      <p className="mt-2 text-sm">체력이 부족하면 휴식으로 최대 체력까지 회복합니다.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-amber-300 hover:bg-amber-600"
          onClick={onRest}
          disabled={isTownLocked || !canUseRest}
        >
          {isResting ? `휴식 중... ${restLabel}` : "휴식 (체력 회복)"}
        </button>
        <button
          type="button"
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          onClick={onReset}
          disabled={isTownLocked}
        >
          리셋
        </button>
      </div>
    </section>
  );
};
