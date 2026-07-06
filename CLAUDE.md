# CLAUDE.md

Guidance for working in this repository.

## What this is

**DesignIO** — a personal, fully-3D clothing design desktop app (in the spirit of CLO3D / Browzwear).
Design garments (parametric templates or sewn from 2D patterns) on a smooth human mannequin, dress
them in real fabrics with live cloth physics, animate the body, and export the result. Built with
**Electron + Three.js + TypeScript** (bundled by **electron-vite**).

## Commands

```bash
npm install
npm run dev         # launch the desktop app (Vite HMR)
npm run build       # bundle main/preload/renderer into ./out
npm test            # vitest — headless solver/geometry/export math
npm run typecheck   # tsc --noEmit (strict)
npm run snapshot    # render the built app offscreen to docs/preview.png
```

Render an arbitrary state to a PNG (used for verification):
`node scripts/capture.cjs <out.png> <waitMs> "<querystring>"` (run via the local `electron` binary).

## Workflow (follow this)

- Branch off `main` → implement → `npm run typecheck && npm test && npm run build` → push →
  **CI must be green** (`.github/workflows/ci.yml`, Node 20/22) → `gh pr merge --merge` → sync `main`.
- Keep solver/geometry/export **math covered by headless vitest** (`tests/`) — correctness must not
  depend on eyeballing. Confirm visuals with `scripts/capture.cjs` + a deep-link.
- Commit-message co-author trailer and PR footer are added per the harness rules.

## Architecture

Electron: `src/main` (window, native menu, CSP, `dialog:saveFile` IPC), `src/preload` (context bridge),
`src/renderer` (the app).

Renderer modules:
- `core/` — `Viewport` (renderer + camera + OrbitControls + post-processing: bloom, vignette, SMAA),
  `Environment` (IBL, rim lights, reflective floor + shadow-catcher), `Loop` (fixed-timestep).
- `avatar/` — `Mannequin` (poseable **and** resizable capsule skeleton; capsules are the cloth
  colliders — plus **visual-only shaping metaballs** for bust/pecs, deltoids, chest/back depth, knees),
  `BodyMesh` (smooth metaball body via MarchingCubes; shaped head/hand/foot caps), `GlbMannequin`
  (optional realistic-avatar drop-in — replace `assets/mannequin.glb`; the toggle is sticky across the
  async load), `colliders` (capsule math).
- `cloth/` — `XPBDSolver` (grid/tube cloth), `ClothWorld` (general particle+constraint solver for
  sewn panels; seams are stitch constraints), `Garment` (tube builder; `topEdge`/`radiusAt` shaping
  reused by the 2D pattern), `ClothMesh`, `FabricMaterial`, `fabricPresets` (`FabricParams`). Both
  solvers **sleep** (dead-stop) when windless + still, so at default settings garments hang perfectly
  still (any wind/body-move/edit wakes them).
- `fabric/` — `FabricLibrary` (physical + visual fabrics; `fabricToSolverParams` derives drape),
  `weaveTexture` (procedural weave normal maps; pure math is unit-tested).
- `garments/` — **data-driven catalog**: `schema` (`GarmentDefinition` = category + composable pieces +
  supported controls), `registry` (the garments, as data), `factory` (`buildGarment` composes pieces).
  Adding a garment is a data change, not new code.
- `garment/` — `GarmentController` (one garment's multi-piece sim, consumes the factory); `templates`
  (shared `GarmentParams`/types only). `avatar/BodyCollider` uses `three-mesh-bvh` for mesh collision.
- `studio/` — the **multi-garment layer stack**: `document` (`ProjectDoc` = body + scene + serialisable
  garment `layers[]`; `serializeDoc`/`parseDoc` — the `.dio` project + undo/redo snapshots + clipboard;
  `SizeLabel`/`gradeParams` grade a layer's girth by size),
  `GarmentStack` (the live layers: each its own material · fabric · print · `GarmentController`; many
  garments simulate on one mannequin). Adding a garment is `stack.addLayer`; the active layer is edited.
  `projectStore` (the **in-app project library** — localStorage list/save/load/delete/rename of saved
  `ProjectDoc`s + thumbnail; pure parse/upsert/sort helpers are unit-tested).
- `pattern/` — `pattern` (`buildSewnTop`), `PatternController` (sew → drape).
- `export/` — `exporters3d` (glTF/OBJ), `garmentPattern` (**real per-garment flat pattern**: unwraps the
  selected garment's `TubeSpec`s into true 2D panels — bodice front/back with the neckline curve + armhole,
  A-line skirt/dress panels, tapered trouser legs, shaped sleeve — as SVG/DXF), `garmentMetrics` (**live
  production spec**: real chest/waist/hip/length/sleeve/inseam + fabric area + seam length from the same
  construction), `manufacture` (**manufacturing pack**: printable HTML/JSON — spec sheet + fabric BOM +
  embedded flat patterns for the whole outfit), `patternExport` (sewn-pattern SVG/DXF), `techpack`, `save`.
- `start/` — `Homepage` (launcher → New design · **Your projects** · templates), `ProjectsPage` (the
  **project gallery** — open · rename · delete · import/export `.dio`), `StartPage` (the "design your
  piece" builder — garment · colour/print · **neckline/sleeve/size** · quick-looks · surprise/spin ·
  fit; aurora tints to the colour), `PreviewStudio` (live 3D preview; grades size, `setAutoRotate`),
  `design` (`DesignConfig`), `presets` (looks).
- `shell/` — the **professional studio shell** (vanilla; CSS + `split.js` + localStorage): `StudioShell`
  (dockable menu-bar / Library / viewport / dock / status-bar regions), `menuBar` (File: New · Open/Save
  `.dio` project · Exports; Edit: undo/redo · cut/copy/paste/duplicate/delete garment), `statusBar`,
  `library` (tabbed asset browser), `objectBrowser` (the **garment layers** worn on the body — select ·
  visibility · add/duplicate/delete), `centerTabs` (3D · 2D-pattern dual viewport — the **2D pane is an
  editing surface**: size/length/width/hem tools run the same `applyGarmentEdit` path as the 3D panel,
  so 2D↔3D stay in sync), `layoutStore`.
- `ui/` — `panel` (the **context-sensitive Property Editor** — Garment/Avatar/Scene; returns `{panel, api}`
  the Library drives), `controls` (DOM helpers), `thumbnails` (shared swatch/silhouette), `patternSchematic`,
  `tokens.css` / `styles.css` / `shell.css`.
- `main.ts` — `initStudio(config)` builds the shell + a `GarmentStack`, mounts the viewport + Library +
  Object Browser + Property Editor; the panel edits the **active layer** via buffers; owns undo/redo
  (doc snapshots), the garment clipboard, keyboard shortcuts, and `.dio` save/open. Start page first
  (deep-links skip in). Electron: `dialog:saveFile` + `dialog:openFile` IPC.

## Conventions

- TypeScript strict (`noUnusedLocals/Parameters`, `noImplicitAny`). Import three addons from
  `three/examples/jsm/...` (types resolve via `@types/three`; `vite/client` types are referenced in
  `src/renderer/vite-env.d.ts`).
- The cloth solver mutates a flat `Float32Array` that is **shared** with the render geometry
  (zero-copy). Colliders are mutated **in place** so garments react to a moving/resized body.
- Match the surrounding code's style; keep new code covered by a test where there's real logic.

## Snapshot deep-links (query string)

`?start=0` skip start page · `?garment=<id>` (registry id — dress, gown, jumpsuit, wide-leg, …; applies
its defaults) · `?fabric=<id>` · `?mode=pattern` · `?anim=idle|walk|turn` · `?bodyType=female|male` ·
`?bodyH=<s>&bodyB=<s>&bodyBust=<s>&bodyWaist=<s>&bodyHips=<s>` (mannequin size/shape) · `?text=<print>` ·
`?view=pattern` (open the 2D flat-pattern tab) · `?body=mesh|glb` (procedural vs realistic-GLB avatar) ·
`?layers=<id>,<id>` (layer extra garments on the body — a layered outfit) ·
`?closeup=1` (macro camera) · `?still=1` (freeze the start-page turntable) · `?page=start` (deep-link the
builder) · `?page=projects[&demo]` (the Projects gallery; `demo` seeds a few looks). Entry is the homepage
launcher → start page / Projects → studio. Regenerate docs with `npm run capture`.
