/**
 * How a garment ring sits on the mannequin. The cloth solver keeps every particle
 * `bodySkin` (0.011 m) off the body; a ring drafted tighter than that is shoved
 * outward and buckles into a fold. Relaxed garments therefore clear the *visible*
 * surface (bust/pecs included) by at least `FIT_CLEARANCE`. Compression (negative
 * ease) is left alone — those pieces are meant to stretch over the body.
 */

/** Just outside the solver's body skin, so a fitted waist isn't spawned inside it. */
export const FIT_CLEARANCE = 0.012

/** Ease that still clears the body. Negative ease (compression) is unchanged. */
export function clearedEase(ease: number, clearance = FIT_CLEARANCE): number {
  if (ease < 0) return ease
  return Math.max(ease, clearance)
}

/**
 * How far the bust or pecs stick out from the body axis. Mirrors the metaball
 * layout in `Mannequin.buildShape`: a ball of radius `k * chestR` whose centre
 * sits off-axis. `chestR` is the measurement *after* the bust slider; `bust` is
 * the slider again, because the ball radius multiplies it a second time.
 * Pure.
 */
export function chestSurfaceR(chestR: number, bodyType: 'female' | 'male', bust = 1): number {
  if (bodyType === 'female') {
    // centre (0.5, 0.52) * chestR, radius 0.5 * chestR * bust
    return chestR * Math.hypot(0.5, 0.52) + chestR * 0.5 * bust
  }
  return chestR * Math.hypot(0.62, 0.26) + chestR * 0.46 * bust
}

export interface FitStop {
  t: number
  r: number
}

/**
 * A radius stop at height `y` on a tube from `topY` to `bottomY`, or null when
 * that height isn't strictly inside the span (the end radii own the edges).
 */
export function stopAt(topY: number, bottomY: number, y: number, r: number): FitStop | null {
  const span = topY - bottomY
  if (span <= 1e-4) return null
  const t = (topY - y) / span
  if (t <= 0.03 || t >= 0.97) return null
  return { t, r }
}
