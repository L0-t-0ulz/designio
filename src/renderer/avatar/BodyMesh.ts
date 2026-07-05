import * as THREE from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'
import type { Capsule } from './colliders'

// Field cube: local [-1,1] mapped by position + uniform scale S, centred on the
// body. Metaballs are placed along the skeleton bones so they blend into one
// smooth, connected body (instead of disconnected capsules).
const RES = 56 // smoother body; cube also sized to fit taller mannequins
const ISO = 80
const SUBTRACT = 12
const CENTER = new THREE.Vector3(0, 0.95, 0)
const S = 1.2
// Per-ball strength for a target world radius R (iso radius ≈ sqrt(strength/ISO)).
// Balls overlap along a bone, so we scale down to keep limbs close to R.
const STRENGTH_MUL = 0.4
const VISUAL_R = 1.1 // visual body a touch fuller than the collider radius

/**
 * A smooth, connected human body built from metaballs (marching cubes) placed
 * along the mannequin skeleton. Rebuilt from the (posed) colliders so it moves
 * with the animation.
 */
export class BodyMesh {
  readonly object: MarchingCubes
  private readonly f = new THREE.Vector3()
  private readonly p = new THREE.Vector3()

  constructor(material: THREE.Material) {
    this.object = new MarchingCubes(RES, material, true, false, 250000)
    this.object.isolation = ISO
    this.object.position.copy(CENTER)
    this.object.scale.setScalar(S)
    this.object.castShadow = true
    this.object.receiveShadow = true
    this.object.frustumCulled = false
  }

  private toField(world: THREE.Vector3, out: THREE.Vector3): void {
    out.set(
      (world.x - CENTER.x) / (2 * S) + 0.5,
      (world.y - CENTER.y) / (2 * S) + 0.5,
      (world.z - CENTER.z) / (2 * S) + 0.5
    )
  }

  /** Rebuild the metaball field from the current (posed) body capsules. */
  rebuild(bones: Capsule[]): void {
    const mc = this.object
    mc.reset()
    for (const bone of bones) {
      const len = bone.a.distanceTo(bone.b)
      const R = bone.radius * VISUAL_R
      const strength = ISO * (R / (2 * S)) ** 2 * STRENGTH_MUL
      const steps = Math.max(1, Math.ceil(len / (bone.radius * 0.6)))
      for (let i = 0; i <= steps; i++) {
        this.p.copy(bone.a).lerp(bone.b, steps === 0 ? 0 : i / steps)
        this.toField(this.p, this.f)
        mc.addBall(this.f.x, this.f.y, this.f.z, strength, SUBTRACT)
      }
    }
    mc.update()
  }
}
