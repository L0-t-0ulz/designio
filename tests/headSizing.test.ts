import { describe, it, expect } from 'vitest'
import { headCircumferenceCm, hatSizeFor, headSizing, HAT_SIZE_RUN, earClearanceCm, earFitLabel } from '../src/renderer/export/headSizing'

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
    expect(h.earClearanceCm).toBeUndefined() // no ear fit without a coverage drop
  })

  it('reports ear fit when the covering drop is given', () => {
    const shallow = headSizing(0.095, 0.05) // barely drops → clears the ears
    expect(shallow.earClearanceCm).toBeGreaterThan(0)
    expect(shallow.earFit).toContain('clears the ears')
    const deep = headSizing(0.095, 0.2) // comes down well past the ears
    expect(deep.earClearanceCm).toBeLessThan(0)
    expect(deep.earFit).toContain('covers the ears')
  })
})

describe('earClearance', () => {
  it('is positive when the brim sits above the ears, negative when it covers them', () => {
    const R = 0.095
    expect(earClearanceCm(0.02, R)).toBeGreaterThan(0) // a shallow cap clears the ears
    expect(earClearanceCm(0.25, R)).toBeLessThan(0) // a deep beanie covers them
    // deeper coverage → less clearance
    expect(earClearanceCm(0.05, R)).toBeGreaterThan(earClearanceCm(0.15, R))
  })

  it('labels the fit readably around the ear line', () => {
    expect(earFitLabel(2.5)).toContain('clears the ears')
    expect(earFitLabel(-2.5)).toContain('covers the ears')
    expect(earFitLabel(0.1)).toBe('sits at the ears')
  })
})
