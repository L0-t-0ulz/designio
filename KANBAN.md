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
- [x] **Per-panel physics** — the front vs back of a garment drape with their own stiffness + mass (per-constraint region params in the XPBD solver), driven by the per-panel fabric — a stiff back holds an A-line while a soft front clings — PR #122

**Editing UX**
- [x] **Universal 2D↔3D editing** — the 2D pane drives the same garment — PR #44
- [x] **Quick-edit toolbar over 3D + 2D** — size/neck/sleeve/length/width/hem — PR #48
- [x] **Click-to-type sliders** (exact values) — PR #48
- [x] **Richer + cooler Preview** — neckline/sleeve/size · quick looks · surprise/spin · colour-tinted aurora — PR #44
- [x] **Preview page glow-up** — holographic 3D stage (pedestal glow · colour wash · particles · hologram scanline) + neon-glass UI + juicy interactions (shimmer · glow ripple · slot-machine Surprise · sparkle · tilt · looks-styled counter) — PR #90

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
- [ ] **Drop in a real photoreal skin** — the GLB slot is now the default + renders own materials; add a CC0 photoreal human `.glb` at `assets/mannequin.glb` (current is a clean rigged mannequin)
- [ ] **More garments** — cargo/tapered variants, more structured jackets (blazer · hoodie · cargo · coat · blouse shipped — PR #70; the hoodie's real hood — PR #71)
- [ ] **Split sleeves front/back** — per-panel fabric splits the body + legs; sleeves are still a single panel
- [ ] **Made-to-measure** — type real body measurements (cm/in) to drive the mannequin + garment fit, not just sliders
- [ ] **Pose the mannequin** — a small pose library (contrapposto · hands-on-hips · seated) for lookbook stills
- [ ] **Studio lighting + backdrop presets** — softbox · runway · sunset · seamless colour, swappable per shot
- [ ] **Turntable / clip + AR export** — record a spin to MP4/GIF, and export a USDZ/GLB to view the piece on a phone / in AR
- [ ] **Draw-your-own panel** — sketch a custom 2D panel (freeform + mirror symmetry), then sew it onto the body
- [ ] **Colorways** — save several colour/fabric variants of one design and compare them side by side

**Polish / tech-debt** _(found while building the above)_
- [x] **Live print recolour** — recolouring a printed garment updates the print-canvas base immediately — PR #67
- [ ] **Trim the renderer bundle** — code-split Three.js/addons; the renderer chunk is ~2.2 MB (Vite warns >500 KB)
- [x] **Free print textures on delete** — dispose the print `CanvasTexture`s on print removal / layer delete — PR #67
- [x] **Fix blank prints/textiles in the studio** — the fabric-thickness lining shell was pushed *outward* over the printed surface (tube normals point inward); push it inward so the albedo map shows — PR #108
- [ ] **Wire the library search + filters** — filter the garment/fabric browser as you type (by family, weight, stretch)
- [ ] **Autosave + crash recovery** — periodically snapshot the working project so a crash doesn't lose work
- [ ] **Golden-image snapshot tests in CI** — capture a few key looks and diff them each PR to catch visual regressions

---

_Update this board as things ship — check the box + note the PR._
