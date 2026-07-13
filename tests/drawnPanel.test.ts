import { describe, it, expect } from 'vitest'
import {
  mirrorOutline,
  resampleOutline,
  pointInPolygon,
  outlineArea,
  panelGrid,
  classifyBoundary,
  gridConstraints,
  gridTriangles,
  wrapDrawn,
  buildDrawnPanel,
  demoOutline,
  ROLE_FREE,
  ROLE_SEAM,
  ROLE_PIN,
  ROLE_HEM,
  type Pt,
  type DrawnGrid
} from '../src/renderer/pattern/drawnPanel'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'

/** A w×h rectangle outline (closed, CCW, top-left origin at (0, h)). */
const rect = (w: number, h: number): Pt[] => [
  { x: 0, y: h },
  { x: w, y: h },
  { x: w, y: 0 },
  { x: 0, y: 0 }
]

/** A hand-built FULL lattice (every node present) — lattice nodes that fall
 *  exactly on a drawn outline are include/exclude-ambiguous under ray casting,
 *  so exact structural assertions use this instead of `panelGrid`. */
const fullGrid = (cols: number, rows: number, spacing: number): DrawnGrid => {
  const index = new Int32Array(cols * rows)
  const pos2d = new Float32Array(cols * rows * 2)
  const maxY = (rows - 1) * spacing
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      index[i] = i
      pos2d[i * 2] = c * spacing
      pos2d[i * 2 + 1] = maxY - r * spacing
    }
  }
  return { cols, rows, spacing, index, pos2d, count: cols * rows, minX: 0, maxY }
}

describe('mirrorOutline', () => {
  it('closes a right half into a symmetric outline', () => {
    const half: Pt[] = [
      { x: 0, y: 1 },
      { x: 0.5, y: 1 },
      { x: 0.4, y: 0 },
      { x: 0, y: 0 }
    ]
    const out = mirrorOutline(half)
    // every off-axis point has its mirror twin
    for (const p of out) {
      if (p.x > 1e-4) expect(out.some((q) => Math.abs(q.x + p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9)).toBe(true)
    }
    // on-axis points are not duplicated
    expect(out.filter((p) => Math.abs(p.x) < 1e-9 && Math.abs(p.y - 1) < 1e-9)).toHaveLength(1)
    // area doubles the half's
    expect(Math.abs(outlineArea(out))).toBeCloseTo(2 * Math.abs(outlineArea(half)), 6)
  })

  it('clamps stray left-of-axis points onto the axis', () => {
    const out = mirrorOutline([
      { x: -0.05, y: 1 },
      { x: 0.5, y: 0.5 },
      { x: -0.02, y: 0 }
    ])
    expect(Math.min(...out.map((p) => p.x))).toBeGreaterThanOrEqual(-0.5 - 1e-9)
    expect(out.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
  })
})

describe('resampleOutline', () => {
  it('returns exactly n evenly spaced points around a square', () => {
    const out = resampleOutline(rect(1, 1), 40)
    expect(out).toHaveLength(40)
    const d = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y)
    for (let i = 0; i < out.length; i++) {
      expect(d(out[i], out[(i + 1) % out.length])).toBeCloseTo(4 / 40, 6)
    }
  })

  it('keeps the perimeter shape (all points on the square boundary)', () => {
    const out = resampleOutline(rect(1, 1), 24)
    for (const p of out) {
      const onEdge =
        Math.abs(p.x) < 1e-9 || Math.abs(p.x - 1) < 1e-9 || Math.abs(p.y) < 1e-9 || Math.abs(p.y - 1) < 1e-9
      expect(onEdge).toBe(true)
    }
  })
})

describe('pointInPolygon / outlineArea', () => {
  it('classifies inside/outside, including a concave notch', () => {
    const L: Pt[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 }
    ]
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, L)).toBe(true)
    expect(pointInPolygon({ x: 1.5, y: 0.5 }, L)).toBe(true)
    expect(pointInPolygon({ x: 1.5, y: 1.5 }, L)).toBe(false) // the notch
    expect(pointInPolygon({ x: -0.1, y: 0.5 }, L)).toBe(false)
    expect(Math.abs(outlineArea(L))).toBeCloseTo(3, 9)
  })
})

describe('panelGrid', () => {
  it('fills a rectangle with the full lattice', () => {
    // 0.1 spacing over a 0.4×0.6 rect → interior nodes at every lattice point
    const g = panelGrid(rect(0.4, 0.6), 0.1)
    expect(g.cols).toBe(5)
    expect(g.rows).toBe(7)
    // boundary lattice points sit ON the outline (ray-cast excludes some) — the
    // interior (cols-2)×(rows-2) block must all exist
    for (let r = 1; r < g.rows - 1; r++) {
      for (let c = 1; c < g.cols - 1; c++) {
        expect(g.index[r * g.cols + c]).toBeGreaterThanOrEqual(0)
      }
    }
    expect(g.count).toBeGreaterThanOrEqual((g.cols - 2) * (g.rows - 2))
    expect(g.pos2d).toHaveLength(g.count * 2)
  })

  it('masks a triangle to roughly half the lattice', () => {
    const tri: Pt[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 }
    ]
    const g = panelGrid(tri, 0.05)
    expect(g.count).toBeGreaterThan(0.35 * g.cols * g.rows)
    expect(g.count).toBeLessThan(0.65 * g.cols * g.rows)
  })

  it('records positions matching the lattice mapping', () => {
    const g = panelGrid(rect(0.4, 0.6), 0.1)
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        const i = g.index[r * g.cols + c]
        if (i < 0) continue
        // pos2d is Float32 — compare at f32 precision
        expect(g.pos2d[i * 2]).toBeCloseTo(g.minX + c * g.spacing, 6)
        expect(g.pos2d[i * 2 + 1]).toBeCloseTo(g.maxY - r * g.spacing, 6)
      }
    }
  })
})

describe('classifyBoundary', () => {
  it('full lattice: top pins, sides seam, bottom hems, interior free', () => {
    const g = fullGrid(5, 7, 0.1)
    const roles = classifyBoundary(g)
    const at = (c: number, r: number): number => roles[g.index[r * g.cols + c]]
    for (let c = 0; c < g.cols; c++) expect(at(c, 0)).toBe(ROLE_PIN)
    for (let r = 1; r < g.rows; r++) {
      expect(at(0, r)).toBe(ROLE_SEAM)
      expect(at(g.cols - 1, r)).toBe(ROLE_SEAM)
    }
    for (let c = 1; c < g.cols - 1; c++) expect(at(c, g.rows - 1)).toBe(ROLE_HEM)
    for (let r = 1; r < g.rows - 1; r++) {
      for (let c = 1; c < g.cols - 1; c++) expect(at(c, r)).toBe(ROLE_FREE)
    }
  })

  it('a deep scoop below the top band stays free (open neckline)', () => {
    const g = panelGrid(demoOutline(), 0.02)
    const roles = classifyBoundary(g)
    // find the centre column's topmost node — it's the scoop bottom, well below
    // the shoulder band, and must NOT pin
    const cMid = Math.round((0 - g.minX) / g.spacing)
    for (let r = 0; r < g.rows; r++) {
      const i = g.index[r * g.cols + cMid]
      if (i >= 0) {
        expect(roles[i]).not.toBe(ROLE_PIN)
        break
      }
    }
    // but the shoulders DO pin somewhere
    let pins = 0
    let seams = 0
    for (let i = 0; i < g.count; i++) {
      if (roles[i] === ROLE_PIN) pins++
      if (roles[i] === ROLE_SEAM) seams++
    }
    expect(pins).toBeGreaterThan(0)
    expect(seams).toBeGreaterThan(0)
  })
})

describe('gridConstraints / gridTriangles', () => {
  it('full lattice carries the standard recipe counts', () => {
    const g = fullGrid(5, 7, 0.1)
    const cons = gridConstraints(g)
    const structural = (g.cols - 1) * g.rows + g.cols * (g.rows - 1)
    const shear = 2 * (g.cols - 1) * (g.rows - 1)
    const bend = (g.cols - 2) * g.rows + g.cols * (g.rows - 2)
    expect(cons.filter((c) => !c.bend)).toHaveLength(structural + shear)
    expect(cons.filter((c) => c.bend)).toHaveLength(bend)
    expect(gridTriangles(g)).toHaveLength(3 * 2 * (g.cols - 1) * (g.rows - 1))
  })

  it('never references a missing node and keeps flat rest lengths', () => {
    const g = panelGrid(demoOutline(), 0.02)
    const cons = gridConstraints(g)
    expect(cons.length).toBeGreaterThan(0)
    for (const c of cons) {
      expect(c.i).toBeGreaterThanOrEqual(0)
      expect(c.i).toBeLessThan(g.count)
      expect(c.j).toBeGreaterThanOrEqual(0)
      expect(c.j).toBeLessThan(g.count)
      // rest = the flat 2D distance: spacing, √2·spacing (shear) or 2·spacing
      // (bend) — at Float32 position precision
      const ratios = [1, Math.SQRT2, 2]
      expect(ratios.some((k) => Math.abs(c.rest - k * g.spacing) < 1e-6)).toBe(true)
    }
    const tris = gridTriangles(g)
    expect(tris.length % 3).toBe(0)
    for (const t of tris) {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThan(g.count)
    }
  })
})

describe('wrapDrawn', () => {
  it('preserves arc length on the wrap radius and mirrors the back panel', () => {
    // a centred lattice (wrap expects a centred outline, as buildDrawnPanel makes)
    const g = fullGrid(5, 7, 0.05)
    for (let i = 0; i < g.count; i++) g.pos2d[i * 2] -= 0.1 // centre x on 0
    const R = 0.9 / (2 * Math.PI)
    const front = wrapDrawn(g, R, 'front', 1.34)
    const back = wrapDrawn(g, R, 'back', 1.34)
    for (let i = 0; i < g.count; i++) {
      // both panels sit on the cylinder (f32 precision)
      expect(Math.hypot(front[i * 3], front[i * 3 + 2])).toBeCloseTo(R, 6)
      expect(Math.hypot(back[i * 3], back[i * 3 + 2])).toBeCloseTo(R, 6)
      // same panel x → same world x (seam twins meet), opposite z hemisphere
      expect(back[i * 3]).toBeCloseTo(front[i * 3], 6)
      if (Math.abs(front[i * 3 + 2]) > 1e-7) {
        expect(Math.sign(back[i * 3 + 2])).toBe(-Math.sign(front[i * 3 + 2]))
      }
      // panel y is body-anchored: world y = baseY + panel y
      expect(front[i * 3 + 1]).toBeCloseTo(1.34 + g.pos2d[i * 2 + 1], 6)
    }
  })
})

describe('buildDrawnPanel', () => {
  const fabric = FABRICS.cotton

  it('sews the demo outline into a two-panel world with seams and pins', () => {
    const sewn = buildDrawnPanel(demoOutline(), { bust: 0.94 }, fabric)
    const g = panelGrid(resampleOutline(demoOutline(), 96), 0.02)
    expect(sewn.world.count).toBe(2 * g.count)
    expect(sewn.geometries).toHaveLength(2)
    expect(sewn.initial).toHaveLength(sewn.world.count * 3)
  })

  it('drapes headlessly without blowing up, pins holding', () => {
    const sewn = buildDrawnPanel(demoOutline(), { bust: 0.94 }, fabric)
    const before = sewn.world.positions.slice()
    for (let f = 0; f < 90; f++) sewn.world.step(1 / 60)
    const pos = sewn.world.positions
    for (let i = 0; i < pos.length; i++) expect(Number.isFinite(pos[i])).toBe(true)
    // pinned particles never moved
    for (let i = 0; i < sewn.world.count; i++) {
      if (sewn.world.invMass[i] === 0) {
        expect(pos[i * 3]).toBeCloseTo(before[i * 3], 6)
        expect(pos[i * 3 + 1]).toBeCloseTo(before[i * 3 + 1], 6)
        expect(pos[i * 3 + 2]).toBeCloseTo(before[i * 3 + 2], 6)
      }
    }
    // and something DID drape (unpinned cloth moved under gravity)
    let moved = 0
    for (let i = 0; i < sewn.world.count; i++) {
      if (sewn.world.invMass[i] > 0 && Math.abs(pos[i * 3 + 1] - before[i * 3 + 1]) > 1e-4) moved++
    }
    expect(moved).toBeGreaterThan(sewn.world.count / 4)
  })

  it('rejects degenerate sketches', () => {
    expect(() =>
      buildDrawnPanel(
        [
          { x: 0, y: 0 },
          { x: 0.001, y: 0 },
          { x: 0.001, y: 0.001 }
        ],
        { bust: 0.94 },
        fabric
      )
    ).toThrow()
  })
})
