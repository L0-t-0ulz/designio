import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import type { Capsule } from '../src/renderer/avatar/colliders'
import { headFrame } from '../src/renderer/avatar/face'
import { headAnchor, buildMannequin } from '../src/renderer/avatar/Mannequin'

/** A minimal capsule array with a real head (0) + shoulder (3), optionally turned about y. */
function makeColliders(rotY = 0): Capsule[] {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
  const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z).applyQuaternion(q)
  const c: Capsule[] = []
  for (let i = 0; i < 13; i++) c.push({ a: v(0, 0, 0), b: v(0, 0, 0), radius: 0.05 })
  c[0] = { a: v(0, 1.61, 0), b: v(0, 1.66, 0), radius: 0.1 } // head (b = crown)
  c[3] = { a: v(-0.15, 1.43, 0), b: v(0.15, 1.43, 0), radius: 0.05 } // shoulder (a=left → b=right)
  return c
}

const basisOf = (m: THREE.Matrix4): { x: THREE.Vector3; y: THREE.Vector3; z: THREE.Vector3 } => {
  const x = new THREE.Vector3()
  const y = new THREE.Vector3()
  const z = new THREE.Vector3()
  m.extractBasis(x, y, z)
  return { x, y, z }
}

describe('headAnchor', () => {
  it('is the crown position + the head basis', () => {
    const c = makeColliders()
    const hf = headFrame(c)
    const m = headAnchor(c)
    expect(new THREE.Vector3().setFromMatrixPosition(m).distanceTo(hf.crown)).toBeCloseTo(0, 6)
    const { x, y, z } = basisOf(m)
    expect(x.distanceTo(hf.right)).toBeCloseTo(0, 6) // column 0 = right
    expect(y.distanceTo(hf.up)).toBeCloseTo(0, 6) // column 1 = up
    expect(z.distanceTo(hf.forward)).toBeCloseTo(0, 6) // column 2 = forward
  })

  it('turns with the body (a 90° turn rotates forward off +z)', () => {
    const { z } = basisOf(headAnchor(makeColliders(Math.PI / 2)))
    expect(Math.abs(z.z)).toBeLessThan(0.2)
    expect(Math.abs(z.x)).toBeGreaterThan(0.8)
  })

  it('is a rigid frame — orthonormal, no scale', () => {
    for (const rot of [0, 0.7, -1.3, Math.PI]) {
      const { x, y, z } = basisOf(headAnchor(makeColliders(rot)))
      expect(x.length()).toBeCloseTo(1, 6)
      expect(y.length()).toBeCloseTo(1, 6)
      expect(z.length()).toBeCloseTo(1, 6)
      expect(x.dot(y)).toBeCloseTo(0, 6)
      expect(x.dot(z)).toBeCloseTo(0, 6)
      expect(y.dot(z)).toBeCloseTo(0, 6)
    }
  })

  it('writes into the provided out matrix (no per-call allocation)', () => {
    const out = new THREE.Matrix4()
    expect(headAnchor(makeColliders(), out)).toBe(out)
  })

  it('the mannequin exposes a head anchor up at the crown, alongside the body anchors', () => {
    const a = buildMannequin().anchors()
    const pos = new THREE.Vector3().setFromMatrixPosition(a.head)
    expect(pos.y).toBeGreaterThan(1.4) // up at the head, not the torso
    // it sits above the torso/hip anchors
    expect(pos.y).toBeGreaterThan(new THREE.Vector3().setFromMatrixPosition(a.torso).y)
    const { x, y, z } = basisOf(a.head)
    expect(x.length()).toBeCloseTo(1, 5)
    expect(y.length()).toBeCloseTo(1, 5)
    expect(z.length()).toBeCloseTo(1, 5)
  })
})
