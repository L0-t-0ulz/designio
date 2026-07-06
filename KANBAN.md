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

- [ ] **Per-part physics** — leather drapes stiffer than jersey (per-piece solver params)
- [ ] **Photoreal GLB avatar** as default (drop-in slot is ready — needs a CC0 `.glb`)
- [ ] **More garments** — blazer · hoodie · cargo pants · coat · blouse (data-driven)
- [ ] **Per-panel fabric** — front vs back vs each panel separately
- [ ] **Cloth self / inter-collision** — layered garments push off each other
- [ ] **Topstitching + seam styles** on the 3D + pattern
- [ ] **A real Render tab** (high-quality still)

---

_Update this board as things ship — check the box + note the PR._
