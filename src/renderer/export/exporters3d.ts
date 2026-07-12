import * as THREE from 'three'

// The three.js exporters are heavy — each is loaded **lazily** (dynamic import) on the
// first export of that format, keeping them out of the initial renderer bundle.

/** Clone the given objects into a fresh group (so we don't reparent the scene). */
function group(objects: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group()
  for (const o of objects) {
    const c = o.clone()
    // Drop render-only extras (inner lining shells + topstitch lines) — export the surface only.
    const extra: THREE.Object3D[] = []
    c.traverse((n) => { if (n.userData.lining || n.userData.topstitch) extra.push(n) })
    for (const n of extra) n.parent?.remove(n)
    g.add(c)
  }
  return g
}

/** Export the objects as a binary glTF (.glb). Loads the exporter on first use. */
export async function exportGLB(objects: THREE.Object3D[]): Promise<Uint8Array> {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
  const g = group(objects)
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(g, (result) => resolve(new Uint8Array(result as ArrayBuffer)), (err) => reject(err), { binary: true })
  })
}

/** Export the objects as a Wavefront OBJ string. Loads the exporter on first use. */
export async function exportOBJ(objects: THREE.Object3D[]): Promise<string> {
  const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js')
  return new OBJExporter().parse(group(objects))
}

/** Export the objects as a USDZ — Apple AR Quick Look on iOS. Loads the exporter on first use. */
export async function exportUSDZ(objects: THREE.Object3D[]): Promise<Uint8Array> {
  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js')
  return new USDZExporter().parseAsync(group(objects), {
    ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } }
  })
}
