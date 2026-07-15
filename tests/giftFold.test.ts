import { describe, it, expect } from 'vitest'
import { giftFoldLayout } from '../src/renderer/studio/giftFold'

describe('scarf gift-fold layout', () => {
  const L = giftFoldLayout(1000, 1400)

  it('centres a portrait folded body inside the canvas', () => {
    expect(L.body.x).toBeGreaterThan(0)
    expect(L.body.y).toBeGreaterThan(0)
    expect(L.body.x + L.body.w).toBeLessThanOrEqual(1000)
    expect(L.body.y + L.body.h).toBeLessThanOrEqual(1400)
    expect(L.body.h).toBeGreaterThan(L.body.w) // portrait
    // centred horizontally
    expect(L.body.x + L.body.w / 2).toBeCloseTo(500, 3)
  })

  it('turns a right-triangle corner down from the body top-right', () => {
    expect(L.corner).toHaveLength(3)
    const bx2 = L.body.x + L.body.w
    // the pivot is the body's top-right corner
    expect(L.corner[1][0]).toBeCloseTo(bx2, 3)
    expect(L.corner[1][1]).toBeCloseTo(L.body.y, 3)
    // all three points sit within the body's top-right quadrant
    for (const [px, py] of L.corner) {
      expect(px).toBeLessThanOrEqual(bx2 + 1e-6)
      expect(px).toBeGreaterThan(L.body.x + L.body.w / 2)
      expect(py).toBeGreaterThanOrEqual(L.body.y - 1e-6)
      expect(py).toBeLessThan(L.body.y + L.body.h / 2)
    }
  })

  it('wraps a belly band across the lower body, full width', () => {
    expect(L.band.x).toBeCloseTo(L.body.x, 3)
    expect(L.band.w).toBeCloseTo(L.body.w, 3)
    expect(L.band.y).toBeGreaterThan(L.body.y + L.body.h / 2) // lower half
    expect(L.band.y + L.band.h).toBeLessThanOrEqual(L.body.y + L.body.h + 1e-6)
  })

  it('drops the contact shadow just below the body', () => {
    expect(L.shadow.y).toBeGreaterThan(L.body.y + L.body.h * 0.9)
    expect(L.shadow.w).toBeGreaterThan(L.body.w) // spreads wider than the body
  })

  it('stacks fold creases inside the body, in order', () => {
    expect(L.creases.length).toBeGreaterThan(0)
    for (const y of L.creases) {
      expect(y).toBeGreaterThan(L.body.y)
      expect(y).toBeLessThan(L.body.y + L.body.h)
    }
    const sorted = [...L.creases].sort((a, b) => a - b)
    expect(L.creases).toEqual(sorted)
  })

  it('shades the underside corner + band darker than the body face', () => {
    expect(L.shade.body).toBe(1)
    expect(L.shade.corner).toBeLessThan(1)
    expect(L.shade.band).toBeLessThan(L.shade.corner)
  })

  it('scales with the canvas size', () => {
    const big = giftFoldLayout(2000, 2800)
    expect(big.body.w).toBeCloseTo(L.body.w * 2, 3)
    expect(big.body.h).toBeCloseTo(L.body.h * 2, 3)
  })

  it('never produces a degenerate body for a tiny canvas', () => {
    const tiny = giftFoldLayout(10, 10)
    expect(tiny.body.w).toBeGreaterThan(0)
    expect(tiny.body.h).toBeGreaterThan(0)
  })
})
