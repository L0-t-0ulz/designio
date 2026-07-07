import { describe, it, expect } from 'vitest'
import { sleeveShapeSpec } from '../src/renderer/garments/factory'
import { SLEEVE_SHAPES } from '../src/renderer/garment/templates'

const armR = 0.045

describe('sleeveShapeSpec (the sleeve library)', () => {
  it('set-in is a plain taper (no profile)', () => {
    const s = sleeveShapeSpec('set-in', armR, false)
    expect(s.profile).toBeUndefined()
    expect(s.radiusStart).toBeCloseTo(0.072, 5)
    expect(s.radiusEnd).toBeCloseTo(armR + 0.02, 5)
  })

  it('bell flares out at the cuff (end wider than start; profile grows toward the wrist)', () => {
    const s = sleeveShapeSpec('bell', armR, false)
    expect(s.radiusEnd).toBeGreaterThan(s.radiusStart)
    expect(s.profile!(1)).toBeGreaterThan(s.profile!(0.3)) // flares late
  })

  it('bishop is full through the middle then gathers into a tight cuff', () => {
    const s = sleeveShapeSpec('bishop', armR, false)
    expect(s.radiusEnd).toBeLessThan(armR + 0.02) // gathered cuff, tighter than set-in
    expect(s.profile!(0.5)).toBeGreaterThan(s.profile!(0)) // fuller in the middle
    expect(s.profile!(0.5)).toBeGreaterThan(s.profile!(1))
  })

  it('puff gathers at the shoulder (widest near the top)', () => {
    const s = sleeveShapeSpec('puff', armR, false)
    expect(s.profile!(0)).toBeGreaterThan(s.profile!(0.6))
  })

  it('dolman is a very wide batwing at the armhole', () => {
    expect(sleeveShapeSpec('dolman', armR, false).radiusStart).toBeGreaterThan(0.13)
  })

  it('every shape returns sane, positive radii', () => {
    for (const shape of SLEEVE_SHAPES) {
      const s = sleeveShapeSpec(shape, armR, false)
      expect(s.radiusStart).toBeGreaterThan(0)
      expect(s.radiusEnd).toBeGreaterThan(0)
      if (s.profile) for (const t of [0, 0.25, 0.5, 0.75, 1]) expect(s.profile(t)).toBeGreaterThan(0)
    }
  })
})
