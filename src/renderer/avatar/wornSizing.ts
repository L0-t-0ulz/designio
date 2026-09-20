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

/* ------------------------------ limb coverings ----------------------------- */

/**
 * **Sock heights**, in cm measured up from the sole — which is how socks are
 * specified and sold, not as a fraction of anybody's leg.
 */
export const SOCK_HEIGHTS_CM = { 'no-show': 2, ankle: 6, crew: 18, 'knee-high': 38 } as const
export type SockHeight = keyof typeof SOCK_HEIGHTS_CM
export const SOCK_HEIGHTS = Object.keys(SOCK_HEIGHTS_CM) as SockHeight[]

/** The medial malleolus — the ankle bone a sock's ankle cut sits at — is ~7 cm up. */
export const ANKLE_HEIGHT_CM = 7

/**
 * How far a sock's cuff rises **above the ankle**, in metres, for a given height.
 * Negative for the cuts that finish below the ankle bone, which is what makes a
 * no-show sock disappear into the shoe; the caller clamps at the foot.
 */
export function sockRiseM(height: SockHeight): number {
  return (SOCK_HEIGHTS_CM[height] - ANKLE_HEIGHT_CM) / 100
}

/**
 * The shoe **last** — one set of foot dimensions, shared by the shoe and the sock so
 * that the shoe demonstrably fits over the sock rather than through it.
 */
export const FOOT_LAST = { width: 0.095, length: 0.27, instep: 0.058, toe: 0.05 }

/**
 * A sock is cut inside the shoe's last by this fraction. 4 % of a 95 mm foot width is
 * ~2 mm of clearance a side, which is about what a shoe gives a knit sock.
 */
export const SOCK_INSIDE_SHOE = 0.04

/* ---------------------------------- gloves --------------------------------- */

/**
 * Hand dimensions in **forearm-capsule radii**, measured off the rendered avatar
 * with `?probeLimb=1` rather than assumed.
 *
 * The capsule's distal point is the palm, not the fingertips: the hand mesh carries
 * on another 2.08 radii past it. A glove sized to the capsule would leave the
 * fingers bare, which is exactly the mistake the measurement exists to prevent.
 */
export const HAND_REACH_R = 2.08
/** Half-thickness front to back: 14.2 mm measured on a 42 mm capsule radius. */
export const HAND_HALF_THICKNESS_R = 0.34
/**
 * Half-breadth across the knuckles, **with the fingers as the rig splays them**.
 *
 * A real hand is about 2.8× as broad as it is thick, which would put this at 0.95.
 * This rig's hand is broader than that — short fingers, held apart — and measuring
 * the render gives ~11.5 cm across on a 42 mm capsule radius. The textbook ratio is
 * the wrong one to use here because the glove has to cover the hand that is drawn.
 */
export const HAND_HALF_BREADTH_R = 1.35
/**
 * How much bigger than the hand a glove is cut, in capsule radii.
 *
 * More than a knit's own thickness: the rig gives a hand's heading but not its roll
 * about that heading (there is no thumb bone to read it from), so the shell is cut
 * with enough ease to cover the hand whichever way the palm happens to face. A glove
 * IS loose on the hand — this is the honest form for the information available, not
 * a fudge to hide a misalignment.
 */
export const GLOVE_CLEARANCE_R = 0.2
/** The cuff runs 5 cm up the forearm past the wrist. */
export const GLOVE_CUFF_M = 0.05

/* ------------------------------- limb joints ------------------------------- */

/**
 * **Where the joints are on a limb capsule, and how thin the limb gets there** —
 * measured off the rendered avatar with `?probeTaper=1` and `?probeFoot=1`.
 *
 * A capsule carries one radius and it has to *enclose* the limb, so that radius is
 * the forearm's belly or the calf — never the joint. Walking the forearm and
 * measuring its half-thickness front to back gives a clear minimum just before the
 * hand, and fanning rays out of the ankle gives the shank's section there:
 *
 * ```
 * forearm  t0.2 = 0.055   t0.6 = 0.036   t0.95 = 0.022   t1.0 = 0.014 (the hand)
 * shank    calf  = 0.065                 ankle ≈ 0.040
 * ```
 *
 * An earlier version put the joint one radius back from the capsule's distal point.
 * That is a reasonable thing to assume, and the measurement says it is wrong: it
 * lands mid-forearm, and it reports a 12 cm ankle, which is why a sock built on it
 * came out as a bucket.
 *
 * The radius ratios are cross-checked against anthropometry, because a measurement
 * that disagrees with the textbook is usually a bad measurement. A wrist is ~17 cm
 * round against a ~24 cm forearm and an ankle ~22 cm against a ~35 cm calf — 0.7 and
 * 0.63. The numbers below sit in that band. (An earlier pass had the ankle at 0.3,
 * from rays fired at z = 0 that missed the ankle entirely: the foot sits ~3 cm
 * forward, so the section they measured was not the ankle's.)
 */
export const WRIST_AT_T = 0.95
export const ANKLE_AT_T = 0.91
/** Joint radius as a fraction of the capsule's. */
export const WRIST_TO_FOREARM = 0.62
export const ANKLE_TO_CALF = 0.65
