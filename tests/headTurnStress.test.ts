import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { headTurnAngles } from '../src/renderer/studio/headTurn'
import { buildTubeGarment, type TubeSpec } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

const knit: FabricParams = {
  mass: 0.25,
  stretchCompliance: 6e-5,
  bendCompliance: 5e-3,
  damping: 0.05,
  friction: 0.7,
  aero: 0,
  color: 0x808080
}

describe('head-turn stress captures', () => {
  it('sweeps a symmetric fan of turn angles including centre', () => {
    const a = headTurnAngles(5, 45)
    expect(a).toHaveLength(5)
    expect(a[0]).toBe(-45)
    expect(a[4]).toBe(45)
    expect(a[2]).toBe(0) // centre
    for (let i = 0; i < a.length; i++) expect(a[i] + a[a.length - 1 - i]).toBe(0) // symmetric
    expect(headTurnAngles(1)).toEqual([0])
  })

  it('turning the head strains the beanie — its crown seam pulls as the head rotates', () => {
    const R = 0.09
    const spec: TubeSpec = { rings: 8, radial: 20, topY: 1.66, bottomY: 1.5, radiusTop: 0.03, radiusBottom: R + 0.002 }
    const { positions, nx, ny, pinnedTop } = buildTubeGarment(spec)
    const s = new XPBDSolver(nx, ny, positions, knit, { wrapX: true, pinned: pinnedTop })
    const headCenter = new THREE.Vector3(0, 1.58, 0)
    s.colliders = [{ a: new THREE.Vector3(0, 1.5, 0), b: new THREE.Vector3(0, 1.62, 0), radius: R }]
    for (let i = 0; i < 140; i++) s.step(1 / 60) // settle at rest

    const strain = new Float32Array(s.count)
    s.strain(strain)
    const rest = Math.max(...strain)

    // snap the head (its collider + the pinned crown that rides it) to a 45° turn
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (45 * Math.PI) / 180)
    const rot = (v: THREE.Vector3): THREE.Vector3 => v.clone().sub(headCenter).applyQuaternion(q).add(headCenter)
    s.colliders = s.colliders.map((c) => ({ a: rot(c.a), b: rot(c.b), radius: c.radius }))
    for (const k of pinnedTop) {
      const p = rot(new THREE.Vector3(positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]))
      positions[k * 3] = p.x
      positions[k * 3 + 1] = p.y
      positions[k * 3 + 2] = p.z
    }
    // the free rows lag behind the turned crown → the knit stretches
    let peak = 0
    for (let i = 0; i < 12; i++) {
      s.step(1 / 60)
      s.strain(strain)
      peak = Math.max(peak, Math.max(...strain))
    }
    expect(peak).toBeGreaterThan(rest) // the turn induces extra strain
    for (const v of positions) expect(Number.isFinite(v)).toBe(true)
  })
})
