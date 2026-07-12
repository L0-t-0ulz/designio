import { describe, it, expect } from 'vitest'
import { safeStem, batchRenderPlan, type ColorwayRef } from '../src/renderer/studio/batchRender'

describe('batch render — plan', () => {
  it('sanitizes names into safe file stems (lower-kebab, capped, fallback)', () => {
    expect(safeStem('Midnight Blue!', 'x')).toBe('midnight-blue')
    expect(safeStem('  ///  ', 'look-1')).toBe('look-1') // nothing usable → fallback
    expect(safeStem('A'.repeat(50), 'x').length).toBe(32) // capped
    expect(safeStem('Café_2', 'x')).toBe('caf-2') // non-alnum collapsed, no leading/trailing dash
  })

  it('renders one shot per saved colourway, numbered in order', () => {
    const cw: ColorwayRef[] = [
      { name: 'Ivory', color: 0xffffee },
      { name: 'Forest', color: 0x224422 },
      { name: 'Blush', color: 0xffccdd }
    ]
    const plan = batchRenderPlan(0x334455, cw)
    expect(plan.map((p) => p.filename)).toEqual(['01-ivory.png', '02-forest.png', '03-blush.png'])
    expect(plan.map((p) => p.color)).toEqual([0xffffee, 0x224422, 0xffccdd])
    expect(plan.map((p) => p.label)).toEqual(['Ivory', 'Forest', 'Blush'])
  })

  it('falls back to hue-rotated variants (cell 0 = original) when < 2 colourways', () => {
    const plan = batchRenderPlan(0x8844aa, [], 4)
    expect(plan.length).toBe(4)
    expect(plan[0].color).toBe(0x8844aa) // original colour preserved
    expect(plan[0].filename).toBe('01-original.png')
    // the rotated variants are distinct from the base and from each other
    const colors = plan.map((p) => p.color)
    expect(new Set(colors).size).toBe(4)
  })

  it('de-duplicates colliding filenames so nothing overwrites in the zip', () => {
    const cw: ColorwayRef[] = [
      { name: 'Red', color: 1 },
      { name: 'Red', color: 2 },
      { name: 'Red', color: 3 }
    ]
    const names = batchRenderPlan(0, cw).map((p) => p.filename)
    expect(new Set(names).size).toBe(3) // all unique
    expect(names).toEqual(['01-red.png', '02-red-2.png', '03-red-3.png'])
  })
})
