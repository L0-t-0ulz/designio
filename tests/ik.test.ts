import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { solveJoint, isReachable, aimBone } from '../src/renderer/avatar/ik'
import { POSES, POSE_NAMES, getPose } from '../src/renderer/avatar/poses'

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

describe('two-bone IK', () => {
  const root = v(0, 1, 0)
  const L1 = 0.3
  const L2 = 0.3

  it('puts the joint one upper-bone length from the root', () => {
    // the property that makes the chain reach: both bones keep their length, so
    // the tip lands exactly on the target
    for (const t of [v(0.4, 1, 0), v(0, 0.5, 0), v(0.2, 0.7, 0.2)]) {
      const j = solveJoint(root, t, L1, L2, v(0, 0, 1))
      expect(j.distanceTo(root)).toBeCloseTo(L1, 9)
      expect(j.distanceTo(t)).toBeCloseTo(L2, 6)
    }
  })

  it('breaks the joint toward the pole', () => {
    // an elbow points back, a knee points forward, and without the pole the
    // solution is a whole circle of valid joint positions
    const t = v(0, 0.55, 0) // straight down, well within reach
    const fwd = solveJoint(root, t, L1, L2, v(0, 0, 1))
    const back = solveJoint(root, t, L1, L2, v(0, 0, -1))
    expect(fwd.z).toBeGreaterThan(0)
    expect(back.z).toBeLessThan(0)
    expect(fwd.z).toBeCloseTo(-back.z, 9)
  })

  it('straightens toward an unreachable target instead of tearing', () => {
    const far = v(0, 1 - (L1 + L2) * 3, 0)
    const j = solveJoint(root, far, L1, L2, v(0, 0, 1))
    expect(j.distanceTo(root)).toBeCloseTo(L1, 9)
    // the joint lies on the line to the target: the limb is straight
    const dir = far.clone().sub(root).normalize()
    expect(j.clone().sub(root).normalize().distanceTo(dir)).toBeLessThan(0.02)
  })

  it('bends more as the target comes closer', () => {
    const near = solveJoint(root, v(0, 0.75, 0), L1, L2, v(0, 0, 1))
    const far = solveJoint(root, v(0, 0.45, 0), L1, L2, v(0, 0, 1))
    expect(near.z).toBeGreaterThan(far.z) // the joint swings further out
  })

  it('survives a pole parallel to the reach', () => {
    // the bend plane is undefined there, and the limb still has to bend somewhere
    const j = solveJoint(root, v(0, 0.55, 0), L1, L2, v(0, -1, 0))
    expect(Number.isFinite(j.x + j.y + j.z)).toBe(true)
    expect(j.distanceTo(root)).toBeCloseTo(L1, 9)
  })

  it('degenerates safely on a zero-length bone or a target on the root', () => {
    expect(solveJoint(root, root.clone(), L1, L2, v(0, 0, 1)).equals(root)).toBe(true)
    expect(solveJoint(root, v(0, 0.5, 0), 0, L2, v(0, 0, 1)).equals(root)).toBe(true)
  })

  it('works with unequal bones, as a real limb has', () => {
    const j = solveJoint(root, v(0.25, 0.75, 0), 0.34, 0.26, v(0, 0, 1))
    expect(j.distanceTo(root)).toBeCloseTo(0.34, 9)
    expect(j.distanceTo(v(0.25, 0.75, 0))).toBeCloseTo(0.26, 6)
  })

  it('knows what it can reach', () => {
    expect(isReachable(root, v(0, 0.45, 0), L1, L2)).toBe(true)
    expect(isReachable(root, v(0, 0.2, 0), L1, L2)).toBe(false) // too far
    expect(isReachable(root, v(0, 1, 0), 0.3, 0.1)).toBe(false) // too close to fold into
  })
})

describe('aimBone', () => {
  it('turns the bone so its child points at the target, whatever its axes are', () => {
    // the whole reason this works in world space: a rig's bone axes are its own
    const parent = new THREE.Object3D()
    parent.rotation.set(0.7, -1.2, 0.3) // an arbitrary rig frame
    const bone = new THREE.Object3D()
    bone.rotation.set(-0.4, 0.9, 1.1)
    const child = new THREE.Object3D()
    child.position.set(0, -0.3, 0) // the bone runs down its own local −y
    parent.add(bone)
    bone.add(child)
    parent.updateMatrixWorld(true)

    const origin = bone.getWorldPosition(new THREE.Vector3())
    const target = origin.clone().add(v(0.2, -0.2, 0.1))
    aimBone(bone, child.getWorldPosition(new THREE.Vector3()), target)
    parent.updateMatrixWorld(true)

    const got = child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize()
    const want = target.clone().sub(origin).normalize()
    expect(got.distanceTo(want)).toBeLessThan(1e-6)
  })

  it('does not change the bone length', () => {
    const bone = new THREE.Object3D()
    const child = new THREE.Object3D()
    child.position.set(0, -0.42, 0)
    bone.add(child)
    bone.updateMatrixWorld(true)
    const before = child.getWorldPosition(new THREE.Vector3()).distanceTo(bone.getWorldPosition(new THREE.Vector3()))
    aimBone(bone, child.getWorldPosition(new THREE.Vector3()), v(0.5, 0.5, 0.5))
    bone.updateMatrixWorld(true)
    const after = child.getWorldPosition(new THREE.Vector3()).distanceTo(bone.getWorldPosition(new THREE.Vector3()))
    expect(after).toBeCloseTo(before, 9)
  })

  it('is a no-op when the child already points at the target', () => {
    const bone = new THREE.Object3D()
    const child = new THREE.Object3D()
    child.position.set(0, -0.4, 0)
    bone.add(child)
    bone.updateMatrixWorld(true)
    const q = bone.quaternion.clone()
    aimBone(bone, child.getWorldPosition(new THREE.Vector3()), v(0, -1, 0))
    expect(bone.quaternion.angleTo(q)).toBeLessThan(1e-6)
  })

  it('ignores a degenerate aim rather than producing NaN', () => {
    const bone = new THREE.Object3D()
    const child = new THREE.Object3D()
    bone.add(child) // child at the bone's own origin
    bone.updateMatrixWorld(true)
    const q = bone.quaternion.clone()
    aimBone(bone, bone.getWorldPosition(new THREE.Vector3()), v(1, 0, 0))
    expect(bone.quaternion.equals(q)).toBe(true)
  })
})

describe('the pose library', () => {
  it('reaches every authored target within the limb it belongs to', () => {
    // a target beyond reach renders as a straight limb pointing at it, which looks
    // deliberate and is not — so every pose is checked against a real arm and leg
    const ARM = { l1: 0.271, l2: 0.276 } // measured off the rig
    const LEG = { l1: 0.426, l2: 0.426 }
    for (const pose of POSES) {
      for (const [key, t] of Object.entries(pose.targets ?? {})) {
        if (!t) continue
        const seg = key.startsWith('arm') ? ARM : LEG
        const reach = seg.l1 + seg.l2
        const d = Math.hypot(t.right, t.up, t.fwd) * reach
        expect(d, `${pose.name}/${key} too far`).toBeLessThanOrEqual(reach)
        expect(d, `${pose.name}/${key} folded past the joint`).toBeGreaterThanOrEqual(Math.abs(seg.l1 - seg.l2))
      }
    }
  })

  it('gives every target a usable pole', () => {
    for (const pose of POSES) {
      for (const [key, t] of Object.entries(pose.targets ?? {})) {
        if (!t) continue
        const p = Math.hypot(t.pole.right, t.pole.up, t.pole.fwd)
        expect(p, `${pose.name}/${key}`).toBeGreaterThan(0.1)
      }
    }
  })

  it('mirrors the symmetric poses', () => {
    // sitting and arms-crossed are two-sided; an asymmetry there is a mistake
    for (const name of ['sitting', 'arms-crossed'] as const) {
      const t = POSES.find((p) => p.name === name)!.targets!
      const [a, b] = name === 'sitting' ? [t.legL!, t.legR!] : [t.armL!, t.armR!]
      expect(a.right).toBeCloseTo(-b.right, 6)
      expect(a.fwd).toBeCloseTo(b.fwd, 1)
      expect(a.pole.right).toBeCloseTo(-b.pole.right, 6)
    }
  })

  it('keeps a seated figure seated: the hips drop and only sitting does', () => {
    const sitting = POSES.find((p) => p.name === 'sitting')!
    expect(sitting.hipDropM).toBeGreaterThan(0.2)
    for (const p of POSES) if (p.name !== 'sitting') expect(p.hipDropM ?? 0, p.name).toBe(0)
  })

  it('names every pose once and exposes them all', () => {
    expect(new Set(POSE_NAMES).size).toBe(POSE_NAMES.length)
    for (const n of ['contrapposto', 'hand-on-hip', 'arms-crossed', 'sitting'] as const) {
      expect(POSE_NAMES, n).toContain(n)
      expect(getPose(n).name).toBe(n)
      expect(getPose(n).label.length).toBeGreaterThan(2)
    }
  })
})
