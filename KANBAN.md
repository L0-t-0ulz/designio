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
- [ ] **Draw-your-own panel** — sketch a custom 2D panel (freeform + mirror symmetry), then sew it onto the body

**More design & construction**
- [ ] **Gathers, shirring & smocking** — elastic-gathered panels + honeycomb smocking detail (3D + a gathered-strip pattern piece)
- [ ] **Functional openings** — a button placket / zip that actually *opens* (the garment gaps at the closure), not just a drawn line
- [ ] **Convertible details** — wrap-dress ties + drawcords that knot, so one garment styles multiple ways

**More materials & finishes**

**More avatar & scene**
- [x] **Group / runway line-up** — a collection shot of the garment across N colourways rendered side by side into one PNG (composited snapshots — the body/sim is a singleton); pure `lineupCells`/`lineupHues` unit-tested — PR #171
- [x] **Contact shadows & SSAO** — a GTAO ambient-occlusion pass grounds the figure + darkens contact/fold areas (garment↔body, folds, under-arms, pockets); small world radius, no halos; transparent-backdrop path unaffected — PR #170

**More production**
- [x] **Import an existing flat pattern** — read a DXF pattern back in + preview it in the 2D pane (round-trips the export; pure `parsePatternDXF` unit-tested). Draping imported panels onto the body deferred — PR #169

**AI-assisted design** _(uses the latest Claude models)_
- [ ] **AI design assistant** — describe a garment in words → DesignIO builds the config (garment · fabric · colour · construction details)
- [ ] **AI colorway & print suggestions** — a mood / season prompt → a set of on-trend colorways + a matching textile pattern
- [ ] **AI tech-pack copywriter** — auto-write the spec-sheet prose, construction notes + care instructions from the garment data

**Polish / tech-debt** _(found while building the above)_
- [x] **Live print recolour** — recolouring a printed garment updates the print-canvas base immediately — PR #67
- [x] **Trim the renderer bundle** — rollup `manualChunks` splits three (+ addons) into its own vendor chunk; the app chunk drops ~2.47 MB → ~0.44 MB — PR #167
- [x] **Free print textures on delete** — dispose the print `CanvasTexture`s on print removal / layer delete — PR #67
- [x] **Fix blank prints/textiles in the studio** — the fabric-thickness lining shell was pushed *outward* over the printed surface (tube normals point inward); push it inward so the albedo map shows — PR #108
- [x] **Wire the library search + filters** — fabric browser filters by family · weight · stretch (combined with the text search); pure `matchesFabric` unit-tested — PR #165
- [x] **Autosave + crash recovery** — snapshots the working `.dio` doc to localStorage every 15 s + on close; a fresh launch offers to recover it via a non-blocking banner; pure `parseSnapshot`/`shouldOfferRestore` unit-tested — PR #166
- [ ] **Golden-image snapshot tests in CI** — capture a few key looks and diff them each PR to catch visual regressions

---

_Update this board as things ship — check the box + note the PR._
