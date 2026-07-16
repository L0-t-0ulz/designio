import { describe, it, expect } from 'vitest'
import { fashioningPlan, isFullyFashioned, fashioningSummary } from '../src/renderer/garment/fullyFashioned'

describe('fully-fashioned knit shaping', () => {
  it('a tapering panel takes decreases each side; the marks are paired', () => {
    const plan = fashioningPlan(90, 75, 40) // chest 90 → waist 75 over 40 cm
    expect(plan.decreasesPerSide).toBeGreaterThan(0)
    expect(plan.marks).toHaveLength(plan.decreasesPerSide * 2) // one each side per decrease
    expect(plan.marks.filter((m) => m.side === 'left')).toHaveLength(plan.decreasesPerSide)
    expect(plan.marks.every((m) => m.v >= 0 && m.v <= 1)).toBe(true)
    expect(plan.rows).toBe(160) // 40 cm × 4 rows/cm
  })

  it('more taper → more decreases', () => {
    const gentle = fashioningPlan(88, 82, 40)
    const strong = fashioningPlan(96, 70, 40)
    expect(strong.decreasesPerSide).toBeGreaterThan(gentle.decreasesPerSide)
  })

  it('a straight (or widening) panel has no shaping', () => {
    expect(isFullyFashioned(fashioningPlan(80, 80, 40))).toBe(false)
    expect(isFullyFashioned(fashioningPlan(80, 90, 40))).toBe(false) // widening
    expect(fashioningPlan(80, 80, 40).marks).toHaveLength(0)
  })

  it('summarises the shaping', () => {
    expect(fashioningSummary(fashioningPlan(90, 75, 40))).toContain('fully-fashioned')
    expect(fashioningSummary(fashioningPlan(80, 80, 40))).toContain('straight')
  })
})
