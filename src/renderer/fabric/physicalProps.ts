import { MASS_PER_GSM, type Fabric } from './FabricLibrary'
import type { FabricParams } from '../cloth/fabricPresets'

/**
 * Physical fabric properties — the fabric editor in REAL units (weight ·
 * thickness · bending rigidity · stretch % warp/weft · shear) instead of the
 * presets' normalised 0…1 dials. `physicalDefaults` seeds the editor from a
 * preset so opening it changes nothing; `physicalToSolverParams` maps the real
 * units back onto the solver (same curves as `fabricToSolverParams`, inverted,
 * so untouched defaults round-trip to the identical drape); the spec line
 * lands in the tech pack. Pure + unit-tested.
 */

export interface PhysicalFabric {
  /** Areal weight (g/m²). */
  gsm: number
  /** Cloth thickness (mm). */
  thicknessMm: number
  /** Cantilever bending rigidity (µN·m) — chiffon ≈ 1, shirting ≈ 8, denim ≈ 40, canvas ≈ 120. */
  bendRigidityUNm: number
  /** Extension at standard load (%), along the warp (lengthwise grain). */
  stretchWarpPct: number
  /** Extension (%), along the weft/course — knits give most here. */
  stretchWeftPct: number
  /** Shear deformability (%) — how freely the cloth skews on the bias (drape fluidity). */
  shearPct: number
}

// bendiness 1 → RIGIDITY_MIN µN·m (chiffon), bendiness 0 → RIGIDITY_MIN×RIGIDITY_SPAN (canvas)
const RIGIDITY_MIN = 0.8
const RIGIDITY_SPAN = 150

export const clampPhysical = (p: PhysicalFabric): PhysicalFabric => ({
  gsm: Math.max(40, Math.min(800, p.gsm)),
  thicknessMm: Math.max(0.05, Math.min(4, p.thicknessMm)),
  bendRigidityUNm: Math.max(RIGIDITY_MIN, Math.min(RIGIDITY_MIN * RIGIDITY_SPAN, p.bendRigidityUNm)),
  stretchWarpPct: Math.max(0, Math.min(60, p.stretchWarpPct)),
  stretchWeftPct: Math.max(0, Math.min(60, p.stretchWeftPct)),
  shearPct: Math.max(0, Math.min(60, p.shearPct))
})

/** Real-unit view of a preset — the editor's seed values. */
export function physicalDefaults(fabric: Fabric): PhysicalFabric {
  return clampPhysical({
    gsm: fabric.gsm,
    // industry rough cut: areal weight tracks thickness (150 gsm shirting ≈ 0.4 mm,
    // 400 gsm denim ≈ 1.1 mm), stiffer cloth packing a touch thicker
    thicknessMm: 0.05 + fabric.gsm * 0.0025 + (1 - fabric.bendiness) * 0.1,
    bendRigidityUNm: RIGIDITY_MIN * Math.pow(RIGIDITY_SPAN, 1 - fabric.bendiness),
    // wovens stretch less along the warp; knits give most on the course
    stretchWarpPct: fabric.stretch * 100 * 0.6,
    stretchWeftPct: fabric.stretch * 100,
    shearPct: fabric.bendiness * 40 + fabric.stretch * 20
  })
}

/** Invert the rigidity map back to the presets' 0…1 bendiness. */
export const bendinessFromRigidity = (uNm: number): number =>
  Math.max(0, Math.min(1, 1 - Math.log(Math.max(RIGIDITY_MIN, uNm) / RIGIDITY_MIN) / Math.log(RIGIDITY_SPAN)))

/**
 * Real units → solver params. Follows the same curves as
 * `fabricToSolverParams`, so a preset passed through `physicalDefaults` and
 * back drapes identically; only edited values change the sim. Colour/friction
 * ride through from the derived base.
 */
export function physicalToSolverParams(phys: PhysicalFabric, base: FabricParams): FabricParams {
  const p = clampPhysical(phys)
  const stretch01 = (p.stretchWarpPct * 0.4 + p.stretchWeftPct * 0.6) / 100 // weft-weighted mean
  const bendiness = bendinessFromRigidity(p.bendRigidityUNm)
  // shear eases the diagonals a touch: a high-shear cloth drapes more fluidly
  const shearEase = 1 + p.shearPct / 120
  return {
    ...base,
    mass: Math.max(0.05, p.gsm * MASS_PER_GSM),
    stretchCompliance: Math.max(1e-5, stretch01 * 6e-3 * shearEase),
    bendCompliance: 0.0001 + bendiness * 0.018,
    damping: 0.6 + (1 - bendiness) * 0.8,
    // light + fluid catches the air; thickness adds a little broadside drag
    aero: 1 + 12 * (1 - Math.min(1, p.gsm / 340)) * (0.4 + 0.6 * bendiness) + p.thicknessMm * 0.3
  }
}

/** One-line real-unit spec for the tech pack. */
export function physicalSummary(p: PhysicalFabric): string {
  const c = clampPhysical(p)
  return `${Math.round(c.gsm)} g/m² · ${c.thicknessMm.toFixed(2)} mm · bend ${c.bendRigidityUNm.toFixed(1)} µN·m · stretch ${Math.round(c.stretchWarpPct)}/${Math.round(c.stretchWeftPct)} % (warp/weft) · shear ${Math.round(c.shearPct)} %`
}

/** Parse the editor's deep-link params; undefined when none are present. */
export function parsePhysicalParams(get: (k: string) => string | null, seed: PhysicalFabric): PhysicalFabric | undefined {
  const keys: Array<[keyof PhysicalFabric, string]> = [
    ['gsm', 'gsm'],
    ['thicknessMm', 'thickMm'],
    ['bendRigidityUNm', 'bend'],
    ['stretchWarpPct', 'stretchWarp'],
    ['stretchWeftPct', 'stretchWeft'],
    ['shearPct', 'shear']
  ]
  let any = false
  const out = { ...seed }
  for (const [field, param] of keys) {
    const v = get(param)
    if (v !== null && Number.isFinite(Number(v))) {
      out[field] = Number(v)
      any = true
    }
  }
  return any ? clampPhysical(out) : undefined
}
