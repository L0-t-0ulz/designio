import * as THREE from 'three'
import type { Capsule } from './colliders'
import { BodyMesh } from './BodyMesh'

/**
 * Key body measurements (metres) garments are fitted to. Radii are the enclosing
 * radius of the form at that level; templates add "ease" on top. Heights are Y.
 */
export interface Measurements {
  chestR: number
  waistR: number
  hipR: number
  thighR: number
  neckY: number
  shoulderY: number
  chestY: number
  waistY: number
  hipY: number
  kneeY: number
  ankleY: number
  hipHalfX: number
  shoulderHalfX: number
}

export const MEASUREMENTS: Measurements = {
  chestR: 0.16,
  waistR: 0.145,
  hipR: 0.19,
  thighR: 0.1,
  neckY: 1.5,
  shoulderY: 1.44,
  chestY: 1.34,
  waistY: 1.06,
  hipY: 0.96,
  kneeY: 0.5,
  ankleY: 0.1,
  hipHalfX: 0.11,
  shoulderHalfX: 0.2
}

export type AnimationMode = 'static' | 'idle' | 'walk' | 'turn'

export interface Mannequin {
  group: THREE.Group
  colliders: Capsule[]
  measurements: Measurements
  update: (t: number, mode: AnimationMode, speed: number) => void
}

type Part = 'root' | 'armL' | 'armR' | 'legL' | 'legR'

interface Bone {
  restA: THREE.Vector3
  restB: THREE.Vector3
  radius: number
  part: Part
  collider: Capsule
}

const X = new THREE.Vector3(1, 0, 0)

/**
 * A procedural humanoid. Metaballs along the skeleton give a smooth, connected
 * body (the visible mannequin); capsules along the same skeleton are the cloth
 * colliders. Limbs swing about their joints for idle/walk; the torso stays put so
 * garment anchors remain valid. "turn" is handled by the camera.
 */
export function buildMannequin(): Mannequin {
  const defs: { a: [number, number, number]; b: [number, number, number]; radius: number; part: Part }[] = [
    { a: [0, 1.61, 0], b: [0, 1.66, 0], radius: 0.1, part: 'root' }, // head
    { a: [0, 1.46, 0], b: [0, 1.55, 0], radius: 0.048, part: 'root' }, // neck
    { a: [0, 1.0, 0], b: [0, 1.44, 0], radius: 0.15, part: 'root' }, // torso
    { a: [-0.19, 1.44, 0], b: [0.19, 1.44, 0], radius: 0.075, part: 'root' }, // shoulders
    { a: [-0.14, 0.98, 0], b: [0.14, 0.98, 0], radius: 0.14, part: 'root' }, // hips
    { a: [-0.19, 1.43, 0], b: [-0.31, 1.1, 0.02], radius: 0.05, part: 'armL' },
    { a: [-0.31, 1.1, 0.02], b: [-0.4, 0.82, 0.05], radius: 0.042, part: 'armL' },
    { a: [-0.1, 0.98, 0], b: [-0.12, 0.52, 0.01], radius: 0.088, part: 'legL' },
    { a: [-0.12, 0.52, 0.01], b: [-0.12, 0.08, 0.03], radius: 0.06, part: 'legL' }
  ]
  const mirrored = defs.slice(5).map((d) => ({
    a: [-d.a[0], d.a[1], d.a[2]] as [number, number, number],
    b: [-d.b[0], d.b[1], d.b[2]] as [number, number, number],
    radius: d.radius,
    part: (d.part === 'armL' ? 'armR' : 'legR') as Part
  }))
  const all = [...defs, ...mirrored]

  const group = new THREE.Group()
  group.name = 'mannequin'
  const material = new THREE.MeshStandardMaterial({ color: 0xd9d2c6, roughness: 0.85, metalness: 0 })

  const bones: Bone[] = []
  const colliders: Capsule[] = []
  for (const d of all) {
    const collider: Capsule = { a: new THREE.Vector3(...d.a), b: new THREE.Vector3(...d.b), radius: d.radius }
    colliders.push(collider)
    bones.push({
      restA: new THREE.Vector3(...d.a),
      restB: new THREE.Vector3(...d.b),
      radius: d.radius,
      part: d.part,
      collider
    })
  }

  const body = new BodyMesh(material)
  group.add(body.object)

  const pivot: Record<Part, THREE.Vector3> = {
    root: new THREE.Vector3(),
    armL: new THREE.Vector3(-MEASUREMENTS.shoulderHalfX, MEASUREMENTS.shoulderY, 0),
    armR: new THREE.Vector3(MEASUREMENTS.shoulderHalfX, MEASUREMENTS.shoulderY, 0),
    legL: new THREE.Vector3(-MEASUREMENTS.hipHalfX, MEASUREMENTS.hipY, 0),
    legR: new THREE.Vector3(MEASUREMENTS.hipHalfX, MEASUREMENTS.hipY, 0)
  }

  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  let lastKey = ''

  const applyPose = (angle: Record<Part, number>): void => {
    for (const bone of bones) {
      a.copy(bone.restA)
      b.copy(bone.restB)
      const ang = angle[bone.part]
      if (ang !== 0) {
        const p = pivot[bone.part]
        a.sub(p).applyAxisAngle(X, ang).add(p)
        b.sub(p).applyAxisAngle(X, ang).add(p)
      }
      bone.collider.a.copy(a)
      bone.collider.b.copy(b)
    }
  }

  const update = (t: number, mode: AnimationMode, speed: number): void => {
    let legAmp = 0
    let armAmp = 0
    let freq = 0
    if (mode === 'walk') {
      legAmp = 0.5
      armAmp = 0.35
      freq = 3.0
    } else if (mode === 'idle') {
      legAmp = 0.05
      armAmp = 0.06
      freq = 0.9
    }
    const s = Math.sin(t * speed * freq)
    const angle: Record<Part, number> = {
      root: 0,
      legL: legAmp * s,
      legR: -legAmp * s,
      armL: -armAmp * s,
      armR: armAmp * s
    }
    const key = `${angle.legL.toFixed(4)},${angle.armL.toFixed(4)}`
    if (key === lastKey) return // pose unchanged → skip rebuild (free when static)
    lastKey = key
    applyPose(angle)
    body.rebuild(colliders)
  }

  // Build the rest pose once so the body is visible immediately.
  applyPose({ root: 0, legL: 0, legR: 0, armL: 0, armR: 0 })
  body.rebuild(colliders)
  lastKey = '0.0000,0.0000'

  return { group, colliders, measurements: MEASUREMENTS, update }
}
