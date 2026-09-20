import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { accessoryAnchors, limbJoint, limbDirection, placeFoot } from '../src/renderer/avatar/accessories'
import { WRIST_AT_T, ANKLE_AT_T, WRIST_TO_FOREARM, ANKLE_TO_CALF, HAND_REACH_R } from '../src/renderer/avatar/wornSizing'
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

describe('limbJoint', () => {
  it('lands at the measured fraction along the limb', () => {
    const c = cap(0, 1, 0, 0, 0, 0, 0.1)
    expect(limbJoint(c, 0.95).y).toBeCloseTo(0.05, 10)
    expect(limbJoint(c, 0).y).toBeCloseTo(1, 10)
    expect(limbJoint(c, 1).y).toBeCloseTo(0, 10)
  })

  it('follows the limb axis, not the world axis', () => {
    const c = cap(0, 0, 0, 3, 4, 0, 0.5) // length 5, direction (0.6, 0.8)
    const j = limbJoint(c, 0.9)
    expect(j.x).toBeCloseTo(2.7, 10)
    expect(j.y).toBeCloseTo(3.6, 10)
  })

  it('degenerates to the point when the capsule has no length', () => {
    expect(limbJoint(cap(1, 2, 3, 1, 2, 3, 0.4), 0.9).toArray()).toEqual([1, 2, 3])
  })

  it('does not mutate the capsule', () => {
    const c = cap(0, 1, 0, 0, 0, 0, 0.1)
    limbJoint(c, 0.5)
    expect(c.a.toArray()).toEqual([0, 1, 0])
    expect(c.b.toArray()).toEqual([0, 0, 0])
  })

  it('places the joints where the limb is measured to narrow, near but not at the end', () => {
    // the capsule radius is the forearm's belly / the calf, so a joint cannot be
    // found by stepping back from `b` by it — `?probeTaper=1` locates them instead
    for (const t of [WRIST_AT_T, ANKLE_AT_T]) {
      expect(t).toBeGreaterThan(0.85)
      expect(t).toBeLessThan(1)
    }
    // and the joint is markedly thinner than the capsule that encloses the limb
    // both sit in the band real anthropometry gives — a ~17 cm wrist on a ~24 cm
    // forearm, a ~22 cm ankle on a ~35 cm calf — which is the cross-check that
    // caught a bad measurement that had put the ankle at 0.3
    for (const k of [WRIST_TO_FOREARM, ANKLE_TO_CALF]) {
      expect(k).toBeGreaterThan(0.5)
      expect(k).toBeLessThan(0.8)
    }
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
    const leg = body()[8]
    const len = leg.a.distanceTo(leg.b)
    expect(a.ankleL.y).toBeGreaterThan(a.footL.y)
    expect(a.ankleR.y).toBeGreaterThan(a.footR.y)
    // at the measured fraction ALONG THE LIMB AXIS — the shin is not quite vertical,
    // so the vertical drop is slightly less and the 3D distance is the invariant
    expect(a.ankleL.distanceTo(a.footL)).toBeCloseTo(len * (1 - ANKLE_AT_T), 9)
    expect(a.ankleL.y - a.footL.y).toBeLessThan(len * (1 - ANKLE_AT_T))
  })

  it('puts the wrist proximal to the hand', () => {
    const fore = body()[6]
    const len = fore.a.distanceTo(fore.b)
    expect(a.wristL.distanceTo(a.handL)).toBeCloseTo(len * (1 - WRIST_AT_T), 9)
    expect(a.wristR.distanceTo(a.handR)).toBeCloseTo(len * (1 - WRIST_AT_T), 9)
  })

  it('reports the JOINT radius, not the capsule that encloses the limb', () => {
    // the bug this replaced: a sock cuff sized from the calf radius came out a
    // bucket, and an ankle chain read as a hoop
    expect(a.ankleR_).toBeLessThan(body()[8].radius)
    expect(a.wristR_).toBeLessThan(body()[6].radius)
    expect(a.ankleR_).toBeCloseTo(body()[8].radius * ANKLE_TO_CALF, 9)
    expect(a.wristR_).toBeCloseTo(body()[6].radius * WRIST_TO_FOREARM, 9)
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

  it('places the ears against the rendered head, not against the collider sphere', () => {
    // This is where the anchor was wrong first time round: a fixed fraction below
    // the *collider point* landed it up on the parietal skull. The rendered head runs
    // crown (b + r) to chin (a − r) — verified by raycast, `?probeHead=1` — so the ear
    // is checked against that span and the proportions that live on it.
    const head = body()[0]
    const crown = head.b.y + head.radius
    const chin = head.a.y - head.radius
    const height = crown - chin
    for (const ear of [a.earL, a.earR]) {
      const down = (crown - ear.y) / height // fraction of the head height below the crown
      expect(down).toBeGreaterThan(0.4) // below the brow
      expect(down).toBeLessThan(0.75) // above the base of the nose
      // outboard of half the eye separation — an ear is on the side of the head
      expect(Math.abs(ear.x)).toBeGreaterThan(head.radius * 0.5)
      // and inside the measured head breadth, so it is not floating off the skull
      expect(Math.abs(ear.x)).toBeLessThan(head.radius * 0.87)
      expect(ear.z).toBeLessThan(0) // a little behind the mid-coronal plane
    }
  })

  it('hangs the earlobes below the ears, mirrored', () => {
    expect(a.lobeL.y).toBeLessThan(a.earL.y)
    expect(a.lobeR.y).toBeLessThan(a.earR.y)
    expect(a.lobeL.y).toBeCloseTo(a.lobeR.y, 9)
    expect(a.lobeL.x).toBeCloseTo(-a.lobeR.x, 9)
    expect(a.lobeL.x).toBeLessThan(0) // left lobe on the avatar's left
    // still on the ear: the drop is part of the auricle, not a whole head
    const h = body()[0]
    expect(a.earL.y - a.lobeL.y).toBeLessThan((h.a.distanceTo(h.b) + 2 * h.radius) * 0.2)
    // and the lobe tucks in as the head tapers toward the jaw
    expect(Math.abs(a.lobeL.x)).toBeLessThan(Math.abs(a.earL.x))
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
    // both are the JOINT's radius, so both are well inside the capsule that has to
    // enclose the limb. (On a real body an ankle is thicker than a wrist; on this
    // rig the measured shank tapers harder than the forearm, so that is not asserted
    // — the numbers come from the model, not from an anatomy textbook.)
    expect(a.ankleR_).toBeLessThan(body()[8].radius)
    expect(a.wristR_).toBeLessThan(body()[6].radius)
  })

  it('follows the body when it moves', () => {
    const moved = body().map((c) => ({ a: c.a.clone().setY(c.a.y + 0.5), b: c.b.clone().setY(c.b.y + 0.5), radius: c.radius }))
    const m = accessoryAnchors(moved)
    expect(m.ankleL.y - a.ankleL.y).toBeCloseTo(0.5, 9)
    expect(m.earL.y - a.earL.y).toBeCloseTo(0.5, 9)
    expect(m.wristL.y - a.wristL.y).toBeCloseTo(0.5, 9)
  })

  it('scales the joint radius with the limb, and its position with the limb length', () => {
    const fat = body()
    fat[8] = { ...fat[8], radius: 0.12 } // a thicker leg → a thicker ankle
    expect(accessoryAnchors(fat).ankleR_).toBeCloseTo(a.ankleR_ * 2, 9)
    // but NOT a lower ankle: where the limb narrows is a fraction of its length,
    // which is why the position no longer moves when only the radius changes
    expect(accessoryAnchors(fat).ankleL.y).toBeCloseTo(a.ankleL.y, 12)

    const long = body()
    long[8] = { ...long[8], b: long[8].b.clone().setY(long[8].b.y - 0.2) }
    const l = accessoryAnchors(long)
    expect(l.ankleL.y).toBeLessThan(a.ankleL.y) // a longer shank puts the ankle lower
    expect(a.ankleL.y - l.ankleL.y).toBeCloseTo(0.2 * ANKLE_AT_T, 9)
  })
})

describe('extremity frames', () => {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

  it('falls back to the limb axis when the rig offers no tip bones', () => {
    // the procedural body has no skeleton, so a hand can only point down its forearm
    const a = accessoryAnchors(body())
    expect(a.handDirL.distanceTo(a.foreArmDirL)).toBeCloseTo(0, 9)
    expect(a.footDirL.distanceTo(a.lowerLegDirL)).toBeCloseTo(0, 9)
    expect(a.handL.distanceTo(body()[6].b)).toBeCloseTo(0, 9)
  })

  it('takes the rig’s joint, heading and fingertip when it has them', () => {
    const a = accessoryAnchors(body(), {
      handL: { at: v(-0.5, 0.8, 0.1), dir: v(0, 0, 1), tip: v(-0.5, 0.8, 0.28) },
      footL: { at: v(-0.2, 0.09, 0), dir: v(-0.3, 0, 0.954) }
    })
    expect(a.handL.toArray()).toEqual([-0.5, 0.8, 0.1])
    expect(a.handDirL.toArray()).toEqual([0, 0, 1])
    expect(a.fingertipL.toArray()).toEqual([-0.5, 0.8, 0.28]) // the bone, exactly
    expect(a.footL.toArray()).toEqual([-0.2, 0.09, 0])
    expect(a.footDirL.x).toBeCloseTo(-0.3, 9) // the foot toes out
  })

  it('estimates the fingertip down the knuckle direction when the rig has no tip bone', () => {
    const a = accessoryAnchors(body(), { handL: { at: v(0, 1, 0), dir: v(0, -1, 0) } })
    // the capsule's distal point plus the measured reach — the best a rig without a
    // fingertip bone can do, and it is a fallback, not the preferred path
    expect(a.fingertipL.y).toBeCloseTo(1 - body()[6].radius * HAND_REACH_R, 9)
  })

  it('does not let one side’s frame leak into the other', () => {
    const a = accessoryAnchors(body(), { handL: { at: v(-9, 9, 9), dir: v(1, 0, 0) } })
    expect(a.handR.distanceTo(body()[10].b)).toBeCloseTo(0, 9)
    expect(a.handDirR.distanceTo(a.foreArmDirR)).toBeCloseTo(0, 9)
  })

  it('keeps the returned vectors independent of the frames handed in', () => {
    const f = { handL: { at: v(0, 1, 0), dir: v(0, -1, 0), tip: v(0, 0.9, 0) } }
    const a = accessoryAnchors(body(), f)
    f.handL.at.set(5, 5, 5)
    f.handL.tip.set(6, 6, 6)
    expect(a.handL.toArray()).toEqual([0, 1, 0])
    expect(a.fingertipL.toArray()).toEqual([0, 0.9, 0])
  })
})

describe('placeFoot', () => {
  it('turns the last to the foot’s heading and leaves it flat', () => {
    const o = new THREE.Object3D()
    placeFoot(o, new THREE.Vector3(0.1, 0.08, 0.02), new THREE.Vector3(0, 0, 1))
    expect(o.rotation.y).toBeCloseTo(0, 9) // +z last, +z foot → no turn
    expect(o.rotation.x).toBe(0)
    expect(o.rotation.z).toBe(0)
    placeFoot(o, new THREE.Vector3(0.1, 0.08, 0.02), new THREE.Vector3(1, 0, 0))
    expect(o.rotation.y).toBeCloseTo(Math.PI / 2, 9) // a foot pointing +x turns 90°
  })

  it('ignores the vertical part of the heading — a last lies on the ground', () => {
    const o = new THREE.Object3D()
    placeFoot(o, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0, -5, 1).normalize())
    expect(o.rotation.y).toBeCloseTo(0, 9)
    expect(o.rotation.x).toBe(0)
  })

  it('keeps the piece off the floor', () => {
    const o = new THREE.Object3D()
    placeFoot(o, new THREE.Vector3(0, -3, 0), new THREE.Vector3(0, 0, 1))
    expect(o.position.y).toBeGreaterThan(0) // never sunk through the stage
  })

  it('survives a degenerate heading', () => {
    const o = new THREE.Object3D()
    placeFoot(o, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0, 1, 0))
    expect(Number.isFinite(o.rotation.y)).toBe(true)
  })
})
