/**
 * The **formal blocked-felt pair** — top hat & bowler — as pure
 * unit-head-frame proportions + brim-roll profiles consumed by the accessory
 * builders. The topper is a tall subtly-flared stovepipe over a wide brim
 * whose SIDES curl gently (front/back stay level); the bowler is a hard low
 * dome whose short brim rolls up around the whole perimeter, strongest at
 * the sides.
 */
export type FormalHat = 'tophat' | 'bowler'

export const FORMAL = {
  tophat: {
    crownR: 0.98, // at the band
    flare: 1.08, // the stovepipe widens toward the top
    crownH: 1.7,
    brimInnerR: 0.98,
    brimOuterR: 1.5
  },
  bowler: {
    domeR: 1.02,
    domeYScale: 0.88, // the hard round low dome
    brimInnerR: 0.98,
    brimOuterR: 1.42
  }
} as const

/**
 * Brim lift (+up, unit head radii) at azimuth `az` (radians from
 * centre-front) at the brim's outer edge. Pure; period π; left↔right
 * symmetric.
 */
export function formalBrimLift(kind: FormalHat, az: number): number {
  const s = Math.sin(az)
  if (kind === 'tophat') return 0.16 * s * s // sides curl, front/back level
  return 0.2 + 0.14 * s * s // the bowler's edge rolls up all round
}
