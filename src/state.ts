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

export type GameState = {
  playerLL: LatLng;
  score: number;
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
