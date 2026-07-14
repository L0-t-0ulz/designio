/**
 * The **cowboy hat** — the western block: a tall cattleman-creased crown over
 * a wide brim whose sides roll UP while the front/back stay level (unlike the
 * uniform-droop parametric brim). Pure unit-head-frame math consumed by the
 * accessory builder.
 */

/** Inner/outer brim radii + crown proportions (unit head frame). */
export const COWBOY = {
  brimInnerR: 0.98,
  brimOuterR: 1.95,
  crownR: 1.05,
  crownYScale: 1.55
}

/**
 * How far the brim lifts (+up) at azimuth `az` (radians from centre-front) at
 * the brim's outer edge: the classic side roll — highest at ±90°, a slight
 * dip front + back so the hat still shades the face. Pure; period π,
 * left↔right symmetric.
 */
export function cowboyBrimLift(az: number): number {
  const s = Math.sin(az)
  return -0.1 + 0.5 * s * s
}
