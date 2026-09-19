import { describe, it, expect } from 'vitest'
import { tilePlan, tiledPatternHTML, patternLayout, A4, LETTER, A2, A3, PAGE_SIZES, pageSize, type PageSize } from '../src/renderer/export/tiledPrint'
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

describe('ISO 216 page sizes', () => {
  const A_SERIES: [string, PageSize][] = [['A2', A2], ['A3', A3], ['A4', A4]]

  it('every A size has the √2 aspect ratio the standard is built on', () => {
    // the ratio is what makes halving a sheet give the next size with the same shape;
    // 1 mm of rounding on a 210 mm edge is ~0.5%, so that is the tolerance
    for (const [name, p] of A_SERIES) {
      expect(p.hMm / p.wMm, name).toBeCloseTo(Math.SQRT2, 2)
    }
  })

  it('each size is the next one up, halved across its long edge', () => {
    // A3 is half of A2, A4 is half of A3 — to within the standard's 1 mm round-down
    for (let i = 1; i < A_SERIES.length; i++) {
      const [bigName, big] = A_SERIES[i - 1]
      const [smallName, small] = A_SERIES[i]
      const label = `${smallName} from ${bigName}`
      expect(small.wMm, label).toBe(Math.floor(big.hMm / 2))
      expect(small.hMm, label).toBe(big.wMm)
    }
  })

  it('areas halve down the series, landing just under 2^-n m² because of the round-down', () => {
    // A_n is nominally 2^-n m², but the standard rounds each edge DOWN to whole
    // millimetres, so every real sheet is fractionally smaller than its ideal:
    // A2 is 420 × 594 = 0.24948 m², not 0.25. Rounding down can only ever lose
    // area, so the bound is one-sided — and the shortfall is ~0.2%, well under the
    // half-percent a 1 mm error on a ~200 mm edge could produce.
    const nominal: Record<string, number> = { A2: 1 / 4, A3: 1 / 8, A4: 1 / 16 }
    for (const [name, p] of A_SERIES) {
      const m2 = (p.wMm / 1000) * (p.hMm / 1000)
      expect(m2, `${name} area`).toBeLessThanOrEqual(nominal[name])
      expect(m2 / nominal[name], `${name} shortfall`).toBeGreaterThan(0.995)
    }
  })

  it('every edge is a whole number of millimetres', () => {
    // the round-down is to whole mm; a fractional edge would mean the table was
    // computed rather than taken from the standard
    for (const [name, p] of A_SERIES) {
      expect(Number.isInteger(p.wMm), `${name} width`).toBe(true)
      expect(Number.isInteger(p.hMm), `${name} height`).toBe(true)
    }
  })

  it('matches the published millimetre figures exactly', () => {
    // a printer driver expects these to the millimetre, not to within rounding
    expect(A2).toEqual({ wMm: 420, hMm: 594 })
    expect(A3).toEqual({ wMm: 297, hMm: 420 })
    expect(A4).toEqual({ wMm: 210, hMm: 297 })
  })

  it('resolves sizes by id, falling back to A4 for anything unknown', () => {
    expect(pageSize('A2')).toEqual(A2)
    expect(pageSize('A3')).toEqual(A3)
    expect(pageSize('Letter')).toEqual(LETTER)
    expect(pageSize('A1')).toEqual(A4)
    expect(pageSize('')).toEqual(A4)
  })

  it('offers every listed size through the lookup', () => {
    for (const { id, page } of PAGE_SIZES) expect(pageSize(id)).toEqual(page)
  })
})

describe('tiling on larger sheets', () => {
  // a 900 × 1200 mm pattern — about a coat
  const W = 900
  const H = 1200

  it('a bigger sheet needs fewer pages', () => {
    const a4 = tilePlan(W, H, { page: A4 })
    const a3 = tilePlan(W, H, { page: A3 })
    const a2 = tilePlan(W, H, { page: A2 })
    expect(a3.tiles.length).toBeLessThan(a4.tiles.length)
    expect(a2.tiles.length).toBeLessThan(a3.tiles.length)
  })

  it('still covers the whole pattern, whatever the sheet', () => {
    // the real requirement: no part of the pattern falls between pages
    for (const page of [A4, A3, A2]) {
      const plan = tilePlan(W, H, { page })
      const last = plan.tiles[plan.tiles.length - 1]
      expect(last.xMm + last.wMm).toBeGreaterThanOrEqual(W)
      expect(last.yMm + last.hMm).toBeGreaterThanOrEqual(H)
    }
  })

  it('keeps the taping overlap on every seam between pages', () => {
    for (const page of [A4, A3, A2]) {
      const overlapMm = 10
      const plan = tilePlan(W, H, { page, overlapMm })
      const row0 = plan.tiles.filter((t) => t.row === 0).sort((a, b) => a.xMm - b.xMm)
      for (let i = 1; i < row0.length; i++) {
        const gap = row0[i].xMm - (row0[i - 1].xMm + row0[i - 1].wMm)
        expect(gap).toBeLessThanOrEqual(-overlapMm + 1e-9) // overlapping, not abutting
      }
    }
  })

  it('prints at 1:1 — the printable window is the sheet less its margins', () => {
    // the whole point of a tiled pattern is that it comes out actual size
    const marginMm = 8
    for (const page of [A2, A3, A4]) {
      const plan = tilePlan(500, 500, { page, marginMm })
      expect(plan.pageWmm).toBe(page.wMm - marginMm * 2)
      expect(plan.pageHmm).toBe(page.hMm - marginMm * 2)
    }
  })
})
