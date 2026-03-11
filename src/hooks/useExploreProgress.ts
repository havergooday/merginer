import { useEffect, useMemo, useState } from "react";
import type { Dispatch } from "react";

import { simulateExplore, type ExploreResult } from "@/domain/explore";
import type { Action } from "@/domain/reducer";
import type { Floor } from "@/domain/state";
import {
  buildExploreTimelineEvents,
  getEventDuration,
  type ExploreSpeedMode,
  type ExploreTimelineEvent,
} from "@/hooks/exploreTimeline";

export type { ExploreActor, ExploreEventType, ExploreSpeedMode, ExploreTimelineEvent } from "@/hooks/exploreTimeline";

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

type UseExploreProgressArgs = {
  currentFloor: Floor;
  currentHp: number;
  attack: number;
  isExploring: boolean;
  isResting: boolean;
  presentationMode: ExplorePresentationMode;
  dispatch: Dispatch<Action>;
};

const getVisibleLogs = (
  exploreResult: ExploreResult,
  activePresentationMode: ExplorePresentationMode,
  visibleLogCount: number,
  visibleEvents: ExploreTimelineEvent[],
  isExploreResultReady: boolean,
): ExploreResult["logs"] => {
  if (activePresentationMode === "legacy") {
    return exploreResult.logs.slice(0, visibleLogCount);
  }

  return exploreResult.logs.slice(
    0,
    isExploreResultReady ? exploreResult.logs.length : visibleEvents.filter((event) => event.type === "STAGE_CLEAR").length,
  );
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
  const [activePresentationMode, setActivePresentationMode] = useState<ExplorePresentationMode>("legacy");
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
  }, [activePresentationMode, exploreResult, exploreSpeedMode, isExploring, timelineEvents, visibleEventCount]);

  const startExplore = () => {
    if (isExploring || currentHp <= 0 || isResting) {
      return;
    }

    const result = simulateExplore({ floor: currentFloor, hp: currentHp, attack });
    setActivePresentationMode(presentationMode);
    setExploreResult(result);
    setVisibleLogCount(0);
    setVisibleEventCount(0);
    setTimelineEvents(
      presentationMode === "event"
        ? buildExploreTimelineEvents({ floor: currentFloor, hp: currentHp, attack, result })
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

    const visibleEvents = activePresentationMode === "event" ? timelineEvents.slice(0, visibleEventCount) : [];
    const visibleLogs = getVisibleLogs(exploreResult, activePresentationMode, visibleLogCount, visibleEvents, isExploreResultReady);

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

