import { describe, it, expect } from 'vitest'
import { headCircumferenceCm, hatSizeFor, headSizing, HAT_SIZE_RUN } from '../src/renderer/export/headSizing'

describe('headCircumferenceCm', () => {
  it('gives a plausible adult head circumference from the head radius', () => {
    const c = headCircumferenceCm(0.095)
    expect(c).toBeGreaterThan(55)
    expect(c).toBeLessThan(65) // real adult heads are ~54–62 cm
  })
  it('rises with the head radius and never goes negative', () => {
    expect(headCircumferenceCm(0.101)).toBeGreaterThan(headCircumferenceCm(0.095))
    expect(headCircumferenceCm(-1)).toBe(0)
  })
})

describe('hatSizeFor', () => {
  it('maps a circumference to its size band', () => {
    expect(hatSizeFor(55)).toBe('S')
    expect(hatSizeFor(57)).toBe('M')
    expect(hatSizeFor(59)).toBe('L')
    expect(hatSizeFor(61)).toBe('XL')
    expect(hatSizeFor(63)).toBe('XXL')
  })
  it('clamps below the smallest + above the largest band', () => {
    expect(hatSizeFor(40)).toBe('XS')
    expect(hatSizeFor(99)).toBe('XXL')
  })
})

describe('HAT_SIZE_RUN', () => {
  it('is a contiguous, ordered run with no gaps or overlaps', () => {
    for (let i = 1; i < HAT_SIZE_RUN.length; i++) {
      expect(HAT_SIZE_RUN[i].minCm).toBe(HAT_SIZE_RUN[i - 1].maxCm) // seamless bands
      expect(HAT_SIZE_RUN[i].minCm).toBeGreaterThan(HAT_SIZE_RUN[i - 1].minCm) // ascending
    }
  })
})

describe('headSizing', () => {
  it('bundles the circumference, its size + the run consistently', () => {
    const h = headSizing(0.095)
    expect(h.circCm).toBe(headCircumferenceCm(0.095))
    expect(h.size).toBe(hatSizeFor(h.circCm))
    expect(h.run).toBe(HAT_SIZE_RUN)
  })
})
