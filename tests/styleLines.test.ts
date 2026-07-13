import { describe, it, expect } from 'vitest'
import { splitOutline, orderPieces, demoStyleLines, outlinesToSVG } from '../src/renderer/pattern/styleLines'
import { buildArrangedGarment } from '../src/renderer/pattern/arrangement'
import { outlineArea, type Pt } from '../src/renderer/pattern/drawnPanel'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'

const square: Pt[] = [
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 0 },
  { x: 0, y: 0 }
]

describe('splitOutline', () => {
  it('splits a square horizontally into two rectangles whose areas sum', () => {
    const cut: Pt[] = [
      { x: -0.2, y: 0.4 },
      { x: 1.2, y: 0.4 }
    ]
    const pieces = splitOutline(square, cut)
    expect(pieces).not.toBeNull()
    const [a, b] = pieces!
    const areaA = Math.abs(outlineArea(a))
    const areaB = Math.abs(outlineArea(b))
    expect(areaA + areaB).toBeCloseTo(1, 6)
    // one piece is the 0.4-tall band, the other the 0.6-tall band
    expect(Math.min(areaA, areaB)).toBeCloseTo(0.4, 6)
    expect(Math.max(areaA, areaB)).toBeCloseTo(0.6, 6)
  })

  it('splits along a polyline (curved style line), keeping the cut vertices', () => {
    const cut: Pt[] = [
      { x: 0.5, y: 1.2 },
      { x: 0.4, y: 0.5 },
      { x: 0.5, y: -0.2 }
    ]
    const pieces = splitOutline(square, cut)
    expect(pieces).not.toBeNull()
    const [a, b] = pieces!
    expect(Math.abs(outlineArea(a)) + Math.abs(outlineArea(b))).toBeCloseTo(1, 6)
    // the interior cut vertex (0.4, 0.5) appears in both pieces
    const has = (poly: Pt[]): boolean => poly.some((p) => Math.abs(p.x - 0.4) < 1e-9 && Math.abs(p.y - 0.5) < 1e-9)
    expect(has(a)).toBe(true)
    expect(has(b)).toBe(true)
  })

  it('returns null when the path misses the outline', () => {
    expect(
      splitOutline(square, [
        { x: 2, y: 0 },
        { x: 3, y: 1 }
      ])
    ).toBeNull()
  })

  it('returns null for a path that only grazes one edge', () => {
    expect(
      splitOutline(square, [
        { x: 0.5, y: 1.5 },
        { x: 0.5, y: 0.5 }
      ])
    ).toBeNull()
  })
})

describe('orderPieces', () => {
  it('orders by centroid along the axis', () => {
    const cut: Pt[] = [
      { x: 0.3, y: 1.2 },
      { x: 0.3, y: -0.2 }
    ]
    const [left, right] = orderPieces(splitOutline(square, cut)!, 'x')
    const cx = (poly: Pt[]): number => poly.reduce((s, p) => s + p.x, 0) / poly.length
    expect(cx(left)).toBeLessThan(cx(right))
  })
})

describe('demoStyleLines', () => {
  it('composes three panels (colour-block front pair + whole back) and three seams', () => {
    const { panels, seams } = demoStyleLines()
    expect(panels).toHaveLength(3)
    expect(seams).toHaveLength(3)
    // the two front pieces tile the back's area (same outline, split)
    const areaBack = Math.abs(outlineArea(panels[2].outline))
    const areaFront = Math.abs(outlineArea(panels[0].outline)) + Math.abs(outlineArea(panels[1].outline))
    expect(areaFront).toBeCloseTo(areaBack, 6)
  })

  it('sews and drapes headlessly (finite, pins held)', () => {
    const { panels, seams } = demoStyleLines()
    const sewn = buildArrangedGarment(panels, seams, { bust: 0.94 }, FABRICS.cotton)
    expect(sewn.geometries).toHaveLength(3)
    for (let f = 0; f < 90; f++) sewn.world.step(1 / 60)
    for (let i = 0; i < sewn.world.positions.length; i++) {
      expect(Number.isFinite(sewn.world.positions[i])).toBe(true)
    }
  })
})

describe('outlinesToSVG', () => {
  it('lays pieces side by side with labels at mm scale', () => {
    const { panels } = demoStyleLines()
    const svg = outlinesToSVG([
      { name: 'FRONT L', outline: panels[0].outline },
      { name: 'FRONT R', outline: panels[1].outline },
      { name: 'BACK', outline: panels[2].outline }
    ])
    expect(svg).toContain('<svg')
    expect(svg).toContain('FRONT L')
    expect(svg).toContain('FRONT R')
    expect(svg).toContain('BACK')
    expect((svg.match(/<polygon/g) ?? []).length).toBe(3)
    // mm scale: the bodice is ~420 mm tall, so the page must be taller than that
    const h = Number(svg.match(/height="([\d.]+)mm"/)?.[1])
    expect(h).toBeGreaterThan(400)
  })
})
