import type { GameState } from "@/domain/state";
import { migrateLegacyState } from "@/lib/storage/migrations";
import {
  isValidStateV9,
  STATE_VERSION,
  STORAGE_KEY,
  type PersistedState,
  type PersistedStateParser,
} from "@/lib/storage/schema";

const legacyVersions = new Set([1, 2, 3, 4, 5, 6, 7, 8, STATE_VERSION]);

const parsePersistedState: PersistedStateParser = (value: unknown): GameState | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const parsed = value as Partial<PersistedState>;
  if (!legacyVersions.has(parsed.stateVersion ?? -1)) {
    return null;
  }

  if (isValidStateV9(parsed.gameState)) {
    return {
      ...parsed.gameState,
      // 탐험 도중 저장 상태는 로드시 항상 마을 상태로 정규화
      currentStage: 0,
      isExploring: false,
    };
  }

  return migrateLegacyState(parsed.gameState);
};

export const loadState = (): GameState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsePersistedState(parsed);
  } catch {
    return null;
  }
};

export const saveState = (gameState: GameState): void => {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PersistedState = {
    stateVersion: STATE_VERSION,
    gameState,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export { isValidStateV9 } from "@/lib/storage/schema";
export { migrateLegacyState } from "@/lib/storage/migrations";
