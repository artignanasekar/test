// src/main.ts

import { CELL_SIZE_DEG, latLngToCellId, manhattan } from "./grid.ts";
import {
  clearSavedState,
  createInitialState,
  loadState,
  saveState,
} from "./persistance.ts";
import type { CellId, GameState } from "./state.ts";
import { applyScoreDelta, cellKey, TARGET_SCORE } from "./state.ts";
import { World } from "./world.ts";

const INTERACTION_RANGE = 2; // how far from the player you can interact

// HUD elements
const mapEl = document.getElementById("map") as HTMLElement;
const scoreEl = document.getElementById("score") as HTMLElement;
const heldEl = document.getElementById("held") as HTMLElement;
const resetBtn = document.getElementById("reset") as HTMLButtonElement;
const bestEl = document.getElementById("best-score") as HTMLElement;
const goalEl = document.getElementById("goal-score") as HTMLElement;
const winOverlayEl = document.getElementById("win-overlay") as HTMLElement;

// load saved state or start fresh
const state: GameState = loadState() ?? createInitialState();

// World keeps a reference to the same state object
const world = new World(state, mapEl, handleCellClick);

updateHud();
world.renderCells();

// ---------------- RESET BUTTON ----------------

resetBtn.addEventListener("click", () => {
  const fresh = createInitialState();

  state.playerLL = fresh.playerLL;
  state.score = fresh.score;
  state.bestScore = fresh.bestScore;
  state.status = fresh.status;
  state.held = fresh.held;
  state.overrides = fresh.overrides;
  state.craftCellId = fresh.craftCellId;
  state.scoreCellId = fresh.scoreCellId;

  clearSavedState();
  saveState(state);
  updateHud();
  world.renderCells();
});

// ---------------- KEYBOARD MOVEMENT ----------------

globalThis.addEventListener("keydown", (ev: KeyboardEvent): void => {
  // allow moving even after winning, so you can still explore
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
      return; // ignore other keys
  }

  ev.preventDefault();

  // move one grid cell in the chosen direction
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
});

// ---------------- CELL INTERACTION ----------------

function sameCell(a: CellId, b: CellId): boolean {
  return a.x === b.x && a.y === b.y;
}

function handleCellClick(id: CellId): void {
  // once you win, ignore further cell interactions (you can reset to play again)
  if (state.status === "won") return;

  const playerCell = latLngToCellId(state.playerLL);

  // only allow interaction when cell is near the player
  if (manhattan(playerCell, id) > INTERACTION_RANGE) return;

  const isCraft = sameCell(id, state.craftCellId);
  const isScore = sameCell(id, state.scoreCellId);

  // --- Score block: cash in held token for permanent score ---
  if (isScore) {
    if (state.held) {
      applyScoreDelta(state, state.held.value);
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

  if (bestEl) {
    bestEl.textContent = state.bestScore.toString();
  }
  if (goalEl) {
    goalEl.textContent = TARGET_SCORE.toString();
  }

  if (winOverlayEl) {
    winOverlayEl.style.display = state.status === "won" ? "flex" : "none";
  }
}
