import { describe, it, expect } from 'vitest'
import { bandStretch, bandTensionN, bandPressureKpa, bandGripKpa } from '../src/renderer/cloth/elasticBand'

describe('elastic band physics', () => {
  it('stretch is zero when slack/compressed, positive when worn over a bigger girth', () => {
    expect(bandStretch(56, 56)).toBe(0) // exact fit
    expect(bandStretch(58, 56)).toBe(0) // band bigger than the head → slack
    expect(bandStretch(54, 56)).toBeCloseTo(2 / 54, 6) // stretched 2 cm over 54
  })

  it('tension rises linearly with stretch and never goes negative', () => {
    expect(bandTensionN(0)).toBe(0)
    expect(bandTensionN(0.1, 60)).toBeCloseTo(6, 6)
    expect(bandTensionN(-0.5)).toBe(0)
  })

  it('grip pressure follows Laplace — more tension, tighter radius → more pressure', () => {
    expect(bandPressureKpa(6, 0.09, 0.03)).toBeGreaterThan(0)
    // a tighter radius concentrates the same tension into more pressure
    expect(bandPressureKpa(6, 0.06)).toBeGreaterThan(bandPressureKpa(6, 0.12))
    expect(bandPressureKpa(0, 0.09)).toBe(0)
    expect(bandPressureKpa(6, 0)).toBe(0) // degenerate radius → no divide-by-zero
  })

  it('the full grip chain: a snug cuff grips, a loose one does not', () => {
    const snug = bandGripKpa(54, 56, 0.089) // drafted 2 cm smaller than the head
    const loose = bandGripKpa(58, 56, 0.089) // bigger than the head
    expect(snug).toBeGreaterThan(0)
    expect(loose).toBe(0)
    // a firmer draft grips harder
    expect(bandGripKpa(52, 56, 0.089)).toBeGreaterThan(snug)
  })
})
