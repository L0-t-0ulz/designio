import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { buildHangerProp, hangerCapsule } from '../src/renderer/studio/hangerShot'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import { buildTubeGarment, type TubeSpec } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

const fabric: FabricParams = {
  mass: 0.3,
  stretchCompliance: 1e-5,
  bendCompliance: 2e-3,
  damping: 0.05,
  friction: 0.5,
  aero: 0,
  color: 0x808080
}

describe('hanger shot', () => {
  it('the bar spans just inside the shoulders at shoulder height, wire-thin', () => {
    const bar = hangerCapsule(MEASUREMENTS)
    expect(bar.a.y).toBeCloseTo(MEASUREMENTS.shoulderY, 10)
    expect(bar.b.x).toBeCloseTo(MEASUREMENTS.shoulderHalfX * 0.92, 10)
    expect(bar.a.x).toBeCloseTo(-bar.b.x, 10)
    expect(bar.radius).toBeLessThan(0.02)
  })

  it('the prop builds a hook above the bar', () => {
    const prop = buildHangerProp(MEASUREMENTS)
    const box = new THREE.Box3().setFromObject(prop)
    expect(box.max.y).toBeGreaterThan(MEASUREMENTS.shoulderY + 0.05) // the hook rises
    expect(box.max.x).toBeGreaterThan(MEASUREMENTS.shoulderHalfX * 0.8) // the bar spans
    expect(prop.children.length).toBeGreaterThanOrEqual(5)
  })

  it('hanging on the bar loses the body: a snug tube relaxes to rest instead of being pushed wide', () => {
    // drafted SMALLER than the worn body: worn = pushed out to the body radius,
    // hung = nothing inside, so it settles at its own rest width
    const spec: TubeSpec = { rings: 10, radial: 16, topY: 1.42, bottomY: 1.0, radiusTop: 0.15, radiusBottom: 0.15 }
    const settle = (colliders: ReturnType<typeof hangerCapsule>[]): number => {
      const { positions, nx, ny, pinnedTop } = buildTubeGarment(spec)
      const s = new XPBDSolver(nx, ny, positions, fabric, { wrapX: true, pinned: pinnedTop })
      s.colliders = colliders
      for (let i = 0; i < 120; i++) s.step(1 / 60)
      // waist-level width: the max |x| across the middle ring
      const iy = Math.floor(ny / 2)
      let w = 0
      for (let ix = 0; ix < nx; ix++) w = Math.max(w, Math.abs(positions[(iy * nx + ix) * 3]))
      return w
    }
    const worn = settle([{ a: new THREE.Vector3(0, 1.45, 0), b: new THREE.Vector3(0, 0.95, 0), radius: 0.18 }])
    const hung = settle([hangerCapsule(MEASUREMENTS)])
    expect(hung).toBeLessThan(worn * 0.95) // no body inside — the snug tube relaxes to rest
  })
})
