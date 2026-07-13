import { describe, it, expect } from 'vitest'
import { dartWedge, outlinePointAt, demoInternalShapes, type Dart } from '../src/renderer/pattern/panelFeatures'
import { buildArrangedGarment, closeRegionStitches, ARRANGEMENT_POINTS } from '../src/renderer/pattern/arrangement'
import { panelGrid, classifyBoundary, gridConstraints, ROLE_FREE, type Pt } from '../src/renderer/pattern/drawnPanel'
import { outlinesToSVG } from '../src/renderer/pattern/styleLines'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'

const rect = (w: number, h: number): Pt[] => [
  { x: -w / 2, y: h },
  { x: w / 2, y: h },
  { x: w / 2, y: 0 },
  { x: -w / 2, y: 0 }
]

describe('panelGrid holes', () => {
  it('removes lattice nodes inside an internal cut-out', () => {
    const hole: Pt[] = [
      { x: -0.05, y: 0.35 },
      { x: 0.05, y: 0.35 },
      { x: 0.05, y: 0.25 },
      { x: -0.05, y: 0.25 }
    ]
    const plain = panelGrid(rect(0.3, 0.6), 0.02)
    const holed = panelGrid(rect(0.3, 0.6), 0.02, [hole])
    expect(holed.count).toBeLessThan(plain.count)
    // no surviving node sits inside the hole
    for (let i = 0; i < holed.count; i++) {
      const x = holed.pos2d[i * 2]
      const y = holed.pos2d[i * 2 + 1]
      expect(x > -0.05 && x < 0.05 && y > 0.25 && y < 0.35).toBe(false)
    }
    // constraints never reference removed nodes
    for (const c of gridConstraints(holed)) {
      expect(c.i).toBeLessThan(holed.count)
      expect(c.j).toBeLessThan(holed.count)
    }
  })

  it('hole borders stay FREE under classification (no phantom seams/pins)', () => {
    const hole: Pt[] = [
      { x: -0.05, y: 0.45 },
      { x: 0.05, y: 0.45 },
      { x: 0.05, y: 0.35 },
      { x: -0.05, y: 0.35 }
    ]
    const g = panelGrid(rect(0.3, 0.5), 0.02, [hole])
    const roles = classifyBoundary(g, 0.15, [hole])
    // nodes ringing the hole (within one spacing of it) must all be FREE
    for (let i = 0; i < g.count; i++) {
      const x = g.pos2d[i * 2]
      const y = g.pos2d[i * 2 + 1]
      const nearHole = x > -0.05 - 0.021 && x < 0.05 + 0.021 && y > 0.35 - 0.021 && y < 0.45 + 0.021
      const onOuter = Math.abs(x) > 0.15 - 0.021 || y < 0.021 || y > 0.5 - 0.021
      if (nearHole && !onOuter) expect(roles[i]).toBe(ROLE_FREE)
    }
  })
})

describe('dartWedge / closeRegionStitches', () => {
  const dart: Dart = { apex: { x: 0, y: 0.4 }, base: { x: 0, y: 0 }, width: 0.06 }

  it('builds a triangle from apex to the mouth corners', () => {
    const w = dartWedge(dart)
    expect(w).toHaveLength(3)
    expect(w[0]).toEqual(dart.apex)
    // mouth corners straddle the base symmetrically
    expect(w[1].y).toBeCloseTo(0, 9)
    expect(w[2].y).toBeCloseTo(0, 9)
    expect(w[1].x).toBeCloseTo(0.03, 9)
    expect(w[2].x).toBeCloseTo(-0.03, 9)
  })

  it('pairs the two sides of the wedge row by row', () => {
    const wedge = dartWedge(dart)
    const g = panelGrid(rect(0.3, 0.6), 0.02, [wedge])
    const pairs = closeRegionStitches(g, wedge)
    expect(pairs.length).toBeGreaterThan(3)
    for (const [l, r] of pairs) {
      // partners straddle the dart axis (x=0): left negative, right positive
      expect(g.pos2d[l * 2]).toBeLessThan(0)
      expect(g.pos2d[r * 2]).toBeGreaterThan(0)
      // and sit on the same lattice row
      expect(g.pos2d[l * 2 + 1]).toBeCloseTo(g.pos2d[r * 2 + 1], 6)
    }
  })

  it('sewing the darts takes up real fabric: the dart span narrows vs undarted', () => {
    const fabric = FABRICS.cotton
    const outline = rect(0.3, 0.5)
    const dartless = buildArrangedGarment(
      [{ outline, at: ARRANGEMENT_POINTS.front }],
      [],
      { bust: 0.94 },
      fabric
    )
    const wedge = dartWedge({ apex: { x: 0, y: 0.35 }, base: { x: 0, y: 0 }, width: 0.05 })
    const darted = buildArrangedGarment(
      [{ outline, at: ARRANGEMENT_POINTS.front, sewnHoles: [wedge] }],
      [],
      { bust: 0.94 },
      fabric
    )
    for (let f = 0; f < 150; f++) {
      dartless.world.step(1 / 60)
      darted.world.step(1 / 60)
    }
    // width of the bottom fifth (the dart mouth region) after settling
    const hemSpan = (world: typeof darted.world): number => {
      let min = Infinity
      let max = -Infinity
      for (let i = 0; i < world.count; i++) {
        if (world.positions[i * 3 + 1] < 0.84 + 0.1) {
          min = Math.min(min, world.positions[i * 3])
          max = Math.max(max, world.positions[i * 3])
        }
      }
      return max - min
    }
    expect(hemSpan(darted.world)).toBeLessThan(hemSpan(dartless.world) - 0.02)
  })
})

describe('outlinePointAt', () => {
  it('walks the perimeter by normalised arc length', () => {
    const sq = rect(1, 1) // perimeter 4, corners at t = 0, .25, .5, .75
    expect(outlinePointAt(sq, 0)).toEqual({ x: -0.5, y: 1 })
    const q = outlinePointAt(sq, 0.125)
    expect(q.x).toBeCloseTo(0, 9)
    expect(q.y).toBeCloseTo(1, 9)
  })
})

describe('demoInternalShapes', () => {
  it('drapes headlessly with darts + keyhole (finite)', () => {
    const { panels, seams } = demoInternalShapes()
    expect(panels[0].sewnHoles).toHaveLength(2)
    expect(panels[1].holes).toHaveLength(1)
    const sewn = buildArrangedGarment(panels, seams, { bust: 0.94 }, FABRICS.cotton)
    for (let f = 0; f < 90; f++) sewn.world.step(1 / 60)
    for (let i = 0; i < sewn.world.positions.length; i++) {
      expect(Number.isFinite(sewn.world.positions[i])).toBe(true)
    }
  })
})

describe('outlinesToSVG marks', () => {
  it('renders cut-outs, dart wedges, notches and drill holes', () => {
    const { panels } = demoInternalShapes()
    const svg = outlinesToSVG([
      {
        name: 'FRONT',
        outline: panels[0].outline,
        sewnHoles: panels[0].sewnHoles,
        notches: [0.1, 0.6],
        drills: [{ x: 0, y: 0.3 }]
      },
      { name: 'BACK', outline: panels[1].outline, holes: panels[1].holes }
    ])
    expect((svg.match(/stroke-dasharray="6 2 1 2"/g) ?? []).length).toBe(2) // dart wedges
    expect((svg.match(/stroke-dasharray="3 2"/g) ?? []).length).toBe(1) // keyhole
    expect((svg.match(/<line/g) ?? []).length).toBe(2) // notches
    expect((svg.match(/<circle/g) ?? []).length).toBe(1) // drill
  })
})
