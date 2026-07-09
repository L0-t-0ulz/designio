/**
 * Fit **ease** — the numeric gap between the garment and the body at the girth
 * points that are actually *drafted* to the body: `ease = garment girth − body
 * girth`. Positive = looser than the body (positive ease), negative = tighter
 * (negative ease / compression). This is the single most-used fit-analysis readout
 * in real garment CAD (CLO3D / Browzwear); the panel shows it live and the
 * manufacturing pack prints it.
 *
 * Pure + unit-tested. Derived from the same construction radii as `garmentMetrics`
 * (so the garment girth matches the spec sheet exactly) and the body `Measurements`
 * radii — girth = 2π·r.
 *
 * Scope: **chest + waist** — the two points the tube model drafts *to the body*:
 *  - **Chest** — a shoulder-anchored top/dress's top ring (the bodice chest draft).
 *  - **Waist** — a cinched-waist radius, or a waist-anchored skirt/trouser waistband.
 * Hip is deliberately excluded: the tube has no drafted hip radius (the hip sits in
 * the interpolated waist→hem zone, so a spec-level hip reads as tight even when the
 * garment clearly clears the hips — hip clearance is emergent from the drape, not
 * the draft). A boxy top with no cinch reports no waist for the same reason. Leg-only
 * garments (plain trousers) have no body tube and report nothing here.
 */
import type { Measurements } from '../avatar/Mannequin'
import type { TubeSpec } from '../cloth/Garment'

export interface EaseRow {
  /** Fit point — 'Chest' | 'Waist'. */
  label: string
  /** Body girth at the point, cm. */
  bodyCm: number
  /** Garment girth at the point, cm. */
  garmentCm: number
  /** garmentCm − bodyCm (signed): + = loose, − = tight. */
  easeCm: number
}

const TAU = Math.PI * 2
const circ = (r: number): number => TAU * r * 100 // metres radius → cm circumference
const round1 = (v: number): number => Math.round(v * 10) / 10

/** Does the tube span the body height `y` (so this girth point is on the garment)? */
const covers = (s: TubeSpec, y: number): boolean => s.bottomY <= y && y <= s.topY

/**
 * Chest + waist ease for a garment's body tubes vs the body. Only reports a point
 * where the tube carries a radius drafted to that body dimension: chest = the top
 * ring of a shoulder-anchored top/dress; waist = an explicit cinch radius, or a
 * waist-anchored skirt/trouser waistband (its top ring).
 */
export function fitEase(specs: { body: TubeSpec[] }, m: Measurements): EaseRow[] {
  const rows: EaseRow[] = []
  const push = (label: string, garmentR: number, bodyR: number): void => {
    // Round the girths first so garmentCm − bodyCm === easeCm exactly (the shown
    // numbers add up).
    const g = round1(circ(garmentR))
    const b = round1(circ(bodyR))
    rows.push({ label, bodyCm: b, garmentCm: g, easeCm: round1(g - b) })
  }
  for (const s of specs.body) {
    if (s.neckline != null && covers(s, m.chestY)) push('Chest', s.radiusTop, m.chestR)
    // Waist only where drafted: a cinch radius, or a waist-anchored waistband (top ring).
    const waistR = s.radiusWaist ?? (s.neckline == null ? s.radiusTop : null)
    if (waistR != null && covers(s, m.waistY)) push('Waist', waistR, m.waistR)
  }
  return rows
}
