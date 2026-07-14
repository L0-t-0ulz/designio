import { describe, it, expect } from 'vitest'
import { brimProfile, DEFAULT_BRIM } from '../src/renderer/avatar/brim'

describe('the parametric brim designer', () => {
  it('width widens the lip monotonically, per kind', () => {
    for (const kind of ['bucket', 'sunhat'] as const) {
      let prev = 0
      for (const w of [0.4, 0.8, 1.2, 1.6, 2.2]) {
        const p = brimProfile(kind, { ...DEFAULT_BRIM, width: w })!
        expect(p.botR).toBeGreaterThan(prev)
        expect(p.botR).toBeGreaterThan(p.topR)
        prev = p.botR
      }
    }
  })

  it('the sun hat spreads far wider than the bucket at the same width', () => {
    const sun = brimProfile('sunhat', DEFAULT_BRIM)!
    const bucket = brimProfile('bucket', DEFAULT_BRIM)!
    expect(sun.botR - sun.topR).toBeGreaterThan((bucket.botR - bucket.topR) * 2)
  })

  it('droop flips: negative runs the cone upward; magnitude sets the height', () => {
    const down = brimProfile('bucket', { ...DEFAULT_BRIM, droop: 0.8 })!
    const up = brimProfile('bucket', { ...DEFAULT_BRIM, droop: -0.8 })!
    const flat = brimProfile('bucket', { ...DEFAULT_BRIM, droop: 0 })!
    expect(down.up).toBe(false)
    expect(up.up).toBe(true)
    expect(down.h).toBeCloseTo(up.h, 10)
    expect(flat.h).toBeLessThan(down.h)
  })

  it('clamps out-of-range inputs and returns null for unbrimmed kinds', () => {
    const wide = brimProfile('sunhat', { ...DEFAULT_BRIM, width: 99 })!
    expect(wide.botR).toBeCloseTo(brimProfile('sunhat', { ...DEFAULT_BRIM, width: 2.2 })!.botR, 10)
    expect(brimProfile('beanie', DEFAULT_BRIM)).toBeNull()
  })
})

it('a wider brim droops deeper at the same droop (height scales with the run)', () => {
  const { brimProfile: bp, DEFAULT_BRIM: d } = { brimProfile, DEFAULT_BRIM }
  const narrow = bp('sunhat', { ...d, width: 0.6, droop: 0.8 })!
  const wide = bp('sunhat', { ...d, width: 2.0, droop: 0.8 })!
  expect(wide.h).toBeGreaterThan(narrow.h * 2)
})
