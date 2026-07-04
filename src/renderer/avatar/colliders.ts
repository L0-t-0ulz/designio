import * as THREE from 'three'

/**
 * A capsule collider = a line segment [a, b] inflated by `radius`.
 * A sphere is just a capsule with a === b. The cloth solver only needs a
 * closest-point query against these primitives, which is exactly how real
 * garment simulators approximate a body for collision.
 */
export interface Capsule {
  a: THREE.Vector3
  b: THREE.Vector3
  radius: number
}

/**
 * Closest point on segment [a, b] to point p, written into `out` (no allocation).
 * Returns the parametric t in [0, 1] as well for callers that want it.
 */
export function closestPointOnSegment(
  p: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  out: THREE.Vector3
): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const abz = b.z - a.z
  const abLen2 = abx * abx + aby * aby + abz * abz

  let t = 0
  if (abLen2 > 1e-12) {
    t = ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / abLen2
    t = t < 0 ? 0 : t > 1 ? 1 : t
  }

  out.set(a.x + abx * t, a.y + aby * t, a.z + abz * t)
  return t
}
