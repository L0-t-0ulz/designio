import { describe, it, expect } from 'vitest'
import {
  PLOTTER_UNITS_PER_MM,
  layoutPanelsInRow,
  outlineToHPGL,
  panelsToHPGL,
  patternToHPGL,
  placePoint,
  toPlotterUnits,
  patternToRollHPGL,
  ROLL_WIDTHS_CM,
  type PlacedPanel
} from '../src/renderer/export/plotter'
import { nestMarker } from '../src/renderer/export/marker'
import type { PatternPanel } from '../src/renderer/export/garmentPattern'

const square = (size: number) => [
  { x: 0, y: 0 },
  { x: size, y: 0 },
  { x: size, y: size },
  { x: 0, y: size }
]

const panel = (name: string, size: number, cut = 1): PatternPanel =>
  ({ name, cut, outline: square(size), grain: [{ x: 0, y: 0 }, { x: 0, y: size }], notches: [], wmm: size, hmm: size }) as PatternPanel

const placed = (over: Partial<PlacedPanel> = {}): PlacedPanel => ({ name: 'p', outline: square(10), dx: 0, dy: 0, ...over })

describe('plotter units', () => {
  it('uses HPGL’s fixed 1/40 mm device grid', () => {
    expect(PLOTTER_UNITS_PER_MM).toBe(40)
    expect(toPlotterUnits(1)).toBe(40)
    expect(toPlotterUnits(25)).toBe(1000)
  })

  it('rounds to the integer grid the device actually addresses', () => {
    expect(toPlotterUnits(0.0124)).toBe(0) // below half a unit
    expect(toPlotterUnits(0.013)).toBe(1)
    expect(Number.isInteger(toPlotterUnits(3.3333))).toBe(true)
  })
})

describe('coordinate placement', () => {
  it('flips Y — HPGL is bottom-left origin, pattern space is top-left', () => {
    // without this the plot is mirrored, and a left front gets cut as a right front
    const p = placePoint({ x: 0, y: 0 }, placed(), 100)
    expect(p.y).toBe(toPlotterUnits(100))
    expect(placePoint({ x: 0, y: 100 }, placed(), 100).y).toBe(0)
  })

  it('applies the panel offset', () => {
    const p = placePoint({ x: 5, y: 5 }, placed({ dx: 20, dy: 30 }), 100)
    expect(p.x).toBe(toPlotterUnits(25))
    expect(p.y).toBe(toPlotterUnits(100 - 35))
  })

  it('rotates a quarter turn when asked', () => {
    const p = placePoint({ x: 10, y: 0 }, placed({ rotated: true }), 100)
    expect(p.x).toBe(toPlotterUnits(0)) // x = -y = 0
    expect(p.y).toBe(toPlotterUnits(100 - 10)) // y = x = 10
  })
})

describe('outline emission', () => {
  it('lifts the pen to the start, then draws the rest', () => {
    const hpgl = outlineToHPGL(placed({ outline: square(10) }), 10)
    expect(hpgl.startsWith('PU')).toBe(true)
    expect(hpgl).toContain('PD')
    expect(hpgl.endsWith(';')).toBe(true)
  })

  it('closes the loop explicitly — a plotter does not assume a polygon closes', () => {
    const hpgl = outlineToHPGL(placed({ outline: square(10) }), 10)
    const coords = hpgl.replace('PU', '').replace('PD', '').split(';').filter(Boolean).join(',').split(',')
    // 4 corners + the repeated first point = 5 pairs
    expect(coords.length / 2).toBe(5)
    expect([coords[0], coords[1]]).toEqual([coords[coords.length - 2], coords[coords.length - 1]])
  })

  it('emits nothing for a degenerate outline rather than a stray pen move', () => {
    expect(outlineToHPGL(placed({ outline: [] }), 10)).toBe('')
    expect(outlineToHPGL(placed({ outline: [{ x: 1, y: 1 }] }), 10)).toBe('')
  })

  it('emits only integers — HPGL has no fractional coordinates', () => {
    const hpgl = outlineToHPGL(placed({ outline: [{ x: 1.3333, y: 2.7777 }, { x: 9.1111, y: 4.5555 }] }), 33.3333)
    for (const n of hpgl.match(/-?\d+(\.\d+)?/g) ?? []) expect(n).not.toContain('.')
  })
})

describe('the document', () => {
  const doc = panelsToHPGL([placed()], { sheetHeightMm: 100 })

  it('initialises the device and selects a pen', () => {
    expect(doc.startsWith('IN;')).toBe(true)
    expect(doc).toContain('SP1;')
  })

  it('parks the pen at the end so no tool is left down on the media', () => {
    expect(doc.trimEnd().endsWith('SP0;')).toBe(true)
    expect(doc).toContain('PU;\nSP0;')
  })

  it('honours a pen choice, clamping nonsense', () => {
    expect(panelsToHPGL([placed()], { sheetHeightMm: 10, pen: 3 })).toContain('SP3;')
    expect(panelsToHPGL([placed()], { sheetHeightMm: 10, pen: 0 })).toContain('SP1;')
    expect(panelsToHPGL([placed()], { sheetHeightMm: 10, pen: -4 })).toContain('SP1;')
  })

  it('is still a valid document with nothing to plot', () => {
    const empty = panelsToHPGL([], { sheetHeightMm: 10 })
    expect(empty.startsWith('IN;')).toBe(true)
    expect(empty.trimEnd().endsWith('SP0;')).toBe(true)
    expect(empty).not.toContain('PD')
  })

  it('ends with a newline, as a plotter stream should', () => {
    expect(doc.endsWith('\n')).toBe(true)
  })
})

describe('row layout', () => {
  it('places panels left to right without overlapping', () => {
    const { placed: out } = layoutPanelsInRow([panel('A', 100), panel('B', 50)], 20, 10)
    expect(out).toHaveLength(2)
    expect(out[1].dx).toBeGreaterThan(out[0].dx + 100)
  })

  it('repeats a panel for its cut quantity', () => {
    const { placed: out } = layoutPanelsInRow([panel('Sleeve', 40, 2)])
    expect(out).toHaveLength(2)
    expect(out[0].dx).not.toBe(out[1].dx)
  })

  it('normalises the outline origin so a panel drawn away from zero still lands in the sheet', () => {
    const offset = { ...panel('Odd', 10), outline: [{ x: 500, y: 500 }, { x: 510, y: 500 }, { x: 510, y: 510 }] } as PatternPanel
    const { placed: out } = layoutPanelsInRow([offset], 20, 10)
    expect(out[0].dx).toBeCloseTo(10 - 500)
  })

  it('sizes the sheet to fit the tallest panel', () => {
    const { heightMm } = layoutPanelsInRow([panel('A', 100), panel('B', 50)], 20, 10)
    expect(heightMm).toBe(120) // 100 + 2×10 margin
  })

  it('skips a panel with no geometry', () => {
    const empty = { ...panel('Empty', 0), outline: [] } as PatternPanel
    expect(layoutPanelsInRow([empty]).placed).toHaveLength(0)
  })
})

describe('end to end', () => {
  it('turns a pattern into a plottable document', () => {
    const plt = patternToHPGL([panel('Front', 300), panel('Sleeve', 150, 2)])
    expect(plt.startsWith('IN;')).toBe(true)
    expect((plt.match(/PU-?\d+,-?\d+;/g) ?? [])).toHaveLength(3) // one pen-up move per placed piece
    expect(plt.trimEnd().endsWith('SP0;')).toBe(true)
  })

  it('keeps every coordinate positive — a plotter cannot reach behind its origin', () => {
    const plt = patternToHPGL([panel('Front', 300), panel('Sleeve', 150, 2)])
    for (const n of plt.match(/-?\d+/g) ?? []) expect(Number(n)).toBeGreaterThanOrEqual(0)
  })
})

describe('roll-width nesting', () => {
  const rectPanel = (name: string, wmm: number, hmm: number, cut = 1): PatternPanel =>
    ({
      name,
      cut,
      outline: [{ x: 0, y: 0 }, { x: wmm, y: 0 }, { x: wmm, y: hmm }, { x: 0, y: hmm }],
      grain: [{ x: 0, y: 0 }, { x: 0, y: hmm }],
      notches: [],
      wmm,
      hmm
    }) as PatternPanel

  /** Pull every coordinate pair back out of the emitted HPGL. */
  const coordsOf = (hpgl: string): { x: number; y: number }[] => {
    const out: { x: number; y: number }[] = []
    for (const cmd of hpgl.match(/P[UD][-\d,]+;/g) ?? []) {
      const nums = (cmd.slice(2, -1).match(/-?\d+/g) ?? []).map(Number)
      for (let i = 0; i + 1 < nums.length; i += 2) out.push({ x: nums[i], y: nums[i + 1] })
    }
    return out
  }

  const panels = [rectPanel('Front', 400, 700), rectPanel('Back', 400, 700), rectPanel('Sleeve', 200, 500, 2)]

  it('reports the roll it nested for, and a real length', () => {
    const plot = patternToRollHPGL(panels, 140)
    expect(plot.widthCm).toBe(140)
    expect(plot.lengthCm).toBeGreaterThan(0)
    expect(plot.efficiency).toBeGreaterThan(0)
    expect(plot.efficiency).toBeLessThanOrEqual(1)
  })

  it('keeps every plotted point inside the roll — the check on the rotation offset', () => {
    // a wrong offset for a rotated piece puts it off the goods, which is the bug
    // most likely to survive review and waste a whole cut
    for (const width of [90, 140, 160]) {
      const plot = patternToRollHPGL(panels, width)
      const maxX = toPlotterUnits(width * 10)
      const maxY = toPlotterUnits(plot.lengthCm * 10)
      for (const c of coordsOf(plot.hpgl)) {
        expect(c.x).toBeGreaterThanOrEqual(0)
        expect(c.x).toBeLessThanOrEqual(maxX)
        expect(c.y).toBeGreaterThanOrEqual(0)
        expect(c.y).toBeLessThanOrEqual(maxY)
      }
    }
  })

  it('plots every piece, counting cut quantities', () => {
    const plot = patternToRollHPGL(panels, 140)
    // 1 Front + 1 Back + 2 Sleeves = 4 pen-up moves
    expect((plot.hpgl.match(/PU-?\d+,-?\d+;/g) ?? [])).toHaveLength(4)
  })

  it('a narrower roll needs more length for the same pattern', () => {
    expect(patternToRollHPGL(panels, 90).lengthCm).toBeGreaterThanOrEqual(patternToRollHPGL(panels, 180).lengthCm)
  })

  it('agrees with the marker nesting the cost sheet uses', () => {
    // the plot and the yardage figure must not describe different layouts
    const plot = patternToRollHPGL(panels, 140)
    const marker = nestMarker([...panels], 140)
    expect(plot.lengthCm).toBe(marker.lengthCm)
    expect(plot.efficiency).toBe(marker.efficiency)
  })

  it('offers real bolt widths', () => {
    expect(ROLL_WIDTHS_CM).toContain(140)
    for (const w of ROLL_WIDTHS_CM) expect(w).toBeGreaterThan(0)
  })

  it('survives a nonsense roll width rather than dividing by zero', () => {
    for (const w of [0, -50]) {
      const plot = patternToRollHPGL(panels, w)
      expect(plot.widthCm).toBeGreaterThan(0)
      expect(Number.isFinite(plot.lengthCm)).toBe(true)
    }
  })

  it('handles an empty pattern', () => {
    const plot = patternToRollHPGL([], 140)
    expect(plot.lengthCm).toBe(0)
    expect(plot.hpgl).toContain('IN;')
    expect(plot.hpgl).not.toContain('PD')
  })
})
