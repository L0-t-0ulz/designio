import { describe, it, expect } from 'vitest'
import { sizeRunPlan } from '../src/renderer/studio/sizeRunStrip'
import { SIZES } from '../src/renderer/studio/document'

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
})
