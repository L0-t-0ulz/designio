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
  doesn't 8-bit band; `black` hides the stage floor for a floating shot)), `Loop` (fixed-timestep),
  `PathTracer` (**offline path-traced hero render** — a physically-based GI still via **three-gpu-pathtracer**:
  `renderPathTraced` bakes the posed scene into a BVH + converges N accumulated samples for true global
  illumination · soft shadows · accurate glossy sheen, a step up from the rasterised `renderStill`. Non-PBR
  meshes (the `Reflector` floor · shadow-catcher) are hidden for the trace — only `MeshStandardMaterial`/
  `MeshPhysicalMaterial` survive — and a `GradientEquirectTexture` studio dome drives the environment light
  (the live PMREM env isn't an equirect the tracer can sample); the caller pauses the loop so the tracer owns
  the canvas, then restores. `pathTracePlan` (pure — quality preset → sample/bounce/tile budget, width clamp,
  progress fraction; unit-tested)).
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
  `ClothMesh`, `FabricMaterial` (the PBR fabric material — sheen · weave normal/roughness · anisotropy ·
  transmission; + a **velvet retroreflective lobe** (`fabric/velvet` — pure `velvetFacingFactor` darkens the
  diffuse facing the camera, bright grazing rim; injected via `onBeforeCompile`, gated by a `uVelvet` uniform
  so non-velvet is a bit-identical identity — only napped velvet/velour turns it on)), `fabricPresets` (`FabricParams`), `diagnostics` (**pure solver diagnostics**
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
  unit-tested), `weaveDraft` (**weave draft designer** — author the interlacement like a weaver:
  threading · tie-up · treadling → the pure `drawdown` grid + wrapped float lengths → a
  float-length-aware height field (long satin floats sit high + flat, plain interlacements ridge) baked
  into a custom normal + roughness map replacing the fabric preset's weave; 6 preset drafts (plain ·
  basket · 2/2 twill · 3/1 denim · 5-end satin · herringbone) + a grid-editor modal
  (`ui/weaveDraftEditor`, live drawdown preview) under Appearance; per-layer, saved in the `.dio` +
  colorways; `?weaveDraft=<preset>`; pure math unit-tested), `knitChart` (**knit stitch designer** —
  a hand-knitter's stitch chart: a cell per stitch (knit · purl · cable crossing left/right, course 0 at
  the chart bottom) → a pure height field (raised knit wales with a V notch, squat purl bumps, cables
  leaning into a braid) baked into custom normal + roughness maps replacing the preset weave; 6 preset
  charts (stockinette · garter · 1×1/2×2 rib · seed · cable rope) + a cell-cycling editor modal with a
  live shaded preview (`ui/knitChartEditor`); mutually exclusive with the weave draft (one structure owns
  the surface); per-layer, `.dio` + colorways; `?knitChart=<preset>`; unit-tested), `colourwork`
  (**intarsia / colourwork** — a knitter's colour chart (yarn-index cells over a 2–6 yarn palette, course 0
  at the bottom) worked **fair-isle** (tiles the whole garment; yarn 1 = the ground) or **intarsia** (one
  placed front-body chest block; yarn-1 cells transparent so the garment shows through); pure
  `colourworkIndex` UV→yarn field (mirror-corrected so charts read as authored), `paintColourwork` bakes
  crisp stitch blocks with alternate-course shading into the design-art albedo behind the prints — the
  colour layer composes with the knit chart / weave draft structure into a true jacquard; 8 presets
  (Fair Isle band · argyle · zigzag · heart · star + the **ski-mask jacquards**: skull · flame ·
  frostbite allover knits) + a yarn-palette painting modal (`ui/colourworkEditor`);
  per-layer, `.dio` + colorways; `?colourwork=<preset>`; unit-tested), `yarn` (**yarn library** — the
  yarn a fabric is spun from: **count** (tex) · **ply** · **twist**; pure `yarnHand` derives hand
  multipliers (chunky = heavier/coarser/deeper relief · fine = light/dense · high twist = crisp + springy ·
  soft single = limp fuzzy halo) and `yarnAdjustedFabric` applies them clamped, so the SAME preset fabric
  in lace vs chunky yarn genuinely drapes + reads differently — every GarmentStack fabric resolution honours
  the layer's yarn (physics + PBR); 7 presets (lace → chunky + single-ply/crepe spins) + count/ply/twist
  sliders in the panel; `stack.setYarn` re-derives look + drape together; per-layer, `.dio` + colorways;
  `?yarn=<preset>`; unit-tested), `dither` (**ordered/blue-noise dithering** — pure `bayerDither` 8×8 offset baked into smooth
  finish gradients so they don't 8-bit band; unit-tested), `textile` (repeating textile
  **patterns** — stripe/plaid/check/gingham/polka/camo; pure `textileValue` tonal field is unit-tested +
  `paintTextile` tiles it across the albedo, at a user **motif scale** (pure `textileTiles` maps scale →
  repeat count, 0.25…4×) + **rotation** (the repeat put on the bias via `CanvasPattern.setTransform`)),
  `tartan` (**tartan sett designer** — a real sett
  (thread-count coloured stripes) woven in **2/2 twill**: pure `expandSett` mirrors a *reflective* sett
  about its two pivot threads into the symmetric repeat, `tartanColorAt` picks the warp/weft colour on the
  twill diagonal so equal crossings read solid + unequal ones hatch half-and-half; 6 preset setts
  (Black Watch · Royal Stewart · Hunting · Dress Blue · Camel check · Grey), `paintTartan` bakes it into
  the design-art albedo behind the prints; a **Tartan sett** picker under Appearance; per-layer, `.dio` +
  colorways; `?tartan=<preset>`; pure math unit-tested), `ombre` (**dip-dye / ombré gradient** — top-down · bottom-up ·
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
  `drapeBench` (**virtual drape test** — the Cusick circular-drape bench MEASURED on the live solver
  (a disc settles over a capsule pedestal → shadow-area **drape coefficient %**, deterministic,
  milliseconds) + the Peirce cantilever DERIVED from flexural rigidity (G = w·c³ → bending length;
  in-sim strips are non-physical at that scale — every fabric hangs a thin strip near-vertical);
  `🧪 Virtual drape test` button under Appearance + `?drapeTest=1`; unit-tested against real-world
  bending-length ranges), `heatmap` (**fit / tension heatmap** — pure `strainToColor` slack→blue→tight→red ramp is unit-tested;
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
  `factory` (`buildGarment` composes pieces; `headTubeToSpec` builds a head/neck tube from `headR`/`neckR`/**`crownY`**
  measurements (crownY = the REAL skull top — capsule-derived on the GLB, whose head bone is a joint at the
  skull base; the GLB head capsule now spans the skull so headwear rests on it instead of a phantom head),
  colliding with the head/neck capsules for free; a `face` style (balaclava) adds real eye/mouth
  **cut-outs** + a dome-clamped spawn; construction detail is
  folded into the tube/sleeve specs so the 3D silhouette + the 2D pattern both reflect it), `decor`
  (`pocketPlacements` — pure patch-pocket positions; the stack renders them as non-sim patch meshes).
  Adding a garment or a supported detail is a data change, not new code.
- `garment/` — `stitchTypes` (**seam & topstitch library** — plain · french · flat-fell · overlock seam
  types (allowance/thread appetite/visible rows) + single/double needle + SPI + Tex thread weight; pure
  `stitchLengthMm`/`dashForSpi`/`threadMetresFor`/`stitchSummary`/`parseStitchParams` unit-tested; SPI
  drives the 3D topstitch dash pitch, double needle (or a flat-fell seam) adds the twin jeans rows, the
  spec lands in the manufacturing pack spec sheet + factory JSON), `GarmentController` (one garment's multi-piece sim, consumes the factory; **binds each
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
  offsetting colliders); File → Export runway line-up),
  `giftFold` (**scarf gift-fold render** — a flat, neatly-folded product shot for a line sheet: pure
  `giftFoldLayout` places a portrait folded body + a turned-down underside corner + a wrapped belly band +
  a contact shadow (unit-tested); `renderGiftFold` composites the active garment's **live fabric albedo**
  (the design-art map — so a tartan/print shows) into the shapes, or its base colour; File → Export scarf
  gift-fold + `?giftFold=1`).
- `pattern/` — `pattern` (`buildSewnTop`), `PatternController` (sew → drape), `drawnPanel`
  (**draw-your-own panel** — pure math from a sketched 2D outline to a sewn garment: `mirrorOutline`/
  `resampleOutline`/`panelGrid` mask a lattice inside the outline, `classifyBoundary` splits its edge into
  side seams (stitched front↔back) · top pins · open hem, `wrapDrawn` wraps front+back around the torso
  arc-length-true, `buildDrawnPanel` sews it in a `ClothWorld`; unit-tested), `SketchPad` (the modal
  sketch canvas — body guide + mirror symmetry, click/drag to draw, "Sew it" → `buildDrawn`; the sketch
  sticks for fabric/body rebuilds while in Pattern mode), `arrangement` (**sewing lines & arrangement**
  — pure multi-panel workflow: `ARRANGEMENT_POINTS` present panels on a standoff cylinder around the
  body, `boundaryChain` walks a lattice edge in order, `pairSeam` pairs two edge chains by normalised
  arc position (mismatched lengths eased — the longer edge gathers evenly), `buildArrangedGarment` sews
  the set in one `ClothWorld`; sticky via `PatternController.buildArranged`; unit-tested), `styleLines` (**style lines** — pure
  `splitOutline` cuts a closed outline along a drawn polyline into two pieces (yoke · princess ·
  colour-block) that re-sew along the cut via the arrangement seam pairing; per-piece hue tints
  colour-block the pieces (`buildArranged(..., tints)`); `outlinesToSVG` exports the split pieces as
  separate flat pattern panels; unit-tested), `panelFeatures` (**internal shapes & notches** — `Dart`/
  `dartWedge` wedges + internal cut-outs remove REAL lattice fabric (`panelGrid` holes; `classifyBoundary`
  keeps hole borders free), `closeRegionStitches` sews a dart's wedge shut row by row for true fabric
  take-up (the panel bows into 3D), `outlinePointAt` places seam-notch marks; cut-outs/darts/notches/
  drills land on `outlinesToSVG` as dashed shapes · fold wedges · ticks · circles; unit-tested — incl.
  a headless darted-vs-undarted hem-span take-up assertion).
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
  + a **pricing calculator** — pure `priceFromCost` prices wholesale to hit a target gross margin
  (`cost / (1 − margin)`) + suggested retail off a keystone multiple, with margin/markup back-out;
  unit-tested), `headSizing` (**head-circumference sizing** for headwear: pure `headCircumferenceCm`
  (head girth from the head collider radius) + `hatSizeFor` → the `HAT_SIZE_RUN` (XS…XXL / cm); `pomTable`
  attaches it for any garment with a `headTube` piece; unit-tested), `manufacture` (**manufacturing pack**: printable HTML/JSON — spec sheet + fabric BOM + a
  **cost sheet** + a **pricing** block (wholesale · margin · suggested retail) + a **head-sizing** table (headwear) + care & content + embedded flat patterns for the whole outfit), `tiledPrint` (**tiled
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
`?kids=<toddler|child|tween|teen>` (a **kids' size block** — age-appropriate proportions, not a scaled-down adult) ·
`?belly=<0..3>` (**maternity** — a trimester belly bump the garments drape over) ·
`?buttons=<2..9>&buttonMm=<8..30>&buttonColor=<hex>&zipColor=<hex>` (the **closure designer** — button count/size/colour · zip tape colour) ·
`?accessories=<shoes,belt,hat,bag,beanie,cap,bucket,balaclava,scarf,gaiter,visor,cowboy,tophat,bowler,boonie,goggles>` (worn accessories, incl. **headwear & neckwear** placed by the head/neck frame; **visor** = the open-crown sport band wearing the cap's parametric bill; **cowboy** = the western block — a cattleman-creased tall crown over a side-rolled brim (pure `avatar/cowboy.cowboyBrimLift`) + leather band & buckle; **tophat/bowler** = the formal blocked-felt pair (pure `avatar/formalHats` — the flared stovepipe with side-curled brim · the hard low dome with the all-round rolled edge); **boonie** = the soft field hat with the chin cord) ·
`?boonieSnap=<none|left|right|both>` (the **boonie snap-up brim** — pure `avatar/boonie.boonieBrimLift` sweeps the chosen side(s) up against the crown while the rest droops) ·
`?accessories=bakerboy` (the **baker boy** — an 8-gore puffed crown (pure `avatar/bakerboy.goreLobe` rim scallops) overhanging a fitted band, wearing the cap's parametric bill) ·
`?accessories=sunhat` (now in the **straw weave material** — the 2/2 basket draft baked to weave normal+roughness maps by `fabric/weaveDraft`, under a dry straw sheen; pure `avatar/straw.strawRecipe`) ·
`?brimWidth=<0.4..2.2>&brimDroop=<-1..1>&brimWire=1` (the **parametric brim designer** — width · droop/flip · a wired edge on the fedora + bucket + sun-hat blocks; pure `avatar/brim.brimProfile`) ·
`?crownShape=<dome|teardrop|centre-dent|diamond|telescope>` (the **crown shape library** — blocked-felt creases pressed into the fedora accessory's crown; pure `avatar/crown.crownDrop` plan-disc depth fields) ·
`?hatBand=<none|grosgrain|leather|cord>&bandTrim=<none|bow|feather|buckle>&bandColor=<hex>` (the **hat band designer** — a ribbon/strap/braided-cord band + a side trim on the fedora + sun-hat blocks; pure `avatar/hatBand` profile/braid/anchor math) ·
`?billCurve=<0..1>&underbill=<1|hex>&squatchee=0` (the **cap bill designer** — flat↔pre-curved visor curl (pure `avatar/capBill.billCurl`, a ~120° forward fan) · contrast underbill · the squatchee crown button; also re-bills the open-crown **visor**) ·
`?capPanels=<5|6>` (the **cap construction picker** — 6-panel seams straight down centre-front, 5-panel keeps the clean camp-cap front; pure `avatar/capPanels.panelSeamAzimuths` meridians laid as seam ridges + twin topstitch) ·
`?puffLogo=<dot|bar|peak|ring>&puffColor=<hex>` (**3D puff cap embroidery** — a raised puff-foam mark lofted off the cap's upper front panel; pure `avatar/puffLogo.puffHeight` window field, vertex-coloured so only the mark reads as thread) ·
`?garment=ski-mask&balaclavaFace=<full|eyes|three-hole|open-face>` (the **cloth-sim balaclava** — a conforming knit hood with REAL face cut-outs: `TubeSpec.cutouts` drops the quads + orphaned particles go dead, so you see through the eye/mouth holes; the picker is under Construction) ·
`?closeup=head` (the Face anatomy camera — frames the head for headwear shots; `&headDist=<m>` tightens it) ·
`?cuffHeight=<0..1>&slouch=<0..1>` (**beanie fit** — cuff roll depth + slouch length on any beanie) ·
`?balaclavaWorn=<down|rolled>` (the **convertible fold** — the ski mask worn down over the face or rolled up into a beanie band) ·
`?pomScale=<0.4..2>&pomColor=<hex>&pomFur=1` (the **pom customizer** — size · contrast colour · faux-fur pile on the pom-beanie) ·
`?cuffPatch=<leather|woven>` (a **brand patch** on the beanie band, tracked to the live cloth) ·
`?garment=brimmed-beanie` (a knit dome over a **short stiff visor** riding the live band) ·
`?garment=headband` (the **twisted headband** — an open-crown knit ear-warmer band with a front twist) ·
`?scarfWidth=<0.5..1.8>` (the **scarf dimension designer** — width multiplier; Length drives the tails) ·
`?scarfPin=1&pinAt=<0.02..0.45>` (the **scarf pin / brooch** — `XPBDSolver.pinTogether` sews the two tails with one extra stitch constraint at that fraction in from the tail ends + a metal disc riding the pinned point) ·
`?scarfKnot=1` (the **Parisian knot** — the scarf spawns folded in half: pure `knotCentre` runs the bight U down the chest, wraps the doubled collar a full turn each half, and threads the tails through the loop; `parisianPinPairs` stitches each tail to its side of the bight — "pinned at the loop like the real knot") ·
`?scarfDouble=1` (the **double wrap** — pure `doubleCentre` spirals the strip ~3.3π twice around the neck (each turn out + down so the second lies over the first, held apart by the particle repulsion); the wrap eats length so the front tails hang short; `buildScarf` pins only the wrap's back half; the knot wins if both are set) ·
`?scarfBlanket=1` (the **blanket-scarf shoulder drape** — an oversized panel worn as a ruana: pure `blanketCentre` is a symmetric "rail" arcing front-left → over the shoulders → behind the neck → front-right, and the width hangs straight DOWN from it; `buildScarf` pins the whole top rail so both front panels hang symmetrically over the shoulders; the dominant worn-state — wins over knot/double) ·
`?garment=gaiter&gaiterWorn=<down|up>` (the **neck gaiter** — bunched at the neck, or pulled up over the chin + nose with a nose-bridge grip) ·
`?garment=snood&snoodWorn=<cowl|hood>` (the **cowl-to-hood hybrid** — the neck cowl worn around the neck, or pulled **up over the crown into a hood**: `headTubeToSpec` re-specs it to full-head coverage with a gathered crown + a front **open-face** cut-out for the face + a flare draping onto the shoulders, reusing the open-face-balaclava machinery; a Cowl/Hood picker under Construction) ·
`?breath=1` (**breath-warp** — a ~0.3 Hz cyclic exhale puffs the mask's mouth opening; keeps the cloth awake) ·
`?garment=convertible&convertibleWorn=<balaclava|beanie|gaiter>` (the **convertible 3-way** — one knit tube worn three ways) ·
`?ease=<-0.03..0.12>` (base looseness in metres — negative = **compression fit**; pair with `?pressure=1` on a snug beanie for the negative-ease band heatmap) ·
`?distressed=1` (the **distressed mask** — deterministically chewed/frayed cut-out edges, no binding; pair with `?pilling=&wear=` for the full aged look) ·
`?garment=helmet-liner&layers=ski-mask` (the **two-layer balaclava** — the liner + shell simulate as layered cloth, kept apart by the inter-garment repulsion) ·
`?garment=<skinny-scarf|bandana|chullo|helmet-liner>` (more cloth-sim headwear: a charmeuse ribbon scarf · the outlaw bandana (worn up, one `point-front` hem point) · the Andean ear-flap chullo (`ear-flap` hem + pom) · the under-helmet liner (snug open-face)) ·
`?skin=<porcelain|fair|light|medium|tan|brown|deep|espresso>` (a complexion skin tone) ·
`?undertone=<warm|neutral|cool>` (its undertone) ·
`?hair=<short|bob|long|afro>` (a hairstyle; default none) · `?hairColor=<hex>` · `?face=1` (subtle face
features — brows/eyes/lips) ·
`?light=<studio|softbox|dramatic|high-key|runway|golden-hour>` (a studio lighting preset) ·
`?tonemap=<aces|agx|neutral|filmic|reinhard>` (the final tone-mapping operator; default ACES) ·
`?backdrop=<studio-grey|white|product-white|charcoal|black|blush|sky|transparent>` (a backdrop preset;
**product-white** = flat white no-floor product sweep, **transparent** = no backdrop → the Render tab
exports a PNG **with alpha**) · `?neckline=<scoop|crew|v|one-shoulder|strapless>` (**one-shoulder** = the asymmetric-fit neckline — `topEdge` breaks mirror symmetry; the flat pattern follows) · `?text=<print>`
(+ `?textX=<0..1>&textY=<0..1>` to place it; `x≈0.25` front, `0.75` back — back prints render on a
back-fabric panel) · `?textile=<stripe|plaid|check|gingham|polka|camo>` (a repeating pattern tiled across
the garment, behind the prints; `?textileScale=<0.25..4>&textileRotation=<deg>` resize + rotate the motif) · `?tartan=<black-watch|royal-stewart|hunting|dress-blue|camel-check|grey>`
(a real tartan sett — thread-count stripes woven in 2/2 twill) · `?ombre=<top-down|bottom-up|radial>` (a dip-dye / ombré gradient baked
into the albedo) · `?wear=<faded|acid-wash|distressed>` (a distressed / washed / faded finish) · `?pilling=<0..1>` (**pilling & fuzz aging** — hashed pill-bobble normal field + matte fuzz lift, `fabric/pilling`) ·
`?swatch=demo` (import-a-fabric-photo → tiling PBR, exercised with a
procedural swatch) · `?weaveDraft=<plain|basket|twill|denim|satin|herringbone>` (a **weave draft** —
threading/tie-up/treadling drawdown replacing the fabric's preset weave maps) ·
`?knitChart=<stockinette|garter|rib-1x1|rib-2x2|seed|cable>` (a **knit stitch chart** — knit/purl/cable
cells replacing the preset weave maps) ·
`?colourwork=<fairisle|argyle|zigzag|heart|star|skull|flame|frost>` (**intarsia / colourwork** — a fair-isle jacquard tiled
allover or a placed intarsia chest block, painted into the albedo behind the prints) ·
`?yarn=<lace|fingering|dk|worsted|chunky|single-ply|crepe>` (the **yarn** the fabric is spun from —
count/ply/twist adjust the fabric's hand: drape + surface together) · `?sparkle=<sequins|beading|foil>` (an eveningwear sparkle finish) ·
`?iridescent=<iridescent|holographic|oil-slick>` (a colour-shifting thin-film finish) ·
`?quilt=<channel|diamond|box>` (a quilted-loft finish) ·
`?lace=<chantilly|geometric|fishnet>` (a sheer alpha-cutout lace finish) ·
`?fur=<shearling|faux-fur|fleece>` (a fuzzy pile finish) · `?prints=demo`
(two body prints) · `?prints=parts` (a print on the body + sleeves + legs — each print sits on its own
piece) · `?prints=embroidery` / `?prints=applique` (a raised embroidered / appliqué motif) ·
`?prints=blend` (**print opacity + blend** — a translucent 50 %-opacity print + a `multiply`-blend print
that tints into the weave; each `Print` carries `opacity` (0…1) + `blend` (normal · multiply · screen),
applied in `paintAlbedoMotif` via the pure `resolvePrintPaint`; appliqué patches stay opaque) ·
`?view=pattern` (open the 2D flat-pattern tab) · `?view=render` (open the Render tab — supersampled still) ·
`?pathtrace=1` (+ `?ptQuality=<draft|high|ultra>`) (open the Render tab in **path-traced hero-render** mode
+ converge an offline GI still once the drape settles — the Render tab's ✦ Path traced toggle + quality
selector do the same interactively) · `?body=mesh|glb` (GLB realistic avatar is the default; `mesh` forces the procedural body) ·
`?drawnPanel=demo` (**draw-your-own panel** — sews the built-in demo sketch, a waisted scoop tank) ·
`?arranged=demo` (**sewing lines & arrangement** — the four-panel colour-block bodice: panels placed at arrangement points, side seams eased) ·
`?styleLines=demo` (**style lines** — the bodice front split by a princess curve, colour-blocked + re-sewn) ·
`?internalShapes=demo` (**internal shapes & notches** — waist darts stitched closed (real take-up) + a keyhole back cut-out) ·
`?seamType=<plain|french|flat-fell|overlock>&spi=<4..22>&needle=<single|double>&threadWt=<tex-27|tex-40|tex-60>` (**seam & topstitch spec** — SPI dash pitch + twin double-needle rows read on the garment; the spec lands in the tech pack) ·
`?gsm=<40..800>&thickMm=<0.05..4>&bend=<0.8..120>&stretchWarp=<0..60>&stretchWeft=<0..60>&shear=<0..60>` (**physical fabric override** — real units driving the solver; unset fields seed from the fabric preset) ·
`?drapeTest=1` (**virtual drape test** — run the drape bench for the active fabric; drape coefficient % + bending length as a toast/console line) ·
`?layers=<id>,<id>` (layer extra garments) · `?collar/cuff/pleats/dart/pocket/hem/closure=1` (construction detail; `closure` = front placket/zip) ·
`?open=1` (**functional opening** — the closure worn open: `TubeSpec.openFront` slits the mesh at `openSeamColumn` and `XPBDSolver.cutSeam` unsews the matching constraints, so the garment really gaps and hangs open) ·
`?lined/interfaced/waistband/facing/drawstring/ruffles/boning/ribbing/yoke/princess=1` (more construction detail) ·
`?wet=1` (a **waterlogged rain/swim look** — heavier + limp + clinging drape via `wetParams` + a darker glossy sheen) ·
`?puff=1` (**trapped-air loft** — inflate any garment off the body into a puffer via `XPBDSolver.pressure`; auto-on for a quilted garment) ·
`?sleeveShape=<set-in|raglan|dolman|bishop|puff|bell>` · `?collarStyle=<…>` · `?pleatStyle=<knife|box|accordion|cartridge|gather>` · `?hemShape=<high-low|shirttail|handkerchief|ear-flap|point-front>` (a curved hem — pure `bottomEdge` shapes the 3D fill AND the 2D unwrap) ·
`?pocketStyle=<…>` · `?frillStyle=<…>` · `?closureStyle=<button|zip>` (construction *style* pickers) ·
`?embroidery=1` · `?applique=1` (raised print styles — same as `?prints=embroidery|applique`) ·
`?easeChest/easeWaist/easeHip=<cm>` (**ease by zone** — per-landmark ease on top of Looseness) ·
`?trim=1&trimColor=<hex>` · `?sleeveFabric=<id>` · `?legFabric=<id>` (per-part fabric) ·
`?fringe=1` (**hem fringe** — REAL verlet strand chains (gravity + rope projection, pure `garment/Fringe.stepStrand`) hanging from the live hem: a skirt/dress bottom row, or a scarf's tail-end columns) ·
`?backFabric=<id>` · `?legBackFabric=<id>` · `?sleeveBackFabric=<id>` (per-panel fabric — the body/leg/sleeve **back** panel) ·
`?closeup=1` (macro camera) · `?heatmap=1` (fit / tension heatmap) · `?stress=1` (fit-failure viz) ·
`?pressure=1` (pressure / contact fit map — where the garment presses into the body) ·
`?wrinkles=1` (strain-driven micro-wrinkles) · `?tearing=1` (**cloth tearing** — constraints rip past ~1.5× the fabric's stress-fail strain (`XPBDSolver.tearThreshold` + `onTear`), the mesh drops the bordering quads via the shared `tubeIndices` emitter) · `?wind=<still|breeze|gust|runway|storm>` (wind preset; **storm** = a turbulent noise *field* — `cloth/turbulence` per-particle swirl scaled by |wind|, so parts of the garment feel different air) ·
`?simRes=<coarse|normal|fine|ultra>&simQuality=<0..1>` (dense-garment resolution + solver quality) ·
`?freezeAt=<simSeconds>` (**deterministic snapshot mode** — the loop stops stepping at that exact sim
step, frame-rate independent; capture tooling polls `window.__drapeSettled()`; used by
`scripts/golden.cjs`, the golden-image CI) · `?catchUp=<steps>` (raise the loop's 8-step per-frame
catch-up cap so a slow-rendering capture reaches the freeze mark in less wall time — same step sequence) ·
`?still=1` (freeze the start-page
turntable) · `?page=start` (deep-link the
builder) · `?page=projects[&demo]` (the Projects gallery; `demo` seeds a few looks). Entry is the homepage
launcher → start page / Projects → studio. Regenerate docs with `npm run capture`.
