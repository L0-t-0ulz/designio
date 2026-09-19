import { describe, it, expect } from 'vitest'
import { MAJOR_EVERY, gridStepMm, gridTicks, patternGridSVG, rulerLabel } from '../src/renderer/export/patternGrid'

describe('grid spacing', () => {
  it('uses a 1 cm grid on a small sheet', () => {
    expect(gridStepMm(200)).toBe(10)
    expect(gridStepMm(400)).toBe(10)
  })

  it('coarsens as the sheet grows, so the grid never becomes a grey wash', () => {
    const steps = [300, 700, 1500, 3000, 8000].map((s) => gridStepMm(s))
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1])
  })

  it('keeps the line count at or under the target wherever it can', () => {
    for (const span of [150, 400, 900, 1800, 4000, 9000]) {
      expect(span / gridStepMm(span)).toBeLessThanOrEqual(40)
    }
  })

  it('only ever picks a 1/2/5 ladder step, so labels stay round numbers', () => {
    for (const span of [50, 250, 640, 1200, 3300, 7000, 50000]) {
      expect([10, 20, 50, 100, 200, 500]).toContain(gridStepMm(span))
    }
  })

  it('caps at the coarsest step rather than running off the ladder', () => {
    expect(gridStepMm(1e9)).toBe(500)
  })

  it('handles a zero or negative span', () => {
    expect(gridStepMm(0)).toBe(10)
    expect(gridStepMm(-100)).toBe(10)
  })
})

describe('grid ticks', () => {
  it('starts at zero and steps evenly', () => {
    expect(gridTicks(50, 10)).toEqual([0, 10, 20, 30, 40, 50])
  })

  it('includes the far edge only when it lands exactly on it', () => {
    expect(gridTicks(45, 10)).toEqual([0, 10, 20, 30, 40])
  })

  it('does not drift on a long run', () => {
    const ticks = gridTicks(10000, 10)
    expect(ticks).toHaveLength(1001)
    expect(ticks[1000]).toBe(10000) // exact, not 9999.999999
  })

  it('returns nothing for a degenerate span or step', () => {
    for (const [span, step] of [[0, 10], [100, 0], [100, -10], [NaN, 10], [100, NaN], [Infinity, 10]]) {
      expect(gridTicks(span, step)).toEqual([])
    }
  })
})

describe('ruler labels', () => {
  it('reads in centimetres, because the SVG unit is a millimetre', () => {
    expect(rulerLabel(100)).toBe('10')
    expect(rulerLabel(500)).toBe('50')
  })

  it('does not decorate whole numbers with a pointless decimal', () => {
    expect(rulerLabel(200)).toBe('20')
  })

  it('keeps one decimal when the step is not a whole centimetre', () => {
    expect(rulerLabel(25)).toBe('2.5')
  })
})

describe('grid svg', () => {
  const svg = patternGridSVG(500, 300)

  it('is a single group that cannot swallow clicks meant for the pattern', () => {
    expect(svg.startsWith('<g class="pattern-grid" pointer-events="none">')).toBe(true)
    expect(svg.endsWith('</g>')).toBe(true)
  })

  it('draws a line for every tick in both directions', () => {
    const step = gridStepMm(500)
    const expected = gridTicks(500, step).length + gridTicks(300, step).length
    expect(svg.match(/<line /g) ?? []).toHaveLength(expected)
  })

  it('spans the full sheet in both directions', () => {
    expect(svg).toContain('y2="300.0"') // verticals run the full height
    expect(svg).toContain('x2="500.0"') // horizontals run the full width
  })

  it('labels only the major lines, not every one', () => {
    const step = gridStepMm(500)
    const majors = gridTicks(500, step).filter((_, i) => i && i % MAJOR_EVERY === 0).length +
      gridTicks(300, step).filter((_, i) => i && i % MAJOR_EVERY === 0).length
    expect(svg.match(/<text /g) ?? []).toHaveLength(majors + 1) // + the "cm" unit marker
  })

  it('says what unit it is in', () => {
    expect(svg).toContain('>cm<')
  })

  it('draws major lines heavier than minor ones', () => {
    expect(svg).toContain('stroke-width="0.8"')
    expect(svg).toContain('stroke-width="0.4"')
  })

  it('emits nothing at all for a degenerate sheet', () => {
    for (const [w, h] of [[0, 100], [100, 0], [-5, 100], [0, 0]]) expect(patternGridSVG(w, h)).toBe('')
  })
})
