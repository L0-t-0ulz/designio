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
- `core/` — `Viewport` (renderer + camera + OrbitControls + post-processing: bloom, vignette, SMAA),
  `Environment` (IBL, rim lights, reflective floor + shadow-catcher), `Loop` (fixed-timestep).
- `avatar/` — `Mannequin` (poseable **and** resizable capsule skeleton; capsules are the cloth
  colliders), `BodyMesh` (smooth metaball body via MarchingCubes), `colliders` (capsule math).
- `cloth/` — `XPBDSolver` (grid/tube cloth), `ClothWorld` (general particle+constraint solver for
  sewn panels; seams are stitch constraints), `Garment` (tube builder), `ClothMesh`, `FabricMaterial`,
  `fabricPresets` (`FabricParams` for the solver).
- `fabric/` — `FabricLibrary` (physical + visual fabrics; `fabricToSolverParams` derives drape),
  `weaveTexture` (procedural weave normal maps; pure math is unit-tested).
- `garment/` — `templates` (dress/skirt/top/pants), `GarmentController` (multi-piece sim manager).
- `pattern/` — `pattern` (`buildSewnTop`), `PatternController` (sew → drape).
- `export/` — `exporters3d` (glTF/OBJ), `patternExport` (SVG/DXF), `techpack` (HTML/JSON), `save`.
- `start/` — `StartPage` (the "design your piece" landing), `PreviewStudio` (live 3D preview on the
  start page), `design` (`DesignConfig` + the printed-design canvas texture).
- `ui/` — `panel` (the studio control panel), `controls` (DOM helpers), `patternSchematic`, `styles.css`.
- `main.ts` — `initStudio(config)` wires everything; shows the start page first (deep-links skip in).

## Conventions

- TypeScript strict (`noUnusedLocals/Parameters`, `noImplicitAny`). Import three addons from
  `three/examples/jsm/...` (types resolve via `@types/three`; `vite/client` types are referenced in
  `src/renderer/vite-env.d.ts`).
- The cloth solver mutates a flat `Float32Array` that is **shared** with the render geometry
  (zero-copy). Colliders are mutated **in place** so garments react to a moving/resized body.
- Match the surrounding code's style; keep new code covered by a test where there's real logic.

## Snapshot deep-links (query string)

`?start=0` skip start page · `?garment=dress|skirt|top|pants` · `?fabric=<id>` · `?mode=pattern` ·
`?anim=idle|walk|turn` · `?bodyH=<scale>&bodyB=<scale>` (mannequin size) · `?text=<print>` ·
`?closeup=1` (macro camera).
