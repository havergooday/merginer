import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";

import type { Action } from "@/domain/reducer";

const REST_UNTIL_KEY = "reinforce-rest-until";
const REST_DELAY_MS = 3000;

export const formatAsMmSs = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export const useRestCountdown = (
  dispatch: Dispatch<Action>,
  canUseRestNow: boolean,
): {
  isResting: boolean;
  restRemainingSec: number;
  triggerRest: () => void;
} => {
  const [isResting, setIsResting] = useState(false);
  const [restRemainingSec, setRestRemainingSec] = useState(0);
  const restTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = useCallback(() => {
    if (restTimeoutRef.current) {
      clearTimeout(restTimeoutRef.current);
      restTimeoutRef.current = null;
    }
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (restUntil: number, persist: boolean) => {
      const now = Date.now();
      const remainingMs = Math.max(0, restUntil - now);

      stopTimers();
      setIsResting(true);
      setRestRemainingSec(Math.max(0, Math.ceil(remainingMs / 1000)));

      if (persist) {
        window.localStorage.setItem(REST_UNTIL_KEY, String(restUntil));
      }

      restIntervalRef.current = setInterval(() => {
        const leftMs = Math.max(0, restUntil - Date.now());
        setRestRemainingSec(Math.max(0, Math.ceil(leftMs / 1000)));
      }, 1000);

      restTimeoutRef.current = setTimeout(() => {
        dispatch({ type: "REST" });
        stopTimers();
        setIsResting(false);
        setRestRemainingSec(0);
        window.localStorage.removeItem(REST_UNTIL_KEY);
      }, remainingMs);
    },
    [dispatch, stopTimers],
  );

  useEffect(() => {
    return () => {
      stopTimers();
    };
  }, [stopTimers]);

  useEffect(() => {
    const raw = window.localStorage.getItem(REST_UNTIL_KEY);
    if (!raw) {
      return;
    }

    const restUntil = Number(raw);
    if (!Number.isFinite(restUntil)) {
      window.localStorage.removeItem(REST_UNTIL_KEY);
      return;
    }

    const now = Date.now();
    if (restUntil <= now) {
      dispatch({ type: "REST" });
      window.localStorage.removeItem(REST_UNTIL_KEY);
      return;
    }

    const starter = setTimeout(() => {
      startCountdown(restUntil, false);
    }, 0);

    return () => clearTimeout(starter);
  }, [dispatch, startCountdown]);

  const triggerRest = useCallback(() => {
    if (!canUseRestNow || isResting) {
      return;
    }

    const restUntil = Date.now() + REST_DELAY_MS;
    startCountdown(restUntil, true);
  }, [canUseRestNow, isResting, startCountdown]);

  return {
    isResting,
    restRemainingSec,
    triggerRest,
  };
};

