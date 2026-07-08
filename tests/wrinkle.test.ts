import { describe, it, expect } from 'vitest'
import { wrinkleAmount } from '../src/renderer/fabric/wrinkle'

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
