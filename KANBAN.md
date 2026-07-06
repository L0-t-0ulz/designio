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
- [ ] **Photoreal GLB avatar** as default (drop-in slot is ready — needs a CC0 `.glb`)
- [ ] **More garments** — blazer · hoodie · cargo pants · coat · blouse (data-driven)
- [ ] **Cloth self / inter-collision** — layered garments push off each other
- [ ] **Topstitching + seam styles** on the 3D + pattern
- [ ] **A real Render tab** (high-quality still)
- [ ] **Prints on sleeves & legs** — prints are body-only today; extend the design map to the sleeve/leg pieces (and their back panels)
- [ ] **Prints on the 2D flat pattern** — show placed logos/text on the exported panels + manufacturing pack
- [ ] **Per-panel physics** — front vs back drape stiffness (deferred from per-panel fabric; needs per-constraint region params in the XPBD solver)
- [ ] **Split sleeves front/back** — per-panel fabric splits the body + legs; sleeves are still a single panel

**Polish / tech-debt** _(found while building the above)_
- [ ] **Live print recolour** — recolouring a printed garment should update the print-canvas base immediately (it can go stale until the print is next edited)
- [ ] **Trim the renderer bundle** — code-split Three.js/addons; the renderer chunk is ~2.2 MB (Vite warns >500 KB)
- [ ] **Free print textures on delete** — dispose the print `CanvasTexture`s when a layer is removed (small GPU leak)

---

_Update this board as things ship — check the box + note the PR._
