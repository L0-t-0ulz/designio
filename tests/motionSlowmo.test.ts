import { describe, it, expect } from 'vitest'
import { trailAlpha } from '../src/renderer/studio/turntable'
import { Loop } from '../src/renderer/core/Loop'

describe('motion blur + slow motion', () => {
  it('trailAlpha: stronger blur keeps more trail (lower alpha), clamped so frames converge', () => {
    expect(trailAlpha(0)).toBe(1) // no blur = solid overwrite
    expect(trailAlpha(0.5)).toBeCloseTo(0.64, 10)
    expect(trailAlpha(1)).toBeCloseTo(0.28, 10)
    expect(trailAlpha(99)).toBeGreaterThanOrEqual(0.2) // never a frozen image
    expect(trailAlpha(-1)).toBe(1)
    expect(trailAlpha(0.9)).toBeLessThan(trailAlpha(0.3)) // monotonic
  })

  it('Loop.setTimeScale clamps to a sane slow-mo range and defaults to real time', () => {
    const loop = new Loop(
      () => {},
      () => {}
    )
    expect(loop.currentTimeScale).toBe(1)
    loop.setTimeScale(0.25)
    expect(loop.currentTimeScale).toBe(0.25)
    loop.setTimeScale(0) // can't stop time via the scale — that's what pause is for
    expect(loop.currentTimeScale).toBe(0.05)
    loop.setTimeScale(5) // no fast-forward (the solver budget is tuned for ≤ real time)
    expect(loop.currentTimeScale).toBe(1)
  })
})
