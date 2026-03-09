type InnBodyProps = {
  isActionLocked: boolean;
  isResting: boolean;
  restLabel: string;
  canUseRest: boolean;
  onRest: () => void;
};

export const InnBody = ({
  isActionLocked,
  isResting,
  restLabel,
  canUseRest,
  onRest,
}: InnBodyProps) => (
  <div className="resource-inn-body">
    <div className="resource-inn-layout">
      <div className="resource-inn-action-stack">
        <button
          type="button"
          className="resource-card-action-btn resource-inn-action-btn resource-inn-rest-btn"
          onClick={onRest}
          disabled={isActionLocked || isResting || !canUseRest}
        >
          {isResting ? `휴식 중... ${restLabel}` : "휴식"}
        </button>
        <button
          type="button"
          className="resource-card-action-btn resource-inn-action-btn resource-inn-upgrade-btn"
          disabled
        >
          여관 업그레이드
        </button>
      </div>
      <div className="resource-inn-npc-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/character/inn_i.png" alt="여관 NPC" className="resource-inn-npc-image" />
      </div>
    </div>
  </div>
);
