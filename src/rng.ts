// src/rng.ts

import type { Cell, CellId, Token } from "./state.ts";

function luck(seed: number): number {
  const x = Math.sin(seed) * 43758.5453123;
  return x - Math.floor(x);
}

// deterministic token per cell
export function baseTokenForCell(id: CellId): Token | undefined {
  const seed = id.x * 73856093 ^ id.y * 19349663;
  const r = luck(seed);

  if (r < 0.5) return undefined; // empty
  if (r < 0.8) return { value: 1 };
  if (r < 0.95) return { value: 2 };
  return { value: 4 };
}

export function baseCell(id: CellId): Cell {
  const token = baseTokenForCell(id);
  return { id, token };
}
