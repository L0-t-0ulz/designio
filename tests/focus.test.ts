import { describe, it, expect } from 'vitest'
import { focusDistance } from '../src/renderer/core/focus'

describe('focus pull (rack-focus mapping)', () => {
  it('0.5 lands exactly on the subject; the ends rack a stop either way', () => {
    expect(focusDistance(0.5, 4)).toBeCloseTo(4, 10)
    expect(focusDistance(0, 4)).toBeCloseTo(2, 10) // near foreground = half
    expect(focusDistance(1, 4)).toBeCloseTo(8, 10) // background = double
  })

  it('is monotonic and clamped', () => {
    let prev = 0
    for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      const d = focusDistance(t, 3)
      expect(d).toBeGreaterThan(prev)
      prev = d
    }
    expect(focusDistance(-5, 3)).toBeCloseTo(focusDistance(0, 3), 10)
    expect(focusDistance(9, 3)).toBeCloseTo(focusDistance(1, 3), 10)
  })

  it('scales linearly with the subject distance (the pull feels the same at any framing)', () => {
    expect(focusDistance(0.25, 6)).toBeCloseTo(2 * focusDistance(0.25, 3), 10)
  })
})
