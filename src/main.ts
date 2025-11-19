// src/main.ts

import { CELL_SIZE_DEG, latLngToCellId, manhattan } from "./grid.ts";
import {
  clearSavedState,
  createInitialState,
  loadState,
  saveState,
} from "./persistance.ts";
import type { CellId, GameState, LatLng } from "./state.ts";
import { cellKey } from "./state.ts";
import { World } from "./world.ts";

const INTERACTION_RANGE = 2; // how far from the player you can interact

// HUD elements
const mapEl = document.getElementById("map") as HTMLElement;
const scoreEl = document.getElementById("score") as HTMLElement;
const heldEl = document.getElementById("held") as HTMLElement;
const resetBtn = document.getElementById("reset") as HTMLButtonElement;

// new movement UI
const movementSelect = document.getElementById(
  "movement-mode",
) as HTMLSelectElement | null;
const btnUp = document.getElementById("btn-up") as HTMLButtonElement | null;
const btnDown = document.getElementById("btn-down") as HTMLButtonElement | null;
const btnLeft = document.getElementById("btn-left") as HTMLButtonElement | null;
const btnRight = document.getElementById(
  "btn-right",
) as HTMLButtonElement | null;

// load saved state or start fresh
const state: GameState = loadState() ?? createInitialState();

// World keeps a reference to the same state object
const world = new World(state, mapEl, handleCellClick);

updateHud();
world.renderCells();

function movePlayerByCells(dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;

  // move one grid cell per unit step
  state.playerLL = {
    lat: state.playerLL.lat + dy * CELL_SIZE_DEG,
    lng: state.playerLL.lng + dx * CELL_SIZE_DEG,
  };

  // re-center map on player without animation (faster)
  world.map.setView(
    [state.playerLL.lat, state.playerLL.lng],
    world.map.getZoom(),
    { animate: false },
  );

  saveState(state);
  world.updatePlayerMarker();
  // cells will re-render because world.map's "moveend" listener calls renderCells()
}

type MoveCallback = (dx: number, dy: number) => void;

interface MovementImpl {
  start(): void;
  stop(): void;
}

/** Button-based movement (on-screen arrow buttons). */
class ButtonMovementImpl implements MovementImpl {
  private readonly upHandler = () => this.onMove(0, 1);
  private readonly downHandler = () => this.onMove(0, -1);
  private readonly leftHandler = () => this.onMove(-1, 0);
  private readonly rightHandler = () => this.onMove(1, 0);

  private readonly keyHandler = (ev: KeyboardEvent) => {
    let dx = 0;
    let dy = 0;

    switch (ev.key) {
      case "ArrowUp":
      case "w":
      case "W":
        dy = 1;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        dy = -1;
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        dx = -1;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        dx = 1;
        break;
      default:
        return;
    }

    ev.preventDefault();
    this.onMove(dx, dy);
  };

  constructor(
    private readonly onMove: MoveCallback,
    private readonly upBtn: HTMLButtonElement | null,
    private readonly downBtn: HTMLButtonElement | null,
    private readonly leftBtn: HTMLButtonElement | null,
    private readonly rightBtn: HTMLButtonElement | null,
  ) {}

  start(): void {
    if (this.upBtn) this.upBtn.addEventListener("click", this.upHandler);
    if (this.downBtn) this.downBtn.addEventListener("click", this.downHandler);
    if (this.leftBtn) this.leftBtn.addEventListener("click", this.leftHandler);
    if (this.rightBtn) {
      this.rightBtn.addEventListener("click", this.rightHandler);
    }

    // also support keyboard while in "button" mode
    globalThis.addEventListener("keydown", this.keyHandler);
  }

  stop(): void {
    if (this.upBtn) this.upBtn.removeEventListener("click", this.upHandler);
    if (this.downBtn) {
      this.downBtn.removeEventListener("click", this.downHandler);
    }
    if (this.leftBtn) {
      this.leftBtn.removeEventListener("click", this.leftHandler);
    }
    if (this.rightBtn) {
      this.rightBtn.removeEventListener("click", this.rightHandler);
    }

    globalThis.removeEventListener("keydown", this.keyHandler);
  }
}

/** Geolocation-based movement using the browser's Geolocation API. */
class GeolocationMovementImpl implements MovementImpl {
  private watchId: number | null = null;

  constructor(
    private readonly onMove: MoveCallback,
    private readonly getCurrentLatLng: () => LatLng,
  ) {}

  start(): void {
    if (!navigator.geolocation) {
      console.warn("Geolocation not available; staying in place.");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => {
        console.error("Geolocation error:", err);
        // if permission denied or other issue, we just stop watching
        if (this.watchId !== null) {
          navigator.geolocation.clearWatch(this.watchId);
          this.watchId = null;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      },
    );
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private handlePosition(pos: GeolocationPosition): void {
    const currentLL = this.getCurrentLatLng();
    const targetLL: LatLng = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };

    const currentCell = latLngToCellId(currentLL);
    const targetCell = latLngToCellId(targetLL);

    const dx = targetCell.x - currentCell.x;
    const dy = targetCell.y - currentCell.y;

    if (dx === 0 && dy === 0) return;

    this.onMove(dx, dy);
  }
}

/**
 * Facade over the movement subsystem.
 * The game only talks to this class when switching movement modes.
 */
class MovementFacade {
  private active: MovementImpl | null = null;

  constructor(
    private readonly buttonImpl: MovementImpl,
    private readonly geoImpl: MovementImpl,
  ) {}

  useButtons(): void {
    this.switchTo(this.buttonImpl);
  }

  useGeolocation(): void {
    this.switchTo(this.geoImpl);
  }

  private switchTo(next: MovementImpl): void {
    if (this.active === next) return;
    if (this.active) this.active.stop();
    this.active = next;
    this.active.start();
  }
}

// ---------------- RESET BUTTON ----------------

resetBtn.addEventListener("click", () => {
  const fresh = createInitialState();

  state.playerLL = fresh.playerLL;
  state.score = fresh.score;
  state.held = fresh.held;
  state.overrides = fresh.overrides;
  state.craftCellId = fresh.craftCellId;
  state.scoreCellId = fresh.scoreCellId;

  clearSavedState();
  saveState(state);
  updateHud();
  world.renderCells();
});

// ---------------- MOVEMENT FACADE SETUP ----------------

const buttonMovement = new ButtonMovementImpl(
  movePlayerByCells,
  btnUp,
  btnDown,
  btnLeft,
  btnRight,
);

const geoMovement = new GeolocationMovementImpl(
  movePlayerByCells,
  () => state.playerLL,
);

const movementFacade = new MovementFacade(buttonMovement, geoMovement);

// default to button-based movement
movementFacade.useButtons();

// allow switching at runtime via dropdown (buttons / geolocation)
if (movementSelect) {
  movementSelect.addEventListener("change", (ev) => {
    const value = (ev.target as HTMLSelectElement).value;
    if (value === "geo") {
      movementFacade.useGeolocation();
    } else {
      movementFacade.useButtons();
    }
  });
}

// ---------------- CELL INTERACTION ----------------

function sameCell(a: CellId, b: CellId): boolean {
  return a.x === b.x && a.y === b.y;
}

function handleCellClick(id: CellId): void {
  const playerCell = latLngToCellId(state.playerLL);

  // only allow interaction when cell is near the player
  if (manhattan(playerCell, id) > INTERACTION_RANGE) return;

  const isCraft = sameCell(id, state.craftCellId);
  const isScore = sameCell(id, state.scoreCellId);

  // --- Score block: cash in held token for permanent score ---
  if (isScore) {
    if (state.held) {
      state.score += state.held.value;
      state.held = undefined;
      // keep the score cell visually empty
      setOverrideEmpty(id);
      saveState(state);
      updateHud();
      world.renderCells();
    }
    return;
  }

  const cellBefore = world.getCell(id);
  const cellToken = cellBefore.token;
  const held = state.held;

  // --- Crafting block: combine tokens ---
  if (isCraft) {
    if (!held && cellToken) {
      // pick up from craft cell
      state.held = { ...cellToken };
      setOverrideEmpty(id);
    } else if (held && !cellToken) {
      // place held token into craft cell
      setOverrideToken(id, held.value);
      state.held = undefined;
    } else if (held && cellToken) {
      // combine: simple rule = sum values
      const newValue = held.value + cellToken.value;
      setOverrideToken(id, newValue);
      state.held = undefined;
    } else {
      return;
    }

    saveState(state);
    updateHud();
    world.renderCells();
    return;
  }

  // --- Normal world cells: pick up / drop only (no combining here) ---

  if (!held && cellToken) {
    // pick up token from the world
    state.held = { ...cellToken };
    setOverrideEmpty(id);
  } else if (held && !cellToken) {
    // drop held token into an empty world cell
    setOverrideToken(id, held.value);
    state.held = undefined;
  } else {
    return;
  }

  saveState(state);
  updateHud();
  world.renderCells();
}

// ---------------- HELPERS ----------------

function setOverrideEmpty(id: CellId): void {
  state.overrides.set(cellKey(id), { id, token: undefined });
}

function setOverrideToken(id: CellId, value: number): void {
  state.overrides.set(cellKey(id), { id, token: { value } });
}

function updateHud(): void {
  scoreEl.textContent = state.score.toString();
  heldEl.textContent = state.held ? state.held.value.toString() : "—";
}
