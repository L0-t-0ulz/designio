import * as THREE from 'three'

/**
 * **Two-bone inverse kinematics** — put a hand or a foot where it belongs and let
 * the elbow or the knee work out where it has to be.
 *
 * Authoring a pose as Euler angles per bone does not survive contact with a rig.
 * The axes are the rig's own and nothing says which way they face: on this one,
 * rotating the upper arm about +x swings it *backward* and about +z lifts it out,
 * and the mirrored bone on the other side does neither of those. Getting one sign
 * wrong puts a hand through the chest, and the only way to find out is to render.
 *
 * A target does survive. "The left hand rests on the right hip" is true of any rig
 * and any body size, and this solves the two angles that achieve it. It is the
 * standard closed form — the two bones and the root-to-target distance make a
 * triangle, and the law of cosines gives the interior angles.
 */

/**
 * Where the middle joint goes, for a chain rooted at `root` whose bones are `l1`
 * (root → joint) and `l2` (joint → tip), reaching for `target`.
 *
 * `pole` is the direction the joint should break toward — an elbow points back and
 * out, a knee points forward. Without it the solution is a whole circle of valid
 * joint positions and the chain would be free to choose a broken-looking one.
 *
 * Out of reach, the chain straightens toward the target rather than tearing: that
 * is what a real limb does, and it keeps the pose stable when a body is resized
 * under a pose authored for a different one.
 */
export function solveJoint(root: THREE.Vector3, target: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3): THREE.Vector3 {
  const toTarget = target.clone().sub(root)
  const dist = toTarget.length()
  if (dist < 1e-6 || l1 < 1e-6 || l2 < 1e-6) return root.clone()
  const dir = toTarget.divideScalar(dist)
  // clamped so an unreachable target straightens the limb instead of failing
  const reach = Math.min(dist, l1 + l2 - 1e-5)
  // law of cosines: the angle at the root between the chain's first bone and the
  // line to the target
  const cosA = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach)
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)))
  // the bend plane contains `dir` and the part of `pole` square to it
  const side = pole.clone().addScaledVector(dir, -pole.dot(dir))
  if (side.lengthSq() < 1e-12) {
    // pole parallel to the reach: pick any perpendicular so the limb still bends
    const alt = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    side.copy(alt).addScaledVector(dir, -alt.dot(dir))
  }
  side.normalize()
  return root.clone().addScaledVector(dir, Math.cos(a) * l1).addScaledVector(side, Math.sin(a) * l1)
}

/**
 * Whether a target is inside the chain's reach — worth knowing, because a pose
 * that asks for something unreachable renders as a straight limb pointing at it,
 * which looks deliberate and is not.
 */
export function isReachable(root: THREE.Vector3, target: THREE.Vector3, l1: number, l2: number): boolean {
  const d = root.distanceTo(target)
  return d <= l1 + l2 && d >= Math.abs(l1 - l2)
}

/**
 * Rotate `bone` so that `childWorld` — the world position of the point it drives —
 * ends up pointing at `targetWorld`.
 *
 * The delta is computed in world space and then taken back through the parent, so
 * it does not matter which way the bone's own axes face. That is the whole reason
 * this exists.
 */
export function aimBone(bone: THREE.Object3D, childWorld: THREE.Vector3, targetWorld: THREE.Vector3): void {
  const origin = bone.getWorldPosition(new THREE.Vector3())
  const from = childWorld.clone().sub(origin)
  const to = targetWorld.clone().sub(origin)
  if (from.lengthSq() < 1e-12 || to.lengthSq() < 1e-12) return
  const delta = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize())
  const parentWorld = new THREE.Quaternion()
  if (bone.parent) bone.parent.getWorldQuaternion(parentWorld)
  const boneWorld = bone.getWorldQuaternion(new THREE.Quaternion())
  // new local = parentWorld⁻¹ · delta · boneWorld
  bone.quaternion.copy(parentWorld.invert()).multiply(delta).multiply(boneWorld)
  bone.updateWorldMatrix(false, true)
}
