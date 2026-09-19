import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { accessoryAnchors, jointEnd, limbDirection } from '../src/renderer/avatar/accessories'
import type { Capsule } from '../src/renderer/avatar/colliders'

const cap = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, radius: number): Capsule => ({
  a: new THREE.Vector3(ax, ay, az),
  b: new THREE.Vector3(bx, by, bz),
  radius
})

/** The 13 capsules `accessoryAnchors` reads, in the layout the mannequin builds. */
function body(): Capsule[] {
  return [
    cap(0, 1.61, 0, 0, 1.66, 0, 0.1), // 0 head
    cap(0, 1.46, 0, 0, 1.55, 0, 0.048), // 1 neck
    cap(0, 1.0, 0, 0, 1.42, 0, 0.15), // 2 torso
    cap(-0.15, 1.43, 0, 0.15, 1.43, 0, 0.05), // 3 shoulders
    cap(-0.14, 0.98, 0, 0.14, 0.98, 0, 0.14), // 4 hips
    cap(-0.19, 1.43, 0, -0.31, 1.1, 0.02, 0.05), // 5 armL upper
    cap(-0.31, 1.1, 0.02, -0.4, 0.82, 0.05, 0.042), // 6 armL fore
    cap(-0.1, 0.98, 0, -0.12, 0.52, 0.01, 0.088), // 7 legL upper
    cap(-0.12, 0.52, 0.01, -0.12, 0.08, 0.03, 0.06), // 8 legL lower
    cap(0.19, 1.43, 0, 0.31, 1.1, 0.02, 0.05), // 9 armR upper
    cap(0.31, 1.1, 0.02, 0.4, 0.82, 0.05, 0.042), // 10 armR fore
    cap(0.1, 0.98, 0, 0.12, 0.52, 0.01, 0.088), // 11 legR upper
    cap(0.12, 0.52, 0.01, 0.12, 0.08, 0.03, 0.06) // 12 legR lower
  ]
}

describe('jointEnd', () => {
  it('sits one radius back from the distal cap centre', () => {
    // `b` is the centre of the hemispherical end cap, so the shaft ends a radius earlier
    const c = cap(0, 1, 0, 0, 0, 0, 0.1)
    expect(jointEnd(c).y).toBeCloseTo(0.1, 10)
  })

  it('follows the limb axis, not the world axis', () => {
    const c = cap(0, 0, 0, 3, 4, 0, 0.5) // length 5, direction (0.6, 0.8)
    const j = jointEnd(c)
    expect(j.x).toBeCloseTo(3 - 0.5 * 0.6, 10)
    expect(j.y).toBeCloseTo(4 - 0.5 * 0.8, 10)
  })

  it('cannot invert past the midpoint on a short fat segment', () => {
    // a capsule shorter than its radius would otherwise put the "joint" behind `a`
    const c = cap(0, 0, 0, 0, 0.1, 0, 5)
    expect(jointEnd(c).y).toBeCloseTo(0.05, 10)
  })

  it('degenerates gracefully to the end point', () => {
    const c = cap(1, 2, 3, 1, 2, 3, 0.4)
    expect(jointEnd(c).toArray()).toEqual([1, 2, 3])
  })
})

describe('limbDirection', () => {
  it('is a unit vector pointing distally', () => {
    const d = limbDirection(cap(0, 0, 0, 0, -2, 0, 0.1))
    expect(d.length()).toBeCloseTo(1, 12)
    expect(d.y).toBeCloseTo(-1, 12)
  })

  it('falls back to straight down for a degenerate capsule', () => {
    expect(limbDirection(cap(0, 0, 0, 0, 0, 0, 0.1)).y).toBe(-1)
  })
})

describe('anatomical anchors', () => {
  const a = accessoryAnchors(body())

  it('puts the ankle above the foot, not at it', () => {
    // the foot centre is the cap centre; the ankle is the narrow joint above it
    expect(a.ankleL.y).toBeGreaterThan(a.footL.y)
    expect(a.ankleR.y).toBeGreaterThan(a.footR.y)
    // exactly one radius back ALONG THE LIMB AXIS — the shin is not quite vertical,
    // so the vertical component is slightly less than the radius and the 3D distance
    // is the invariant that actually holds
    expect(a.ankleL.distanceTo(a.footL)).toBeCloseTo(0.06, 9)
    expect(a.ankleL.y - a.footL.y).toBeLessThan(0.06)
  })

  it('puts the wrist proximal to the hand', () => {
    expect(a.wristL.distanceTo(a.handL)).toBeCloseTo(0.042, 6) // one forearm radius
    expect(a.wristR.distanceTo(a.handR)).toBeCloseTo(0.042, 6)
  })

  it('keeps left and right on their own sides', () => {
    expect(a.wristL.x).toBeLessThan(0)
    expect(a.wristR.x).toBeGreaterThan(0)
    expect(a.ankleL.x).toBeLessThan(0)
    expect(a.ankleR.x).toBeGreaterThan(0)
    expect(a.earL.x).toBeLessThan(0)
    expect(a.earR.x).toBeGreaterThan(0)
    expect(a.shoulderL.x).toBeLessThan(a.shoulderR.x)
  })

  it('is symmetric about the centre line on a symmetric body', () => {
    expect(a.earL.x).toBeCloseTo(-a.earR.x, 9)
    expect(a.earL.y).toBeCloseTo(a.earR.y, 9)
    expect(a.ankleL.y).toBeCloseTo(a.ankleR.y, 9)
  })

  it('places the ears on the head sphere, below its centre and slightly back', () => {
    const head = body()[0]
    // the visual cranium centre sits 0.35 radii above the collider point
    const centre = new THREE.Vector3(0, head.b.y + head.radius * 0.35, 0)
    expect(a.earL.distanceTo(centre)).toBeLessThan(head.radius * 1.4)
    expect(a.earL.y).toBeLessThan(centre.y) // ears are below the cranium centre
    expect(a.earL.z).toBeLessThan(0) // and a little behind the face plane
  })

  it('gives limb directions that point down the limb', () => {
    for (const d of [a.foreArmDirL, a.foreArmDirR, a.lowerLegDirL, a.lowerLegDirR]) {
      expect(d.length()).toBeCloseTo(1, 12)
      expect(d.y).toBeLessThan(0) // all four run downward on a standing body
    }
    expect(a.foreArmDirL.x).toBeLessThan(0) // left forearm also angles outward
    expect(a.foreArmDirR.x).toBeGreaterThan(0)
  })

  it('reports usable radii for sizing a cuff', () => {
    expect(a.wristR_).toBeGreaterThan(0)
    expect(a.ankleR_).toBeGreaterThan(0)
    expect(a.ankleR_).toBeGreaterThan(a.wristR_) // an ankle is thicker than a wrist
  })

  it('follows the body when it moves', () => {
    const moved = body().map((c) => ({ a: c.a.clone().setY(c.a.y + 0.5), b: c.b.clone().setY(c.b.y + 0.5), radius: c.radius }))
    const m = accessoryAnchors(moved)
    expect(m.ankleL.y - a.ankleL.y).toBeCloseTo(0.5, 9)
    expect(m.earL.y - a.earL.y).toBeCloseTo(0.5, 9)
    expect(m.wristL.y - a.wristL.y).toBeCloseTo(0.5, 9)
  })

  it('scales the landmarks when the body is resized', () => {
    // a thicker leg moves the ankle further from the foot centre, as it should
    const fat = body()
    fat[8] = { ...fat[8], radius: 0.12 }
    expect(accessoryAnchors(fat).ankleL.y - a.footL.y).toBeGreaterThan(a.ankleL.y - a.footL.y)
  })
})
