import type { Pt } from './garmentPattern'

/**
 * **Symmetry check** — is a panel that ought to be symmetric actually symmetric?
 *
 * A front or back bodice cut on the fold must mirror exactly about its centre line.
 * A couple of millimetres of drift there becomes a neckline that sits crooked and a
 * hem that dips on one side, and it is close to invisible on screen at pattern scale.
 *
 * Pure geometry + unit-tested.
 */

/**
 * Twice the signed area of a closed polygon (the shoelace sum).
 *
 * Kept as 2A because both the area and the centroid formulas want it, and halving it
 * twice is a needless place to lose precision.
 */
export function shoelace2A(poly: readonly Pt[]): number {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    s += a.x * b.y - b.x * a.y
  }
  return s
}

/** Unsigned area of a closed polygon. */
export function polygonArea(poly: readonly Pt[]): number {
  return Math.abs(shoelace2A(poly)) / 2
}

/**
 * The **area centroid** of a closed polygon.
 *
 * This is the right axis to test symmetry about, and not by convention: the centroid
 * of a shape with an axis of symmetry provably lies **on** that axis, so no search is
 * needed. The vertex mean would not do — it is biased toward wherever the outline
 * happens to be sampled most densely, which for a pattern panel is the curves.
 *
 * Falls back to the vertex mean only for a degenerate (zero-area) outline, where the
 * centroid formula divides by zero.
 */
export function polygonCentroid(poly: readonly Pt[]): Pt {
  if (!poly.length) return { x: 0, y: 0 }
  const a2 = shoelace2A(poly)
  if (Math.abs(a2) < 1e-12) {
    let sx = 0
    let sy = 0
    for (const p of poly) {
      sx += p.x
      sy += p.y
    }
    return { x: sx / poly.length, y: sy / poly.length }
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const cross = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  }
  return { x: cx / (3 * a2), y: cy / (3 * a2) }
}

/** Distance from a point to a line segment, clamped at both ends. */
export function pointToSegment(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const len2 = vx * vx + vy * vy
  // a degenerate edge is just its endpoint
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2))
  const dx = p.x - (a.x + t * vx)
  const dy = p.y - (a.y + t * vy)
  return Math.hypot(dx, dy)
}

/** Shortest distance from a point to a polygon's boundary. */
export function distanceToBoundary(p: Pt, poly: readonly Pt[]): number {
  if (poly.length === 0) return Infinity
  if (poly.length === 1) return Math.hypot(p.x - poly[0].x, p.y - poly[0].y)
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const d = pointToSegment(p, poly[i], poly[(i + 1) % poly.length])
    if (d < best) best = d
  }
  return best
}

export interface SymmetryResult {
  /** The vertical axis tested, in the panel's own units. */
  axisX: number
  /** Worst mirror-to-boundary distance — what decides whether the panel is wrong. */
  maxDeviation: number
  /** Mean over the sampled vertices, for a sense of whether it is one corner or all of it. */
  meanDeviation: number
  /** The vertex that deviates most, for drawing a marker on it. */
  worstAt: Pt | null
}

/**
 * How far a panel is from being mirror-symmetric about a vertical axis.
 *
 * Each vertex is reflected across the axis and measured to the **boundary** of the
 * original outline — not to the nearest original *vertex*. Vertex-to-vertex would
 * report a false error on any panel whose two sides are sampled differently, which is
 * normal: a curve digitised with 40 points on one side and 38 on the other is still
 * perfectly symmetric.
 *
 * The axis defaults to the area centroid's x.
 */
export function symmetryDeviation(poly: readonly Pt[], axisX?: number): SymmetryResult {
  const axis = axisX ?? polygonCentroid(poly).x
  if (poly.length < 3) return { axisX: axis, maxDeviation: 0, meanDeviation: 0, worstAt: null }
  let max = 0
  let sum = 0
  let worstAt: Pt | null = null
  for (const p of poly) {
    const mirrored = { x: 2 * axis - p.x, y: p.y }
    const d = distanceToBoundary(mirrored, poly)
    sum += d
    if (d > max) {
      max = d
      worstAt = p
    }
  }
  return { axisX: axis, maxDeviation: max, meanDeviation: sum / poly.length, worstAt }
}

/** Tolerance a pattern is cut to. Half a millimetre is below what a cutter can hold. */
export const SYMMETRY_TOLERANCE_MM = 0.5

export type SymmetryVerdict = 'symmetric' | 'slight' | 'asymmetric'

/**
 * Classify a deviation. `slight` is the band worth knowing about but not fixing —
 * digitising noise on a hand-traced curve lives there.
 */
export function symmetryVerdict(maxDeviationMm: number, toleranceMm = SYMMETRY_TOLERANCE_MM): SymmetryVerdict {
  if (maxDeviationMm <= toleranceMm) return 'symmetric'
  if (maxDeviationMm <= toleranceMm * 6) return 'slight'
  return 'asymmetric'
}

/** A readable line for the tech pack. */
export function symmetrySummary(r: SymmetryResult, toleranceMm = SYMMETRY_TOLERANCE_MM): string {
  const v = symmetryVerdict(r.maxDeviation, toleranceMm)
  if (v === 'symmetric') return 'Symmetric about centre'
  return `${v === 'slight' ? 'Slightly off' : 'Asymmetric'} — up to ${r.maxDeviation.toFixed(1)} mm from mirror`
}
