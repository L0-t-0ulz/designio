import { describe, it, expect } from 'vitest'
import { contactGrid, contactViews } from '../src/renderer/studio/contactSheet'

describe('multi-angle contact sheet', () => {
  it('views: evenly spaced fractions of a turn with degree labels, 0° first', () => {
    const v = contactViews(6)
    expect(v.map((x) => x.label)).toEqual(['0°', '60°', '120°', '180°', '240°', '300°'])
    expect(v[0].t).toBe(0)
    expect(v[3].t).toBeCloseTo(0.5, 10) // 180° = half a turn
    expect(contactViews(4).map((x) => x.label)).toEqual(['0°', '90°', '180°', '270°'])
    expect(contactViews(1).length).toBe(2) // floor of 2 views
  })

  it('grid: row-major 3-wide layout, labels under each cell, exact canvas size', () => {
    const g = contactGrid(6, 100, 150, 3, 8, 28)
    expect(g.cells.length).toBe(6)
    expect(g.cells[0]).toEqual({ x: 0, y: 0 })
    expect(g.cells[1]).toEqual({ x: 108, y: 0 }) // + cellW + gap
    expect(g.cells[3]).toEqual({ x: 0, y: 186 }) // second row: cellH + labelH + gap
    expect(g.totalW).toBe(3 * 100 + 2 * 8)
    expect(g.totalH).toBe(2 * (150 + 28) + 8)
    for (let i = 0; i < 6; i++) {
      expect(g.labelY[i]).toBeGreaterThan(g.cells[i].y + 150) // label sits below its image
      expect(g.labelY[i]).toBeLessThan(g.cells[i].y + 150 + 28)
    }
  })

  it('grid: never wider than the cell count (a 2-view sheet is 2 columns, not 3)', () => {
    const g = contactGrid(2, 100, 100, 3, 0, 20)
    expect(g.totalW).toBe(200)
    expect(g.cells[1]).toEqual({ x: 100, y: 0 })
  })
})
