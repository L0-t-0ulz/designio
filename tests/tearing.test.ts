import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { buildTubeGarment, tornCellsForPair, tubeIndices, type TubeSpec } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

const fabric: FabricParams = {
  mass: 0.25,
  stretchCompliance: 1e-6, // stiff — strain shows up as tension, not stretch absorption
  bendCompliance: 1e-3,
  damping: 0.02,
  friction: 0.4,
  aero: 0,
  color: 0x808080
}

describe('cloth tearing', () => {
  it('tornCellsForPair: horizontal edges drop the cells above+below; vertical left+right; diagonal its own; wrap-aware', () => {
    const nx = 8
    const ny = 5
    // horizontal pair (2,2)-(3,2): cells (2,1) and (2,2)
    expect(tornCellsForPair(2 * nx + 2, 2 * nx + 3, nx, ny).sort()).toEqual([1 * nx + 2, 2 * nx + 2].sort())
    // vertical pair (4,1)-(4,2): cells (3,1) and (4,1)
    expect(tornCellsForPair(1 * nx + 4, 2 * nx + 4, nx, ny).sort()).toEqual([1 * nx + 3, 1 * nx + 4].sort())
    // diagonal (2,2)-(3,3): its own cell (2,2)
    expect(tornCellsForPair(2 * nx + 2, 3 * nx + 3, nx, ny)).toEqual([2 * nx + 2])
    // wrap pair (7,2)-(0,2): the wrap cell column 7 above+below
    expect(tornCellsForPair(2 * nx + 7, 2 * nx + 0, nx, ny).sort()).toEqual([1 * nx + 7, 2 * nx + 7].sort())
    // top-row horizontal pair only has the cell below (no row −1)
    expect(tornCellsForPair(2, 3, nx, ny)).toEqual([2])
  })

  it('tubeIndices drops 2 triangles per torn cell and keeps the panel groups partitioned', () => {
    const full = tubeIndices(12, 6)
    const torn = tubeIndices(12, 6, { torn: new Set([2 * 12 + 3, 4 * 12 + 9]) })
    expect(full.indices.length - torn.indices.length).toBe(12) // 2 cells × 2 tris × 3 idx
    expect(torn.frontCount).toBe(full.frontCount - 6) // cell (3,2) is a front column
    // composes with the functional-opening slit
    const open = tubeIndices(12, 6, { openFront: true, torn: new Set([0]) })
    expect(open.indices.length).toBe(full.indices.length - 5 * 6 - 6) // slit column (5 rows) + 1 torn cell
  })

  it('a garment stretched past the threshold rips; below it, nothing tears', () => {
    const spec: TubeSpec = { rings: 8, radial: 12, topY: 1.4, bottomY: 1.0, radiusTop: 0.12, radiusBottom: 0.12 }
    const run = (threshold: number): { torn: number; constraintsLost: number } => {
      const { positions, nx, ny, pinnedTop } = buildTubeGarment(spec)
      const s = new XPBDSolver(nx, ny, positions, fabric, { wrapX: true, pinned: pinnedTop })
      // a body far too big for the tube — a guaranteed overstretch
      s.colliders = [{ a: new THREE.Vector3(0, 1.45, 0), b: new THREE.Vector3(0, 0.95, 0), radius: 0.2 }]
      s.tearThreshold = threshold
      let tornPairs = 0
      s.onTear = (pairs) => (tornPairs += pairs.length)
      type Con = { i: number }
      const before = (s as unknown as { constraints: Con[] }).constraints.length
      for (let i = 0; i < 60; i++) s.step(1 / 60)
      const after = (s as unknown as { constraints: Con[] }).constraints.length
      return { torn: tornPairs, constraintsLost: before - after }
    }
    const ripped = run(0.3) // rips past 30% strain — the 0.2 m body forces ~60%+
    expect(ripped.torn).toBeGreaterThan(0)
    expect(ripped.constraintsLost).toBe(ripped.torn) // exactly the reported pairs were removed
    const held = run(0) // 0 = tearing off
    expect(held.torn).toBe(0)
    expect(held.constraintsLost).toBe(0)
  })
})
