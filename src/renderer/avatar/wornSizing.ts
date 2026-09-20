/**
 * **Sizing rules for worn hardware** — the numbers a product designer works to,
 * kept apart from the geometry so they can be checked against the real ranges.
 *
 * Everything here is in the units the trade uses (mm for hardware, cm for body
 * girths) and converted at the point of use, because that is how the source
 * specifications are written and rounding them into metres first loses the
 * standard sizes.
 */

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Circumference in cm of a limb of this radius in metres. */
export function circumferenceCm(radiusM: number): number {
  return 2 * Math.PI * radiusM * 100
}

/* ---------------------------------- watch ---------------------------------- */

/**
 * Case diameter steps with the wrist at **2 mm of case per cm of wrist**.
 *
 * Retail fitting guides bracket it: a 14–16 cm wrist takes a 34–38 mm case,
 * 16–18 cm takes 38–42 mm, 18–20 cm takes 42–46 mm. Those brackets are a straight
 * line of that slope, passing through 40 mm at a 17 cm wrist — the men's standard —
 * which fixes the intercept at 6 mm.
 */
export const WATCH_CASE_MM_PER_CM = 2
export const WATCH_CASE_INTERCEPT_MM = 6
/** Cases are not made outside this range, so a very small or large wrist clamps. */
export const WATCH_CASE_MIN_MM = 32
export const WATCH_CASE_MAX_MM = 48

export function watchCaseMm(wristCircumferenceCm: number): number {
  const d = WATCH_CASE_MM_PER_CM * wristCircumferenceCm + WATCH_CASE_INTERCEPT_MM
  return clamp(d, WATCH_CASE_MIN_MM, WATCH_CASE_MAX_MM)
}

/**
 * Case thickness ≈ 0.27 × diameter — a 40 mm three-hander comes in around 11 mm,
 * and the ratio holds across the run because the movement is what sets the depth.
 */
export const WATCH_THICKNESS_RATIO = 0.27
export function watchThicknessMm(caseMm: number): number {
  return caseMm * WATCH_THICKNESS_RATIO
}

/**
 * Lug width — and so strap width — is **half the case diameter**, rounded to the
 * even millimetre straps are actually cut in (a 40 mm case takes a 20 mm strap).
 */
export function watchLugWidthMm(caseMm: number): number {
  return Math.max(2, 2 * Math.round(caseMm / 4))
}

/* --------------------------------- earrings -------------------------------- */

/** A classic ball stud measures 5 mm across the ball. */
export const STUD_BALL_MM = 5
/** Its post is 20-gauge wire — 0.8 mm. */
export const STUD_POST_MM = 0.8
/** A medium hoop is 30 mm outside diameter in 1.5 mm wire. */
export const HOOP_OUTER_MM = 30
export const HOOP_WIRE_MM = 1.5
