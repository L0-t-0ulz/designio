import * as THREE from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'

// Field cube: local [-1,1] mapped by position + uniform scale S, centred on the
// body. Metaballs are placed along shaped anatomy segments so they blend into one
// smooth, connected mannequin.
// Higher RES → a smoother, finer watertight silhouette (a reliable collision
// surface for the BVH). Rebuilt only on pose/size change (dirty-checked), so the
// cost is paid once when static; capsules remain the fallback during animation.
const RES = 90
const ISO = 80
const SUBTRACT = 12
const CENTER = new THREE.Vector3(0, 0.95, 0)
const S = 1.2
const STRENGTH_MUL = 0.4
const VISUAL_R = 1.08

/** A shaped body segment: a→b with tapering radius, plus an optional end cap. */
export interface BodyPart {
  a: THREE.Vector3
  b: THREE.Vector3
  radiusA: number
  radiusB: number
  cap?: 'hand' | 'foot' | 'head'
}

/**
 * A smooth, connected matte mannequin built from metaballs along shaped anatomy
 * segments (tapered torso/limbs, hands, feet, a shaped head). Rebuilt from the
 * (posed, sized) parts so it moves with the animation and resize.
 */
export class BodyMesh {
  readonly object: MarchingCubes
  private readonly f = new THREE.Vector3()
  private readonly p = new THREE.Vector3()

  constructor(material: THREE.Material) {
    this.object = new MarchingCubes(RES, material, true, false, 640000)
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

  private ball(world: THREE.Vector3, radius: number): void {
    this.toField(world, this.f)
    const strength = ISO * ((radius * VISUAL_R) / (2 * S)) ** 2 * STRENGTH_MUL
    this.object.addBall(this.f.x, this.f.y, this.f.z, strength, SUBTRACT)
  }

  /** Rebuild the metaball field from the current shaped body parts. */
  rebuild(parts: BodyPart[]): void {
    this.object.reset()
    for (const part of parts) {
      const len = part.a.distanceTo(part.b)
      const rMin = Math.max(0.01, Math.min(part.radiusA, part.radiusB))
      const steps = Math.max(1, Math.ceil(len / (rMin * 0.5)))
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps
        this.p.copy(part.a).lerp(part.b, t)
        this.ball(this.p, part.radiusA + (part.radiusB - part.radiusA) * t)
      }
      if (part.cap === 'hand') {
        this.p.copy(part.b)
        this.ball(this.p, part.radiusB * 1.4) // rounded hand
      } else if (part.cap === 'foot') {
        const dir = new THREE.Vector3().subVectors(part.b, part.a).normalize()
        this.p.copy(part.b).addScaledVector(new THREE.Vector3(0, 0, 1), part.radiusB * 1.8)
        this.p.y -= part.radiusB * 0.4
        this.ball(this.p, part.radiusB * 1.1) // foot extends forward
        void dir
      } else if (part.cap === 'head') {
        // Clean, featureless ovoid (store-mannequin egg head) — no jaw bump.
        this.p.copy(part.b)
        this.p.y -= part.radiusB * 0.9
        this.ball(this.p, part.radiusB * 0.84)
      }
    }
    this.object.update()
  }
}
