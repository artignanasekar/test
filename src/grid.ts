import type { CellId, LatLng } from "./state.ts";

export const CELL_SIZE_DEG = 0.0002; // size of each grid cell in degrees

export function latLngToCellId(ll: LatLng): CellId {
  return {
    x: Math.floor(ll.lng / CELL_SIZE_DEG),
    y: Math.floor(ll.lat / CELL_SIZE_DEG),
  };
}

export function cellIdToBounds(
  id: CellId,
): [[number, number], [number, number]] {
  const south = id.y * CELL_SIZE_DEG;
  const west = id.x * CELL_SIZE_DEG;
  const north = south + CELL_SIZE_DEG;
  const east = west + CELL_SIZE_DEG;
  return [
    [south, west],
    [north, east],
  ];
}

// minimal interface instead of `any` to keep lint happy
interface MapBounds {
  getSouth(): number;
  getNorth(): number;
  getWest(): number;
  getEast(): number;
}

export function enumerateCellsInBounds(bounds: MapBounds): CellId[] {
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();

  const min = latLngToCellId({ lat: south, lng: west });
  const max = latLngToCellId({ lat: north, lng: east });

  const ids: CellId[] = [];
  for (let y = min.y; y <= max.y; y++) {
    for (let x = min.x; x <= max.x; x++) {
      ids.push({ x, y });
    }
  }
  return ids;
}

export function manhattan(a: CellId, b: CellId): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
