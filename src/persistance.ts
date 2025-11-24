// src/persistance.ts

import { latLngToCellId } from "./grid.ts";
import type {
  Cell,
  CellId,
  GameState,
  GameStatus,
  LatLng,
  Token,
} from "./state.ts";
import { cellKey, CLASSROOM_ORIGIN } from "./state.ts";

const SAVE_KEY = "world-of-bits-save";

type SavedCell = {
  id: { x: number; y: number };
  token: Token | undefined;
};

type SavedState = {
  playerLL: LatLng;
  score: number;
  held: Token | undefined;
  overrides: SavedCell[];
  craftCellId?: CellId;
  scoreCellId?: CellId;
  bestScore?: number;
  status?: GameStatus;
  headingDeg?: number;
};

export function saveState(state: GameState): void {
  const overrides: SavedCell[] = [];
  for (const cell of state.overrides.values()) {
    overrides.push({
      id: cell.id,
      token: cell.token,
    });
  }

  const payload: SavedState = {
    playerLL: state.playerLL,
    score: state.score,
    held: state.held,
    overrides,
    craftCellId: state.craftCellId,
    scoreCellId: state.scoreCellId,
    bestScore: state.bestScore,
    status: state.status,
    ...(state.headingDeg !== undefined ? { headingDeg: state.headingDeg } : {}),
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // ignore (private mode, etc.)
  }
}

export function loadState(): GameState | undefined {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return undefined;

    const data = JSON.parse(raw) as SavedState;

    const overrides = new Map<string, Cell>();
    for (const c of data.overrides) {
      overrides.set(
        cellKey(c.id),
        { id: c.id, token: c.token },
      );
    }

    const playerLL = data.playerLL;
    const playerCell = latLngToCellId(playerLL);

    const craftCellId: CellId = data.craftCellId ??
      { x: playerCell.x + 1, y: playerCell.y };
    const scoreCellId: CellId = data.scoreCellId ??
      { x: playerCell.x, y: playerCell.y + 1 };

    // ensure our special cells start as “world overrides”
    if (!overrides.has(cellKey(craftCellId))) {
      overrides.set(cellKey(craftCellId), {
        id: craftCellId,
        token: undefined,
      });
    }
    if (!overrides.has(cellKey(scoreCellId))) {
      overrides.set(cellKey(scoreCellId), {
        id: scoreCellId,
        token: undefined,
      });
    }

    const score = data.score ?? 0;
    const bestScore = data.bestScore ?? score;
    const status: GameStatus = data.status ?? "playing";
    const headingDeg = data.headingDeg;

    return {
      playerLL,
      score,
      bestScore,
      status,
      headingDeg,
      held: data.held,
      overrides,
      craftCellId,
      scoreCellId,
    };
  } catch {
    return undefined;
  }
}

export function createInitialState(): GameState {
  const playerLL: LatLng = { ...CLASSROOM_ORIGIN };
  const playerCell = latLngToCellId(playerLL);

  const craftCellId: CellId = { x: playerCell.x + 1, y: playerCell.y };
  const scoreCellId: CellId = { x: playerCell.x, y: playerCell.y + 1 };

  const overrides = new Map<string, Cell>();
  overrides.set(cellKey(craftCellId), { id: craftCellId, token: undefined });
  overrides.set(cellKey(scoreCellId), { id: scoreCellId, token: undefined });

  return {
    playerLL,
    score: 0,
    bestScore: 0,
    status: "playing",
    headingDeg: undefined,
    held: undefined,
    overrides,
    craftCellId,
    scoreCellId,
  };
}

export function clearSavedState(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
