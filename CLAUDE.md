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
- `core/` — `Viewport` (renderer + camera + OrbitControls + post-processing: **GTAO ambient occlusion**
  (grounds the figure + darkens contact/fold areas), bloom, vignette, SMAA + an optional **depth of field**
  (`BokehPass`, off by default, `setDepthOfField` focuses on the subject); **selectable tone-mapping**
  via `setToneMapping` + pure `tonemap.toneMappingMode` — ACES · AgX · Neutral · Filmic · Reinhard;
  `getCameraPose`/`setCameraPose` back **camera bookmarks** (`studio/cameraBookmarks` + `ui/cameraBookmarksPanel`)),
  `Environment` (IBL, key + rim rig, reflective floor + shadow-catcher; returns an `EnvironmentHandle`
  with `setLighting`/`setBackdrop` driven by `studioPresets` — **studio lighting presets** (Studio ·
  Softbox · Dramatic · High-key · Runway · Golden-hour: each an azimuth/elevation-described key + rims +
  hemi + exposure, positioned by the pure, unit-tested `lampPosition`) + **backdrop presets** (Studio grey ·
  White · Charcoal · Black · Blush · Sky cyclorama gradients, baked per-pixel with `bayerDither` so the sweep
  doesn't 8-bit band; `black` hides the stage floor for a floating shot)), `Loop` (fixed-timestep).
- `avatar/` — `Mannequin` (poseable **and** resizable capsule skeleton; capsules are the cloth
  colliders — plus **visual-only shaping metaballs** for bust/pecs, deltoids, chest/back depth, knees; it
  exposes `anchors()` = torso/hip world frames garments pin to, and drives the GLB), `BodyMesh` (smooth
  metaball body via MarchingCubes; shaped head/hand/foot caps), `GlbMannequin` (the **default** realistic
  avatar — replace `assets/mannequin.glb`; renders its own skin when textured, else the **warm skin
  material** (`avatar/skin.ts` — `makeSkinMaterial`: skin tone + warm subsurface sheen, shared with the
  procedural body; a **complexion picker** — `skinLook(tone, undertone)` maps 8 skin tones (fair→deep) ×
  warm/neutral/cool undertones to a shared-material look, pure + unit-tested, applied via
  `mannequin.setSkinTone`), and **falls back** to the procedural body; plays the rig's **idle/walk** clips **in
  place**, and the mannequin fits the capsules to its Mixamo bones each frame so cloth collides with the
  moving body), `colliders` (capsule math), `measure` (**made-to-measure**: pure `bodyToMeasurements`/
  `setMeasurement` map real cm ↔ the body-param multipliers, + `parseSizeChart`/`applySizeRow` for a
  size-chart importer — unit-tested), `poses` (**lookbook pose library** — `setPose` freezes a real GLB
  idle/walk clip frame / a procedural stance; garments re-settle), `bodyPresets` (**body-shape presets** —
  Runway/Curvy/Plus/Athletic/Petite/Tall shape-multiplier sets, in-range so colliders stay valid; pure
  `applyBodyPreset` is unit-tested), `accessories` (**shoes · belt · hat · bag + headwear & neckwear**
  — beanie · cap · bucket hat · balaclava (ski mask) · scarf · neck gaiter; pure `accessoryAnchors(colliders)`
  (now also exposes the head-frame basis + neck ring) + an `Accessories` group whose rigid meshes re-attach
  to the live body each frame — head/neck pieces ride the animated head frame; unit-tested), `face`
  (**face & hair customization** — a procedural `FaceRig` of hair styles
  (none/short/bob/long/afro) + a hair-colour material + subtle toggleable face features (brows/eyes/lips),
  all authored in a unit head frame and placed by the pure, unit-tested `headFrame(colliders)` so they
  ride the live head like the accessories; default **none** so the clean avatar is unchanged; best fit on
  the procedural body). `?body=mesh` forces the procedural body.
- `cloth/` — `XPBDSolver` (grid/tube cloth; pinned particles can **follow a moving body anchor** —
  `bindPins`/`setAnchor` — so garments stay on the animated avatar; per-fabric **aerodynamic drag** —
  `FabricParams.aero` removes the broadside/normal velocity so light+sheer fabrics billow/float/lag and
  heavy ones follow near-rigid — **4D secondary motion**; **trapped-air pressure** — `solver.pressure` adds
  an outward acceleration along each particle's surface normal (capped by the stretch constraints, so it's
  stable) so a quilted garment inflates into a **puffer** that stands off the body (opt-in, wired from the
  quilt finish); **weighted hems** — `hemWeight` ramps the bottom rows heavier (pure `hemMassScale`) so a
  gown/skirt hem hangs plumb like a couture chain-weight (pinned cuffs ignore it); **body friction / cling** —
  the mesh-accurate `solveBody` damps tangential slide by the fabric's friction so a grippy knit clings to the
  true body while satin slides; **per-panel physics** — each particle/constraint
  is tagged front/back by column (matching `finishTube`), so `setPanelFabric(front, back)` drapes the two
  halves with their own stiffness + mass), `ClothCollision` (a global **spatial-hash
  particle repulsion** run by `GarmentStack.step` after the solvers — keeps every visible garment particle
  a thickness apart, skipping same-piece grid-adjacent pairs, so layered garments push off each other +
  a garment doesn't pass through itself), `ClothWorld` (general particle+constraint solver
  for sewn panels; seams are stitch constraints), `Garment` (tube builder; `topEdge`/`radiusAt` shaping
  reused by the 2D pattern; `tubeRingT`/`axisTubeRingT` place the rings via `adaptiveMesh`), `adaptiveMesh`
  (**adaptive remeshing** — pure `adaptiveRingT` spreads a tube's fixed ring budget **non-uniformly**,
  packing rings where the silhouette *bends* (waist cinch · flare onset · puff-sleeve bell · neckline) and
  leaving straight runs uniform, so folds resolve where they nucleate at no extra particle cost; the density
  is curvature-driven + clamped so no rest length degenerates; rest lengths are measured from the geometry
  so the solver needs no change, and the ring-t also drives the UVs so prints stay put; unit-tested),
  `normals` (**angle-weighted vertex normals** — pure `angleWeightedNormals`/`computeAngleWeightedNormals`
  weight each face by its interior angle (Max) instead of area, so the adaptive remesh's uneven triangle
  sizes don't skew the shading; a drop-in for `computeVertexNormals` on the garment pieces, unit-tested),
  `ClothMesh`, `FabricMaterial`, `fabricPresets` (`FabricParams`), `diagnostics` (**pure solver diagnostics**
  — `cflNumber` (Courant/tunnelling check), `stiffnessRatio`/`substepsForStiffness` (a preset's numerical
  stiffness vs the timestep); unit-tested, + solver-validation tests: rest-state settle · golden-drape
  determinism · momentum conservation), `windPresets`
  (**named wind presets** — still/breeze/gust/runway; pure `gustWind` pulse is unit-tested), `simQuality`
  (**dense-garment controls** — pure `simTube` scales a tube's radial/rings by a resolution, `qualityToSubsteps`
  maps the quality slider to solver substeps; unit-tested). Both
  solvers **sleep** (dead-stop) when windless + still, so at default settings garments hang perfectly
  still (any wind/body-move/edit wakes them).
- `fabric/` — `FabricLibrary` (physical + visual fabrics; `fabricToSolverParams` derives drape; **per-family
  cloth-sheen** — pure `sheenRecipeFromFabric` maps the fabric family (muted woven · lustrous silk · soft
  knit · velvet nap) to sheen + tint + sheenRoughness, + `anisotropyAngleForFabric` streaks a satin/silk's
  anisotropic highlight along the warp (V grain), + `envIntensityForFabric` sets `envMapIntensity` from
  roughness so smooth silks catch the studio IBL and matte cotton doesn't; unit-tested),
  `weaveTexture` (procedural weave **normal + roughness** maps — yarn crowns glossier, valleys matte via the
  pure `weaveRoughness` field baked into a cached `roughnessMap`; **specular-AA** `toksvigRoughness` lifts the
  base roughness by the weave's normal strength so strong weaves don't shimmer at distance; pure math
  unit-tested), `dither` (**ordered/blue-noise dithering** — pure `bayerDither` 8×8 offset baked into smooth
  finish gradients so they don't 8-bit band; unit-tested), `textile` (repeating textile
  **patterns** — stripe/plaid/check/gingham/polka/camo; pure `textileValue` tonal field is unit-tested +
  `paintTextile` tiles it across the albedo), `ombre` (**dip-dye / ombré gradient** — top-down · bottom-up ·
  radial; pure `ombreT` blend field + `ombreDip` derived tone are unit-tested; `paintOmbre` bakes the
  base→dipped-tone gradient **per-pixel through `ombreT` with `bayerDither`** — no gradient banding — into the
  albedo, behind any prints/textile), `wear` (**distressed / washed /
  faded** finishes — pure value-noise `wearValue` field + `wearTone` bleached tone are unit-tested;
  `paintWear` bleaches the albedo where the cloth is worn), `swatch` (**import a fabric photo → seamless tiling PBR**:
  pure `makeSeamless`/`normalFromLuma`/`estimateRoughness` pixel math is unit-tested; `buildSwatchTextures`
  bakes an albedo + derived normal + roughness that clothe the whole garment), `sparkle` (**sequins /
  beading / metallic foil** eveningwear finishes — pure `sparkleNormal` facet field + `sparkleParams`
  metallic recipe are unit-tested; `makeSparkleNormalMap` bakes the tiling glint normal map), `iridescent`
  (**iridescent / holographic / oil-slick** colour-shifting finishes — pure `iridescentParams` thin-film
  recipe + `iridescentThickness` swirl field are unit-tested; the stack drives
  `MeshPhysicalMaterial.iridescence` per part + a baked `iridescenceThicknessMap` so the bands flow across
  the surface), `quilt`
  (**channel / diamond / box quilting** — pure `quiltHeight` pillow-loft field + `quiltNormal` are
  unit-tested; `makeQuiltNormalMap` bakes the tiling loft normal map for puffers/jackets), `lace`
  (**sheer lace / broderie** — chantilly · geometric · fishnet alpha-cutout you can see through, with a
  scalloped edge; pure `laceAlpha` field + `scallopValue` are unit-tested; `makeLaceAlphaMap` bakes a
  tiling alpha map the material cuts with `alphaTest` — the lining shell is dropped so it truly sees
  through), `fur` (**faux-fur / shearling / fleece** pile — pure `furNormal` directional-pile field +
  `furParams` matte recipe are unit-tested; `makeFurNormalMap` bakes a tiling fur normal + high-roughness/
  sheen for a fuzzy look, no extra geometry), `namedColors`
  (a curated **named textile colour library** — `TR-####` production refs; pure `nearestNamedColor`/
  `colorRefLabel` map any picked hue to its closest reference, shown in the panel + the tech-pack BOM),
  `heatmap` (**fit / tension heatmap** — pure `strainToColor` slack→blue→tight→red ramp is unit-tested;
  the stack bakes `XPBDSolver.strain` into mesh vertex colours so you see where a garment pulls; the same
  strain-view machinery also does `stress` — a **fabric-aware fit-failure** colouring, `stressThreshold`
  scaling by the fabric's stretch so a stiff woven reds out sooner than a knit — and `pressure` — the
  **pressure / contact fit map**: pure `pressureColor` cold→hot ramp over `XPBDSolver.contactPressure`,
  the per-frame body-collision push-out tallied in both collision paths + EMA-smoothed, so you see where
  the garment actually **presses into** the body, distinct from strain),
  `wrinkle` (**strain-driven micro-wrinkles** — pure `wrinkleAmount` unit-tested; `installWrinkle` injects a
  crease-normal perturbation into the fabric shader scaled by an `aStrain` vertex attribute + **fold-valley
  cavity darkening** (pure `cavityFactor`) that shadows the diffuse in the compressed creases so folds read
  deep — a fabric-*compression* cue, unlike GTAO's geometric AO).
- `garments/` — **data-driven catalog**: `schema` (`GarmentDefinition` = category + composable pieces
  (`bodyTube` · `legTubes` · `sleeves` · **`headTube`** — a head/neck cowl/beanie tube anchored at the crown/neck ·
  **`scarfPanel`** — a flat *open* panel (`wrapX: false`) wrapped once around the neck with hanging tails) +
  `ConstructionCaps` — neckline/sleeve/length/ease/flare + **collar/cuff/pleats/dart/pocket/hem**
  detail), `registry` (the garments, as data — incl. the **snood**/**beanie**/**scarf** cloth-sim headwear),
  `factory` (`buildGarment` composes pieces; `headTubeToSpec` builds a head/neck tube from `headR`/`neckR`
  measurements, colliding with the head/neck capsules for free; construction detail is
  folded into the tube/sleeve specs so the 3D silhouette + the 2D pattern both reflect it), `decor`
  (`pocketPlacements` — pure patch-pocket positions; the stack renders them as non-sim patch meshes).
  Adding a garment or a supported detail is a data change, not new code.
- `garment/` — `GarmentController` (one garment's multi-piece sim, consumes the factory; **binds each
  piece to body anchors** via the pure `pieceAnchor` — a top to the torso, a skirt/trouser to the hips, a
  **sleeve to its arm (+ elbow to the forearm)**, a **beanie/hat to the head** (turns/nods with it) — via
  the solver's pin groups, so each follows that part of the animated body); `templates`
  (shared `GarmentParams`/types only). `avatar/BodyCollider` uses `three-mesh-bvh` for mesh collision.
- `studio/` — the **multi-garment layer stack**: `document` (`ProjectDoc` = body + scene + serialisable
  garment `layers[]`; `serializeDoc`/`parseDoc` — the `.dio` project + undo/redo snapshots + clipboard;
  `SizeLabel`/`gradeParams` grade a layer's girth by size; **`Colorway`** + `captureColorway`/`applyColorway`
  save & apply appearance-only colour/fabric variants of a design),
  `GarmentStack` (the live layers: each its own materials · fabric · print · `GarmentController`; many
  garments simulate on one mannequin). **Per-part fabric**: a material per part (body / sleeves / legs)
  assigned to each piece mesh by name, + a **trim** material with contrast decor bands (hem/neckline) and
  trim-coloured pockets — `stack.setPart(part, {fabricId?, color?})`. **Per-panel fabric**: each tube
  splits into **front (+z) / back (−z)** geometry groups (`finishTube`), so the body/leg/sleeve mesh takes a
  `[front, back]` material array when its `back`/`legBack`/`sleeveBack` panel has its own fabric (visual +
  per-panel physics — `panelFabricId` falls back back→body, legBack→legs→body, sleeveBack→sleeves→body).
  Adding a garment is `stack.addLayer`.
  `projectStore` (the **in-app project library** — localStorage list/save/load/delete/rename of saved
  `ProjectDoc`s + thumbnail; + **version history** — each project keeps a capped list of named `Snapshot`s
  (`pushSnapshot`/`snapshotProject`/`listSnapshots`/`restoreSnapshot`), driven by `ui/versionHistory`'s panel
  (File → Save version / Version history…); pure parse/upsert/sort/snapshot helpers are unit-tested), `autosave` (**autosave +
  crash recovery** — snapshots the working `.dio` doc to localStorage every 15 s + on close; a fresh
  launch offers to recover it via a non-blocking banner; pure `parseSnapshot`/`shouldOfferRestore`/
  `describeAge` are unit-tested), `timeline` + `TimelinePlayer`
  (the **shot-sequencer** — keyframe camera + avatar subject; pure `sampleTimeline`/`lerpCameraPose` are
  unit-tested; the player eases the camera via `Viewport.get/setCameraPose` + records a WebM clip),
  `turntable` (**one-click turntable spin → WebM**: pure `turntablePose` orbits the camera a full turn
  around the subject, unit-tested; `recordTurntable` replays it against the live canvas via MediaRecorder),
  `measure` + `MeasureTool` (**measure & annotate** — a tape-measure (click two points on the garment/body →
  a cm reading) + pinned notes; pure `distanceCm`/`midpoint`/`MeasureStore` are unit-tested, the tool
  raycasts the live meshes + reprojects HTML labels each frame; View-menu driven),
  `lineup` (**runway line-up** — a collection shot of the garment across N colourways rendered side by
  side into one PNG; pure `lineupCells`/`lineupHues` are unit-tested, `main` snapshots per colourway +
  composites (the body/cloth sim is a singleton, so it composites snapshots rather than surgically
  offsetting colliders); File → Export runway line-up).
- `pattern/` — `pattern` (`buildSewnTop`), `PatternController` (sew → drape).
- `export/` — `exporters3d` (glTF/OBJ + **USDZ** for iOS AR Quick Look), `garmentPattern` (**real per-garment flat pattern**: unwraps the
  selected garment's `TubeSpec`s into true 2D panels — bodice front/back with the neckline curve + armhole,
  A-line skirt/dress panels, tapered trouser legs, shaped sleeve — as SVG/DXF; the cut line uses a
  **per-edge seam allowance** (`offsetPolygonPerEdge` + `seamAllowancePerEdge` + `cutLine`) — a deep folded
  hem, a shallow neckline/waist, the base allowance on seams, classified by edge geometry; pure `placePrints` maps
  placed logos/text onto their panel to scale — a dashed placement box + label in SVG, a PRINT layer in
  DXF), `garmentMetrics` (**live
  production spec**: real chest/waist/hip/length/sleeve/inseam + fabric area + seam length from the same
  construction), `careLabel` (**auto care label**: pure `fibreContent`/`careInstructions` derive fibre
  content % + laundering lines from a fabric's family/stretch — unit-tested; folded into the manufacturing
  pack), `cost` (**landed cost sheet**: pure `costRollup` (fabric yield × price + thread + trims + labour +
  overhead → cost/unit) + `estimateLabourMinutes`, with `estimatedFabricPrice` from the fabric library;
  unit-tested), `manufacture` (**manufacturing pack**: printable HTML/JSON — spec sheet + fabric BOM + a
  **cost sheet** + care & content + embedded flat patterns for the whole outfit), `tiledPrint` (**tiled
  print-to-scale**: pure `tilePlan` splits the pattern's mm layout into overlapping A4/Letter tiles;
  `tiledPatternHTML` renders a print-CSS doc — an assembly map + one to-scale (mm) page per tile with corner
  registration crosshairs + R·C labels, so a home sewer prints at 100% and tapes it together (File → Print
  pattern — tiled A4); unit-tested), `patternExport` (sewn-pattern SVG/DXF),
  `patternImport` (**import a flat pattern** — `parsePatternDXF` reads a DXF's LWPOLYLINE panels
  (CUT/SEW/PRINT layers) back into panels + bounds, round-tripping the export; `importedPatternToSVG`
  previews them in the 2D pane via File → Import pattern; the pure parser is unit-tested), `techpack`, `save`.
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
  `library` (tabbed asset browser — search-as-you-type + **fabric filters** by family/weight/stretch via
  the pure, unit-tested `libraryFilter`), `objectBrowser` (the **garment layers** worn on the body — select ·
  visibility · add/duplicate/delete), `centerTabs` (3D · 2D-pattern dual viewport + a **persistent
  quick-edit toolbar over both** — size/neckline/sleeve/length/width/hem `PatternEditor` steppers that run
  the same `applyGarmentEdit` path, so 2D↔3D stay in sync), `layoutStore`.
- `ui/` — `panel` (the **context-sensitive Property Editor** — Garment/Avatar/Scene; returns `{panel, api}`
  the Library drives; the Appearance section carries the **Wet look** + **Puffer loft** toggles and the Scene
  section a **Tone-map** picker (ACES/AgX/Neutral/Filmic/Reinhard)), `controls` (DOM helpers), `keymap`
  (**rebindable keyboard shortcuts** — the studio keymap as data: pure `actionFor`/`captureBinding`/
  `formatBinding`/`parseKeymap`/`conflictsIn` unit-tested, persisted in localStorage; `shortcutsOverlay`
  (press `?`, or `?shortcuts=1`) doubles as the **editor** — click a key chip, press the new combo;
  main.ts dispatches through the live map), `thumbnails`
  (shared swatch/silhouette), `patternSchematic`,
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
its defaults) · `?fabric=<id>` · `?mode=pattern` · `?anim=idle|walk|turn` · `?pose=stand|weight-shift|stride|relaxed` · `?walk=<commercial|editorial|sport>` (walk style — stride/arms/cadence + GLB rate)
(a static lookbook pose) · `?posture=<neutral|athletic|slouch|swayback>` (a **posture carriage** layered on any pose — bends the spine/neck in colliders + visual shaping + anchors so garments re-drape onto the new carriage) · `?bodyType=female|male` ·
`?bodyH=<s>&bodyB=<s>&bodyBust=<s>&bodyWaist=<s>&bodyHips=<s>` (mannequin size/shape) ·
`?bodyPreset=<runway|curvy|plus|athletic|petite|tall>` (a body-shape preset) ·
`?accessories=<shoes,belt,hat,bag,beanie,cap,bucket,balaclava,scarf,gaiter>` (worn accessories, incl. **headwear & neckwear** placed by the head/neck frame) ·
`?skin=<porcelain|fair|light|medium|tan|brown|deep|espresso>` (a complexion skin tone) ·
`?undertone=<warm|neutral|cool>` (its undertone) ·
`?hair=<short|bob|long|afro>` (a hairstyle; default none) · `?hairColor=<hex>` · `?face=1` (subtle face
features — brows/eyes/lips) ·
`?light=<studio|softbox|dramatic|high-key|runway|golden-hour>` (a studio lighting preset) ·
`?tonemap=<aces|agx|neutral|filmic|reinhard>` (the final tone-mapping operator; default ACES) ·
`?backdrop=<studio-grey|white|product-white|charcoal|black|blush|sky|transparent>` (a backdrop preset;
**product-white** = flat white no-floor product sweep, **transparent** = no backdrop → the Render tab
exports a PNG **with alpha**) · `?text=<print>`
(+ `?textX=<0..1>&textY=<0..1>` to place it; `x≈0.25` front, `0.75` back — back prints render on a
back-fabric panel) · `?textile=<stripe|plaid|check|gingham|polka|camo>` (a repeating pattern tiled across
the garment, behind the prints) · `?ombre=<top-down|bottom-up|radial>` (a dip-dye / ombré gradient baked
into the albedo) · `?wear=<faded|acid-wash|distressed>` (a distressed / washed / faded finish) ·
`?swatch=demo` (import-a-fabric-photo → tiling PBR, exercised with a
procedural swatch) · `?sparkle=<sequins|beading|foil>` (an eveningwear sparkle finish) ·
`?iridescent=<iridescent|holographic|oil-slick>` (a colour-shifting thin-film finish) ·
`?quilt=<channel|diamond|box>` (a quilted-loft finish) ·
`?lace=<chantilly|geometric|fishnet>` (a sheer alpha-cutout lace finish) ·
`?fur=<shearling|faux-fur|fleece>` (a fuzzy pile finish) · `?prints=demo`
(two body prints) · `?prints=parts` (a print on the body + sleeves + legs — each print sits on its own
piece) · `?prints=embroidery` / `?prints=applique` (a raised embroidered / appliqué motif) ·
`?view=pattern` (open the 2D flat-pattern tab) · `?view=render` (open the Render tab — supersampled still) · `?body=mesh|glb` (GLB realistic avatar is the default; `mesh` forces the procedural body) ·
`?layers=<id>,<id>` (layer extra garments) · `?collar/cuff/pleats/dart/pocket/hem/closure=1` (construction detail; `closure` = front placket/zip) ·
`?open=1` (**functional opening** — the closure worn open: `TubeSpec.openFront` slits the mesh at `openSeamColumn` and `XPBDSolver.cutSeam` unsews the matching constraints, so the garment really gaps and hangs open) ·
`?lined/interfaced/waistband/facing/drawstring/ruffles/boning/ribbing/yoke/princess=1` (more construction detail) ·
`?wet=1` (a **waterlogged rain/swim look** — heavier + limp + clinging drape via `wetParams` + a darker glossy sheen) ·
`?puff=1` (**trapped-air loft** — inflate any garment off the body into a puffer via `XPBDSolver.pressure`; auto-on for a quilted garment) ·
`?sleeveShape=<set-in|raglan|dolman|bishop|puff|bell>` · `?collarStyle=<…>` · `?pleatStyle=<knife|box|accordion|cartridge|gather>` ·
`?pocketStyle=<…>` · `?frillStyle=<…>` · `?closureStyle=<button|zip>` (construction *style* pickers) ·
`?embroidery=1` · `?applique=1` (raised print styles — same as `?prints=embroidery|applique`) ·
`?easeChest/easeWaist/easeHip=<cm>` (**ease by zone** — per-landmark ease on top of Looseness) ·
`?trim=1&trimColor=<hex>` · `?sleeveFabric=<id>` · `?legFabric=<id>` (per-part fabric) ·
`?backFabric=<id>` · `?legBackFabric=<id>` · `?sleeveBackFabric=<id>` (per-panel fabric — the body/leg/sleeve **back** panel) ·
`?closeup=1` (macro camera) · `?heatmap=1` (fit / tension heatmap) · `?stress=1` (fit-failure viz) ·
`?pressure=1` (pressure / contact fit map — where the garment presses into the body) ·
`?wrinkles=1` (strain-driven micro-wrinkles) · `?tearing=1` (**cloth tearing** — constraints rip past ~1.5× the fabric's stress-fail strain (`XPBDSolver.tearThreshold` + `onTear`), the mesh drops the bordering quads via the shared `tubeIndices` emitter) · `?wind=<still|breeze|gust|runway|storm>` (wind preset; **storm** = a turbulent noise *field* — `cloth/turbulence` per-particle swirl scaled by |wind|, so parts of the garment feel different air) ·
`?simRes=<coarse|normal|fine|ultra>&simQuality=<0..1>` (dense-garment resolution + solver quality) ·
`?still=1` (freeze the start-page
turntable) · `?page=start` (deep-link the
builder) · `?page=projects[&demo]` (the Projects gallery; `demo` seeds a few looks). Entry is the homepage
launcher → start page / Projects → studio. Regenerate docs with `npm run capture`.
