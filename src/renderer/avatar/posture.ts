import * as THREE from 'three'
import type { Capsule } from './colliders'

/**
 * **Posture presets** — how the figure *carries itself*, layered on top of any
 * lookbook pose: athletic (lifted chest, tall), slouch (rounded forward, head
 * dropped), swayback (hips forward, upper body leant back, head jutting). The
 * spine/neck bends are pure data applied to the collider chain (procedural body)
 * or additively to the rig's chest/neck bones (GLB), so garments re-drape onto
 * the new carriage — posture genuinely reshapes the fit.
 */

export type PostureName = 'neutral' | 'athletic' | 'slouch' | 'swayback'
export const POSTURES: PostureName[] = ['neutral', 'athletic', 'slouch', 'swayback']

export interface PostureAngles {
  /** Upper-body bend about the waist (rad); + = forward (toward +z, the front). */
  spine: number
  /** Extra head/neck bend about the neck base (rad); + = forward. */
  neck: number
}

const ANGLES: Record<PostureName, PostureAngles> = {
  neutral: { spine: 0, neck: 0 },
  athletic: { spine: -0.07, neck: -0.03 }, // lifted chest, chin level — standing tall
  slouch: { spine: 0.1, neck: 0.1 }, // rounded shoulders, head dropped forward (drape-safe magnitude)
  swayback: { spine: -0.08, neck: 0.14 } // pelvis forward / lean back, head juts to compensate
}

export function postureAngles(name: PostureName): PostureAngles {
  return ANGLES[name]
}

const X = new THREE.Vector3(1, 0, 0)
const pivot = new THREE.Vector3()

/** Rotate `v` about the X axis through `about` (the posture bend primitive). */
export const bendPoint = (v: THREE.Vector3, about: THREE.Vector3, ang: number): void => {
  v.sub(about).applyAxisAngle(X, ang).add(about)
}

/**
 * Bend the collider chain into a posture (procedural body). Capsule order:
 * 0 head · 1 neck · 2 torso (waist→chest) · 3 shoulder line · 5/6 + 9/10 arms —
 * the upper chain rotates about the waist by `spine`, the torso capsule bends at
 * its own waist end, and the head/neck take the extra `neck` bend about the
 * torso's chest end. Legs/hips are untouched. Mutates in place (the app's
 * collider convention); pure math otherwise.
 */
export function applyPostureToColliders(colliders: Capsule[], waistY: number, p: PostureAngles): void {
  if (p.spine === 0 && p.neck === 0) return
  pivot.set(0, waistY, 0)
  const upper = [0, 1, 3, 5, 6, 9, 10] // head · neck · shoulder line · both arms
  for (const i of upper) {
    bendPoint(colliders[i].a, pivot, p.spine)
    bendPoint(colliders[i].b, pivot, p.spine)
  }
  // the torso capsule stays planted at the waist and bends from there
  const torso = colliders[2]
  const chestEnd = torso.a.y >= torso.b.y ? torso.a : torso.b
  bendPoint(chestEnd, pivot, p.spine)
  // extra head/neck articulation about the chest top
  if (p.neck !== 0) {
    for (const i of [0, 1]) {
      bendPoint(colliders[i].a, chestEnd, p.neck)
      bendPoint(colliders[i].b, chestEnd, p.neck)
    }
  }
}
