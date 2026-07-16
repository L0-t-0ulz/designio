import { describe, it, expect } from 'vitest'
import { seamXAt, straightRefAt, seamDeviationAt, warpToSeamline, straightSeam, type SeamSample } from '../src/renderer/pattern/seamWarp'

// a princess seam that bows outward in the middle (a curve, not a straight line)
const curved: SeamSample[] = [
  { v: 0, x: 0.5 },
  { v: 0.5, x: 0.62 },
  { v: 1, x: 0.5 }
]

describe('print warp-to-seamline', () => {
  it('samples the seam x by height (piecewise-linear, clamped past the ends)', () => {
    expect(seamXAt(curved, 0)).toBe(0.5)
    expect(seamXAt(curved, 0.5)).toBeCloseTo(0.62, 6)
    expect(seamXAt(curved, 0.25)).toBeCloseTo(0.56, 6) // halfway up the first segment
    expect(seamXAt(curved, -1)).toBe(0.5) // clamps below
    expect(seamXAt(curved, 2)).toBe(0.5) // clamps above
  })

  it('deviation is the bulge from a straight endpoint-to-endpoint line', () => {
    expect(straightRefAt(curved, 0.5)).toBeCloseTo(0.5, 6) // straight line stays at 0.5
    expect(seamDeviationAt(curved, 0.5)).toBeCloseTo(0.12, 6) // the mid bows out 0.12
    expect(seamDeviationAt(curved, 0)).toBeCloseTo(0, 6) // no deviation at the ends
  })

  it('warps a print to ride the seam curve, scaled by strength', () => {
    // a print at the mid-height rides the bulge
    expect(warpToSeamline(0.4, 0.5, curved)).toBeCloseTo(0.52, 6) // 0.4 + 0.12
    expect(warpToSeamline(0.4, 0.5, curved, 0.5)).toBeCloseTo(0.46, 6) // half strength
    expect(warpToSeamline(0.4, 0.0, curved)).toBeCloseTo(0.4, 6) // no shift at the end
  })

  it('a straight seam is a no-op (the print is unchanged)', () => {
    const s = straightSeam(0.5)
    for (const v of [0, 0.3, 0.7, 1]) expect(warpToSeamline(0.33, v, s)).toBeCloseTo(0.33, 6)
  })
})
