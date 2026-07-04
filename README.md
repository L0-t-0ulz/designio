# DesignIO

A personal, fully-3D clothing design tool — in the spirit of [CLO3D](https://www.clo3d.com/en/) and
[Browzwear](https://browzwear.com/) — for designing your own clothes realistically and virtually.
Built as a desktop app (Electron + Three.js + TypeScript).

> **Status: Foundation (PR #1).** This first slice proves the core *simulate-and-drape* loop that all
> garment software is built on: a 3D viewport, a human mannequin, and a fabric panel that falls and
> drapes over the body with real-time cloth physics. Pattern drafting, sewing 2D panels into 3D
> garments, and photoreal rendering come in later PRs (see the roadmap).

![DesignIO foundation — a cotton panel draped over the mannequin as a poncho](docs/preview.png)

*Live capture: a cotton panel dropped onto the T-pose mannequin, draping from the shoulders over both
arms (rendered via `npm run snapshot`).*

## What you can do right now

- Orbit / zoom / pan around a 3D mannequin in a lit studio scene.
- Watch a cloth panel drop from above and **drape over the shoulders and body** (XPBD cloth physics
  with body-capsule collision + friction).
- Switch **fabric presets** (denim / cotton / silk / knit) and watch the drape stiffness change.
- Tweak **gravity, wind, colour**, toggle **wireframe** and the mannequin, and **Drop/Reset** the panel.

## Requirements

- Node.js 18+ (developed on Node 25) and npm.

## Run it

```bash
npm install
npm run dev        # launches the DesignIO desktop app with hot reload
```

The app window opens automatically. Use the **Fabric Lab** panel (top-right) to play with fabrics and
physics, and drag in the viewport to orbit.

### Other commands

```bash
npm run build      # bundle main / preload / renderer into ./out (production build)
npm run preview    # build, then run the packaged app
npm test           # run the cloth-solver unit + integration tests (vitest)
npm run typecheck  # strict TypeScript check, no emit
```

## How it's built

```
src/
  main/         Electron main process (window, lifecycle)
  preload/      context-isolated bridge
  renderer/
    core/       Viewport (scene/camera/controls), Environment (studio IBL + shadows), Loop (fixed-dt)
    avatar/     Mannequin (procedural capsule human) + colliders (capsule closest-point)
    cloth/      XPBDSolver (the physics), ClothMesh (geometry), FabricMaterial, fabricPresets
    ui/         lil-gui control panel
tests/          headless solver correctness (distance constraint, collision, full drape)
```

**Cloth model:** an XPBD (Extended Position-Based Dynamics) mass-spring solver — structural, shear and
bending distance constraints, integrated under gravity/wind in fixed substeps, with capsule + ground
collision and friction. The mannequin's limbs double as the collision proxy, which is exactly how real
garment simulators approximate a body.

## Roadmap

- **PR #2 — 2D pattern editor:** draw/edit garment panels (curves, darts), tag seam edges, measurements.
- **PR #3 — Sewing / arrange:** place 2D panels around the avatar, sew them, drape the assembled garment.
- **PR #4 — Realism:** fabric textures & PBR swatches, HDRI studio presets, garment export (glTF/OBJ).
- **PR #5+ — Avatars & fit:** import measured/parametric avatars, fit by measurements, GPU/worker cloth.
