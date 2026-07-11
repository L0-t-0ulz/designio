import { describe, it, expect } from 'vitest'
import { wrinkleAmount, cavityFactor } from '../src/renderer/fabric/wrinkle'

describe('strain-driven wrinkle amount', () => {
  it('is zero for flat cloth (no strain)', () => {
    expect(wrinkleAmount(0)).toBe(0)
  })

  it('rises sharply under compression (cloth bunches → creases)', () => {
    expect(wrinkleAmount(-0.05)).toBeGreaterThan(0.3)
    expect(wrinkleAmount(-0.02)).toBeGreaterThan(wrinkleAmount(0))
    expect(wrinkleAmount(-0.1)).toBeGreaterThan(wrinkleAmount(-0.05)) // more compression = more wrinkle
  })

  it('compression wrinkles more than equal tension (folds form when bunching)', () => {
    expect(wrinkleAmount(-0.05)).toBeGreaterThan(wrinkleAmount(0.05))
  })

  it('stays within [0,1] and saturates', () => {
    for (const s of [-2, -0.3, -0.05, 0, 0.05, 0.3, 2]) {
      const w = wrinkleAmount(s)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
    }
    expect(wrinkleAmount(-1)).toBe(1) // heavy compression saturates
  })
})

describe('fold-valley cavity darkening', () => {
  it('is a no-op at zero wrinkle (full brightness)', () => {
    expect(cavityFactor(0)).toBe(1)
  })

  it('darkens more as the cloth bunches (monotonically decreasing)', () => {
    expect(cavityFactor(0.5)).toBeLessThan(cavityFactor(0.2))
    expect(cavityFactor(1)).toBeLessThan(cavityFactor(0.5))
  })

  it('never over-darkens — stays in [1−strength, 1] and clamps out-of-range input', () => {
    const k = 0.4
    for (const s of [-3, -0.1, 0, 0.3, 0.75, 1, 5]) {
      const f = cavityFactor(s, k)
      expect(f).toBeGreaterThanOrEqual(1 - k)
      expect(f).toBeLessThanOrEqual(1)
    }
    expect(cavityFactor(5, k)).toBeCloseTo(1 - k, 10) // saturates, no negative
  })
})
