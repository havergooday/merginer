import type { GameState } from "@/domain/state";
import { migrateLegacyState } from "@/lib/storage/migrations";
import {
  isValidStateV9,
  normalizeFloor,
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
    const unlockedFloor = normalizeFloor(
      typeof parsed.gameState.unlockedFloor === "number" ? parsed.gameState.unlockedFloor : parsed.gameState.currentFloor,
    );
    const currentFloor = parsed.gameState.currentFloor > unlockedFloor ? unlockedFloor : parsed.gameState.currentFloor;

    return {
      ...parsed.gameState,
      unlockedFloor,
      currentFloor,
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
