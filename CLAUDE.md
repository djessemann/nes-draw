# nes-mapmaker — project notes for future sessions

> **Fork provenance:** this repo is the **2.0 line of nesprite**, started from a verbatim copy
> of the app at `djessemann/nesprite` commit `c577e94` (2026-07-12). The original repo is
> preserved untouched as the minimal 1.0 — never push changes there from this project.
> Everything below the "What it is" heading is inherited from nesprite's CLAUDE.md and remains
> accurate for the app as imported; where it says "nesprite" read "this app", and note these
> repo-level differences:
>
> - **Repo:** `djessemann/nes-mapmaker`. Development happens on the session's designated
>   feature branch (see the session instructions), not directly on `main` — unlike nesprite.
> - **GitHub Pages is not set up yet** for this repo (enabling it is an owner action in the
>   GitHub UI; serve from branch root with `.nojekyll`, per the inherited notes below).
> - **Direction:** grow tile mode's arrange view into a multi-screen map editor (Zelda-style
>   worlds, DQ-style overworlds/towns/dungeons) with game-ready exports. The phased roadmap
>   and design decisions live in `PLAN.md` — read it alongside this file.
>
> **2.0 changes shipped so far** (on top of the inherited app below):
>
> - **Multi-screen worlds in arrange.** `state.map` gained `worldW`/`worldH` (1..16, default 1);
>   `w`/`h` are now *cells per screen* (1..32) and `cells` spans the whole world row-major
>   (`totW() = w*worldW` wide). A `screen | world` segmented toggle (`state.mapView`) appears
>   once the world is >1×1: **screen** paints one screen at a time (`state.curScreen`, moved
>   with ◀▶▲▼ buttons / arrow keys / tapping a screen in world view), **world** zooms out to
>   everything and is navigate-only (tools hidden; tap a screen to open it). World view draws
>   3px screen seams + a dashed highlight on the open screen (contrast picked from backdrop
>   luminance). `clear` clears the open screen in screen view; in world view it clears the
>   whole map behind a `confirmModal`. A 1×1 world looks and behaves exactly like 1.0.
> - **Canvas can CSS-downscale** (`max-width:100%; height:auto`) for big world views;
>   `cellFromPoint`/`mapCellFromPoint` correct for it via `canvas.width / rect.width`. The
>   per-pixel fine grid is skipped when `cell < 4`px.
> - **`map` export renders the whole world** at an adaptive scale (≤8, capped near 8192px).
> - **Format compatibility:** still `format: "nes-sprite-editor-v1"`; the tile doc's `map` now
>   carries `worldW`/`worldH` (nesprite 1.0 ignores them and would just reset the arrange grid
>   on such files; 1.0 files load here as a 1×1 world). Do not fork the format id.
> - **Branding: the app is still called "nesprite"** (owner's choice) — title/OG/manifest all
>   say "nesprite — NES graphics maker", descriptors focus on it being a NES graphics maker,
>   and export filenames are `nesprite-…`. Only the *technical* keys differ from 1.0, for
>   same-origin safety (both apps live on the github.io origin): `LS_KEY =
>   "nes-mapmaker-autosave"` — 1.0's key must never be written; `loadLocal()` falls back to
>   reading `nesprite-autosave` once so 1.0 users keep their work — and the SW cache is
>   `nes-mapmaker-vN`. The self-test is `nesMapmakerSelfTest()` (old name kept as an alias).
>   OG/absolute URLs point at `https://djessemann.github.io/nes-mapmaker/`.
> - **Smoke test:** a Playwright script (session scratchpad, not committed) drives boot,
>   self-tests, world resize/paint/nav/clear/undo, autosave round-trip, and 1.0-file loading
>   headlessly against `file://index.html` — rerun the equivalent after UI changes.

**nesprite** is a browser-based NES sprite & animation editor. It is a tiny static web app,
deliberately kept minimal. This file records the delivery/repo/UI decisions so a future
session can stay consistent.

- Live: https://djessemann.github.io/nesprite/
- Repo: `djessemann/nesprite` (default branch `main`)

## What it is

- A **single self-contained static site** — no build step, no dependencies, no framework.
  All HTML/CSS/JS is inline so each page works even from `file://`.
- `index.html` **is** the editor (the homepage). `how-to.html` is a guide linked from it.
- The editor is a pixel editor for NES sprites: 8×8 tile grid, the real 64-color NES master
  palette, 4-color sub-palettes, multi-frame animation, mouse **and** touch drawing.

## Repo layout (keep it minimal)

```
index.html          # the editor (homepage)
how-to.html         # usage guide, linked from the editor header (intro + sprite/tile tabbed guides)
manifest.json       # PWA manifest (installable web app)
sw.js               # service worker — precaches the app shell for full offline use
favicon.png 32, apple-touch-icon.png 180, icon-192.png, icon-512.png
og.png              # 1200x630 social share image
.nojekyll           # serve files as-is (no Jekyll)
README.md
CLAUDE.md           # this file
```

Don't reintroduce folders or extra tooling unless asked. The repo intentionally contains
only the web app + its assets. (Earlier it also explored a C#/dotnes approach — that was
removed; this is a pure sprite editor now.)

## Web app delivery (GitHub Pages)

- Hosted on **GitHub Pages → Deploy from a branch → `main` → `/ (root)`**.
- **`index.html` must live at the repo root.** Pages serves from root; if there is no
  `index.html` there, it renders `README.md` as the page (we hit this bug — that's why the
  app lives at root, not in `/docs`).
- Keep **`.nojekyll`** at the root so PNGs/assets and any underscore paths serve untouched.
- One URL only: `https://djessemann.github.io/nesprite/`. We removed an earlier
  `/sprite-editor/` subpath and a redirect — don't add multiple URLs back.
- **Open Graph / Twitter image URLs must be absolute** (full `https://…/og.png`); social
  scrapers won't accept relative paths. Social platforms cache aggressively — verify with a
  card validator (e.g. opengraph.xyz), not by reloading.
- Pages settings (source branch/folder, enabling Pages, default-branch switching) are **owner
  actions in the GitHub UI** — they can't be done from the session here.

## Offline / PWA (service worker)

- The app is a real **offline-capable PWA**: `manifest.json` makes it installable, and **`sw.js`**
  precaches the app shell so the full editor loads with no network (once installed/visited once).
  A manifest alone does **not** give offline — the service worker is what does it.
- This only works because the app is **100% self-contained** (all HTML/CSS/JS inline, zero
  external scripts/fonts/fetches). Keep it that way; if you ever add an external runtime
  dependency, it must be added to the `ASSETS` precache list in `sw.js` or offline breaks.
- `sw.js` uses **relative paths** so it works at the Pages subpath (`/nesprite/`) and at a root.
  Strategy: cache-first for assets, navigations fall back to cached `index.html` when offline.
- **Bump `CACHE` in `sw.js`** (e.g. `nesprite-v1` → `v2`) whenever you change a cached file, or
  installed users keep the stale version (the SW serves the old cache until the name changes).
- Same no-deps spirit as the rest of the repo — don't pull in Workbox or a PWA build plugin.

## Repo handling / git

- **Develop directly on `main` and push there** (owner's preference for this project).
- Push with `git push -u origin main`; retry with exponential backoff on network errors.
- Commit when a change is complete, with a clear message.
- **Environment limits (Claude Code web/remote):** `git push --delete <branch>` is blocked
  (HTTP 403) and there is no MCP "delete branch" tool. Deleting branches and switching the
  default branch must be done by the owner in the GitHub UI. Don't burn time retrying these.

## UI style

Minimal, high-contrast, retro. Tokens live in each file's `:root`.

- **Dark theme:** black background `#000`, white text + borders `#fff`, **monospace** font
  (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`).
- **No rounded corners anywhere** (`border-radius: 0`).
- **Active/selected = inverted:** white background, black text.
- **Dialogs are in-app, not native:** `confirmModal()` (in `index.html`) shows a styled overlay instead
  of `confirm()` — black box, white border, square corners, `cancel` (outlined) + a primary `.on`
  (inverted) button; Enter = confirm, Esc / backdrop tap = cancel. `promptModal()` is the same overlay
  with a text input (`#modalInput`, 16px font so iOS doesn't zoom on focus); it resolves the typed
  string on ok, `null` on cancel. Use these for any new prompts; don't reintroduce
  `confirm()`/`alert()`/`prompt()`.
- **Exception — the drawing surfaces stay light:** the main canvas, the animation preview,
  and the frame thumbnails use a **white background with a soft light-gray transparency
  checker**, with **dark** on-canvas grid lines. This is intentional so sprites read on a
  light surface. Keep this even though the rest of the UI is dark. (In **tile mode** the canvas
  fills with the slot-0 backdrop, which can be dark; `gridColors()` flips the grid to **light**
  lines when the backdrop luminance is low so it stays visible on black.)
- **Mobile-first:** single column, `max-width: 640px`, centered. The canvas **auto-fits** the
  column width (no manual zoom). Drawing supports both mouse and touch (`touch-action: none`).
- **Palette UI:** a sprite sub-palette has 4 NES entries, but the UI exposes only the **3
  paintable colors** (slots 1–3). Slot 0 is the transparent/backdrop entry — it's hidden from
  the Colors row (it would be redundant with the eraser) and transparency is applied via the
  **eraser** tool. Slot 0 still exists in the data and is exported as the first palette byte.
- **NES master-palette picker:** the raw 64-entry palette has ~10 identical black slots (a PPU
  hue×brightness artifact). Instead of the raw grid, the picker is a curated **13×4 grid**
  (`paletteOrder()` / `GRAY_COL` in `index.html`): a grayscale column (black→white) plus the 12
  hues, each a 4-shade column (dark→pale). This drops the duplicate blacks (one black, `$0F`,
  remains) and a few near-duplicate grays — no gaps, clearer than the raw layout. Picking still
  stores/export the real NES master-palette index; the canvas can still display any index, so
  older projects using a dropped index render fine (just won't highlight in the picker).
- **Sprite vs tile mode:** a `sprite | tile` segmented toggle sits at the **top left of the header**
  (the old `nesprite` wordmark was removed so the toggle can sit flush left). `state.mode` drives it.
  NES sprites and background tiles share the **exact same CHR tile format** (2bpp planar), so the only
  things that change are the semantics around the tile:
  - **sprite:** color 0 = transparent (canvas shows the transparency checker, slot 0 is hidden and
    applied via the eraser); the bottom section is **Frames & animation** (with fps/play/preview).
  - **tile:** color 0 = the drawn **backdrop** ($3F00) — the canvas fills with the slot-0 color, the
    Colors row shows **all 4 slots** (slot 0 tagged `bg`). The **eraser stays the eraser** (same label
    + icon as sprite mode); since color 0 is the backdrop, erasing just paints the backdrop. The bottom
    section becomes a **Tileset** bank (no animation), and the 6502 export labels the palette
    `bg_palette` (slot0 backdrop) instead of `sprite_palette`.
  - **arrange:** in tile mode a `draw | arrange` sub-toggle appears above the canvas. *Draw* is the
    normal per-pixel editor for the selected tile. *Arrange* turns the **same canvas** into a small
    placement grid (`state.map = {w,h,cells}`, default 8×8, each cell a tile/frame index, -1 = empty)
    where the selected tileset entry is the stamp — click/drag to lay tiles down and preview them
    together. Arrange strips the UI to essentials: the Colors picker, the pixel-only tools (fill,
    lasso), **and the flip buttons** are hidden, leaving **place** (pencil) + **erase** (clears a cell
    to -1) plus map-aware `clear`/`undo` (separate `mapUndo` stack). Flipping is intentionally **not**
    in arrange — it's a tile-draw/sprite operation (the `flip ↔/↕` buttons mirror the frame's actual
    pixels), which is also the hardware-honest place for it since real BG tiles can't be PPU-flipped
    (only sprites can, via attribute bits). Map cells are plain tile indices, -1 = empty; `cellTile()`
    masks off any flip bits left in older saves from a brief per-cell-flip experiment. It's a pure
    preview for now (a natural future "export nametable" hook). Sprite art and tile art are **separate
    workspaces** (a character drawn in sprite mode does not appear in tile mode); both are saved — see
    the Project format below.
- **Tools:** pencil / eraser / fill / **lasso** (there was an eyedropper "pick" tool; it was
  replaced by the lasso). The lasso is a freeform select-and-move: trace an outline, the
  non-transparent pixels inside are lifted into a floating selection (`sel` in `index.html`,
  source cleared), drag to move, and it's committed (stamped back) on the next action — tool
  switch, frame change, export/save, undo, etc. all call `commitSelection()`.
- Muted text `#999`; subtle swatch borders `#666` (editor) / `#222` (how-to fills).
- Labels are lowercase and terse (`save`, `load`, `6502`, `png`, `pencil`, …). When you change
  a button label, **update `how-to.html` to match exactly** — it has an intro paragraph plus a
  `sprite mode` / `tile mode` **tab toggle** (deep-linkable via `#sprite` / `#tile`), so put the
  change in the matching mode's guide section.

## Branding / assets

- The mark is a **classic 8-bit heart**: rose red `#E40058` with a single white shine pixel
  cluster, on near-black `#0a0a0a`, **no border/frame**. Used for favicon, app icons, and the
  OG image (a single centered heart). (We tried letter wordmarks and a creature first — heart
  is the chosen direction.)
- Colors come from the **NES master palette** (the 64-entry array is in `index.html`).
- Assets are generated with a **dependency-free pure-Python PNG encoder** (stdlib `zlib` only —
  no PIL/ImageMagick, which may not be installed). To regenerate, run the script below and
  commit the PNGs (filenames are stable, so HTML/manifest need no edits):

```python
# gen-assets.py — regenerates favicon/app icons + og.png (8-bit heart)
import zlib, struct
def canvas(w,h,bg): return bytearray(bg*(w*h))
def setpx(px,w,h,x,y,c):
    if 0<=x<w and 0<=y<h:
        i=(y*w+x)*4; px[i:i+4]=c
def rect(px,w,h,x,y,rw,rh,c):
    for yy in range(y,y+rh):
        for xx in range(x,x+rw): setpx(px,w,h,xx,yy,c)
def rgba(s,a=255):
    s=s.lstrip('#'); return bytes((int(s[0:2],16),int(s[2:4],16),int(s[4:6],16),a))
def write_png(path,px,w,h):
    raw=bytearray()
    for y in range(h):
        raw.append(0); raw+=px[y*w*4:(y+1)*w*4]
    comp=zlib.compress(bytes(raw),9)
    def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    open(path,'wb').write(b'\x89PNG\r\n\x1a\n'
        +chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))
        +chunk(b'IDAT',comp)+chunk(b'IEND',b''))
HEART=[".HH..HH.","HLLHHHHH","HLHHHHHH","HHHHHHHH",".HHHHHH.","..HHHH..","...HH..."]
def heart(px,w,h,ox,oy,s,color):
    cmap={'H':rgba(color),'L':rgba('#FCFCFC')}
    for ry,row in enumerate(HEART):
        for rx,ch in enumerate(row):
            if ch in cmap: rect(px,w,h,ox+rx*s,oy+ry*s,s,s,cmap[ch])
BG=rgba('#0a0a0a'); RED='#E40058'
def icon(size,path):
    s=max(1,int(size*0.74)//8); cw,ch=8*s,7*s
    px=canvas(size,size,BG); heart(px,size,size,(size-cw)//2,(size-ch)//2,s,RED)
    write_png(path,px,size,size)
icon(32,'favicon.png'); icon(180,'apple-touch-icon.png')
icon(192,'icon-192.png'); icon(512,'icon-512.png')
W,H=1200,630; s=48; cw,ch=8*s,7*s
px=canvas(W,H,BG); heart(px,W,H,(W-cw)//2,(H-ch)//2,s,RED); write_png('og.png',px,W,H)
```

## Save / export formats (for interpreting user files)

- **Autosave / persistence:** the working project is auto-saved to `localStorage`
  (`LS_KEY = "nesprite-autosave"`, the same JSON shape as a saved file) on every edit
  (debounced via `scheduleSave()` in `render()`) and flushed on `pagehide`/tab-hide, then
  restored on boot. This exists because a png/gif download can navigate the **installed PWA**
  away, losing in-memory state on return — autosave makes the project persist. The header
  **`new`** button clears it and starts a fresh project (with a confirm). `scheduleSave()`
  skips while a lasso/selection is floating so it never commits the selection mid-drag.
- All four exports download with a unique, sortable timestamped name via `fname(ext)` in
  `index.html` — e.g. `nesprite-20260619-153012.json` — so repeated saves don't collide in one
  folder. (Web pages can't choose a target folder on iOS Safari; that's a browser download setting.)
- **Project naming:** the `save` button first opens a `promptModal()` asking for an optional
  project name (before the browser's download flow). The name is sanitized to filename-safe
  characters (`sanitizeName()`: spaces→dashes, keep `A–Z a–z 0–9 . _ -`, max 40 chars) and slots
  into the file name as the `fname` tag — `nesprite-<name>-20260619-153012.json`; blank keeps the
  plain timestamped name. It's stored as optional top-level `name` in the project JSON (and thus
  the autosave), restored by `loadProject`, and prefills the next save prompt; `new` clears it.
  Cancelling the modal aborts the save. Only the project save asks; the `6502` export reuses
  the remembered name in its file name (no prompt), and the image exports (`png`/`gif`/`map`)
  intentionally stay plain-timestamped (owner's choice).

- **Project** = JSON, `format: "nes-sprite-editor-v1"`. **Sprite and tile art are independent
  workspaces** ("docs") and the file holds **both**: top-level `mode` (active) plus a `sprite` doc
  (`tilesWide/tilesHigh`, `palette`, `fps`, `frames[]`) and a `tile` doc (same minus `fps`, plus the
  arrange `map`). Each `frames[].rows` is row strings of digits `0–3` (sub-palette index per pixel).
  Switching modes swaps the live workspace (`captureDoc`/`applyDoc`/`defaultDoc` in `index.html`); the
  inactive doc is stashed in `state.docs`. Tiles default to 1×1 (8×8), sprites to 2×2. Backward
  compatible: an **older single-document file** (top-level `frames`/`palette`, optional `mode`/`map`)
  loads into its mode with the other mode starting empty (`parseDoc`/`loadProject`).
- **6502** (`.s`) = `sprite_palette` `.byte`s + a `CHARS` segment of CHR tile data, **2bpp
  planar, 16 bytes/tile, row-major per frame** (plane 0 then plane 1, bit 7 = leftmost pixel).
  The file is **self-describing**: the header fully specifies the byte/tile layout, the palette
  block lists each slot's NES color id + role, sprite timing is stated in **60Hz frames per
  animation frame** (what a ROM implements; the gif derives its delay from the same tick count),
  and each frame's pixels are embedded as an ASCII comment grid **generated from the decoded
  bytes** so integration can be verified offline against the file itself. Labels are
  `frame0..N`/`tile0..N` by timeline position, never internal copy names.
- **Export determinism** (keep this invariant): `chrToPx()` exactly inverts `frameToCHRBytes()`,
  and the `.s`/png/gif/map exports all render from the **decoded bytes** via `gatedFrames()` — never
  straight from the editor model — so the gif cannot diverge from the bytes a game ingests. Every
  export runs an encode→decode→pixel-diff **round-trip gate** that blocks the download and names
  frame/tile/row/pixel on any mismatch. `runExportSelfTests()` (runs at boot; `nespriteSelfTest()`
  in devtools) round-trips asymmetric art at every size 1×1..8×8, multi-frame, fully-transparent
  tiles, plus a known-bytes vector pinning the bit layout. When an opaque slot's color equals
  slot 0's, a warning comment is written in the `.s` file only (`paletteClashes()`); the old
  in-app `#palWarn` banner was removed (owner's choice — those pixels are opaque, not transparent).
- **png** = all frames in a horizontal strip (spritesheet), scaled up. **Sprite mode:** transparent
  background. **Tile mode:** filled with the slot-0 backdrop color (tiles draw on the backdrop, not
  transparent).
- **gif** (sprite mode only) = animated GIF89a of all frames (delay = the same 60Hz tick count
  the `.s` TIMING comment documents, converted to centiseconds), transparent
  background, scaled up. Encoded **dependency-free** in `index.html` (`lzwEncode` + `exportGif`): one
  global 4-color table from the sub-palette, slot 0 = transparent index, disposal = restore-to-bg,
  NETSCAPE loop. This is the same no-deps spirit as the Python PNG encoder — don't pull in a GIF
  library. (A gif of static background tiles is pointless, so in tile mode this button is replaced by
  **map**, below.)
- **map** (tile mode only, replaces `gif`) = a PNG of the **arrange layout** — the composed scene,
  stamped from the decoded tiles on the backdrop, named `nesprite-map-…png`. This is the export path
  for the arrange grid (distinct from `png`, which is the individual tiles, and `6502`, which is the
  code). `exportMap` in `index.html`. Note the **arrangement itself is not in the `.s`** — the map
  PNG is the only record of the layout (the future "export nametable" hook would close that gap).
