import { useCallback, useEffect, useRef, useState } from "react";

export type ActivityLogTone = "info" | "success" | "warn";

export type ActivityLogEntry = {
  id: string;
  text: string;
  tone: ActivityLogTone;
  createdAt: number;
  fading?: boolean;
};

const MAX_LOGS = 3;
const FADE_START_MS = 5500;
const REMOVE_MS = 7000;

export const useActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const pushLog = useCallback((text: string, tone: ActivityLogTone = "info") => {
    const now = Date.now();
    const id = `${now}-${Math.random().toString(36).slice(2, 7)}`;

    setLogs((prev) => {
      const next = [...prev, { id, text, tone, createdAt: now }];
      return next.slice(-MAX_LOGS);
    });

    const fadeTimer = window.setTimeout(() => {
      setLogs((prev) => prev.map((entry) => (entry.id === id ? { ...entry, fading: true } : entry)));
    }, FADE_START_MS);

    const removeTimer = window.setTimeout(() => {
      setLogs((prev) => prev.filter((entry) => entry.id !== id));
    }, REMOVE_MS);

    timersRef.current.push(fadeTimer, removeTimer);
  }, []);

  return {
    logs,
    pushLog,
  };
};
