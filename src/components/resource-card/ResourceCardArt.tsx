import type { ExploreCinematicArtState } from "@/components/resource-card/types";

type ArtLogEntry = {
  id: string;
  text: string;
  tone: "info" | "success" | "warn";
  fading?: boolean;
};

type ResourceCardArtProps = {
  artSrc?: string;
  artLabel: string;
  overlayLogs: ArtLogEntry[];
  exploreArtState?: ExploreCinematicArtState | null;
};

const getCinematicEventClass = (state: ExploreCinematicArtState | null | undefined): string => {
  if (!state?.eventType) {
    return "";
  }

  if (state.eventType === "STAGE_ENTRY") {
    return "event-stage-entry";
  }
  if (state.eventType === "MONSTER_ENTRY") {
    return "event-monster-entry";
  }
  if (state.eventType === "ATTACK_SWING") {
    return `event-attack-swing ${state.activeActor ?? ""}`.trim();
  }
  if (state.eventType === "HIT_REACT") {
    if (state.playerState === "hit") {
      return "event-hit-react player";
    }
    if (state.monsterState === "hit") {
      return "event-hit-react monster";
    }
    return "event-hit-react";
  }
  if (state.eventType === "DEATH_FALL") {
    if (state.playerState === "dead") {
      return "event-death-fall player";
    }
    if (state.monsterState === "dead") {
      return "event-death-fall monster";
    }
    return "event-death-fall";
  }
  if (state.eventType === "STAGE_CLEAR") {
    return "event-stage-clear";
  }
  return "event-end";
};

export const ResourceCardArt = ({ artSrc, artLabel, overlayLogs, exploreArtState }: ResourceCardArtProps) => {
  const cinematicClass = getCinematicEventClass(exploreArtState);
  const entryModeClass =
    exploreArtState?.entryMode === "both"
      ? "unit-enter-both"
      : exploreArtState?.entryMode === "monster-only"
        ? "unit-enter-monster-only"
        : "";

  return (
    <div
      className={`resource-card-art-slot ${exploreArtState?.isCinematic ? "is-cinematic" : ""} ${cinematicClass} ${entryModeClass}`}
    >
      {exploreArtState?.isCinematic ? (
        <div className="resource-explore-cinematic-layer" aria-hidden>
          {artSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artSrc} alt={artLabel} className="resource-card-art-image resource-explore-bg-image" />
          ) : (
            <div className="resource-explore-bg">{exploreArtState.bgKey}</div>
          )}

          <div className={`resource-explore-unit player state-${exploreArtState.playerState}`}>
            <div className="resource-explore-unit-sprite">CHAR</div>
          </div>

          <div className={`resource-explore-unit monster state-${exploreArtState.monsterState}`}>
            <div className="resource-explore-unit-sprite">MON</div>
            {exploreArtState.monsterState !== "hidden" && exploreArtState.monsterHpMax > 0 ? (
              <div className="resource-explore-unit-hp">
                {exploreArtState.monsterHpCurrent}/{exploreArtState.monsterHpMax}
              </div>
            ) : null}
          </div>

          <div className="resource-explore-stage-chip">{exploreArtState.stageLabel}</div>
        </div>
      ) : artSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artSrc} alt={artLabel} className="resource-card-art-image" />
      ) : (
        <div className="resource-card-art-placeholder">{artLabel}</div>
      )}

      <div className="resource-art-log-overlay" aria-live="polite">
        {overlayLogs.map((entry) => (
          <p
            key={entry.id}
            className={[
              "resource-art-log-line",
              entry.tone === "success" ? "is-success" : entry.tone === "warn" ? "is-warn" : "",
              entry.fading ? "is-fading" : "",
            ]
              .join(" ")
              .trim()}
          >
            {entry.text}
          </p>
        ))}
      </div>
    </div>
  );
};
