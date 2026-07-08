import { describe, it, expect } from 'vitest'
import { stressLevel, stressColor, stressThreshold, STRESS_THRESHOLD } from '../src/renderer/fabric/stress'

describe('stress / fit-failure viz', () => {
  it('classifies within-tolerance vs approaching vs failing', () => {
    expect(stressLevel(0)).toBe('safe')
    expect(stressLevel(-0.2)).toBe('safe') // compression (loose) is never a failure
    expect(stressLevel(STRESS_THRESHOLD * 0.3)).toBe('safe')
    expect(stressLevel(STRESS_THRESHOLD * 0.7)).toBe('warn')
    expect(stressLevel(STRESS_THRESHOLD * 1.5)).toBe('fail')
    expect(stressLevel(STRESS_THRESHOLD)).toBe('fail') // at the threshold = fail
  })

  it('colours safe green, failing red, warning amber in between', () => {
    const [gr, gg] = stressColor(0)
    expect(gg).toBeGreaterThan(gr) // green dominates when safe
    const [fr, fg, fb] = stressColor(STRESS_THRESHOLD * 2)
    expect(fr).toBeGreaterThan(fg) // red dominates when failing
    expect(fr).toBeGreaterThan(fb)
    const [wr, , wb] = stressColor(STRESS_THRESHOLD * 0.75) // amber-ish
    expect(wr).toBeGreaterThan(wb)
    // redness increases monotonically with tension
    expect(stressColor(STRESS_THRESHOLD)[0]).toBeGreaterThan(stressColor(0)[0])
  })

  it('slack (compression) reads the same as neutral (safe)', () => {
    expect(stressColor(-0.5)).toEqual(stressColor(0))
  })

  it('a stretchy fabric tolerates far more strain before failing than a rigid one', () => {
    const denim = stressThreshold(0.02) // rigid
    const jersey = stressThreshold(0.85) // knit
    expect(jersey).toBeGreaterThan(denim)
    // the same 20% strain: fails on rigid denim, safe on stretchy jersey
    expect(stressLevel(0.2, denim)).toBe('fail')
    expect(stressLevel(0.2, jersey)).toBe('safe')
  })

  it('every channel stays within [0,1]', () => {
    for (const s of [-1, -0.05, 0, 0.05, 0.12, 0.5, 2]) {
      for (const c of stressColor(s)) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThanOrEqual(1)
      }
    }
  })
})
