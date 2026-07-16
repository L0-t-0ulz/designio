import type { FabricParams } from '../cloth/fabricPresets'

export type WeaveType = 'plain' | 'twill' | 'satin' | 'knit' | 'rib' | 'waffle' | 'cable' | 'corduroy' | 'leather'

/** Fabric family — groups the gallery and hints at behaviour (crisp → fluid → stretchy). */
export type FabricFamily = 'woven' | 'silk' | 'knit' | 'specialty'

export const FABRIC_FAMILIES: { id: FabricFamily; label: string }[] = [
  { id: 'woven', label: 'Wovens' },
  { id: 'silk', label: 'Silks & smooth' },
  { id: 'knit', label: 'Knits' },
  { id: 'specialty', label: 'Specialty' }
]

/**
 * A fabric described by real, tunable properties — both how it *behaves*
 * (weight, stretch, drape) and how it *looks* (weave, sheen, colour). The solver
 * params are derived from the physical fields, so changing the weight/stretch of
 * a fabric actually changes how it drapes.
 */
export interface Fabric {
  id: string
  name: string
  family: FabricFamily
  /** Directional pile (velvet/suede/corduroy) — a hint for future nap shading. */
  nap?: boolean

  // --- physical (drape) ---
  /** Areal weight in grams / m². Heavier hangs with larger, lazier folds. */
  gsm: number
  /** In-plane stretchiness, 0 (rigid, e.g. denim) … 1 (very stretchy knit). */
  stretch: number
  /** Bendiness, 0 (crisp/stiff, holds a crease) … 1 (soft, fluid drape). */
  bendiness: number
  /** How much the fabric grips the body, 0 … 1. */
  friction: number

  // --- visual (PBR) ---
  color: number
  roughness: number
  sheen: number
  sheenRoughness: number
  weave: WeaveType
  /** Thread repeats across the garment — higher = finer weave. */
  weaveScale: number
  /** Normal-map intensity for the woven micro-surface. */
  normalStrength: number
  /** Directional sheen for satins/silks, 0 … 1. */
  anisotropy: number
  /** Sheerness for chiffon/organza, 0 (opaque) … 1. */
  transmission: number
  /** Metallic response for lamé / foil / sequin-base cloth, 0 (dielectric) … 1. */
  metalness?: number
  /** Clearcoat — a glossy lacquer layer for patent / coated / wet-look cloth, 0 (none) … 1. */
  clearcoat?: number
  /** Real perforation holes (athletic mesh / eyelet) — an alpha-cutout you see through. */
  perforated?: boolean
}

export const MASS_PER_GSM = 0.0015 // gsm → total garment mass (kg), tuned by feel

/** Derive the XPBD solver parameters from a fabric's physical properties. */
export function fabricToSolverParams(fabric: Fabric): FabricParams {
  return {
    mass: Math.max(0.05, fabric.gsm * MASS_PER_GSM),
    // stretchier fabric = higher compliance (softer distance constraints)
    stretchCompliance: fabric.stretch * 6e-3,
    // bendier fabric = higher bending compliance = softer, more fluid folds
    bendCompliance: 0.0001 + fabric.bendiness * 0.018,
    // stiffer (less bendy) fabric settles with more damping
    damping: 0.6 + (1 - fabric.bendiness) * 0.8,
    friction: fabric.friction,
    // aerodynamic drag: a light, sheer, fluid sheet catches the air (billows / floats /
    // lags); a heavy, crisp one ignores it (near-rigid follow of the moving body).
    aero: 1 + 12 * (1 - Math.min(1, fabric.gsm / 340)) * (0.4 + 0.6 * fabric.bendiness) + 4 * fabric.transmission,
    color: fabric.color
  }
}

/**
 * Stiffen the solver params for an **interfaced** (structured) garment — much
 * lower bending compliance + more damping, so collars/fronts hold their shape and
 * the whole piece drapes crisp/tailored instead of soft. Pure, so it's unit tested.
 */
export function interfaceParams(p: FabricParams): FabricParams {
  return { ...p, bendCompliance: p.bendCompliance * 0.3, damping: p.damping + 0.6 }
}

/**
 * Solver params for a **boned / corseted** bodice — near-rigid: very low bending
 * *and* low stretch (boning holds the shape against the body) + heavy damping.
 * Stiffer than plain interfacing. Pure, so it's unit tested.
 */
export function corsetParams(p: FabricParams): FabricParams {
  return { ...p, bendCompliance: p.bendCompliance * 0.12, stretchCompliance: p.stretchCompliance * 0.3, damping: p.damping + 1.0 }
}

/**
 * Solver params for a **wet** garment (rain / swim / beach) — waterlogged, so it's
 * heavier, clings limp to the body (softer bend), barely catches the air, and settles
 * fast (more damping). Pure, so it's unit tested. Composes on top of any stiffener.
 */
export function wetParams(p: FabricParams): FabricParams {
  return { ...p, mass: p.mass * 1.5, bendCompliance: p.bendCompliance * 1.8, damping: p.damping + 0.5, aero: p.aero * 0.35 }
}

/**
 * Physical fabric thickness in metres, from areal weight — feeds the render-side
 * thickness shell so hems/edges aren't paper-thin. A light chiffon reads ~0.6 mm,
 * a heavy wool coat ~3.2 mm. Slightly exaggerated over reality so the depth reads
 * at garment framing. Monotonic in `gsm`, clamped to a sane band.
 */
export function fabricThickness(fabric: Fabric): number {
  const MIN = 0.0006
  const MAX = 0.0032
  const t = MIN + (MAX - MIN) * ((fabric.gsm - 40) / (500 - 40))
  return Math.max(MIN, Math.min(MAX, t))
}

/**
 * Cloth-sheen recipe by fabric **family** — the soft retroreflective glow that reads
 * as "textile" instead of "plastic". Silks glow bright + specular, wovens are muted,
 * knits soft-matte, napped specialty (velvet/velour) the most lustrous. Returns plain
 * numbers (no THREE dependency) so it's unit-testable in Node; the caller builds the
 * `sheenColor` from `tintSat`/`tintLift` via `Color.offsetHSL`. Pure.
 */
export function sheenRecipeFromFabric(fabric: Fabric): {
  sheen: number
  sheenRoughness: number
  tintSat: number
  tintLift: number
} {
  const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))
  switch (fabric.family) {
    case 'silk':
      // liquid lustre — brighter, sharper sheen, cool bright tint
      return { sheen: clamp01(fabric.sheen * 1.05 + 0.1), sheenRoughness: clamp01(fabric.sheenRoughness - 0.08), tintSat: 0.07, tintLift: 0.18 }
    case 'knit':
      // soft, diffuse glow
      return { sheen: clamp01(fabric.sheen * 0.8), sheenRoughness: clamp01(fabric.sheenRoughness + 0.08), tintSat: 0.04, tintLift: 0.08 }
    case 'specialty':
      // napped pile (velvet/velour) is the most lustrous; smooth specialty (leather/tulle) muted
      return fabric.nap
        ? { sheen: clamp01(fabric.sheen * 1.15 + 0.18), sheenRoughness: clamp01(fabric.sheenRoughness - 0.03), tintSat: 0.09, tintLift: 0.2 }
        : { sheen: clamp01(fabric.sheen * 0.9), sheenRoughness: clamp01(fabric.sheenRoughness), tintSat: 0.05, tintLift: 0.1 }
    default:
      // wovens — present but muted, holds the classic desaturated lift
      return { sheen: clamp01(fabric.sheen * 0.85), sheenRoughness: clamp01(fabric.sheenRoughness + 0.05), tintSat: 0.05, tintLift: 0.1 }
  }
}

/**
 * Anisotropic-highlight rotation (radians) for a fabric — the elongated GGX highlight
 * of a satin/charmeuse should streak along the **warp** (the vertical grain running
 * down a garment, = the tube's V texture axis), not across it. three.js's default
 * `anisotropyRotation` of 0 aligns the streak to the U (around-the-body) tangent, so
 * anisotropic fabrics get a quarter-turn to the warp; isotropic ones stay at 0. Pure.
 */
export function anisotropyAngleForFabric(fabric: Fabric): number {
  return fabric.anisotropy > 0 ? Math.PI / 2 : 0
}

/**
 * How strongly a fabric reflects the studio environment (IBL) — a smooth, low-roughness
 * silk/satin/leather catches the room and glistens (high), a matte cotton/wool/canvas
 * barely does (low). Derived from roughness so it tracks the surface, clamped to a sane
 * band. Pure, unit-tested; the material layer sets `MeshPhysicalMaterial.envMapIntensity`. */
export function envIntensityForFabric(fabric: Fabric): number {
  const v = 0.8 + (1 - fabric.roughness) * 0.95 // glossier ⇒ reflects the room more
  return Math.max(0.7, Math.min(1.6, v))
}

/**
 * A rough **wholesale price** estimate for a fabric, in USD per linear metre (at bolt
 * width) — silks + specialty cost most, wovens least, and a heavier weight nudges it up.
 * Used by the costing rollup; a placeholder until real supplier prices are wired. Pure. */
export function estimatedFabricPrice(fabric: Fabric): number {
  const base: Record<FabricFamily, number> = { woven: 9, silk: 24, knit: 13, specialty: 30 }
  const weightFactor = 0.7 + 0.6 * Math.min(1, fabric.gsm / 400) // heavier ⇒ a touch pricier
  return Math.round(base[fabric.family] * weightFactor * 100) / 100
}

export const FABRIC_LIBRARY: Fabric[] = [
  // ---- wovens (crisp → structured) ----
  { id: 'cotton-poplin', name: 'Cotton poplin', family: 'woven', gsm: 130, stretch: 0.04, bendiness: 0.42, friction: 0.5, color: 0xc85a54, roughness: 0.78, sheen: 0.7, sheenRoughness: 0.5, weave: 'plain', weaveScale: 220, normalStrength: 0.5, anisotropy: 0, transmission: 0 },
  { id: 'oxford', name: 'Oxford cloth', family: 'woven', gsm: 150, stretch: 0.04, bendiness: 0.38, friction: 0.52, color: 0xb8c4d0, roughness: 0.8, sheen: 0.5, sheenRoughness: 0.6, weave: 'plain', weaveScale: 190, normalStrength: 0.65, anisotropy: 0, transmission: 0 },
  { id: 'chino-twill', name: 'Chino twill', family: 'woven', gsm: 260, stretch: 0.05, bendiness: 0.26, friction: 0.55, color: 0xbfa878, roughness: 0.83, sheen: 0.45, sheenRoughness: 0.6, weave: 'twill', weaveScale: 170, normalStrength: 0.7, anisotropy: 0.05, transmission: 0 },
  { id: 'denim', name: 'Denim', family: 'woven', gsm: 380, stretch: 0.02, bendiness: 0.14, friction: 0.55, color: 0x3b5b82, roughness: 0.85, sheen: 0.35, sheenRoughness: 0.7, weave: 'twill', weaveScale: 180, normalStrength: 0.72, anisotropy: 0.1, transmission: 0 },
  { id: 'canvas', name: 'Cotton canvas', family: 'woven', gsm: 340, stretch: 0.02, bendiness: 0.16, friction: 0.6, color: 0xc3b58c, roughness: 0.92, sheen: 0.25, sheenRoughness: 0.75, weave: 'plain', weaveScale: 120, normalStrength: 0.75, anisotropy: 0, transmission: 0 },
  // waxed cotton (Barbour-style rain shell) — a heavy plain-weave cotton paraffin-waxed for
  // rain: stiff, water-repellent, with a *partial* clearcoat (a low waxed semi-gloss, not
  // patent's mirror lacquer) over a still-cottony roughness, in a dark waxed olive.
  { id: 'waxed-cotton', name: 'Waxed cotton', family: 'woven', gsm: 350, stretch: 0.02, bendiness: 0.2, friction: 0.5, color: 0x3f3a2e, roughness: 0.55, sheen: 0.5, sheenRoughness: 0.5, weave: 'plain', weaveScale: 150, normalStrength: 0.45, anisotropy: 0.05, transmission: 0, clearcoat: 0.4 },
  { id: 'corduroy', name: 'Corduroy', family: 'woven', nap: true, gsm: 320, stretch: 0.06, bendiness: 0.3, friction: 0.62, color: 0x8a5a3c, roughness: 0.88, sheen: 0.5, sheenRoughness: 0.55, weave: 'corduroy', weaveScale: 70, normalStrength: 0.85, anisotropy: 0.15, transmission: 0 },
  // a dad-hat cord: a lighter mid-wale cotton corduroy scaled for a cap's small panels —
  // fewer, chunkier wales (lower weaveScale) so the cord still reads at hat framing instead
  // of blurring flat, in a classic camel. Same pile weave + anisotropic sheen as the coat cord.
  { id: 'corduroy-cap', name: 'Corduroy (cap)', family: 'woven', nap: true, gsm: 280, stretch: 0.05, bendiness: 0.3, friction: 0.6, color: 0xa8895f, roughness: 0.9, sheen: 0.48, sheenRoughness: 0.55, weave: 'corduroy', weaveScale: 40, normalStrength: 0.85, anisotropy: 0.15, transmission: 0 },
  { id: 'linen', name: 'Linen', family: 'woven', gsm: 190, stretch: 0.03, bendiness: 0.3, friction: 0.52, color: 0xcbb892, roughness: 0.9, sheen: 0.3, sheenRoughness: 0.8, weave: 'plain', weaveScale: 150, normalStrength: 0.65, anisotropy: 0, transmission: 0 },
  { id: 'wool-flannel', name: 'Wool flannel', family: 'woven', gsm: 300, stretch: 0.08, bendiness: 0.5, friction: 0.6, color: 0x59616b, roughness: 0.95, sheen: 0.6, sheenRoughness: 0.55, weave: 'twill', weaveScale: 140, normalStrength: 0.6, anisotropy: 0, transmission: 0 },
  { id: 'tweed', name: 'Wool tweed', family: 'woven', gsm: 360, stretch: 0.05, bendiness: 0.36, friction: 0.62, color: 0x6b6552, roughness: 0.96, sheen: 0.35, sheenRoughness: 0.6, weave: 'twill', weaveScale: 100, normalStrength: 0.7, anisotropy: 0, transmission: 0 },
  { id: 'chambray', name: 'Chambray', family: 'woven', gsm: 165, stretch: 0.04, bendiness: 0.42, friction: 0.5, color: 0x6f8bb0, roughness: 0.82, sheen: 0.42, sheenRoughness: 0.62, weave: 'plain', weaveScale: 185, normalStrength: 0.58, anisotropy: 0.05, transmission: 0 },
  { id: 'gabardine', name: 'Gabardine', family: 'woven', gsm: 280, stretch: 0.05, bendiness: 0.2, friction: 0.5, color: 0x726a5c, roughness: 0.72, sheen: 0.55, sheenRoughness: 0.48, weave: 'twill', weaveScale: 165, normalStrength: 0.52, anisotropy: 0.1, transmission: 0 },
  { id: 'worsted-wool', name: 'Worsted wool', family: 'woven', gsm: 250, stretch: 0.06, bendiness: 0.3, friction: 0.55, color: 0x33373d, roughness: 0.76, sheen: 0.55, sheenRoughness: 0.48, weave: 'twill', weaveScale: 150, normalStrength: 0.5, anisotropy: 0.08, transmission: 0 },
  { id: 'melton', name: 'Melton wool', family: 'woven', gsm: 500, stretch: 0.03, bendiness: 0.22, friction: 0.66, color: 0x3a4048, roughness: 0.97, sheen: 0.3, sheenRoughness: 0.65, weave: 'twill', weaveScale: 110, normalStrength: 0.7, anisotropy: 0, transmission: 0 },
  // a knit fulled (shrunk/felted) until the stitches close into a dense matte hide — the classic
  // loden coating/hat wool: heavy, near-zero stretch, holds a soft structured shape; only a faint
  // felted-knit ghost survives (low normalStrength), muted matte sheen.
  { id: 'boiled-wool', name: 'Boiled wool', family: 'woven', gsm: 450, stretch: 0.05, bendiness: 0.34, friction: 0.64, color: 0x4a5540, roughness: 0.97, sheen: 0.28, sheenRoughness: 0.66, weave: 'knit', weaveScale: 90, normalStrength: 0.35, anisotropy: 0, transmission: 0 },
  { id: 'ponte', name: 'Ponte knit', family: 'knit', gsm: 320, stretch: 0.4, bendiness: 0.42, friction: 0.6, color: 0x2e2e34, roughness: 0.88, sheen: 0.38, sheenRoughness: 0.58, weave: 'knit', weaveScale: 100, normalStrength: 0.5, anisotropy: 0, transmission: 0 },
  { id: 'scuba', name: 'Scuba knit', family: 'knit', gsm: 300, stretch: 0.35, bendiness: 0.5, friction: 0.55, color: 0x25262b, roughness: 0.7, sheen: 0.5, sheenRoughness: 0.5, weave: 'knit', weaveScale: 130, normalStrength: 0.4, anisotropy: 0, transmission: 0 },

  // ---- silks & smooth (flowy → liquid) ----
  { id: 'silk-charmeuse', name: 'Silk charmeuse', family: 'silk', gsm: 80, stretch: 0.06, bendiness: 0.9, friction: 0.32, color: 0xd9c27e, roughness: 0.32, sheen: 1.0, sheenRoughness: 0.25, weave: 'satin', weaveScale: 260, normalStrength: 0.25, anisotropy: 0.7, transmission: 0 },
  { id: 'satin', name: 'Satin', family: 'silk', gsm: 120, stretch: 0.05, bendiness: 0.75, friction: 0.3, color: 0x7a3b6b, roughness: 0.36, sheen: 0.85, sheenRoughness: 0.42, weave: 'satin', weaveScale: 240, normalStrength: 0.3, anisotropy: 0.5, transmission: 0 },
  { id: 'crepe', name: 'Crepe de chine', family: 'silk', gsm: 110, stretch: 0.07, bendiness: 0.82, friction: 0.34, color: 0x9aa0a6, roughness: 0.5, sheen: 0.7, sheenRoughness: 0.4, weave: 'plain', weaveScale: 240, normalStrength: 0.35, anisotropy: 0.2, transmission: 0 },
  { id: 'organza', name: 'Organza (sheer)', family: 'silk', gsm: 50, stretch: 0.03, bendiness: 0.55, friction: 0.3, color: 0xe6e0f0, roughness: 0.35, sheen: 0.95, sheenRoughness: 0.3, weave: 'plain', weaveScale: 300, normalStrength: 0.25, anisotropy: 0.3, transmission: 0.55 },
  { id: 'chiffon', name: 'Chiffon (sheer)', family: 'silk', gsm: 45, stretch: 0.1, bendiness: 1.0, friction: 0.28, color: 0xd98ca8, roughness: 0.55, sheen: 0.9, sheenRoughness: 0.4, weave: 'plain', weaveScale: 320, normalStrength: 0.2, anisotropy: 0, transmission: 0.45 },

  // ---- knits (stretchy → soft) ----
  { id: 'jersey-knit', name: 'Jersey knit', family: 'knit', gsm: 220, stretch: 0.75, bendiness: 0.7, friction: 0.5, color: 0x5f8f6b, roughness: 0.82, sheen: 0.5, sheenRoughness: 0.5, weave: 'knit', weaveScale: 120, normalStrength: 0.6, anisotropy: 0, transmission: 0 },
  { id: 'rib-knit', name: 'Rib knit', family: 'knit', gsm: 260, stretch: 0.85, bendiness: 0.62, friction: 0.52, color: 0x8a4b5e, roughness: 0.85, sheen: 0.45, sheenRoughness: 0.5, weave: 'rib', weaveScale: 90, normalStrength: 0.7, anisotropy: 0, transmission: 0 },
  // thermal grid — raised walls around deep square cells (the waffle base layer)
  { id: 'waffle-knit', name: 'Waffle knit', family: 'knit', gsm: 300, stretch: 0.7, bendiness: 0.6, friction: 0.55, color: 0xc9b697, roughness: 0.9, sheen: 0.4, sheenRoughness: 0.55, weave: 'waffle', weaveScale: 70, normalStrength: 0.85, anisotropy: 0, transmission: 0 },
  { id: 'french-terry', name: 'French terry', family: 'knit', gsm: 320, stretch: 0.6, bendiness: 0.58, friction: 0.55, color: 0xb2b7bf, roughness: 0.9, sheen: 0.35, sheenRoughness: 0.55, weave: 'knit', weaveScale: 100, normalStrength: 0.65, anisotropy: 0, transmission: 0 },
  { id: 'fleece', name: 'Fleece', family: 'knit', nap: true, gsm: 360, stretch: 0.5, bendiness: 0.68, friction: 0.6, color: 0x556070, roughness: 0.98, sheen: 0.3, sheenRoughness: 0.6, weave: 'knit', weaveScale: 80, normalStrength: 0.75, anisotropy: 0, transmission: 0 },
  { id: 'cable-knit', name: 'Cable knit', family: 'knit', gsm: 400, stretch: 0.55, bendiness: 0.52, friction: 0.58, color: 0xd8cbb0, roughness: 0.92, sheen: 0.4, sheenRoughness: 0.55, weave: 'cable', weaveScale: 55, normalStrength: 0.9, anisotropy: 0, transmission: 0 },

  // ---- specialty ----
  { id: 'leather', name: 'Leather', family: 'specialty', gsm: 340, stretch: 0.02, bendiness: 0.22, friction: 0.6, color: 0x5a3826, roughness: 0.5, sheen: 0.4, sheenRoughness: 0.5, weave: 'leather', weaveScale: 90, normalStrength: 0.35, anisotropy: 0, transmission: 0 },
  { id: 'patent', name: 'Patent leather', family: 'specialty', gsm: 400, stretch: 0.02, bendiness: 0.18, friction: 0.42, color: 0x161418, roughness: 0.22, sheen: 0.2, sheenRoughness: 0.35, weave: 'plain', weaveScale: 200, normalStrength: 0.14, anisotropy: 0.1, transmission: 0, clearcoat: 1 },
  { id: 'suede', name: 'Suede', family: 'specialty', nap: true, gsm: 300, stretch: 0.03, bendiness: 0.3, friction: 0.66, color: 0x7a5a3e, roughness: 0.88, sheen: 0.3, sheenRoughness: 0.7, weave: 'leather', weaveScale: 90, normalStrength: 0.3, anisotropy: 0.1, transmission: 0 },
  { id: 'velvet', name: 'Velvet', family: 'specialty', nap: true, gsm: 300, stretch: 0.15, bendiness: 0.55, friction: 0.6, color: 0x4a2b53, roughness: 0.6, sheen: 0.95, sheenRoughness: 0.35, weave: 'satin', weaveScale: 120, normalStrength: 0.45, anisotropy: 0.3, transmission: 0 },
  { id: 'tulle', name: 'Tulle (sheer)', family: 'specialty', gsm: 40, stretch: 0.2, bendiness: 0.6, friction: 0.3, color: 0xefe6f2, roughness: 0.4, sheen: 0.6, sheenRoughness: 0.4, weave: 'knit', weaveScale: 260, normalStrength: 0.2, anisotropy: 0, transmission: 0.6 },
  { id: 'spandex', name: 'Spandex', family: 'specialty', gsm: 200, stretch: 0.95, bendiness: 0.75, friction: 0.45, color: 0x2b2b33, roughness: 0.4, sheen: 0.75, sheenRoughness: 0.4, weave: 'knit', weaveScale: 150, normalStrength: 0.4, anisotropy: 0.2, transmission: 0 },
  // a slinky metallic-thread cloth — the metalness makes it read as woven gold foil
  { id: 'lame', name: 'Lamé (metallic)', family: 'specialty', gsm: 180, stretch: 0.25, bendiness: 0.62, friction: 0.35, color: 0xd4af37, roughness: 0.25, sheen: 0.4, sheenRoughness: 0.3, weave: 'satin', weaveScale: 160, normalStrength: 0.25, anisotropy: 0.5, transmission: 0, metalness: 0.85 },
  // thick spacer knit — heavy + very stiff, holds sculptural scuba shapes
  { id: 'neoprene', name: 'Neoprene (scuba)', family: 'specialty', gsm: 420, stretch: 0.5, bendiness: 0.15, friction: 0.5, color: 0x22262e, roughness: 0.85, sheen: 0.25, sheenRoughness: 0.6, weave: 'knit', weaveScale: 110, normalStrength: 0.3, anisotropy: 0, transmission: 0 },
  // hex-perforated sport knit — real see-through holes (alpha cutout), breathable look
  { id: 'athletic-mesh', name: 'Athletic mesh', family: 'knit', gsm: 140, stretch: 0.7, bendiness: 0.7, friction: 0.4, color: 0x30343c, roughness: 0.75, sheen: 0.35, sheenRoughness: 0.55, weave: 'knit', weaveScale: 180, normalStrength: 0.3, anisotropy: 0, transmission: 0, perforated: true },
  // paillette-covered base — big glinting discs; pairs with the sequins sparkle finish
  { id: 'sequin-base', name: 'Sequin base', family: 'specialty', gsm: 320, stretch: 0.3, bendiness: 0.5, friction: 0.4, color: 0x8a1538, roughness: 0.3, sheen: 0.6, sheenRoughness: 0.3, weave: 'satin', weaveScale: 70, normalStrength: 0.8, anisotropy: 0.15, transmission: 0, metalness: 0.65 },
  // ---- micro-backlog: more wovens, silks + shirtings ----
  { id: 'seersucker', name: 'Seersucker', family: 'woven', gsm: 130, stretch: 0.03, bendiness: 0.55, friction: 0.5, color: 0xd7e0ea, roughness: 0.85, sheen: 0.4, sheenRoughness: 0.6, weave: 'plain', weaveScale: 150, normalStrength: 0.85, anisotropy: 0, transmission: 0 },
  { id: 'ripstop-nylon', name: 'Ripstop nylon', family: 'specialty', gsm: 70, stretch: 0.06, bendiness: 0.7, friction: 0.35, color: 0x3a4a5a, roughness: 0.55, sheen: 0.62, sheenRoughness: 0.45, weave: 'plain', weaveScale: 220, normalStrength: 0.45, anisotropy: 0, transmission: 0 },
  { id: 'cavalry-twill', name: 'Cavalry twill', family: 'woven', gsm: 320, stretch: 0.04, bendiness: 0.2, friction: 0.55, color: 0x8a7a5a, roughness: 0.82, sheen: 0.45, sheenRoughness: 0.6, weave: 'twill', weaveScale: 150, normalStrength: 0.75, anisotropy: 0.05, transmission: 0 },
  { id: 'hopsack', name: 'Hopsack', family: 'woven', gsm: 280, stretch: 0.05, bendiness: 0.28, friction: 0.55, color: 0x565b48, roughness: 0.86, sheen: 0.4, sheenRoughness: 0.6, weave: 'plain', weaveScale: 110, normalStrength: 0.8, anisotropy: 0, transmission: 0 },
  { id: 'birdseye-suiting', name: "Bird's-eye suiting", family: 'woven', gsm: 270, stretch: 0.04, bendiness: 0.24, friction: 0.5, color: 0x3e4756, roughness: 0.8, sheen: 0.5, sheenRoughness: 0.55, weave: 'twill', weaveScale: 210, normalStrength: 0.55, anisotropy: 0.05, transmission: 0 },
  { id: 'sharkskin', name: 'Sharkskin suiting', family: 'woven', gsm: 290, stretch: 0.04, bendiness: 0.24, friction: 0.5, color: 0x4a4e58, roughness: 0.72, sheen: 0.58, sheenRoughness: 0.5, weave: 'twill', weaveScale: 180, normalStrength: 0.5, anisotropy: 0.08, transmission: 0 },
  { id: 'moleskin', name: 'Moleskin', family: 'woven', gsm: 300, stretch: 0.04, bendiness: 0.3, friction: 0.62, color: 0x6a5a48, roughness: 0.92, sheen: 0.2, sheenRoughness: 0.7, weave: 'twill', weaveScale: 150, normalStrength: 0.4, anisotropy: 0, transmission: 0 },
  { id: 'cotton-drill', name: 'Cotton drill', family: 'woven', gsm: 280, stretch: 0.04, bendiness: 0.26, friction: 0.55, color: 0xc8b89a, roughness: 0.83, sheen: 0.42, sheenRoughness: 0.6, weave: 'twill', weaveScale: 165, normalStrength: 0.7, anisotropy: 0.05, transmission: 0 },
  { id: 'cotton-voile', name: 'Cotton voile', family: 'woven', gsm: 60, stretch: 0.03, bendiness: 0.85, friction: 0.4, color: 0xe8e4dc, roughness: 0.62, sheen: 0.35, sheenRoughness: 0.55, weave: 'plain', weaveScale: 250, normalStrength: 0.25, anisotropy: 0, transmission: 0.35 },
  { id: 'cotton-lawn', name: 'Cotton lawn', family: 'woven', gsm: 75, stretch: 0.03, bendiness: 0.8, friction: 0.42, color: 0xe4e0d6, roughness: 0.6, sheen: 0.4, sheenRoughness: 0.55, weave: 'plain', weaveScale: 240, normalStrength: 0.3, anisotropy: 0, transmission: 0.15 },
  { id: 'batiste', name: 'Batiste', family: 'woven', gsm: 65, stretch: 0.03, bendiness: 0.82, friction: 0.4, color: 0xeae6de, roughness: 0.6, sheen: 0.4, sheenRoughness: 0.55, weave: 'plain', weaveScale: 245, normalStrength: 0.28, anisotropy: 0, transmission: 0.2 },
  { id: 'broadcloth', name: 'Broadcloth shirting', family: 'woven', gsm: 120, stretch: 0.03, bendiness: 0.45, friction: 0.48, color: 0xdfe6ee, roughness: 0.7, sheen: 0.52, sheenRoughness: 0.5, weave: 'plain', weaveScale: 210, normalStrength: 0.45, anisotropy: 0, transmission: 0 },
  { id: 'dupioni-silk', name: 'Dupioni silk', family: 'silk', gsm: 90, stretch: 0.05, bendiness: 0.4, friction: 0.35, color: 0xc23b3b, roughness: 0.5, sheen: 0.85, sheenRoughness: 0.35, weave: 'plain', weaveScale: 200, normalStrength: 0.5, anisotropy: 0.3, transmission: 0.05 },
  { id: 'shantung-silk', name: 'Shantung silk', family: 'silk', gsm: 100, stretch: 0.05, bendiness: 0.42, friction: 0.35, color: 0xd9c27e, roughness: 0.5, sheen: 0.8, sheenRoughness: 0.4, weave: 'plain', weaveScale: 190, normalStrength: 0.45, anisotropy: 0.25, transmission: 0.05 },
  { id: 'silk-georgette', name: 'Silk georgette', family: 'silk', gsm: 55, stretch: 0.08, bendiness: 0.95, friction: 0.3, color: 0xd98ca8, roughness: 0.55, sheen: 0.75, sheenRoughness: 0.45, weave: 'plain', weaveScale: 300, normalStrength: 0.2, anisotropy: 0, transmission: 0.4 },
  // ---- micro-backlog: fine silks, textured double-cloths + knits ----
  { id: 'habotai-silk', name: 'Habotai silk', family: 'silk', gsm: 60, stretch: 0.05, bendiness: 0.88, friction: 0.32, color: 0xe8e0d0, roughness: 0.45, sheen: 0.82, sheenRoughness: 0.35, weave: 'plain', weaveScale: 260, normalStrength: 0.2, anisotropy: 0.15, transmission: 0.3 },
  { id: 'crepe-back-satin', name: 'Crepe-back satin', family: 'silk', gsm: 130, stretch: 0.06, bendiness: 0.6, friction: 0.34, color: 0x7a1030, roughness: 0.35, sheen: 0.88, sheenRoughness: 0.25, weave: 'satin', weaveScale: 90, normalStrength: 0.3, anisotropy: 0.35, transmission: 0.02 },
  { id: 'matelasse', name: 'Matelassé', family: 'specialty', gsm: 340, stretch: 0.05, bendiness: 0.35, friction: 0.5, color: 0xd8cbb0, roughness: 0.8, sheen: 0.4, sheenRoughness: 0.6, weave: 'waffle', weaveScale: 60, normalStrength: 0.85, anisotropy: 0, transmission: 0 },
  { id: 'cloque', name: 'Cloqué', family: 'specialty', gsm: 220, stretch: 0.08, bendiness: 0.45, friction: 0.42, color: 0x2e5a6a, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.45, weave: 'waffle', weaveScale: 70, normalStrength: 0.8, anisotropy: 0.1, transmission: 0 },
  { id: 'terry-towelling', name: 'Terry towelling', family: 'specialty', gsm: 400, stretch: 0.2, bendiness: 0.5, friction: 0.7, color: 0xe0ddd2, roughness: 0.95, sheen: 0.15, sheenRoughness: 0.75, weave: 'knit', weaveScale: 80, normalStrength: 0.6, anisotropy: 0, transmission: 0 },
  { id: 'interlock-knit', name: 'Interlock knit', family: 'knit', gsm: 240, stretch: 0.7, bendiness: 0.68, friction: 0.5, color: 0x6a7a8a, roughness: 0.8, sheen: 0.45, sheenRoughness: 0.5, weave: 'knit', weaveScale: 130, normalStrength: 0.55, anisotropy: 0, transmission: 0 },
  { id: 'milano-rib', name: 'Milano rib', family: 'knit', gsm: 300, stretch: 0.6, bendiness: 0.5, friction: 0.52, color: 0x3a3f48, roughness: 0.82, sheen: 0.42, sheenRoughness: 0.5, weave: 'rib', weaveScale: 100, normalStrength: 0.6, anisotropy: 0, transmission: 0 },
  { id: 'ottoman-rib', name: 'Ottoman rib', family: 'knit', gsm: 340, stretch: 0.55, bendiness: 0.42, friction: 0.55, color: 0x5a3a4a, roughness: 0.84, sheen: 0.4, sheenRoughness: 0.55, weave: 'rib', weaveScale: 55, normalStrength: 0.8, anisotropy: 0, transmission: 0 },
  { id: 'boucle', name: 'Bouclé', family: 'specialty', gsm: 320, stretch: 0.1, bendiness: 0.4, friction: 0.62, color: 0xd8c2c8, roughness: 0.92, sheen: 0.25, sheenRoughness: 0.7, weave: 'knit', weaveScale: 70, normalStrength: 0.85, anisotropy: 0, transmission: 0 },
  { id: 'mohair', name: 'Mohair', family: 'specialty', gsm: 280, stretch: 0.4, bendiness: 0.55, friction: 0.6, color: 0xc8b0a0, roughness: 0.9, sheen: 0.3, sheenRoughness: 0.7, weave: 'knit', weaveScale: 90, normalStrength: 0.5, anisotropy: 0, transmission: 0 },
  // ---- micro-backlog: luxury knits + suiting wools ----
  { id: 'cashmere-knit', name: 'Cashmere knit', family: 'knit', gsm: 240, stretch: 0.5, bendiness: 0.72, friction: 0.5, color: 0xc9b8a0, roughness: 0.85, sheen: 0.35, sheenRoughness: 0.6, weave: 'knit', weaveScale: 110, normalStrength: 0.5, anisotropy: 0, transmission: 0 },
  { id: 'angora', name: 'Angora', family: 'specialty', gsm: 220, stretch: 0.45, bendiness: 0.7, friction: 0.58, color: 0xe0d5cc, roughness: 0.92, sheen: 0.28, sheenRoughness: 0.7, weave: 'knit', weaveScale: 95, normalStrength: 0.5, anisotropy: 0, transmission: 0 },
  { id: 'harris-tweed', name: 'Harris tweed', family: 'woven', gsm: 360, stretch: 0.04, bendiness: 0.22, friction: 0.6, color: 0x6a5f48, roughness: 0.9, sheen: 0.3, sheenRoughness: 0.65, weave: 'twill', weaveScale: 120, normalStrength: 0.75, anisotropy: 0.05, transmission: 0 },
  { id: 'houndstooth-wool', name: 'Houndstooth wool', family: 'woven', gsm: 300, stretch: 0.04, bendiness: 0.26, friction: 0.55, color: 0x3a3a3a, roughness: 0.84, sheen: 0.35, sheenRoughness: 0.6, weave: 'twill', weaveScale: 150, normalStrength: 0.6, anisotropy: 0.05, transmission: 0 },
  { id: 'herringbone-wool', name: 'Herringbone wool', family: 'woven', gsm: 320, stretch: 0.04, bendiness: 0.24, friction: 0.55, color: 0x4a4e56, roughness: 0.84, sheen: 0.35, sheenRoughness: 0.6, weave: 'twill', weaveScale: 140, normalStrength: 0.62, anisotropy: 0.05, transmission: 0 },
  { id: 'brushed-flannel', name: 'Brushed flannel', family: 'woven', gsm: 300, stretch: 0.05, bendiness: 0.34, friction: 0.58, color: 0x8a5a5a, roughness: 0.9, sheen: 0.25, sheenRoughness: 0.68, weave: 'twill', weaveScale: 130, normalStrength: 0.45, anisotropy: 0, transmission: 0 },
  { id: 'jacquard-brocade', name: 'Jacquard brocade', family: 'specialty', gsm: 320, stretch: 0.04, bendiness: 0.38, friction: 0.45, color: 0x7a2a4a, roughness: 0.55, sheen: 0.65, sheenRoughness: 0.4, weave: 'satin', weaveScale: 80, normalStrength: 0.8, anisotropy: 0.15, transmission: 0 }
]

export function getFabric(id: string): Fabric {
  return FABRIC_LIBRARY.find((f) => f.id === id) ?? FABRIC_LIBRARY[0]
}
