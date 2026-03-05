type ResourceCardHeaderProps = {
  title: string;
  status: string;
  currentHp: number;
  maxHp: number;
};

export const ResourceCardHeader = ({ title, status, currentHp, maxHp }: ResourceCardHeaderProps) => {
  const totalSegments = Math.max(1, Math.floor(maxHp));
  const filledSegments = Math.max(0, Math.min(Math.floor(currentHp), totalSegments));
  const [hpText, atkTextRaw] = status.split(" / ATK : ");
  const atkText = atkTextRaw ? `ATK : ${atkTextRaw}` : "";

  return (
    <header className="resource-card-header-slot">
      <div className="resource-card-header-top-row">
        <div className="resource-card-title">{title}</div>
        <div className="resource-card-status-inline">
          <span className="resource-card-status-hp">{hpText}</span>
          {atkText ? <span className="resource-card-status-atk">{atkText}</span> : null}
        </div>
      </div>
      <div className="resource-card-header-gauge-row">
        <div className="resource-hp-gauge-frame">
          <div
            className="resource-hp-gauge-grid"
            style={{ gridTemplateColumns: `repeat(${totalSegments}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: totalSegments }, (_, index) => (
              <span
                key={`hp-segment-${index + 1}`}
                className={`resource-hp-segment ${index < filledSegments ? "is-filled" : ""}`}
                aria-hidden
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
