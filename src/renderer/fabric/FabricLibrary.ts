import type { FabricParams } from '../cloth/fabricPresets'

export type WeaveType = 'plain' | 'twill' | 'satin' | 'knit'

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
}

const MASS_PER_GSM = 0.0015 // gsm → total garment mass (kg), tuned by feel

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

export const FABRIC_LIBRARY: Fabric[] = [
  // ---- wovens (crisp → structured) ----
  { id: 'cotton-poplin', name: 'Cotton poplin', family: 'woven', gsm: 130, stretch: 0.04, bendiness: 0.42, friction: 0.5, color: 0xc85a54, roughness: 0.78, sheen: 0.7, sheenRoughness: 0.5, weave: 'plain', weaveScale: 220, normalStrength: 0.5, anisotropy: 0, transmission: 0 },
  { id: 'oxford', name: 'Oxford cloth', family: 'woven', gsm: 150, stretch: 0.04, bendiness: 0.38, friction: 0.52, color: 0xb8c4d0, roughness: 0.8, sheen: 0.5, sheenRoughness: 0.6, weave: 'plain', weaveScale: 190, normalStrength: 0.65, anisotropy: 0, transmission: 0 },
  { id: 'chino-twill', name: 'Chino twill', family: 'woven', gsm: 260, stretch: 0.05, bendiness: 0.26, friction: 0.55, color: 0xbfa878, roughness: 0.83, sheen: 0.45, sheenRoughness: 0.6, weave: 'twill', weaveScale: 170, normalStrength: 0.7, anisotropy: 0.05, transmission: 0 },
  { id: 'denim', name: 'Denim', family: 'woven', gsm: 380, stretch: 0.02, bendiness: 0.14, friction: 0.55, color: 0x3b5b82, roughness: 0.85, sheen: 0.35, sheenRoughness: 0.7, weave: 'twill', weaveScale: 180, normalStrength: 0.9, anisotropy: 0.1, transmission: 0 },
  { id: 'canvas', name: 'Cotton canvas', family: 'woven', gsm: 340, stretch: 0.02, bendiness: 0.16, friction: 0.6, color: 0xc3b58c, roughness: 0.92, sheen: 0.25, sheenRoughness: 0.75, weave: 'plain', weaveScale: 120, normalStrength: 1.0, anisotropy: 0, transmission: 0 },
  { id: 'corduroy', name: 'Corduroy', family: 'woven', nap: true, gsm: 320, stretch: 0.06, bendiness: 0.3, friction: 0.62, color: 0x8a5a3c, roughness: 0.88, sheen: 0.5, sheenRoughness: 0.55, weave: 'twill', weaveScale: 70, normalStrength: 1.2, anisotropy: 0.15, transmission: 0 },
  { id: 'linen', name: 'Linen', family: 'woven', gsm: 190, stretch: 0.03, bendiness: 0.3, friction: 0.52, color: 0xcbb892, roughness: 0.9, sheen: 0.3, sheenRoughness: 0.8, weave: 'plain', weaveScale: 150, normalStrength: 0.85, anisotropy: 0, transmission: 0 },
  { id: 'wool-flannel', name: 'Wool flannel', family: 'woven', gsm: 300, stretch: 0.08, bendiness: 0.5, friction: 0.6, color: 0x59616b, roughness: 0.95, sheen: 0.6, sheenRoughness: 0.55, weave: 'twill', weaveScale: 140, normalStrength: 0.6, anisotropy: 0, transmission: 0 },
  { id: 'tweed', name: 'Wool tweed', family: 'woven', gsm: 360, stretch: 0.05, bendiness: 0.36, friction: 0.62, color: 0x6b6552, roughness: 0.96, sheen: 0.35, sheenRoughness: 0.6, weave: 'twill', weaveScale: 100, normalStrength: 0.95, anisotropy: 0, transmission: 0 },

  // ---- silks & smooth (flowy → liquid) ----
  { id: 'silk-charmeuse', name: 'Silk charmeuse', family: 'silk', gsm: 80, stretch: 0.06, bendiness: 0.9, friction: 0.32, color: 0xd9c27e, roughness: 0.32, sheen: 1.0, sheenRoughness: 0.25, weave: 'satin', weaveScale: 260, normalStrength: 0.25, anisotropy: 0.7, transmission: 0 },
  { id: 'satin', name: 'Satin', family: 'silk', gsm: 120, stretch: 0.05, bendiness: 0.75, friction: 0.3, color: 0x7a3b6b, roughness: 0.28, sheen: 1.0, sheenRoughness: 0.3, weave: 'satin', weaveScale: 240, normalStrength: 0.3, anisotropy: 0.8, transmission: 0 },
  { id: 'crepe', name: 'Crepe de chine', family: 'silk', gsm: 110, stretch: 0.07, bendiness: 0.82, friction: 0.34, color: 0x9aa0a6, roughness: 0.5, sheen: 0.7, sheenRoughness: 0.4, weave: 'plain', weaveScale: 240, normalStrength: 0.35, anisotropy: 0.2, transmission: 0 },
  { id: 'organza', name: 'Organza (sheer)', family: 'silk', gsm: 50, stretch: 0.03, bendiness: 0.55, friction: 0.3, color: 0xe6e0f0, roughness: 0.35, sheen: 0.95, sheenRoughness: 0.3, weave: 'plain', weaveScale: 300, normalStrength: 0.25, anisotropy: 0.3, transmission: 0.55 },
  { id: 'chiffon', name: 'Chiffon (sheer)', family: 'silk', gsm: 45, stretch: 0.1, bendiness: 1.0, friction: 0.28, color: 0xd98ca8, roughness: 0.55, sheen: 0.9, sheenRoughness: 0.4, weave: 'plain', weaveScale: 320, normalStrength: 0.2, anisotropy: 0, transmission: 0.45 },

  // ---- knits (stretchy → soft) ----
  { id: 'jersey-knit', name: 'Jersey knit', family: 'knit', gsm: 220, stretch: 0.75, bendiness: 0.7, friction: 0.5, color: 0x5f8f6b, roughness: 0.82, sheen: 0.5, sheenRoughness: 0.5, weave: 'knit', weaveScale: 120, normalStrength: 0.8, anisotropy: 0, transmission: 0 },
  { id: 'rib-knit', name: 'Rib knit', family: 'knit', gsm: 260, stretch: 0.85, bendiness: 0.62, friction: 0.52, color: 0x8a4b5e, roughness: 0.85, sheen: 0.45, sheenRoughness: 0.5, weave: 'knit', weaveScale: 90, normalStrength: 1.0, anisotropy: 0, transmission: 0 },
  { id: 'french-terry', name: 'French terry', family: 'knit', gsm: 320, stretch: 0.6, bendiness: 0.58, friction: 0.55, color: 0xb2b7bf, roughness: 0.9, sheen: 0.35, sheenRoughness: 0.55, weave: 'knit', weaveScale: 100, normalStrength: 0.9, anisotropy: 0, transmission: 0 },
  { id: 'fleece', name: 'Fleece', family: 'knit', nap: true, gsm: 360, stretch: 0.5, bendiness: 0.68, friction: 0.6, color: 0x556070, roughness: 0.98, sheen: 0.3, sheenRoughness: 0.6, weave: 'knit', weaveScale: 80, normalStrength: 1.1, anisotropy: 0, transmission: 0 },
  { id: 'cable-knit', name: 'Cable knit', family: 'knit', gsm: 400, stretch: 0.55, bendiness: 0.52, friction: 0.58, color: 0xd8cbb0, roughness: 0.92, sheen: 0.4, sheenRoughness: 0.55, weave: 'knit', weaveScale: 55, normalStrength: 1.4, anisotropy: 0, transmission: 0 },

  // ---- specialty ----
  { id: 'leather', name: 'Leather', family: 'specialty', gsm: 340, stretch: 0.02, bendiness: 0.22, friction: 0.6, color: 0x5a3826, roughness: 0.5, sheen: 0.4, sheenRoughness: 0.5, weave: 'plain', weaveScale: 90, normalStrength: 0.35, anisotropy: 0, transmission: 0 },
  { id: 'suede', name: 'Suede', family: 'specialty', nap: true, gsm: 300, stretch: 0.03, bendiness: 0.3, friction: 0.66, color: 0x7a5a3e, roughness: 0.88, sheen: 0.3, sheenRoughness: 0.7, weave: 'plain', weaveScale: 90, normalStrength: 0.3, anisotropy: 0.1, transmission: 0 },
  { id: 'velvet', name: 'Velvet', family: 'specialty', nap: true, gsm: 300, stretch: 0.15, bendiness: 0.55, friction: 0.6, color: 0x4a2b53, roughness: 0.6, sheen: 0.95, sheenRoughness: 0.35, weave: 'satin', weaveScale: 120, normalStrength: 0.45, anisotropy: 0.3, transmission: 0 },
  { id: 'tulle', name: 'Tulle (sheer)', family: 'specialty', gsm: 40, stretch: 0.2, bendiness: 0.6, friction: 0.3, color: 0xefe6f2, roughness: 0.4, sheen: 0.6, sheenRoughness: 0.4, weave: 'knit', weaveScale: 260, normalStrength: 0.2, anisotropy: 0, transmission: 0.6 },
  { id: 'spandex', name: 'Spandex', family: 'specialty', gsm: 200, stretch: 0.95, bendiness: 0.75, friction: 0.45, color: 0x2b2b33, roughness: 0.4, sheen: 0.75, sheenRoughness: 0.4, weave: 'knit', weaveScale: 150, normalStrength: 0.4, anisotropy: 0.2, transmission: 0 }
]

export function getFabric(id: string): Fabric {
  return FABRIC_LIBRARY.find((f) => f.id === id) ?? FABRIC_LIBRARY[0]
}
