import { useEffect, useMemo, useState } from "react";
import type { Dispatch } from "react";

import { simulateExplore, type ExploreResult } from "@/domain/explore";
import type { Action } from "@/domain/reducer";
import type { Floor } from "@/domain/state";

export type ExploreSessionViewModel = {
  result: ExploreResult;
  visibleLogs: ExploreResult["logs"];
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
  dispatch: Dispatch<Action>;
};

export const useExploreProgress = ({
  currentFloor,
  currentHp,
  attack,
  isExploring,
  isResting,
  dispatch,
}: UseExploreProgressArgs): {
  session: ExploreSessionViewModel | null;
  startExplore: () => void;
  confirmExplore: () => void;
} => {
  const [exploreResult, setExploreResult] = useState<ExploreResult | null>(null);
  const [visibleLogCount, setVisibleLogCount] = useState(0);
  const [isExploreResultReady, setIsExploreResultReady] = useState(false);

  useEffect(() => {
    if (!isExploring || !exploreResult) {
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
  }, [isExploring, exploreResult]);

  const startExplore = () => {
    if (isExploring || currentHp <= 0 || isResting) {
      return;
    }

    const result = simulateExplore({
      floor: currentFloor,
      hp: currentHp,
      attack,
    });

    setExploreResult(result);
    setVisibleLogCount(0);
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
    setIsExploreResultReady(false);
  };

  const session = useMemo<ExploreSessionViewModel | null>(() => {
    if (!exploreResult) {
      return null;
    }

    const visibleLogs = exploreResult.logs.slice(0, visibleLogCount);
    const latestLog = visibleLogs[visibleLogs.length - 1];
    const popupCurrentHp = latestLog ? latestLog.hpAfter : currentHp;
    const popupCurrentStage = latestLog ? latestLog.stage : 0;

    return {
      result: exploreResult,
      visibleLogs,
      popupCurrentHp,
      popupCurrentStage,
      isResultReady: isExploreResultReady,
    };
  }, [exploreResult, visibleLogCount, currentHp, isExploreResultReady]);

  return {
    session,
    startExplore,
    confirmExplore,
  };
};
