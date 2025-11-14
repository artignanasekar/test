# arti gnanasekar plan – cmpm121 d3: world of bits

## THIS IS A DIFFERENT PROJECT BECAUSE MY FIRST REPO WAS GIVING ME A LOT OF ISSUES BUT THAT REPO HAS A LOT OF COMMITS ABOUT CHANGES AND FIXES I DID BEFORE I MOVED IT TO THIS REPO

this file is my incremental software development plan for this d3 project.

conventions:

- `[#]` = done
- `[ ]` = not done yet
- i'll add notes / links under tasks if i need more detail or have to revise the plan.
- each milestone (d3.a, d3.b, …) gets its own section. i'll update old sections instead of
  deleting them so i have a history of how the plan changed.

---

## d3.a – core mechanics (map + grid + tokens)

goal for this milestone:\
have a playable world map where the player can move around, see a grid of cells, interact with nearby cells, and pick up / connect tokens.

### a. project + map setup

- [#] confirm the repo builds and runs the starter project without errors.
- [#] switch to a full-screen map layout with a hud at the bottom for score and held token.
- [#] load the map library from a cdn, center it on the classroom location, and make sure dragging and zooming feel normal.

### b. world grid and coordinate helpers

- [#] decide on a fixed cell size for the grid.
- [#] add helpers to convert between map coordinates and grid cells in both directions.\
  _added `latlng → cell id` and `cell id → bounds`._
- [#] add a simple way to turn a cell position into a reusable key for storing data.\
  _added `cellKey(i,j)`._

### c. deterministic token spawning

- [#] add a deterministic random generator so the same input always gives the same output.\
  _kept available for base cell generation._
- [#] define how each cell’s base token (or emptiness) is decided from its position.\
  _uses seeded “luck” function for 1/2/4 values._
- [#] combine the base state with any player changes to get the current state of a cell.\
  _base cell + override map for player edits._
- [#] sanity-check that reloading the page in the same map area gives the same token layout.\
  _base layout stays deterministic; overrides add persistence on top._

### d. rendering the grid on the map

- [#] when the map view changes, figure out which grid cells are visible.
- [#] draw rectangles for visible cells and remove rectangles for cells that scroll out of view.
- [#] make each cell clickable so clicks go through a shared handler.

### e. showing token contents without clicking

- [#] display token values directly on the map for cells that contain tokens.
- [#] keep the visible token icons in sync when cells become empty or change value.
- [ ] adjust the visuals so token values are easy to see and read on the map.\
      _todo: contrast + size tuning, especially at different zooms._

### f. player position and movement

- [#] track the player’s position both as grid coordinates and map coordinates.
- [#] place a marker on the map for the player’s starting location.\
  _now a cat emoji marker instead of the default circle._
- [#] move the marker when the player moves and keep the map roughly centered on them.
- [#] hook up controls to move the player around the grid.\
  _now using keyboard movement (arrow keys + wasd)._

### g. interaction radius (only nearby cells are clickable)

- [#] define how to measure distance between two cells on the grid.\
  _manhattan distance._
- [#] ignore clicks on cells that are too far away from the player.
- [#] visually highlight nearby cells and make distant cells fainter to show the radius.\
  _nearby vs far cells use different rectangle opacity/colors._

### h. inventory and token “connecting”

- [#] track whether the player is currently holding a token or not.
- [#] show the current score and what the player is holding in the hud.\
  _hud shows score + held token._
- [#] support picking up a token from a cell, dropping a token into an empty cell, and merging two tokens into a higher-value token that increases the score.\
  _merge happens at the craft cell; banking happens at the score cell._
- [#] confirm the player can never hold more than one token at a time.\
  _only one `held` token at once._
- [#] confirm clicking on distant cells does nothing and does not bypass the radius rules.

### i. testing + cleanup for d3.a

- [#] do a full walkthrough from a fresh load:
  - map is centered on the classroom (or chosen start),
  - grid covers the visible map area,
  - tokens are visible and readable,
  - movement and interactions work as intended.
- [ ] add comments to the trickier parts of the map, grid, and deterministic spawning code.
- [#] commit and push the work for this milestone with a clear message.

---

## d3.b – viewport-driven cells, null island grid, crafting loop

goal for this milestone:\
separate player movement from map panning, keep cells visible to the edge of the current view, adopt an earth-spanning grid anchored at (0,0), and make crafting a more explicit part of the loop.

### a. movement ui + map behavior

- [ ] add on-screen buttons to move the player one grid step n/s/e/w.\
      _skipped; keyboard (arrow keys + wasd) is the primary control scheme._
- [#] allow panning/zooming the map without moving the player.
- [#] use the map’s `moveend/zoomend` event to trigger re-rendering of visible cells.

### b. earth-spanning grid anchored at null island

- [#] implement `latlng → cell id (i,j)` and `cell id → bounds` anchored at (0°,0°).
- [#] clamp/normalize longitude so the grid wraps across ±180°.
- [#] ensure grid cells fill the viewport all the way to the map’s edge.

### c. spawn/despawn behavior

- [#] spawn cells that come into view; despawn cells that leave view.\
  _visible cells are recomputed on each `moveend`._
- [ ] make cells memoryless for this milestone (forget contents when despawned).\
      _original idea; replaced by persistent overrides in d3.c._
- [#] note: base cell contents still come from deterministic spawning for consistency.

### d. interaction rules

- [#] allow interaction only within a manhattan radius of 2–3 cells from the player.\
  _currently using radius 2._
- [#] color nearby cells differently from distant ones for clear feedback.
- [ ] clicking a distant cell shows a friendly “too far” status.\
      _currently just ignored; could add ui message later._

### e. inventory + crafting loop

- [#] define a simple crafting rule for combining tokens.\
  _at the craft cell, combining two tokens adds their values._
- [#] keep “one held token” model but allow moving tokens around the grid to set up combos.
- [ ] add an explicit victory condition (e.g. craft a token ≥ target shown in hud).\
      _not implemented yet; current loop is open-ended score building._

### f. testing + cleanup for d3.b

- [#] verify the player stays put while panning/zooming the map.
- [#] confirm cells always cover the viewport after pans/zooms.
- [#] confirm out-of-radius interactions are blocked.
- [ ] pass over code comments and small visual polish (token label size/contrast).
- [#] commit and push with a clear message describing “viewport-driven cells + crafting”.

---

## d3.c – persistence, special cells, keyboard controls, performance

goal for this milestone:\
add persistent per-cell state across sessions, introduce special “craft table” and “score/star” cells near the player, support keyboard movement, and improve performance so the map feels responsive.

### a. persistent game state

- [#] design a `saved state` format that includes player position, score, held token, overrides, and special cell ids.
- [#] implement saving to `localStorage` whenever the world changes.
- [#] implement loading from `localStorage` on startup and falling back to a fresh initial state.
- [#] hook up a “reset world” button that clears the save and recreates the initial state.

### b. special craft + score cells

- [#] add `craftCellId` and `scoreCellId` to the game state, positioned near the starting player cell.
- [#] ensure these cells are always present in the overrides map.
- [#] render the craft cell with an orange outline + `C` label, and the score cell with a green outline + `★` label.
- [#] write interaction rules:
  - craft cell can accept tokens, hold a token, and combine held+cell tokens into a new value.
  - score cell banks the currently held token’s value into `score` and clears `held`.

### c. keyboard movement

- [#] add keyboard controls so the player can move one grid cell at a time with arrow keys or wasd.
- [#] recenter the map on the player after each move (no animation for snappier feel).
- [#] keep the interaction radius logic tied to the player’s new position.

### d. rendering performance + limiting visible cells

- [#] introduce a maximum render distance around the player so only nearby grid cells are drawn.\
  _uses `MAX_RENDER_DIST` window around the player’s cell._
- [#] make sure the grid still visually fills the viewport while reducing the number of rectangles/labels.
- [#] avoid redundant renders (let the map’s `moveend` events trigger cell redraws).

### e. player feedback + instructions

- [#] replace the default player marker with a cat emoji marker to make the avatar more readable and fun.
- [#] extend the hud with a “how to play” section:
  - explain that 🐱 is the player and you move with arrow keys / wasd,
  - explain 🟧 `c` as the craft table,
  - explain 🟩 `★` as the bank for scoring.
- [ ] consider small juice/polish touches (hover cues, subtle animations, or sound).

### f. testing + cleanup for d3.c

- [#] fully test: move with keyboard, pick up tokens, craft at `c`, bank at `★`, refresh page, and confirm state is restored.
- [#] verify reset clears both localStorage and in-memory state.
- [ ] add more comments to persistence and special-cell logic for future me.
- [#] commit and push with a clear message describing “persistent world + craft table + score star + keyboard movement”.

---

## stretch ideas / backlog (optional)

things i might try later if there’s time:

- different token sprites instead of plain numbers.
- sub-goals / quests tied to real campus landmarks.
- sound effects when collecting / merging.
- on-map ui for showing interaction radius.
- keyboard shortcuts for resetting, zoom presets, or cycling tips in the hud.
- add an explicit win condition (e.g. “reach 100 points” or “craft a 16+ token”) and a win screen.
