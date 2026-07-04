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
  /** Horizontal offset of each leg centre (for pants). */
  hipHalfX: number
  /** Horizontal offset of each shoulder (for sleeves). */
  shoulderHalfX: number
}

/** Derived from the capsule skeleton below (kept in sync by hand). */
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

export interface Mannequin {
  group: THREE.Group
  /** Collision proxies the cloth solver tests against (metres, Y-up, feet at y=0). */
  colliders: Capsule[]
  measurements: Measurements
}

interface BoneDef {
  a: [number, number, number]
  b: [number, number, number]
  radius: number
}

/**
 * A procedural, code-only humanoid built from capsules & spheres. This doubles
 * as BOTH the visible mannequin and the collision proxy for the cloth, so there
 * is nothing to download and it always runs. Roughly a 1.75 m adult in a relaxed
 * stance with arms angled slightly out from the body so fabric can drape over
 * the shoulders.
 *
 * A later PR can swap the visuals for an imported GLB avatar while keeping these
 * capsules (or fitted ones) as the collision proxy.
 */
export function buildMannequin(): Mannequin {
  // Symmetric definition: right-side limbs are mirrored from the left (-x).
  const half = 0.5

  const bones: BoneDef[] = [
    // head + neck
    { a: [0, 1.62, 0], b: [0, 1.62, 0], radius: 0.105 },
    { a: [0, 1.47, 0], b: [0, 1.55, 0], radius: 0.05 },
    // torso (chest -> waist) and the shoulder bar / hips give it human width
    { a: [0, 1.02, 0], b: [0, 1.42, 0], radius: 0.15 },
    { a: [-0.2, 1.44, 0], b: [0.2, 1.44, 0], radius: 0.07 }, // shoulders
    { a: [-0.13, 0.96, 0], b: [0.13, 0.96, 0], radius: 0.13 }, // hips
    // left arm — relaxed A-pose (down & slightly out), like a fashion dress form
    { a: [-0.2, 1.42, 0], b: [-0.32, 1.1, 0.02], radius: 0.052 }, // upper
    { a: [-0.32, 1.1, 0.02], b: [-0.4, 0.8, 0.05], radius: 0.044 }, // fore
    // left leg
    { a: [-0.1, 0.94, 0], b: [-0.12, 0.5, 0.01], radius: 0.088 }, // thigh
    { a: [-0.12, 0.5, 0.01], b: [-0.12, 0.06, 0.03], radius: 0.058 } // shin
  ]

  // Mirror the four left limb bones onto the right side.
  const mirrored: BoneDef[] = bones.slice(5).map((bone) => ({
    a: [-bone.a[0], bone.a[1], bone.a[2]],
    b: [-bone.b[0], bone.b[1], bone.b[2]],
    radius: bone.radius
  }))
  const allBones = [...bones, ...mirrored]

  const group = new THREE.Group()
  group.name = 'mannequin'

  // Warm matte off-white, like a tailor's dress form.
  const material = new THREE.MeshStandardMaterial({
    color: 0xd8d1c4,
    roughness: 0.9,
    metalness: 0.0
  })

  const colliders: Capsule[] = []
  const up = new THREE.Vector3(0, 1, 0)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()

  for (const bone of allBones) {
    a.set(...bone.a)
    b.set(...bone.b)
    colliders.push({ a: a.clone(), b: b.clone(), radius: bone.radius })

    const length = a.distanceTo(b)
    let mesh: THREE.Mesh
    if (length < 1e-4) {
      // sphere (head)
      mesh = new THREE.Mesh(new THREE.SphereGeometry(bone.radius, 32, 24), material)
      mesh.position.copy(a)
    } else {
      // Three's CapsuleGeometry runs along +Y; orient it along (b - a).
      mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(bone.radius, length, 12, 20),
        material
      )
      mesh.position.copy(a).lerp(b, half)
      const dir = b.clone().sub(a).normalize()
      mesh.quaternion.setFromUnitVectors(up, dir)
    }
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }

  return { group, colliders, measurements: MEASUREMENTS }
}
