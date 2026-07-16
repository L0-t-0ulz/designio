import { describe, it, expect } from 'vitest'
import { sizeRunPlan, headwearSizeRunPlan } from '../src/renderer/studio/sizeRunStrip'
import { SIZES } from '../src/renderer/studio/document'
import { HAT_SIZE_RUN } from '../src/renderer/export/headSizing'

describe('size-run strip', () => {
  it('plans the whole run in order with the drafted block marked', () => {
    const plan = sizeRunPlan()
    expect(plan.map((c) => c.size)).toEqual([...SIZES])
    expect(plan[2].label).toBe('M · block')
    expect(plan[0].label).toBe('XS')
    expect(plan[5].label).toBe('XXL')
  })

  it('marks a custom base size instead when given', () => {
    const plan = sizeRunPlan('L')
    expect(plan[3].label).toBe('L · block')
    expect(plan[2].label).toBe('M')
  })

  it('labels the headwear run by head circumference (the hat size run)', () => {
    const plan = headwearSizeRunPlan()
    expect(plan.map((c) => c.size)).toEqual([...SIZES]) // same graded sizes
    // each cell carries its hat-size circumference band
    expect(plan[2].label).toBe(`M · ${HAT_SIZE_RUN[2].minCm}–${HAT_SIZE_RUN[2].maxCm} cm`)
    expect(plan[0].label).toContain('cm')
    // the run climbs in circumference
    expect(HAT_SIZE_RUN[5].minCm).toBeGreaterThan(HAT_SIZE_RUN[0].minCm)
  })
})
