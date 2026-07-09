import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { accessoryAnchors, ACCESSORY_KINDS, Accessories } from '../src/renderer/avatar/accessories'
import type { Capsule } from '../src/renderer/avatar/colliders'

// A minimal 13-capsule body matching the mannequin's base layout (a/b endpoints).
const cap = (a: [number, number, number], b: [number, number, number], r: number): Capsule => ({
  a: new THREE.Vector3(...a),
  b: new THREE.Vector3(...b),
  radius: r
})
function baseBody(): Capsule[] {
  return [
    cap([0, 1.61, 0], [0, 1.66, 0], 0.1), // 0 head (b = crown)
    cap([0, 1.46, 0], [0, 1.55, 0], 0.048), // 1 neck
    cap([0, 1.0, 0], [0, 1.42, 0], 0.15), // 2 torso
    cap([-0.15, 1.43, 0], [0.15, 1.43, 0], 0.05), // 3 shoulder line
    cap([-0.14, 0.98, 0], [0.14, 0.98, 0], 0.14), // 4 hip line
    cap([-0.19, 1.43, 0], [-0.31, 1.1, 0.02], 0.05), // 5 L upper arm
    cap([-0.31, 1.1, 0.02], [-0.4, 0.82, 0.05], 0.042), // 6 L forearm (b = hand)
    cap([-0.1, 0.98, 0], [-0.12, 0.52, 0.01], 0.088), // 7 L upper leg
    cap([-0.12, 0.52, 0.01], [-0.12, 0.08, 0.03], 0.06), // 8 L lower leg (b = foot)
    cap([0.19, 1.43, 0], [0.31, 1.1, 0.02], 0.05), // 9 R upper arm
    cap([0.31, 1.1, 0.02], [0.4, 0.82, 0.05], 0.042), // 10 R forearm (b = hand)
    cap([0.1, 0.98, 0], [0.12, 0.52, 0.01], 0.088), // 11 R upper leg
    cap([0.12, 0.52, 0.01], [0.12, 0.08, 0.03], 0.06) // 12 R lower leg (b = foot)
  ]
}

describe('accessories — body attach anchors', () => {
  it('exposes the accessory set incl. headwear & neckwear', () => {
    expect(ACCESSORY_KINDS).toEqual(['shoes', 'belt', 'hat', 'bag', 'beanie', 'cap', 'bucket', 'balaclava', 'scarf', 'gaiter'])
  })

  it('hat sits at the crown, feet at the ankles', () => {
    const a = accessoryAnchors(baseBody())
    expect(a.headTop.y).toBeCloseTo(1.66, 5) // crown
    expect(a.headR).toBeCloseTo(0.1, 5)
    expect(a.footL.y).toBeCloseTo(0.08, 5) // near the floor
    expect(a.footR.y).toBeCloseTo(0.08, 5)
    expect(a.footL.x).toBeLessThan(0) // left foot on −x
    expect(a.footR.x).toBeGreaterThan(0)
  })

  it('the belt sits at the waist — above the hips, below the chest', () => {
    const a = accessoryAnchors(baseBody())
    expect(a.waist.y).toBeGreaterThan(0.98) // above the hip line
    expect(a.waist.y).toBeLessThan(1.2) // below the upper chest
    expect(Math.abs(a.waist.x)).toBeLessThan(0.02) // centred
    expect(a.waistR).toBeGreaterThan(0)
  })

  it('the bag hangs off the left hand', () => {
    const a = accessoryAnchors(baseBody())
    expect(a.handL.x).toBeLessThan(0) // −x side
    expect(a.handL.y).toBeCloseTo(0.82, 5)
  })

  it('anchors follow the body — shift the whole skeleton, anchors shift with it', () => {
    const shifted = baseBody().map((c) => ({ a: c.a.clone().add(new THREE.Vector3(0.5, 0, 0)), b: c.b.clone().add(new THREE.Vector3(0.5, 0, 0)), radius: c.radius }))
    const a = accessoryAnchors(shifted)
    expect(a.headTop.x).toBeCloseTo(0.5, 5)
    expect(a.footL.x).toBeCloseTo(-0.12 + 0.5, 5)
  })
})

const rotYBody = (rad: number): Capsule[] => {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rad)
  return baseBody().map((c) => ({ a: c.a.clone().applyQuaternion(q), b: c.b.clone().applyQuaternion(q), radius: c.radius }))
}

describe('accessories — headwear / neckwear anchors', () => {
  it('the head basis is orthonormal — forward +z / up +y / right +x at rest', () => {
    const a = accessoryAnchors(baseBody())
    expect(a.headUp.y).toBeCloseTo(1, 5)
    expect(a.headFwd.z).toBeCloseTo(1, 5)
    expect(a.headRight.x).toBeCloseTo(1, 5)
    expect(a.headFwd.dot(a.headUp)).toBeCloseTo(0, 5)
    expect(a.headFwd.dot(a.headRight)).toBeCloseTo(0, 5)
    expect(a.headUp.dot(a.headRight)).toBeCloseTo(0, 5)
  })

  it('the head basis turns with the body (a 90° turn rotates forward off +z)', () => {
    const a = accessoryAnchors(rotYBody(Math.PI / 2))
    expect(Math.abs(a.headFwd.z)).toBeLessThan(0.2)
    expect(Math.abs(a.headFwd.x)).toBeGreaterThan(0.8)
  })

  it('the neck anchor sits at the neck capsule + follows a body shift', () => {
    const a = accessoryAnchors(baseBody())
    expect(a.neck.y).toBeCloseTo((1.46 + 1.55) / 2, 5)
    expect(a.neckR).toBeCloseTo(0.048, 5)
    const shifted = baseBody().map((c) => ({ a: c.a.clone().add(new THREE.Vector3(0, 0, 0.3)), b: c.b.clone().add(new THREE.Vector3(0, 0, 0.3)), radius: c.radius }))
    expect(accessoryAnchors(shifted).neck.z).toBeCloseTo(0.3, 5)
  })
})

describe('accessories — worn headwear/neckwear meshes ride the head/neck', () => {
  it('each new kind builds visible geometry positioned up around the head/neck', () => {
    const acc = new Accessories()
    const kinds = ['beanie', 'cap', 'bucket', 'balaclava', 'scarf', 'gaiter'] as const
    for (const k of kinds) {
      acc.setEnabled(k, true)
      expect(acc.isEnabled(k)).toBe(true)
    }
    acc.update(baseBody())
    acc.group.updateMatrixWorld(true)
    const visible = acc.group.children.filter((o) => o.visible)
    expect(visible.length).toBe(kinds.length)
    for (const g of visible) {
      const box = new THREE.Box3().setFromObject(g)
      expect(box.max.y).toBeGreaterThan(1.2) // up at the head/neck, not the feet
      expect(box.min.y).toBeGreaterThan(1.0)
      expect(box.max.y).toBeLessThan(2.0) // sane — not exploded
    }
  })
})
