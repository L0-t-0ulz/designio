import { describe, it, expect } from 'vitest'
import { twoAvatarPlan, twoAvatarCells } from '../src/renderer/studio/twoAvatar'

describe('two-avatar scene', () => {
  it('plans two avatars with body presets (defaults runway + curvy)', () => {
    const plan = twoAvatarPlan()
    expect(plan).toHaveLength(2)
    expect(plan[0].bodyPreset).toBe('runway')
    expect(plan[1].bodyPreset).toBe('curvy')
    // overridable
    expect(twoAvatarPlan('petite', 'plus').map((s) => s.bodyPreset)).toEqual(['petite', 'plus'])
  })

  it('lays the two avatars side by side', () => {
    const { totalW, xs } = twoAvatarCells(500, 20)
    expect(xs).toEqual([0, 520]) // second cell after the first + gap
    expect(totalW).toBe(1020) // 2×500 + 20
    expect(twoAvatarCells(400).xs).toEqual([0, 400]) // no gap
  })
})
