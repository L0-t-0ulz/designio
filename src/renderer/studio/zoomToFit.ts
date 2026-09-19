import * as THREE from 'three'
import type { CameraPose } from './cameraBookmarks'

/**
 * **Zoom to fit** — pull the orbit camera back until everything worn is comfortably in
 * frame, without changing which way you're looking at it.
 *
 * The framing math is pure and unit-tested: given how big the subject is and the
 * camera's field of view and aspect, `fitDistance` is the orbit distance at which it
 * just fits. `fitPose` keeps the current azimuth and polar — a fit is a zoom, not a
 * camera move, so it must not throw away the angle the designer chose.
 */

/** Breathing room around the subject: 1.0 would touch the frame edges exactly. */
export const FIT_PADDING = 1.12

/** Never closer than this, so a tiny subject (a single trim) can't put the camera
 *  inside its own target or past the near plane. */
export const MIN_FIT_DISTANCE = 0.25

/**
 * Orbit distance at which a sphere of `radius` fits the frame.
 *
 * Vertical fit is `radius / sin(fov/2)`. A window narrower than it is tall crops the
 * sides first, so the horizontal field — `2·atan(tan(fov/2)·aspect)` — becomes the
 * binding constraint and the camera has to pull back further; taking the larger of the
 * two is what keeps a fit correct in a tall, narrow viewport.
 */
export function fitDistance(radius: number, fovDeg: number, aspect: number, padding = FIT_PADDING): number {
  const r = Math.max(radius, 0)
  if (r === 0) return MIN_FIT_DISTANCE
  const vFov = (Math.max(fovDeg, 1) * Math.PI) / 180
  const safeAspect = aspect > 0 && Number.isFinite(aspect) ? aspect : 1
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * safeAspect)
  const forVertical = r / Math.sin(vFov / 2)
  const forHorizontal = r / Math.sin(hFov / 2)
  return Math.max(MIN_FIT_DISTANCE, Math.max(forVertical, forHorizontal) * padding)
}

/** The bounding sphere's radius for a box — half its diagonal, so the subject fits from
 *  any angle and a fit never has to be redone after an orbit. */
export function boundingRadius(size: THREE.Vector3): number {
  return size.length() / 2
}

/**
 * The pose that fits `box`, looking from where the camera already is.
 *
 * Returns null for an empty box — there is nothing to frame, and moving the camera to
 * the origin would be worse than leaving it alone.
 */
export function fitPose(box: THREE.Box3, current: CameraPose, fovDeg: number, aspect: number, padding = FIT_PADDING): CameraPose | null {
  if (box.isEmpty()) return null
  const centre = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  if (!Number.isFinite(centre.x) || !Number.isFinite(size.x)) return null
  return {
    azimuth: current.azimuth,
    polar: current.polar,
    distance: fitDistance(boundingRadius(size), fovDeg, aspect, padding),
    target: [centre.x, centre.y, centre.z]
  }
}

/**
 * The world-space box around everything visible in `objects`.
 *
 * Invisible meshes are skipped so a hidden layer can't drag the framing off to one
 * side, and `Box3.expandByObject` is given each visible mesh rather than the root, so
 * it never pulls in a hidden subtree.
 */
export function visibleBounds(objects: THREE.Object3D[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const root of objects) {
    root.updateWorldMatrix(true, true)
    root.traverseVisible((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || !mesh.geometry?.getAttribute('position')) return
      box.expandByObject(mesh)
    })
  }
  return box
}
