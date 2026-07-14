import { describe, it, expect } from 'vitest'
import { billCurl, DEFAULT_CAP_BILL, UNDERBILL_CLASSIC } from '../src/renderer/avatar/capBill'

describe('the cap bill designer — pre-curve curl field', () => {
  it('a flat bill has no curl anywhere', () => {
    for (const [x, y] of [[0, 0.5], [0.8, 0.9], [-1, 1]]) expect(billCurl(x, y, 0)).toBe(0)
  })

  it('the curl grows with the pre-curve, the lateral offset, and the forwardness', () => {
    expect(billCurl(0.8, 0.8, 1)).toBeGreaterThan(billCurl(0.8, 0.8, 0.4))
    expect(billCurl(0.9, 0.8, 0.7)).toBeGreaterThan(billCurl(0.4, 0.8, 0.7))
    expect(billCurl(0.8, 0.9, 0.7)).toBeGreaterThan(billCurl(0.8, 0.3, 0.7))
  })

  it('the rear (sewn) edge never curls — the bill stays attached to the crown', () => {
    expect(billCurl(1, 0, 1)).toBe(0)
    expect(billCurl(-1, -0.2, 1)).toBe(0)
  })

  it('symmetric left↔right, clamped, and bounded', () => {
    expect(billCurl(0.6, 0.7, 0.5)).toBeCloseTo(billCurl(-0.6, 0.7, 0.5), 10)
    expect(billCurl(1, 1, 99)).toBeCloseTo(billCurl(1, 1, 1), 10)
    expect(billCurl(1, 1, 1)).toBeLessThanOrEqual(0.38)
    expect(billCurl(0.5, 0.5, 0.5)).toBeGreaterThan(0)
  })

  it('ships pre-curved with the squatchee on, classic underbill colour defined', () => {
    expect(DEFAULT_CAP_BILL.curve).toBeGreaterThan(0)
    expect(DEFAULT_CAP_BILL.squatchee).toBe(true)
    expect(DEFAULT_CAP_BILL.underbill).toBeUndefined()
    expect(UNDERBILL_CLASSIC).toBeGreaterThan(0)
  })
})
