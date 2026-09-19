import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { distanceCm, midpoint, formatCm, MeasureStore ,
  SNAP_RADIUS_M,
  nearestPoint,
  snapPoint
} from '../src/renderer/studio/measure'

const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z)

describe('measure & annotate tool', () => {
  it('distanceCm converts metres → cm', () => {
    expect(distanceCm(v(0, 0, 0), v(0, 0.42, 0))).toBeCloseTo(42, 6)
    expect(distanceCm(v(0, 0, 0), v(0.3, 0.4, 0))).toBeCloseTo(50, 6) // 3-4-5 → 0.5 m
    expect(distanceCm(v(1, 1, 1), v(1, 1, 1))).toBe(0)
  })

  it('midpoint is the average of the endpoints (fresh vector, no alias)', () => {
    const a = v(0, 0, 0)
    const m = midpoint(a, v(2, 4, 6))
    expect([m.x, m.y, m.z]).toEqual([1, 2, 3])
    m.x = 99
    expect(a.x).toBe(0)
  })

  it('formats a reading with one decimal + unit', () => {
    expect(formatCm(42.04)).toBe('42.0 cm')
    expect(formatCm(0)).toBe('0.0 cm')
  })

  it('the store adds / removes-last / clears measurements + annotations', () => {
    const s = new MeasureStore()
    expect(s.isEmpty).toBe(true)
    s.addMeasurement(v(0, 0, 0), v(0, 1, 0))
    const note = s.addAnnotation(v(0, 1, 0), 'hem')
    expect(s.measurements).toHaveLength(1)
    expect(s.annotations).toHaveLength(1)
    expect(note.text).toBe('hem')

    s.removeLast() // the note was placed last → it is removed first
    expect(s.annotations).toHaveLength(0)
    expect(s.measurements).toHaveLength(1)
    s.clear()
    expect(s.isEmpty).toBe(true)
  })

  it('removeLast picks the numerically-latest item past 9 placements (not string order)', () => {
    const s = new MeasureStore()
    for (let i = 0; i < 10; i++) s.addMeasurement(v(0, 0, 0), v(0, 1, 0)) // ids m…10, 11 (two-digit)
    const note = s.addAnnotation(v(0, 0, 0), 'last') // placed last → highest id
    s.removeLast()
    expect(s.annotations).toHaveLength(0) // the note (latest) is removed, not an earlier measurement
    expect(note.text).toBe('last')
    expect(s.measurements).toHaveLength(10)
  })

  it('stored points are clones (mutating the source never changes the reading)', () => {
    const s = new MeasureStore()
    const a = v(0, 0, 0)
    s.addMeasurement(a, v(0, 1, 0))
    a.set(9, 9, 9)
    expect(s.measurements[0].a.x).toBe(0)
  })
})

describe('measurement snapping', () => {
  const v = (x: number, y = 0, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z)

  it('takes the nearest candidate inside the radius', () => {
    expect(nearestPoint(v(0.002), [v(0), v(0.05)])!.x).toBeCloseTo(0)
  })

  it('leaves a point alone when nothing is close enough', () => {
    // a click in the middle of a panel must stay exactly where it was put
    expect(nearestPoint(v(0.5), [v(0), v(1)])).toBeNull()
    expect(snapPoint(v(0.5), [v(0), v(1)]).x).toBeCloseTo(0.5)
  })

  it('snaps exactly onto the vertex, so two readings of one corner agree', () => {
    const corner = v(0.1234, 0.5678, 0.9012)
    const first = snapPoint(v(0.1236, 0.5679, 0.9011), [corner])
    const second = snapPoint(v(0.1232, 0.5677, 0.9013), [corner])
    expect(first.equals(second)).toBe(true)
    expect(distanceCm(first, second)).toBe(0)
  })

  it('respects the radius boundary', () => {
    expect(nearestPoint(v(SNAP_RADIUS_M), [v(0)])).not.toBeNull() // exactly on it still snaps
    expect(nearestPoint(v(SNAP_RADIUS_M * 1.01), [v(0)])).toBeNull()
  })

  it('honours a caller-supplied radius', () => {
    expect(nearestPoint(v(0.5), [v(0)], 1)).not.toBeNull()
    expect(nearestPoint(v(0.5), [v(0)], 0.1)).toBeNull()
  })

  it('never snaps when the radius is zero or negative', () => {
    for (const r of [0, -1]) expect(nearestPoint(v(0), [v(0)], r)).toBeNull()
    expect(snapPoint(v(0.5), [v(0.5)], 0).x).toBeCloseTo(0.5)
  })

  it('copes with no candidates at all', () => {
    expect(nearestPoint(v(1), [])).toBeNull()
    expect(snapPoint(v(1), []).x).toBeCloseTo(1)
  })

  it('breaks ties deterministically, taking the earlier candidate', () => {
    const a = v(0, 0.001)
    const b = v(0, -0.001)
    expect(nearestPoint(v(0), [a, b])!.y).toBeCloseTo(0.001)
    expect(nearestPoint(v(0), [a, b])!.equals(nearestPoint(v(0), [a, b])!)).toBe(true)
  })

  it('returns a copy, so the mesh geometry cannot be mutated through the result', () => {
    const corner = v(1, 2, 3)
    const snapped = snapPoint(v(1.001, 2, 3), [corner])
    snapped.set(9, 9, 9)
    expect(corner.x).toBe(1)
  })
})
