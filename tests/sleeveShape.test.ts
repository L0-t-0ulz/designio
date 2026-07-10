import { describe, it, expect } from 'vitest'
import { sleeveShapeSpec } from '../src/renderer/garments/factory'
import { SLEEVE_SHAPES } from '../src/renderer/garment/templates'

// Profiles are multiples of the arm radius (not absolute metres) so they scale to any body.
const shoulderR = 0.045 // upper-arm radius (the cap)
const hemR = 0.035 // forearm radius (the hem)

describe('sleeveShapeSpec (the sleeve library)', () => {
  it('set-in is a plain taper (no profile), sized off the shoulder + hem', () => {
    const s = sleeveShapeSpec('set-in', shoulderR, hemR, false)
    expect(s.profile).toBeUndefined()
    expect(s.radiusStart).toBeCloseTo(shoulderR * 1.35, 5)
    expect(s.radiusEnd).toBeCloseTo(hemR + 0.02, 5)
  })

  it('bell flares out at the cuff (end wider than start; profile grows toward the wrist)', () => {
    const s = sleeveShapeSpec('bell', shoulderR, hemR, false)
    expect(s.radiusEnd).toBeGreaterThan(s.radiusStart)
    expect(s.profile!(1)).toBeGreaterThan(s.profile!(0.3)) // flares late
  })

  it('bishop is full through the middle then gathers into a tight cuff', () => {
    const s = sleeveShapeSpec('bishop', shoulderR, hemR, false)
    expect(s.radiusEnd).toBeLessThan(hemR + 0.02) // gathered cuff, tighter than set-in
    expect(s.profile!(0.5)).toBeGreaterThan(s.profile!(0)) // fuller in the middle
    expect(s.profile!(0.5)).toBeGreaterThan(s.profile!(1))
  })

  it('puff gathers at the shoulder (widest near the top)', () => {
    const s = sleeveShapeSpec('puff', shoulderR, hemR, false)
    expect(s.profile!(0)).toBeGreaterThan(s.profile!(0.6))
  })

  it('dolman is a very wide batwing at the armhole', () => {
    expect(sleeveShapeSpec('dolman', shoulderR, hemR, false).radiusStart).toBeGreaterThan(shoulderR * 3)
  })

  it('every shape stays a sane multiple of the arm (no oversized balloon that the solver blows up)', () => {
    // The old bug: puff's cap was a fixed 0.138 m ≈ 4× the arm → a self-intersecting ring.
    // Every shape's widest point must stay a modest multiple of the shoulder radius.
    for (const shape of SLEEVE_SHAPES) {
      const s = sleeveShapeSpec(shape, shoulderR, hemR, false)
      const widest = Math.max(s.radiusStart, s.radiusEnd, ...(s.profile ? [0, 0.25, 0.5, 0.75, 1].map(s.profile) : []))
      expect(s.radiusStart).toBeGreaterThan(0)
      expect(s.radiusEnd).toBeGreaterThan(0)
      // dolman (batwing) + bell (flared cuff) are wide by design; the arm-hugging shapes stay ≤ ~2.4×.
      const cap = shape === 'dolman' || shape === 'bell' ? 4 : 2.4
      expect(widest, `${shape} is too wide (${(widest / shoulderR).toFixed(2)}× the arm)`).toBeLessThan(shoulderR * cap)
    }
  })
})
