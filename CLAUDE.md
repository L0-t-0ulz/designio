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
  colliders — plus **visual-only shaping metaballs** for bust/pecs, deltoids, chest/back depth, knees; it
  exposes `anchors()` = torso/hip world frames garments pin to, and drives the GLB), `BodyMesh` (smooth
  metaball body via MarchingCubes; shaped head/hand/foot caps), `GlbMannequin` (the **default** realistic
  avatar — replace `assets/mannequin.glb`; renders its own skin when textured, else the **warm skin
  material** (`avatar/skin.ts` — `makeSkinMaterial`: skin tone + warm subsurface sheen, shared with the
  procedural body), and **falls back** to the procedural body; plays the rig's **idle/walk** clips **in
  place**, and the mannequin fits the capsules to its Mixamo bones each frame so cloth collides with the
  moving body), `colliders` (capsule math), `measure` (**made-to-measure**: pure `bodyToMeasurements`/
  `setMeasurement` map real cm ↔ the body-param multipliers, + `parseSizeChart`/`applySizeRow` for a
  size-chart importer — unit-tested), `poses` (**lookbook pose library** — `setPose` freezes a real GLB
  idle/walk clip frame / a procedural stance; garments re-settle). `?body=mesh` forces the procedural body.
- `cloth/` — `XPBDSolver` (grid/tube cloth; pinned particles can **follow a moving body anchor** —
  `bindPins`/`setAnchor` — so garments stay on the animated avatar; per-fabric **aerodynamic drag** —
  `FabricParams.aero` removes the broadside/normal velocity so light+sheer fabrics billow/float/lag and
  heavy ones follow near-rigid — **4D secondary motion**; **per-panel physics** — each particle/constraint
  is tagged front/back by column (matching `finishTube`), so `setPanelFabric(front, back)` drapes the two
  halves with their own stiffness + mass), `ClothCollision` (a global **spatial-hash
  particle repulsion** run by `GarmentStack.step` after the solvers — keeps every visible garment particle
  a thickness apart, skipping same-piece grid-adjacent pairs, so layered garments push off each other +
  a garment doesn't pass through itself), `ClothWorld` (general particle+constraint solver
  for sewn panels; seams are stitch constraints), `Garment` (tube builder; `topEdge`/`radiusAt` shaping
  reused by the 2D pattern), `ClothMesh`, `FabricMaterial`, `fabricPresets` (`FabricParams`). Both
  solvers **sleep** (dead-stop) when windless + still, so at default settings garments hang perfectly
  still (any wind/body-move/edit wakes them).
- `fabric/` — `FabricLibrary` (physical + visual fabrics; `fabricToSolverParams` derives drape),
  `weaveTexture` (procedural weave normal maps; pure math is unit-tested), `textile` (repeating textile
  **patterns** — stripe/plaid/check/gingham/polka/camo; pure `textileValue` tonal field is unit-tested +
  `paintTextile` tiles it across the albedo), `swatch` (**import a fabric photo → seamless tiling PBR**:
  pure `makeSeamless`/`normalFromLuma`/`estimateRoughness` pixel math is unit-tested; `buildSwatchTextures`
  bakes an albedo + derived normal + roughness that clothe the whole garment), `sparkle` (**sequins /
  beading / metallic foil** eveningwear finishes — pure `sparkleNormal` facet field + `sparkleParams`
  metallic recipe are unit-tested; `makeSparkleNormalMap` bakes the tiling glint normal map), `quilt`
  (**channel / diamond / box quilting** — pure `quiltHeight` pillow-loft field + `quiltNormal` are
  unit-tested; `makeQuiltNormalMap` bakes the tiling loft normal map for puffers/jackets), `namedColors`
  (a curated **named textile colour library** — `TR-####` production refs; pure `nearestNamedColor`/
  `colorRefLabel` map any picked hue to its closest reference, shown in the panel + the tech-pack BOM).
- `garments/` — **data-driven catalog**: `schema` (`GarmentDefinition` = category + composable pieces +
  `ConstructionCaps` — neckline/sleeve/length/ease/flare + **collar/cuff/pleats/dart/pocket/hem** detail),
  `registry` (the garments, as data), `factory` (`buildGarment` composes pieces; construction detail is
  folded into the tube/sleeve specs so the 3D silhouette + the 2D pattern both reflect it), `decor`
  (`pocketPlacements` — pure patch-pocket positions; the stack renders them as non-sim patch meshes).
  Adding a garment or a supported detail is a data change, not new code.
- `garment/` — `GarmentController` (one garment's multi-piece sim, consumes the factory; **binds each
  piece to body anchors** — a top to the torso, a skirt/trouser to the hips, a **sleeve to its arm (+ elbow
  to the forearm)** — via the solver's pin groups, so each follows that part of the animated body); `templates`
  (shared `GarmentParams`/types only). `avatar/BodyCollider` uses `three-mesh-bvh` for mesh collision.
- `studio/` — the **multi-garment layer stack**: `document` (`ProjectDoc` = body + scene + serialisable
  garment `layers[]`; `serializeDoc`/`parseDoc` — the `.dio` project + undo/redo snapshots + clipboard;
  `SizeLabel`/`gradeParams` grade a layer's girth by size; **`Colorway`** + `captureColorway`/`applyColorway`
  save & apply appearance-only colour/fabric variants of a design),
  `GarmentStack` (the live layers: each its own materials · fabric · print · `GarmentController`; many
  garments simulate on one mannequin). **Per-part fabric**: a material per part (body / sleeves / legs)
  assigned to each piece mesh by name, + a **trim** material with contrast decor bands (hem/neckline) and
  trim-coloured pockets — `stack.setPart(part, {fabricId?, color?})`. **Per-panel fabric**: each tube
  splits into **front (+z) / back (−z)** geometry groups (`finishTube`), so the body/leg mesh takes a
  `[front, back]` material array when its `back`/`legBack` panel has its own fabric (visual only —
  `panelFabricId` falls back back→body, legBack→legs→body). Adding a garment is `stack.addLayer`.
  `projectStore` (the **in-app project library** — localStorage list/save/load/delete/rename of saved
  `ProjectDoc`s + thumbnail; pure parse/upsert/sort helpers are unit-tested).
- `pattern/` — `pattern` (`buildSewnTop`), `PatternController` (sew → drape).
- `export/` — `exporters3d` (glTF/OBJ), `garmentPattern` (**real per-garment flat pattern**: unwraps the
  selected garment's `TubeSpec`s into true 2D panels — bodice front/back with the neckline curve + armhole,
  A-line skirt/dress panels, tapered trouser legs, shaped sleeve — as SVG/DXF; pure `placePrints` maps
  placed logos/text onto their panel to scale — a dashed placement box + label in SVG, a PRINT layer in
  DXF), `garmentMetrics` (**live
  production spec**: real chest/waist/hip/length/sleeve/inseam + fabric area + seam length from the same
  construction), `manufacture` (**manufacturing pack**: printable HTML/JSON — spec sheet + fabric BOM +
  embedded flat patterns for the whole outfit), `patternExport` (sewn-pattern SVG/DXF), `techpack`, `save`.
- `start/` — `Homepage` (launcher → New design · **Your projects** · templates), `ProjectsPage` (the
  **project gallery** — open · rename · delete · import/export `.dio`), `StartPage` (the "design your
  piece" builder — garment · colour/print · **neckline/sleeve/size** · quick-looks · surprise/spin ·
  fit; aurora tints to the colour), `PreviewStudio` (live 3D preview; grades size, `setAutoRotate`),
  `design` (`DesignConfig` + **`Print[]`** — multiple placed logos/text with x/y/scale/rotation + a
  **`part`** (body/sleeves/legs) each sits on + a **`style`** (flat · raised **embroidery** · **appliqué**
  patch), + an optional **`textile`** pattern tiled behind them; `buildDesignArt` layers them onto the
  albedo + paints a **bump relief** for raised motifs — the stack builds one design map **per part**),
  `presets` (looks).
- `shell/` — the **professional studio shell** (vanilla; CSS + `split.js` + localStorage): `StudioShell`
  (dockable menu-bar / Library / viewport / dock / status-bar regions), `menuBar` (File: New · Open/Save
  `.dio` project · Exports; Edit: undo/redo · cut/copy/paste/duplicate/delete garment), `statusBar`,
  `library` (tabbed asset browser), `objectBrowser` (the **garment layers** worn on the body — select ·
  visibility · add/duplicate/delete), `centerTabs` (3D · 2D-pattern dual viewport + a **persistent
  quick-edit toolbar over both** — size/neckline/sleeve/length/width/hem `PatternEditor` steppers that run
  the same `applyGarmentEdit` path, so 2D↔3D stay in sync), `layoutStore`.
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
its defaults) · `?fabric=<id>` · `?mode=pattern` · `?anim=idle|walk|turn` · `?pose=stand|weight-shift|stride|relaxed`
(a static lookbook pose) · `?bodyType=female|male` ·
`?bodyH=<s>&bodyB=<s>&bodyBust=<s>&bodyWaist=<s>&bodyHips=<s>` (mannequin size/shape) · `?text=<print>`
(+ `?textX=<0..1>&textY=<0..1>` to place it; `x≈0.25` front, `0.75` back — back prints render on a
back-fabric panel) · `?textile=<stripe|plaid|check|gingham|polka|camo>` (a repeating pattern tiled across
the garment, behind the prints) · `?swatch=demo` (import-a-fabric-photo → tiling PBR, exercised with a
procedural swatch) · `?sparkle=<sequins|beading|foil>` (an eveningwear sparkle finish) ·
`?quilt=<channel|diamond|box>` (a quilted-loft finish) · `?prints=demo`
(two body prints) · `?prints=parts` (a print on the body + sleeves + legs — each print sits on its own
piece) · `?prints=embroidery` / `?prints=applique` (a raised embroidered / appliqué motif) ·
`?view=pattern` (open the 2D flat-pattern tab) · `?view=render` (open the Render tab — supersampled still) · `?body=mesh|glb` (GLB realistic avatar is the default; `mesh` forces the procedural body) ·
`?layers=<id>,<id>` (layer extra garments) · `?collar/cuff/pleats/dart/pocket/hem/closure=1` (construction detail; `closure` = front placket/zip) ·
`?trim=1&trimColor=<hex>` · `?sleeveFabric=<id>` · `?legFabric=<id>` (per-part fabric) ·
`?backFabric=<id>` · `?legBackFabric=<id>` (per-panel fabric — the body/leg **back** panel) ·
`?closeup=1` (macro camera) · `?still=1` (freeze the start-page turntable) · `?page=start` (deep-link the
builder) · `?page=projects[&demo]` (the Projects gallery; `demo` seeds a few looks). Entry is the homepage
launcher → start page / Projects → studio. Regenerate docs with `npm run capture`.
