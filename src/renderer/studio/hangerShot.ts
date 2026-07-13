import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'

/**
 * **Hanger shot** — the e-commerce alternate to the ghost mannequin: the body
 * vanishes AND its colliders swap for one thin hanger bar, so the garment hangs
 * limp from its pinned shoulders instead of holding a worn silhouette. A wire
 * hanger prop (hook + bar) draws behind the neckline. Pure geometry helpers are
 * unit-tested; the stack swaps the solver colliders in place and restores them.
 */

/** The hanger's thin support bar, spanning just inside the shoulders. */
export function hangerCapsule(m: Measurements): Capsule {
  const half = m.shoulderHalfX * 0.92
  return {
    a: new THREE.Vector3(-half, m.shoulderY, 0),
    b: new THREE.Vector3(half, m.shoulderY, 0),
    radius: 0.016
  }
}

/** The wire-hanger prop: sloped shoulder wires + a hook above the neck. */
export function buildHangerProp(m: Measurements): THREE.Group {
  const wire = new THREE.MeshStandardMaterial({ color: 0xb9bcc4, roughness: 0.35, metalness: 0.85 })
  const g = new THREE.Group()
  const half = m.shoulderHalfX * 0.92
  const apexY = m.shoulderY + 0.05
  const seg = (ax: number, ay: number, bx: number, by: number): THREE.Mesh => {
    const len = Math.hypot(bx - ax, by - ay)
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 8), wire)
    mesh.position.set((ax + bx) / 2, (ay + by) / 2, 0)
    // a Y-aligned cylinder rotated onto the a→b direction in the XY plane
    mesh.rotation.z = -Math.atan2(bx - ax, by - ay)
    return mesh
  }
  g.add(seg(-half, m.shoulderY, 0, apexY)) // left shoulder wire
  g.add(seg(half, m.shoulderY, 0, apexY)) // right shoulder wire
  g.add(seg(-half, m.shoulderY, half, m.shoulderY)) // the bar
  // the hook: a stem + an open arc
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8), wire)
  stem.position.set(0, apexY + 0.025, 0)
  g.add(stem)
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 8, 18, Math.PI * 1.35), wire)
  hook.position.set(0, apexY + 0.06, 0)
  hook.rotation.z = Math.PI * 0.1
  g.add(hook)
  return g
}
