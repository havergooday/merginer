type InnPanelProps = {
  canUseRest: boolean;
  isResting: boolean;
  restLabel: string;
  isTownLocked: boolean;
  onRest: () => void;
  onReset: () => void;
};

export const InnPanel = ({ canUseRest, isResting, restLabel, isTownLocked, onRest, onReset }: InnPanelProps) => {
  const restBadgeClass = isTownLocked
    ? "ui-badge ui-badge-locked"
    : canUseRest
      ? "ui-badge ui-badge-ready"
      : "ui-badge ui-badge-blocked";

  return (
    <section className="rounded-lg bg-transparent p-0 ring-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">휴식 관리</p>
        <span className={restBadgeClass}>{isResting ? "휴식 진행 중" : canUseRest ? "휴식 가능" : "대기"}</span>
      </div>
      <div className="kv-grid mt-2">
        <div className="kv-row">
          <span className="kv-label">REST STATE</span>
          <span className="kv-value">{isResting ? `휴식 중 (${restLabel})` : canUseRest ? "휴식 가능" : "휴식 불필요/불가"}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-[color:var(--ui-text-dim)]">체력이 부족하면 휴식으로 최대 체력까지 회복합니다.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn ui-btn-secondary"
          onClick={onRest}
          disabled={isTownLocked || !canUseRest}
        >
          {isResting ? `휴식 중... ${restLabel}` : "휴식 (체력 회복)"}
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-danger"
          onClick={onReset}
          disabled={isTownLocked}
        >
          리셋
        </button>
      </div>
    </section>
  );
};
