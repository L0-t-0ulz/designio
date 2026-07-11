import { describe, it, expect } from 'vitest'
import { tilePlan, tiledPatternHTML, patternLayout, A4, LETTER } from '../src/renderer/export/tiledPrint'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentToPanels } from '../src/renderer/export/garmentPattern'

const mann = buildMannequin()

describe('tilePlan', () => {
  it('is a single page when the content fits one printable sheet', () => {
    const p = tilePlan(150, 200, { page: A4 }) // A4 printable ≈ 194×281
    expect(p.cols).toBe(1)
    expect(p.rows).toBe(1)
    expect(p.tiles).toHaveLength(1)
  })

  it('grows the grid for larger content and covers it with overlap', () => {
    const p = tilePlan(500, 800, { page: A4, marginMm: 8, overlapMm: 10 })
    expect(p.cols).toBeGreaterThan(1)
    expect(p.rows).toBeGreaterThan(1)
    expect(p.tiles).toHaveLength(p.cols * p.rows)
    // the tiles (stepped by printable − overlap) reach past the content edges
    const stepX = p.pageWmm - 10
    const stepY = p.pageHmm - 10
    expect((p.cols - 1) * stepX + p.pageWmm).toBeGreaterThanOrEqual(500)
    expect((p.rows - 1) * stepY + p.pageHmm).toBeGreaterThanOrEqual(800)
  })

  it('tiles step by printable − overlap (adjacent pages share the overlap band)', () => {
    const p = tilePlan(1000, 100, { page: A4, overlapMm: 10 })
    const step = p.tiles[1].xMm - p.tiles[0].xMm
    expect(step).toBeCloseTo(p.pageWmm - 10, 5)
  })

  it('respects a Letter page size', () => {
    const a4 = tilePlan(400, 400, { page: A4 })
    const letter = tilePlan(400, 400, { page: LETTER })
    expect(letter.pageWmm).toBeCloseTo(LETTER.wMm - 16, 5)
    expect(a4.pageWmm).not.toBe(letter.pageWmm)
  })
})

describe('tiledPatternHTML', () => {
  const res = garmentToPanels(getGarment('dress'), { ...DEFAULT_PARAMS, ...getGarment('dress').defaults }, mann.measurements, mann.colliders)

  it('lays the panels out at true mm with a positive combined size', () => {
    const layout = patternLayout(res)
    expect(layout.wMm).toBeGreaterThan(0)
    expect(layout.hMm).toBeGreaterThan(0)
    expect(layout.placed.length).toBe(res.panels.length)
  })

  it('emits an @page A4 doc with the assembly map + one page per tile', () => {
    const html = tiledPatternHTML(res, { page: A4 })
    const plan = tilePlan(patternLayout(res).wMm, patternLayout(res).hMm, { page: A4 })
    expect(html).toContain('@page')
    expect(html).toContain('mm')
    expect(html).toContain('actual size')
    // 1 map page + one page per tile
    const pages = (html.match(/class="page/g) || []).length
    expect(pages).toBe(1 + plan.tiles.length)
    // each tile page carries a to-scale SVG in mm
    expect(html).toContain('viewBox=')
  })
})
