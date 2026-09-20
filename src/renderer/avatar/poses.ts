/**
 * A small **pose library** for lookbook stills. Each pose is guaranteed to look
 * natural: on the GLB avatar it **freezes a real idle/walk clip frame** at a chosen
 * phase; on the procedural body it applies a matching static stance (per-limb X
 * swing, the same channel the walk/idle use). Garments re-settle on the new pose.
 */
export type PoseName = 'stand' | 'weight-shift' | 'stride' | 'relaxed' | 'contrapposto' | 'hand-on-hip' | 'arms-crossed' | 'sitting'

/**
 * A limb's target, in the **body frame** and in multiples of that limb's own
 * length, measured from its root joint.
 *
 * Scale-free on purpose: "the hand sits three quarters of an arm below the
 * shoulder and a fifth of one out to the side" is true of any body, so a pose
 * authored once fits a resized avatar, a child block and a plus block without
 * being re-authored.
 *
 * `right` is toward the avatar's own right, `up` is up, `fwd` is the way it faces.
 * `pole` is the direction the elbow or knee breaks toward, in the same frame.
 */
export interface LimbTarget {
  right: number
  up: number
  fwd: number
  pole: { right: number; up: number; fwd: number }
}

/** Which limbs a pose aims. Absent limbs keep the frozen clip's own placement. */
export interface PoseTargets {
  armL?: LimbTarget
  armR?: LimbTarget
  legL?: LimbTarget
  legR?: LimbTarget
}

/**
 * Per-bone Euler offsets, in radians, on top of the frozen clip frame — for the
 * parts of a pose that are a *tilt* rather than a reach.
 *
 * A hip drop and a shoulder counter-tilt are contrapposto, and they have no target
 * to aim at. Limbs use `targets` instead: the rig's axes are its own and nothing
 * says which way they face — on this one, rotating the upper arm about +x swings
 * it backward and about +z lifts it out, and the mirrored bone does neither — so
 * an angle authored for one side is wrong on the other, and wrong by a sign that
 * puts a hand through the chest.
 */
export type PoseBones = Partial<Record<PoseBoneKey, [number, number, number]>>
export type PoseBoneKey = 'hips' | 'chest' | 'neck'

export interface Pose {
  name: PoseName
  label: string
  /** GLB: which clip to freeze + at what phase (0…1 of its duration). */
  glb: { clip: 'idle' | 'walk'; phase: number }
  /** Procedural body: static per-limb forward/back swing (radians). */
  proc: { legL: number; legR: number; armL: number; armR: number }
  /** GLB: torso tilts layered on the frozen frame. */
  bones?: PoseBones
  /** GLB: where the limbs reach, solved with two-bone IK. */
  targets?: PoseTargets
  /** GLB: drop the hips by this many metres — a seated figure is not standing. */
  hipDropM?: number
}

export const POSES: Pose[] = [
  { name: 'stand', label: 'Stand', glb: { clip: 'idle', phase: 0 }, proc: { legL: 0, legR: 0, armL: 0, armR: 0 } },
  { name: 'weight-shift', label: 'Weight shift', glb: { clip: 'idle', phase: 0.55 }, proc: { legL: 0.07, legR: -0.03, armL: 0.04, armR: -0.06 } },
  { name: 'stride', label: 'Stride', glb: { clip: 'walk', phase: 0.2 }, proc: { legL: 0.42, legR: -0.42, armL: -0.3, armR: 0.3 } },
  { name: 'relaxed', label: 'Relaxed', glb: { clip: 'idle', phase: 0.3 }, proc: { legL: 0.05, legR: -0.03, armL: 0.06, armR: -0.05 } },
  {
    // Weight on one leg: that hip rides UP and the shoulders counter-tilt the
    // other way, which is the whole of contrapposto. The free leg carries nothing,
    // so its knee softens and its foot comes forward and a little across.
    name: 'contrapposto',
    label: 'Contrapposto',
    glb: { clip: 'idle', phase: 0 },
    proc: { legL: 0.1, legR: -0.02, armL: 0.05, armR: -0.04 },
    bones: { hips: [0, 0, 0.055], chest: [0, 0, -0.075] },
    targets: {
      legR: { right: -0.1, up: -0.93, fwd: 0.16, pole: { right: 0, up: 0, fwd: 1 } }
    }
  },
  {
    // The hand rests on the hip: three quarters of an arm down from the shoulder
    // and tucked in toward the body. The elbow breaks out and back, which is what
    // makes it read as a hand on a hip rather than an arm folded across a stomach.
    name: 'hand-on-hip',
    label: 'Hand on hip',
    glb: { clip: 'idle', phase: 0 },
    proc: { legL: 0.05, legR: -0.03, armL: 0.1, armR: -0.04 },
    targets: {
      armL: { right: -0.2, up: -0.74, fwd: 0.06, pole: { right: 0.9, up: -0.1, fwd: -0.45 } }
    }
  },
  {
    // Both hands reach past the far side of the body at chest height, so the
    // forearms lie across each other. They are set at different heights so they
    // stack rather than intersect, which is how arms actually cross.
    name: 'arms-crossed',
    label: 'Arms crossed',
    glb: { clip: 'idle', phase: 0 },
    proc: { legL: 0.03, legR: -0.02, armL: 0.02, armR: -0.02 },
    targets: {
      armL: { right: -0.55, up: -0.34, fwd: 0.26, pole: { right: 1, up: -0.6, fwd: -0.25 } },
      armR: { right: 0.55, up: -0.44, fwd: 0.22, pole: { right: -1, up: -0.6, fwd: -0.25 } }
    }
  },
  {
    // Seated: the hips drop to seat height and each foot goes **half a leg
    // forward and half a leg down**, which is what puts the thigh level and the
    // shin vertical — the two halves of a right angle at the knee. Reaching
    // further forward than that straightens the leg back out, and the figure
    // stops sitting and starts sliding.
    //
    // Without the hip drop it sits in mid-air above where its own legs are, and
    // the drop has to be set absolutely: the static loop re-applies the pose every
    // frame and a relative one accumulates until the figure is under the floor.
    name: 'sitting',
    label: 'Sitting',
    glb: { clip: 'idle', phase: 0 },
    proc: { legL: 0.9, legR: 0.9, armL: 0.12, armR: -0.12 },
    hipDropM: 0.45,
    bones: { chest: [0.05, 0, 0] },
    targets: {
      legL: { right: 0.06, up: -0.5, fwd: 0.5, pole: { right: 0.1, up: 0.55, fwd: 1 } },
      legR: { right: -0.06, up: -0.5, fwd: 0.5, pole: { right: -0.1, up: 0.55, fwd: 1 } }
    }
  }
]

export const POSE_NAMES: PoseName[] = POSES.map((p) => p.name)

/** The pose by name (falls back to a neutral stand). */
export function getPose(name: PoseName): Pose {
  return POSES.find((p) => p.name === name) ?? POSES[0]
}
