// src/state.ts

export type LatLng = {
  lat: number;
  lng: number;
};

export type CellId = {
  x: number;
  y: number;
};

export type Token = {
  value: number;
};

export type Cell = {
  id: CellId;
  token: Token | undefined;
};

export type GameStatus = "playing" | "won";

/**
 * Target score needed to "win" the game.
 * You can tweak this if you want the game shorter/longer.
 */
export const TARGET_SCORE = 128;

export type GameState = {
  playerLL: LatLng;
  score: number;
  bestScore: number;
  status: GameStatus;
  headingDeg: number | undefined;

  held: Token | undefined;
  overrides: Map<string, Cell>;

  // special cells near the player
  craftCellId: CellId;
  scoreCellId: CellId;
};

// fixed “classroom” location (adjust if your prof gave different coords)
export const CLASSROOM_ORIGIN: LatLng = {
  lat: 36.989743,
  lng: -122.062819,
};

export function cellKey(id: CellId): string {
  return `${id.x},${id.y}`;
}

/**
 * Apply a change to the score, update bestScore,
 * and flip the game into "won" when the target is reached.
 */
export function applyScoreDelta(state: GameState, delta: number): void {
  if (delta === 0) return;

  state.score += delta;

  if (state.score > state.bestScore) {
    state.bestScore = state.score;
  }

  if (state.status === "playing" && state.score >= TARGET_SCORE) {
    state.status = "won";
  }
}
