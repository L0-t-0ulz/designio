# Third-party assets & licenses

DesignIO ships license-clean assets only. The default mannequin is **procedural**
(generated at runtime via metaballs) — no bundled human asset is required.

## Bundled assets

| Asset | Path | Source | License |
|-------|------|--------|---------|
| `mannequin.glb` (CesiumMan) | `src/renderer/assets/mannequin.glb` | Khronos glTF-Sample-Assets (Cesium / Analytical Graphics) | Freely usable (public sample model). Optional **drop-in** demo only — not the default body. |

## Runtime dependencies (fonts / libraries)

| Package | Purpose | License |
|---------|---------|---------|
| `three` | 3D engine | MIT |
| `@fontsource-variable/inter` | Inter variable font | OFL-1.1 |
| `lucide` | SVG icons | ISC |
| `motion` | UI animation | MIT |

## Dropping in your own mannequin

The visible body is procedural by default. To use a **realistic imported human**,
replace `src/renderer/assets/mannequin.glb` with a **CC0** (or CC-BY, recorded above)
export and toggle **Mannequin → Imported body (GLB)** in the studio.

Recommended export (MakeHuman, CC0):
1. MakeHuman → a neutral figure; **Pose/Animate → Pose → A-pose** (or T-pose).
2. **No clothes, no hair, no eyes/teeth** (a clean body only).
3. Scale so the figure is ~**1.75 m** tall.
4. **Files → Export → glTF (binary .glb)**, include the **skeleton**.
5. Save as `src/renderer/assets/mannequin.glb` (overwrite), then rebuild.

The loader (`avatar/GlbMannequin.ts`) auto-normalises it to ~1.75 m, feet on the
floor, centred, and applies the matte studio material. Blender Studio "Human Base
Meshes" (CC0) exported to GLB work the same way. **Do not** use SMPL/SMPL-X or
scanned-human assets (research/commercial-restricted).
