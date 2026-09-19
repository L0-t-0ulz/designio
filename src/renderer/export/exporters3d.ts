import * as THREE from 'three'

// The three.js exporters are heavy — each is loaded **lazily** (dynamic import) on the
// first export of that format, keeping them out of the initial renderer bundle.

/** Clone the given objects into a fresh group (so we don't reparent the scene). */
function group(objects: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group()
  for (const o of objects) {
    // None of the three.js exporters update world matrices — they read `matrixWorld`
    // as it stands. In the running app the render loop has usually just done it, but
    // an export triggered before a frame has drawn (or on an object parked outside the
    // scene graph) would otherwise be written out at the origin. Cheap, and it also
    // keeps `matrix` consistent with `matrixWorld` on the clone below.
    o.updateMatrixWorld(true)
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

/**
 * Export the objects as a **binary STL**. Loads the exporter on first use.
 *
 * STL is the lingua franca of 3D print and CAD, and carries geometry only — no
 * materials, no UVs, no colour. Binary rather than ASCII because a garment mesh is
 * tens of thousands of triangles and the ASCII form is roughly five times the size
 * for the same data.
 *
 * `STLExporter` hands back an `ArrayBuffer` in binary mode and a `string` in ASCII;
 * the cast is narrowing that union to the mode actually asked for.
 */
export async function exportSTL(objects: THREE.Object3D[]): Promise<Uint8Array> {
  const { STLExporter } = await import('three/examples/jsm/exporters/STLExporter.js')
  const out = new STLExporter().parse(group(objects), { binary: true }) as unknown as ArrayBuffer | DataView
  // three has returned both an ArrayBuffer and a DataView over the years; normalise.
  return out instanceof ArrayBuffer ? new Uint8Array(out) : new Uint8Array(out.buffer, out.byteOffset, out.byteLength)
}

/** Export the objects as a USDZ — Apple AR Quick Look on iOS. Loads the exporter on first use. */
export async function exportUSDZ(objects: THREE.Object3D[]): Promise<Uint8Array> {
  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js')
  return new USDZExporter().parseAsync(group(objects), {
    ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } }
  })
}
