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

**Editing UX**
- [x] **Universal 2D↔3D editing** — the 2D pane drives the same garment — PR #44
- [x] **Quick-edit toolbar over 3D + 2D** — size/neck/sleeve/length/width/hem — PR #48
- [x] **Click-to-type sliders** (exact values) — PR #48
- [x] **Richer + cooler Preview** — neckline/sleeve/size · quick looks · surprise/spin · colour-tinted aurora — PR #44

**Stability**
- [x] **Clothes never fly away / explode** — NaN guard + velocity/position stability net; the gown is fixed — PR #47
- [x] **Static at default** — garments freeze to rest until you change something — PR #47

---

## 🔄 In progress

- _(nothing right now — pick the next card from the backlog)_

---

## 📋 Backlog / ideas

**Features**
- [ ] **Drop in a real photoreal skin** — the GLB slot is now the default + renders own materials; add a CC0 photoreal human `.glb` at `assets/mannequin.glb` (current is a clean rigged mannequin)
- [ ] **More garments** — cargo/tapered variants, more structured jackets (blazer · hoodie · cargo · coat · blouse shipped — PR #70; the hoodie's real hood — PR #71)
- [ ] **A real Render tab** (high-quality still)
- [ ] **Prints on sleeves & legs** — prints are body-only today; extend the design map to the sleeve/leg pieces (and their back panels)
- [ ] **Prints on the 2D flat pattern** — show placed logos/text on the exported panels + manufacturing pack
- [ ] **Per-panel physics** — front vs back drape stiffness (deferred from per-panel fabric; needs per-constraint region params in the XPBD solver)
- [ ] **Split sleeves front/back** — per-panel fabric splits the body + legs; sleeves are still a single panel
- [ ] **Closures — buttons · plackets · zippers** — real front closures on the 3D garment + the pattern (button-up shirt, zip-up)
- [ ] **Textile patterns as fabrics** — repeating prints (stripe · plaid · check · floral · camo) that tile across the whole garment, beyond placed logos
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
- [ ] **Wire the library search + filters** — filter the garment/fabric browser as you type (by family, weight, stretch)
- [ ] **Autosave + crash recovery** — periodically snapshot the working project so a crash doesn't lose work
- [ ] **Golden-image snapshot tests in CI** — capture a few key looks and diff them each PR to catch visual regressions

---

_Update this board as things ship — check the box + note the PR._
