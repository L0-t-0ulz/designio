import type { FabricParams } from '../cloth/fabricPresets'

export type WeaveType = 'plain' | 'twill' | 'satin' | 'knit'

/**
 * A fabric described by real, tunable properties — both how it *behaves*
 * (weight, stretch, drape) and how it *looks* (weave, sheen, colour). The solver
 * params are derived from the physical fields, so changing the weight/stretch of
 * a fabric actually changes how it drapes.
 */
export interface Fabric {
  id: string
  name: string

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
    color: fabric.color
  }
}

export const FABRIC_LIBRARY: Fabric[] = [
  {
    id: 'cotton-poplin',
    name: 'Cotton poplin',
    gsm: 130,
    stretch: 0.04,
    bendiness: 0.42,
    friction: 0.5,
    color: 0xc85a54,
    roughness: 0.78,
    sheen: 0.7,
    sheenRoughness: 0.5,
    weave: 'plain',
    weaveScale: 220,
    normalStrength: 0.5,
    anisotropy: 0,
    transmission: 0
  },
  {
    id: 'denim',
    name: 'Denim',
    gsm: 380,
    stretch: 0.02,
    bendiness: 0.14,
    friction: 0.55,
    color: 0x3b5b82,
    roughness: 0.85,
    sheen: 0.35,
    sheenRoughness: 0.7,
    weave: 'twill',
    weaveScale: 180,
    normalStrength: 0.9,
    anisotropy: 0.1,
    transmission: 0
  },
  {
    id: 'linen',
    name: 'Linen',
    gsm: 190,
    stretch: 0.03,
    bendiness: 0.3,
    friction: 0.52,
    color: 0xcbb892,
    roughness: 0.9,
    sheen: 0.3,
    sheenRoughness: 0.8,
    weave: 'plain',
    weaveScale: 150,
    normalStrength: 0.85,
    anisotropy: 0,
    transmission: 0
  },
  {
    id: 'wool-flannel',
    name: 'Wool flannel',
    gsm: 300,
    stretch: 0.08,
    bendiness: 0.5,
    friction: 0.6,
    color: 0x59616b,
    roughness: 0.95,
    sheen: 0.6,
    sheenRoughness: 0.55,
    weave: 'twill',
    weaveScale: 140,
    normalStrength: 0.6,
    anisotropy: 0,
    transmission: 0
  },
  {
    id: 'silk-charmeuse',
    name: 'Silk charmeuse',
    gsm: 80,
    stretch: 0.06,
    bendiness: 0.9,
    friction: 0.32,
    color: 0xd9c27e,
    roughness: 0.32,
    sheen: 1.0,
    sheenRoughness: 0.25,
    weave: 'satin',
    weaveScale: 260,
    normalStrength: 0.25,
    anisotropy: 0.7,
    transmission: 0
  },
  {
    id: 'satin',
    name: 'Satin',
    gsm: 120,
    stretch: 0.05,
    bendiness: 0.75,
    friction: 0.3,
    color: 0x7a3b6b,
    roughness: 0.28,
    sheen: 1.0,
    sheenRoughness: 0.3,
    weave: 'satin',
    weaveScale: 240,
    normalStrength: 0.3,
    anisotropy: 0.8,
    transmission: 0
  },
  {
    id: 'jersey-knit',
    name: 'Jersey knit',
    gsm: 220,
    stretch: 0.75,
    bendiness: 0.7,
    friction: 0.5,
    color: 0x5f8f6b,
    roughness: 0.82,
    sheen: 0.5,
    sheenRoughness: 0.5,
    weave: 'knit',
    weaveScale: 120,
    normalStrength: 0.8,
    anisotropy: 0,
    transmission: 0
  },
  {
    id: 'chiffon',
    name: 'Chiffon (sheer)',
    gsm: 45,
    stretch: 0.1,
    bendiness: 1.0,
    friction: 0.28,
    color: 0xd98ca8,
    roughness: 0.55,
    sheen: 0.9,
    sheenRoughness: 0.4,
    weave: 'plain',
    weaveScale: 320,
    normalStrength: 0.2,
    anisotropy: 0,
    transmission: 0.45
  },
  {
    id: 'leather',
    name: 'Leather',
    gsm: 340,
    stretch: 0.02,
    bendiness: 0.22,
    friction: 0.6,
    color: 0x5a3826,
    roughness: 0.5,
    sheen: 0.4,
    sheenRoughness: 0.5,
    weave: 'plain',
    weaveScale: 90,
    normalStrength: 0.35,
    anisotropy: 0,
    transmission: 0
  }
]

export function getFabric(id: string): Fabric {
  return FABRIC_LIBRARY.find((f) => f.id === id) ?? FABRIC_LIBRARY[0]
}
