import type { ExploreCinematicArtState, ResourcePreviewCardProps } from "@/components/resource-card/types";

type OverlayLogEntry = {
  id: string;
  text: string;
  tone: "info" | "success" | "warn";
  fading?: boolean;
};

export const getLocationName = (props: ResourcePreviewCardProps): string => {
  if (props.location === "village") return "마을";
  if (props.location === "inn") return "여관";
  if (props.location === "forge") return "대장간";
  return "탐사";
};

export const getArtLabel = (props: ResourcePreviewCardProps): string => {
  if (props.location === "village") return "VILLAGE";
  if (props.location === "inn") return "INN";
  if (props.location === "forge") return "FORGE";
  if (props.location === "explore" && props.isExploring) {
    return props.exploreCurrentEvent?.artKey ?? "EXPLORE";
  }
  return "EXPLORE";
};

export const getArtSrc = (props: ResourcePreviewCardProps): string => {
  if (props.location === "village") {
    return "/assets/ui/backgrounds/main_village.png";
  }
  if (props.location === "inn") {
    return "/assets/ui/backgrounds/main_inn.png";
  }
  if (props.location === "forge") {
    return "/assets/ui/backgrounds/main_forge.png";
  }

  const floorBase = props.exploreCurrentEvent?.floor ?? props.currentFloor;
  const clampedFloor = Math.min(3, Math.max(1, floorBase));
  return `/assets/ui/backgrounds/main_dungeon_${clampedFloor}.png`;
};

export const getHeaderTitle = (props: ResourcePreviewCardProps): string => {
  if (props.location === "explore" && props.isExploring) {
    return `탐사 - ${props.currentFloor}층`;
  }
  return getLocationName(props);
};

export const getHeaderStatus = (props: ResourcePreviewCardProps): string =>
  `HP ${String(props.currentHp).padStart(2, "0")} / ${String(props.maxHp).padStart(2, "0")} / ATK : ${String(
    props.attack,
  ).padStart(3, "0")}`;

const getEventOverlayLogs = (props: ResourcePreviewCardProps): OverlayLogEntry[] =>
  props.exploreVisibleEvents.slice(-3).map((event) => ({
    id: event.id,
    text: event.text,
    tone: event.tone,
    fading: false,
  }));

const getLegacyOverlayLogs = (props: ResourcePreviewCardProps): OverlayLogEntry[] =>
  props.exploreSession!.visibleLogs.slice(-3).map((log) => ({
    id: `explore-${log.stage}`,
    text: `${props.currentFloor}-${log.stage} 클리어 피해 -${log.damageTaken} 보상 철${log.reward.ironOre}`,
    tone: "info" as const,
    fading: false,
  }));

export const getOverlayLogs = (props: ResourcePreviewCardProps): OverlayLogEntry[] => {
  if (props.location === "village" || props.location === "inn") {
    return [];
  }

  if (props.location === "explore" && props.isExploring && props.exploreSession) {
    if (props.exploreVisibleEvents.length > 0) {
      return getEventOverlayLogs(props);
    }
    return getLegacyOverlayLogs(props);
  }

  return props.activityLogs;
};

const getBaseExploreArtState = (props: ResourcePreviewCardProps): ExploreCinematicArtState => {
  const currentEvent = props.exploreCurrentEvent;
  const stageLabel =
    currentEvent && currentEvent.stage > 0 ? `${currentEvent.floor}-${currentEvent.stage}` : `${props.currentFloor}-1`;

  return {
    isCinematic: true,
    stageLabel,
    bgKey: `DUNGEON-${props.currentFloor}`,
    eventType: currentEvent?.type ?? null,
    entryMode: "none",
    activeActor: currentEvent?.actor ?? null,
    playerState: "hidden",
    monsterState: "hidden",
    monsterHpCurrent: 0,
    monsterHpMax: 0,
  };
};

const applyMonsterHpState = (
  state: ExploreCinematicArtState,
  props: ResourcePreviewCardProps,
): ExploreCinematicArtState => {
  const currentEvent = props.exploreCurrentEvent;
  if (!currentEvent) {
    return state;
  }

  const currentStage = currentEvent.stage;
  const stageEvents = props.exploreVisibleEvents.filter((event) => event.stage === currentStage);
  const allStageEvents = stageEvents.some((event) => event.id === currentEvent.id) ? stageEvents : [...stageEvents, currentEvent];
  const monsterHpCandidates = allStageEvents.map((event) => event.monsterHpAfter).filter((hp) => hp > 0);

  return {
    ...state,
    monsterHpMax: monsterHpCandidates.length > 0 ? Math.max(...monsterHpCandidates) : 0,
    monsterHpCurrent: Math.max(0, currentEvent.monsterHpAfter),
  };
};

const applyEventState = (
  state: ExploreCinematicArtState,
  props: ResourcePreviewCardProps,
): ExploreCinematicArtState => {
  const currentEvent = props.exploreCurrentEvent;
  if (!currentEvent) {
    return state;
  }

  if (currentEvent.type === "STAGE_ENTRY") {
    return { ...state, entryMode: "both", playerState: "entry", monsterState: "entry" };
  }

  if (currentEvent.type === "MONSTER_ENTRY") {
    return { ...state, entryMode: "monster-only", playerState: "idle", monsterState: "entry" };
  }

  const base: ExploreCinematicArtState = { ...state, playerState: "idle", monsterState: "idle" };

  if (currentEvent.type === "ATTACK_SWING") {
    if (currentEvent.actor === "player") return { ...base, playerState: "attack" };
    if (currentEvent.actor === "monster") return { ...base, monsterState: "attack" };
    return base;
  }

  if (currentEvent.type === "HIT_REACT") {
    if (currentEvent.target === "player") return { ...base, playerState: "hit" };
    if (currentEvent.target === "monster") return { ...base, monsterState: "hit" };
    return base;
  }

  if (currentEvent.type === "DEATH_FALL") {
    if (currentEvent.target === "player") return { ...base, playerState: "dead" };
    if (currentEvent.target === "monster") return { ...base, monsterState: "dead" };
    return base;
  }

  if (currentEvent.type === "STAGE_CLEAR") {
    return { ...base, monsterState: "hidden", monsterHpCurrent: 0 };
  }

  if (currentEvent.type === "EXPLORE_END") {
    if (props.exploreSession?.result.endReason === "DEFEATED") {
      return { ...base, playerState: "dead" };
    }
    return { ...base, monsterState: "dead" };
  }

  return base;
};

export const getExploreArtState = (props: ResourcePreviewCardProps): ExploreCinematicArtState | null => {
  if (props.location !== "explore" || !props.isExploring || !props.exploreSession) {
    return null;
  }

  const baseState = getBaseExploreArtState(props);
  const hpApplied = applyMonsterHpState(baseState, props);
  return applyEventState(hpApplied, props);
};

export const getBodySlotClassName = (props: ResourcePreviewCardProps): string => {
  const classes = ["resource-card-body-slot"];
  classes.push(props.location === "village" ? "is-village" : "");
  classes.push(props.location === "inn" ? "is-inn" : "");
  classes.push(props.location === "forge" ? "is-forge" : "");
  classes.push(props.location === "explore" ? "is-explore" : "");
  return classes.join(" ").trim();
};

export const getIsCommonNavigationLocked = (props: ResourcePreviewCardProps): boolean => {
  const isInnNavigationLocked = props.isResting;
  return props.isActionLocked || (props.location === "inn" && isInnNavigationLocked);
};

export const getFrameSrc = (props: ResourcePreviewCardProps): string =>
  props.frameSrc ?? "/assets/ui/frames/card-frame.png";

