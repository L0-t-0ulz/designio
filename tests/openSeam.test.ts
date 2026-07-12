import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { buildTubeGarment, openSeamColumn, type TubeSpec } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { buildGarment } from '../src/renderer/garments/factory'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer, gradeParams, parseDoc, serializeDoc, type ProjectDoc } from '../src/renderer/studio/document'

const fabric: FabricParams = {
  mass: 0.3,
  stretchCompliance: 1e-6,
  bendCompliance: 1e-3,
  damping: 0.02,
  friction: 0.5,
  aero: 0,
  color: 0x808080
}

const spec: TubeSpec = { rings: 6, radial: 12, topY: 1.4, bottomY: 1.0, radiusTop: 0.16, radiusBottom: 0.2 }

describe('functional openings (worn-open placket/zip)', () => {
  it('openSeamColumn puts the slit boundary within half a column of centre-front (+z)', () => {
    for (const nx of [8, 12, 24, 36, 48]) {
      const c = openSeamColumn(nx)
      const boundaryAngle = ((c + 0.5) / nx) * Math.PI * 2 // midpoint of the edge between columns c and c+1
      expect(Math.abs(boundaryAngle - Math.PI / 2)).toBeLessThanOrEqual(Math.PI / nx + 1e-9)
      expect(c).toBeGreaterThan(0)
      expect(c).toBeLessThan(Math.floor(nx / 2)) // inside the front panel's column range
    }
  })

  it('cutSeam removes exactly the constraints crossing the boundary (verticals survive)', () => {
    const { positions, nx, ny } = buildTubeGarment(spec)
    const s = new XPBDSolver(nx, ny, positions, fabric, { wrapX: true })
    type Con = { i: number; j: number }
    const cons = (): Con[] => (s as unknown as { constraints: Con[] }).constraints
    const col = openSeamColumn(nx)
    const crosses = (i: number, j: number): boolean => {
      const a = i % nx
      const b = j % nx
      let d = (b - a + nx) % nx
      let start = a
      if (d > nx / 2) {
        d = nx - d
        start = b
      }
      return (col - start + nx) % nx < d
    }
    const before = cons().length
    const crossing = cons().filter((c) => crosses(c.i, c.j)).length
    const vertical = cons().filter((c) => c.i % nx === c.j % nx).length
    expect(crossing).toBeGreaterThan(0)
    s.cutSeam(col)
    expect(cons().length).toBe(before - crossing)
    expect(cons().some((c) => crosses(c.i, c.j))).toBe(false)
    expect(cons().filter((c) => c.i % nx === c.j % nx).length).toBe(vertical) // same-column constraints untouched
  })

  it('physically gaps: a tube squeezed over a fat capsule pops open at the cut seam', () => {
    const gapAfterSettle = (cut: boolean): number => {
      const { positions, nx, ny, pinnedTop } = buildTubeGarment(spec)
      const s = new XPBDSolver(nx, ny, positions, fabric, { wrapX: true, pinned: pinnedTop })
      const col = openSeamColumn(nx)
      if (cut) s.cutSeam(col)
      // a capsule fatter than the tube's rest radius — a too-tight jacket
      s.colliders = [{ a: new THREE.Vector3(0, 1.45, 0), b: new THREE.Vector3(0, 0.95, 0), radius: 0.24 }]
      for (let i = 0; i < 90; i++) s.step(1 / 60)
      const iy = ny - 1 // hem ring
      const a = (iy * nx + col) * 3
      const b = (iy * nx + ((col + 1) % nx)) * 3
      return Math.hypot(positions[b] - positions[a], positions[b + 1] - positions[a + 1], positions[b + 2] - positions[a + 2])
    }
    const closed = gapAfterSettle(false)
    const open = gapAfterSettle(true)
    expect(open).toBeGreaterThan(closed * 1.5) // the unsewn edges part; the sewn seam holds
  })

  it('the render mesh drops one quad column below the slit (front group only shrinks)', () => {
    const closed = buildTubeGarment(spec)
    const open = buildTubeGarment({ ...spec, openFront: true })
    const closedIdx = closed.geometry.getIndex()!.count
    const openIdx = open.geometry.getIndex()!.count
    expect(closedIdx - openIdx).toBe(6 * (spec.rings - 1)) // 2 tris × (ny−1) rows
    const groups = open.geometry.groups
    expect(groups.map((g) => g.count).reduce((s, c) => s + c, 0)).toBe(openIdx) // groups still partition
  })

  it('factory: closure + closureOpen sets the body piece cut; closed closure does not', () => {
    const mann = buildMannequin()
    const def = getGarment('hoodie')
    const params = gradeParams({ ...defaultLayer('hoodie'), closure: true, closureOpen: true })
    const open = buildGarment(def, params, mann.measurements, mann.colliders)
    const body = open.find((p) => p.name === 'Body')!
    expect(body.cutCol).toBe(openSeamColumn(body.build.nx))
    const closedParams = gradeParams({ ...defaultLayer('hoodie'), closure: true })
    const closed = buildGarment(def, closedParams, mann.measurements, mann.colliders)
    expect(closed.find((p) => p.name === 'Body')!.cutCol).toBeUndefined()
  })

  it('closureOpen round-trips through the .dio doc', () => {
    const doc: ProjectDoc = {
      version: 1,
      body: { bodyType: 'female', height: 1, build: 1, bust: 1, waist: 1, hips: 1 },
      scene: { gravity: 9.81, windX: 0, windZ: 0, animMode: 'static', animSpeed: 1 },
      layers: [{ ...defaultLayer('hoodie'), closure: true, closureOpen: true }],
      activeIndex: 0
    }
    expect(parseDoc(serializeDoc(doc)).layers[0].closureOpen).toBe(true)
  })
})
