# NES Map Maker — Product & Technical Plan

A touch-first web app for laying out NES game maps (Zelda-, Dragon Quest-style) from NES
graphics tiles — the world-building companion to [nesprite](https://github.com/djessemann/nesprite),
sharing its visual language, its no-dependency single-file architecture, and its export
philosophy — and able to export data that Claude (or any developer/tool) can turn directly
into a working NES game.

This plan is grounded in the actual nesprite source (`index.html`, `CLAUDE.md` @ main). Where
this app inherits a nesprite convention, that's stated explicitly.

---

> **Decision (2026-07-19): build as nesprite 2.0, in this repo.** Rather than a separate
> companion app, this repo now contains a verbatim copy of nesprite (from commit `c577e94`)
> and the map maker is built by **extending tile mode's arrange view** — same saved session,
> same app, no file juggling between tools. The original nesprite repo stays frozen as the
> minimal 1.0. Consequences for this plan: the UI sections below describe the *target*
> experience, reached by evolving the existing arrange view (a `screen | world` zoom toggle,
> screens/world model, per-tile palettes) rather than building from scratch; §8's repo layout
> is already in place via the copy; sprite mode and tile-draw view stay untouched, and
> single-screen arrange remains the default so the app never feels heavier than 1.0.

---

## 1. Vision

**"Draw a world like you'd doodle on graph paper. Get back something a real NES game can use."**

The user never needs to know what a nametable, attribute table, or CHR bank is. They see:

- **Tiles** — little 16×16-pixel pictures (grass, water, brick, tree…)
- **Screens** — one TV-screen's worth of map
- **Worlds** — screens connected in a grid, like the Zelda overworld map

Everything hard about the NES (8×8 hardware tiles, palette-per-16×16-area color rules, data
formats) is handled invisibly, surfaced only as gentle guardrails.

nesprite already contains the seed of this: tile mode's **arrange** view stamps tiles into a
small grid, and its own docs call a future "export nametable" hook the natural next step. This
app is that next step grown into a full product — worlds instead of one grid, metatiles with
palettes and flags, and game-ready exports — while nesprite remains the place where individual
tiles are drawn.

## 2. Design principles (nesprite's, verbatim where possible)

1. **Single self-contained static site.** One `index.html` that *is* the app — all HTML/CSS/JS
   inline, works from `file://`, no build step, no framework, **zero runtime dependencies**.
   nesprite hand-rolls even its GIF encoder rather than take a dependency; this app does the
   same (see §8 on the zip export).
2. **Touch is a first-class input.** Mouse and touch drawing (`touch-action: none`), finger-sized
   targets, 16px inputs so iOS doesn't zoom on focus, installable PWA with full offline
   (manifest + `sw.js` precache, cache-first, bump the cache name on every deploy).
3. **The nesprite look, exactly.** Tokens and rules from its `:root` / CLAUDE.md:
   - black `#000` background, white `#fff` text and 1px borders, muted `#999`, soft `#666`
   - `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`, 14px/1.45
   - **no rounded corners anywhere**; active/selected = **inverted** (white bg, black text)
   - lowercase terse labels (`save`, `load`, `6502`, `png`); section headers 11px uppercase
     letter-spaced muted
   - in-app `confirmModal()` / `promptModal()` overlays — never native `confirm()`/`alert()`
   - segmented toggles built from adjacent 1px-bordered buttons
   - drawing surfaces stay light (transparency checker) with luminance-adaptive grid lines
4. **No accounts, no cloud.** `localStorage` autosave on every edit (debounced in `render()`,
   flushed on `pagehide`), restored on boot — same pattern and rationale as nesprite (a download
   can navigate the installed PWA away; autosave makes state survive).
5. **Impossible states are prevented, not error-messaged.** The editor only lets you place what
   the hardware can display.
6. **Everything is undoable** (bounded undo stacks per surface, à la nesprite's 40-step stacks).
7. **Exports are trustworthy.** nesprite's invariant, inherited wholesale: every export renders
   from the **decoded bytes**, never straight from the editor model, and an encode→decode
   round-trip gate blocks any download that doesn't survive intact. Self-tests run at boot.

## 3. Core concepts (the user-facing model)

The NES's real unit is the 8×8-pixel tile, but Zelda/DQ-class games are built from **16×16
metatiles** (2×2 hardware tiles + one palette assignment). That's also the natural finger-sized
unit for touch. So:

| User word | What it really is | Size |
|---|---|---|
| **Tile** | metatile: 2×2 CHR tiles + sub-palette index | 16×16 px |
| **Screen** | one nametable's visible area | 16×11 tiles (Zelda-style, HUD row reserved) or 16×15 (full screen) |
| **World** | grid of screens | up to 16×8 screens (Zelda overworld size) |

- **Zelda-style games**: the world is the grid itself; the player flips screen-to-screen.
  Default mode.
- **Dragon Quest-style games**: one big continuous scrolling map. Same data model — a big tile
  grid — just rendered without screen seams. A `rooms | scroll` segmented toggle (styled like
  nesprite's `sprite | tile` toggle) changes only seam display and export chunking.

### Palettes, made friendly

NES background rules: 4 sub-palettes of 4 colors (first color shared), every 16×16-px area uses
exactly one sub-palette. Because our base unit *is* 16×16, **each tile carries its color set
with it** — the user picks colors when defining a tile, not when painting the map, so painting
can never break the rules. Attribute tables fall out of the data for free.

Color picking reuses nesprite's exact machinery: the 64-entry `NES_PALETTE` array and the
curated **13×4 picker** (`paletteOrder()`/`GRAY_COL` — grayscale column + 12 hue columns,
duplicate blacks dropped, real master-palette indices stored).

### Tile limits, made visible

A background bank holds 256 8×8 patterns → a metatile set of up to 64 entries (Zelda/DQ-class
budget). The tile drawer shows a quiet `12/64` counter in muted text. CHR patterns are
deduplicated on import so the budget is honest.

## 4. UI layout — nesprite's column, extended

nesprite is a mobile-first **single scrolling column** (max-width 640px, centered): sticky
header, canvas stage, then stacked sections. On desktop ≥1100px it becomes a two-column grid
(canvas sticky left, controls right) via `display: contents` wrappers. This app keeps that
skeleton exactly — familiar to anyone coming from nesprite, and proven on iPhone/iPad:

```
┌──────────────────────────────────────┐
│ [rooms|scroll]      new | how to     │  sticky header (segmented toggle flush left)
├──────────────────────────────────────┤
│                                      │
│            MAP CANVAS                │  current screen; pinch = zoom out to
│     (auto-fits column width)         │  world view, two-finger drag = pan
│                                      │
│  ▦▦▦▦▦▦▦▦  ← world strip             │  screen thumbnails, tap to jump
├──────────────────────────────────────┤
│ TOOLS                                │  paint · fill · rect · pick · erase · stamp
│ TILES                                │  the metatile drawer (tap = brush,
│                                      │   long-press = edit/duplicate/delete, +)
│ SCREENS                              │  copy/paste/clear screen, world size
│ SAVE / EXPORT                        │  save · load · png · claude · 6502
└──────────────────────────────────────┘
```

- **Map canvas** — paints the selected tile on tap/drag (same pointer plumbing as nesprite's
  arrange view: `mapCellFromPoint` → stamp, drag to paint runs). Auto-fits the column width like
  nesprite's `fitCanvas()`; unlike an 8×8 sprite, a 16×11 screen at column width is already
  finger-paintable, so **zoom is only needed to go *out*** (semantic zoom to world view), not in.
- **World strip** — horizontal scroll of screen thumbnails directly under the canvas (the same
  pattern as nesprite's frames strip — `flex`, `overflow-x: auto`, active = inverted box-shadow
  ring). Tap to jump; the strip doubles as the world overview in rooms mode.
- **Tiles section** — a grid of metatile thumbnails, visually identical to nesprite's tileset
  strip. Tap = select brush; long-press = context (edit colors/flags, duplicate, delete);
  a `+ tile` button opens the import flow.
- **Tools** — nesprite's `.tools` button grid (icon over lowercase label): `paint`, `fill`,
  `rect`, `pick` (eyedropper), `erase`, `stamp` (select a region, stamp copies — for tree
  borders, buildings). Fill and rect operate in tile units, so they're cheap and predictable.
- **how-to.html** — companion guide page like nesprite's, linked from the header, with a
  tabbed `rooms | scroll` structure mirroring the app's modes. nesprite rule inherited: when a
  button label changes, the how-to must be updated to match exactly.

### Touch details

| Gesture | Action |
|---|---|
| 1-finger tap/drag | paint with selected tile |
| Pinch out/in | screen ↔ world semantic zoom |
| 2-finger drag | pan (world view / scroll mode) |
| Long-press canvas | pick (eyedropper) that tile as brush |
| Long-press thumbnails | context actions |

(nesprite's canvas already runs `touch-action: none` with manual touch handlers; this app adds
a small two-pointer gesture layer on top of the same plumbing.)

## 5. Getting tiles in

1. **Import from nesprite** — the headline path, now a concrete spec: read a
   `nes-sprite-editor-v1` project JSON, take the **tile doc** (`frames[]` of `rows` digit
   strings `0–3`, its `palette` of NES master indices), and turn each 8×8 tile (or 2×2 group)
   into a metatile. Draw tiles in nesprite → lay out worlds here. The two apps become a suite.
2. **Import a PNG tilesheet** (tiles from elsewhere, per the product goal). Drop/pick a PNG;
   the app overlays a 16×16 grid (adjustable offset/spacing); tap or drag-select cells to
   import. Colors snap to nearest `NES_PALETTE` entries and group into a 4-color sub-palette,
   with a simple resolver when a tile exceeds 4 colors.
3. **Import a `.chr` file** (raw 2bpp planar pattern data, 16 bytes/tile — the same layout
   nesprite's 6502 export documents) + palette picker.
4. **Starter packs** — 2–3 bundled CC0 tile sets (overworld, dungeon, town) inlined as data so
   a brand-new user makes something in the first 60 seconds, offline included.
5. **Quick edits** — v2: "open in nesprite" handoff rather than rebuilding a pixel editor here.

## 6. Data model

One JSON document, `format: "nes-mapmaker-v1"`, autosaved to `localStorage` (nesprite pattern:
same shape as the saved file, `LS_KEY`, debounced `scheduleSave()` in `render()`, flush on
`pagehide`):

```jsonc
{
  "format": "nes-mapmaker-v1",
  "name": "overworld",              // optional, promptModal() on save, sanitized like nesprite
  "mode": "rooms",                  // "rooms" | "scroll"
  "screen": { "w": 16, "h": 11 },   // tiles per screen
  "world":  { "w": 8,  "h": 4 },    // screens in the world
  "palettes": [[15,41,26,9], ...],  // up to 4 BG sub-palettes, NES master indices
  "chr": ["0f0f...", ...],          // 8×8 patterns, 16 bytes/tile hex, deduplicated
  "tiles": [                        // the user's metatiles
    { "name": "grass", "chr": [0,1,2,3], "pal": 0,
      "flags": { "solid": false, "water": false, "door": false } },
    ...
  ],
  "map": "AAECAQ…"                  // base64, one byte per cell = tile index, row-major
}
```

- **`flags` are the secret weapon** for the "Claude builds a game" goal: friendly per-tile
  toggles (solid / water / damage / door / stairs / encounter). Non-technical users understand
  "walls are solid"; exporters turn this into collision tables.
- Screens are windows onto the one big map array — switching rooms ↔ scroll never converts data.
- Save/load follows nesprite exactly: timestamped filenames via `fname()`
  (`nes-mapmaker-<name>-20260718-153012.json`), name prompt on `save` only, `new` clears with a
  `confirmModal()`.

## 7. Export — the "hand it to Claude" story

Buttons (lowercase, nesprite-style): `save` `load` · `png` `claude` `6502`.

- **`png`** — full-world image render for eyeballing/sharing (plain timestamped name, like
  nesprite's image exports).
- **`6502`** — a single self-describing `.s` in nesprite's export style: a header that fully
  specifies every byte layout, palette blocks listing each slot's NES color id + role, and
  ASCII comment grids **generated from the decoded bytes** so it can be verified offline.
  Contains: CHR pattern data, `bg_palettes`, metatile table (4 CHR indices + attribute bits per
  tile), collision flag bytes, and per-screen metatile index runs (plus an RLE variant for
  PRG-conscious builds) — the same decompress-at-screen-load architecture Zelda/DQ actually used.
- **`claude`** — the full bundle as a **zip**: `README.md` (the format contract, written for
  humans and LLMs — "metatile = 2×2 tiles, TL/TR/BL/BR order", etc.), `map.json`, `map.png`,
  `tiles.chr`, and the `.s` files split by concern. Dropping the zip into a Claude session with
  "build this into an NES game" should just work.
  *No-dependency rule respected:* a STORE-only (uncompressed) zip writer is ~60 lines of plain
  JS (local headers + CRC32 + central directory) — hand-rolled like nesprite's GIF encoder, no
  fflate.
- **Export determinism, inherited:** all three render from decoded bytes; every export runs the
  encode→decode→diff round-trip gate; self-tests at boot (`runExportSelfTests()` equivalent,
  callable from devtools).

## 8. Tech stack & repo layout

Confirmed against nesprite (not assumed): **vanilla JS, single inline-everything `index.html`,
no build step, no framework, zero dependencies, GitHub Pages from branch root, `.nojekyll`.**

```
index.html          # the editor (homepage) — the entire app
how-to.html         # usage guide, rooms|scroll tabs, linked from header
manifest.json       # PWA manifest
sw.js               # service worker — precache app shell, cache-first, bump CACHE per release
favicon.png / apple-touch-icon.png / icon-192.png / icon-512.png / og.png
.nojekyll
README.md
CLAUDE.md           # project decisions log, nesprite-style
```

- Rendering: one `<canvas>`, `image-rendering: pixelated`, offscreen canvas per metatile as a
  stamp cache; a full 128×88-tile world redraws in well under a frame.
- Branding: a sibling of nesprite's 8-bit heart (rose `#E40058` on `#0a0a0a`, single white
  shine, no frame) — e.g. an 8-bit **map/compass** in the same drawing style; assets generated
  with the same stdlib-only Python PNG script pattern from nesprite's CLAUDE.md.
- Hosting: GitHub Pages, one URL, absolute OG image URLs (nesprite's hard-won rules).

## 9. Build phases

**Phase 1 — Paint a world (MVP)**
Rooms mode, 16×11 screens, one starter tile pack, paint/fill/pick/erase, world strip, semantic
zoom + pan, undo/redo, localStorage autosave, `save`/`load`/`png`. *Someone makes a Zelda-style
overworld on an iPad and shares a picture of it.*

**Phase 2 — Your own tiles**
nesprite JSON import, PNG tilesheet importer with NES color snapping, palette manager, tile
flags, tile budget counter, `.chr` import, how-to.html.

**Phase 3 — The Claude bundle**
`6502` export with round-trip gate + boot self-tests, `claude` zip export (hand-rolled STORE
zip), RLE screens, collision tables, scroll mode polish, rect + stamp tools.

**Phase 4 — Delight**
Copy screens between projects, starter packs 2–3, share-link for small maps, "open in nesprite"
handoff, optional emulator preview ("walk around your map" with a stock engine ROM).

## 10. Open decisions (defaults chosen, easy to change)

1. **Screen height** — 16×11 (Zelda, HUD row) vs 16×15 (full nametable). Default: ask at
   project creation with two labeled pictures ("zelda-style" / "full screen"), no numbers.
2. **Sprites/objects layer** (enemies, NPCs, chests as markers) — out of MVP; flags cover
   doors/stairs. A v2 `markers` list slots cleanly into the JSON.
3. **Repo workflow** — nesprite develops directly on `main`; this repo currently works on a
   feature branch per session instructions. Worth deciding before Pages setup (Pages will serve
   from `main` root, nesprite-style).
