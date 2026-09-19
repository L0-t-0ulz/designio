import type { Document } from '@gltf-transform/core'

/**
 * **Draco compression for glTF**, in the main process.
 *
 * It has to live here, not in the renderer: `contextIsolation` is on and Node
 * integration is off, while the Draco encoder is an emscripten module that loads its
 * `.wasm` from disk. Doing it here also keeps a multi-second compression off the
 * render thread.
 *
 * three's `GLTFExporter` cannot emit Draco (it has no support for the extension at
 * all), so the renderer exports a plain GLB and this re-encodes its mesh primitives
 * with `KHR_draco_mesh_compression`. Geometry is quantised, so this is *lossy* on
 * vertex positions — which is why it is a separate export option rather than the
 * default.
 */

/** The encoder + IO are expensive to construct and safe to reuse; build once. */
let ioPromise: Promise<import('@gltf-transform/core').NodeIO> | null = null

async function getIO(): Promise<import('@gltf-transform/core').NodeIO> {
  ioPromise ??= (async () => {
    const [{ NodeIO }, { ALL_EXTENSIONS }, draco3d] = await Promise.all([
      import('@gltf-transform/core'),
      import('@gltf-transform/extensions'),
      import('draco3dgltf')
    ])
    const encoder = await draco3d.default.createEncoderModule()
    const decoder = await draco3d.default.createDecoderModule()
    return new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'draco3d.encoder': encoder, 'draco3d.decoder': decoder })
  })()
  return ioPromise
}

/**
 * Re-encode a binary glTF with Draco mesh compression.
 *
 * Returns a GLB declaring `KHR_draco_mesh_compression`. Typically 80–95% smaller on
 * a garment mesh, because a cloth surface is dense, smooth and highly predictable —
 * exactly what Draco's predictive coding is good at.
 */
export async function compressGLBWithDraco(glb: Uint8Array): Promise<Uint8Array> {
  const io = await getIO()
  const { draco } = await import('@gltf-transform/functions')
  const doc: Document = await io.readBinary(glb)
  await doc.transform(draco())
  return io.writeBinary(doc)
}
