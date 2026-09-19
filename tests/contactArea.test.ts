import { describe, it, expect } from 'vitest'
import { contactArea, contactReadout, meshArea, sumContactAreas, triangleArea } from '../src/renderer/studio/contactArea'

/** A unit square in the XY plane, as two triangles. Area = 1. */
const SQUARE_POS = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]
const SQUARE_IDX = [0, 1, 2, 0, 2, 3]

describe('triangle area', () => {
  it('matches the analytic area of a right triangle', () => {
    expect(triangleArea(0, 0, 0, 3, 0, 0, 0, 4, 0)).toBeCloseTo(6, 12) // ½·3·4
  })

  it('matches an equilateral triangle: √3/4 · s²', () => {
    const s = 2
    expect(triangleArea(0, 0, 0, s, 0, 0, s / 2, (s * Math.sqrt(3)) / 2, 0)).toBeCloseTo((Math.sqrt(3) / 4) * s * s, 12)
  })

  it('is orientation-independent — area is unsigned', () => {
    const fwd = triangleArea(0, 0, 0, 3, 0, 0, 0, 4, 0)
    const rev = triangleArea(0, 0, 0, 0, 4, 0, 3, 0, 0)
    expect(rev).toBeCloseTo(fwd, 12)
  })

  it('is invariant under rigid motion — the same triangle anywhere, any way up', () => {
    const flat = triangleArea(0, 0, 0, 3, 0, 0, 0, 4, 0)
    // rotated into an arbitrary plane and translated far away
    const tilted = triangleArea(10, 10, 10, 10 + 3 / Math.SQRT2, 10, 10 + 3 / Math.SQRT2, 10, 14, 10)
    expect(tilted).toBeCloseTo(flat, 10)
  })

  it('is zero for a degenerate (collinear) triangle', () => {
    expect(triangleArea(0, 0, 0, 1, 1, 1, 2, 2, 2)).toBeCloseTo(0, 12)
    expect(triangleArea(0, 0, 0, 0, 0, 0, 5, 5, 5)).toBeCloseTo(0, 12)
  })

  it('handles slivers without losing precision the way Heron’s formula would', () => {
    // a very thin triangle: base 1, height 1e-8 → area 5e-9
    expect(triangleArea(0, 0, 0, 1, 0, 0, 0.5, 1e-8, 0)).toBeCloseTo(5e-9, 18)
  })
})

describe('mesh area', () => {
  it('sums to the analytic area of a unit square', () => {
    expect(meshArea(SQUARE_POS, SQUARE_IDX)).toBeCloseTo(1, 12)
  })

  it('scales with the square of a linear scale factor', () => {
    const big = SQUARE_POS.map((v) => v * 3)
    expect(meshArea(big, SQUARE_IDX)).toBeCloseTo(9, 12)
  })

  it('is zero for an empty mesh', () => {
    expect(meshArea([], [])).toBe(0)
  })

  it('ignores a trailing partial triangle', () => {
    expect(meshArea(SQUARE_POS, [0, 1, 2, 0, 2])).toBeCloseTo(0.5, 12)
  })
})

describe('contact area', () => {
  it('is everything when every vertex touches', () => {
    const r = contactArea(SQUARE_POS, SQUARE_IDX, [1, 1, 1, 1])
    expect(r.fraction).toBeCloseTo(1, 12)
    expect(r.contact).toBeCloseTo(1, 12)
  })

  it('is nothing when none does', () => {
    expect(contactArea(SQUARE_POS, SQUARE_IDX, [0, 0, 0, 0]).fraction).toBe(0)
  })

  it('weights a partly-touching triangle by the fraction of its vertices', () => {
    // vertex 1 only: triangle (0,1,2) is 1/3 in contact, triangle (0,2,3) is 0
    const r = contactArea(SQUARE_POS, SQUARE_IDX, [0, 1, 0, 0])
    expect(r.contact).toBeCloseTo(0.5 / 3, 12) // half the square, a third of it
    expect(r.fraction).toBeCloseTo(1 / 6, 12)
  })

  it('weights by AREA, not by vertex count — the whole point', () => {
    // two triangles of very different size, one vertex of each in contact.
    // vertex counting would call this 50/50; by area the big one dominates.
    const pos = [0, 0, 0, 1, 0, 0, 0, 1, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0]
    const idx = [0, 1, 2, 3, 4, 5]
    const small = contactArea(pos, idx, [1, 1, 1, 0, 0, 0]) // all of the small triangle
    const big = contactArea(pos, idx, [0, 0, 0, 1, 1, 1]) // all of the big one
    expect(small.fraction).toBeLessThan(0.02)
    expect(big.fraction).toBeGreaterThan(0.98)
    expect(small.fraction + big.fraction).toBeCloseTo(1, 12)
  })

  it('honours the threshold', () => {
    const contact = [0.5, 0.5, 0.5, 0.5]
    expect(contactArea(SQUARE_POS, SQUARE_IDX, contact, 0.2).fraction).toBeCloseTo(1, 12)
    expect(contactArea(SQUARE_POS, SQUARE_IDX, contact, 0.8).fraction).toBe(0)
  })

  it('never reports more contact than there is surface', () => {
    for (const c of [[1, 1, 1, 1], [1, 0, 1, 0], [9, 9, 9, 9]]) {
      const r = contactArea(SQUARE_POS, SQUARE_IDX, c)
      expect(r.contact).toBeLessThanOrEqual(r.total + 1e-12)
      expect(r.fraction).toBeGreaterThanOrEqual(0)
      expect(r.fraction).toBeLessThanOrEqual(1)
    }
  })

  it('skips degenerate triangles rather than counting them as untouched area', () => {
    // a collapsed triangle has no area, so it must not dilute the fraction
    const pos = [...SQUARE_POS, 5, 5, 5, 5, 5, 5, 5, 5, 5]
    const idx = [...SQUARE_IDX, 4, 5, 6]
    const r = contactArea(pos, idx, [1, 1, 1, 1, 0, 0, 0])
    expect(r.fraction).toBeCloseTo(1, 12)
  })

  it('returns zero, not NaN, for an empty mesh', () => {
    const r = contactArea([], [], [])
    expect(r).toEqual({ contact: 0, total: 0, fraction: 0 })
  })

  it('treats a missing contact value as no contact', () => {
    expect(contactArea(SQUARE_POS, SQUARE_IDX, [1, 1]).fraction).toBeGreaterThan(0)
    expect(Number.isFinite(contactArea(SQUARE_POS, SQUARE_IDX, []).fraction)).toBe(true)
  })
})

describe('combining pieces', () => {
  it('adds areas and recomputes the fraction — fractions do not average', () => {
    // a small piece fully in contact plus a large piece not touching at all is not 50%
    const parts = [
      { contact: 1, total: 1, fraction: 1 },
      { contact: 0, total: 9, fraction: 0 }
    ]
    const s = sumContactAreas(parts)
    expect(s.contact).toBe(1)
    expect(s.total).toBe(10)
    expect(s.fraction).toBeCloseTo(0.1, 12) // not 0.5
  })

  it('handles no pieces', () => {
    expect(sumContactAreas([])).toEqual({ contact: 0, total: 0, fraction: 0 })
  })
})

describe('readout', () => {
  it('reports percent and cm² from metres²', () => {
    // 0.124 m² = 1240 cm²
    expect(contactReadout({ contact: 0.124, total: 0.325, fraction: 0.124 / 0.325 })).toBe('38% in contact · 1,240 cm² of 3,250 cm²')
  })

  it('copes with nothing measured', () => {
    expect(contactReadout({ contact: 0, total: 0, fraction: 0 })).toContain('0%')
  })
})
