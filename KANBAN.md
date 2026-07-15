# DesignIO — Progress board

A living kanban so you can always see what's shipped, what's cooking, and what's next.
_Ship rule: one feature per branch → green CI (Node 20/22) → merge to `main`._

Legend: ✅ done · 🔄 in progress · 📋 backlog

_Latest sweep — 2026-07-14: **the headwear perfection tier is at 36 of 72 cards (PRs #309–#333)** —
the **ski mask & balaclava group (10/10)** and the **structured hats group (12/12)** are ✅ COMPLETE
(crown shapes · hat bands · cap bill/panels/puff embroidery · cowboy · top hat & bowler · boonie ·
baker boy · visor · straw weave, all on the parametric brim keystone), beanies at 9/10 (crown-decrease
swirl deferred). Suite 883. **GitHub Actions is billing-blocked** (Settings → Billing) — every PR since
#315 merged on local verification, and a full **manual containerized CI run** (Node 20/22 check matrix +
the SwiftShader golden job in Docker) came back green at #329's HEAD. README fully re-captured
post-hats-group with the new structured-hat-studio section (PR #334, 55 shots)._

_Earlier sweep — 2026-07-12: PRs #244–#277 (48 cards) — the fit-analysis trio, functional openings +
tearing, activewear/fabric/headwear catalog growth, the capture suite, the production paperwork loop,
storm wind, walk styles, posture presets, shortcut editor + a bug sweep._

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

**Rendering & fabric quality (2026-07-15 — a fabric/garment rendering audit)**
- [x] **Satin reads smooth, not beaded** — the satin weave's deep every-5th-cell binding dip baked a polka-dot grid across satin / charmeuse / velvet / lamé / sequin; made `weaveHeight('satin')` float-dominant + refreshed the 4 satin/silk README photos — PR #359
- [x] **Corduroy has vertical cords** — corduroy was weave `'twill'` (a diagonal); added a dedicated `'corduroy'` vertical-wale weave (rounded pile-topped cords over deep valleys) — PR #360
- [x] **Sewn-panel body friction** — `ClothWorld.solveBody` never damped tangential slide; now mirrors `XPBDSolver` (a grippy knit clings, satin slides) — PR #357
- [x] **Seam-continuous textiles** — `textileValue` camo/plaid weren't periodic and showed a hard tile seam; integer-frequency camo + edge-straddling plaid band → tiles cleanly — PR #357
- [x] **Waffle-knit reads flat** — rebuilt the waffle weave as a chunky 2×2-thread thermal honeycomb so the relief reads at garment scale + a README photo — PR #367
- [x] **Fleece reads as a net** — a napped-knit path gives fleece a soft fuzzy pile (fur normal + matte surface) instead of the crisp knit net + a README photo — PR #369
- [x] **Leather & suede read as woven** — both were `weave: 'plain'` (a crosshatch); added a dedicated `'leather'` weave (a shallow pebbled grain, not a woven cross) so leather reads as smooth grained hide + suede as matte grain + a README photo — PR #371
- [ ] **Long-sleeve/shoulder jut (HIGH, diagnosed not fixed)** — the body-tube shoulder splays into a jut; root cause + fix location + golden-update path fully written up in the 🐞 Rendering bugs section — PR #362/#363/#364 (diagnosis)

---

## 🔄 In progress

- _(nothing right now — pick the next card from the backlog: scarves & neckwear is the open headwear group)_

---

## 📋 Backlog / ideas

**Next 15** _(queued 2026-07-12 — well-scoped, non-AI, each buildable on shipped machinery)_
- [x] **High-low & asymmetric hems** — pure `bottomEdge` (the topEdge mirror) feeds both the 3D fill and the 2D unwrap; picker + `?hemShape=` — PR #283
- [x] **Sleeve length stops** — elbow · ¾ · bracelet along the arm chain, tapering past the elbow; + fixed the 3D path ignoring sleeveGradeM — PR #284
- [x] **Jewellery accessories** — pearl strand (chest-clearance asserted headlessly) + gold hoops on the head/neck frames (`?accessories=necklace,hoops`) — PR #285
- [x] **Pilling & fuzz aging** — hashed pill-bobble normal field + matte fuzz lift, Appearance slider + `?pilling=<0..1>` (`fabric/pilling`) — PR #282
- [x] **Colour-harmony palette picker** — wheel schemes from the current colour with readability clamps, one-click apply (`fabric/harmony`) — PR #281
- [x] **Print repeat preview** — the same paintTextile under a girth-calibrated cm ruler (`ui/repeatPreview`, textile-picker button) — PR #287
- [x] **Drape swatch comparator** — two short-rod-pinned squares in a live overlay mini-scene; same fabricToSolverParams as the garments (`ui/drapeComparator`, View menu) — PR #290
- [x] **Slip / smoothing underlayer** — a simulated, colliding, never-rendered slip layer (`underlayer` flag + pure `layerShown`; Scene toggle · `?slip=1`) — PR #291
- [x] **Steam & press tool** — the virtual iron: drag raycasts the cloth, `pressAt` Laplacian-smooths inside the radius with falloff + velocity drop (View menu) — PR #292
- [x] **Strain on the 2D pattern** — per-panel mean-tension tint in the 2D pane while a strain view is on (`panelStrains` + `strainTint`; exports untinted) — PR #286
- [x] **Hanger shot** — ghost + collider swap to a thin hanger bar (true limp hang) + a wire-hanger prop (`studio/hangerShot`, View menu, `?hanger=1`) — PR #288
- [x] **Wind compass dial** — a drag compass (direction + radial strength) synced with the sliders/presets (`studio/windDial`) — PR #280
- [x] **Pattern annotations** — + Note tool in the 2D toolbar; mm-space pins → SVG flags + DXF ANNOTATION TEXT, importer round-trips; persisted on the layer — PR #289
- [x] **Size-run strip** — XS→XXL worn side by side, block-labelled, settled synchronously per size (`studio/sizeRunStrip`, File menu) — PR #278
- [x] **Anatomy camera bookmarks** — five measurement-derived framings in the bookmarks panel; they reframe with resizes/presets (`studio/anatomyShots`) — PR #279


**Features**
- [ ] **Drop in a real photoreal skin (asset)** — the fallback now renders as warm skin (PR #128) + the GLB slot is the default; the remaining step is dropping an actual CC0 photoreal human `.glb` at `assets/mannequin.glb` (a binary asset)

**Pattern & true sewing** _(the CLO3D / Browzwear core loop: 2D panels → arrange on the body → sew → drape)_
- [x] **Draw-your-own panel** — sketch a custom 2D panel (freeform + mirror symmetry), then sew it onto the body — PR #298
- [x] **Sewing lines & arrangement** — place pattern panels around the avatar with arrangement points, define **seam lines** between panel edges (mismatched lengths eased), then simulate to stitch + drape — the deferred half of #169, built on `ClothWorld` seam constraints — PR #299
- [x] **Style lines** — draw a seam across a panel to split it (yoke + body, princess seam, colour-block), then re-sew the pieces; the split grades + exports as separate pattern panels — PR #300
- [x] **Internal shapes & notches** — darts, drill holes, notches and internal cut-outs authored on a panel (real fabric take-up in 3D + marked on the flat pattern) — PR #301
- [x] **Seam & topstitch types** — a stitch library (plain / french / flat-fell seams; single- vs double-needle topstitch, SPI, thread weight) that reads on the 3D garment and in the tech pack — PR #302

**Fabric science** _(spec cloth the way a mill / Browzwear FAB does)_
- [x] **Physical fabric properties** — a fabric editor in **real units** (weight GSM · thickness mm · bending rigidity · stretch % warp/weft · shear) that drives the solver and round-trips into the tech pack, instead of derived presets — PR #303
- [x] **Virtual drape test** — a cantilever / circular-drape bench that measures a fabric's **drape coefficient**, so its physics can be validated + compared like real cloth. The Cusick circular-drape bench runs **on the live solver** (a fabric disc settles over a capsule pedestal → shadow-area **drape coefficient %**, deterministic, milliseconds); the Peirce cantilever **bending length** is derived from flexural rigidity (G = w·c³ — an in-sim strip is non-physical at that scale: every fabric hangs a thin strip near-vertical). `🧪 Virtual drape test` button under Appearance + `?drapeTest=1`; unit-tested against real-world bending-length ranges (`fabric/drapeBench`) — PR #304
- [ ] **Fusible interlining & lining layers** — a structured under-layer (fusible / canvas / lining) that stiffens a collar · placket · waistband, simulated + rendered as its own layer

**Trims & notions** _(placed hardware, counted in the BOM)_
- [ ] **Trims & notions library** — functional **zippers (teeth)**, snaps, rivets, eyelets, hook-&-bar, drawcords + elastic, placed on the garment and tallied into the manufacturing BOM
- [ ] **Binding & elastic tape** — bias binding / elastic run along a chosen edge (neckline · armhole · waistband) that finishes + tightens it — CLO's "tape" tool
- [x] **Functional openings** — a button placket / zip that actually *opens*: "Worn open" unsews the centre-front seam in mesh + physics (`openSeamColumn` slit + `XPBDSolver.cutSeam`) so the garment gaps and hangs open (`?open=1`) — PR #247

**Fit & simulation tools** _(arrange, fit, analyse — the pro fitting workflow)_
- [ ] **Pin · tack · freeze** — pin cloth to the avatar, tack two points together, freeze a region while arranging — the CLO staples for layout + fitting
- [x] **Draped-mesh fit measure** — measure chest/waist/hip girth on the *simulated* garment (a horizontal plane-slice of the live tube — for each column, where its edge crosses the body height — so it's a true circumference, not a tilted ring), shown live under "On body (draped)" in the panel and refreshed once the drape settles; gives the real **hip** the flat draft can't. Reported as an absolute girth (not ease) since the garment drapes on the live avatar, whose body differs from the abstract measurements — so ease against that reference would be inconsistent, but the measured girth is always true; pure `ringGirthCm` unit-tested + a headless drape test proves the slice tracks the body — PR #181
- [x] **Ease table** — the numeric girth **ease** (garment − body) at the *drafted* points — **chest + waist** — in the Property panel (signed, tight ease flagged) + the manufacturing spec pack; pure `fitEase` unit-tested. Hip/bicep deferred: the tube has no drafted hip radius (hip clearance is emergent from the drape, not the draft), so a spec-level hip mis-reads — the draped-mesh fit measure (PR #181) gives the real hip — PR #176
- [x] **Pressure / contact fit map** — colour where the garment **presses into** the body (real collision push-out, cold blue → hot red), distinct from the strain + stress views (`?pressure=1`) — PR #244
- [ ] **Fold arrangement** — pre-fold collars / lapels / cuffs before simulating so structured pieces settle the right way

**More design & construction**
- [x] **Gathers, shirring & smocking** — elastic-gathered panels + honeycomb smocking detail (3D + a gathered-strip pattern piece) — PR #242 (shirr + honeycomb smock pleat styles)
- [ ] **Convertible details** — wrap-dress ties + drawcords that knot, so one garment styles multiple ways

**More materials & finishes**

**More avatar & scene**
- [x] **Group / runway line-up** — a collection shot of the garment across N colourways rendered side by side into one PNG (composited snapshots — the body/sim is a singleton); pure `lineupCells`/`lineupHues` unit-tested — PR #171
- [x] **Contact shadows & SSAO** — a GTAO ambient-occlusion pass grounds the figure + darkens contact/fold areas (garment↔body, folds, under-arms, pockets); small world radius, no halos; transparent-backdrop path unaffected — PR #170

**More production**
- [x] **Import an existing flat pattern** — read a DXF pattern back in + preview it in the 2D pane (round-trips the export; pure `parsePatternDXF` unit-tested). Draping imported panels onto the body deferred — PR #169
- [x] **Points-of-measure (POM) sheet** — a graded POM table (every spec across XS–XXL with ± tolerances) on the manufacturing pack + JSON; re-runs `garmentMetrics` per size through the app's girth grading, so girths step per size and lengths hold (the app grades girth only — honest to the geometry); pure `pomTable` unit-tested — PR #177
- [x] **Grade-rule editor** — per-point grade increments (girth · length · sleeve, real cm per size step) so the size run grades like a real pattern, not a uniform girth scale; flows into 3D + 2D pattern + POM (`gradeRules` per layer) — PR #245

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
- [x] **Pause the studio loop when the window is hidden** — `Loop.setVisible` gates all step + render work behind a `visibilitychange` listener (removed on teardown), so a minimised/occluded studio does zero solver/draw work instead of the ~1 fps Electron background-throttle tick; the clock resets on re-show so no catch-up-step burst. Matches PreviewStudio's existing blur/visibility pausing (the studio was the asymmetric one)
- [x] **Coalesce slider edits to one rebuild per frame** — dragging a garment/body/appearance/physics/print slider fired its full rebuild (garment geometry · body MarchingCubes · cloth redrape · 6× canvas repaint) on **every** `input` event, janking the drag. A small unit-tested `ui/coalesce.rafCoalesce` (collapses a frame's calls into one deferred run with the latest value, cancellable) now wraps the expensive tail of `onGarmentEdit`/`onBodySize`/`onVisualEdit`/`onPhysicsEdit`/`onColor`/`prints.update` — the cheap buffer writes stay synchronous (undo/save/2D see the latest state), the heavy work runs at most once per frame, and every scheduler is cancelled on teardown. Dragging is now smooth; the final value always lands
- [x] **Dedupe the export HTML-escape helper** — the identical `esc()` (escape `& < >`) was copy-pasted in `export/manufacture.ts` + `export/marker.ts`; extracted to a shared `export/html.escapeHtml` (imported as `esc`, call sites unchanged)
- [x] **Coalesce the window-resize storm** — a window drag-resize fired `resize` continuously, and each event ran `onResize` **twice** (Viewport's own listener + the shell's `onWinResize`→`viewport.resize()`), reallocating the composer/GTAO/bloom **render targets** every time. `Viewport.resize()` + the window listener now funnel through a coalesced `scheduleResize` (one render-target resize per frame); programmatic paths (constructor init, `mount`, `renderStill` restore) stay synchronous so sizing is never a frame late where it matters. Moved the now-shared `rafCoalesce` util to `core/coalesce` (frame-timing belongs beside `Loop`, and keeps `core` independent of `ui`)
- [x] **Silence the `PCFSoftShadowMap` deprecation** — Three.js deprecated `PCFSoftShadowMap` and internally falls back to `PCFShadowMap`, logging a console error every session; `Viewport` + `PreviewStudio` now set `PCFShadowMap` directly (behaviour-identical — it's what three already used). A console probe across an animated + accessorised + hair/face session confirms the app's runtime console is now clean (the only remaining message is a bare-harness CSP warning; the real app sets a proper `default-src 'self'` CSP via `applyProductionCSP`)
- [x] **Adaptive rendering** — the viewport ran the full GTAO+bloom+SMAA composite 60×/s even when the scene was completely settled (identical pixels). `Viewport.render(active)` now runs the composite only when something changed — cloth/animation moving (`GarmentStack.anyAdvanced()` + `anim.mode`/`player.playing`, passed by the loop), a camera move (OrbitControls `change` + `setCameraPose` → `requestRender`), or a coalesced appearance edit — and repaints a settled scene on a ~20 fps idle heartbeat so it can never look frozen. `controls.update()` still runs every frame so drags/damping/autoRotate stay smooth. Verified: idle-settled drape, animated walk, turn/autoRotate camera motion, and the Render tab all render correctly. (The idle↔walk animation crossfade was already implemented in `GlbMannequin`.)
- [x] **Comment the `MarchingCubes.count` cast** — clarified the `as unknown as { count }` in `BodyCollider` (the live-vertex count isn't in three's typings)
- [x] **Fix blank prints/textiles in the studio** — the fabric-thickness lining shell was pushed *outward* over the printed surface (tube normals point inward); push it inward so the albedo map shows — PR #108
- [x] **Wire the library search + filters** — fabric browser filters by family · weight · stretch (combined with the text search); pure `matchesFabric` unit-tested — PR #165
- [x] **Autosave + crash recovery** — snapshots the working `.dio` doc to localStorage every 15 s + on close; a fresh launch offers to recover it via a non-blocking banner; pure `parseSnapshot`/`shouldOfferRestore` unit-tested — PR #166
- [x] **Golden-image snapshot tests in CI** — capture a few key looks and diff them each PR to catch visual regressions — PR #297

---

## 🧢 Headwear & neckwear _(hats · beanies · ski masks · scarves · head scarves — a full build-out)_

- [x] **Rigid headwear/neckwear accessories** — beanie · cap · bucket hat · balaclava (ski mask) · scarf · neck gaiter added to the avatar `Accessories` system, placed by the **head/neck frame** so they ride the animated head (crown dome + folded cuff, cap dome + curved bill, bucket dome + brim, full-head shell, neck loop + tails, knit tube); `accessoryAnchors` now exposes the head-frame basis + neck ring; pure placement math unit-tested; auto-wired into the `?accessories=` deep-link + Avatar-panel toggles — PR #182
- [x] **Accessory precision pass** — a grounded visual audit found several rigid accessories imprecise: the **balaclava** shell was centred too low so the crown poked out bare (now domed over the whole head at the cranium centre like the beanie → a real full-head ski mask); the **shoes** were flat `Box` slabs (now a sole + rounded instep/heel + toe cap → real footwear); the **gaiter** sat down at the collarbone (raised up around the neck) and the **hat** floated a touch high (settled onto the head). Belt/bag/cap/bucket confirmed fine; README accessory photos refreshed

**Cloth-sim foundation** _(make the drape-y pieces real catalog garments — refine `garments/schema` · `factory` · `avatar/Mannequin` · `garment/GarmentController`)_
- [x] **Head/neck anchor** — `head` added to `BodyAnchors` + `AnchorKey`; a pure `headAnchor(colliders)` builds the crown+basis `Matrix4` from the head frame (works for the procedural body + the GLB head bone) and `Mannequin.anchors()` returns it live so it turns/nods with the head — the frame a cloth-sim `headTube` pins to; unit-tested — PR #183
- [x] **`headTube` piece kind** — a tube anchored at the crown/neck running down over the head/neck (`schema` `HeadTubePiece` + `factory` `headTubeToSpec`; denser rings so a short piece still drapes); collides with the head/neck capsules for free; wired through `buildGarment` + `garmentTubeSpecs`/`garmentPatternSpecs`. Shipped the first cloth-sim neckwear — a draping **snood** (cowl) catalog garment; `headTubeToSpec` + the build unit-tested + a headless drape-stability check — PR #184
- [ ] **Headwear category** — add `accessory`/`headwear` to `GarmentCategory` + the Library picker + garment icons
- [x] **Expose `headR`/`neckR` in `Measurements`** — added to the interface + `measurementsFor`/`applyBody` (scale with build), so `headTubeToSpec` + headwear fit read them — PR #184
- [x] **Pin headwear to the head anchor** — `bindPinsToBody` routes a crown headwear piece (a beanie/hat) to the **head** anchor via a pure `pieceAnchor(name,…)` (head → head · sleeve → arm · else → nearer of torso/hip), so it turns/nods with the head; shipped a cloth-sim **beanie** catalog garment (crown `headTube`) that rides the head; `pieceAnchor` unit-tested + a headless drape-stability check — PR #185
- [ ] **Snug-knit collision tuning** — a tighter `bodySkin`/offset for knits so a beanie hugs the crown without hovering
- [x] **Patch pocket follows the drape (was floating)** — patch pockets were static non-sim meshes at a fixed z-offset (`chestR + 0.03`), so they floated off the draped cloth (a fixed offset can't win: too far floats, too close sinks in). Each pocket is now a group that **raycasts straight back at its (x,y) against the live garment piece meshes every frame** and sits on the hit point, lifted + oriented along the surface normal — so it rides the cloth's folds (chest pocket on tops/dresses, hip pockets on bottoms). Verified the chest pocket now sits flush on the surface instead of floating
- [x] **Full customization for every garment** — 19 garments hid construction toggles they can actually render. Added `sleevelessCaps` (all of `upperCaps` minus sleeve/cuff — they have no sleeves piece) for **tank / slip-dress / gown** and a `straplessCaps` (also minus neckline/collar) for **tube-top**, so they now expose collar/darts/pockets/hem/closure/lining/interfacing/facing/drawstring/ruffles/boning/ribbing/yoke/princess; added **closure/lined/interfaced** to `lowerCaps` (all skirts + trousers); added **flare** to the beanie (widens the brim). A new unit test builds every garment with each of its claimed toggles on and asserts finite/valid geometry — so a garment can never advertise a broken option. Verified the slip-dress + tank now show the full panel and render ruffles/pockets/collar correctly
- [x] **Real scarf (wider + longer)** — the cloth-sim scarf was a thin 0.16 m ribbon with a single ~234° wrap; widened to **0.28 m** with longer soft tails (`tailHi 0.3→0.42, tailLo 0.6→0.85`, `wrapEase 0.035→0.05`) so it reads as a real chunky scarf wrapped over the neck with the ends hanging down the front. The rigid accessory scarf got a thinner, more elegant loop (torus minor 0.85→0.55) + longer/flatter tapering tails
- [x] **Close the shoulder / armhole gap** — the body tube and the sleeve tube are separate meshes with no seam, and `topEdge` keeps the body's sides at full shoulder height, so a bare **deltoid gap** showed between the body's shoulder and the sleeve cap (obvious with contrast sleeve fabrics). Rather than a risky cut+seam, lift the sleeve cap **up + inboard over the deltoid** (`sleeveSpecs`: `a.y += 0.7·armR`, inboard `0.55·armR`) so the cap overlaps the body shoulder and closes the gap — arm-proportional so it scales to any body. Verified on slim + plus across set-in / puff / blazer: gap closed, natural shoulders, no over-lift, 419 tests green
- [x] **Smooth the cloth surface (grainy/lumpy → clean)** — garment surfaces read grainy/noisy from three stacking causes, now fixed: (1) over-strong knit/heavy-woven weave normals (`normalStrength` cable-knit 1.4→0.9, fleece 1.1→0.75, corduroy 1.2→0.85, rib 1.0→0.7, canvas 1.0→0.75, tweed/denim/linen/jersey/terry toned down); (2) the fabric-thickness **lining shell** offset (up to ~5 mm ×1.7 when lined) poked through folds on the averaged-normal mesh → speckle, now **clamped to ≤1.2 mm** + lined multiplier 1.7→1.3; (3) **self-collision** keep-apart (2.4 cm) exceeded the mesh spacing (2.2 cm) and lumped a piece's own folds — `radius 0.012→0.009`, `gridSkip 2→3`. Verified a jersey dress on a plus body now renders smooth, a lined blazer has no shell speckle, and a layered hoodie+skirt still stays separated (no interpenetration). Also made `scripts/capture.cjs` render **offscreen** (no window pops during verification)
- [x] **Fix exploding / oversized sleeves** — the sleeve-shape radius profiles (`sleeveShapeSpec`) were authored in **absolute metres that don't scale to the body**, and the **puff** cap was `0.078 + 0.06 = 0.138 m` ≈ **4× the arm** — a self-intersecting ring the solver blew into torn, spiky balloons (bishop was ~2.75× → baggy/torn); worse on non-default bodies. Rewrote every shape as **multiples of the arm radius** (passing both the shoulder + forearm radii): puff is now a soft ~1.9× gather, bishop a modest mid-sleeve fullness, set-in/raglan snug to the shoulder, dolman/bell wide-by-design but scaled. Every sleeve now reads as its shape and **stays on the arm without exploding**, on slim + plus/curvy bodies, static + animated. Unit test guards each cap to a sane multiple (catches a re-introduced balloon) + a headless drape-stability test proves all 6 shapes settle finite/bounded; README sleeve photos refreshed
- [x] **Garment correctness pass** — a grounded visual audit of all 31 garments (offscreen render + inspect) + a cloth-physics code audit. Result: 26/31 already correct and the solver/collision/anchor math is sound (verified & rejected two false "bugs" — the aero-drag term and the jumpsuit `hemDrop`). Fixes: the **beanie crown** (below), the **jumpsuit** torso now overlaps the leg tops so the one-piece reads continuous (no bare crotch gap; `hemDrop 0.52→0.58`), and `ClothWorld`'s capsule broadphase rests cloth a `bodySkin` off the body (was `>= cap.radius`, now `+ bodySkin` — matches its own `solveBody` + `XPBDSolver`, so sewn panels don't rest on the bare surface). The **snood + scarf were confirmed already correct** (only looked "invisible" in oat-beige-on-beige), and the **slip-dress** is fine (crepe is just pale grey — renders solid in satin). README jumpsuit photo refreshed
- [x] **Fix the cloth beanie crown** — the beanie's `headTube` was an **open** flared cone (`topScale 0.38` → a hole at the crown, `botScale 1.3` → flared band) so the head dome poked through the top and the fabric sat as a low band with the crown bare. Re-proportioned to a gathered-closed crown that domes over the head (`topScale 0.13`, `botScale 1.28`, drop `0.26–0.32`): it now caps the crown, covers down the head, and stays put when the head turns/nods. A grounded visual audit confirmed the **snood + scarf were already correct** (they only looked "invisible" in oat-beige-on-beige). Guard test added (crown radius ≪ bottom, catches a re-opened cone); README photo refreshed — PR #202-ish
- [x] **Cloth-sim draping scarf** — a flat **open** knit panel (new `scarfPanel` piece → `buildScarf`/`fillScarf`, solved with `wrapX: false`) wrapped once around the neck: the collar is pinned as a stable band that follows the body, the two front tails hang + drape under gravity clear of the chest; a robust width frame (vertical on the collar → horizontal on the tails) so it can't collapse; `wrapX` threaded through `SimPiece`/`Piece`/solver; `fillScarf`/`buildScarf` + a headless drape-stability check unit-tested — PR #186
- [x] **Cloth-sim ski mask (balaclava)** — a conforming knit shell with real **face-opening cut-outs**: `TubeSpec.cutouts` drops the quads through the same `tubeIndices` path tearing uses + pure `deadFromCells` kills the orphaned interior particles, so you see the face through the holes; `ski-mask` catalog garment (crown headTube + `TubeSpec.dome` spawn clamp so no ring spawns inside the skull). Surfaced + fixed the **GLB headwear foundation bugs**: the GLB head capsule spanned neck→head *joints* (the skull was uncollidable — the cloth beanie had regressed to a neck collar, rigid hats floated), `Measurements.crownY` = the real skull top, and body-swap now REBUILDS garments (a redrape refilled from stale-body specs) — PR #309

**Beanies & knit caps**
- [x] **Cuffed beanie** — short drop + wide doubled rib band (`cuffed-beanie`) — PR #276 _(adjustable cuff height later)_
- [x] **Slouchy beanie** — extra crown length draping at the back, gather tuned to stay on the crown (`slouchy-beanie`) — PR #276
- [x] **Fisherman / rolled beanie** — the docker crop above the ears (`fisherman-beanie`) — PR #276
- [x] **Pom-pom beanie** — `pom` definition flag → a sheened yarn pom riding the crown (`pom-beanie`, cable-knit default) — PR #276
- [ ] **Ear-flap / trapper beanie** — ear flaps (+ ties) and a faux-fur lining
- [x] **Knit structure** — rib / waffle / cable weave structures (pure `weaveHeight` branches → existing normal/roughness baking + Toksvig AA); rib-knit/cable-knit honest, new waffle-knit — PR #276
- [ ] **Beanie fit** — crown-depth + brim-height + ear-coverage controls
- [ ] **Beanie stretch (negative ease)** — a knit that stretches snug over the head

**Structured hats**
- [ ] **Baseball cap** — a 6-panel crown + a curved bill + a top button; a front-panel logo area
- [ ] **Bill curvature control** — flat (snapback) → curved (dad hat)
- [ ] **Cap closure** — snapback / strapback / fitted band at the back
- [ ] **Trucker cap** — a foam front + a mesh back panel
- [ ] **Bucket hat controls** — brim-width + crown-height; reversible option
- [x] **Fedora / trilby** — a pinched crown crease + a grosgrain hat band — already shipped: the fedora accessory carries the **crown-shape library** (`avatar/crown` — dome/teardrop/centre-dent/diamond/telescope creases, `?crownShape=`) + the **hat-band designer** (`avatar/hatBand` — grosgrain/leather/cord + trim, `?hatBand=grosgrain`) _(drift check-off)_
- [x] **Wide-brim sun hat** — a straw dome + wide drooping brim + band (`?accessories=sunhat`) — PR #277
- [x] **Beret** — a wine felt disc pulled to one side + stalk, riding the head frame (`?accessories=beret`) — PR #277
- [x] **Flat cap / newsboy** — a panelled crown + a short stiff front brim — already shipped: `?accessories=bakerboy` (`avatar/bakerboy`) — the 8-gore puffed/panelled crown over a fitted band, wearing the cap's parametric bill (short front brim) _(drift check-off)_

**Scarves & neckwear**
- [x] **Rectangular scarf** — length / width params + fringe ends — already shipped: the cloth-sim `scarf` is a rectangular panel with a **width** multiplier (`scarfWidth` — the dimension designer), **length** driving the tails, and `?fringe=1` hanging real verlet strands off the tail ends _(drift check-off)_
- [ ] **Infinity / loop scarf** — a closed loop, worn single or doubled
- [ ] **Blanket scarf** — an oversized square with a plaid check + fringe
- [ ] **Silk neck scarf** — a small square knotted at the neck (knot styles)
- [ ] **Snood / cowl** — a wide knit tube around the neck
- [x] **Neck gaiter / buff** — a thin stretch tube (pull up over the nose): the `gaiter` catalog garment (neck-anchored headTube, stretch jersey, `HeadTubePiece.gaiter`) — worn states above — PR #316
- [x] **Scarf drape styles** — once-around · wrapped · draped-tails · Parisian knot — already shipped: `scarfCentre` gives the default ~234° once-around wrap with draped front tails, plus `knotCentre` (Parisian knot), `doubleCentre` (double wrap) + the blanket shoulder-drape — several distinct worn-states on one strip _(drift check-off)_
- [ ] **Fringe & tassels** — a configurable knotted fringe / tassel trim on scarf ends

**Head scarves & wraps**
- [ ] **Bandana** — a folded triangle tied at the back
- [ ] **Headscarf / hijab wrap** — a draped wrap over the head + neck, tied at the nape
- [ ] **Turban** — a wrapped + twisted turban form
- [ ] **Do-rag / wave cap** — a tight skull wrap with tail ties
- [ ] **Wrap-tie styles** — front-knot · nape-knot · turned-back · long-tail
- [ ] **Head-wrap print** — a repeating scarf print / pattern mapped onto the wrap

**Materials & finish**
- [x] **Knit-yarn material** — a wool / acrylic matte knit with rib / cable normal + sheen (reuse `FabricMaterial`) — already shipped: the fabric library carries **cable-knit · rib-knit · jersey-knit · french-terry** (soft-knit family with knit weave normals + per-family cloth sheen), on top of the knit-chart designer (stockinette/rib/cable) that bakes real knit relief _(drift check-off)_
- [ ] **Faux-fur trim** — pom-poms, trapper flaps, brim fur (reuse the `fur` finish)
- [ ] **Felt / wool-melton** — a dense matte felt with a subtle nap for structured hats
- [ ] **Silk / satin** — a drapey lustrous finish for neck scarves
- [x] **Brim stiffener** — a buckram / wire brim so a sun-hat / fedora brim holds its shape — already shipped: `?brimWire=1` (`avatar/brim` — a crisp rolled/wired rim at the brim's lip) on the fedora + bucket + sun-hat blocks, part of the parametric brim designer (width · droop · wire) _(drift check-off)_
- [ ] **Reflective / hi-vis + embellished** — reflective knit, sequins, beading on headwear

**Fit, patterns & production**
- [x] **Head-circumference sizing** — measure head circ + a hat size run (XS–XL / cm) + grading: pure `export/headSizing` — `headCircumferenceCm` derives the girth from the head collider radius (a head is a slight oval, ~3 % over a true circle), `hatSizeFor` maps it to the standard `HAT_SIZE_RUN` (XS 53–54.5 … XXL 62–64 cm, clamped to the ends); `pomTable` attaches it for headwear garments (any `headTube` piece), and the manufacturing pack renders a **Head sizing** section (fitted circ → size, with the graded run highlighting the fitted band); pure math unit-tested
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

**Perfection tier** _(queued 2026-07-13 — go deep on every head/neck piece: 72 cards — **36 done**:
✅ ski mask & balaclava 10/10 · beanies 9/10 · ✅ structured hats 12/12 · scarves 3/12 · wraps 2/8 ·
fit & physics 0/10 · materials & production 0/10)_

**Perfection — Ski mask & balaclava** ✅ _(complete — 10/10)_
- [x] **Balaclava opening styles** — full · eyes-only · three-hole · open-face cut-out variants as data (`balaclavaCutouts`, sized from the head radius, measured down from the crown); `faceStyle` GarmentParams → panel picker (gated on `supports.faceStyle`) → `?balaclavaFace=` deep-link, mirroring sleeveShape; per-style quad-drop ordering unit-tested — PR #309 _(full-face-zip deferred to the closure designer)_
- [x] **Balaclava convertible fold** — roll it up into a beanie / down over the face — two worn states on one piece: `balaclavaWorn` ('down' · 'rolled') re-specs the face-style headTube when rolled (short crown drop + snug fat doubled band; holes + grip pins ride inside the roll); 'Worn' toggle beside the Face-opening picker; `?balaclavaWorn=`. Also fixed the **gradeParams gap**: faceStyle/cuffHeight/slouch never reached the actual build mapping (panel + deep-links silently ignored) — all four param sets re-verified visually — PR #313
- [x] **Face-opening binding** — a ribbed elastic edge around the eye/mouth holes so the cut-outs read finished, not raw. Pure `cutoutRims` walks the closed node loop around each hole (never touching dead particles); `garment/HoleBinding` traces a drape-following trim-coloured cord along each rim per frame (the piping idiom); `XPBDSolver.stiffenAmong` runs the rim constraints ×0.2 compliance so a bound opening HOLDS its shape. Also shipped the fit foundations the card surfaced: `TubeSpec.extraPins` (the mask grips the nose bridge + chin — no more spinning on rotationally-symmetric colliders), a **GLB face collider** aimed/sized from the measured nose (`measureGlbHead` via `applyBoneTransform` — face fabric no longer sinks through the nose), `Measurements.headBaseY` true-skull face landmarks, and the **anatomy-bookmark FRONT azimuth fix** (was π/2 = the SIDE since it shipped; `?closeup=head&headDist=` now frames true face-on) — PR #310
- [x] **Balaclava chin & jaw shaping** — under-jaw darts so the shell hugs the jawline instead of tenting: `TubeSpec.radiusStops` (a multi-stop piecewise radius profile — a pure `radiusAt` extension) nips the mask to 0.7×headR under the jaw — PR #320
- [x] **Two-layer balaclava** — an inner liner + outer shell simulated as layered cloth that slide on each other: verified via the layering + inter-garment repulsion (`?garment=helmet-liner&layers=ski-mask` — both wrap the head, kept apart, the liner peeking at the face opening); nesting-by-construction asserted — PR #319
- [x] **Balaclava breath-warp** — a subtle cyclic wind source at the mouth hole so the fabric visibly breathes: `XPBDSolver.setBreath` (~0.3 Hz sin² exhale on the mouth rim, radially outward; breathing cloth never dead-stops); the controller wires the lowest cut rim; 'Breathing preview' toggle + `?breath=1`; headless still-sleeps vs breathing-stays-awake test — PR #319
- [x] **Ski-mask jacquard presets** — skull · flame · frostbite colourwork charts mapped to the face tube. Three fair-isle charts as data on the colourwork system: a symmetric bone-white skull with hollow eye sockets (tested), soot/red/ember flame tongues, a midnight/ice/glacier frostbite band — they tile the whole mask (and compose with knit-chart structure on any garment); `?colourwork=skull|flame|frost` — PR #311
- [x] **Distressed ski mask** — frayed hole edges + pilling: pure `frayedCells` chews rim-adjacent quads by a deterministic hash (no RNG — golden-safe), `TubeSpec.fray` drops the neat binding for raw ragged holes; `?distressed=1` + pair with `?pilling`/`?wear` for the full aged look — PR #320 _(zone-weighted pilling later)_
- [x] **Helmet-liner balaclava** — a low-profile thin snug variant (no cuff) that fits under a helmet/hood: the `helmet-liner` garment (snug open-face headTube, spandex) — PR #317
- [x] **Ski goggles accessory** — strap + mirrored lens riding the balaclava/head frame: `AccessoryKind 'goggles'` — a mirrored sphere-patch lens band + white frame shell + strap torus at eye level, placed by the unit head frame (verified worn OVER the cloth ski mask); `?accessories=goggles` — PR #318

**Perfection — Beanies & knit caps** _(9/10 — crown-decrease swirl deferred: needs a non-tiling polar crown texture)_
- [x] **Cuff height slider** — skull-cap → single roll → deep double roll, one beanie, live re-sim: `cuffHeight` (0…1) widens the band +22% and eats drop length in `headTubeToSpec`; 'Beanie fit' slider gated on `supports.beanieFit` (all 5 beanies); `?cuffHeight=` — PR #312
- [x] **Slouch depth control** — crown length slider from fitted to full slouch; the gather auto-tunes so it stays on: `slouch` (0…1) adds up to +10 cm crown length while the gather tightens (−30%) per the #276 lesson; spec math + extremes-stability unit-tested; `?slouch=` — PR #312
- [x] **Pom customizer** — pom size · fluff · contrast colour · faux-fur pom (drives the fur finish): `pomScale` (0.4…2, bigger sits higher) · `pomColor` (contrast, defaults to the garment) · `pomFur` (fur-finish pile normal + sheen) on LayerData, read by `buildPom` decor; 'Pom-pom' panel block gated on `def.pom`; `?pomScale=&pomColor=&pomFur=1` — PR #314
- [x] **Chullo** — ear flaps + braided tie cords + an alpaca colourwork band: the `chullo` garment — a gathered-crown pom beanie with the new `ear-flap` hem (deep side flaps, pure `bottomEdge` branch feeding 3D + 2D) in cable knit — PR #317 _(braided ties + the colourwork band later)_
- [ ] **Crown decrease swirl** — the real spiral-decrease shading at a beanie crown, knit-chart driven
- [x] **Beanie gauge presets** — fine machine knit → hand-knit super-chunky, driven by the yarn library: `BEANIE_GAUGES` (validity + monotonic-chunkiness unit-tested) set yarn + stitch chart in one click via the 'Knit gauge' chips — PR #316
- [x] **Cuff patch & label** — leather patch · woven label placement on the cuff: `cuffPatch` builds a rounded-rect patch tracked to the LIVE band via the pocket tracker's new `hemOffset` (the spec hem vs the settled band differ — the fixed ray landed on the back panel); 'Band patch' picker; `?cuffPatch=` — PR #315 _(flag embroidery later)_
- [x] **Brimmed beanie** — a short stiff visor under the knit dome: new catalog garment + `GarmentDefinition.visor` → a 120° front-wedge bill riding the live band (hem-anchored tracker) — PR #316
- [x] **Beanie negative-ease heatmap** — show the stretch-band pressure of a snug knit on the head: `?ease=` deep-link (the slider already reached −3 cm); crown pieces now survive compression (ease floored −1.2 cm, the band compresses but never the gather, compressed spawns dome-clamped — neutral drape verified unregressed); snug band + `?pressure=1` reads the contact heatmap — PR #321
- [x] **Convertible three-way** — one knit piece worn as beanie · balaclava · neck gaiter (three states): the `convertible` garment — `convertibleWorn` routes to the group's spec branches (face · rolled · a neck state); 3-seg picker + `?convertibleWorn=` — PR #321

**Perfection — Structured hats** ✅ _(complete — 12/12)_
- [x] **Parametric brim designer** — width · droop/flip curve · edge wire, for any hat block: pure `avatar/brim.brimProfile` (per-kind spreads, run-scaled droop so wide brims actually slope, negative droop = flipped up) + `Accessories.setBrim` rebuilding the bucket/sun-hat brims in place + a wired-edge torus; Avatar-panel sliders + `?brimWidth/brimDroop/brimWire` — PR #322 _(the fedora joins with the crown-shapes card)_
- [x] **Crown shape library** — teardrop · centre-dent · diamond · telescope (pork-pie) crown creases: pure `avatar/crown.crownDrop` plan-disc depth fields pressed straight down into a new blocked-felt fedora crown (fades before the wall; the fedora joins the unit head frame + parametric brim per the #322 note — `crown-holder`/`brim-holder` rebuilds); crown chips under the brim sliders + `?crownShape=` — PR #323
- [x] **Hat band designer** — grosgrain · leather · braided cord bands + bow/feather/buckle trims: pure `avatar/hatBand` (band profiles + a two-strand `braidY` that genuinely crosses around the crown + millinery `trimAnchor` side placement, per-style classic colours); `Accessories.setHatBand` rebuilds `band-holder`s on the fedora + sun hat in place (the sun hat's fixed torus band became the default grosgrain); band + trim chips under the crown shapes + `?hatBand=/bandTrim=/bandColor=` — PR #324
- [x] **5-panel vs 6-panel cap** — real panel seams + crown topstitch, construction picker: pure `avatar/capPanels.panelSeamAzimuths` (6-panel seams centre-front, 5-panel offsets half a panel for the clean camp-cap front; mirror-symmetric); `setCapPanels` re-seams a `seam-holder` in place — ridge tube + twin darker topstitch rows per meridian; 'Cap construction' chips + `?capPanels=5|6` — PR #327
- [x] **Cap bill designer** — flat↔pre-curved slider · contrast underbill · squatchee button: pure `avatar/capBill.billCurl` (a cylindrical edge-roll over the bill disc, pinned at the sewn edge) displacing a ~120° forward fan grid rebuilt by `setCapBill` (capture review caught the 180° half-disc curling over the ears like a bonnet — narrowed to the real span); underbill = a second contrast fan beneath; named squatchee toggle; slider + toggles under the hat band + `?billCurve=/underbill=/squatchee=0` — PR #325
- [x] **3D puff cap embroidery** — a raised puff-embroidered logo bump on the front panels: pure `avatar/puffLogo.puffHeight` window fields (dot · bar · peak · ring, soft foam edges, zero at the border) lofting a vertex-coloured patch grid off the dome (only the mark reads as thread — the all-thread window bloomed; the low window let the GLB brow bulge poke through as a skin disc → raised above the brow); 'Puff embroidery' chips + `?puffLogo=/puffColor=` — PR #328
- [x] **Boonie hat** — chin cord + snap-up brim sides: the `boonie` accessory kind — pure `avatar/boonie.boonieBrimLift` (all-round droop; `left`/`right`/`both` sweep a side up through a tight sin⁴ lobe) rebuilt via the shared brim grid + the chin cord (anchors→bead→tail; must route ~1.2+ radii out — the GLB chin/cheeks swallowed every tauter run, verified on BOTH bodies); 'Boonie brim snap' chips + `?boonieSnap=` — PR #331
- [x] **Baker boy volume** — the 8-panel puffed crown over the flat-cap base: the `bakerboy` accessory kind — pure `avatar/bakerboy.goreLobe` (a bulge per panel, pinched at each seam; exactly-8-peaks asserted via a wrapped maxima scan after the naive counter miscounted the az=0 pinch) scalloping a wide low overhanging dome + fitted band + button, wearing the cap's parametric bill (`setCapBill` loops cap · visor · baker boy); `?accessories=bakerboy` — PR #332
- [x] **Straw weave material** — an open straw weave draft + dry sheen for sun hats: pure `avatar/straw.strawRecipe` pairs `fabric/weaveDraft`'s 2/2 basket preset (= straw plaiting; drawdown signature asserted) with the dry look; the sunhat swaps felt for a `MeshPhysicalMaterial` carrying the baked weave tiles (relief needs `material.normalScale` per the stack idiom — the bake alone read flat; base deepened so key light + sheen don't wash it white); document-guarded bake keeps headless vitest green — PR #333
- [x] **Cowboy hat** — creased crown + upturned brim + band: the `cowboy` accessory kind — `crownDrop('centre-dent')` pressed 1.6× into a taller block (the cattleman gutter) + a brim annulus lifted per-azimuth by the pure `avatar/cowboy.cowboyBrimLift` (sides roll up, front/back dip — beyond the uniform-droop brim) + a leather band & buckle; `?accessories=cowboy` — PR #329
- [x] **Top hat & bowler** — the formal blocked-felt pair: `tophat` + `bowler` accessory kinds — pure `avatar/formalHats.formalBrimLift` (topper: sides curl, front/back dead level; bowler: the whole edge rolls, strongest at the sides) + proportions (flared 1.7-radii stovepipe · hard 0.88-squashed dome); the cowboy's brim annulus extracted into the shared `rolledBrimGeometry`; `?accessories=tophat,bowler` — PR #330
- [x] **Visor** — a brim + band with an open crown (ponytail-friendly): the `visor` accessory kind — an open sweatband cylinder at the brow wearing the cap's parametric bill (`setCapBill` loops the billed blocks, so curve/underbill shape both); pure-white fabric bloomed under the key light → toned grey-white; `?accessories=visor` — PR #326

**Perfection — Scarves & neckwear**
- [x] **Scarf dimension designer** — length · width · gauge with live re-sim: `scarfWidth` (0.5–1.8×) through `gradeParams` scales the panel width AND its sim lattice; Length drives the tails (labelled); gauge via the yarn/knit systems; `?scarfWidth=` — PR #316
- [x] **Cloth-sim scarf fringe** — real hanging fringe strands on the tail hems (not painted): every fringe strand is now a 4-point verlet chain (pure `stepStrand` — gravity + rope projection; settles plumb, follows a dragged top, byte-deterministic) driven by the live hem particles; pure `fringeEdgeIndices` hangs a scarf's fringe off the strip's END columns (the grid runs lengthwise) vs a skirt's bottom row; scarf + skinny-scarf gain `supports.fringe`, the existing `?fringe=1` lights up — PR #335
- [x] **Parisian knot sim** — fold-in-half + pull-through, pinned at the loop like the real knot: `ScarfSpec.knot` + pure `knotCentre` (bight U centre-front · each half sweeps a full ~1.72π doubled-collar turn, radially layered · tails threaded through the bight span) + `parisianPinPairs` stitched via `pinTogether`; hanging sections spawn FLAT (the vertical band width collapsed the front into one panel — capture round 2); 'Parisian knot' toggle + `?scarfKnot=1` — PR #339
- [x] **Double-wrap states** — once-around vs doubled neck turns with stable self-collision: `ScarfSpec.double` + pure `doubleCentre` spirals the strip ~3.3π twice around the neck (each turn stepped out + down so the second lies OVER the first; the inter-garment particle repulsion then holds the layers apart — stable self-collision) → the wrap eats length so the front tails hang short; `buildScarf` pins only the wrap's back half (spawn z < 0) so it rides the neck while the front crossings + tails drape free; 'Double wrap' toggle + `?scarfDouble=1` (the Parisian knot wins if both are set); pure `doubleCentre`/build-pinning/precedence unit-tested
- [x] **Scarf pin / brooch** — pin two cloth points together where placed (an extra stitch constraint): `XPBDSolver.pinTogether` (the first constraint-GROWING solver API — appends a short stiff stitch + rebinds lambda; headless-tested) sews the tails at the `pinAt` fraction (slider + `?scarfPin=1&pinAt=`), a metal brooch disc rides the pinned midpoint; params plumbed through all 8 mapping sites per the gradeParams lesson — PR #338
- [ ] **Scarf tuck-into-coat** — tails tucked under a layered coat front (layer-aware pinning)
- [x] **Blanket-scarf shoulder drape** — the oversized square folded diagonally over the shoulders: `ScarfSpec.blanket` + pure `blanketCentre` — a symmetric "rail" arcing front-left → over the left shoulder → behind the neck → over the right shoulder → front-right, with the panel width hanging straight DOWN from it (row 0 = rail, last row = hem) so the oversized square drapes over both shoulders + falls front/back like a ruana; `buildScarf` pins the whole top rail (a free corner folds asymmetrically) so both front panels hang symmetrically; the dominant scarf worn-state (fill/build check `blanket` first — wins over knot/double); 'Blanket drape' toggle + `?scarfBlanket=1`; per-layer, `.dio` + colorways; pure rail/fill/pinning + factory precedence unit-tested
- [x] **Skinny silk scarf** — a narrow charmeuse ribbon tied loose at the throat: the `skinny-scarf` catalog garment (8.5 cm scarfPanel, silk charmeuse, long tails) — PR #317
- [x] **Tartan sett designer** — a real sett (thread-count stripes) driving the scarf plaid: pure `fabric/tartan` — `expandSett` mirrors a **reflective** sett about its two pivot threads into the symmetric repeat, `tartanColorAt` picks the warp/weft colour on a **2/2 twill** diagonal so equal crossings read solid + unequal ones hatch half-and-half (the authentic tartan blend); 6 preset setts (Black Watch · Royal Stewart · Hunting · Dress Blue · Camel check · Grey), `paintTartan` bakes it into the design-art albedo behind the prints; **Tartan sett** picker under Appearance + `?tartan=<preset>`; per-layer, in the `.dio` + colorways (tagged 'tartan'); pure sett/twill/preset math unit-tested
- [x] **Scarf gift-fold render** — a flat folded product shot for the line sheet: pure `studio/giftFold.giftFoldLayout` lays out a portrait folded body + a turned-down underside corner + a wrapped belly band + a soft contact shadow (all scaled to the canvas, unit-tested); `renderGiftFold` composites the active garment's **live fabric albedo** (the design-art map — a tartan/print/colour shows) into the shapes with per-fold shading; File → **Export scarf gift-fold (PNG)** + `?giftFold=1`; layout math unit-tested, visually verified on a Royal Stewart tartan scarf
- [x] **Gaiter up/down states** — bunched at the neck vs pulled over the nose — two rest states: `gaiterWorn` ('down' · 'up') — UP rises to headBase + 0.34·skull, dome-clamped + a nose-bridge grip pin so it rides head turns; `?gaiterWorn=` — PR #316
- [x] **Cowl-to-hood hybrid** — a snood that pulls up over the crown and drapes back down: a `hood` flag on the snood's `headTube` + a `snoodWorn: 'cowl' | 'hood'` state — worn as a hood, `headTubeToSpec` re-specs the neck cowl to full-head coverage (top pulled up over the crown, a gathered crown so it's covered not a donut hole, a belly at face height, a flare draping onto the shoulders) with a front **open-face cut-out** for the face, reusing the proven open-face-balaclava machinery (dome-clamped spawn on the skull); a **Cowl/Hood** worn-picker under Construction + `?snoodWorn=hood`; per-layer, `.dio`; the hood worn-state spec is unit-tested

**Perfection — Head scarves & wraps**
- [ ] **Hijab style set** — shayla · al-amira · turban-wrap variants over the under-cap
- [ ] **Hijab under-cap** — a snug jersey cap layer the wrap drapes over
- [ ] **Turban wrap count** — visible wrap layers + the front twist knot
- [ ] **Durag** — skull wrap + long tie tails + the back flap draping the neck
- [x] **Bandana face-cover state** — the folded triangle tied over the nose: the `bandana` garment wears the gaiter-up mechanics by default + the new `point-front` hem (one centre-front triangle point); gaiter-up now grips nose bridge + nape (one pin can't hold non-stretch poplin with a weighted point); top edge verified settling at the nose line — PR #317
- [ ] **Satin-lined bonnet** — elastic edge ruche + the satin interior sheen
- [x] **Twisted headband** — a knit ear-warmer band with the front twist: the first open-crown headTube (negative rise to the brow, a ring floor for short bands, 1.2× to clear the GLB face-blob at the brow) + the crossed-knit twist tracked to the live band front — PR #316
- [ ] **Pre-tied wrap presets** — one-click wrap styles with the knot geometry baked in

**Perfection — Fit & physics**
- [x] **Head-size grading** — headwear grades from the head-circumference measurement (XS–XL run): covered by the head-circumference sizing work — `export/headSizing.HAT_SIZE_RUN` is the graded XS→XXL run (cm bands), derived from the fitted head circ and rendered in the manufacturing pack's Head-sizing table with the fitted band highlighted
- [ ] **Brow pressure map** — the contact-pressure heatmap scoped to a hat's brow band
- [ ] **Elastic band physics** — a real stretch-band constraint ring holding gaiters/bonnets/visors on
- [ ] **Storm keep-on test** — a headless test that every headwear piece stays anchored in storm wind
- [ ] **Hair-volume aware fit** — crown volume adapts over afro/bob/long hair via hair colliders
- [ ] **Ear clearance** — ear stand-off in the head colliders so cuffs and bands don't clip ears
- [ ] **Headwear-over-headwear** — hood over cap · beanie over balaclava — deterministic layering order
- [ ] **Chin-strap physics** — a cord under the chin that actually holds a sun hat in wind
- [ ] **Glasses + headwear** — a sunglasses accessory coexisting with beanies/hats (temple clearance)
- [ ] **Head-turn stress captures** — all headwear golden-captured across turn/nod extremes

**Perfection — Materials & production**
- [ ] **Waxed rain hat** — waterproof shell sheen + water-bead normal detail
- [ ] **Fleece lining reveal** — a visible contrast lining at rolled cuffs + folded brims
- [ ] **Melton & boiled wool** — dense felted presets tuned for structured headwear
- [ ] **Corduroy cap fabric** — wale-scaled cord for dad hats
- [ ] **Party headwear finishes** — sequins/beading tuned for small-panel headwear
- [ ] **Reflective piping** — retroreflective trim on winter headwear that lights toward the camera
- [ ] **Headwear pattern suite** — gore crowns · brims · bands unwrapped to SVG/DXF per style
- [ ] **Headwear cost sheet** — small-panel yield + trims (pom · wire · sweatband) in the cost rollup
- [ ] **Headwear size-run line-up** — one hat rendered across the head-size run into a single PNG
- [ ] **Headwear care labels** — knit/felt/straw-specific care lines in the manufacturing pack

---

## 🔬 Refinements & polish _(deepen what's already shipped — each is a small, self-contained card)_

**Cloth & drape realism** _(refine the XPBD solver — PRs #53 · #65 · #69 · #121)_
- [x] **Adaptive remeshing** — spread a tube's fixed ring budget non-uniformly, packing rings where the silhouette bends (waist cinch · flare onset · puff-sleeve bell · neckline) and leaving straight runs uniform, so folds resolve where they nucleate at no extra particle cost; curvature-driven + clamped so no rest length degenerates (solver unchanged — rest lengths come from the geometry); ring-t drives the UVs so prints stay put; pure `adaptiveRingT` unit-tested — PR #173
- [ ] **Weave-anisotropic bend** — cloth bends easier along the weave than across (warp vs weft) so twill/denim crease differently from plain weave
- [ ] **Per-fabric self-collision thickness** — scale the particle-repulsion radius by the fabric's physical thickness (thick wool holds layers apart, chiffon nests close)
- [x] **Body friction / cling** — the **mesh-accurate** body collision (`solveBody`) now damps the tangential slide by the fabric's friction (it kept all of it before, so friction only worked on the capsule broadphase) — a high-grip knit **clings** to the true body surface while a slippery satin slides/drapes looser; integration-tested (friction changes the settled drape), stability guarded — PR #230
- [x] **Weighted hems** — the bottom rows of every piece ramp up to a heavier mass (`hemWeight`) so a gown/skirt hem falls plumb like a couture chain-weight instead of the light edge kicking out; pinned cuffs ignore it (pinned particles have no mass); pure `hemMassScale` unit-tested, stability guarded — PR #229
- [ ] **Seam pucker** — a slight gather right at the seams for a hand-finished read
- [x] **Trapped-air puff (pressure loft)** — `XPBDSolver.pressure` adds an outward acceleration along each particle's surface normal (opt-in, capped by the stretch constraints so it's stable). A **quilted** garment turns it on, and a first-class **`?puff=1`** toggle (persisted, parallel to `wet`) lofts *any* garment — a quilted coat / a smooth bomber now inflates into a real **puffer** that stands off the body instead of hanging flat; a **"Puffer loft"** toggle in the Appearance panel; unit-tested (inflates outward + no-op at 0, round-trips) — PR #225, #226, #227
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
- [x] **Per-fabric environment reflectivity** — pure `envIntensityForFabric` sets `MeshPhysicalMaterial.envMapIntensity` from the surface: a smooth silk/satin/leather catches the studio IBL and glistens, a matte cotton/wool/canvas barely reflects — completes the roughness-map + sheen + anisotropy material realism; unit-tested — PR #231
- [ ] **Ombré: pick the dip colour + a diagonal direction** — not just a derived tone / vertical-radial only
- [x] **Textile pattern scale + rotation** — resize/rotate stripes & plaids: pure `textileTiles` maps a **motif scale** (0.25…4×; >1 = bigger, fewer repeats) to the tile count, and `paintTextile` rotates the whole repeat via `CanvasPattern.setTransform` (stripes/plaids on the bias); per-layer `textileScale`/`textileRotation` threaded through the finish wiring, **Motif scale** + **Motif angle** sliders under the textile picker, `.dio` + colorways, `?textileScale=&textileRotation=`; `textileTiles` unit-tested; verified (4× stripe = wide bands, plaid at 45°). _(grainline-align to the cut piece deferred as a separate follow-up.)_
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
- [x] **Print opacity + blend mode** — semi-transparent / multiply onto the fabric: each `Print` carries `opacity` (0…1) + `blend` (normal · multiply · screen); the pure `resolvePrintPaint` maps them to canvas `globalAlpha` + `globalCompositeOperation`, applied in `paintAlbedoMotif` (appliqué patches stay opaque — a physical patch). Per-print **Opacity** slider + **Blend** picker in the Prints manager; serialises in the `.dio` (via `PrintSpec`); `?prints=blend` demo; `resolvePrintPaint` unit-tested
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
- [x] **Depth of field** — a `BokehPass` focus-falloff (product-macro look), focused on the subject at the orbit distance; View → "Depth of field" toggle + `?dof=1` — PR #239
- [x] **Camera bookmarks** — save/recall named studio views (`getCameraPose`/`setCameraPose`); a View → "Camera bookmarks…" panel to save-current / go-to / delete; pure `cameraBookmarks` store unit-tested — PR #239
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
- [x] **Tiled print-to-scale PDF** — File → "Print pattern — tiled A4": the pattern tiles across A4/Letter pages at 1:1 with an assembly map + registration crosshairs + R·C labels for taping; pure `tilePlan` + `tiledPatternHTML` (print-CSS, mm viewBox per tile), unit-tested — PR #237
- [x] **Grainline arrows + piece labels + cut-count** ("cut 2 / on fold") on the flat pattern — already shipped: `garmentPattern.panelsToSVG` draws each panel's **grainline** (a line with arrowheads at both ends, from `PatternPanel.grain`), the **piece name** label, and the **cut-count** ("cut N · W × H mm"), plus a legend ("arrow = grainline · ○ = notch") _(drift check-off; the "on fold" fabric-fold notation is the one remaining nicety)_
- [ ] **Marker / nesting layout** — auto-arrange panels to minimise fabric on the DXF/SVG
- [x] **Per-edge seam allowance** — the cut line now offsets each edge by its own allowance (deep folded hem · shallow neckline/waist · base seam), classified by edge geometry; pure `offsetPolygonPerEdge` (variable-width offset via offset-line intersection) + `seamAllowancePerEdge` + `cutLine`, unit-tested — PR #236
- [x] **Full size-run export** — the graded pattern XS–XXL in one file — already shipped: File → **Export size set — graded patterns XS-XXL (ZIP)** (`main.ts` `case 'size-set'` writes `size-set.zip` with a graded pattern per size) _(drift check-off)_
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
- [x] **Version history / snapshots** — File → "Save version" snapshots the current doc into the project's history (capped, newest-first, survives save/parse); "Version history…" opens a panel to Restore or Delete a snapshot; pure `pushSnapshot` + the store API unit-tested — PR #238
- [ ] **Garment browser filters** — by category / length / sleeve, like the fabric filters
- [ ] **Global search** — garments + fabrics + colours + presets in one box
- [ ] **Favourites / recents row** in the Library
- [ ] **Multi-select layers** — recolour/edit several garment layers at once
- [x] **Keyboard-shortcuts overlay** (press `?`) — a dismissible cheat-sheet modal (`ui/shortcutsOverlay.ts`) listing every shortcut + a Help-menu entry; Esc/click to close — PR #189
- [x] **Keyboard-shortcut editor** — every studio shortcut is rebindable from the ? overlay (click a key chip → press a new combo; conflicts caught with a "Used by …" hint; Reset to defaults; persisted keymap via pure `ui/keymap`; `?shortcuts=1`) — PR #246

**Performance** _(refine PRs #142 · #167)_
- [ ] **Cloth solver in a Web Worker** — run the sim off the main thread
- [x] **Lazy-load the heavy exporters** (GLTF / USDZ / OBJ) — `exporters3d` now dynamic-imports each on first export + `manualChunks` keeps them out of the eager `three` vendor chunk; three chunk drops ~1936 → ~1818 kB (−119 kB), exporters split into their own lazy chunks — PR #240
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
- [x] **Deterministic snapshot mode** — freeze wall-clock time + seed any RNG (turntable phase, surprise-me hues) so a deep-link renders bit-identically — unblocks the golden-image tests; test a bit-identical repeat — already shipped: `?freezeAt=<simSeconds>` stops the loop at an exact frame-rate-independent sim step (`main.ts`) + `window.__drapeSettled()`, driving `scripts/golden.cjs` and the golden-image CI job (which does a bit-identical repeat compare) _(drift check-off)_
- [ ] **Geometry lifecycle audit** — dispose geometries/materials/textures on garment rebuild + layer delete, with a `dispose()` on `GarmentController`; test no orphaned GPU resources across a build→delete loop
- [ ] **Fixed-timestep accumulator** — decouple sim `dt` from the render frame rate with an accumulator + state interpolation in `core/Loop`, so drape is identical at 30/60/144 Hz; pure `accumulate` unit-tested

**Robustness & testing**
- [ ] **Energy / NaN guard** — a shared test asserting each catalog garment's kinetic energy stays finite + bounded across N steps (catches divergence the eye misses)
- [ ] **`.dio` round-trip fuzz** — randomised project docs survive `serializeDoc` → `parseDoc` unchanged (fuzz the layer/colorway set); guards the save format
- [ ] **Solver determinism test** — the same seeded state produces bit-identical positions on repeat (pairs with deterministic snapshot mode)

---

## 🎮 GPU · cloth math · rendering physics _(deep engine work — advanced solver/FEM · collision · geometry · cloth BRDF · procedural textures · WebGPU · validation; each self-contained + unit-testable)_

_100 concrete cards to push the math/physics/GPU behind every garment past the current XPBD + `MeshPhysicalMaterial` baseline. Distinct from the deep-dives above — this is the next layer._

**Solver core & constraint math** _(refine `cloth/XPBDSolver` integrate + project)_
- [ ] **Projective Dynamics (local-global) solver** — reformulate the step as a prefactored global linear solve (Cholesky of `M/dt² + Σ wᵢAᵢᵀAᵢ`) + cheap local per-constraint projections, converging far tighter than one Gauss-Seidel pass for stiff wovens at fixed cost; behaviour guarded by the solver tests, benchmark settle-vs-quality
- [ ] **Chebyshev semi-iterative acceleration** — wrap the projection sweep in Chebyshev over-relaxation (spectral-radius-tuned ωₖ) to roughly halve the passes to a residual target; pure `chebyshevOmega` unit-tested
- [ ] **SOR relaxation factor** — add a tunable ω > 1 to the constraint projection (successive over-relaxation) for faster convergence than plain Gauss-Seidel (ω = 1); unit-test residual decay vs ω on a hanging patch
- [ ] **Anisotropic in-plane stretch** — separate warp vs weft *stretch* compliance (not just bend) so a bias-cut panel gives diagonally while grain-aligned edges stay taut; pure per-edge grain-projection unit-tested
- [ ] **Explicit shear-angle constraint** — resist the warp↔weft skew angle directly (Baraff-Witkin shear energy) instead of leaning on the diagonal springs, so cloth resists racking under load; pure shear-gradient unit-tested
- [ ] **Isometric (quadratic) bending** — Bergou/Wardetzky cotangent bending energy with a constant-Hessian linear gradient — cheaper + more stable than trig dihedral for near-flat rest; pure `isoBendW` unit-tested
- [ ] **Substep budget by conditioning** — pick the substep count from the stiffest `compliance ÷ mass ÷ dt²` ratio per fabric, not a flat 14, so silk under-solves less and denim doesn't over-solve at rest; pure `substepsForStiffness` unit-tested
- [ ] **Jacobi + under-relaxation mode** — a parallel-friendly Jacobi projection with mass-weighted averaging (prereq for the Worker/GPU path), selectable vs Gauss-Seidel; unit-test it matches G-S at convergence
- [ ] **Velocity-Verlet position update** — second-order position integration in place of symplectic-Euler for lower energy drift on long drapes; test energy stays flatter over N idle steps
- [ ] **Midpoint external-force impulse** — apply gravity/wind with the analytic ½·a·dt² split instead of one lumped kick, cutting the initial over-shoot when a garment is dropped onto the body; pure impulse-split unit-tested
- [ ] **Slack (tension-only) constraints** — let a constraint go force-free below rest and only resist stretch, so pleats/gathers fold flat without ballooning; pure `slackForce` unit-tested
- [ ] **Per-region compliance overrides** — a compliance multiplier per named region (yoke stiffer · skirt looser · cuff rigid) layered on the fabric base, driven from the construction caps; pure region-lookup unit-tested
- [ ] **Mass-scaled energy clamp** — replace the hard 8 m/s magnitude clip with a per-particle kinetic-energy ceiling scaled by mass, so a heavy hem isn't clipped at chiffon's speed; pure `energyClamp` unit-tested
- [ ] **Residual convergence gate** — stop the substep loop early once the max constraint violation drops below a fabric tolerance (vs a fixed pass count), saving passes at rest; pure `residualMax` unit-tested

**Cloth material model & FEM** _(a physically-grounded constitutive layer over the mass-spring lattice)_
- [ ] **Co-rotational StVK triangle FEM** — an alt in-plane model: per-triangle deformation gradient F, polar-decompose the rotation out, penalise the Green strain — grain-accurate stretch/shear a distance lattice can't capture; pure `coRotStress` unit-tested
- [ ] **Compliance from physical spec** — derive `stretch`/`bendCompliance` from Young's modulus × thickness × areal density × edge length (not hand-tuned) so a mill spec maps straight to a solver preset; pure `complianceFromSpec` unit-tested
- [ ] **Kawabata (KES-F) hand import** — map the standard Kawabata tensile/shear/bending lab numbers to the solver params so a measured fabric drapes true; pure `kawabataToParams` unit-tested
- [ ] **Nonlinear (J-curve) tensile response** — real cloth stiffens as it stretches: make compliance strain-dependent (soft near rest, stiff past a knee) instead of linear; pure `tensileResponse` unit-tested
- [ ] **Viscoelastic (strain-rate) damping** — a Kelvin-Voigt element per edge that resists fast deformation more than slow, so a snapped hem settles without a rubbery bounce; pure `viscoForce` unit-tested
- [ ] **Rest-shape from the flat pattern** — seed particle rest lengths from the developable 2D panel (isometric embedding) rather than the analytic tube, so a bias seam relaxes to the true cut; pure `patternRestLengths` unit-tested
- [ ] **Flexural rigidity from thickness** — compute bend compliance from `D = E·t³ / 12(1−ν²)` so thick felt is stiff and thin silk floppy from one physical-thickness input; pure `flexuralRigidity` unit-tested
- [ ] **Bend ratio from weave float length** — derive the warp/weft bend anisotropy from the weave's float length (satin floppier than plain) so `weaveTexture` and the solver agree; pure `floatToBendRatio` unit-tested
- [ ] **Plastic stretch (permanent set)** — knits over-stretched past a yield keep a longer rest length (bagged-out knees/elbows); pure `plasticStretchRest` unit-tested
- [x] **Hygroscopic weight shift** — a `?wet=1` toggle (+ a **"Wet look"** toggle in the Appearance panel): pure `wetParams` makes the drape heavier + limp + barely billows (clings to the body) and the material goes darker + glossy (clearcoat sheen) for rain/swim/beach previews; composes on top of interfacing/boning, persists through save/parse; unit-tested — PR #223, #227

**Collision & contact — advanced** _(beyond the capsule + BVH + spatial-hash baseline)_
- [ ] **Precomputed body SDF field** — bake the mannequin into a 3D signed-distance texture per pose so per-particle body collision is an O(1) trilinear lookup + analytic gradient (no BVH traversal); pure `sdfSample` unit-tested
- [ ] **GPU SDF collision resolve** — sample the body SDF in a compute/fragment pass so collision scales to ultra-res cloth without CPU BVH queries; benchmark vs the CPU path
- [ ] **Edge–edge continuous collision** — the missing CCD case: solve the cubic coplanarity time-of-impact between two moving cloth edges (Bridson) so thin folds don't scissor through each other; pure `edgeEdgeTOI` root-find unit-tested
- [ ] **Vertex–triangle cloth CCD** — swept point-vs-moving-triangle TOI so a fast sleeve can't punch through the bodice sheet; pure `vertexTriTOI` unit-tested
- [ ] **Per-region × per-fabric friction table** — a μ lookup by (body part × fabric) so silk slides off the shoulder while denim grips the hip; pure `frictionMu` table unit-tested
- [ ] **Collision layer ordering** — tag each garment layer with a wear-order index and bias repulsion so the outer piece stays outside the inner (a jacket never sinks under the shirt); pure `layerBias` unit-tested
- [ ] **Contact islands + local budget** — flood-fill the contact graph into islands and spend more solver passes where penetration is deep, fewer where shallow; pure `island` labelling unit-tested
- [ ] **Signed self-collision side** — give the sheet a front/back sign from its normal so repulsion knows which side a neighbour belongs on (kills the "sticky wrong-side" pin after a deep fold); pure `signedRepel` unit-tested
- [ ] **Swept-capsule broadphase (CCD)** — expand each capsule by its per-substep displacement before the narrow-phase test so a fast limb captures cloth it would otherwise skip; pure `sweptCapsule` unit-tested
- [ ] **Curvature-scaled skin offset** — vary the 0.011 m body skin gap by local surface curvature (larger over knees/elbows, tighter on flats) so cloth neither hovers nor pokes; pure `offsetFromCurvature` unit-tested
- [x] **Contact restitution damping** — body/ground contact now scales the *outbound* normal velocity by a 0.3 restitution (inelastic) so cloth settles onto the surface instead of springing off + jittering; pure `contactNormalVelocity` unit-tested, stability guarded — PR #224
- [ ] **Ground friction + hem pooling** — a real tangential-friction floor with per-surface μ so a train/hem pools and stays instead of sliding; pure `groundFriction` unit-tested

**Geometry & mesh math** _(refine `cloth/Garment`, normals, adaptive mesh)_
- [ ] **Decoupled subdivision render mesh** — drive a fine Loop/Catmull–Clark render surface from the coarse sim mesh so silhouettes are smooth without simulating every vertex; pure limit-position stencil unit-tested
- [ ] **Sim→render barycentric skinning** — bind each render vertex to its host sim triangle by barycentric coords + normal offset so render detail follows the drape at near-zero cost; pure `baryBind` unit-tested
- [ ] **ARAP UV parametrisation** — an as-rigid-as-possible unwrap so a waist-cinched tube's texture doesn't shear (isometric-leaning UVs); pure ARAP local-global step unit-tested on a cone
- [x] **Angle-weighted vertex normals** — the garment pieces now recompute normals angle-weighted (Max) instead of three.js's area-weighted `computeVertexNormals`, so the adaptive remesh's uneven triangle sizes at cinches/necklines/flares no longer skew the shading (drop-in on the per-frame path — no net new cost); pure `angleWeightedNormals` unit-tested — PR #218
- [ ] **Discrete mean/Gaussian curvature** — cotangent-Laplacian curvature per vertex to drive adaptive detail, wrinkle shading, and the fit map; pure `meanCurvature` unit-tested
- [ ] **Laplacian normal fairing** — one cotangent-weighted smoothing pass on the normal field (not positions) to quiet triangle-flip shading noise at coarse resolution; pure `laplacianSmoothNormals` unit-tested
- [ ] **Quality quad triangulation** — split each grid quad along its shorter diagonal + flag sliver aspect ratios so cinched rings don't make degenerate thin triangles with bad normals; pure `bestDiagonal` unit-tested
- [ ] **Geodesic ring reprojection** — when adaptive remeshing moves rings, keep arc-length (geodesic) spacing along the profile so rest lengths stay physical; pure `geodesicRingT` unit-tested
- [ ] **Previous-frame motion-vector attribute** — output per-vertex prior-frame position so the renderer can build screen-space velocity for temporal AA + motion blur; test it tracks the pin transform
- [ ] **Half-edge topology for the tube** — a compact half-edge structure so neighbour/edge/face queries (bending · CCD · curvature) are O(1) not index arithmetic; pure adjacency-build unit-tested

**Cloth BRDF & shading** _(refine `cloth/FabricMaterial` via `onBeforeCompile`)_
- [ ] **Estévez–Kulla sheen BRDF** — swap three.js's ad-hoc sheen lobe for the energy-conserving Imageworks cloth sheen (inverted-GGX + albedo-scaling LUT); snapshot-verify velvet/satin rim
- [x] **Ashikhmin–Shirley velvet lobe** — a dedicated retroreflective velvet BRDF (bright grazing rim, dark facing) for true velvet/velour; pure lobe-eval unit-tested against reference angles: `fabric/velvet` — pure `velvetFacingFactor(|N·V|)` darkens the diffuse facing the camera (light sinks into the upright pile) to a floor while the grazing rim + sheen stay bright, injected into `FabricMaterial`'s fragment shader via `onBeforeCompile` and **gated by a `uVelvet` uniform** so non-velvet fabrics stay a bit-identical `×1.0` identity (zero golden-image impact); only true napped velvet/velour (`isVelvet` — nap + high sheen) turns it on; pure factor unit-tested, visually verified velvet vs. a satin control _(a physically-motivated retroreflective approximation, not the full A–S microfacet integral)_
- [x] **Weave-steered anisotropic highlight** — anisotropic fabrics (satin/charmeuse/velvet) now set `anisotropyRotation` a quarter-turn to the **warp** (the vertical V grain) so the elongated GGX highlight streaks *down* the garment instead of across it; pure `anisotropyAngleForFabric` unit-tested (a per-texel tangent-direction map that bends over folds is the follow-up) — PR #221
- [ ] **Dual-lobe fuzz + specular** — a tight base specular plus a broad fuzz lobe with energy compensation so cotton/wool read matte-fuzzy, not plastic; pure energy-split unit-tested
- [x] **Procedural iridescence thickness map** — `iridescenceThicknessMap` is now baked from a swirling `iridescentThickness` field so holographic/oil-slick shifts *flow* across the panel (oil-on-water bands) instead of one flat thickness; pure thickness-field unit-tested — PR #222
- [ ] **Multi-scattering GGX compensation** — add the Kulla-Conty multiscatter term so rough dark fabrics don't lose energy (no muddy velvet); pure `msFresnel` LUT unit-tested
- [ ] **Back-lit translucency (wrap)** — a wrap/translucency term so back-lit chiffon/organza glows without full transmission cost; pure `wrapDiffuse` unit-tested
- [ ] **Fabric fuzz Fresnel rim** — a grazing-angle Schlick-fuzz term so knit edges pick up a soft lint halo under the rim light; pure `fuzzFresnel` unit-tested
- [x] **Specular AA (Toksvig/LEAN)** — lift base roughness by the weave's normal strength so high-frequency weave normals stop shimmering at distance; pure `toksvigRoughness` unit-tested — PR #216
- [x] **Sheen tint/roughness from fabric** — auto-set sheen + `sheenColor` + `sheenRoughness` from the fabric family (muted woven · lustrous silk · soft knit · velvet nap) instead of a global; pure `sheenRecipeFromFabric` unit-tested — PR #216
- [x] **Strain cavity darkening** — the strain-driven wrinkle shader now also darkens the diffuse in the compressed fold valleys (reads fabric *compression*, unlike screen-space GTAO's geometric occlusion) so bunched creases read deep without a baked AO map; pure `cavityFactor` unit-tested — PR #219
- [ ] **Retroreflective trim lobe** — a back-toward-source reflection term for hi-vis / 3M scotchlite tape + reflective piping; pure `retroLobe` unit-tested

**Procedural fabric textures — GPU** _(extend `fabric/weaveTexture` + finish maps beyond normal-only)_
- [x] **Procedural weave roughness map** — a per-texel roughness derived from the weave height (yarn crowns glossier, valleys matte) baked into a cached `roughnessMap` alongside the normal map, on every garment part (finishes/swatch keep their own); pure `weaveRoughness` unit-tested — PR #216
- [ ] **Procedural weave height/displacement** — a tiling height map for parallax + optional tessellation so the weave has real relief at macro close-up; pure `weaveHeight` unit-tested
- [ ] **Weave anisotropy-direction map** — bake the local warp-tangent angle per texel so the anisotropic-GGX lobe knows the grain everywhere; pure `weaveTangentMap` unit-tested
- [ ] **Two-scale normal blend (RNM)** — combine a coarse fold normal with the fine weave normal via reoriented-normal-mapping so both read at once; pure `blendNormalsRNM` unit-tested
- [ ] **Parallax-occlusion weave** — POM the weave height so grazing views show yarn self-occlusion/parallax, not a flat decal; pure `pomOffset` unit-tested
- [ ] **Mip + anisotropic filtering on procedural maps** — generate mip chains + set max-anisotropy on the CanvasTexture weave/finish maps so they don't alias into moiré at distance; test mip + filter flags
- [x] **Ordered-dithered finish gradients** — `paintOmbre` now bakes **per-pixel through the tested `ombreT` field** + an 8×8 Bayer `bayerDither` offset, so the dip-dye ramp no longer 8-bit bands (stair-steps); pure `bayerDither` unit-tested — PR #217
- [ ] **GPU-baked weave synthesis** — move `weaveTexture` synthesis onto a render-to-texture fragment pass so 2K/4K weave maps bake in a frame instead of a slow CPU canvas loop; benchmark bake time
- [ ] **Macro albedo × tiled detail map** — a low-freq print/albedo times a high-freq tiled detail-normal so a big garment stays crisp without a huge texture; pure `detailUV` unit-tested
- [ ] **Curvature-driven fuzz mask** — write a fuzz/lint intensity map from mesh curvature so edges/seams pick up more pile than flats (procedural, no hand-paint); pure `fuzzMask` unit-tested

**Rendering pipeline & post** _(refine `core/Viewport` composer + `core/Environment`)_
- [ ] **Temporal AA (TAA)** — accumulate jittered frames with motion-vector reprojection (needs the motion-vector attribute) for far cleaner edges + sub-pixel weave than SMAA on the still Render tab; verify no ghosting on the turntable
- [ ] **FXAA fallback path** — a cheap FXAA option for low-end GPUs where SMAA's cost hurts; toggle + verify parity on a still
- [ ] **PCSS contact-hardening shadows** — variable-penumbra soft shadows (blocker search + PCF) so contact points are crisp and the shadow softens with distance; verify the penumbra widens with the gap
- [ ] **Cascaded shadow maps** — split the view frustum into cascades so a full-length gown gets crisp foot shadows and soft far shadows from one directional key; verify resolution at the hem
- [ ] **Screen-space contact shadows** — a short depth-buffer ray-march for the tiny contact occlusion under collars/folds the 2048 shadow map misses; verify on a layered collar
- [ ] **Half-res GTAO + bilateral upsample** — run the AO at half-res with a depth-aware upsample so the budget buys more samples / wider radius; benchmark vs the current full-res GTAO
- [ ] **Screen-space reflections on the floor** — SSR for the reflective studio floor so the garment's reflection tracks the real drape, not a mirrored proxy; verify against the shadow-catcher
- [ ] **Bloom lens-dirt + luminance knee** — a subtle lens-dirt texture + soft-knee luminance threshold so only true speculars bloom (sequins/satin), not bright cloth; snapshot-verify
- [x] **AgX / Filmic tonemap options** — `Viewport.setToneMapping` + pure `toneMappingMode` select AgX · Neutral · Filmic (Cineon) · Reinhard beside ACES (via `?tonemap=` **and a Tone-map picker in the Scene panel**), for a film-neutral, less-saturated highlight rolloff on white satin/sequins; pure map unit-tested — PR #222, #227
- [ ] **Histogram auto-exposure** — a metered exposure from the frame luminance histogram so dark/bright fabrics both sit mid-key without a manual tweak; pure `histogramEV` unit-tested
- [x] **Dithered backdrop gradient** — the studio cyclorama gradient is now baked per-pixel with the 8×8 `bayerDither` (and widened) so the smooth sweep no longer 8-bit bands behind the figure — the main on-screen banding source; reuses the tested dither — PR #221
- [ ] **Half-res sheer pass** — composite sheer layers at half-res with a depth-aware upscale to afford heavier sheer stacks without full-res overdraw; benchmark overdraw

**GPU performance & parallelism** _(scale the sim + draw to ultra-res garments)_
- [ ] **WebGPU compute XPBD solver** — port the substep (integrate + coloured-batch projection) to a WGSL compute shader so ultra-res garments solve on the GPU; feature-detect + fall back, benchmark vs JS/Worker
- [ ] **WebGPU renderer backend** — a `WebGPURenderer` path behind a flag for lower-overhead draw submission + compute↔graphics interop with the GPU solver; verify visual parity
- [ ] **GPU normals + aero pass** — compute per-frame vertex normals + per-triangle aero in a compute pass so the CPU stops recomputing them each frame; benchmark the transfer saved
- [ ] **SharedArrayBuffer zero-copy worker** — run the solver in a Worker over a `SharedArrayBuffer` so positions are read by the render thread with no structured-clone copy; measure the copy eliminated
- [ ] **Runtime geometry LOD swap** — swap a coarse/fine sim+render mesh by camera distance / on-screen size (distinct from the export-only quadric LOD) so far garments cost less; pure `lodForDistance` unit-tested
- [ ] **Instanced sequin/bead/button fields** — one `InstancedMesh` (per-instance transform + colour) for beading, studs, and button rows so a beaded gown is a handful of draw calls; pure instance-matrix build unit-tested
- [ ] **Frustum + small-feature culling** — cull off-screen accessories/decor and skip sub-pixel instances so off-camera detail costs nothing; pure `cull` predicate unit-tested
- [ ] **KTX2 / Basis texture compression** — transcode the baked albedo/normal/rough to GPU-compressed KTX2 (async transcoder) to cut VRAM + upload time on multi-part garments; benchmark VRAM
- [ ] **GPU-resident resting geometry** — keep a sleeping garment's position buffer GPU-resident (skip the per-frame re-upload the sleep state implies) and only re-upload on wake; measure uploads avoided
- [ ] **Interleaved vertex buffer** — pack position/normal/uv/tangent/strain into one `InterleavedBuffer` so a garment is a single VBO with fewer attribute binds; verify attribute offsets
- [ ] **Async shader precompile** — `compileAsync` the garment + finish material variants during load so the first drape frame doesn't hitch on shader compilation; measure the first-frame stall
- [ ] **Draw-call + overdraw HUD** — a dev overlay reporting draw calls, triangles, texture memory, and overdraw per frame so perf regressions surface while editing; pure counter-rollup unit-tested

**Numerical robustness & validation** _(guard the math the eye can't)_
- [ ] **Finite-difference gradient checks** — assert every constraint's analytic gradient matches a central-difference numeric one (dihedral · shear · volume · tether) so a bad derivative can't ship; pure `gradCheck` harness unit-tested
- [x] **Constraint-residual divergence guard** — `XPBDSolver.maxResidual()` exposes the worst `|len − rest|` over the distance constraints; a test asserts a settled dress/gown/wide-leg stays finite + bounded (no constraint blows up to metres), guarding the solve like the energy/NaN checks — PR #221
- [x] **Golden-drape regression** — a test drapes the same garment twice and asserts bit-identical settled positions (no RNG / wall-clock in the sim), the basis for a settled-position snapshot; catches silent drape drift — PR #220
- [x] **CFL monitor** — pure `cflNumber(maxSpeed, dt, restLength)` (Courant number) flags a particle stepping past a rest edge (tunnelling); unit-tested safe (<1) vs unsafe (>1) — PR #220
- [x] **Momentum-conservation test** — with gravity/damping/drag off, a perturbed free patch's centre of mass does not drift, proving the constraint projection applies equal-and-opposite impulses (no phantom forces) — PR #220
- [x] **Stiffness / condition monitor** — pure `stiffnessRatio(compliance, mass, dt)` + `substepsForStiffness` rate a preset's numerical stiffness (a rigid woven reads stiffer than a soft knit → wants more substeps); unit-tested — PR #220
- [x] **Rest-state settle test** — asserts a draped garment reaches the sleep threshold within a bounded frame count at wind-off (guards the "hangs perfectly still" promise + the sleep logic) — PR #220
- [x] **Cross-resolution drape invariance** — a test builds the same dress at a coarser vs finer ring count, drapes both, and asserts the gross extent (length/width/depth envelope) agrees within 8 cm so raising resolution sharpens folds without moving the garment — PR #221

---

## 🌟 Roadmap — next 50 _(forward-looking features beyond the shipped core — bigger product bets, grouped by area)_

**Menswear & tailoring**
- [x] **Menswear suit block** — `suit-jacket` (closer/structured than the blazer) + matching creased `suit-trousers`, one cloth — PR #293
- [ ] **Lapel geometry** — notch / peak / shawl lapels with a configurable width + roll line
- [x] **Shirt tailoring** — `dress-shirt`: shirt collar · placket · buttoned cuffs · yoke · darts — PR #293
- [x] **Vest / waistcoat** — `waistcoat`: fitted deep-V, buttoned, welts, lined — PR #293
- [x] **Overcoat blocks** — `overcoat`: below-knee, roomy over a suit, flap pockets — PR #293
- [x] **Trouser break + crease** — a pressed fore/aft crease baked into the leg rest shape (pure `creaseWave`, survives the drape) + a hem break that stacks on the ankle; trouser family only, on by default for Trousers (`?crease=1` · `?break=1`) — PR #254

**Activewear, swim & foundation**
- [x] **Compression fit** — negative ease (to −3 cm) that stretches taut over the body: gradeParams floor + panel/quick-edit range + activewear defaults draft under the body radius; solver-stability test — PR #249
- [x] **Mesh / perforated panels** — `athletic-mesh` perforated fabric: `Fabric.perforated` hex alpha-cutout with real see-through holes + lining drop (per-part zones = assign it to a part) — PR #251
- [ ] **Bonded / heat-sealed seams** — a no-stitch-line seam finish for performance wear
- [x] **Swimwear block** — a snug hourglass-cinched one-piece (`swimsuit`, spandex compression fit; lining/boning supported) — PR #248 _(two-piece/ruching later)_
- [x] **Sports bra / bralette** — an underbust band via `botR: 'chest90'` + ribbing as the elastic underband, cropped → longline by length (`sports-bra`) — PR #248 _(moulded cups/racerback later)_
- [x] **High-waist leggings** — a waist-anchored high-rise panel over second-skin leg tubes + waistband detail (`high-waist-leggings`) — PR #248 _(gusset later)_

**Fabrics & finishes**
- [x] **Metallic / lamé / foil** — `lame` fabric: `Fabric.metalness` (new field) + satin anisotropy reads as woven gold foil — PR #250
- [x] **Neoprene / scuba** — `neoprene` fabric: 420 gsm spacer knit, bendiness 0.15 → sculptural stiff drape — PR #250
- [x] **Sequin-base fabric** — `sequin-base`: part-metal cloth + paillette-scale normal relief; pairs with the sequins sparkle finish — PR #250
- [x] **Fringe / tassel / feather trim** — drape-following hem **fringe** on skirts + dresses (`garment/Fringe`, deterministic strand jitter, trim-coloured, `?fringe=1`) — PR #255 _(tassels/feathers + self-sway later)_
- [x] **Piping & corded edges** — a real 4 mm world-unit cord (`garment/Piping`, Line2) tracing the neckline + hem, trim-coloured, drape-following (`?piping=1`) — PR #258
- [ ] **Digital print on the weave** — a photo print that follows the grain + distorts with the drape
- [ ] **Thermochromic preview** — a colour-change fabric under a temperature slider

**Fit & made-to-measure**
- [ ] **3D body-scan import** — bring in an OBJ/PLY scan as a custom avatar to fit onto
- [x] **Size recommendation** — live "Best fit for this body" hint from the graded POM's intended ease vs the avatar's real measurements (chest/waistband-weighted; `avatar/sizeRecommend`) — PR #265
- [x] **Per-customer fit profile** — named measurement sets saved/applied in one click (`avatar/fitProfiles`, made-to-measure panel; the size recommendation follows the person) — PR #267 _(per-person saved fit maps later)_
- [x] **Asymmetric fit** — the one-shoulder neckline (asymmetric `topEdge` feeding 3D + the pattern; `?neckline=` deep-link added) — PR #294
- [x] **Posture presets** — athletic · slouch · swayback carriage layered on any pose; bends colliders + visual shaping + anchors in lock-step so garments re-drape onto the new carriage (`avatar/posture`, Avatar panel, `?posture=`) — PR #261
- [x] **Ease-by-zone editor** — chest/waist/hip ease offsets landing on their own landmarks across the whole catalog; flows into pattern/metrics/POM automatically (`?easeChest/easeWaist/easeHip=<cm>`) — PR #268

**Animation & motion**
- [ ] **Mocap clip import** — drive the avatar from a BVH / FBX motion clip
- [x] **Cloth tearing** — constraints rip past ~1.5× the fabric's stress-fail strain (`tearPass` + `onTear`); the mesh drops bordering quads via the shared `tubeIndices` emitter (Scene toggle · `?tearing=1`) — PR #272
- [x] **Turbulent wind field** — the Storm preset: a deterministic noise field sampled per particle (`cloth/turbulence`, scaled by |wind| so Still stays still); classic presets byte-identical (`?wind=storm`) — PR #264
- [x] **Walk-cycle library** — commercial (byte-compat default) · editorial · sport walk styles driving both body paths (`avatar/walkStyles`, Avatar panel, `?walk=`) — PR #266
- [x] **Slow-motion capture** — `Loop.setTimeScale(0.25)` while recording: full-resolution fixed steps at quarter playback = 4× temporal cloth detail (File → Record slow-motion clip) — PR #271
- [ ] **Two-avatar scene** — a pair walking / interacting for a campaign shot

**Rendering & output**
- [x] **Path-traced hero render** — an offline high-quality still (three-gpu-pathtracer): `core/PathTracer.renderPathTraced` bakes the posed scene into a BVH + converges N accumulated samples via `WebGLPathTracer` for true global illumination · soft shadows · accurate fabric sheen (a step up from the rasterised `renderStill`); non-PBR meshes (`Reflector` floor · shadow-catcher) are hidden for the trace (only `MeshStandardMaterial`/`MeshPhysicalMaterial` survive — else the material bake crashes on a missing PBR `color`), a `GradientEquirectTexture` studio dome drives the env light (the live PMREM env isn't a sample-able equirect), and the caller pauses the loop so the tracer owns the canvas then restores; **Render tab** gains a `✦ Path traced` toggle + Draft/High/Ultra quality selector + a live convergence progress bar (async, cancellable — a new resolution/quality supersedes an in-flight trace); `?pathtrace=1[&ptQuality=]` deep-link; pure `core/pathTracePlan` (quality → sample/bounce/tile budget · width clamp · progress fraction) unit-tested
- [x] **Ghost-mannequin flat-lay** — `setGhost`: body/accessories/hair hidden, colliders + fit fully live so the garment floats holding its worn shape (View menu · `?ghost=1`; pairs with `?backdrop=product-white`) — PR #259
- [x] **360° product viewer** — a self-contained drag-to-spin HTML sprite viewer (24 pre-rendered angles, autoplay + drag + arrows; File → Export 360° viewer) — PR #257 _(glb-based viewer later; USDZ AR export already covers 3D handoff)_
- [x] **Multi-angle contact sheet** — 6 labelled angles around the current view composited into one 3×2 grid PNG (pure `contactViews`/`contactGrid`; File → Export contact sheet) — PR #256
- [x] **Social video presets** — 9:16 / 1:1 / 4:5 turntable recordings via a centre-cropped offscreen recording canvas (`studio/socialPresets`, File menu variants) — PR #270
- [x] **Motion-blurred turntable** — accumulation-trail blur on the offscreen recording canvas (pure `trailAlpha`; composes with the social crops) — PR #271
- [x] **Focus-pull on the Render tab** — a rack-focus toggle + slider (near → subject → far, exponential `core/focus`) re-rendering the still live — PR #269

**Collaboration, catalog & business**
- [ ] **Cloud sync + share-by-link** — a project lives in the cloud, shareable read-only
- [ ] **Design comments & review pins** — annotate a spot on the garment, resolve threads
- [ ] **Version compare** — a visual diff of two saved designs (geometry + appearance)
- [x] **Line sheet / lookbook PDF** — a printable wholesale one-pager per design (hero · fabric/fibre · colourway swatches · size run · graded specs · landed cost + keystone pricing; File → Export line sheet) — PR #260 _(multi-design collection catalog later)_
- [ ] **Public portfolio page** — a hosted gallery of your designs
- [ ] **Tech-pack approval workflow** — submit → comment → approve, with a status trail

---

## 🧭 Roadmap — 50 more _(deeper product bets — new categories, engineering & platform)_

**Kids, maternity & adaptive**
- [x] **Kids' size range** — toddler → teen blocks with age-appropriate proportions (`avatar/kidsSizes` — head prominence + torso straightness fall with age; panel Life-stage buttons, `?kids=`) — PR #296
- [x] **Maternity fit** — an expandable belly panel + a drape that adjusts through trimesters (`avatar/maternity` — one capsule = collider AND visual metaball at index 13; trimester slider, `?belly=0..3`) — PR #296
- [ ] **Adaptive wear** — seated-fit patterns, magnetic closures, one-hand fastenings
- [ ] **Petite / tall / plus auto-proportioning** — re-grade the whole catalog per body archetype
- [ ] **Unisex / gender-neutral blocks** — a shared block that fits across bodies

**Footwear & bags**
- [ ] **Shoe last + upper designer** — sneaker / heel / boot uppers over a parametric last
- [ ] **Sole & tread designer** — a 3D-printable outsole with a tread pattern
- [ ] **Handbag / tote builder** — panels, gussets, straps, and placed hardware
- [ ] **Strap & buckle hardware library** — buckles, D-rings, clasps, sliders
- [ ] **Bag lining + pocket layout** — an interior editor with zip/slip pockets

**Hardware & notions**
- [x] **Buttons & closures designer** — per-layer `ClosureDesign` (button count 2–9 / size 8–30 mm / colour · zip tape + pull colours) via `studio/closureDesign` + a panel block, `?buttons=` deep-links — PR #295
- [ ] **Zipper builder** — tape colour, teeth style, pull + slider options
- [ ] **Rivet / eyelet / snap placement** — snap hardware dropped onto a seam/edge
- [ ] **Enamel pin / patch designer** — a raised badge with a stitched-edge preview

**Print & graphics studio**
- [ ] **In-app vector print editor** — draw shapes/paths, not just import a file
- [ ] **Repeat-pattern engine** — half-drop · brick · mirror tiling of a custom motif
- [ ] **Print warp-to-seamline** — a placement print that wraps cleanly across seams
- [ ] **Gradient-mesh + duotone** print effects
- [ ] **Puff / discharge / foil** print simulation (raised + specialty inks)
- [ ] **Layered print with registration** — knockout layers + a registration preview

**Textile & knit engineering**
- [x] **Knit stitch designer** — a cable/rib/jacquard chart → the 3D knit surface. A hand-knitter's stitch chart (a cell per stitch: knit · purl · cable crossing left/right, course 0 at the bottom) → a pure height field — raised knit wales with a V notch, squat purl bumps, cable columns leaning into a braid — baked into custom normal + roughness maps replacing the preset weave; 6 preset charts (stockinette · garter · 1×1/2×2 rib · seed · cable rope) + a cell-cycling editor modal with a live shaded preview (`fabric/knitChart` + `ui/knitChartEditor`); mutually exclusive with the weave draft; per-layer, `.dio` + colorways; `?knitChart=<preset>`; unit-tested. Jacquard/colourwork stays on the Intarsia card — PR #306
- [x] **Weave draft designer** — threading/treadling → the procedural weave map. A real loom draft (threading · tie-up · treadling) → the pure **drawdown** interlacement grid + wrapped float lengths → a float-length-aware height field (long satin floats sit high + flat, plain interlacements ridge) baked into custom normal + roughness maps that replace the fabric preset's weave; 6 preset drafts (plain · basket · 2/2 twill · 3/1 denim · 5-end satin · herringbone) + the classic four-quadrant grid-editor modal with a live drawdown preview (`fabric/weaveDraft` + `ui/weaveDraftEditor`); per-layer, saved in the `.dio` + colorways; `?weaveDraft=<preset>`; unit-tested — PR #305
- [x] **Yarn library** — count · ply · twist that change the fabric hand. Pure `yarnHand` derives hand multipliers from the spinner's grades (count tex · ply · twist): chunky = heavier cloth + coarser gauge + deeper relief, lace = light + dense, high twist = crisp/springy, soft single = limp fuzzy halo; `yarnAdjustedFabric` applies them clamped, and every `GarmentStack` fabric resolution honours the layer's yarn — so the same preset fabric in lace vs chunky genuinely **drapes and reads** differently (physics + PBR both). 7 presets (lace → chunky + single-ply/crepe spins) + count/ply/twist sliders; `stack.setYarn` refreshes look + drape together; per-layer, `.dio` + colorways; `?yarn=<preset>` (`fabric/yarn`); unit-tested — PR #308
- [ ] **Fully-fashioned knit shaping** — shaped panels with no cut edges
- [x] **Intarsia / colourwork** — placed colour blocks in the knit. A knitter's colour chart (yarn-index cells over a 2–6 yarn palette, course 0 at the bottom) worked **fair-isle** (an allover jacquard tiling the whole garment, yarn 1 = ground) or **intarsia** (one placed front-chest block, yarn-1 cells transparent + scoped to the body part so it can't repeat on sleeve UVs); pure mirror-corrected `colourworkIndex` + `paintColourwork` bake crisp stitch blocks with alternate-course shading into the design-art albedo behind the prints — the colour layer composes with the knit chart/weave draft structure into a true jacquard; 5 presets (Fair Isle band · argyle · zigzag · heart · star) + a yarn-palette painting modal (`fabric/colourwork` + `ui/colourworkEditor`); per-layer, `.dio` + colorways; `?colourwork=<preset>`; unit-tested — PR #307

**Sustainability & materials**
- [x] **Material passport** — fibre + group + recyclability + mono-material + eco flags in the manufacturing pack (`export/sustainability.fibreGroup`) — PR #273
- [x] **Water / CO₂ footprint** — per-garment estimate from real fabric mass × per-kg coefficients (deadstock ~10%) — PR #273
- [x] **Deadstock / recycled flags** — panel toggles riding the layer into .dio + the pack (passport/footprint/score respond) — PR #273
- [x] **Circular-design score** — 0–100 heuristic: mono-material + recyclable fibre + eco sourcing; zips/linings subtract — PR #273
- [x] **Longevity care guidance** — fibre-specific wash/repair habits in the pack — PR #273

**Manufacturing & sourcing**
- [x] **Factory-format tech-pack** — one versioned machine JSON (`designio.factory-pack` v1) with the pattern embedded as DXF-AAMA (layer 1 boundary / 8 internals — the Gerber/Lectra/Optitex interchange) — PR #274
- [x] **BOM with suppliers + lead times** — `supplierFor(fabric)` sourcing profiles + lead windows per fibre group, in the pack BOM + factory JSON — PR #274
- [x] **Sample-order generator** — colourway × size qty grid + Proto/SMS/PPS stages + dates/ship-to/notes (File → Export sample order) — PR #263
- [x] **Production size-set exporter** — the graded pattern at every size (SVG+DXF per size, one ZIP) via the same gradeParams path (`export/sizeSet`) — PR #275
- [x] **QC spec sheet** — measure-and-tick inspection sheet from the graded POM (spec ± tol, acceptance ranges, 5 sample cells, AQL note; File → Export QC inspection sheet) — PR #262

**Retail & e-commerce**
- [ ] **Storefront product page export** — images + 360° + a spec block
- [ ] **Virtual try-on widget** — a shopper picks a body and sees the fit
- [ ] **Made-to-order configurator** — a customer customizes colour/fabric/fit
- [x] **Pricing calculator** — cost → margin → suggested retail: pure `export/cost.priceFromCost` takes the landed cost + a target gross margin and prices **wholesale** to hit it (`cost / (1 − margin)`), then **suggested retail** off a keystone multiple (default 2.2×), backing out the realised margin % + markup % (margin clamped < 100 %, retail multiple ≥ 1, zero-cost safe); the manufacturing pack's cost sheet now renders a **Pricing** block (wholesale · gross margin · suggested retail); unit-tested
- [ ] **Shopify / Etsy listing export** — a ready-to-publish product listing

**Education & community**
- [ ] **Interactive tutorial mode** — a guided first design, step by step
- [ ] **Pattern-making lessons** — overlaid teaching on the real tool
- [ ] **Template marketplace** — buy/sell blocks + finished designs
- [ ] **Community challenges** — themed prompts + a featured gallery
- [ ] **In-app term glossary** — hover any construction term for a definition

**Platform & infrastructure**
- [ ] **Plugin API** — third-party fabrics, tools, and exporters
- [ ] **Headless render API** — batch renders through a job queue
- [ ] **Mobile companion** — view + present a design on a phone/tablet
- [ ] **Real-time collaboration** — multiple editors, live cursors, presence
- [ ] **Design version control** — branch / merge a design like code

---

## 🧵 Detailed backlog — batch added 2026-07-15

_A fresh, specific pass across every lane. Each is a concrete, self-contained build, not a theme._

### Garment silhouettes & types
- [ ] **Wrap dress with a functional tie** — a self-belt threaded through a side-seam waist slit, an adjustable wrap depth (overlap %) + a hidden inner waist snap so it doesn't gape
- [ ] **Trench coat** — double-breasted with a storm flap + gun flap, a belt through D-ring loops, sleeve strap tabs, and a back kick-vent that opens on the walk
- [ ] **Tailored blazer** — a notched lapel with a real roll line, a chest welt, functional 4-button surgeon's cuffs, and a lined back double vent
- [ ] **Box-pleat tennis skirt** — knife-crisp all-round box pleats over a sewn-in short liner (the liner its own never-rendered collide layer)
- [ ] **Bomber jacket** — ribbed knit collar/cuff/hem bands, a two-way separating zip, a zip-guard placket, and a sleeve utility pocket
- [ ] **Bias-cut cowl slip dress** — a draped cowl at the front neck **and** the back, on adjustable spaghetti straps that actually take the weight
- [ ] **True circle skirt** — a full-circle draft that settles into deep, even radial waves instead of gathered folds
- [ ] **Dungarees / overalls** — a bib front on adjustable buckle straps with functional side-button openings at the waist
- [ ] **Cape / ruana with arm slits** — a shoulder-draped cape with real armhole slits + an optional attached hood
- [ ] **Structured corset top** — external boning channels, back lacing that visibly cinches the waist, and a hook-and-eye busk front

### Construction techniques
- [ ] **Bound buttonholes** — welt-lipped buttonholes on a coat placket (a finished rectangle, not a slit dash)
- [ ] **Godet inserts** — triangular flare panels sewn into vertical seams for a fluted mermaid hem (real take-up in 3D + the panels on the flat pattern)
- [ ] **Pin-tucks** — parallel rows of narrow stitched tucks down a bodice front or shirt yoke, each eating a sliver of width
- [ ] **Shirt sleeve placket** — a proper tower placket + a buttoned cuff tab (vs. the current continuous-bound placket)
- [ ] **Horsehair-braid hem** — a stiffened bridal/gown hem that holds a standing bell shape instead of collapsing
- [ ] **Waist stay** — an inner grosgrain ribbon anchoring a fitted bodice at the true waist so it doesn't ride up
- [ ] **Piped seam on any panel edge** — a corded contrast pipe available on *any* chosen seam, not just neckline/hem
- [ ] **Smocked panel** — a honeycomb-gathered smocked chest or cuff panel with real fabric take-up
- [ ] **Hem-finish picker** — blind-hem vs. fell-stitch vs. rolled-hem vs. raw-edge, each reading differently on the 3D hem + the tech pack
- [ ] **Collar roll & stand** — a real under-collar stand that rolls a shirt/coat collar over the band (a fold ridge, not a flat flap)

### Fabrics & surface
- [x] **Woven library expansion** — chambray · gabardine · ponte · scuba · melton · shirting oxford, each with correct gsm/drape/sheen: added 6 fabrics to `FabricLibrary` — **chambray** (light plain-weave shirting) · **gabardine** (crisp suiting twill) · **worsted wool** (smooth suiting twill) · **melton** (heavy 500 gsm felted coating) · **ponte** (stable double-knit) · **scuba** (smooth bonded double-knit), each with real gsm/stretch/bend/friction + weave/sheen/roughness/normal so they drape + read distinctly _(oxford already existed → added worsted wool instead; ponte/scuba are correctly the `knit` family)_; verified a gabardine coat + a ponte dress render right
- [ ] **Sequin fabric** — per-sequin facets that flip colour with the viewing angle (a scatter normal + a metal recipe)
- [ ] **Waxed cotton** — a matte-waxy sheen with sharp fold-memory creasing at the bends
- [x] **Patent / coated leather** — a high-clearcoat wet shine over a fine crackle normal: a `clearcoat` field on `Fabric` drives a glossy lacquer top layer in `FabricMaterial` (0 for every other fabric = three's default, so nothing else changes a pixel — golden-safe); a **patent leather** entry (black, low roughness, smooth low-normal, `clearcoat: 1`) reads as wet patent; verified on a dramatic-lit dress _(the fine crackle-aging normal is a deferred refinement)_
- [ ] **Bouclé tweed** — a looped-nub surface normal (the Chanel-jacket hand) + a fleck yarn
- [ ] **Devoré (burnout) velvet** — a semi-sheer motif etched into the pile (alpha cut where the pile is burned away)
- [ ] **Broderie anglaise** — punched eyelet holes on a scalloped edge with a satin-stitched rim
- [ ] **Ripstop nylon** — the reinforcing grid weave + a technical low-roughness sheen
- [ ] **Neoprene** — a spongy bonded-double-knit thickness with visible bonded-edge (raw, no hem) seams
- [ ] **Foil-pleat lamé** — a directional metallic highlight that runs along permanent pressed pleats

### Avatar, fit & pose
- [ ] **Seated pose** — a sitting stance to fit-check a skirt/trouser rise + where the hem sits at the knee
- [ ] **Heeled stance** — a heel-height slider that tilts the foot, straightens the leg, and lifts the back hem
- [ ] **Expressive poses** — arms-crossed · hands-on-hips · one-hand-in-pocket lookbook stances
- [ ] **Asymmetric-shoulder toggle** — one dropped shoulder (a real-body quirk) to test how a garment hangs off-square
- [ ] **Soft-belly male torso** — a rounder mid-section shape beyond the athletic V-taper
- [ ] **More hairstyles + hairline slider** — braids · high bun · ponytail · locs, with an adjustable hairline
- [ ] **Nail / manicure colour** on the hands for a fully-styled beauty shot
- [ ] **Eyewear accessory** — glasses/sunglasses placed on the head frame, riding the animated head
- [ ] **Sock + shoe stack height** so trousers break correctly over the chosen footwear
- [ ] **Editable studio floor material** — marble · seamless paper · parquet under the figure for the product shot

### Physics & simulation
- [ ] **Wind direction dial** — a heading + gust-frequency control on top of the preset strengths
- [ ] **Knit ladder / run** — a dropped stitch that runs down a jersey in a visible column under tension
- [ ] **Pocket-contents weight** — a phone-shaped mass that sags a patch pocket + pulls the fabric
- [ ] **Static cling** — a weak attraction between a lining and its shell so a slip clings to a skirt
- [ ] **Fitting pins** — tack a garment point to the body during a fit session (a designer's clamp), released on export
- [ ] **Elastic shirring** — a real elastic thread that gathers a waistband/cuff into even ruching
- [ ] **Live separating zip** — part a functional zip on the body (jacket open at the chest) and see it gap
- [ ] **Knit relaxation** — a jersey that bags slightly at elbows/knees/seat over settle time
- [ ] **Symmetry-lock drape** — mirror the settled left/right drape for a perfectly even product still
- [ ] **Undergarment collision proxy** — a thin support layer so a knit tee reads over real underwear, not a bare torso

### Render, export & workflow
- [ ] **Portrait rim + hair light rig** — a two-light headshot toggle for headwear/beauty shots
- [ ] **Exploded construction view** — panels floated apart in place with seam callouts (a build diagram)
- [ ] **Contact-shadow strength slider** on the studio floor (from off → a deep grounded shadow)
- [ ] **A/B version compare** — a wipe slider between two saved design snapshots in the viewport
- [ ] **Per-colourway fabric consumption** in the cost sheet — yield × price broken out by colour
- [ ] **Marker nap-lock** — a one-way/nap-direction constraint + panel flip/rotate when nesting napped fabrics
- [ ] **Collection tech-pack** — batch every layer/look in the project into one printable PDF
- [ ] **Editorial grade** — a film-grain + halation post toggle for a moody campaign render
- [ ] **Stitch-density heatmap** — a view of SPI / thread build-up across all the seams
- [ ] **Drape-coefficient badge on each swatch** — surface the drape-bench % on the fabric library tiles

---

## 🚀 Frontier — the futuristic roadmap (batch added 2026-07-15)

_The moonshots that make this a next-generation design tool. Each is deep + specific; most are multi-PR spikes, not quick cards._

### AI & generative design
- [ ] **Text-to-garment** — a prompt ("a puff-sleeve midi with a sweetheart neck in emerald crepe") assembles the closest parametric garment + fabric + colourway, fully editable after; a small on-device model maps language → the construction-cap vocabulary
- [ ] **Sketch-to-3D** — draw a flat croquis on the 2D canvas and an ML model lifts it into a sewn 3D garment with inferred panels, seams, and dart placement
- [ ] **Photo-to-garment reconstruction** — drop a runway/street photo → segment the garment → reconstruct an editable 3D approximation (silhouette + est. fabric + colour)
- [ ] **Style transfer between garments** — "make this dress in the spirit of that jacket" — transfer proportion, detailing, and finish, not just colour
- [ ] **Generative colourway + print engine** — an ML palette/print generator seeded by a mood/season brief, proposing coordinated colourways with a diversity slider
- [ ] **Auto-grade from one fitted sample** — learn a full graded size run (XS–XXL) from a single perfected M block by inferring the grade rules, not a uniform scale
- [ ] **Latent design-space explorer** — continuous morph sliders (fitted↔oversized · minimal↔maximal · classic↔avant-garde) that interpolate the whole garment through a learned space
- [ ] **AI fit critic** — an ML pass that detects pull lines, gaping, drag folds, and poor ease from the settled drape and proposes the exact pattern edit to fix each
- [ ] **Auto tech-pack writer** — generate the construction callouts + a written BOM in prose directly from the 3D model, factory-ready
- [ ] **Trend-forecast match** — score your library against an uploaded trend brief and flag which pieces align + the smallest tweak to hit the trend

### Next-generation simulation
- [ ] **Yarn-level knit simulation** — simulate the actual loop structure of a knit (stitch mechanics, inter-loop friction) for true knit stretch, curl, and run behaviour instead of a shell
- [ ] **Woven yarn-interlacement sim** — model warp/weft yarns as a physical lattice so a bias cut, a fray, and a pulled thread behave the way real cloth does
- [ ] **Anisotropic FEM cloth shell** — a finite-element shell with per-direction warp/weft/shear stiffness driven by real fabric-test data (KES-F / FAST)
- [ ] **Conditioning-aware drape** — how a fabric hangs when damp, warm, or starched (bending length + hand shift with temperature/moisture)
- [ ] **Seam-pucker prediction** — simulate thread tension vs. fabric stiffness to predict puckering along a stitched seam and warn before sampling
- [ ] **Heat-set crease memory** — press a permanent pleat/crease that survives the drape (a plastic-deformation term the solver respects)
- [ ] **Garment aging over wear cycles** — bagging at stress points, colour fade, and pilling progressing over simulated wash/wear time
- [ ] **CFD-lite wind field** — a real airflow solve (not a uniform force) so a cape/skirt reacts to directional, turbulent, obstacle-shed air
- [ ] **Live ironing / steaming tool** — press or steam a fold on the body in real time and watch the crease set or relax
- [ ] **Coupled multi-layer air pressure** — trapped-air between layers modelled as coupled shells (a lined coat that genuinely billows)

### Materials & digital-twin capture
- [ ] **SVBRDF capture from a phone** — photograph a real swatch under flash and recover a tiling albedo/normal/roughness/anisotropy PBR set
- [ ] **Photogrammetry drape-scan → stiffness** — a few phone photos of real draped fabric fit the solver's bending/shear parameters to match it
- [ ] **Spectral fabric colour** — store colour as a reflectance spectrum so metamerism (colour shift between store light and daylight) renders correctly
- [ ] **Measured BRDF library** — real goniophotometer lobes for velvet/satin/leather/lamé, replacing the parametric sheen fits
- [ ] **WIF loom-file export** — export the weave-draft drawdown as a WIF file a real dobby/jacquard loom can weave
- [ ] **Knitting-machine file export** — export a stitch chart as a Shima Seiki / Stoll–style machine file
- [ ] **Live mill-catalogue search** — query a real fabric supplier's catalogue and pull the swatch's specs + MOQ + price + lead time into the design
- [ ] **Pantone / dye-recipe match** — match a picked colour to the nearest Pantone TCX + a mill dye recipe with a ΔE readout
- [ ] **Physical thread & trim twins** — a drag-and-drop library of real thread weights, zipper gauges, and button sizes with physical + cost data
- [ ] **Learned fabric-hand descriptor** — translate the physical params into a designer's vocabulary (crisp · fluid · spongy · papery) and search by it

### Avatar, body & immersive try-on
- [ ] **Markerless motion capture** — drive live cloth off the user's real body motion via a webcam pose model (no suit, no markers)
- [ ] **AR showroom export** — a self-contained WebXR/USDZ scene a buyer opens on a phone to walk around the piece at true scale
- [ ] **Muscle & soft-body avatar** — secondary body motion (breathing, jiggle, muscle flex) so cloth reacts to real body dynamics, not a rigid capsule
- [ ] **Adaptive / seated avatar** — a wheelchair-seated body block + adaptive-clothing construction (magnetic closures, seated rise, side-access seams)
- [ ] **Facial expression + gaze** for beauty and headwear shots (blink, smile, look-to-camera)
- [ ] **Interactive hand poses** the garment reacts to — hand in pocket, holding a bag strap, arm raised to show a gusset
- [ ] **Gait / walk-cycle designer** — author a catwalk gait (stride, cadence, turns, pauses) that drives a full runway walk-through clip
- [ ] **Photoreal skin shader** — subsurface scattering + peach-fuzz + pore detail for macro close-ups at the neckline/cuff
- [ ] **Strand-based hair simulation** — real hair strands that a collar/hood/scarf pushes and interacts with
- [ ] **Scanned-body morph library** — a broad set of real scanned bodies (age · ability · size · posture) beyond parametric multipliers

### Pipeline, output & business
- [ ] **Game-engine export** — a rigged, LOD'd, game-ready GLB with baked cloth motion + a blendshape wardrobe for Unity / Unreal
- [ ] **Metaverse-avatar fitting** — auto-fit a garment to VRChat / Ready-Player-Me / Roblox rigs honouring each platform's constraints + poly budget
- [ ] **On-demand CMT handoff** — push the graded tech-pack + nested marker straight to a cut-and-sew / print-on-demand partner's intake API
- [ ] **Embeddable 3D viewer widget** — a brand drops a live, rotatable, AR-capable garment onto their own product page
- [ ] **Size-recommendation from 3 photos** — predict a customer's best size + fit notes from three phone photos of themselves
- [ ] **Live cost/margin feed** — recompute the landed cost + retail as a global material-price feed updates, flagging margin erosion
- [ ] **Lifecycle dashboard** — a per-design carbon + water + circularity score with a concrete "swap this for that" reduction advisor
- [ ] **Digital-sample sign-off** — a signed 3D sample that formally replaces a physical proto round in the approval chain
- [ ] **Returns-driven fit map** — feed real size-return statistics back in to flag a badly-graded size or a chronic fit failure
- [ ] **Voice + gesture control** — hands-free "rotate", "pin here", "make it looser" during a live fitting session

## ✨ Craft & detail — batch added 2026-07-15 _(cool, specific, mostly-tractable cards — real construction, rendering & interaction craft; each self-contained + unit-testable)_

### Rendering & materials
- [ ] **Real 3D topstitch thread** — replace the dashed decal along seams/hems with an actual raised thread tube (a swept low-poly cord following the seam curve) so topstitch catches light + casts a micro-shadow; SPI drives the bead pitch, thread weight the radius
- [ ] **Backlight translucency for thin cloth** — a thin cotton/silk should glow where the key light rakes through it (a cheap wrap-diffuse + thickness term in `FabricMaterial`), so a sheer sleeve reads translucent against a bright backdrop instead of flat
- [ ] **Directional nap tone shift** — velvet/corduroy/suede change tone with pile direction under the light (up-nap dark, down-nap bright); drive an anisotropic shading term off the weave/pile axis so brushing the surface visibly shifts it
- [ ] **Fabric flyaway fuzz silhouette** — a grazing-angle alpha fuzz hull on brushed knits/fleece/mohair so the silhouette reads soft + haloed instead of a hard edge (extends the fur pile to the rim, no extra geometry)
- [ ] **Screen-print ink realism** — placed prints get a plastisol option: a slight gloss + raised edge + optional distress "cracking" on the ink, distinct from the matte flat / embroidery / appliqué styles
- [ ] **Selvage & cut-edge rendering** — a woven's cut edge frays a few threads; a knit's edge curls; a bound edge shows the binding — so an open hem/raw edge reads true to its fabric family
- [ ] **Fold-contact soft shadow** — soften the contact shadow by gap distance (a fold just off the body casts a soft penumbra, a pressed contact a crisp one) so layered garments ground into each other believably

### Construction craft
- [ ] **Godet & gore inserts** — drop a triangular godet into a seam (or build an N-gore skirt) for a controlled flare burst at the hem; parametric insert height/width, sewn into the tube + unwrapped on the flat pattern
- [ ] **Cowl neck drape** — extra fabric bias-folded at the neckline that hangs in real catenary folds (a fabric-surplus term at the top edge the solver drapes), a distinct neckline from scoop/v
- [ ] **Peplum & waist ruffle** — a gathered flared frill seamed at the waistline of a top/jacket/dress (rides the waist anchor), with a fullness slider that sets the gather ratio
- [ ] **Bound buttonhole + real welt pockets** — buttonholes cut as real slits with lip welts, and welt/besom pockets as actual openings, distinct from the current patch pockets — folded into the tech pack + flat pattern
- [ ] **Cuff plackets & sleeve tabs** — a real shirt-cuff placket (slit + underlap + button) and a roll-up sleeve tab, so a long sleeve constructs like a true shirt sleeve
- [ ] **Belt loops that thread the belt** — parametric belt loops on the waistband that the belt accessory actually passes through (loop meshes + the belt path constrained to run behind them)
- [ ] **Shirred / elastic gather panels** — rows of elastic shirring that physically gather a panel (waistband, sleeve, back) — a per-row rest-length contraction the solver honours so the fabric puckers into real elastic ripples

### Interaction & workflow
- [ ] **Drape scrubber** — a timeline scrubber that replays the settle from flat → draped (record the deterministic step buffer), so you can scrub to any frame + snapshot the exact fold state you like
- [ ] **Pin / baste tool** — click the garment to drop a temporary pin that holds that point in space (a live anchor) so you can arrange a drape/fold by hand, then release; pins export as a fitting note
- [ ] **A/B compare split** — freeze the current look as "A", make edits, and drag a split-line to wipe between A and B live in the viewport for a side-by-side design decision
- [ ] **Edit-symmetry mirror** — a mirror toggle so a placement/edit on the left front mirrors to the right (prints, pockets, darts), with a break-symmetry escape for asymmetric designs
- [ ] **Fold / crease painter** — brush a crease line onto the fabric (a seeded fold the wrinkle shader + a light bending-bias respect) for a deliberately rumpled linen or a pressed trouser crease

### Simulation & fit
- [ ] **Hanger vs body drape toggle** — drape the garment on a hanger/dress-form/flat instead of the walking body (a gravity-direction + support-point change), for a flat-lay product shot or a "how it hangs in the closet" view
- [ ] **Pre-shrink / relax pass** — a one-click relax that lets the fabric settle to its true relaxed dimensions (release seam tension + take-up) before measuring, so the production spec reflects the relaxed garment not the stretched mesh
- [ ] **Stretch-recovery memory** — a knit that's been stretched over a curve keeps a little bagging (a plastic strain term) so ribbing at a cuff/hem reads worked-in rather than pristine

## 🧶 Weave & knit structure — batch added 2026-07-15 _(deeper procedural weave/knit micro-surface work — surfaced by a fabric-rendering audit; each self-contained + unit-testable)_

- [x] **Satin reads smooth, not beaded** — the satin weave's deep every-5th-cell binding dip baked a polka-dot grid across satin / charmeuse / velvet / lamé / sequin; made it float-dominant so it reads as the smooth lustrous float it is — PR #359
- [x] **Corduroy has vertical cords** — corduroy was weave `'twill'` (a diagonal); gave it a dedicated vertical-wale weave with rounded pile-topped cords over deep valleys — PR #360
- [ ] **Proper jersey-knit face** — the shared `'knit'` weave reads as a diagonal net; author a true single-jersey face (vertical columns of V-stitches / wales + subtle horizontal courses) so jersey / terry / ponte / scuba / spandex read as knit-face, not mesh
- [ ] **Per-fabric wale/thread density** — the weave bakes at a fixed 16 threads/tile; drive the thread count from the fabric so a fine poplin, a wide-wale cord, and a chunky rib each get their true scale instead of a uniform grid
- [ ] **Wide-wale vs pincord corduroy** — a wale-width control on corduroy (pincord · standard · wide-wale · jumbo) that sets cords-per-inch + cord roundness, with the pile direction driving the anisotropic sheen
- [ ] **Purl / reverse-stockinette knit face** — a reverse-jersey (purl-side-out) weave — squat horizontal bumps instead of vertical wales — so a garment can show its purl face (curled hems, purl-side design blocks)
- [ ] **Terry & bouclé loop pile** — a looped-pile micro-surface (French-terry loops, bouclé nubs) baked as a stochastic bump so towelling / bouclé reads loopy rather than flat knit
- [ ] **Herringbone & houndstooth woven structure** — true broken-twill herringbone + a houndstooth interlacement as weave heightfields (not just a printed textile), so the structure catches light like woven cloth
- [ ] **Weave-scale-aware Toksvig floor** — the specular-AA roughness lift is a flat `0.14·strength`; scale it by the on-screen weave frequency so fine weaves at distance don't shimmer while coarse ones keep their relief
- [ ] **Nap-direction shading for pile weaves** — corduroy / velvet / velour pile should brighten/darken with pile direction under the key light (up-nap vs down-nap), driven off the wale/pile axis so brushing the surface visibly shifts its tone

## 🐞 Rendering bugs — found in the fabric/garment audit (2026-07-15)

- [x] **Satin beading** — a hard binding-dip grid across all satin-weave fabrics; made float-dominant — PR #359
- [x] **Corduroy diagonal (not vertical)** — was a twill; gave it a real vertical-cord weave — PR #360
- [x] **Sewn-panel body friction** — `ClothWorld.solveBody` never damped tangential slide; now mirrors `XPBDSolver` (grippy clings, satin slides) — PR #357
- [x] **Camo/plaid tile seam** — non-periodic `textileValue` left a hard edge; made seam-continuous — PR #357
- [ ] **Long-sleeve drape on the procedural body (HIGH)** — a long sleeve juts out ~45–90° (worst on the blazer's contrast sleeve) instead of hanging down the (A-posed) arm; the jut is **asymmetric** (one sleeve worse than the other) but **deterministic**, and it hits **every** long-sleeve garment (top · long-sleeve · hoodie · coat · blazer). Full audit trace:
  - The sleeve tube **is** built down the arm — logged the arm capsules at build: shoulder `y≈1.43` → wrist `y≈0.82`, ~17° from vertical (A-pose). So the spawn geometry is correct, not horizontal.
  - The pin mechanism (`XPBDSolver.applyPins`) **freezes** each pinned ring at its bind-time rest position (static anchor → identity delta). Only the sleeve's **top ring** is pinned (to `armL/armR`); the rest of the sleeve is free.
  - On the **non-rigged** body `anchors()` sets `foreL/foreR = copy(armL/armR)` — the "forearm" anchor is actually at the *shoulder*. A real forearm anchor (forearm capsule, indices 6/10) + ungating the `bindPinsToBody` forearm pin **does** bind the mid-ring (verified, dist 6.5 cm) — but the visual jut **persists** (freezing the elbow doesn't stop the forearm section swinging out).
  - **Ruled out:** the shoulder-cap lift (`a.y += 0.7·armR`, inboard `0.55·armR`) — zeroing it did **not** fix the jut.
  - **⚡ BREAKTHROUGH — it is NOT the sleeve.** Rendering the same garment with `sleeve=none` **still juts** at the shoulder. So the jutting piece is the **body tube** (the torso garment) at the shoulder/armhole, not the sleeve — which is why *six* sleeve-side fixes never changed the picture (including pinning the **entire** sleeve rigid: guard passes nx=26/ny=22, all 22 rings pinned, still juts → the sleeve was never the culprit).
  - **What that means:** the top's body tube has a wide top ring at the shoulder line (radius ≈ chestR); at `y≈1.45` the body there is only the narrow neck, so the shoulder-point sides of the ring (`x≈±chestR`) hang **unsupported** in space and one side splays out under gravity (asymmetric = a deterministic solver symmetry-break, e.g. Gauss–Seidel order). A tank (thin straps, no shoulder span) doesn't do it; every full-shoulder top does.
  - **Ruled out (all verified by render + revert):** real forearm anchor + forearm pin · mid-ring pin · cuff pin · pinning the whole sleeve rigid · zeroing the shoulder-cap lift · snugging the long-sleeve width · disabling inter-piece `ClothCollision` · a **front/back neckline scoop** (`fillTube` pull-in on the z-axis — wrong axis, no effect). **11 verified experiments, all reverted.**
  - **Refined localization:** the billow is at the **shoulders / armhole SIDES** (x-extreme, `a≈0/π`), NOT the front/back (z). So a neckline/z-axis fix is the wrong axis — the fix must address the **armhole side**: a full-shoulder body tube has no armhole cut, so the side fabric spans the torso↔arm gap at the shoulder and splays into it.
  - **Attempt 12 — side-pin (planned Phase 1), FAILED:** pinned the body-tube's two shoulder/armhole side columns (±x, top 3 rows, ~8% band) to the torso anchor. Even **forced on** for a `sleeve=none` body it did **not** remove the jut (the fabric still billows around/below the pinned band). So *holding* the side fabric doesn't work — same conclusion as every prior pin attempt.
  - **Assessment of the armhole-cut (Phase 2):** the `cutouts` mechanism *can* remove the side fabric (so it can't billow), BUT the sleeve is a **separate mesh** that only *overlaps* to hide the gap — cutting the armhole would **expose the underarm/arm** through the opening (the sleeve doesn't fill it). To do it right the sleeve must **seam to the armhole rim** (stitch constraints between the body armhole edge and the sleeve cap), and `garmentPattern.unwrapTube` must trace the armhole. That's a **real garment-construction feature (multi-day)**, not a patch.
  - **Recommendation:** treat this as a **feature** — a proper armhole + sleeve-to-armhole seaming system (real armscye on the body tube, sleeve cap sewn to it, 2D-pattern armhole) — rather than continuing to patch the drape. 12 quick fixes have failed; the geometry needs to change, not the pins. Golden-regen path (bless the CI `golden-out` artifact) is ready for whenever that feature lands.
- [ ] **Shoulder-cap fabric puff** — the armhole-gap cap lift (`a.y += 0.7·armR`, inboard `0.55·armR`) leaves excess fabric at the sleeve head that puffs up/out over a thin arm; wants a smoother cap easing so the overlap closes the gap without bunching
- [x] **Waffle surface reads flat** — rebuilt the waffle weave as a chunky 2×2-thread thermal honeycomb (proud wall over a deep domed cell) so the relief reads at garment scale + a README photo — PR #367
- [x] **Fleece reads as a technical net** — added a napped-knit path in `applyFabric`: a knit with `nap` (fleece) gets the soft fleece fur pile normal + a matte roughness-uniform surface, so the base fabric reads fuzzy (not the sharp knit net); the `?fur=fleece` finish still layers over it + a README photo — PR #369
- [x] **Leather & suede read as woven crosshatch** — both used `weave: 'plain'` (a woven cross), wrong for a hide; added a dedicated `'leather'` weave — a shallow pebbled grain (fine rounded pebble + a large soft undulation, both integer-frequency so it tiles) — assigned to leather + suede, so leather reads as smooth grained hide and suede as matte grain (patent stays glossy-smooth via its clearcoat). Unit-tested (low relief + seam-continuous) + a README photo — PR #371

## 📐 2D pattern-making — batch added 2026-07-15 _(300+ specific flat-pattern CAD cards — the deep 2D drafting / grading / marker / production side, in the spirit of Gerber · Lectra · Optitex · Seamly2D · CLO 2D. Each is concrete + mostly unit-testable pure geometry.)_

### A. Drafting canvas & primitives
- [ ] **True-scale drafting canvas** — a real cm/inch grid the 2D pieces live on (not just an unwrap view), with pan/zoom, rulers, and a numeric origin, so points can be placed by exact coordinate
- [ ] **Point tool with coordinate entry** — drop a control point at an exact (x, y) or by offset (dx, dy) from an existing point; every point is named + editable in a point table
- [ ] **Line by length + angle** — draw a segment from a point at an exact length + angle (or Δx/Δy), the pattern-drafter's core stroke
- [ ] **Perpendicular & parallel construction** — drop a perpendicular from a point to a line, or a parallel at a set distance (armscye squares, waistline squares)
- [ ] **Point-on-line at distance / proportion** — place a point a set cm along a segment or at a fraction (¼, ⅓) of its length, staying live if the segment changes
- [ ] **Intersection points** — line×line, line×curve, curve×curve intersection markers that update as inputs move
- [ ] **Midpoint · bisector · division** — midpoint of a segment, angle bisector, and divide-into-N-equal-parts helpers
- [ ] **Tangent construction** — a line tangent to a curve from an external point (dart legs, hip-curve blends)
- [ ] **Snapping & guides** — snap to points/midpoints/intersections/grid + draggable construction guides, with a snap-distance setting
- [ ] **Reference (construction) vs finished lines** — a construction-geometry layer (thin/dashed) that drives finished lines but doesn't cut or export
- [ ] **Formula-driven dimensions** — any length/angle can be an expression referencing measurements + other values (`bust/4 + 1cm`), recomputed on change (the Seamly2D formula model)
- [ ] **Undo/redo on the draft graph** — the construction is a dependency graph; editing an upstream point re-solves downstream, with full undo
- [ ] **Point/curve labels + auto-lettering** — A, B, C… lettering along a draft (industry drafts read by letter), auto-placed + toggle-able
- [ ] **Measure-between overlay** — a live dimension line between any two points/curve that reads the current cm and stays attached
- [ ] **Mirror-live axis** — a symmetry axis so a half-draft mirrors live (edit one side, both update) until you "cut" to a full piece
- [ ] **Group / component sub-drafts** — reusable parametric sub-drafts (a standard armscye, a placket) inserted + positioned, editable as a unit

### B. Curve & line tools
- [ ] **Bézier / spline curve tool** — author neckline/armhole/hip curves as editable Béziers with handles, not just sampled arcs
- [ ] **Curve through points (interpolating spline)** — fit a smooth curve through N control points (waist→hip→hem), tension-adjustable
- [ ] **French-curve / hip-curve stamps** — a library of standard pattern-maker curves you can lay down + trace, matched at endpoints
- [ ] **Curvature-continuous blends** — G2 blends where two curves meet (a princess seam over the bust) so the joined line has no kink
- [ ] **Offset curve** — a true parallel offset of a curve at a set distance (internal design lines + seam allowance on curves)
- [ ] **Curve length readout + reshape-to-length** — show a curve's arc length and nudge its shape to a target length while keeping endpoints
- [ ] **Fillet & chamfer corners** — round or bevel a corner to a set radius (softened hems, rounded patch pockets)
- [ ] **Smooth / simplify a digitized curve** — reduce a noisy imported curve to clean control points within a tolerance
- [ ] **Flip / reverse curve direction** — reverse a curve's sense so seam-walk + notch ordering line up
- [ ] **Corner angle readout** — display the interior angle at a corner (checking a right-angle centre-front/hem)
- [ ] **Break / join curves** — split a curve at a point into two, or join two curves into one editable path
- [ ] **Convert arc ↔ bézier ↔ polyline** — switch a curve's representation for editing or export

### C. Blocks & slopers (drafting from measurements)
- [ ] **Bodice-block drafter** — a parametric front/back bodice sloper from bust/waist/back-length/shoulder/across measurements
- [ ] **Skirt-block drafter** — a straight/A-line skirt sloper from waist/hip/hip-depth/skirt-length
- [ ] **Trouser-block drafter** — a trouser sloper from waist/hip/rise/inseam/thigh/knee/hem with a real crotch curve
- [ ] **Sleeve-block drafter** — a one-piece sleeve drafted to a given armscye (cap height from AH, bicep, length) that *walks* to the bodice armhole
- [ ] **Two-piece (tailored) sleeve** — upper + under sleeve with the elbow bend, for jackets/coats
- [ ] **Dress block** — a torso block combining bodice + skirt through the waist with dart control
- [ ] **Bodice → shift/shirt derivation** — derive a shift, a shirt, a tunic from the block by adding ease + moving darts
- [ ] **Knit block (negative-ease)** — a stretch block that reduces girths by a stretch-factor for jersey/rib garments
- [ ] **Kids' / men's / plus block variants** — block drafts with the right proportion rules per size block, not a scaled women's block
- [ ] **Standard measurement charts** — built-in ASTM/EN/JP body-measurement tables to seed a block, editable
- [ ] **Ease chart per block** — wearing ease + design ease tables by garment type + fit (fitted/semi/relaxed/oversized)
- [ ] **Block library + versioning** — save/name/version personal blocks, branch a style off a block, re-fit when the block changes
- [ ] **Balance / hang lines** — draw the grain/balance lines on a block and check the piece hangs on-grain
- [ ] **Draft-from-3D** — flatten a fitted 3D garment back to a 2D block (the reverse of sew-to-drape), as a starting sloper

### D. Dart engineering
- [ ] **Dart insert** — add a dart at a point with a chosen leg-length + intake width; the wedge is real removed fabric
- [ ] **Dart rotation (pivot)** — pivot a dart's intake to a new position around an apex (waist → side/French/neckline dart), conserving intake
- [ ] **Slash-and-spread** — cut a slash line and spread/close it to move or add fullness, the fundamental transform
- [ ] **Dart-to-seam** — convert a dart into a shaped seam (a princess line) that removes the same shaping
- [ ] **Dart-to-gather / -tuck / -pleat** — release a dart's intake as gathers, tucks, or pleats instead of a stitched dart
- [ ] **Multiple / split darts** — split one dart into two or three smaller darts radiating from an apex
- [ ] **Dart equalization + apex setback** — set the dart point back from the true apex + balance leg lengths
- [ ] **Dart trueing (fold-and-cut)** — true the dart legs so, folded closed, the seam edge is a smooth line
- [ ] **Contour / fisheye (double-point) dart** — a waist contour dart with two points for a fitted dress/waistcoat
- [ ] **Dart intake from ease** — compute the required dart intake from the girth difference (bust vs under-bust) automatically
- [ ] **Dart underlay / cut-away** — choose whether the dart is pressed to one side or cut open + graded
- [ ] **Dart-value transfer log** — track where a block's total dart value went (bust/waist/shoulder) so nothing is lost

### E. Seams & seam allowance
- [ ] **Per-edge seam allowance (first-class)** — a different, editable SA per edge on the flat (export already does per-edge; surface it in the 2D editor)
- [ ] **SA by seam type** — presets that set the allowance from the seam (plain 1 cm · french · flat-fell · overlock · hem) per edge
- [ ] **Corner treatments** — mitered, butted, notched, and extended corners where two seam-allowance edges meet
- [ ] **SA corner auto-fold-check** — verify the allowance folds flat at a corner (no negative wedge) and flag bad corners
- [ ] **Sew line vs cut line as separate paths** — both drawn + exported, with the offset always current
- [ ] **Variable / tapered SA** — a seam allowance that tapers along an edge (a curved hem to a point)
- [ ] **Seam-intersection cleanup** — trim/extend allowances so adjoining pieces' corners nest without overlap
- [ ] **Turn-of-cloth allowance** — a fabric-thickness allowance on faced/collared edges so the layers roll correctly
- [ ] **SA on internal openings** — allowance around a slit/vent/pocket-mouth cut into a piece
- [ ] **Clip/notch the SA for curves** — auto-place clip marks in the allowance on tight concave curves so they press
- [ ] **Seam-type visual key** — the flat pattern shows each seam's type/stitch as a legend + coloured edge

### F. Notches, drill holes & marks
- [ ] **Notch types** — single · double · triple · T · slit · U · castle notches on an edge, industry-standard shapes
- [ ] **Balance / match notches** — paired notches on two edges that must align when sewn (walk-derived, auto-numbered)
- [ ] **Ease/gather notches** — notches that bound a gather/ease region with the ease amount labelled
- [ ] **Fold-line notches** — notches marking a fold (lapel roll line, cuff fold, hem fold)
- [ ] **Drill holes** — interior drill/awl marks for dart points, pocket corners, buttonhole ends, with an offset-from-point rule
- [ ] **Button & buttonhole placement marks** — a button run with count/spacing driving marks on both the button + buttonhole pieces
- [ ] **Punch / eyelet marks** — for drawstrings, lacing, grommets, placed by rule
- [ ] **Match-point cross marks** — internal registration crosses for a placed pocket/appliqué/panel
- [ ] **Notch depth/width standard** — set the shop's notch dimensions once; all notches use them (cutter-safe depths)
- [ ] **Notch-collision guard** — warn if a notch lands on a curve corner or too near another notch/edge

### G. Grainlines, fold lines & annotation
- [ ] **Grainline tool** — a double-arrow grainline on every piece, settable to warp/weft/true-bias, that the marker respects
- [ ] **Off-grain / bias angle** — set a piece's grain to an arbitrary angle (a bias-cut cowl) and carry it to the marker
- [ ] **Fold line (cut-on-fold)** — mark an edge as placed-on-the-fold so the piece is cut as a mirrored whole
- [ ] **Piece nomenclature block** — style · piece name · size · cut-count · fabric · grain stamped on each piece
- [ ] **Cut-count + fabric-type label** — "Cut 2 self · 1 interfacing" auto-derived from the piece's role
- [ ] **Directional / nap arrow** — a one-way arrow for napped/printed fabrics that constrains marker rotation
- [ ] **Internal design-line annotation** — style lines, topstitch lines, quilting lines drawn as annotation on a separate export layer
- [ ] **Text + leader notes on a piece** — freeform callouts with leader lines (e.g. "clip to here", "ease 0.5 cm")
- [ ] **Scale-check square** — a 10 cm test square on every exported sheet so a printed pattern can be verified at 100 %
- [ ] **Piece colour / hatch by fabric** — pieces tinted or hatched by their fabric so a multi-fabric style reads at a glance

### H. Trueing, walking & measuring seams
- [ ] **Walk-a-seam** — roll one piece's seam along the mating piece's seam to check equal length + notch alignment
- [ ] **Auto seam-length balance** — report the length difference of two seamed edges + where the ease/stretch sits
- [ ] **Ease distribution along a seam** — spread a seam's ease (sleeve cap, princess over bust) by a curve, not evenly
- [ ] **Trueing across a seam** — blend a line (waist, hem, armhole) smoothly across a seam so it's continuous when sewn
- [ ] **Right-angle-at-seam enforcement** — keep CF/CB/hem square to their seams (no dog-ears)
- [ ] **Dart-closed trueing** — re-true an edge with its darts folded closed so the cut edge is smooth
- [ ] **Corner-true when unfolded** — extend seam lines to their true crossing so a folded-open corner is correct
- [ ] **Seam-length table** — a live table of every seam's length + its partner, flagging mismatches over a tolerance
- [ ] **Girth-check ring** — sum a set of piece edges around a body girth (waist, chest) + compare to target + ease
- [ ] **Hem-sweep readout** — the finished hem circumference across all skirt/dress panels

### I. Fullness — pleats, tucks, gathers, flare
- [ ] **Add-fullness slash-and-spread wizard** — pick edges + a spread amount/ratio and the piece opens with fullness added, hem trued
- [ ] **Knife / box / inverted pleats** — insert pleats with depth + underlay, foldlines + direction arrows, hem allowance for the pleat
- [ ] **Accordion / sunburst pleats** — radiating pleats from a waist, with pleat count + taper
- [ ] **Pin-tucks & released tucks** — stitched-then-released tucks with take-up computed
- [ ] **Gather ratio control** — set a gather ratio (2:1, 2.5:1) on an edge; the flat lengthens + notches bound it
- [ ] **Shirring / smocking block** — a rows-of-elastic panel with the contraction ratio + finished vs flat size
- [ ] **Circular skirt calculator** — full / half / quarter / any-degree circle from waist, with the radius math + seam count
- [ ] **Godet insert** — drop a triangular godet into a seam for a controlled flare burst (also the 3D card)
- [ ] **Cascade / handkerchief fullness** — bias fullness for a cowl or a cascading ruffle
- [ ] **Flare-vs-fit slider on a panel** — parametrically morph a panel straight → A-line → full with the hem trued each step
- [ ] **Ruffle-strip generator** — a straight or circular ruffle strip for a target gathered/flared finished length

### J. Details on the flat — collars, cuffs, plackets, pockets
- [ ] **Collar drafters** — convertible · shirt (stand + collar) · mandarin · Peter Pan · shawl · notched lapel, each drafted to the neckline length
- [ ] **Stand + fall separation** — a two-piece collar with the roll line + the stand height
- [ ] **Cuff drafters** — barrel · French · single/double, drafted to the sleeve-hem + wrist + button extension
- [ ] **Placket drafters** — sleeve placket (tower / continuous-bound), shirt front placket, half-placket
- [ ] **Waistband drafter** — straight/contoured/curved waistband with extension, interfacing piece, and the button/hook marks
- [ ] **Yoke split** — split a back/shoulder yoke off a bodice with the seam + optional grown-on facing
- [ ] **Pocket drafts** — patch (with flap), welt / double-welt / besom, jetted, inseam, and slant-front pockets as real piece sets
- [ ] **Pocket bag + facing pieces** — the hidden bag + mouth facing generated with the pocket, on the piece list
- [ ] **Fly-front drafter** — zip fly with fly shield + facing + topstitch line + bar-tack marks
- [ ] **Vent / slit drafter** — a hem vent (skirt/jacket) or sleeve vent with the underlap/overlap + mitre
- [ ] **Hood drafter** — a 2- or 3-panel hood drafted to the neckline, with a drawstring casing
- [ ] **Epaulette / tab / loop generator** — small findings (belt loops, tabs, straps) as sized rectangles with fold marks

### K. Facings, hems, bindings & finishes
- [ ] **Cut-on vs separate facing** — extend an edge into a self-facing (fold-back) or generate a separate facing piece
- [ ] **All-in-one / combination facing** — a neckline+armhole facing as one shaped piece for a sleeveless bodice
- [ ] **Bias-binding calculator** — the length + width of bias strip to bind an edge, with the join/piecing count
- [ ] **Continuous-bias strip layout** — the parallelogram-tube method to cut a long continuous bias strip + its yield
- [ ] **Hem allowance by hem type** — plain / rolled / blind / faced / bound hem allowances, per edge, with the corner mitre
- [ ] **Mitred hem/corner** — a proper mitre where a hem meets a vent/opening
- [ ] **Facing-edge understitch line** — mark the understitch line on facings so the seam rolls to the inside
- [ ] **Interfacing / interlining pieces** — auto-generate fusible/sew-in pieces from the pieces that need them, cut back slightly
- [ ] **Lining derivation** — derive a lining from the shell (CB pleat allowance, shortened hem, wearing ease) as its own piece set
- [ ] **Seam / hem finish spec per edge** — assign a finish (overlock, bound, pinked, turned) that lands in the tech pack

### L. Grading
- [ ] **Grade-rule library** — named grade rules (X/Y growth per point per size) applied to graded points
- [ ] **Nested size run** — draw all sizes nested on one piece, colour-coded, from a base size + rules
- [ ] **Grade by measurement chart** — drive grading from a full size × POM chart instead of hand rules
- [ ] **Proportional (shift) vs incremental grading** — support both the simple shift and true per-point incremental grading
- [ ] **Grade reference point** — pick the growth origin (CF/CB/grade-point) per piece
- [ ] **Non-linear / split-size grading** — different increments below/above a break size (e.g. a plus-size curve)
- [ ] **Grade a curve smoothly** — regrade a neckline/armhole so every size's curve stays fair, not just moved points
- [ ] **Grade notches, drills, grainline, internal lines** — everything on the piece grades with it, not just the outline
- [ ] **Grade from a perfected fit sample** — infer the grade rules by comparing a fitted sample piece to the base
- [ ] **Size-set validation** — check every graded size still walks/trues/closes (no crossed seams at the extremes)
- [ ] **Half-size / cup-size grading** — a separate cup-size grade axis for bust-fit bras/bodices
- [ ] **Grade export (AAMA/ASTM rules)** — export the graded nest + the rule table in the standard formats

### M. Marker making & nesting
- [ ] **Marker layout canvas** — place graded pieces on a fabric-width strip at their grain, with live utilisation %
- [ ] **Auto-nest (efficiency)** — an automatic nesting pass that maximises fabric utilisation within grain/nap constraints
- [ ] **Fabric width + selvage buffer** — set the cuttable width + edge buffer; the marker respects it
- [ ] **Nap / one-way marker** — lock all pieces to one direction for napped/printed/pile fabric
- [ ] **Tubular / folded / open marker modes** — half-marker on a fold, tubular knit, or full open-width
- [ ] **Plaid / stripe matching** — a match grid so pieces align on the check at CF, seams, and pockets, with the repeat set
- [ ] **Bundle / size ratio** — cut-order ratios per size (e.g. S:2 M:3 L:2) that the marker instances
- [ ] **Piece buffer / gap** — a set gap between pieces so the cutter blade clears
- [ ] **Splice marks** — allowable splice zones across a fabric join in a long marker
- [ ] **Marker efficiency report** — utilisation %, fabric length, and per-size consumption, with a target flag
- [ ] **Manual override + collision guard** — drag pieces manually with overlap prevention + legal-angle rotation snapping
- [ ] **Multi-fabric markers** — separate markers per fabric/colourway (self, contrast, lining, interfacing)

### N. Digitizing & import/export
- [ ] **DXF export (AAMA & ASTM)** — the industry pattern-interchange formats with layers (cut/sew/internal/grade), round-tripping the import
- [ ] **DXF import round-trip fidelity** — read graded nests + notches + grainlines + piece names back in losslessly
- [ ] **Gerber / Lectra / Optitex readers** — import piece bundles where the formats are documented
- [ ] **HPGL / plotter export** — send a marker/piece to a wide-format plotter/cutter at 1:1
- [ ] **Tiled PDF export (full pieces)** — extend the existing tiled print to whole pieces + a marker, A4/A3/Letter with assembly map
- [ ] **Layered SVG export** — cut/sew/notch/grain/label as separate SVG layers for Illustrator/Inkscape
- [ ] **Photo / scan digitizer** — trace a paper pattern from a phone photo with perspective + scale calibration to true cm
- [ ] **Table digitizer input** — accept a digitizing-tablet point stream (line/curve/notch/drill/grain modes)
- [ ] **Cut-file export (DXF-cut / ISO-cut)** — a cutter-ready file with cut order + tool assignments
- [ ] **Measurement/rule CSV import-export** — round-trip measurement charts + grade rules as CSV/XLSX
- [ ] **Piece thumbnail sheet** — a contact-sheet PDF of every piece with its nomenclature for the pattern-card

### O. Pattern-piece management & the piece catalog
- [ ] **Piece catalog panel** — every piece listed with name · fabric · cut-count · grain · area, select-to-highlight on the flat
- [ ] **Mirror / asymmetric pieces** — cut-1-pair vs cut-2-same vs cut-1-on-fold, and true-asymmetry handling
- [ ] **Piece roles** — self / contrast / lining / interfacing / interlining / underlining, each a filterable set
- [ ] **Piece grouping by garment section** — front / back / sleeve / collar / pocket groups for big styles
- [ ] **Duplicate / mirror / flatten piece** — copy a piece, mirror it, or flatten a folded piece to full for editing
- [ ] **Piece-level lock + visibility** — lock a finished piece from edits; show/hide on the flat + in the marker
- [ ] **Auto piece-numbering** — stable piece numbers that survive edits, used across marker + tech pack + cut order
- [ ] **Seam-partner map** — record which edge sews to which edge on which piece (drives walk, 3D sew, and the tech pack)
- [ ] **Piece area + perimeter readout** — live per-piece area (fabric estimate) + perimeter (edge finishing)
- [ ] **Piece revision badges** — a piece flags when its upstream block/measurements changed and it needs a re-true

### P. Measurement, POM & fit
- [ ] **Points-of-measure (POM) sheet** — a garment measurement spec (chest, waist, HPS-to-hem, sleeve length…) measured off the flat pieces
- [ ] **POM tolerance + grade** — each POM with a ± tolerance + its graded value per size, for the tech pack + QC
- [ ] **Body vs garment measurement reconcile** — show ease = garment POM − body measure at each landmark
- [ ] **Fit-sample measurement log** — record measured sample values vs spec, flag out-of-tolerance, and suggest the piece edit
- [ ] **Made-to-measure remap** — feed a customer's measurements to re-solve the block + regrade the style to a bespoke size
- [ ] **Measurement dependency to the draft** — a changed body measurement re-solves the dependent draft points live
- [ ] **Size-chart authoring** — build/edit the brand's size chart (body + garment) with regional presets
- [ ] **Ease-map visualization** — a colour map on the 2D pieces showing ease/negative-ease by zone
- [ ] **Auto-fit critique from POM** — flag likely fit issues (tight hip, short rise) from the POM vs body deltas

### Q. 2D ↔ 3D sync & sew-simulation prep
- [ ] **Live 2D → 3D re-drape** — editing a flat piece re-sews + re-drapes the 3D garment without a full rebuild
- [ ] **3D → 2D flatten (true development)** — flatten a 3D surface to 2D minimizing distortion, with a strain map showing where it stretches
- [ ] **Auto seam-pairing from proximity** — propose which flat edges sew together from their 3D adjacency, editable
- [ ] **Stitch-line assignment on the flat** — draw internal stitch/topstitch lines in 2D and see them on the 3D garment
- [ ] **Arrange-on-avatar from 2D** — position flat pieces on the 3D body (front/back/sleeve stations) before the sew (extend the existing arrangement)
- [ ] **Baste-preview** — a fast low-res sew preview to check a seam pairing before the full drape
- [ ] **2D strain/tension read-back** — bring the 3D drape's strain back onto the 2D pieces so you edit the flat where it pulls
- [ ] **Symmetry-aware sew** — sew a mirrored pair with one seam definition
- [ ] **Internal-line → 3D feature** — a 2D dart/pleat/gather line becomes the real 3D take-up on drape
- [ ] **2D pattern diffing** — a visual diff of two pattern versions (added/removed fabric, moved notches)

### R. Production, QC & costing from the flat
- [ ] **Fabric consumption from the marker** — true yield (m + cost) per size + per colourway, not an estimate
- [ ] **Cost sheet from piece areas** — material cost from real piece area + waste %, feeding the existing cost roll-up
- [ ] **Cut order / lay plan** — plies × marker × size ratio → total fabric + a cut-ticket
- [ ] **Seam-length → thread + labour** — total seam length by seam type → thread metres + SAM labour estimate
- [ ] **QC measurement spec export** — the POM + tolerance sheet as a QC form for the factory
- [ ] **Pattern-card / spec sheet** — the classic pattern-envelope card (piece list, fabrics, notions, cut counts, marker)
- [ ] **Notion / trim bill from the flat** — buttons, zips, elastic lengths, binding metres derived from the pieces
- [ ] **Sew-order / operation breakdown** — an ordered operation list (a construction sequence) from the seam-partner map
- [ ] **Grade-nest print for the cutter** — a print-ready nested size run at scale with cut lines only
- [ ] **Fabric-utilisation target + alert** — flag a marker below the brand's utilisation floor before release

### S. Made-to-measure & parametric automation
- [ ] **Fully parametric style** — a style stored as a construction graph (formulas + rules), not fixed geometry, so any measurement set re-drafts it
- [ ] **Rule-based auto-grade** — grade a fully-parametric style with zero hand rules (the draft re-solves per size)
- [ ] **Style templates from a block** — parametric styles built on a block that re-fit when the block changes
- [ ] **Constraint solver** — dimensional + geometric constraints (this seam = that seam, this angle = 90°) the draft satisfies
- [ ] **Batch made-to-measure run** — a CSV of customer measurements → a folder of per-customer graded patterns + markers
- [ ] **What-if slider panel** — expose a style's key parameters (ease, length, flare, dart intake) as live sliders on the 2D + 3D
- [ ] **Auto-block-fit from a 3D scan** — fit a personal block to a scanned/measured body automatically
- [ ] **Design-intent capture** — a note per parameter recording why a value is what it is, so a re-fit keeps the intent

### T. Collaboration, versioning & UX
- [ ] **Pattern version history** — named snapshots of the whole pattern (pieces + grade + marker) with restore + diff
- [ ] **Piece-level comments / redlines** — pin a comment to a piece/edge for a fitter's note, resolvable
- [ ] **Measurement-driven live preview** — drag a body measurement + watch the flat + 3D update together
- [ ] **Keyboard-driven drafting** — type length/angle as you draw (a CAD-style command line) for fast drafting
- [ ] **Pattern print presets** — saved print jobs (tiled A4 home, plotter 1:1, contact sheet) per style
- [ ] **Unit + precision settings** — cm/inch, decimal/fractional inches, snap precision, per-project
- [ ] **Template + block sharing** — export/import a block or parametric style as a portable file
- [ ] **Draft-graph inspector** — a tree of the construction dependencies to debug a broken re-solve
- [ ] **Onboarding drafting tutorial** — an interactive "draft your first bodice block" walkthrough

### U. Specialty garment block drafters
- [ ] **Shirt / blouse drafter** — a full shirt block with yoke, front placket, collar+stand, cuff+placket, and back pleat, all sized off the block
- [ ] **A-line / flared dress drafter** — a dress from the bodice+skirt block with the waist dart released into flare
- [ ] **Wrap-dress drafter** — an overlapping wrap front with the tie extension + the neckline/hem crossover geometry
- [ ] **Princess-seam dress** — a bodice with the bust dart converted to a princess seam over the apex, front + side-front pieces
- [ ] **Culotte / palazzo drafter** — a trouser-skirt hybrid from the trouser + skirt blocks
- [ ] **Jumpsuit / boilersuit drafter** — a one-piece bodice+trouser through a dropped or fitted waist seam
- [ ] **Cape / poncho drafter** — a circular/segmented cape with the neckline + arm-slit geometry
- [ ] **Kimono / dolman drafter** — a grown-on sleeve (no armscye) with the underarm gusset for movement
- [ ] **Raglan drafter** — a raglan bodice + sleeve with the neck-to-underarm seam split from the block
- [ ] **Cowl-neck drafter** — a bias cowl draped as a 2D development with the fold-depth parameter
- [ ] **Peplum drafter** — a flared peplum from a waist seam (circular or gathered) with the join length matched
- [ ] **Gathered / tiered skirt drafter** — N tiers with a fullness ratio per tier + the seam lengths matched

### V. Knit & stretch-specific drafting
- [ ] **Stretch-reduction factor** — reduce girths by a per-direction stretch % so a knit block fits with negative ease
- [ ] **Two-way vs four-way stretch handling** — different reductions for warp/weft when only some directions stretch
- [ ] **Rib-band drafter** — neck/cuff/hem rib bands cut shorter than the opening by a stretch-fit ratio
- [ ] **Binding vs banded edge for knits** — the two standard knit edge finishes with their strip lengths
- [ ] **Fold-over-elastic (FOE) edges** — a FOE finish length + the seam-allowance treatment
- [ ] **Activewear panel-lines** — sculpting/colour-block panels on a stretch block that stay on-grain for compression
- [ ] **Flatlock / coverstitch seam spec** — knit seam types (flatlock, coverstitch, overlock) on the flat + tech pack
- [ ] **Gusset drafter (knit)** — a diamond/hexagonal gusset for leggings/bodysuits at the crotch
- [ ] **Seamless-knit tube layout** — a tubular-knit garment defined as a tube with shaping, no side seams
- [ ] **Recovery / power-mesh zones** — mark high-compression zones that use a firmer knit block region

### W. Bras, swim & foundation
- [ ] **Bra-cup drafter** — a 2-, 3-, or 4-piece moulded/cut-and-sew cup drafted to a bust volume + cup size
- [ ] **Cradle / frame + band** — the bridge, cradle, and band pieces with the underwire channel path
- [ ] **Wing + strap drafter** — the back wing with the hook-and-eye extension + strap placement
- [ ] **Cup-size grade axis** — grade cups independently of the band (a true bra size matrix)
- [ ] **Swimsuit block** — a maillot block with the leg-line, gusset, and the elastic-reduction along every edge
- [ ] **Bikini piece set** — top cups + ties + bottom with the side-tie or bonded-edge options
- [ ] **Elastic reduction per edge** — each foundation edge shortens by its elastic's stretch factor, edge-specific
- [ ] **Boning-channel layout** — draw boning channels + their spring-steel lengths on a foundation piece
- [ ] **Lining / power-net derivation** — a firmer inner layer derived from the shell for support
- [ ] **Nipple/apex + centre-front balance** — apex placement + CF depth parameters for cup fit

### X. Tailoring & structured garments
- [ ] **Tailored-jacket block** — a two-piece front with the bust dart, side-body, and the back with a CB seam
- [ ] **Notched / peak lapel drafter** — the lapel + gorge + collar with the roll line + the break point
- [ ] **Canvas / chest-piece pattern** — the internal haircloth/canvas shape for a structured chest
- [ ] **Shoulder-pad allowance** — add the pad thickness into the shoulder + armhole so the sleeve still sets in
- [ ] **Sleeve-head / sleeve-roll piece** — the wadding strip that supports a tailored sleeve cap
- [ ] **Welt/besom pocket + flap set** — jetted pocket pieces with the flap, welts, and the pocket bags
- [ ] **Vent (single/double) + facing** — a tailored back vent with the mitred facing + the bar-tack marks
- [ ] **Under-collar on the bias** — the under-collar cut on the bias with turn-of-cloth so the collar rolls
- [ ] **Waistcoat block** — a fitted waistcoat with the front points, welt pockets, and the back with a buckle strap
- [ ] **Trouser tailoring details** — fly, waistband curtain, back-dart, and the crease/press lines

### Y. Corsetry, historical & couture
- [ ] **Corset panel drafter** — a multi-panel corset over the bust/waist/hip with the boning + busk placement
- [ ] **Bias-cut gown development** — a true-bias dress panel with the on-bias grain + the seam-stretch allowance
- [ ] **Godet-gore gown** — a many-gore fishtail gown with each gore's flare + the seam lengths matched
- [ ] **Panniers / crinoline support** — a hooped underskirt structure pattern with the boning rings
- [ ] **Draping-to-pattern capture** — capture a physically-draped muslin (photo/scan) into flat pieces
- [ ] **Historical block library** — period blocks (Victorian bodice, 1920s, New Look) with their proportion rules
- [ ] **Couture seam allowances** — wide couture allowances + basting/thread-trace lines on the pieces
- [ ] **Boning-plan optimizer** — place boning to control a given seam's shape with the minimum count
- [ ] **Hand-finish spec** — mark hand-picked/prick-stitch/catch-stitch edges for a couture tech pack

### Z. Technical, performance & outerwear
- [ ] **Seam-sealing / taping paths** — mark which seams get seam-tape (waterproof) + the tape length
- [ ] **Bonded / welded-seam spec** — no-sew bonded edges with the bond-width allowance instead of an SA
- [ ] **Articulated knee/elbow darting** — pre-bent articulation via darts/seams for outdoor + moto gear
- [ ] **Zip drafters** — separating, invisible, two-way, and storm-flap zips with the tape + facing pieces
- [ ] **Baffle / down-channel layout** — quilted down baffles with the channel loft + the sewn-through vs box-wall option
- [ ] **Storm flap / draft tube** — a wind placket + an internal draft tube along a zip
- [ ] **Pit-zip / vent set** — an underarm vent with the zip + the mesh backing piece
- [ ] **Hood with wire brim + cord** — a technical hood with a wired peak + the drawcord channels
- [ ] **Reflective / bonded trim paths** — placement lines for reflective tape/piping on a piece
- [ ] **Pack / stuff geometry** — a garment's packed volume estimate from piece areas + fabric loft

### AA. Bags, hats & non-apparel flat patterns
- [ ] **Tote / duffel drafter** — panels + gusset + strap + base for a soft bag, with the seam-allowance boxes
- [ ] **Boxed-corner / gusset math** — the boxed-corner cut for a bag base from width×depth
- [ ] **Structured-hat panel set** — the crown gores + brim + band panels for a 6-panel/blocked hat (2D of the 3D hats)
- [ ] **Cap panel + bill pattern** — a 5/6-panel cap crown + the bill/underbill flat pieces
- [ ] **Glove / mitten drafter** — a hand-shaped glove with the fourchettes + thumb gusset
- [ ] **Shoe-upper flat** — a simple shoe/slipper upper development from a last outline
- [ ] **Belt / strap hardware layout** — strap lengths with buckle/D-ring/keeper placement + the punch holes
- [ ] **Soft-goods pattern (cushion/cover)** — a parametric cushion/cover with piping + zip closure
- [ ] **Pattern-piece kit export** — a labelled cut-kit sheet for a non-apparel maker

### BB. Standards, symbols & pattern hygiene
- [ ] **ASTM/AAMA symbol set** — standardized pattern symbols (grainline, fold, notch, drill, button) rendered to spec
- [ ] **Self-intersection / degenerate guard** — detect a piece outline that crosses itself or has a zero-area sliver
- [ ] **Open-outline / unclosed-piece check** — flag a piece whose boundary doesn't close before cut/marker
- [ ] **Minimum-SA / tiny-corner check** — flag corners/edges where the allowance is below the shop minimum
- [ ] **Grain-vs-symmetry sanity** — warn when a mirrored piece's grain would flip against a nap
- [ ] **Overlapping-notch / notch-on-corner check** — the notch-hygiene validator across all pieces
- [ ] **Piece-name / cut-count completeness** — flag any piece missing its nomenclature before export
- [ ] **Units & scale integrity check** — verify every piece shares the project unit + scale before a plot
- [ ] **Seam-partner completeness** — flag any finished edge with no assigned seam partner or finish
- [ ] **Round-trip export/import validator** — export then re-import a pattern and diff to prove no data loss

### CC. Advanced curve / surface math (pure, unit-testable)
- [ ] **Arc-length parameterization** — reparameterize a curve by true arc length so notches/ease sit at real distances
- [ ] **Curve fairing / minimum-energy smoothing** — smooth a curve to minimum bending energy within an endpoint/tolerance constraint
- [ ] **Offset with self-intersection removal** — a robust curve offset that trims the loops a naive offset creates on tight curves
- [ ] **Developable-surface flattening** — flatten a ruled/developable 3D strip to 2D with zero stretch (collars, facings)
- [ ] **Least-distortion flattening (ARAP)** — as-rigid-as-possible flatten a doubly-curved 3D panel with a strain readout
- [ ] **Geodesic seam paths** — compute a seam that follows a geodesic on the 3D surface for a clean sew line
- [ ] **Dart-from-Gaussian-curvature** — place/size darts from the surface's curvature so the flatten has no stretch
- [ ] **Ease-along-curve solver** — distribute a length difference (cap ease) along a curve by a chosen easing profile
- [ ] **Point-in-polygon + area/centroid** — the pure geometry kernel (area, perimeter, centroid, containment) every piece op needs
- [ ] **Boolean ops on pieces** — union/subtract/intersect piece outlines (cut a window, merge a yoke) robustly

---

_Update this board as things ship — check the box + note the PR._
