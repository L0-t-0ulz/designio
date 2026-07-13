import { describe, it, expect } from 'vitest'
import { rulerTicks } from '../src/renderer/ui/repeatPreview'

describe('print repeat preview ruler', () => {
  it('ticks every garment cm, majors every 5, positions calibrated by cm-per-px', () => {
    // 420 px representing 94 cm of cloth → cmPerPx ≈ 0.2238
    const ticks = rulerTicks(420, 94 / 420)
    expect(ticks.length).toBe(95) // 0…94 cm inclusive
    expect(ticks[0]).toEqual({ x: 0, cm: 0, major: true })
    expect(ticks[5].major).toBe(true)
    expect(ticks[7].major).toBe(false)
    expect(ticks[47].x).toBeCloseTo((47 * 420) / 94, 6) // exact px position
    expect(ticks[94].x).toBeLessThanOrEqual(420)
  })

  it('degenerate scales yield no ruler', () => {
    expect(rulerTicks(420, 0)).toEqual([])
    expect(rulerTicks(420, -1)).toEqual([])
  })
})
