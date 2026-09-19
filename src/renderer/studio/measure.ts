import * as THREE from 'three'

/**
 * The **measure & annotate** tool's pure core — distance math + a small store for
 * the placed measurements / annotations. World units are metres, so distances
 * convert to cm. Kept DOM-free so it's unit-tested; `MeasureTool` renders it.
 */

/** Distance between two world points in cm (world units are metres). */
export function distanceCm(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b) * 100
}

/** The midpoint of two world points (label anchor). */
export function midpoint(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
  return a.clone().add(b).multiplyScalar(0.5)
}

/** A tape-measure reading label, e.g. "42.0 cm". */
export function formatCm(cm: number): string {
  return `${cm.toFixed(1)} cm`
}

/**
 * How close a vertex has to be to the raw hit, in metres, before snapping takes it.
 * Roughly a centimetre — tight enough that a point in the middle of a panel is left
 * where it was put, loose enough to catch the corner you were aiming at.
 */
export const SNAP_RADIUS_M = 0.01

/**
 * The nearest candidate to `p` within `maxDist`, or null if none is close enough.
 *
 * This is what makes a measurement reproducible: clicking "the same" hem corner twice
 * lands on the same vertex both times instead of two points a pixel apart, so the two
 * readings agree. Ties go to the earlier candidate so the result is deterministic.
 */
export function nearestPoint(p: THREE.Vector3, candidates: THREE.Vector3[], maxDist = SNAP_RADIUS_M): THREE.Vector3 | null {
  if (!(maxDist > 0)) return null
  let best: THREE.Vector3 | null = null
  let bestDist = Infinity
  for (const c of candidates) {
    const d = p.distanceTo(c)
    if (d < bestDist && d <= maxDist) {
      best = c
      bestDist = d
    }
  }
  return best ? best.clone() : null
}

/** `p` snapped to the nearest candidate within range, or `p` itself when none is. */
export function snapPoint(p: THREE.Vector3, candidates: THREE.Vector3[], maxDist = SNAP_RADIUS_M): THREE.Vector3 {
  return nearestPoint(p, candidates, maxDist) ?? p.clone()
}

export interface Measurement {
  id: string
  a: THREE.Vector3
  b: THREE.Vector3
}

export interface Annotation {
  id: string
  point: THREE.Vector3
  text: string
}

let seq = 0
const nextId = (): string => `m${++seq}`
const idOrder = (id: string): number => parseInt(id.slice(1), 10) || 0

/** In-memory store of the placed measurements + annotations (add / remove / clear). */
export class MeasureStore {
  readonly measurements: Measurement[] = []
  readonly annotations: Annotation[] = []

  addMeasurement(a: THREE.Vector3, b: THREE.Vector3): Measurement {
    const m: Measurement = { id: nextId(), a: a.clone(), b: b.clone() }
    this.measurements.push(m)
    return m
  }

  addAnnotation(point: THREE.Vector3, text: string): Annotation {
    const n: Annotation = { id: nextId(), point: point.clone(), text }
    this.annotations.push(n)
    return n
  }

  /** Remove the most recently placed item (undo the last measure/annotation). */
  removeLast(): void {
    const la = this.annotations[this.annotations.length - 1]
    const lm = this.measurements[this.measurements.length - 1]
    if (la && (!lm || idOrder(la.id) > idOrder(lm.id))) this.annotations.pop()
    else if (lm) this.measurements.pop()
  }

  clear(): void {
    this.measurements.length = 0
    this.annotations.length = 0
  }

  get isEmpty(): boolean {
    return this.measurements.length === 0 && this.annotations.length === 0
  }
}
