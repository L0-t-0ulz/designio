import * as THREE from 'three'
import type { Capsule } from './colliders'

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
  /** Collision proxies the cloth solver tests against (mutated in place by update). */
  colliders: Capsule[]
  measurements: Measurements
  /** Pose the limbs for the given time; garments react to the moved colliders. */
  update: (t: number, mode: AnimationMode, speed: number) => void
}

type Part = 'root' | 'armL' | 'armR' | 'legL' | 'legR'

interface Bone {
  restA: THREE.Vector3
  restB: THREE.Vector3
  radius: number
  part: Part
  sphere: boolean
  mesh: THREE.Mesh
  collider: Capsule
}

const UP = new THREE.Vector3(0, 1, 0)
const X = new THREE.Vector3(1, 0, 0)

function placeMesh(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, sphere: boolean): void {
  if (sphere) {
    mesh.position.copy(a)
    return
  }
  mesh.position.copy(a).lerp(b, 0.5)
  mesh.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize())
}

/**
 * A procedural, poseable capsule mannequin that doubles as the cloth collision
 * proxy. Limbs (arms/legs) swing about their joints for idle/walk; the torso
 * stays fixed so garment anchors remain valid. "turn" is handled by the camera.
 */
export function buildMannequin(): Mannequin {
  const defs: { a: [number, number, number]; b: [number, number, number]; radius: number; part: Part }[] = [
    { a: [0, 1.62, 0], b: [0, 1.62, 0], radius: 0.105, part: 'root' }, // head
    { a: [0, 1.47, 0], b: [0, 1.55, 0], radius: 0.05, part: 'root' }, // neck
    { a: [0, 1.02, 0], b: [0, 1.42, 0], radius: 0.15, part: 'root' }, // torso
    { a: [-0.2, 1.44, 0], b: [0.2, 1.44, 0], radius: 0.07, part: 'root' }, // shoulders
    { a: [-0.13, 0.96, 0], b: [0.13, 0.96, 0], radius: 0.13, part: 'root' }, // hips
    { a: [-0.2, 1.42, 0], b: [-0.32, 1.1, 0.02], radius: 0.052, part: 'armL' },
    { a: [-0.32, 1.1, 0.02], b: [-0.4, 0.8, 0.05], radius: 0.044, part: 'armL' },
    { a: [-0.1, 0.94, 0], b: [-0.12, 0.5, 0.01], radius: 0.088, part: 'legL' },
    { a: [-0.12, 0.5, 0.01], b: [-0.12, 0.06, 0.03], radius: 0.058, part: 'legL' }
  ]
  // Mirror the arm + leg bones to the right side.
  const mirrored = defs.slice(5).map((d) => ({
    a: [-d.a[0], d.a[1], d.a[2]] as [number, number, number],
    b: [-d.b[0], d.b[1], d.b[2]] as [number, number, number],
    radius: d.radius,
    part: (d.part === 'armL' ? 'armR' : 'legR') as Part
  }))
  const all = [...defs, ...mirrored]

  const group = new THREE.Group()
  group.name = 'mannequin'
  const material = new THREE.MeshStandardMaterial({ color: 0xd8d1c4, roughness: 0.9, metalness: 0 })

  const bones: Bone[] = []
  const colliders: Capsule[] = []

  for (const d of all) {
    const restA = new THREE.Vector3(...d.a)
    const restB = new THREE.Vector3(...d.b)
    const sphere = restA.distanceTo(restB) < 1e-4
    const mesh = sphere
      ? new THREE.Mesh(new THREE.SphereGeometry(d.radius, 32, 24), material)
      : new THREE.Mesh(new THREE.CapsuleGeometry(d.radius, restA.distanceTo(restB), 12, 20), material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    placeMesh(mesh, restA, restB, sphere)
    group.add(mesh)

    const collider: Capsule = { a: restA.clone(), b: restB.clone(), radius: d.radius }
    colliders.push(collider)
    bones.push({ restA, restB, radius: d.radius, part: d.part, sphere, mesh, collider })
  }

  // Joint pivots (where each limb rotates from).
  const pivot: Record<Part, THREE.Vector3> = {
    root: new THREE.Vector3(),
    armL: new THREE.Vector3(-MEASUREMENTS.shoulderHalfX, MEASUREMENTS.shoulderY, 0),
    armR: new THREE.Vector3(MEASUREMENTS.shoulderHalfX, MEASUREMENTS.shoulderY, 0),
    legL: new THREE.Vector3(-MEASUREMENTS.hipHalfX, MEASUREMENTS.hipY, 0),
    legR: new THREE.Vector3(MEASUREMENTS.hipHalfX, MEASUREMENTS.hipY, 0)
  }

  const a = new THREE.Vector3()
  const b = new THREE.Vector3()

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
    const phase = t * speed * freq
    const s = Math.sin(phase)
    const angle: Record<Part, number> = {
      root: 0,
      legL: legAmp * s,
      legR: -legAmp * s,
      armL: -armAmp * s,
      armR: armAmp * s
    }

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
      placeMesh(bone.mesh, a, b, bone.sphere)
    }
  }

  return { group, colliders, measurements: MEASUREMENTS, update }
}
