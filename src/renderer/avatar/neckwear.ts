/**
 * **Neckwear and braces geometry** — a necktie, a bow tie and a pair of suspenders,
 * as the pure path and profile maths they are made of.
 *
 * All three are strips that have to lie **on the body**, following it from the neck
 * down the chest to the waist, or over the shoulder and down the back. A straight
 * line between two anchors cuts through the chest; a curve through the body's own
 * landmarks does not. That curve is the whole problem, so it lives here where it
 * can be tested, and the meshing stays in `accessories.ts`.
 *
 * Sizes are in millimetres, the units neckwear is actually sold in.
 */

/* ---------------------------------- sizes ---------------------------------- */

/** A standard modern necktie blade: 8 cm at the widest, on a 145 cm strip. */
export const TIE_BLADE_MM = 80
export const TIE_LENGTH_MM = 1450
/** The neck band behind the knot, and the knot itself (a four-in-hand). */
export const TIE_BAND_MM = 34
export const TIE_KNOT_W_MM = 45
export const TIE_KNOT_H_MM = 55

/** A butterfly bow tie: 6.5 cm across each wing, 5.5 cm tall. */
export const BOW_WING_MM = 65
export const BOW_HEIGHT_MM = 55
export const BOW_KNOT_MM = 18

/** Braces are sold by width; 35 mm is the classic, 25 mm the slim. */
export const BRACE_WIDTH_MM = 35
/** How far either side of centre-front the front straps clip to the waistband. */
export const BRACE_FRONT_SPREAD_MM = 90

/**
 * The torso's **front** surface, as a fraction of the torso capsule's radius.
 *
 * The capsule has to enclose the torso, so its radius is the half-breadth — and a
 * torso is far shallower than it is wide. Measured on the rendered avatar with
 * `?probeFoot=1`, the front surface is 13.5 cm out at the chest and 12.2 cm at the
 * waist against a 15 cm capsule. Pushing a strap out by the full radius floats it
 * a couple of centimetres in front of the body, which reads as exactly what it is.
 */
export const CHEST_FRONT_OF_R = 0.9
export const WAIST_FRONT_OF_R = 0.81

/**
 * How far off the body neckwear sits, in metres.
 *
 * A tie, a bow tie and a pair of braces are all worn **over a shirt**, so they clear
 * the body by a shirt's thickness. Placed on the body's own surface a tie renders
 * *inside* the shirt and simply is not there; pushed out much further it floats.
 */
export const OVER_SHIRT_M = 0.012

/* ------------------------------ the tie's blade ----------------------------- */

/**
 * Half-width of a necktie at `t` along it, 0 at the knot and 1 at the tip, as a
 * fraction of `TIE_BLADE_MM`.
 *
 * A tie is not a constant-width strip. It leaves the knot at the neck-band width,
 * widens over the first third as the blade opens out, runs at full width through the
 * body of the blade, and then closes to the point over the last eighth. Getting this
 * wrong is what makes a modelled tie read as a ribbon.
 */
export function tieHalfWidth(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  const band = TIE_BAND_MM / TIE_BLADE_MM
  const OPEN = 0.3 // the blade has opened to full width by here
  const POINT = 0.88 // and starts closing to the tip here
  if (u < OPEN) return 0.5 * (band + (1 - band) * (u / OPEN))
  if (u <= POINT) return 0.5
  // the point is a taper to zero, not a rounded end
  return 0.5 * (1 - (u - POINT) / (1 - POINT))
}

/**
 * Where a tie's tip should fall, as a fraction of the way from the neck to the
 * waist.
 *
 * The rule every tailor uses is that the point reaches the **middle of the belt
 * buckle** — so the blade runs the full neck-to-waist distance and a little past,
 * because the waistband sits a touch below the anatomical waist.
 */
export const TIE_TIP_OF_TORSO = 1.06

/* --------------------------------- the path -------------------------------- */

/**
 * A smooth curve through three points, sampled at `t` — Catmull–Rom with the ends
 * duplicated, which is the standard way to run a spline through a short open chain.
 *
 * This is how the strip follows the body: the three points are the neck, chest and
 * waist as the colliders give them, each pushed out to the body's surface, so the
 * curve bows over the chest instead of cutting through it.
 */
export function splineThrough3(p0: number[], p1: number[], p2: number[], t: number): number[] {
  const u = Math.min(1, Math.max(0, t))
  // Catmull-Rom in the middle — the tangent at p1 is (p2 − p0)/2 for both segments,
  // which is what makes the join smooth — with the **chord** as the tangent at each
  // open end rather than the usual halved duplicate. The halved version eases into
  // the ends, so three evenly spaced collinear points come out as a curve that
  // lingers at the neck and rushes at the waist instead of as the straight line
  // they describe.
  const first = u < 0.5
  const s = first ? u * 2 : (u - 0.5) * 2
  const a = first ? p0 : p1
  const b = first ? p1 : p2
  const s2 = s * s
  const s3 = s2 * s
  const h00 = 2 * s3 - 3 * s2 + 1
  const h10 = s3 - 2 * s2 + s
  const h01 = -2 * s3 + 3 * s2
  const h11 = s3 - s2
  const out: number[] = []
  for (let i = 0; i < 3; i++) {
    const m0 = first ? p1[i] - p0[i] : 0.5 * (p2[i] - p0[i])
    const m1 = first ? 0.5 * (p2[i] - p0[i]) : p2[i] - p1[i]
    out.push(h00 * a[i] + h10 * m0 + h01 * b[i] + h11 * m1)
  }
  return out
}

/**
 * How far out from the torso axis the strip sits at `t` (0 = neck, 1 = waist), given
 * the three girth radii it passes.
 *
 * Linear between the landmarks rather than splined: a radius is a measurement and
 * interpolating it should not overshoot into a bulge the body does not have.
 */
export function girthAt(neckR: number, chestR: number, waistR: number, t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return u < 0.5 ? neckR + (chestR - neckR) * (u * 2) : chestR + (waistR - chestR) * ((u - 0.5) * 2)
}
