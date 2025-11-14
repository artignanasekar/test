// src/world.ts

// fix Leaflet marker icons
import "./_leafletWorkaround.ts";

import type * as Leaflet from "leaflet";
import * as L from "leaflet";

import {
  cellIdToBounds,
  enumerateCellsInBounds,
  latLngToCellId,
} from "./grid.ts";
import { baseCell } from "./rng.ts";
import type { Cell, CellId, GameState } from "./state.ts";
import { cellKey } from "./state.ts";

export type CellClickHandler = (cellId: CellId) => void;

interface MapBounds {
  getSouth(): number;
  getNorth(): number;
  getWest(): number;
  getEast(): number;
}

interface LeafletClickEvent {
  latlng: { lat: number; lng: number };
}

// only render cells within this many grid steps of the player
const MAX_RENDER_DIST = 20;

/** Handles Leaflet map + cell layer + interactions */
export class World {
  readonly map: Leaflet.Map;
  readonly cellLayer: Leaflet.LayerGroup;
  readonly cellLabels: Leaflet.LayerGroup;
  readonly playerMarker: Leaflet.Marker;

  private visible = new Map<string, Cell>();

  constructor(
    readonly state: GameState,
    mount: HTMLElement,
    private readonly onCellClick: CellClickHandler,
  ) {
    this.map = L.map(mount, {
      worldCopyJump: true,
      preferCanvas: true,
    });

    this.map.setView(
      [state.playerLL.lat, state.playerLL.lng],
      17,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(this.map);

    this.cellLayer = L.layerGroup().addTo(this.map);
    this.cellLabels = L.layerGroup().addTo(this.map);

    // 🐱 player character marker
    const playerIcon = L.divIcon({
      className: "player-icon",
      html: "🐱",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    this.playerMarker = L.marker(
      [state.playerLL.lat, state.playerLL.lng],
      { icon: playerIcon },
    ).addTo(this.map);

    this.map.on("click", (e: LeafletClickEvent) => {
      const id = latLngToCellId({ lat: e.latlng.lat, lng: e.latlng.lng });
      this.onCellClick(id);
    });

    // when the map stops moving (drag or keyboard pan), update cells
    this.map.on("moveend", () => this.renderCells());

    this.renderCells();
  }

  /** Either a player-modified cell or the procedural base cell. */
  getCell(id: CellId): Cell {
    const key = cellKey(id);
    const override = this.state.overrides.get(key);
    return override ?? baseCell(id);
  }

  renderCells(): void {
    const bounds = this.map.getBounds() as unknown as MapBounds;
    const ids = enumerateCellsInBounds(bounds);

    const playerCell = latLngToCellId(this.state.playerLL);

    this.cellLayer.clearLayers();
    this.cellLabels.clearLayers();
    this.visible.clear();

    for (const id of ids) {
      // 🚀 performance: skip cells far away from the player
      if (
        Math.abs(id.x - playerCell.x) > MAX_RENDER_DIST ||
        Math.abs(id.y - playerCell.y) > MAX_RENDER_DIST
      ) {
        continue;
      }

      const cell = this.getCell(id);
      this.visible.set(cellKey(id), cell);

      const isCraft = id.x === this.state.craftCellId.x &&
        id.y === this.state.craftCellId.y;
      const isScore = id.x === this.state.scoreCellId.x &&
        id.y === this.state.scoreCellId.y;

      const rect = L.rectangle(cellIdToBounds(id), {
        weight: 1,
        fillOpacity: cell.token ? 0.4 : 0.05,
        interactive: false,
        color: isScore ? "#2e7d32" : isCraft ? "#f57c00" : "#3388ff",
      }).addTo(this.cellLayer);

      let label: string | undefined;
      if (cell.token) {
        label = String(cell.token.value);
      } else if (isCraft) {
        label = "C";
      } else if (isScore) {
        label = "★";
      }

      if (label) {
        const center = rect.getBounds().getCenter();
        const marker = L.marker(center, {
          interactive: false,
          opacity: 0,
        }).addTo(this.cellLabels);

        marker
          .bindTooltip(label, {
            permanent: true,
            direction: "center",
            className: "token-label",
          })
          .openTooltip();
      }
    }

    this.updatePlayerMarker();
  }

  updatePlayerMarker(): void {
    this.playerMarker.setLatLng([
      this.state.playerLL.lat,
      this.state.playerLL.lng,
    ]);
  }
}
