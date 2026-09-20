import type * as THREE from 'three'

/**
 * Where an extremity is and which way it points, read off the rig.
 *
 * `at` is the joint (wrist or ankle) and `dir` is a unit vector toward the tip — the
 * middle-finger base for a hand, the toe base for a foot. A hand is not collinear
 * with its forearm and a foot toes out from the shank, so neither direction can be
 * recovered from the limb capsules; without them a glove sits behind the fingers and
 * a shoe sits across the foot.
 */
export interface ExtremityFrame {
  at: THREE.Vector3
  dir: THREE.Vector3
  /**
   * The far end of the extremity, when the rig carries a tip bone for it.
   *
   * Worth having separately from `dir`: fingers curl, so the fingertip is not the
   * hand joint plus a length down the knuckle direction, and a glove built that way
   * stops at the knuckles and leaves the fingers out in the cold.
   */
  tip?: THREE.Vector3
}

/** The four extremities, each absent when the rig does not supply the tip bone. */
export interface ExtremityFrames {
  handL?: ExtremityFrame
  handR?: ExtremityFrame
  footL?: ExtremityFrame
  footR?: ExtremityFrame
}
