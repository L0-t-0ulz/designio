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
