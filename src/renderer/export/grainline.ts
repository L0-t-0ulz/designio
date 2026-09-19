import type { Pt } from './garmentPattern'

/**
 * **Grainline alignment** — does each pattern piece sit on the grain it was drafted
 * for once it has been nested onto the goods?
 *
 * Woven fabric is strongly anisotropic. Warp (along the roll) is the stiffest
 * direction, weft is softer, and 45° to both — the true bias — is by far the
 * stretchiest and drapes quite differently. A piece cut off its intended grain twists
 * on the body, grows at the hem and will not press flat, and none of that shows up
 * until the garment is made.
 *
 * It matters here specifically because the marker nester rotates pieces 90° whenever
 * that packs better. That is free on a plain-weave solid and wrong on anything
 * napped, twilled or directional — so the check exists to say which pieces it moved.
 *
 * Pure geometry + unit-tested.
 */

/** Warp runs along the roll, which is the marker's +Y axis. */
export type GrainAxis = 'warp' | 'weft'

/**
 * Angle of a grainline from the warp direction, folded to **[0°, 90°]**.
 *
 * Folded because a grainline is an **axis, not a vector**: a piece flipped end for
 * end is on exactly the same grain, so 170° is a 10° error, not a 170° one. Measuring
 * the unfolded angle would report a correctly-placed-but-inverted piece as maximally
 * wrong.
 *
 * Returns 0 for a degenerate grainline — a zero-length mark carries no direction, and
 * inventing a large deviation from nothing would raise a false alarm.
 */
export function grainDeviationDeg(from: Pt, to: Pt, rotationDeg = 0): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 0 && dy === 0) return 0
  // atan2(x, y) measures from +Y, which is the warp direction
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI + rotationDeg
  const folded = ((deg % 180) + 180) % 180 // [0, 180): the axis, not the vector
  return folded > 90 ? 180 - folded : folded
}

export type GrainVerdict = 'on-grain' | 'off-grain' | 'bias' | 'cross-grain'

/** Tolerance a cutting room works to. Beyond ~2° a long panel visibly twists. */
export const GRAIN_TOLERANCE_DEG = 2

/**
 * Classify a deviation.
 *
 * Three of the four outcomes are *fine*: on-grain is the default, **cross-grain**
 * (90°) and **true bias** (45°) are deliberate choices a pattern cutter makes. Only
 * the spaces between them are faults — a piece that is neither on grain, nor square
 * to it, nor on the bias is simply askew.
 */
export function grainVerdict(deviationDeg: number, toleranceDeg = GRAIN_TOLERANCE_DEG): GrainVerdict {
  const d = Math.abs(deviationDeg)
  if (d <= toleranceDeg) return 'on-grain'
  if (Math.abs(d - 90) <= toleranceDeg) return 'cross-grain'
  if (Math.abs(d - 45) <= toleranceDeg) return 'bias'
  return 'off-grain'
}

/** Whether a verdict is a fault rather than a choice. */
export function isGrainFault(v: GrainVerdict): boolean {
  return v === 'off-grain'
}

export interface GrainCheck {
  name: string
  /** Degrees from warp, 0…90. */
  deviationDeg: number
  verdict: GrainVerdict
  /** True when the nester turned this piece rather than the draft asking for it. */
  rotatedByNest: boolean
}

export interface GrainReport {
  checks: GrainCheck[]
  /** Pieces that are neither on grain, square to it, nor on the bias. */
  faults: GrainCheck[]
  /** Pieces the nester turned off their drafted grain. */
  rotatedOffGrain: GrainCheck[]
}

/**
 * Check every placed piece.
 *
 * `rotated` comes from the nester. A 90° turn is reported as `cross-grain` — which is
 * accurate, and is the thing to look at: it is only acceptable if the cloth has no
 * nap, sheen or directional weave.
 */
export function checkGrainlines(
  pieces: readonly { name: string; grain: readonly [Pt, Pt]; rotated?: boolean }[]
): GrainReport {
  const checks: GrainCheck[] = pieces.map((p) => {
    const deviationDeg = grainDeviationDeg(p.grain[0], p.grain[1], p.rotated ? 90 : 0)
    const verdict = grainVerdict(deviationDeg)
    return { name: p.name, deviationDeg, verdict, rotatedByNest: !!p.rotated }
  })
  return {
    checks,
    faults: checks.filter((c) => isGrainFault(c.verdict)),
    rotatedOffGrain: checks.filter((c) => c.rotatedByNest && c.verdict !== 'on-grain')
  }
}

/** A one-line summary for the tech pack / spec sheet. */
export function grainSummary(r: GrainReport): string {
  if (!r.checks.length) return 'No pieces to check'
  if (r.faults.length) {
    return `${r.faults.length} of ${r.checks.length} piece${r.checks.length === 1 ? '' : 's'} off grain — ${r.faults
      .map((f) => `${f.name} ${f.deviationDeg.toFixed(1)}°`)
      .join(', ')}`
  }
  if (r.rotatedOffGrain.length) {
    return `${r.rotatedOffGrain.length} piece${r.rotatedOffGrain.length === 1 ? '' : 's'} turned cross-grain by nesting — check the cloth has no nap`
  }
  return `All ${r.checks.length} pieces on grain`
}
