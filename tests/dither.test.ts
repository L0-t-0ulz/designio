import { describe, it, expect } from 'vitest'
import { bayerDither } from '../src/renderer/fabric/dither'

describe('bayerDither (ordered-dither offset)', () => {
  it('stays in the sub-LSB band [-0.5, 0.5)', () => {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const d = bayerDither(x, y)
        expect(d).toBeGreaterThanOrEqual(-0.5)
        expect(d).toBeLessThan(0.5)
      }
    }
  })

  it('has mean exactly 0 over one 8×8 tile (no tone shift)', () => {
    let sum = 0
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) sum += bayerDither(x, y)
    expect(sum).toBeCloseTo(0, 10)
  })

  it('uses all 64 distinct offsets (a full Bayer matrix, no collisions)', () => {
    const seen = new Set<number>()
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) seen.add(bayerDither(x, y))
    expect(seen.size).toBe(64)
  })

  it('is deterministic and tiles with period 8', () => {
    for (const [x, y] of [[0, 0], [3, 5], [7, 2]] as const) {
      expect(bayerDither(x, y)).toBe(bayerDither(x, y)) // deterministic
      expect(bayerDither(x + 8, y + 8)).toBe(bayerDither(x, y)) // tiles
      expect(bayerDither(x + 16, y)).toBe(bayerDither(x, y))
    }
  })
})
