import { describe, it, expect } from 'vitest'
import {
  SYMMETRY_TOLERANCE_MM,
  distanceToBoundary,
  pointToSegment,
  polygonArea,
  polygonCentroid,
  shoelace2A,
  symmetryDeviation,
  symmetrySummary,
  symmetryVerdict
} from '../src/renderer/export/symmetry'

const P = (x: number, y: number) => ({ x, y })
const rect = (w: number, h: number, ox = 0, oy = 0) => [P(ox, oy), P(ox + w, oy), P(ox + w, oy + h), P(ox, oy + h)]

describe('polygon area', () => {
  it('matches the analytic area of a rectangle', () => {
    expect(polygonArea(rect(40, 25))).toBeCloseTo(1000, 10)
  })

  it('matches the analytic area of a triangle', () => {
    expect(polygonArea([P(0, 0), P(10, 0), P(0, 6)])).toBeCloseTo(30, 10)
  })

  it('is unsigned — winding order does not change the area', () => {
    const cw = rect(4, 3)
    const ccw = [...cw].reverse()
    expect(shoelace2A(cw)).toBeCloseTo(-shoelace2A(ccw), 10)
    expect(polygonArea(cw)).toBeCloseTo(polygonArea(ccw), 10)
  })

  it('is zero for a degenerate outline', () => {
    expect(polygonArea([P(0, 0), P(5, 5), P(10, 10)])).toBeCloseTo(0, 10) // collinear
  })
})

describe('area centroid', () => {
  it('is the centre of a rectangle', () => {
    const c = polygonCentroid(rect(40, 20, 5, 7))
    expect(c.x).toBeCloseTo(25, 10)
    expect(c.y).toBeCloseTo(17, 10)
  })

  it('is at one third height for a triangle, as the analytic result says', () => {
    const c = polygonCentroid([P(0, 0), P(9, 0), P(0, 12)])
    expect(c.x).toBeCloseTo(3, 10)
    expect(c.y).toBeCloseTo(4, 10)
  })

  it('is NOT the vertex mean — that is biased by where the outline is sampled', () => {
    // a square with extra points crowded along one edge: the vertex mean drifts
    // toward that edge, the area centroid does not
    // extra points crowded on the RIGHT of the bottom edge only; the shape is still
    // the same square, so the area centroid must stay at x = 5
    const crowded = [P(0, 0), P(7, 0), P(8, 0), P(9, 0), P(10, 0), P(10, 10), P(0, 10)]
    const vertexMean = crowded.reduce((a, p) => ({ x: a.x + p.x / crowded.length, y: a.y + p.y / crowded.length }), { x: 0, y: 0 })
    const c = polygonCentroid(crowded)
    expect(c.x).toBeCloseTo(5, 6) // still on the true axis of symmetry
    expect(Math.abs(vertexMean.x - 5)).toBeGreaterThan(0.5) // the naive version is not
  })

  it('lies on the axis of symmetry — the property the check relies on', () => {
    // for any symmetric polygon, centroid.x must equal the mirror axis
    const symmetric = [P(-6, 0), P(6, 0), P(4, 10), P(0, 14), P(-4, 10)]
    expect(polygonCentroid(symmetric).x).toBeCloseTo(0, 10)
  })

  it('is invariant to translation', () => {
    const a = polygonCentroid(rect(8, 4))
    const b = polygonCentroid(rect(8, 4, 100, -50))
    expect(b.x - a.x).toBeCloseTo(100, 10)
    expect(b.y - a.y).toBeCloseTo(-50, 10)
  })

  it('falls back sensibly for a zero-area outline', () => {
    const c = polygonCentroid([P(0, 0), P(10, 0), P(20, 0)])
    expect(Number.isFinite(c.x)).toBe(true)
    expect(c.x).toBeCloseTo(10, 10)
  })

  it('handles an empty polygon', () => {
    expect(polygonCentroid([])).toEqual({ x: 0, y: 0 })
  })
})

describe('point to segment', () => {
  it('is the perpendicular distance when the foot falls inside', () => {
    expect(pointToSegment(P(5, 3), P(0, 0), P(10, 0))).toBeCloseTo(3, 10)
  })

  it('clamps to the endpoints when it does not', () => {
    expect(pointToSegment(P(-4, 3), P(0, 0), P(10, 0))).toBeCloseTo(5, 10) // 3-4-5
    expect(pointToSegment(P(14, 3), P(0, 0), P(10, 0))).toBeCloseTo(5, 10)
  })

  it('treats a zero-length edge as its endpoint', () => {
    expect(pointToSegment(P(3, 4), P(0, 0), P(0, 0))).toBeCloseTo(5, 10)
  })

  it('is zero on the segment', () => {
    expect(pointToSegment(P(7, 0), P(0, 0), P(10, 0))).toBeCloseTo(0, 10)
  })
})

describe('distance to boundary', () => {
  it('measures to the nearest edge, not the nearest vertex', () => {
    // the point is closest to the middle of the bottom edge; the nearest vertex is
    // further away, so a vertex-based check would over-report
    expect(distanceToBoundary(P(5, 2), rect(10, 10))).toBeCloseTo(2, 10)
  })

  it('is zero on the boundary', () => {
    expect(distanceToBoundary(P(0, 5), rect(10, 10))).toBeCloseTo(0, 10)
  })
})

describe('symmetry', () => {
  it('reports zero for a rectangle', () => {
    expect(symmetryDeviation(rect(40, 20)).maxDeviation).toBeCloseTo(0, 9)
  })

  it('reports zero for a symmetric bodice-like outline', () => {
    const bodice = [P(-100, 0), P(100, 0), P(90, 200), P(40, 260), P(0, 280), P(-40, 260), P(-90, 200)]
    expect(symmetryDeviation(bodice).maxDeviation).toBeCloseTo(0, 6)
  })

  it('finds the axis itself — no need to be told where the centre is', () => {
    const offset = rect(40, 20, 137, -80)
    expect(symmetryDeviation(offset).axisX).toBeCloseTo(157, 9)
    expect(symmetryDeviation(offset).maxDeviation).toBeCloseTo(0, 9)
  })

  it('is unaffected by uneven sampling along a symmetric curve', () => {
    // one side digitised with more points than the other: still symmetric
    const uneven = [P(-10, 0), P(10, 0), P(10, 10), P(5, 14), P(0, 15), P(-5, 14), P(-7.5, 12.5), P(-10, 10)]
    expect(symmetryDeviation(uneven).maxDeviation).toBeLessThan(0.6)
  })

  it('measures a known asymmetry', () => {
    // right edge pushed out 3 mm; mirroring puts the left vertices 3 mm outside
    const skew = [P(0, 0), P(13, 0), P(13, 10), P(0, 10)]
    const r = symmetryDeviation(skew, 5) // force the axis to x = 5
    expect(r.maxDeviation).toBeCloseTo(3, 9)
  })

  it('points at the vertex that is worst, so it can be marked', () => {
    const skew = [P(0, 0), P(13, 0), P(13, 10), P(0, 10)]
    expect(symmetryDeviation(skew, 5).worstAt).not.toBeNull()
  })

  it('is invariant to translation', () => {
    const shape = [P(-6, 0), P(6, 0), P(3, 9), P(-5, 9)]
    const moved = shape.map((p) => P(p.x + 500, p.y - 250))
    expect(symmetryDeviation(moved).maxDeviation).toBeCloseTo(symmetryDeviation(shape).maxDeviation, 9)
  })

  it('handles degenerate input without throwing', () => {
    for (const poly of [[], [P(0, 0)], [P(0, 0), P(1, 1)]]) {
      const r = symmetryDeviation(poly)
      expect(r.maxDeviation).toBe(0)
      expect(Number.isFinite(r.axisX)).toBe(true)
    }
  })
})

describe('verdicts', () => {
  it('bands by what a cutter can actually hold', () => {
    expect(symmetryVerdict(0)).toBe('symmetric')
    expect(symmetryVerdict(SYMMETRY_TOLERANCE_MM)).toBe('symmetric')
    expect(symmetryVerdict(1.5)).toBe('slight')
    expect(symmetryVerdict(8)).toBe('asymmetric')
  })

  it('reads out only when there is something to say', () => {
    expect(symmetrySummary({ axisX: 0, maxDeviation: 0.1, meanDeviation: 0, worstAt: null })).toBe('Symmetric about centre')
    expect(symmetrySummary({ axisX: 0, maxDeviation: 9, meanDeviation: 2, worstAt: null })).toContain('9.0 mm')
  })
})
