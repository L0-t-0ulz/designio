import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'

/** Clone the given objects into a fresh group (so we don't reparent the scene). */
function group(objects: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group()
  for (const o of objects) {
    const c = o.clone()
    // Drop the render-only inner "lining" shells — export the garment surface only.
    const lining: THREE.Object3D[] = []
    c.traverse((n) => { if (n.userData.lining) lining.push(n) })
    for (const n of lining) n.parent?.remove(n)
    g.add(c)
  }
  return g
}

/** Export the objects as a binary glTF (.glb). */
export function exportGLB(objects: THREE.Object3D[]): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      group(objects),
      (result) => resolve(new Uint8Array(result as ArrayBuffer)),
      (err) => reject(err),
      { binary: true }
    )
  })
}

/** Export the objects as a Wavefront OBJ string. */
export function exportOBJ(objects: THREE.Object3D[]): string {
  return new OBJExporter().parse(group(objects))
}
