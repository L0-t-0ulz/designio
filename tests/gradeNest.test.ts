import { describe, it, expect } from 'vitest'
import {
  alignNest,
  anchorPoint,
  gradeStepsAt,
  halfWidthsAt,
  isEvenGrade,
  nestBounds,
  nestColor,
  nestSVG,
  outlineBounds,
  type NestedSize
} from '../src/renderer/export/gradeNest'
import type { SizeLabel } from '../src/renderer/studio/document'

const P = (x: number, y: number) => ({ x, y })
/** A symmetric trapezoid panel: half-width `hw` at the top, `hw + flare` at the hem. */
const panel = (hw: number, flare: number, h = 100) => [P(-hw, 0), P(hw, 0), P(hw + flare, h), P(-hw - flare, h)]

/** A uniformly graded run: each size 2 mm wider per side than the last. */
const run = (step = 2): NestedSize[] =>
  (['XS', 'S', 'M', 'L', 'XL'] as SizeLabel[]).map((size, i) => ({ size, outline: panel(40 + i * step, 10) }))

describe('bounds and anchors', () => {
  it('bounds a simple outline', () => {
    expect(outlineBounds(panel(40, 10))).toEqual({ minX: -50, minY: 0, maxX: 50, maxY: 100 })
  })

  it('top-centre anchors at the middle of the top edge', () => {
    expect(anchorPoint(panel(40, 10), 'top-centre')).toEqual({ x: 0, y: 0 })
    const shifted = panel(40, 10).map((p) => P(p.x + 7, p.y + 3))
    expect(anchorPoint(shifted, 'top-centre')).toEqual({ x: 7, y: 3 })
  })

  it('centroid uses the AREA centroid, not the vertex mean', () => {
    // extra points crowded low down would drag a vertex mean toward the hem
    const crowded = [P(-40, 0), P(40, 0), P(50, 100), P(20, 100), P(0, 100), P(-20, 100), P(-50, 100)]
    const c = anchorPoint(crowded, 'centroid')
    const vertexMean = crowded.reduce((a, p) => a + p.y, 0) / crowded.length
    expect(c.y).toBeLessThan(vertexMean) // area weights the wide hem correctly, not the point count
    expect(c.x).toBeCloseTo(0, 6)
  })

  it('origin does not move anything', () => {
    expect(anchorPoint(panel(40, 10), 'origin')).toEqual({ x: 0, y: 0 })
  })

  it('copes with an empty outline', () => {
    expect(anchorPoint([], 'centroid')).toEqual({ x: 0, y: 0 })
  })
})

describe('aligning the nest', () => {
  it('pins every size to a common point', () => {
    // the sizes are drafted at different places; after aligning, their anchors coincide
    const scattered: NestedSize[] = [
      { size: 'S', outline: panel(40, 10).map((p) => P(p.x + 500, p.y + 200)) },
      { size: 'M', outline: panel(42, 10) }
    ]
    for (const n of alignNest(scattered)) {
      expect(anchorPoint(n.outline, 'top-centre').x).toBeCloseTo(0, 9)
      expect(anchorPoint(n.outline, 'top-centre').y).toBeCloseTo(0, 9)
    }
  })

  it('does not change the shape, only its position', () => {
    const before = outlineBounds(panel(40, 10))
    const after = outlineBounds(alignNest([{ size: 'M', outline: panel(40, 10) }])[0].outline)
    expect(after.maxX - after.minX).toBeCloseTo(before.maxX - before.minX, 9)
    expect(after.maxY - after.minY).toBeCloseTo(before.maxY - before.minY, 9)
  })

  it('leaves the input untouched', () => {
    const src = [{ size: 'M' as SizeLabel, outline: panel(40, 10) }]
    alignNest(src)
    expect(src[0].outline[0]).toEqual(P(-40, 0))
  })

  it('bounds the whole nest, not just one size', () => {
    const b = nestBounds(alignNest(run()))
    // the largest size must be inside the reported bounds
    expect(b.maxX).toBeGreaterThanOrEqual(48)
  })

  it('handles an empty nest', () => {
    expect(nestBounds([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
    expect(alignNest([])).toEqual([])
  })
})

describe('reading the grade off the nest', () => {
  it('measures each size’s half-width at a height', () => {
    const w = halfWidthsAt(alignNest(run()), 50)
    // trapezoid: half-width at mid-height is hw + flare/2
    expect(w[0]).toBeCloseTo(45, 6) // 40 + 5
    expect(w[4]).toBeCloseTo(53, 6) // 48 + 5
  })

  it('reports an even grade as even', () => {
    const steps = gradeStepsAt(alignNest(run(2)), 50)
    expect(steps).toHaveLength(4)
    for (const s of steps) expect(s).toBeCloseTo(2, 6)
    expect(isEvenGrade(steps)).toBe(true)
  })

  it('catches one size drafted out of line — the reason to look at a nest', () => {
    const bad = run(2)
    bad[3].outline = panel(40 + 3 * 2 + 5, 10) // L drafted 5 mm too big
    const steps = gradeStepsAt(alignNest(bad), 50)
    expect(isEvenGrade(steps)).toBe(false)
  })

  it('scales with the grade step', () => {
    for (const step of [1, 2, 4]) {
      const steps = gradeStepsAt(alignNest(run(step)), 50).filter((s): s is number => s !== null)
      for (const s of steps) expect(s).toBeCloseTo(step, 6)
    }
  })

  it('returns null where a size does not reach that height', () => {
    const mixed: NestedSize[] = [
      { size: 'S', outline: panel(40, 10, 50) }, // only 50 tall
      { size: 'M', outline: panel(42, 10, 100) }
    ]
    expect(halfWidthsAt(alignNest(mixed), 80)[0]).toBeNull()
    expect(gradeStepsAt(alignNest(mixed), 80)[0]).toBeNull()
  })

  it('treats a run too short to compare as even', () => {
    expect(isEvenGrade([])).toBe(true)
    expect(isEvenGrade([2])).toBe(true)
    expect(isEvenGrade([null, null])).toBe(true)
  })

  it('honours the tolerance', () => {
    expect(isEvenGrade([2, 2.3], 0.5)).toBe(true)
    expect(isEvenGrade([2, 2.9], 0.5)).toBe(false)
  })
})

describe('drawing', () => {
  it('gives every size a distinct colour', () => {
    const colors = new Set(Array.from({ length: 5 }, (_, i) => nestColor(i, 5)))
    expect(colors.size).toBe(5)
  })

  it('does not divide by zero for a single size', () => {
    expect(nestColor(0, 1)).toContain('hsl(')
  })

  it('draws one path per size and keys them', () => {
    const svg = nestSVG(alignNest(run()), { label: 'Front' })
    expect((svg.match(/<path /g) ?? [])).toHaveLength(5)
    for (const s of ['XS', 'S', 'M', 'L', 'XL']) expect(svg).toContain(`>${s}</text>`)
    expect(svg).toContain('Front')
  })

  it('emphasises the base size so the nest reads as a grade around a block', () => {
    const svg = nestSVG(alignNest(run()))
    expect(svg).toContain('stroke-width="1.6"') // M, solid
    expect(svg).toContain('stroke-dasharray') // the others
  })

  it('places every coordinate inside the viewBox', () => {
    const svg = nestSVG(alignNest(run()))
    const [w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/)!.slice(1).map(Number)
    for (const m of svg.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(0)
      expect(Number(m[1])).toBeLessThanOrEqual(w)
      expect(Number(m[2])).toBeGreaterThanOrEqual(0)
      expect(Number(m[2])).toBeLessThanOrEqual(h)
    }
  })

  it('emits nothing for an empty nest', () => {
    expect(nestSVG([])).toBe('')
  })
})
