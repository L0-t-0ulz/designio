# DesignIO — Progress board

A living kanban so you can always see what's shipped, what's cooking, and what's next.
_Ship rule: one feature per branch → green CI (Node 20/22) → merge to `main`._

Legend: ✅ done · 🔄 in progress · 📋 backlog

---

## ✅ Done (merged to `main`)

**Foundations**
- [x] Real per-garment **2D flat pattern** (unwraps the actual garment; SVG/DXF export) — PR #39
- [x] Cloth **settles at rest** at default (no drift/jitter) — PR #39
- [x] **Lifelike mannequin** — bust/deltoids/back/knees + shaped head/hands/feet — PR #39
- [x] **Less-boxy model** — sloped shoulders, nipped waist, smoother surface — PR #43
- [x] **GLB avatar slot** works (sticky toggle) — drop in a photoreal `mannequin.glb` — PR #39
- [x] Studio **PNG print** uploader — PR #39

**Multi-garment + projects**
- [x] **Layer many garments** on one mannequin — PR #40
- [x] **Cut / copy / paste / duplicate** + **undo / redo** — PR #40
- [x] **Save / open `.dio` projects** — PR #40
- [x] **Projects gallery page** — in-app library: open · rename · **delete** · import/export `.dio` — PR #42

**Production**
- [x] **Size grading** (XS–XXL) — PR #41
- [x] **Live measurements** panel (chest/waist/hip/length/sleeve… cm/in) — PR #41
- [x] **Manufacturing export** — spec sheet + BOM + embedded patterns — PR #41

**Detailed design**
- [x] **Construction detail** — collar · cuff · pleats · darts — PR #45
- [x] **Patch pockets + rolled hems** — PR #46
- [x] **Per-part fabric** — leather sleeves / polyester body — PR #49
- [x] **Contrast trim** — collar/cuffs/pockets/hem — PR #49
- [x] **Seam allowance + notches** (production) — PR #49
- [x] **Multiple placeable prints** — logos + text, each positioned / sized / rotated — PR #51
- [x] **Per-part physics** — leather drapes stiffer than jersey (per-piece solver params) — PR #53
- [x] **Per-panel fabric** — front vs back fabric on the body + legs (colour-blocking) — PR #55
- [x] **Back-panel prints** — logos/text placed on the back render on the back panel — PR #56
- [x] **GLB avatar as default** — imported GLB body is the default (own materials when textured · idle stance · fallback to procedural) — PR #57
- [x] **Body-pinned garments** — the avatar **walks in place with its clothes on**: GLB idle/walk clips + bone-driven collider fit + garments pinned to the shoulders/hips — PR #61
- [x] **Sleeves hug the arm** — a long sleeve pins at the shoulder + elbow so it bends with the arm during the walk — PR #63
- [x] **4D per-fabric secondary motion** — aerodynamic drag: chiffon billows/floats/lags, denim near-rigid — PR #65
- [x] **Cloth self / inter-collision** — garments push off each other + don't pass through themselves (spatial-hash particle repulsion) — PR #69
- [x] **More garments** — blouse · hoodie · cargo pants · blazer · coat (+ Outerwear category), all data-driven — PR #70
- [x] **Real hood on the hoodie** — a draped cowl behind the neck (data-driven `hood` flag; fits any figure/size) — PR #71
- [x] **Fabric thickness** — every garment gets an inner lining shell (offset inward along normals by the fabric's physical thickness) so hems/edges read solid, not paper-thin — PR #72
- [x] **Topstitching + seam styles** — drape-following dashed contrast stitch lines along hems/necklines/cuffs in 3D, + a gold topstitch guide on the 2D flat pattern — PR #73
- [x] **A real Render tab** — a third viewport tab that supersamples the current view (HD / 2K / 4K) to a crisp PNG and saves it — PR #74
- [x] **Closures — buttons · plackets · zippers** — a centre-front placket with a button column or a zip + pull (3D), + a CF placket guide on the 2D pattern — PR #81
- [x] **Sleeve library** — set-in · raglan · dolman · bishop · puff · bell (radius-profile sleeve shapes; 3D + pattern) — PR #86
- [x] **Pocket library** — patch · welt · jetted · flap · bellows (3D + pattern pieces per style) — PR #88
- [x] **Pleats & gathers library** — knife · box · accordion · cartridge · gather (fold geometry baked into the tube rest shape; 3D + pattern) — PR #94
- [x] **Real linings & interfacing** — a satiny contrast inner lining (shows at the openings) + interfacing that stiffens the drape (structured/holds-shape) — PR #96
- [x] **Waistbands, facings & drawstrings** — a constructed waistband, a neckline facing, + a functional drawstring with aglet-tipped ends (waist or hood); each with pattern pieces — PR #98
- [x] **Ruffles, flounces & godets** — a `frillStyle` picker (ruffle · flounce · godet) that adds a flared, scalloped hem frill in 3D + a frill pattern piece — PR #100
- [x] **Structured bodices — boning & corsetry** — a `boning` detail: near-rigid corset physics + a cinched waist, with visible vertical boning channels + criss-cross back lacing — PR #102
- [x] **Knit ribbing trims** — ribbed knit bands at the hem, collar + sleeve cuffs (finely fluted geometry — the sweatshirt look) — PR #104
- [x] **Yokes & princess seams** — a shoulder/back yoke seam + curved princess shaping seams (3D seam lines + a yoke pattern piece + princess seams drawn on the panels) — PR #106
- [x] **Textile patterns as fabrics** — a repeating pattern (stripe · plaid · check · gingham · polka · camo) that tiles across the whole garment behind any placed prints, from the Appearance panel or `?textile=` — PR #108
- [x] **Import a fabric photo → tiling PBR** — drop in a swatch photo; DesignIO heals the seam + derives a normal map + roughness + tint and tiles it across the whole garment (Appearance → "Import fabric photo", or `?swatch=demo`) — PR #110
- [x] **Prints on sleeves & legs** — each print carries the part it sits on (body / sleeves / legs); the design map is built per-part so logos + text render on the sleeve or leg you place them on, and the textile pattern now tiles onto sleeves/legs too — PR #112
- [x] **Prints on the 2D pattern + tech pack** — placed logos/text show on the exported flat-pattern panels + the manufacturing pack, mapped to the right piece (front/back/sleeve/leg) and positioned to scale (dashed placement box + label; DXF PRINT layer) — PR #114
- [x] **Embroidery & appliqué** — placed motifs get a finish (flat · raised embroidery · appliqué patch); the raised styles paint a bump relief so stitched thread + patches sit proud of the cloth and catch the light (follows the drape) — PR #116
- [x] **Sequins, beading & metallic foil** — a sparkle finish for eveningwear: faceted normal maps + a metallic recipe so hundreds of facets glint (foil = mirror + anisotropic streak · beading = glassy beads · sequins = metallic discs) — PR #118
- [x] **Quilting — channel · diamond · box loft** — a quilting finish for puffers/jackets: the fabric lofts between stitch lines via a baked pillow-normal map (channel tubes · diamond cross-hatch · box grid) — PR #120
- [x] **Per-panel physics** — the front vs back of a garment drape with their own stiffness + mass (per-constraint region params in the XPBD solver), driven by the per-panel fabric — a stiff back holds an A-line while a soft front clings — PR #121
- [x] **Colorways** — save colour/fabric variants of a design (appearance only, not shape) + compare them side-by-side in a swatch grid; click a swatch to apply, saved with the `.dio` project — PR #124
- [x] **Named colour library (Pantone/TPX-style)** — a swatch grid of named textile colours (curated `TR-####` refs) under the Colour field; any picked hue maps to its nearest production reference, shown live + in the tech-pack BOM — PR #126
- [x] **Photoreal-ish default skin** — the default avatar (GLB + procedural) renders as warm skin (skin tone · semi-matte · warm subsurface sheen) instead of plaster; a textured GLB at `assets/mannequin.glb` still overrides it — PR #128
- [x] **Made-to-measure** — type real body measurements (cm/in) for height/bust/waist/hips to drive the mannequin (in sync with the sliders) + a built-in size chart & paste importer (JSON/CSV) — PR #130
- [x] **Pose library** — lookbook stances (Stand · Weight-shift · Stride · Relaxed): the GLB freezes a real idle/walk clip frame, the procedural body a matching stance; garments re-settle on the new pose (`?pose=`) — PR #132
- [x] **Pose / animation timeline** — a shot sequencer: keyframe the camera + avatar (pose/idle/walk) on a timeline, ease between keyframes, scrub/loop, and record the pass to a WebM clip — PR #134
- [x] **More body types & diversity** — body-shape presets (Runway · Curvy · Plus · Athletic · Petite · Tall) on top of the female/male figures; all valid cloth colliders, garments refit (`?bodyPreset=`) — PR #136
- [x] **Fit / tension heatmap** — a toggle that recolours the garment by cloth strain (slack → blue · neutral → green · tight → red), following the drape live, so you see where it pulls vs hangs loose (`?heatmap=1`) — PR #138
- [x] **Shoes & accessories library** — footwear · belt · hat · bag that attach to the avatar's body capsules and follow it (walk/pose/resize), layered over the garments (`?accessories=`) — PR #140
- [x] **Dense garments — sim resolution + quality** — a resolution control (Coarse→Ultra ≈ 1.9× particles) for denser cloth/finer folds + a quality slider (solver substeps ↔ framerate); the CPU-side answer to "GPU cloth solver" — PR #142
- [x] **Wrinkle / micro-normal baking** — a "Micro-wrinkles" toggle: strain-driven procedural crease normals in the fabric shader so close-ups show crisp micro-folds where the cloth bunches, no extra geometry (`?wrinkles=1`) — PR #144
- [x] **Wind field presets** — named winds (Still · Breeze · Gust · Runway draft) that art-direct the 4D secondary motion; a gust pulse swells/lulls over time (`?wind=`) — PR #146
- [x] **Tearing & stress-failure viz** — a "Stress check" toggle that colours the garment green→amber→red by fabric-aware failure tolerance (a stiff woven reds out sooner than a stretchy knit), for fit validation (`?stress=1`) — PR #148
- [x] **Face & hair customization** — a procedural hairstyle library (None · Short · Bob · Long · Afro) + a hair-colour picker + subtle toggleable face features (brows/eyes/lips), riding the live head via a pure `headFrame(colliders)` so they follow the walk/turn/pose/resize; default None keeps the clean avatar (`?hair=`, `?hairColor=`, `?face=1`) — PR #150
- [x] **Real-time quality slider** — a live Perf→High solver-substep slider (shipped with the dense-garment resolution controls) — PR #142
- [x] **Studio lighting & backdrop presets** — photo-studio looks the Environment applies live: lighting rigs (Studio · Softbox · Dramatic · High-key · Runway · Golden-hour — each an azimuth/elevation key + rims + hemi + exposure) + backdrop cycloramas (Studio grey · White · Charcoal · Black · Blush · Sky; Black hides the stage for a floating product shot) (`?light=`, `?backdrop=`) — PR #152
- [x] **Product-shot backdrops** — a **transparent** backdrop (renders a real alpha cutout — the Render tab exports a PNG with alpha, bypassing the composer so bloom/vignette don't clobber the edges) + a flat **product-white** sweep (`?backdrop=transparent|product-white`) — PR #154
- [x] **Split sleeves front/back** — per-panel fabric now splits the sleeves too (front +z / back −z), each half its own fabric + drape (colour-blocked / two-tone sleeves), matching the body + legs; `sleeveBack→sleeves→body` fallback (`?sleeveBackFabric=`) — PR #155
- [x] **More garments (batch 2)** — Polo shirt · Slim trousers · **Joggers** (tapered + drawstring + a ribbed ankle cuff) · Leggings · Cardigan · Bomber jacket, all data-driven; ribbing now bands the leg hems too — PR #156
- [x] **Turntable spin + AR export** — one-click File → "Record turntable spin" orbits the camera a full turn → a WebM clip (pure `turntablePose` + `recordTurntable`); + **USDZ** export (iOS AR Quick Look) alongside GLB — PR #157
- [x] **Dip-dye / ombré gradient** — a top-down · bottom-up · radial colour gradient baked into the albedo (base → a deeper dipped tone; derived so it tracks a recolour); pure `ombreT`/`ombreDip` unit-tested (`?ombre=`) — PR #158
- [x] **Iridescent / holographic finish** — colour-shifting thin-film eveningwear shaders (iridescent · holographic · oil-slick) driving `MeshPhysicalMaterial.iridescence`; pure `iridescentParams` unit-tested (`?iridescent=`) — PR #159
- [x] **Distressed / washed / faded finish** — a procedural wear map (faded · acid-wash · distressed) bleached into the albedo; pure value-noise `wearValue` + `wearTone` unit-tested (`?wear=`) — PR #160
- [x] **Care-label & content generator** — auto fibre content % + laundering instructions per fabric, folded into the manufacturing pack (HTML + JSON); pure `fibreContent`/`careInstructions` unit-tested — PR #161
- [x] **Skin-tone & complexion picker** — 8 skin tones (fair→deep) × warm/neutral/cool undertones for the default avatar; pure `skinLook` unit-tested, applied to the shared body/GLB material (`?skin=&undertone=`) — PR #162
- [x] **Lace & broderie** — sheer alpha-cutout lace (chantilly · geometric · fishnet) with a scalloped edge; real see-through via `alphaTest` (lining dropped); pure `laceAlpha`/`scallopValue` unit-tested (`?lace=`) — PR #163
- [x] **Faux fur & shearling** — faux-fur · shearling · fleece pile via a seamless directional-pile normal map + matte recipe; pure `furNormal`/`furParams` unit-tested (`?fur=`) — PR #164

**Editing UX**
- [x] **Universal 2D↔3D editing** — the 2D pane drives the same garment — PR #44
- [x] **Quick-edit toolbar over 3D + 2D** — size/neck/sleeve/length/width/hem — PR #48
- [x] **Click-to-type sliders** (exact values) — PR #48
- [x] **Richer + cooler Preview** — neckline/sleeve/size · quick looks · surprise/spin · colour-tinted aurora — PR #44
- [x] **Preview page glow-up** — holographic 3D stage (pedestal glow · colour wash · particles · hologram scanline) + neon-glass UI + juicy interactions (shimmer · glow ripple · slot-machine Surprise · sparkle · tilt · looks-styled counter) — PR #90
- [x] **Measure & annotate** — a tape-measure (click two points on the garment/body → a cm reading) + pinned notes, from the View menu; pure `distanceCm`/`MeasureStore` unit-tested — PR #168

**Stability**
- [x] **Clothes never fly away / explode** — NaN guard + velocity/position stability net; the gown is fixed — PR #47
- [x] **Cleaner fit on the body** — cloth rests further off the surface (less body poke-through), decor (collar/lapel/buttons/hood) sits proud, short sleeves are true mid-bicep caps (less flare) — PR #84
- [x] **Static at default** — garments freeze to rest until you change something — PR #47

---

## 🔄 In progress

- _(nothing right now — pick the next card from the backlog)_

---

## 📋 Backlog / ideas

**Features**
- [ ] **Drop in a real photoreal skin (asset)** — the fallback now renders as warm skin (PR #128) + the GLB slot is the default; the remaining step is dropping an actual CC0 photoreal human `.glb` at `assets/mannequin.glb` (a binary asset)

**Pattern & true sewing** _(the CLO3D / Browzwear core loop: 2D panels → arrange on the body → sew → drape)_
- [ ] **Draw-your-own panel** — sketch a custom 2D panel (freeform + mirror symmetry), then sew it onto the body
- [ ] **Sewing lines & arrangement** — place pattern panels around the avatar with arrangement points, define **seam lines** between panel edges (mismatched lengths eased), then simulate to stitch + drape — the deferred half of #169, built on `ClothWorld` seam constraints
- [ ] **Style lines** — draw a seam across a panel to split it (yoke + body, princess seam, colour-block), then re-sew the pieces; the split grades + exports as separate pattern panels
- [ ] **Internal shapes & notches** — darts, drill holes, notches and internal cut-outs authored on a panel (real fabric take-up in 3D + marked on the flat pattern)
- [ ] **Seam & topstitch types** — a stitch library (plain / french / flat-fell seams; single- vs double-needle topstitch, SPI, thread weight) that reads on the 3D garment and in the tech pack

**Fabric science** _(spec cloth the way a mill / Browzwear FAB does)_
- [ ] **Physical fabric properties** — a fabric editor in **real units** (weight GSM · thickness mm · bending rigidity · stretch % warp/weft · shear) that drives the solver and round-trips into the tech pack, instead of derived presets
- [ ] **Virtual drape test** — a cantilever / circular-drape bench that measures a fabric's **drape coefficient**, so its physics can be validated + compared like real cloth
- [ ] **Fusible interlining & lining layers** — a structured under-layer (fusible / canvas / lining) that stiffens a collar · placket · waistband, simulated + rendered as its own layer

**Trims & notions** _(placed hardware, counted in the BOM)_
- [ ] **Trims & notions library** — functional **zippers (teeth)**, snaps, rivets, eyelets, hook-&-bar, drawcords + elastic, placed on the garment and tallied into the manufacturing BOM
- [ ] **Binding & elastic tape** — bias binding / elastic run along a chosen edge (neckline · armhole · waistband) that finishes + tightens it — CLO's "tape" tool
- [ ] **Functional openings** — a button placket / zip that actually *opens* (the garment gaps at the closure), not just a drawn line

**Fit & simulation tools** _(arrange, fit, analyse — the pro fitting workflow)_
- [ ] **Pin · tack · freeze** — pin cloth to the avatar, tack two points together, freeze a region while arranging — the CLO staples for layout + fitting
- [x] **Draped-mesh fit measure** — measure chest/waist/hip girth on the *simulated* garment (a horizontal plane-slice of the live tube — for each column, where its edge crosses the body height — so it's a true circumference, not a tilted ring), shown live under "On body (draped)" in the panel and refreshed once the drape settles; gives the real **hip** the flat draft can't. Reported as an absolute girth (not ease) since the garment drapes on the live avatar, whose body differs from the abstract measurements — so ease against that reference would be inconsistent, but the measured girth is always true; pure `ringGirthCm` unit-tested + a headless drape test proves the slice tracks the body — PR #181
- [ ] **Pressure / contact fit map** — colour where the garment **presses into** the body (contact force), distinct from the strain + stress views — real fit analysis
- [x] **Ease table** — the numeric girth **ease** (garment − body) at the *drafted* points — **chest + waist** — in the Property panel (signed, tight ease flagged) + the manufacturing spec pack; pure `fitEase` unit-tested. Hip/bicep deferred: the tube has no drafted hip radius (hip clearance is emergent from the drape, not the draft), so a spec-level hip mis-reads — the draped-mesh fit measure (PR #181) gives the real hip — PR #176
- [ ] **Fold arrangement** — pre-fold collars / lapels / cuffs before simulating so structured pieces settle the right way

**More design & construction**
- [ ] **Gathers, shirring & smocking** — elastic-gathered panels + honeycomb smocking detail (3D + a gathered-strip pattern piece)
- [ ] **Convertible details** — wrap-dress ties + drawcords that knot, so one garment styles multiple ways

**More materials & finishes**

**More avatar & scene**
- [x] **Group / runway line-up** — a collection shot of the garment across N colourways rendered side by side into one PNG (composited snapshots — the body/sim is a singleton); pure `lineupCells`/`lineupHues` unit-tested — PR #171
- [x] **Contact shadows & SSAO** — a GTAO ambient-occlusion pass grounds the figure + darkens contact/fold areas (garment↔body, folds, under-arms, pockets); small world radius, no halos; transparent-backdrop path unaffected — PR #170

**More production**
- [x] **Import an existing flat pattern** — read a DXF pattern back in + preview it in the 2D pane (round-trips the export; pure `parsePatternDXF` unit-tested). Draping imported panels onto the body deferred — PR #169
- [x] **Points-of-measure (POM) sheet** — a graded POM table (every spec across XS–XXL with ± tolerances) on the manufacturing pack + JSON; re-runs `garmentMetrics` per size through the app's girth grading, so girths step per size and lengths hold (the app grades girth only — honest to the geometry); pure `pomTable` unit-tested — PR #177
- [ ] **Grade-rule editor** — per-point grade increments so the size run grades like a real pattern, not a uniform girth scale

**AI-assist** _(optional, later — not the focus; the core is the CLO3D/Browzwear CAD workflow above)_
- [ ] **AI design assistant** — describe a garment in words → DesignIO builds the config (garment · fabric · colour · construction details)

**Polish / tech-debt** _(found while building the above)_
- [x] **Live print recolour** — recolouring a printed garment updates the print-canvas base immediately — PR #67
- [x] **Trim the renderer bundle** — rollup `manualChunks` splits three (+ addons) into its own vendor chunk; the app chunk drops ~2.47 MB → ~0.44 MB — PR #167
- [x] **Free print textures on delete** — dispose the print `CanvasTexture`s on print removal / layer delete — PR #67
- [x] **Resource-disposal hardening** — `clearSwatch` now resets the `sleeveBackMaterial` map too (was a stale-texture leak on back panels); `GarmentController.clear()` disposes the shared thread material (leaked per layer-delete); the two decor-dispose loops are one recursive helper (`clearDecorChildren`) that frees nested geometry too — PR #187
- [x] **Error UX & menu affordances** — a non-blocking **toast** system (`ui/toast.ts`, `role="alert"`, auto-dismiss) replaces `window.alert` for failures (open/import/DXF/turntable/line-up/record) + **surfaces export failures** (were silent `console.error`); **Undo/Redo/Paste/Cut/Delete** menu items grey out at their boundaries (empty stack · empty clipboard · last garment), re-evaluated on menu open — PR #188
- [x] **UI consistency & docs** — quick-edit toolbar formats consistently (Length as %, Width/Hem as `N.N cm` reflecting their 0.5-cm steps); the status bar seeds the active garment (no "No selection" flash); the ~15 wired-but-undocumented construction deep-link params (`?sleeveShape`/`pleatStyle`/`lined`/`boning`/… ) added to `CLAUDE.md` — PR #189
- [x] **Session-lifecycle memory-leak fixes** — leaving/re-entering the studio no longer strands resources: `MeasureTool.dispose()` removes its canvas pointer listeners + frees its gizmo geometry/HTML overlay (wired into studio teardown); teardown now stops the 15-s autosave `setInterval` + its `beforeunload` handler (were left firing against a torn-down stack); the turntable + timeline WebM recorders stop their `canvas.captureStream()` tracks on stop/error (were leaking the capture stream); fabric-photo/print/swatch importers `revokeObjectURL` their blob URLs once the bitmap has decoded (`panel.ts` ×2, `StartPage.ts`) — all conservative, no behaviour change
- [x] **Second leak sweep** — start-page `PreviewStudio.applyLook` now disposes the previous design's albedo + bump `CanvasTexture`s before rebuilding (they leaked on every colour/print/textile change; mirrors `GarmentStack`'s existing `disposeDesign`), and `PreviewStudio.dispose()` frees the last one on teardown; the three image importers gained an `img.onerror` that revokes the blob URL so a corrupt image can't strand it. Verified via a fan-out of listener/observer + Three-resource + timer/URL/stream leak-hunt agents (no other real leaks; module singletons deliberately left alone)
- [x] **Skip per-frame mesh recompute at rest** — `XPBDSolver` now exposes `advanced` (true when the step integrated OR the cloth is awake — the latter catches a piece a post-step `ClothCollision` woke), and `GarmentController.updateMeshes` skips the `computeVertexNormals` + `position.needsUpdate` GPU re-upload + topstitch rebuild for any resting piece. At the default state (garments hang still, solvers asleep) the render loop now does no per-frame cloth-mesh work; animation/wind/edits wake it and refresh normally. Unit-tested (`advanced` true while draping → false once asleep → true when woken); verified the dress still drapes mid-walk and the gown holds its settled drape at rest
- [x] **Skip + de-allocate the collision pass at rest** — `GarmentStack.step` now runs the global `ClothCollision` only when some visible piece `anyAdvanced()` (moved this frame); at full rest every piece is asleep and stably separated (a collision move wakes the piece it touches, so a real overlap can't go unresolved), so the whole hash + neighbour pass is skipped. `ClothCollision` also reuses a pooled set of cell buckets + the moved-pieces `Set` across frames (was allocating both per call) so the pass is allocation-free during animation. Verified a hoodie-over-maxi-skirt layered outfit stays separated both mid-walk (collision runs) and fully settled at rest (collision skipped, no interpenetration)
- [x] **Fix blank prints/textiles in the studio** — the fabric-thickness lining shell was pushed *outward* over the printed surface (tube normals point inward); push it inward so the albedo map shows — PR #108
- [x] **Wire the library search + filters** — fabric browser filters by family · weight · stretch (combined with the text search); pure `matchesFabric` unit-tested — PR #165
- [x] **Autosave + crash recovery** — snapshots the working `.dio` doc to localStorage every 15 s + on close; a fresh launch offers to recover it via a non-blocking banner; pure `parseSnapshot`/`shouldOfferRestore` unit-tested — PR #166
- [ ] **Golden-image snapshot tests in CI** — capture a few key looks and diff them each PR to catch visual regressions

---

## 🧢 Headwear & neckwear _(hats · beanies · ski masks · scarves · head scarves — a full build-out)_

- [x] **Rigid headwear/neckwear accessories** — beanie · cap · bucket hat · balaclava (ski mask) · scarf · neck gaiter added to the avatar `Accessories` system, placed by the **head/neck frame** so they ride the animated head (crown dome + folded cuff, cap dome + curved bill, bucket dome + brim, full-head shell, neck loop + tails, knit tube); `accessoryAnchors` now exposes the head-frame basis + neck ring; pure placement math unit-tested; auto-wired into the `?accessories=` deep-link + Avatar-panel toggles — PR #182

**Cloth-sim foundation** _(make the drape-y pieces real catalog garments — refine `garments/schema` · `factory` · `avatar/Mannequin` · `garment/GarmentController`)_
- [x] **Head/neck anchor** — `head` added to `BodyAnchors` + `AnchorKey`; a pure `headAnchor(colliders)` builds the crown+basis `Matrix4` from the head frame (works for the procedural body + the GLB head bone) and `Mannequin.anchors()` returns it live so it turns/nods with the head — the frame a cloth-sim `headTube` pins to; unit-tested — PR #183
- [x] **`headTube` piece kind** — a tube anchored at the crown/neck running down over the head/neck (`schema` `HeadTubePiece` + `factory` `headTubeToSpec`; denser rings so a short piece still drapes); collides with the head/neck capsules for free; wired through `buildGarment` + `garmentTubeSpecs`/`garmentPatternSpecs`. Shipped the first cloth-sim neckwear — a draping **snood** (cowl) catalog garment; `headTubeToSpec` + the build unit-tested + a headless drape-stability check — PR #184
- [ ] **Headwear category** — add `accessory`/`headwear` to `GarmentCategory` + the Library picker + garment icons
- [x] **Expose `headR`/`neckR` in `Measurements`** — added to the interface + `measurementsFor`/`applyBody` (scale with build), so `headTubeToSpec` + headwear fit read them — PR #184
- [x] **Pin headwear to the head anchor** — `bindPinsToBody` routes a crown headwear piece (a beanie/hat) to the **head** anchor via a pure `pieceAnchor(name,…)` (head → head · sleeve → arm · else → nearer of torso/hip), so it turns/nods with the head; shipped a cloth-sim **beanie** catalog garment (crown `headTube`) that rides the head; `pieceAnchor` unit-tested + a headless drape-stability check — PR #185
- [ ] **Snug-knit collision tuning** — a tighter `bodySkin`/offset for knits so a beanie hugs the crown without hovering
- [x] **Cloth-sim draping scarf** — a flat **open** knit panel (new `scarfPanel` piece → `buildScarf`/`fillScarf`, solved with `wrapX: false`) wrapped once around the neck: the collar is pinned as a stable band that follows the body, the two front tails hang + drape under gravity clear of the chest; a robust width frame (vertical on the collar → horizontal on the tails) so it can't collapse; `wrapX` threaded through `SimPiece`/`Piece`/solver; `fillScarf`/`buildScarf` + a headless drape-stability check unit-tested — PR #186
- [ ] **Cloth-sim ski mask (balaclava)** — a conforming knit shell with a real **face-opening cut-out** (dead particles for eyes/mouth, reusing the cut-out mechanism)

**Beanies & knit caps**
- [ ] **Cuffed beanie** — a folded-up ribbed brim (double-layer band) with an adjustable cuff height
- [ ] **Slouchy beanie** — extra crown length that slouches/drapes at the back
- [ ] **Fisherman / rolled beanie** — a short tight rolled brim, minimal crown
- [ ] **Pom-pom beanie** — a faux-fur / yarn pom on the crown
- [ ] **Ear-flap / trapper beanie** — ear flaps (+ ties) and a faux-fur lining
- [ ] **Knit structure** — a rib / waffle / cable knit normal map + gauge for beanies
- [ ] **Beanie fit** — crown-depth + brim-height + ear-coverage controls
- [ ] **Beanie stretch (negative ease)** — a knit that stretches snug over the head

**Structured hats**
- [ ] **Baseball cap** — a 6-panel crown + a curved bill + a top button; a front-panel logo area
- [ ] **Bill curvature control** — flat (snapback) → curved (dad hat)
- [ ] **Cap closure** — snapback / strapback / fitted band at the back
- [ ] **Trucker cap** — a foam front + a mesh back panel
- [ ] **Bucket hat controls** — brim-width + crown-height; reversible option
- [ ] **Fedora / trilby** — a pinched crown crease + a grosgrain hat band
- [ ] **Wide-brim sun hat** — a large floppy brim (drapes slightly)
- [ ] **Beret** — a soft flat disc pulled to one side
- [ ] **Flat cap / newsboy** — a panelled crown + a short stiff front brim

**Scarves & neckwear**
- [ ] **Rectangular scarf** — length / width params + fringe ends
- [ ] **Infinity / loop scarf** — a closed loop, worn single or doubled
- [ ] **Blanket scarf** — an oversized square with a plaid check + fringe
- [ ] **Silk neck scarf** — a small square knotted at the neck (knot styles)
- [ ] **Snood / cowl** — a wide knit tube around the neck
- [ ] **Neck gaiter / buff** — a thin stretch tube (pull up over the nose)
- [ ] **Scarf drape styles** — once-around · wrapped · draped-tails · Parisian knot
- [ ] **Fringe & tassels** — a configurable knotted fringe / tassel trim on scarf ends

**Head scarves & wraps**
- [ ] **Bandana** — a folded triangle tied at the back
- [ ] **Headscarf / hijab wrap** — a draped wrap over the head + neck, tied at the nape
- [ ] **Turban** — a wrapped + twisted turban form
- [ ] **Do-rag / wave cap** — a tight skull wrap with tail ties
- [ ] **Wrap-tie styles** — front-knot · nape-knot · turned-back · long-tail
- [ ] **Head-wrap print** — a repeating scarf print / pattern mapped onto the wrap

**Materials & finish**
- [ ] **Knit-yarn material** — a wool / acrylic matte knit with rib / cable normal + sheen (reuse `FabricMaterial`)
- [ ] **Faux-fur trim** — pom-poms, trapper flaps, brim fur (reuse the `fur` finish)
- [ ] **Felt / wool-melton** — a dense matte felt with a subtle nap for structured hats
- [ ] **Silk / satin** — a drapey lustrous finish for neck scarves
- [ ] **Brim stiffener** — a buckram / wire brim so a sun-hat / fedora brim holds its shape
- [ ] **Reflective / hi-vis + embellished** — reflective knit, sequins, beading on headwear

**Fit, patterns & production**
- [ ] **Head-circumference sizing** — measure head circ + a hat size run (XS–XL / cm) + grading
- [ ] **Beanie flat pattern** — gore panels / a knit tube + crown, on the 2D pane + DXF
- [ ] **6-panel cap pattern** — the 6 crown panels + bill + sweatband
- [ ] **Bucket-hat pattern** — crown + side band + brim ring
- [ ] **Balaclava / ski-mask pattern** — face + head panels with the opening
- [ ] **Headwear tech-pack** — POM (head circ · crown height · brim width) + knit gauge + a trims BOM (button, closure, pom)
- [ ] **Scarf / wrap pattern** — a rectangle / triangle + fringe + grainline

**Avatar & UX**
- [ ] **Hair under headwear** — flatten / hide hair under a snug beanie / cap; a ponytail through the cap back
- [ ] **Headwear layering** — sits over hair + under a hood; plays nice with other layers
- [ ] **Tracks head turn / nod** — verify placement follows the animated head frame under all poses
- [ ] **Headwear colourways + presets** — colour / pattern each piece; per-type quick-look presets
- [ ] **Headwear in the Library + runway line-up + projects** — category, icons, and inclusion in the collection shot

---

## 🔬 Refinements & polish _(deepen what's already shipped — each is a small, self-contained card)_

**Cloth & drape realism** _(refine the XPBD solver — PRs #53 · #65 · #69 · #121)_
- [x] **Adaptive remeshing** — spread a tube's fixed ring budget non-uniformly, packing rings where the silhouette bends (waist cinch · flare onset · puff-sleeve bell · neckline) and leaving straight runs uniform, so folds resolve where they nucleate at no extra particle cost; curvature-driven + clamped so no rest length degenerates (solver unchanged — rest lengths come from the geometry); ring-t drives the UVs so prints stay put; pure `adaptiveRingT` unit-tested — PR #173
- [ ] **Weave-anisotropic bend** — cloth bends easier along the weave than across (warp vs weft) so twill/denim crease differently from plain weave
- [ ] **Per-fabric self-collision thickness** — scale the particle-repulsion radius by the fabric's physical thickness (thick wool holds layers apart, chiffon nests close)
- [ ] **Body friction / cling** — high-grip knits cling to the body, slippery satin slides down + pools at the hem
- [ ] **Weighted hems** — a heavier bottom ring so gowns/drapes hang plumb (chain-weight couture look)
- [ ] **Seam pucker** — a slight gather right at the seams for a hand-finished read
- [ ] **Trapped-air puff** — a gentle outward pressure on quilted/puffer panels so they loft instead of hanging flat
- [ ] **Body wind occlusion** — the leeward side of the garment catches less wind than the windward side
- [ ] **Spring pins** — a little give where garments pin to the shoulders/hips so they don't look glued on

**Construction detail depth** _(refine PRs #45 · #81 · #86 · #88 · #94 · #98 · #102 · #106)_
- [ ] **Real dart take-up** — darts actually remove a wedge of fabric (shape the bust/waist), not just a drawn line
- [ ] **Collar-stand + spread controls** — band-height + collar-spread sliders
- [ ] **Cuff depth + button count** — configurable cuff width and 1-/2-button barrel cuffs
- [ ] **Pleat depth + count sliders** — control how deep and how many pleats, beyond the style
- [ ] **Real buttonholes** — buttonhole slits beside the button column (3D + on the pattern)
- [ ] **Double-breasted plackets** — a second button row + a wider front overlap
- [ ] **Lapel width + peak/notch angle** — configurable lapel geometry
- [ ] **Hem vents** — a back/side vent slit that opens a little at the hem when walking
- [ ] **Trouser turn-up cuffs** — a folded-up trouser-hem option (+ belt loops around the waistband)
- [ ] **Structured shoulders** — a shoulder-pad toggle for blazers/coats

**Materials & finish controls** _(refine PRs #108 · #110 · #116 · #118 · #120 · #158 · #159 · #160 · #163 · #164)_
- [ ] **Ombré: pick the dip colour + a diagonal direction** — not just a derived tone / vertical-radial only
- [ ] **Textile pattern scale + rotation + grainline align** — resize/rotate stripes & plaids to the cut
- [ ] **Textile: pick both tones** — choose the pattern's two colours instead of deriving from the base
- [ ] **Lace as a trim band** — apply lace to just the hem/yoke, not the whole garment; + a motif-scale slider
- [ ] **Fur pile length + comb direction** — sliders; + fur as a collar/cuff/hem trim only
- [ ] **Sparkle density** — a facet-count control per sparkle finish
- [ ] **Quilt loft depth** — control how puffy the quilting reads
- [ ] **Wear intensity + zone-targeted distress** — light fade → heavy destroy, concentrated at knees/elbows/hem (strain-driven)
- [ ] **Velvet nap / leather grain** — directional sheen (velvet shifts with view angle; leather gets a subtle grain)
- [ ] **Swatch import: real-world tile size + keep-photo-colour toggle** — set the swatch's cm scale; tint vs keep original colours
- [ ] **Embroidery thread sheen + direction** — a satin-stitch highlight along the stitch angle

**Prints & graphics** _(refine PRs #51 · #112 · #114 · #116)_
- [ ] **Prints warp with the drape** — logos/text distort over folds (currently flat on the albedo)
- [ ] **Print opacity + blend mode** — semi-transparent / multiply onto the fabric
- [ ] **Arched / curved text** — bend text along an arc (team-jersey style)
- [ ] **All-over repeat of a placed print** — tile one motif across the whole garment
- [ ] **Per-print recolour** — recolour a single print, not just the whole design at once
- [ ] **Higher-res design canvas** — crisper prints on the 2K/4K Render tab

**Avatar & body** _(refine PRs #128 · #130 · #132 · #136 · #150 · #162)_
- [ ] **Skin tone blends a textured GLB** — tint the GLB skin texture instead of replacing it
- [ ] **More hairstyles + hair sway** — braids · bun · ponytail · curly; hair moves on the walk
- [ ] **Face-shaping sliders** — nose/jaw/eye-spacing; an optional freckle/blemish map
- [ ] **Hand poses** — relaxed vs fist; posed fingers on the GLB
- [ ] **Heeled foot pose** — angle the foot so heels/shoes sit correctly on the ground
- [ ] **A couple more body archetypes** — teen · senior · muscular presets

**Lighting, scene & rendering** _(refine PRs #74 · #152 · #154 · #170)_
- [ ] **HDRI environment options** — a few real HDR studio maps for reflections beyond the procedural IBL
- [ ] **Depth of field on the Render tab** — a subtle focus falloff (product-macro look)
- [ ] **Colour-grade / LUT presets** — warm / cool / film looks on the render
- [ ] **Backdrop gradient editor** — pick the cyclorama's own two colours
- [ ] **Rim-light colour + intensity** — art-direct the rim lights per look
- [ ] **Shadow softness control** — soften/harden the key-light shadow
- [ ] **Camera lens presets** — 35 / 50 / 85 mm framing for the viewport

**Animation, camera & clip** _(refine PRs #134 · #157)_
- [ ] **Per-keyframe ease curves** — linear / ease-in-out / bounce on the timeline
- [ ] **Turntable options** — configurable duration · turns · direction
- [ ] **Walk speed + stride length controls**
- [ ] **MP4 / GIF export** — transcode the recorded WebM clip

**Pattern & production** _(refine PRs #39 · #41 · #114 · #169)_
- [ ] **Grainline arrows + piece labels + cut-count** ("cut 2 / on fold") on the flat pattern
- [ ] **Marker / nesting layout** — auto-arrange panels to minimise fabric on the DXF/SVG
- [ ] **Per-edge seam allowance** — different SA on hems vs seams
- [ ] **Full size-run export** — the graded pattern XS–XXL in one file
- [ ] **Drape the imported pattern onto the body** — the deferred half of PR #169
- [ ] **Tech-pack: colourway pages + a notions/trims BOM** (thread, zips, buttons)

**Fit analysis** _(refine PRs #138 · #148)_
- [ ] **Ease map** — colour the tight vs loose zones (negative/positive ease)
- [ ] **Strain-direction arrows** — show which way the cloth pulls, not just how hard
- [ ] **Numeric fit report** — max strain + tightest zone summarised in the panel

**Colour & colorways** _(refine PRs #124 · #126)_
- [ ] **Colorway thumbnails render the real garment**, not a flat swatch
- [ ] **Per-part colorways** — vary sleeve/back/trim within a single saved colorway
- [ ] **Palette generator** — a harmonious colorway set from one picked colour
- [ ] **Nearest-Pantone for every part** — production refs for trim/sleeve/back too

**Library & editing UX** _(refine PRs #40 · #44 · #48 · #165)_
- [ ] **Garment browser filters** — by category / length / sleeve, like the fabric filters
- [ ] **Global search** — garments + fabrics + colours + presets in one box
- [ ] **Favourites / recents row** in the Library
- [ ] **Multi-select layers** — recolour/edit several garment layers at once
- [x] **Keyboard-shortcuts overlay** (press `?`) — a dismissible cheat-sheet modal (`ui/shortcutsOverlay.ts`) listing every shortcut + a Help-menu entry; Esc/click to close — PR #189

**Performance** _(refine PRs #142 · #167)_
- [ ] **Cloth solver in a Web Worker** — run the sim off the main thread
- [ ] **Lazy-load the heavy exporters** (GLTF / USDZ / OBJ) on first export
- [ ] **Instance the decor geometry** (ribbing / boning / stitch lines) to cut draw calls

---

## 🛠 Engineering deep-dives _(concrete core-tech cards — solver / geometry / pipeline internals; each self-contained + unit-testable)_

**Cloth solver — XPBD internals** _(refine `cloth/XPBDSolver`)_
- [ ] **Structure-of-arrays constraints** — replace `Constraint[]` (array of objects) with parallel typed arrays (`i`/`j`/`region` `Int32Array`, `rest`/`compliance` `Float32Array`) so the Gauss-Seidel hot loop is cache-linear; existing solver tests guard behaviour, benchmark the step time
- [ ] **Warm-start λ across frames** — persist `lambda` (decay-scaled) between frames instead of `fill(0)` every substep so constraints converge in fewer passes; unit-test faster settle on a stretched patch
- [ ] **Long-range tethers (LRA)** — unstretchable tether constraints from each particle to its nearest pin (max rest = geodesic distance) to kill the gravity over-stretch of long gowns without stiffening bend; pure `tetherRest` unit-tested
- [ ] **Strain limiting** — a post-projection clamp of per-edge stretch to a fabric max (woven ≈3 %, knit ≈30 %), decoupled from `stretchCompliance`; pure `clampStrain` unit-tested
- [ ] **Dihedral bending constraint** — swap the skip-one distance "bend" for a real dihedral-angle bend across each shared edge (Bridson/Müller) with a controllable rest angle; pure angle+gradient math unit-tested
- [ ] **Bending plasticity (wrinkle memory)** — once a bend passes a yield angle, shift its rest angle so the crease persists after the load lifts (permanent wrinkles / packed-in-a-suitcase look); pure `yieldRest` unit-tested
- [ ] **Area-weighted particle mass** — set `invMass` from real GSM × the particle's Voronoi triangle area, not a flat `mass/count`, so adaptively-remeshed dense rings aren't artificially heavy; pure `voronoiAreas` unit-tested
- [ ] **Air-pressure / volume constraint** — a signed-volume preservation constraint over a closed tube for puffers & balloon sleeves (implements the trapped-air puff); pure volume + gradient unit-tested
- [ ] **CFL adaptive substeps** — scale substeps by the frame's max particle speed so fast body motion stays stable without over-solving at rest; pure `substepsForSpeed` unit-tested
- [ ] **Consistent XPBD damping** — replace the `1 − damping·dt` velocity scale with Rayleigh/global damping that leaves rigid-body translation untouched (Baraff-Witkin); test free-fall stays undamped
- [ ] **Per-triangle aero drag** — derive drag/lift from each triangle's area · normal · relative wind instead of a per-vertex normal, so billow scales with true surface area; pure `triAeroForce` unit-tested
- [ ] **Solver iterations knob** — expose N Gauss-Seidel passes per substep (currently 1) as a quality axis distinct from substep count; unit-test convergence vs iteration count

**Collision & contact** _(refine `cloth/ClothCollision`, `cloth/BodyCollider`, `XPBDSolver.solveCollisions`)_
- [ ] **Continuous self-collision (CCD)** — swept particle-vs-particle test so fast layers don't tunnel in `ClothCollision`; pure segment closest-approach unit-tested
- [ ] **Coulomb friction cone** — replace the `1 − friction` tangential scale with a proper static/kinetic friction cone at body + ground contacts; pure `applyFriction` unit-tested
- [ ] **BVH refit, not rebuild** — refit the body `three-mesh-bvh` from the skinned positions each frame instead of rebuilding, so mesh-accurate collision is cheap on the walk; measure per-frame cost
- [ ] **Collider broadphase binning** — bucket capsules in the spatial hash so `solveCollisions` tests only nearby capsules, not all of them; pure broadphase unit-tested
- [ ] **Vertex–face body contact** — add triangle-face push-out (not just closest-point) so cloth can't poke a body corner through; pure point-in-triangle + push unit-tested
- [ ] **Contact-pressure buffer** — accumulate per-particle contact impulse magnitude for the pressure/fit map; pure normalisation unit-tested
- [ ] **Untangle pass** — a global sign/flood-fill resolve (ICM) to recover already-interpenetrating layers on load/edit; unit-test on a seeded tangle

**Geometry & mesh** _(refine `cloth/Garment`, `finishTube`, `cloth/ClothMesh`)_
- [ ] **Seam-UV duplication** — duplicate the wrap seam column (an extra u = 1 column sharing seam positions) so the texture doesn't run backwards across the back seam quad; test UV continuity
- [ ] **Crease normals (hard edges)** — split normals at a marked ring (waistband / collar fold / pressed edge) so it reads as a crisp crease instead of a smooth roll; test normal split at the crease row
- [ ] **Watertight export weld** — weld duplicated seam vertices (+ optional neck/hem caps) for a manifold glTF/OBJ/USDZ; unit-test edge-manifoldness
- [ ] **Draped normal-map bake** — bake a dense drape's fold normals into a tangent-space normal map on a coarse mesh (fold detail without particles); pure bake math unit-tested
- [ ] **Tangent attribute** — compute + store per-vertex tangents from the UVs so normal/anisotropy maps light correctly on the tube; test orthonormality
- [ ] **Swept-frame sleeves** — rings perpendicular to a *curved* arm path (parallel-transport frames) so a bent-elbow sleeve doesn't kink; pure frame-transport unit-tested
- [ ] **Quadric decimation LOD** — QEM edge-collapse to an export LOD budget; pure collapse-cost unit-tested

**Pattern & flattening** _(refine `export/garmentPattern`, `pattern/pattern`)_
- [ ] **LSCM mesh flattening** — flatten the *actually-draped* 3D garment to 2D via least-squares conformal maps (a true pattern from the sim, beyond the analytic tube unwrap); pure LSCM solve unit-tested on a known developable
- [ ] **Seam-length matching + notches** — check sewn edge pairs are equal length (ease-adjusted) and drop balance notches at matched fractions; pure `matchSeam` unit-tested
- [ ] **Seam-allowance polygon offset** — real inward/outward offset with miter/bevel joins per edge (honours per-edge SA), not a uniform scale; pure offset unit-tested
- [ ] **Dart true manipulation** — pivot/close a dart about a point and redistribute the take-up (real pattern-making), reflected in 3D + 2D; pure dart-rotation unit-tested
- [ ] **Grade-rule engine** — per-point X/Y grade increments driving the whole size run (feeds the size-run export + POM); pure `gradePoint` unit-tested
- [ ] **AAMA/ASTM DXF layers** — emit the standard layer codes (1 cut · 8 notch · 13 grainline · 14 drill · internal) so the DXF opens right in Gerber/Lectra; unit-test layer assignment

**Materials & shading** _(refine `cloth/FabricMaterial`, `fabric/*`)_
- [ ] **Sheer transmission** — drive `MeshPhysicalMaterial.transmission`/`thickness` for chiffon/organza (real see-through), dropping the opaque lining shell; snapshot-verified
- [ ] **Order-independent transparency** — weighted-blended OIT so stacked sheer layers don't flicker with draw order; verify with two overlapping sheer garments
- [ ] **Distinct back-face shading** — a duller, print-free back-face material on `DoubleSide` fabric via back-face detection; test the two-material path
- [ ] **Per-garment texture atlas** — pack per-part albedo/normal/rough into one atlas so a multi-part garment is one draw call; pure UV-repack unit-tested
- [ ] **Procedural weave AO** — bake a self-shadow term into the weave map so the grain occludes itself; pure `weaveAO` unit-tested

**Production pipeline** _(refine `export/manufacture`, `export/techpack`, `export/careLabel`)_
- [x] **Marker making — nest + realistic yield + efficiency** — nest the flat panels into the fabric width (first-fit decreasing-height shelf pack of the panel bounding boxes, rotating to fit) → real **marker length** (replaces the old area÷width optimistic yardage), **efficiency %** (true area ÷ marker area) + a preview SVG on the pack; pure `nestMarker` unit-tested. Covers *Fabric yield estimate* + *Marker efficiency %*; a rectangle approximation (true shape-nesting interlocks tighter) — PR #178
- [ ] **Cost sheet** — fabric yield × price + trims BOM + labour minutes → a landed cost/unit on the pack; pure `costRollup` unit-tested
- [ ] **BOM CSV export** — the fabric + trims BOM as CSV (supplier / ref / qty / uom) beside the HTML pack; pure serialiser unit-tested
- [x] **ISO 3758 care symbols** — the wash/bleach/dry/iron/dry-clean pictograms drawn as inline SVG on the pack, variant read from the derived care lines (keyword-mapped, text stays the source of truth) + `care_symbols` in the JSON; pure `careSymbols` unit-tested across every fabric — PR #180
- [x] **Thread consumption** — total seam length × the lockstitch consumption ratio (≈2.5×, +10% waste) → thread metres in the BOM + JSON; pure `threadMetres` unit-tested — PR #179

**Performance & architecture**
- [ ] **WASM solver hot loop** — compile the XPBD substep (integrate + constraint projection) to WASM for a 2–4× main-thread win over the JS loop; behaviour guarded by the solver tests
- [ ] **Constraint graph colouring** — greedy-colour the constraint graph into independent batches (prereq for Jacobi / Worker / GPU parallelism); pure `colorGraph` unit-tested (no two same-colour constraints share a particle)
- [ ] **Deterministic snapshot mode** — freeze wall-clock time + seed any RNG (turntable phase, surprise-me hues) so a deep-link renders bit-identically — unblocks the golden-image tests; test a bit-identical repeat
- [ ] **Geometry lifecycle audit** — dispose geometries/materials/textures on garment rebuild + layer delete, with a `dispose()` on `GarmentController`; test no orphaned GPU resources across a build→delete loop
- [ ] **Fixed-timestep accumulator** — decouple sim `dt` from the render frame rate with an accumulator + state interpolation in `core/Loop`, so drape is identical at 30/60/144 Hz; pure `accumulate` unit-tested

**Robustness & testing**
- [ ] **Energy / NaN guard** — a shared test asserting each catalog garment's kinetic energy stays finite + bounded across N steps (catches divergence the eye misses)
- [ ] **`.dio` round-trip fuzz** — randomised project docs survive `serializeDoc` → `parseDoc` unchanged (fuzz the layer/colorway set); guards the save format
- [ ] **Solver determinism test** — the same seeded state produces bit-identical positions on repeat (pairs with deterministic snapshot mode)

---

_Update this board as things ship — check the box + note the PR._
