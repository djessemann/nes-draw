# NES Map Maker — Product & Technical Plan

A touch-first web app for laying out NES game maps (Zelda-, Dragon Quest-style) from real NES
graphics tiles — built for non-technical creatives, styled and structured like
[nesprite](https://github.com/djessemann/nesprite), and able to export data that Claude (or any
developer/tool) can turn directly into a working NES game.

---

## 1. Vision

**"Draw a world like you'd doodle on graph paper. Get back something a real NES game can use."**

The user never needs to know what a nametable, attribute table, or CHR bank is. They see:

- **Tiles** — little 16×16-pixel pictures (grass, water, brick, tree…)
- **Screens** — one TV-screen's worth of map
- **Worlds** — screens connected in a grid, like the Zelda overworld map

Everything hard about the NES (8×8 hardware tiles, palette-per-16×16-area color rules, data
formats) is handled invisibly, surfaced only as gentle guardrails ("this area can only use one
color set — tap to fix").

## 2. Design principles (inherited from nesprite)

1. **One screen, no menus-in-menus.** Canvas in the middle, tools on the edges. Every core action
   is at most one tap away.
2. **Touch is the primary input, not an afterthought.** Finger-sized targets (≥44 pt), no hover
   states required, gestures for navigation (pinch zoom, two-finger pan), Apple Pencil supported
   but never required.
3. **Chunky retro visual style.** Dark UI chrome, pixel-crisp rendering (`image-rendering:
   pixelated`), NES palette colors in the UI accents, bitmap-style UI font. The app should *feel*
   like it belongs next to nesprite.
4. **No accounts, no cloud, no install step.** A PWA that runs from a URL, works offline, saves
   locally, installable to the iPad home screen.
5. **Impossible states are prevented, not error-messaged.** The editor only lets you place what
   the hardware can display; constraint violations are auto-resolved or shown as a soft warning
   badge, never a blocking dialog.
6. **Everything is undoable.** Deep undo/redo (100+ steps), autosave on every stroke.

## 3. Core concepts (the user-facing model)

The NES's real unit is the 8×8-pixel tile, but games like Zelda and Dragon Quest are built from
**16×16-pixel metatiles** (2×2 hardware tiles + one palette assignment). That's also the natural
"finger-sized" unit for touch. So:

| User word | What it really is | Size |
|---|---|---|
| **Tile** | metatile: 2×2 CHR tiles + palette index | 16×16 px |
| **Screen** | one nametable's visible area | 16×11 tiles (Zelda-style rooms, HUD row reserved) or 16×15 (full screen) |
| **World** | grid of screens | up to 16×8 screens (Zelda overworld size) |

- **Zelda-style games**: the world is the grid itself; the player flips screen-to-screen. This is
  the default mode.
- **Dragon Quest-style games**: the world is one big continuous scrolling map. Same data model —
  a big tile grid — just rendered without screen seams. A mode toggle ("Rooms" vs "Scrolling")
  changes only how the canvas displays seams and how export chunks the data.

### Palettes, made friendly

NES background rules: 4 sub-palettes of 4 colors (first color shared), and every 16×16-px area
uses exactly one sub-palette. Because our base unit *is* 16×16, this becomes simple: **each tile
carries its color set with it**. The user picks colors when defining a tile, not when painting the
map — so painting can never break the rules. Attribute tables fall out of the data for free.

### Tile limits, made visible

A screen can reference at most 256 distinct 8×8 patterns per CHR bank (in practice a metatile set
of up to 64 entries covers Zelda/DQ-class games). The tile drawer shows a subtle "64 / 64" style
budget meter. Hitting the limit is rare in practice and prompts a friendly explanation.

## 4. UI layout (iPad landscape as the reference frame)

```
┌────────────────────────────────────────────────────────────┐
│ ◄ World name        [Rooms|Scroll]        ↶ ↷   ⤓ Export │  top bar (thin)
├──────┬─────────────────────────────────────────────┬───────┤
│ tool │                                             │ tile  │
│ rail │              MAP CANVAS                     │ drawer│
│      │      (current screen, or zoomed-out         │       │
│ ✏️ 🪣 │       world view — pinch to move             │ [🌊][🌲]│
│ ▭ 💧 │       between the two)                      │ [🧱][🌾]│
│ ⌫ ✂️ │                                             │ [🚪][🗿]│
├──────┴─────────────────────────────────────────────┴───────┤
│  ▦ screen mini-map strip (tap to jump between screens)     │  bottom bar
└────────────────────────────────────────────────────────────┘
```

- **Map canvas** — paints the *selected tile* on tap/drag. Pinch to zoom smoothly from
  tile-level detail out to the whole world (semantic zoom: past a threshold you're in "world
  view" and taps select screens instead of painting).
- **Tile drawer (right)** — scrollable grid of the project's tiles, big thumbnails. Tap =
  select brush. Long-press = edit/duplicate/delete. A `+` tile opens the import/creation flow.
- **Tool rail (left)** — Paint, Fill (flood), Rectangle, Eyedropper (pick tile from map),
  Eraser (paints tile 0/"blank"), Select/Stamp (drag-select a region, then stamp copies —
  crucial for laying out repeated structures like tree borders and buildings).
- **Bottom strip** — the world at a glance; the current screen highlighted; tap to jump,
  long-press to copy/paste/clear whole screens; drag to reorder/move screens.
- **Portrait phone layout** — same parts, reflowed: tile drawer becomes a bottom sheet, tool
  rail becomes a compact bottom toolbar. Fully usable, just cozier.

### Touch details

| Gesture | Action |
|---|---|
| 1-finger tap/drag | paint with selected tile |
| 2-finger drag | pan |
| Pinch | zoom (screen ↔ world semantic zoom) |
| Long-press on canvas | eyedropper (pick that tile as brush) |
| Long-press on tile/screen thumbnails | context actions |
| 2-finger tap | undo (3-finger tap = redo) |

## 5. Getting tiles in

Priority order:

1. **Import a PNG tilesheet** (the main path — user said tiles come from elsewhere). Drop/pick a
   PNG; the app overlays a 16×16 grid (adjustable offset/spacing); user taps or drag-selects the
   cells to import. Colors are automatically snapped to the nearest NES palette colors and
   grouped into a 4-color sub-palette (with a simple conflict resolver if a tile uses >4 colors:
   "keep these 4? / edit").
2. **Import from nesprite** — accept nesprite's native export format directly so the two apps
   form a suite: draw tiles in nesprite, lay them out here. *(Format to be confirmed against
   nesprite's code once the repo is linked into a session.)*
3. **Import a `.chr` file** (raw NES pattern data) + palette picker — for people pulling tiles
   from homebrew tooling.
4. **Starter packs** — 2–3 bundled CC0 tile sets (overworld, dungeon, town) so a brand-new user
   can make something in the first 60 seconds without importing anything.
5. **Quick in-app pixel editor** — v2, deliberately minimal (or simply a "open in nesprite"
   handoff link), to avoid rebuilding nesprite inside this app.

## 6. Data model

One JSON document per project (autosaved to IndexedDB, exportable as a file):

```jsonc
{
  "format": "nes-mapmaker/1",
  "name": "Overworld",
  "mode": "rooms",                  // "rooms" | "scrolling"
  "screen": { "w": 16, "h": 11 },   // tiles per screen
  "world":  { "w": 8,  "h": 4 },    // screens in the world
  "palettes": [                     // up to 4 background sub-palettes, NES color indices
    ["0F","29","1A","09"], ...
  ],
  "chr": "base64…",                 // 8×8 pattern data, 16 bytes/tile, deduplicated
  "metatiles": [                    // the user's "tiles"
    { "name": "grass", "chr": [0,1,2,3], "palette": 0,
      "flags": { "solid": false, "water": false, "door": false } },
    ...
  ],
  "map": "base64…"                  // one byte per cell = metatile index, row-major
}
```

Notes:
- **`flags` are the secret weapon** for the "Claude builds a game from this" goal: optional,
  friendly toggles on each tile (Solid / Water / Damage / Door / Stairs / Encounter zone). Non-
  technical users understand "walls are solid"; exporters turn this into collision tables.
- CHR is deduplicated on import so the pattern-table budget is used honestly.
- Screens are just windows onto the one big map array — moving between Rooms and Scrolling modes
  never converts data.

## 7. Export — the "hand it to Claude" story

The Export button produces a single **zip bundle** designed so that dropping it into a Claude
session with the instruction *"build this into an NES game"* just works:

```
mymap-export/
  README.md            ← explains every file, for humans AND for Claude
  map.json             ← the full project file (source of truth)
  map.png              ← full-world image render (for eyeballing/sharing)
  nes/
    tiles.chr          ← pattern table data, ready for an iNES ROM
    palettes.s         ← ca65 .byte tables for the 4 BG palettes
    metatiles.s        ← 4 columns of CHR indices + attribute bits per metatile
    collision.s        ← per-metatile flag bytes (from the friendly flags)
    map_rooms.s        ← per-screen metatile index arrays (rooms mode)
    map_rle.s          ← RLE-compressed variant for PRG-space-conscious builds
```

- The assembly targets **ca65** (the de-facto homebrew standard) with conventional layouts:
  screens as 16×11 (or 16×15) metatile index runs, decompressed to the nametable at screen-load
  time — the same architecture Zelda/DQ actually used, and the one existing NES-building
  tooling/skills already know how to consume.
- `README.md` in the bundle states the format contract explicitly ("metatile = 2×2 tiles,
  top-left/top-right/bottom-left/bottom-right order", etc.) so any LLM or human can consume it
  without guessing.
- Lightweight extras: **Copy as JSON** to clipboard, **PNG only**, for quick sharing.

## 8. Tech stack

Chosen to mirror nesprite's ethos (to be aligned exactly with nesprite's actual stack when the
repo is available in-session):

- **Vanilla TypeScript + HTML Canvas, no framework, no server.** A static site; Vite for dev/build
  only. Keeps the app tiny, fast on older iPads, and trivially hostable (GitHub Pages).
- **Rendering:** one canvas for the map (dirty-rect redraws; a world of 128×88 tiles redraws
  fully in well under a frame anyway), offscreen canvas per metatile as a stamp cache.
- **Persistence:** IndexedDB (projects + autosave journal), `localStorage` for prefs.
- **PWA:** manifest + service worker → offline use, home-screen install, standalone display.
- **Pointer Events** throughout (unifies touch/pencil/mouse), with a small gesture layer for
  pinch/two-finger handling.
- **Zero dependencies at runtime**; `fflate` (or hand-rolled) for zip export is the one
  candidate exception.

## 9. Build phases

**Phase 1 — Paint a world (MVP)**
Rooms mode, fixed 16×11 screens, one starter tile pack, paint/fill/eyedropper/eraser, pinch
zoom + pan, world strip navigation, undo/redo, autosave, PNG + JSON export. *Someone can make a
Zelda-style overworld on an iPad and share a picture of it.*

**Phase 2 — Your own tiles**
PNG tilesheet importer with NES color snapping, palette manager, tile flags (solid/water/door…),
tile budget meter, multiple projects, project file import/export.

**Phase 3 — The Claude bundle**
Full zip export (CHR + ca65 tables + README contract), RLE variant, collision tables,
nesprite-format import, scrolling mode polish (DQ-style seamless view).

**Phase 4 — Delight**
Stamp/selection tool upgrades (copy whole screens between projects), starter packs 2–3,
share-link (URL-encoded small maps), in-app mini tile editor or nesprite handoff, optional NES
emulator preview panel ("walk around your map" with a stock engine ROM).

## 10. Open questions (answerable later, defaults chosen)

1. **nesprite parity** — repo is private and couldn't be read from this session; once it's added
   to a session I'll extract exact colors/typography/layout patterns and its export format.
   Until then this plan assumes: dark chrome, NES-palette accents, pixel font, edge-docked tools.
2. **Screen height default** — 16×11 (Zelda, HUD row) vs 16×15 (full nametable). Default: ask at
   project creation with two labeled pictures ("Zelda-style" / "Full screen"), no numbers shown.
3. **Sprites/objects layer** (enemies, NPCs, chests as placeable markers) — deliberately out of
   MVP; the flags system covers doors/stairs. A v2 "markers" layer would slot cleanly into the
   JSON as a parallel list.
