# DesignIO

**A personal, fully-3D clothing design studio** — in the spirit of [CLO3D](https://www.clo3d.com/en/) and
[Browzwear](https://browzwear.com/) — for designing your own clothes realistically and virtually. Built
as a desktop app with **Electron + Three.js + TypeScript**.

Design garments on a slim, poseable human mannequin, dress them in real fabrics with **live cloth
physics**, shape the body, animate it, and export the result — all in a photographic studio scene.

> ### 🚧 Development stage
> **DesignIO is an active work-in-progress.** It runs and is genuinely usable, but it is under heavy
> development: features are experimental, APIs and visuals change frequently, and rough edges are
> expected. This is not a finished or released product.

**Author:** Zayan Khan · **Contact:** [khanzayan_123@hotmail.com](mailto:khanzayan_123@hotmail.com)

---

## ⚖️ License & usage — all rights reserved

© 2026 **Zayan Khan**. All rights reserved.

This repository and **everything in it** (source code, designs, assets, and ideas) is **proprietary and
private**. It is **not** open source and carries **no license to use it**.

**You may not** use, run, copy, clone, fork, modify, publish, distribute, reproduce, reverse-engineer, or
create derivative works from any part of this project — **in whole or in part** — **without explicit prior
written permission from the author.**

- Permission **must be requested in advance**, by email, **before** any such use.
- **Contact for permission:** **Zayan Khan — [khanzayan_123@hotmail.com](mailto:khanzayan_123@hotmail.com)**
  (or any other means of contacting the author).
- **Unauthorized use, copying, or distribution may result in legal action.**

If you are unsure whether something is allowed, **ask first.**

---

![DesignIO homepage — hero, a New design button, a templates gallery, and a what-you-can-do strip](docs/homepage.png)

*The homepage launcher: start a **New design**, or jump straight in from a **template**.*

![DesignIO — the "Design your piece" builder with the categorised garment catalog and grouped fabric library](docs/catalog-start.png)

*The "Design your piece" builder: pick from a categorised garment catalog, choose a fabric, and see a
live 3D preview draped on the mannequin — then open it in the full studio.*

---

## What you can do right now

### Design your piece
Start on the **"Design your piece"** page: choose a garment, colour it, **add your own graphic + text**,
pick the **neckline · sleeves · size**, shape the mannequin, and set the fit — with **Quick looks**
(one-tap presets), a **Surprise me** randomiser, a **Spin** toggle, and an aurora that **tints to your
colour**, all on a **live, auto-rotating 3D preview**. Hit **Design in 3D →**
to open it in the full studio (and **← Start** to come back, keeping your design).

### A professional studio (CLO3D-style, but friendly)
The studio is a **dockable CAD-style workspace** — a top **menu bar**, a left **Library** (tabbed,
searchable: garments · fabrics · avatars · presets), a **dual central viewport** (**3D** · **2D pattern**),
a right **Object Browser** (scene pieces + show/hide) above a context-sensitive **Property Editor** (Garment
/ Avatar / Scene), and a **status bar** (live fps · simulate/pause). Panels **resize, collapse, and
persist**. Built vanilla (CSS + split.js) — with sensible defaults so it stays approachable, not
overwhelming.

### A real garment catalog — 16 garments, all data-driven
Garments are built from a **data-driven schema** (a registry of definitions composed from parametric
pieces), so breadth comes from data, not bespoke code. Grouped by category:

- **Tops** — t-shirt, tank, crop top, long-sleeve, tube top, tunic
- **Bottoms** — A-line / pencil / maxi skirt, trousers, shorts, wide-leg
- **Dresses** — dress, sheath, slip, gown
- **One-pieces** — jumpsuit

The construction panel is **schema-driven**: each garment shows only the controls it supports —
**neckline** (scoop / crew / V / strapless), **sleeves** (short / long), **length**, **looseness**, and
**flare**. Tops & dresses get shoulder coverage + cinched waists; the jumpsuit is a torso + two legs.

| Gown (strapless satin) | Jumpsuit (denim, one-piece) |
| --- | --- |
| ![A strapless satin gown draped on the mannequin](docs/catalog-gown.png) | ![A denim jumpsuit — torso plus two legs](docs/catalog-jumpsuit.png) |

### Two slim model mannequins — and full body shaping
Design on a clean, matte **studio mannequin** sculpted like a real dress form — **defined shoulders,
bust/chest, nipped waist, hips, tapered limbs with knees, and shaped head / hands / feet**. Pick a
**female** or **male** figure — both slim and elongated like runway models — then **shape the body**:
height, overall build, and independent **bust / waist / hips** to create real body shapes. Prefer a
**photoreal avatar**? Drop a CC0 human `mannequin.glb` into `src/renderer/assets/` and flip *Imported
body (GLB)* — the capsule skeleton stays the cloth collider, so garments still drape correctly.

| Female model | Male model |
| --- | --- |
| ![Slim female model mannequin](docs/model-female.png) | ![Slim male model mannequin](docs/model-male.png) |

### Real 3D drape with mesh-accurate collision
Each garment **simulates** with an **XPBD** cloth solver and collides against the **true body surface**
(a BVH over the mannequin mesh) plus skeleton capsules — so it hugs the real silhouette, sleeves sit on
the arms, and skirts flare naturally. Cloth normals are recomputed every frame for smooth shading.

![A satin dress draping on the body with a full flared skirt](docs/bvh-dress.png)

### A comprehensive fabric library — 24 fabrics by family
Every fabric carries **physical** properties (weight, stretch, bendiness, friction) that drive the
**drape**, and **visual** properties (weave, sheen, anisotropy, sheerness, roughness) that drive the
**material** — so the *same garment drapes differently* on stiff denim vs fluid chiffon.

- **Wovens** — poplin, oxford, chino twill, denim, canvas, corduroy, linen, wool flannel, tweed
- **Silks & smooth** — charmeuse, satin, crepe, organza, chiffon
- **Knits** — jersey, rib, French terry, fleece, cable knit
- **Specialty** — leather, suede, velvet, tulle, spandex

![A velvet dress — each fabric drives both look and drape](docs/fabrics-start.png)

*Every fabric drives both look and drape — here, velvet.* Live-inspect any fabric (GSM, stretch, drape,
grip, roughness, sheen, weave density/depth, anisotropy, sheerness), and macro-zoom to see the woven
micro-surface:

![Macro close-up of satin — procedural weave normal map + sheen + anisotropic highlights](docs/closeup.png)

### Real per-garment 2D pattern — the CLO3D loop, both ways
Flip the central viewport to **2D Pattern** and you get the **actual flat pattern of the garment you
designed** — the front/back bodice unwrapped with its **real neckline curve, armhole and side seams**,
A-line skirt/dress panels, tapered trouser legs, and a shaped sleeve, each with **seam allowance, grainline
and notches**. It's derived from the exact 3D construction, so 2D and 3D always agree. Export it as **SVG /
DXF** for a cutter.

**2D and 3D are one design — edit either way.** A quick-edit toolbar floats over **both** the 3D and 2D
views (**size · neckline · sleeve · length · width · hem**), driving the same garment — so you can design
entirely in 2D *or* 3D and the other updates live. Every slider value is **click-to-type** for exact,
artist-grade numbers. If you don't want to touch 3D, you don't have to.

![The editable 2D flat pattern — size / length / width / hem tools drive the 3D](docs/pattern-2d.png)

(Or work the other way in **Pattern (sew)** mode: adjust FRONT/BACK panels and *Sew & simulate* to wrap
them onto the body.)

### Layer many garments · save & reopen your project
Dress the mannequin in a **whole outfit** — add as many garments as you like (a top *and* a skirt *and* a
jacket…), each with its own fabric, colour and print, all simulating together on one body. The **Object
Browser** lists every garment: **select** one to edit it, toggle its **visibility**, and **add / duplicate
/ delete** from the toolbar. Full **cut / copy / paste** (⌘X/C/V), **duplicate** (⌘D) and **undo / redo**
(⌘Z / ⇧⌘Z). When you're happy, **Save project** — it's kept in your in-app **Projects** library.

### Your projects — a real library
Every design you save shows up on a **Projects** page (with a thumbnail) — reopen any of them in one click,
**rename** or **delete** them, and **import / export `.dio`** files to move work between machines. New
design and a way home tie the whole app together: **Homepage → Your projects → Studio**.

![The Projects gallery — saved designs with thumbnails, open / rename / delete](docs/projects.png)

### Place your own logos + text — as many as you like
Import **several logos/graphics** (PNG/JPG/WebP) and **text**, and place **each one exactly** — its own
**position, size and rotation** — via the studio's **Prints** manager. Add a chest logo, a slogan, a sleeve
badge… each print is independent and updates live while the cloth simulates.

![Two placed prints — a logo and a slogan, each positioned + rotated](docs/prints.png)

### Go deep on construction detail
Beyond the silhouette, add real **construction detail** — a **collar** (raises/closes the neckline into a
stand), fitted **cuffs**, **pleats** (a fuller, swishier hem), **darts** (a nipped, tailored waist),
**patch pockets** (a chest pocket on tops, hip pockets on skirts/trousers — with a topstitched outline in
3D and a pocket panel on the pattern), and a **rolled hem**. Each shows up **both** on the 3D garment and
in the flat pattern (the panels reshape, and the pattern notes the detail), and each garment only offers
the details it supports.

![A collar + cuffs + darted long-sleeve top](docs/detail.png)

### Design each part — different fabrics, contrast trim
Real garments aren't one material. Pick a **part** — **Body · Sleeves · Legs** — and give it its own
**fabric and colour** (leather sleeves on a polyester body, denim body with a satin yoke…), add a
**contrast trim** on the collar / cuffs / pockets / hem, and set the **seam allowance** + **notches** for
production. Every part's fabric, the trim and the seam allowance flow into the **manufacturing pack** so a
maker knows exactly what to cut in what.

![Leather sleeves on a denim body with a contrast trim](docs/parts.png)

### Size it · see every measurement · pack it for the factory
Pick a **size** (XS – XXL) and the garment **grades** to fit; the **Measurements** panel shows the real
production spec **live** — chest, waist, hip, length, sleeve, inseam, hem sweep, plus estimated **fabric
area** and **total seam length** (toggle **cm / in**). All of it is derived from the exact same
construction as the 3D garment and the flat pattern, so it always agrees. When you're ready, **Export for
manufacturing** — one printable pack (HTML + JSON) with, per garment, a **spec sheet**, a **fabric BOM**
(fabric · weight · yardage) and the **embedded flat pattern** — everything a maker needs to cut and sew it.

### Animate it (4D) + export to get it made
At default settings the garment **hangs perfectly still** (the solver sleeps when there's no wind and the
body isn't moving — no drift or jitter). Animate the mannequin — **idle / walk / turntable** — and watch
the garment move with the body (a swinging skirt, a flowing dress); tune **gravity / wind / exposure**.
Then **export**: **3D** (glTF / OBJ), **2D pattern** (SVG / DXF for a cutter), a **measurement tech-pack**
(HTML + JSON), and a full **manufacturing pack** (spec sheet + fabric BOM + embedded patterns).

---

## Run it

> Running this project requires the author's permission — see **[License & usage](#️-license--usage--all-rights-reserved)** above.

**Requirements:** Node.js 18+ (developed on Node 20/22) and npm.

```bash
npm install
npm run dev        # launch the DesignIO desktop app (Vite hot reload)
```

### Other commands

```bash
npm run build      # bundle main / preload / renderer into ./out
npm run preview    # build, then run the packaged app
npm test           # headless solver / geometry / catalog tests (vitest)
npm run typecheck  # strict TypeScript, no emit
npm run capture    # re-render all README screenshots from the current build
```

---

## How it's built

```
src/
  main/         Electron main process (window, native menu, CSP, save dialog)
  preload/      context-isolated bridge
  renderer/
    core/       Viewport (scene/camera/controls + post) · Environment (studio IBL, floor, pedestal) · Loop
    avatar/     Mannequin (poseable/resizable female+male body) · BodyMesh (metaball) · colliders
    cloth/      XPBDSolver · ClothWorld (sewn panels) · BodyCollider (mesh BVH) · Garment · FabricMaterial
    garments/   schema (GarmentDefinition) · registry (the catalog, as data) · factory (build from data)
    fabric/     FabricLibrary (24 fabrics by family) · weaveTexture (procedural weave normals)
    pattern/    2D panels → sew → drape
    export/     glTF/OBJ · SVG/DXF pattern · HTML/JSON tech-pack
    start/      StartPage ("design your piece") · PreviewStudio · design config · presets
    shell/      professional studio shell — StudioShell · menuBar · Library · ObjectBrowser · statusBar
    ui/         Property Editor (context-sensitive panel) · controls · thumbnails · design tokens + styles
tests/          headless solver / geometry / garment-catalog / fabric correctness
```

**Cloth model:** an XPBD (Extended Position-Based Dynamics) mass-spring solver — structural, shear and
bending distance constraints, integrated under gravity/wind in fixed substeps, with mesh-BVH body
collision + capsule broadphase + friction. Real-time, not offline finite-element — tuned for 60 fps.

**Data-driven catalog:** a garment is a `GarmentDefinition` (category + composable pieces + which
construction controls it supports). A factory turns it into simulated cloth. **Adding a garment or fabric
is a data change, not new code.**

---

## Roadmap

Shipped: data-driven garment schema + factory · 24-fabric library by family · 16-garment catalog with a
category picker + schema-driven construction UI · female/male slim models with bust/waist/hips shaping ·
mesh-accurate BVH body collision · a production-grade, consistent UI.

Planned (in phases): **4D** per-fabric secondary motion (lag/flutter vs near-rigid) + stability hardening ·
cloth **self-collision + thickness** · **layering / full outfits** (garment↔garment collision) · **tailored
outerwear** (lapels, collars, structured coats) · presets + export polish.

---

*DesignIO © 2026 Zayan Khan — all rights reserved. Ask before using: khanzayan_123@hotmail.com*
