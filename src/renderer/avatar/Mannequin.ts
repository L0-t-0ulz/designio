import * as THREE from 'three'
import type { Capsule } from './colliders'
import { BodyMesh } from './BodyMesh'

/** Key body measurements (metres) garments are fitted to (scale with body size). */
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

/** Base (size 1.0) measurements. Runtime sizes scale these. */
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

/** height scales Y, build scales width/girth (X/Z + radii). */
export interface BodyParams {
  height: number
  build: number
}
export const DEFAULT_BODY: BodyParams = { height: 1, build: 1 }

export type AnimationMode = 'static' | 'idle' | 'walk' | 'turn'

export interface Mannequin {
  group: THREE.Group
  colliders: Capsule[]
  measurements: Measurements
  update: (t: number, mode: AnimationMode, speed: number) => void
  /** Resize in place; mutates colliders + measurements so garments can refit. */
  resize: (body: BodyParams) => void
}

type Part = 'root' | 'armL' | 'armR' | 'legL' | 'legR'

interface Bone {
  baseA: THREE.Vector3
  baseB: THREE.Vector3
  baseRadius: number
  part: Part
  restA: THREE.Vector3
  restB: THREE.Vector3
  radius: number
  collider: Capsule
}

const X = new THREE.Vector3(1, 0, 0)

/**
 * A procedural, poseable AND resizable humanoid. Metaballs give a smooth,
 * connected body; capsules along the same skeleton are the cloth colliders.
 */
export function buildMannequin(bodyInit: Partial<BodyParams> = {}): Mannequin {
  const body: BodyParams = { ...DEFAULT_BODY, ...bodyInit }

  const baseDefs: { a: [number, number, number]; b: [number, number, number]; radius: number; part: Part }[] = [
    { a: [0, 1.61, 0], b: [0, 1.66, 0], radius: 0.1, part: 'root' },
    { a: [0, 1.46, 0], b: [0, 1.55, 0], radius: 0.048, part: 'root' },
    { a: [0, 1.0, 0], b: [0, 1.44, 0], radius: 0.15, part: 'root' },
    { a: [-0.19, 1.44, 0], b: [0.19, 1.44, 0], radius: 0.075, part: 'root' },
    { a: [-0.14, 0.98, 0], b: [0.14, 0.98, 0], radius: 0.14, part: 'root' },
    { a: [-0.19, 1.43, 0], b: [-0.31, 1.1, 0.02], radius: 0.05, part: 'armL' },
    { a: [-0.31, 1.1, 0.02], b: [-0.4, 0.82, 0.05], radius: 0.042, part: 'armL' },
    { a: [-0.1, 0.98, 0], b: [-0.12, 0.52, 0.01], radius: 0.088, part: 'legL' },
    { a: [-0.12, 0.52, 0.01], b: [-0.12, 0.08, 0.03], radius: 0.06, part: 'legL' }
  ]
  const mirrored = baseDefs.slice(5).map((d) => ({
    a: [-d.a[0], d.a[1], d.a[2]] as [number, number, number],
    b: [-d.b[0], d.b[1], d.b[2]] as [number, number, number],
    radius: d.radius,
    part: (d.part === 'armL' ? 'armR' : 'legR') as Part
  }))

  const group = new THREE.Group()
  group.name = 'mannequin'
  const material = new THREE.MeshStandardMaterial({ color: 0xbdb2a0, roughness: 0.82, metalness: 0 })

  const bones: Bone[] = []
  const colliders: Capsule[] = []
  for (const d of [...baseDefs, ...mirrored]) {
    const collider: Capsule = { a: new THREE.Vector3(), b: new THREE.Vector3(), radius: 0 }
    colliders.push(collider)
    bones.push({
      baseA: new THREE.Vector3(...d.a),
      baseB: new THREE.Vector3(...d.b),
      baseRadius: d.radius,
      part: d.part,
      restA: new THREE.Vector3(),
      restB: new THREE.Vector3(),
      radius: 0,
      collider
    })
  }

  const measurements: Measurements = { ...MEASUREMENTS }
  const bodyMesh = new BodyMesh(material)
  group.add(bodyMesh.object)

  const pivot: Record<Part, THREE.Vector3> = {
    root: new THREE.Vector3(),
    armL: new THREE.Vector3(),
    armR: new THREE.Vector3(),
    legL: new THREE.Vector3(),
    legR: new THREE.Vector3()
  }

  /** Recompute rest bones + measurements + pivots from the current body size. */
  function applyBody(): void {
    const h = body.height
    const b = body.build
    measurements.chestR = MEASUREMENTS.chestR * b
    measurements.waistR = MEASUREMENTS.waistR * b
    measurements.hipR = MEASUREMENTS.hipR * b
    measurements.thighR = MEASUREMENTS.thighR * b
    measurements.hipHalfX = MEASUREMENTS.hipHalfX * b
    measurements.shoulderHalfX = MEASUREMENTS.shoulderHalfX * b
    measurements.neckY = MEASUREMENTS.neckY * h
    measurements.shoulderY = MEASUREMENTS.shoulderY * h
    measurements.chestY = MEASUREMENTS.chestY * h
    measurements.waistY = MEASUREMENTS.waistY * h
    measurements.hipY = MEASUREMENTS.hipY * h
    measurements.kneeY = MEASUREMENTS.kneeY * h
    measurements.ankleY = MEASUREMENTS.ankleY * h

    pivot.armL.set(-measurements.shoulderHalfX, measurements.shoulderY, 0)
    pivot.armR.set(measurements.shoulderHalfX, measurements.shoulderY, 0)
    pivot.legL.set(-measurements.hipHalfX, measurements.hipY, 0)
    pivot.legR.set(measurements.hipHalfX, measurements.hipY, 0)

    for (const bone of bones) {
      bone.restA.set(bone.baseA.x * b, bone.baseA.y * h, bone.baseA.z * b)
      bone.restB.set(bone.baseB.x * b, bone.baseB.y * h, bone.baseB.z * b)
      bone.radius = bone.baseRadius * b
      bone.collider.radius = bone.radius
    }
  }

  const a = new THREE.Vector3()
  const bv = new THREE.Vector3()
  const curAngle: Record<Part, number> = { root: 0, armL: 0, armR: 0, legL: 0, legR: 0 }
  let lastKey = ''

  const applyPose = (angle: Record<Part, number>): void => {
    for (const bone of bones) {
      a.copy(bone.restA)
      bv.copy(bone.restB)
      const ang = angle[bone.part]
      if (ang !== 0) {
        const p = pivot[bone.part]
        a.sub(p).applyAxisAngle(X, ang).add(p)
        bv.sub(p).applyAxisAngle(X, ang).add(p)
      }
      bone.collider.a.copy(a)
      bone.collider.b.copy(bv)
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
    curAngle.legL = legAmp * s
    curAngle.legR = -legAmp * s
    curAngle.armL = -armAmp * s
    curAngle.armR = armAmp * s
    const key = `${curAngle.legL.toFixed(4)},${curAngle.armL.toFixed(4)}`
    if (key === lastKey) return
    lastKey = key
    applyPose(curAngle)
    bodyMesh.rebuild(colliders)
  }

  const resize = (next: BodyParams): void => {
    body.height = next.height
    body.build = next.build
    applyBody()
    applyPose(curAngle)
    bodyMesh.rebuild(colliders)
  }

  applyBody()
  applyPose(curAngle)
  bodyMesh.rebuild(colliders)
  lastKey = '0.0000,0.0000'

  return { group, colliders, measurements, update, resize }
}
