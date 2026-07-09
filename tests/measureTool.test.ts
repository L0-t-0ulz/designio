import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { distanceCm, midpoint, formatCm, MeasureStore } from '../src/renderer/studio/measure'

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
