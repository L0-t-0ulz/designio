/**
 * **Per-zone ease map** — how much room the garment has at each body landmark,
 * measured between the cloth that is hanging there and the body it is hanging on.
 *
 * There are already two ease readouts and this is deliberately a third kind:
 *
 * - `export/ease` gives the **drafted** ease, from the pattern's own radii. It is
 *   limited to chest and waist, correctly, because those are the only points a
 *   tube is drafted *to the body*.
 * - `export/drapeFit` gives the **measured girth** of the draped garment, and says
 *   why it does not turn that into an ease: the garment hangs on the live avatar,
 *   whose body may differ from the abstract `Measurements`, so an ease against
 *   that reference would not be consistent.
 *
 * That objection is the design of this module. Instead of differencing two girths
 * from different sources, it measures the **clearance** — the distance from each
 * point of cloth to the body's own collider surface. Both sides then come from the
 * same live avatar, so the number is consistent whatever the body is doing, and it
 * survives an asymmetric body or pose that a girth difference would average away.
 *
 * The **minimum** clearance matters more than the mean, because a garment fails
 * where it is tightest, not on average.
 *
 * Pure + unit-tested.
 */

import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import { closestPointOnSegment } from '../avatar/colliders'

export interface ZoneSpec {
  label: string
  /** Height of the landmark, m. */
  y: number
}

export interface ZoneEase {
  label: string
  /** Mean clearance from the body, cm. Negative = the cloth is inside the body. */
  meanCm: number
  /** The tightest point on the ring, cm — where the garment will fail first. */
  minCm: number
  /** Girth of the cloth at that height, cm. */
  girthCm: number
  /** False when the garment does not reach this landmark. */
  covered: boolean
}

/** Signed distance from a point to a capsule's surface; negative inside. */
const distScratch = new THREE.Vector3()
export function capsuleDistance(p: THREE.Vector3, c: Capsule): number {
  closestPointOnSegment(p, c.a, c.b, distScratch)
  return p.distanceTo(distScratch) - c.radius
}

/** Distance to the nearest of a set of capsules — the body's surface. */
export function bodyDistance(p: THREE.Vector3, body: readonly Capsule[]): number {
  let d = Infinity
  for (const c of body) {
    const v = capsuleDistance(p, c)
    if (v < d) d = v
  }
  return Number.isFinite(d) ? d : 0
}

/**
 * Intersect each column of a garment tube with the plane `y = targetY`.
 *
 * A true horizontal slice, the same construction `drapeFit.ringGirthCm` uses — a
 * topological ring tilts and dips as the garment drapes, so it is not a reading at
 * one height at all. Returns null when too little of the garment reaches there.
 */
export function slice(positions: Float32Array, nx: number, ny: number, targetY: number): THREE.Vector3[] | null {
  if (nx < 3 || ny < 2) return null
  const out: THREE.Vector3[] = []
  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny - 1; iy++) {
      const kA = (iy * nx + ix) * 3
      const kB = ((iy + 1) * nx + ix) * 3
      const yA = positions[kA + 1]
      const yB = positions[kB + 1]
      if ((yA >= targetY && yB <= targetY) || (yA <= targetY && yB >= targetY)) {
        const t = Math.abs(yB - yA) < 1e-9 ? 0 : (targetY - yA) / (yB - yA)
        out.push(
          new THREE.Vector3(
            positions[kA] + (positions[kB] - positions[kA]) * t,
            targetY,
            positions[kA + 2] + (positions[kB + 2] - positions[kA + 2]) * t
          )
        )
        break
      }
    }
  }
  return out.length >= nx * 0.5 ? out : null
}

/** Perimeter of a closed ring of points, cm. */
export function ringPerimeterCm(ring: readonly THREE.Vector3[]): number {
  if (ring.length < 2) return 0
  let per = 0
  for (let i = 0; i < ring.length; i++) per += ring[i].distanceTo(ring[(i + 1) % ring.length])
  return per * 100
}

const r1 = (v: number): number => Math.round(v * 10) / 10

/**
 * The ease map: one row per zone, measured against the live body.
 *
 * Uncovered zones are reported rather than dropped — "this top does not reach your
 * hips" is itself a fit answer, and silently omitting the row reads as a bug.
 */
export function easeMap(
  garment: { positions: Float32Array; nx: number; ny: number },
  body: readonly Capsule[],
  zones: readonly ZoneSpec[]
): ZoneEase[] {
  return zones.map((z) => {
    const ring = slice(garment.positions, garment.nx, garment.ny, z.y)
    if (!ring) return { label: z.label, meanCm: 0, minCm: 0, girthCm: 0, covered: false }
    let sum = 0
    let min = Infinity
    for (const p of ring) {
      const d = bodyDistance(p, body)
      sum += d
      if (d < min) min = d
    }
    return {
      label: z.label,
      meanCm: r1((sum / ring.length) * 100),
      minCm: r1(min * 100),
      girthCm: r1(ringPerimeterCm(ring)),
      covered: true
    }
  })
}

/**
 * The body's outer radius at height `y` — how far the body reaches from its own
 * vertical axis there.
 *
 * What a hem collapses onto, and it is not "the radius of whatever capsule
 * contains the centre line": at knee height nothing does, because the legs are
 * out on either side. So it is the furthest any capsule crossing that height
 * reaches, which is the silhouette the cloth actually falls against.
 */
export function bodyRadiusAt(body: readonly Capsule[], y: number): number {
  let best = 0
  for (const c of body) {
    const lo = Math.min(c.a.y, c.b.y) - c.radius
    const hi = Math.max(c.a.y, c.b.y) + c.radius
    if (y < lo || y > hi) continue
    // where this capsule's axis is at that height (clamped to the segment)
    const span = c.b.y - c.a.y
    const t = Math.abs(span) < 1e-9 ? 0 : Math.min(1, Math.max(0, (y - c.a.y) / span))
    const ax = c.a.x + (c.b.x - c.a.x) * t
    const az = c.a.z + (c.b.z - c.a.z) * t
    best = Math.max(best, Math.hypot(ax, az) + c.radius)
  }
  return best
}

/** How a clearance reads to a fitter. */
export function clearanceVerdict(minCm: number): 'pinching' | 'skimming' | 'easy' | 'loose' {
  if (minCm < 0) return 'pinching'
  if (minCm < 0.6) return 'skimming'
  if (minCm < 3) return 'easy'
  return 'loose'
}

/** The zone that will fail first — the tightest covered one. */
export function tightestZone(rows: readonly ZoneEase[]): ZoneEase | null {
  const covered = rows.filter((r) => r.covered)
  if (!covered.length) return null
  return covered.reduce((a, b) => (b.minCm < a.minCm ? b : a))
}
