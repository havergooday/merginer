import { useEffect, useMemo, useState } from "react";
import type { Dispatch } from "react";

import { simulateExplore, type ExploreResult } from "@/domain/explore";
import type { Action } from "@/domain/reducer";
import type { Floor } from "@/domain/state";

export type ExploreEventType =
  | "STAGE_ENTRY"
  | "MONSTER_ENTRY"
  | "ATTACK_SWING"
  | "HIT_REACT"
  | "DEATH_FALL"
  | "STAGE_CLEAR"
  | "EXPLORE_END";
export type ExploreSpeedMode = "normal" | "fast" | "veryFast";
export type ExploreActor = "player" | "monster";

export type ExploreTimelineEvent = {
  id: string;
  floor: Floor;
  stage: number;
  type: ExploreEventType;
  actor: ExploreActor | null;
  target: ExploreActor | null;
  text: string;
  hpAfter: number;
  monsterHpAfter: number;
  reward?: ExploreResult["totalReward"];
  durationMs: number;
  tone: "info" | "success" | "warn";
  artKey: string;
};

type ExplorePresentationMode = "legacy" | "event";

export type ExploreSessionViewModel = {
  result: ExploreResult;
  visibleLogs: ExploreResult["logs"];
  visibleEvents: ExploreTimelineEvent[];
  currentEvent: ExploreTimelineEvent | null;
  speedMode: ExploreSpeedMode;
  popupCurrentHp: number;
  popupCurrentStage: number;
  isResultReady: boolean;
};

const EVENT_DURATIONS: Record<ExploreEventType, number> = {
  STAGE_ENTRY: 700,
  MONSTER_ENTRY: 560,
  ATTACK_SWING: 450,
  HIT_REACT: 500,
  DEATH_FALL: 800,
  STAGE_CLEAR: 500,
  EXPLORE_END: 650,
};

const SPEED_MULTIPLIER: Record<ExploreSpeedMode, number> = {
  normal: 1,
  fast: 0.62,
  veryFast: 0.28,
};

const getEventDuration = (durationMs: number, speedMode: ExploreSpeedMode): number => {
  if (speedMode === "normal") {
    return durationMs;
  }

  const minDuration = speedMode === "veryFast" ? 60 : 150;
  return Math.max(minDuration, Math.round(durationMs * SPEED_MULTIPLIER[speedMode]));
};

const getArtKeyByEventType = (type: ExploreEventType): string => {
  if (type === "STAGE_ENTRY") return "ENTRY";
  if (type === "MONSTER_ENTRY") return "MONSTER ENTRY";
  if (type === "ATTACK_SWING") return "ATTACK";
  if (type === "HIT_REACT") return "HIT";
  if (type === "DEATH_FALL") return "DEFEAT";
  if (type === "STAGE_CLEAR") return "CLEAR";
  return "RESULT";
};

const getToneByEventType = (type: ExploreEventType): "info" | "success" | "warn" => {
  if (type === "STAGE_CLEAR") return "success";
  if (type === "HIT_REACT" || type === "DEATH_FALL" || type === "EXPLORE_END") return "warn";
  return "info";
};

const createEvent = (
  floor: Floor,
  stage: number,
  type: ExploreEventType,
  options: {
    actor?: ExploreActor | null;
    target?: ExploreActor | null;
    text: string;
    hpAfter: number;
    monsterHpAfter: number;
    reward?: ExploreResult["totalReward"];
  },
): ExploreTimelineEvent => ({
  id: `${floor}-${stage}-${type}-${options.actor ?? "none"}-${options.target ?? "none"}-${options.hpAfter}-${options.monsterHpAfter}`,
  floor,
  stage,
  type,
  actor: options.actor ?? null,
  target: options.target ?? null,
  text: options.text,
  hpAfter: options.hpAfter,
  monsterHpAfter: options.monsterHpAfter,
  reward: options.reward,
  durationMs: EVENT_DURATIONS[type],
  tone: getToneByEventType(type),
  artKey: getArtKeyByEventType(type),
});

export const buildExploreTimelineEvents = ({
  floor,
  hp,
  attack,
  result,
}: {
  floor: Floor;
  hp: number;
  attack: number;
  result: ExploreResult;
}): ExploreTimelineEvent[] => {
  const events: ExploreTimelineEvent[] = [];
  const safeAttack = Math.max(1, attack);
  let currentHp = Math.max(0, hp);
  let ended = false;

  for (const stageLog of result.logs) {
    const stage = stageLog.stage;
    const monsterAttack = stageLog.monsterAttack;
    const monsterMaxHp = stageLog.monsterHp;
    const requiredHits = Math.max(1, Math.ceil(monsterMaxHp / safeAttack));

    if (stage === 1) {
      events.push(
        createEvent(floor, stage, "STAGE_ENTRY", {
          text: `${floor}-${stage} 진입`,
          hpAfter: currentHp,
          monsterHpAfter: monsterMaxHp,
        }),
      );
    } else {
      events.push(
        createEvent(floor, stage, "MONSTER_ENTRY", {
          actor: "monster",
          text: `${floor}-${stage} 몬스터 출현`,
          hpAfter: currentHp,
          monsterHpAfter: monsterMaxHp,
        }),
      );
    }

    let monsterHpAfter = monsterMaxHp;
    for (let hitIndex = 1; hitIndex <= requiredHits; hitIndex += 1) {
      events.push(
        createEvent(floor, stage, "ATTACK_SWING", {
          actor: "player",
          text: `${floor}-${stage} 플레이어 공격`,
          hpAfter: currentHp,
          monsterHpAfter,
        }),
      );

      monsterHpAfter = Math.max(0, monsterMaxHp - safeAttack * hitIndex);
      events.push(
        createEvent(floor, stage, "HIT_REACT", {
          target: "monster",
          text:
            monsterHpAfter <= 0
              ? `${floor}-${stage} 몬스터 처치`
              : `${floor}-${stage} 몬스터 피격 (${monsterHpAfter})`,
          hpAfter: currentHp,
          monsterHpAfter,
        }),
      );

      if (monsterHpAfter <= 0) {
        events.push(
          createEvent(floor, stage, "DEATH_FALL", {
            target: "monster",
            text: `${floor}-${stage} 몬스터 사망`,
            hpAfter: currentHp,
            monsterHpAfter: 0,
          }),
        );
        break;
      }

      events.push(
        createEvent(floor, stage, "ATTACK_SWING", {
          actor: "monster",
          text: `${floor}-${stage} 몬스터 공격`,
          hpAfter: currentHp,
          monsterHpAfter,
        }),
      );

      currentHp = Math.max(0, currentHp - monsterAttack);
      events.push(
        createEvent(floor, stage, "HIT_REACT", {
          target: "player",
          text: `${floor}-${stage} 플레이어 피격 (${currentHp})`,
          hpAfter: currentHp,
          monsterHpAfter,
        }),
      );

      if (currentHp <= 0) {
        events.push(
          createEvent(floor, stage, "DEATH_FALL", {
            target: "player",
            text: `${floor}-${stage} 플레이어 전투불능`,
            hpAfter: 0,
            monsterHpAfter,
          }),
        );
        events.push(
          createEvent(floor, stage, "EXPLORE_END", {
            text: `${floor}-${stage} 탐험 종료`,
            hpAfter: 0,
            monsterHpAfter,
          }),
        );
        ended = true;
        break;
      }
    }

    if (ended) {
      break;
    }

    currentHp = stageLog.hpAfter;
    events.push(
      createEvent(floor, stage, "STAGE_CLEAR", {
        text: `${floor}-${stage} 클리어 · 다음 스테이지 이동`,
        hpAfter: currentHp,
        monsterHpAfter: 0,
        reward: stageLog.reward,
      }),
    );
  }

  if (!ended) {
    const endText =
      result.endReason === "DEFEATED"
        ? `${floor}-${result.clearedStage} 탐험 실패`
        : `${floor}층 탐험 완료`;
    events.push(
      createEvent(floor, result.clearedStage, "EXPLORE_END", {
        text: endText,
        hpAfter: result.finalHp,
        monsterHpAfter: 0,
      }),
    );
  }

  return events;
};

type UseExploreProgressArgs = {
  currentFloor: Floor;
  currentHp: number;
  attack: number;
  isExploring: boolean;
  isResting: boolean;
  presentationMode: ExplorePresentationMode;
  dispatch: Dispatch<Action>;
};

export const useExploreProgress = ({
  currentFloor,
  currentHp,
  attack,
  isExploring,
  isResting,
  presentationMode,
  dispatch,
}: UseExploreProgressArgs): {
  session: ExploreSessionViewModel | null;
  startExplore: () => void;
  confirmExplore: () => void;
  exploreSpeedMode: ExploreSpeedMode;
  setExploreSpeedMode: (mode: ExploreSpeedMode) => void;
} => {
  const [exploreResult, setExploreResult] = useState<ExploreResult | null>(null);
  const [visibleLogCount, setVisibleLogCount] = useState(0);
  const [visibleEventCount, setVisibleEventCount] = useState(0);
  const [isExploreResultReady, setIsExploreResultReady] = useState(false);
  const [activePresentationMode, setActivePresentationMode] =
    useState<ExplorePresentationMode>("legacy");
  const [exploreSpeedMode, setExploreSpeedMode] = useState<ExploreSpeedMode>("normal");
  const [timelineEvents, setTimelineEvents] = useState<ExploreTimelineEvent[]>([]);

  useEffect(() => {
    if (!isExploring || !exploreResult || activePresentationMode !== "legacy") {
      return;
    }

    const totalSteps = exploreResult.logs.length;
    if (totalSteps === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setVisibleLogCount((prev) => {
        const next = prev + 1;
        if (next >= totalSteps) {
          window.clearInterval(timer);
          setIsExploreResultReady(true);
          return totalSteps;
        }
        return next;
      });
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [activePresentationMode, isExploring, exploreResult]);

  useEffect(() => {
    if (!isExploring || !exploreResult || activePresentationMode !== "event") {
      return;
    }

    if (timelineEvents.length === 0) {
      setIsExploreResultReady(true);
      return;
    }

    if (visibleEventCount >= timelineEvents.length) {
      setIsExploreResultReady(true);
      return;
    }

    const nextEvent = timelineEvents[visibleEventCount];
    const duration = getEventDuration(nextEvent.durationMs, exploreSpeedMode);

    const timer = window.setTimeout(() => {
      setVisibleEventCount((prev) => Math.min(prev + 1, timelineEvents.length));
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activePresentationMode,
    exploreResult,
    exploreSpeedMode,
    isExploring,
    timelineEvents,
    visibleEventCount,
  ]);

  const startExplore = () => {
    if (isExploring || currentHp <= 0 || isResting) {
      return;
    }

    const result = simulateExplore({
      floor: currentFloor,
      hp: currentHp,
      attack,
    });

    const nextMode: ExplorePresentationMode = presentationMode;
    setActivePresentationMode(nextMode);
    setExploreResult(result);
    setVisibleLogCount(0);
    setVisibleEventCount(0);
    setTimelineEvents(
      nextMode === "event"
        ? buildExploreTimelineEvents({
            floor: currentFloor,
            hp: currentHp,
            attack,
            result,
          })
        : [],
    );
    setIsExploreResultReady(result.logs.length === 0);
    dispatch({ type: "START_EXPLORE" });
  };

  const confirmExplore = () => {
    if (!exploreResult) {
      return;
    }

    dispatch({
      type: "APPLY_EXPLORE_RESULT",
      result: {
        finalHp: exploreResult.finalHp,
        clearedStage: exploreResult.clearedStage,
        endReason: exploreResult.endReason,
        reward: exploreResult.totalReward,
      },
    });

    setExploreResult(null);
    setVisibleLogCount(0);
    setVisibleEventCount(0);
    setTimelineEvents([]);
    setIsExploreResultReady(false);
  };

  const session = useMemo<ExploreSessionViewModel | null>(() => {
    if (!exploreResult) {
      return null;
    }

    const visibleEvents =
      activePresentationMode === "event" ? timelineEvents.slice(0, visibleEventCount) : [];
    const visibleLogs =
      activePresentationMode === "legacy"
        ? exploreResult.logs.slice(0, visibleLogCount)
        : exploreResult.logs.slice(
            0,
            isExploreResultReady
              ? exploreResult.logs.length
              : visibleEvents.filter((event) => event.type === "STAGE_CLEAR").length,
          );

    const currentEvent = visibleEvents[visibleEvents.length - 1] ?? null;
    const latestLog = visibleLogs[visibleLogs.length - 1];
    const popupCurrentHp = currentEvent ? currentEvent.hpAfter : latestLog ? latestLog.hpAfter : currentHp;
    const popupCurrentStage = currentEvent ? currentEvent.stage : latestLog ? latestLog.stage : 0;

    return {
      result: exploreResult,
      visibleLogs,
      visibleEvents,
      currentEvent,
      speedMode: exploreSpeedMode,
      popupCurrentHp,
      popupCurrentStage,
      isResultReady: isExploreResultReady,
    };
  }, [
    activePresentationMode,
    currentHp,
    exploreResult,
    exploreSpeedMode,
    isExploreResultReady,
    timelineEvents,
    visibleEventCount,
    visibleLogCount,
  ]);

  return {
    session,
    startExplore,
    confirmExplore,
    exploreSpeedMode,
    setExploreSpeedMode,
  };
};
