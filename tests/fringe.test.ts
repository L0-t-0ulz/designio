import { describe, it, expect } from 'vitest'
import { strandLength } from '../src/renderer/garment/Fringe'
import { getGarment } from '../src/renderer/garments/registry'

describe('fringe trim', () => {
  it('strand lengths are deterministic with a bounded ±20% jitter', () => {
    for (let ix = 0; ix < 60; ix++) {
      const l = strandLength(ix)
      expect(l).toBe(strandLength(ix)) // no RNG — replays identically
      expect(l).toBeGreaterThanOrEqual(0.07 * 0.8)
      expect(l).toBeLessThanOrEqual(0.07 * 1.2)
    }
    // and it actually varies (cut yarn, not a ruler-straight comb)
    const set = new Set(Array.from({ length: 20 }, (_, ix) => strandLength(ix).toFixed(5)))
    expect(set.size).toBeGreaterThan(10)
    expect(strandLength(3, 0.1)).toBeCloseTo((strandLength(3) / 0.07) * 0.1, 10) // scales by base
  })

  it('skirts + dresses offer fringe; tops and trousers do not', () => {
    for (const id of ['skirt', 'maxi-skirt', 'dress', 'gown', 'slip-dress'] as const) {
      expect(getGarment(id).supports.fringe).toBe(true)
    }
    for (const id of ['top', 'pants', 'leggings', 'hoodie'] as const) {
      expect(getGarment(id).supports.fringe).toBeUndefined()
    }
  })
})
