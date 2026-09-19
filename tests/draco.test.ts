import { describe, it, expect } from 'vitest'
import { Document, NodeIO } from '@gltf-transform/core'
import { compressGLBWithDraco } from '../src/main/draco'

/** A dense, smooth surface — the kind of geometry a garment actually produces, and
 *  what Draco's predictive coding is designed for. */
async function sampleGLB(n = 40): Promise<{ glb: Uint8Array; vertices: number }> {
  const pos: number[] = []
  const idx: number[] = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) pos.push(x / n, Math.sin(x / 4) * Math.cos(y / 4), y / n)
  }
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const a = y * n + x
      idx.push(a, a + 1, a + n, a + 1, a + n + 1, a + n)
    }
  }
  const doc = new Document()
  const buf = doc.createBuffer()
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf))
  doc.createScene().addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(prim)))
  return { glb: await new NodeIO().writeBinary(doc), vertices: pos.length / 3 }
}

/** Read a GLB back with a Draco-capable IO, as any conformant viewer would. */
async function readBack(glb: Uint8Array): Promise<Document> {
  const [{ ALL_EXTENSIONS }, draco3d] = await Promise.all([import('@gltf-transform/extensions'), import('draco3dgltf')])
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.default.createEncoderModule(),
    'draco3d.decoder': await draco3d.default.createDecoderModule()
  })
  return io.readBinary(glb)
}

describe('Draco glTF compression', () => {
  it('makes a garment-like mesh dramatically smaller', async () => {
    const { glb } = await sampleGLB()
    const out = await compressGLBWithDraco(glb)
    expect(out.byteLength).toBeLessThan(glb.byteLength * 0.5)
  }, 30_000)

  it('declares the extension, so a viewer knows how to read it', async () => {
    const { glb } = await sampleGLB()
    const doc = await readBack(await compressGLBWithDraco(glb))
    expect(doc.getRoot().listExtensionsUsed().map((e) => e.extensionName)).toContain('KHR_draco_mesh_compression')
  }, 30_000)

  it('is still a valid GLB', async () => {
    const { glb } = await sampleGLB()
    const out = await compressGLBWithDraco(glb)
    // GLB magic: "glTF" little-endian at byte 0
    expect(new TextDecoder().decode(out.slice(0, 4))).toBe('glTF')
  }, 30_000)

  it('round-trips every vertex — compression is lossy on precision, not on topology', async () => {
    const { glb, vertices } = await sampleGLB()
    const doc = await readBack(await compressGLBWithDraco(glb))
    const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0]
    expect(prim.getAttribute('POSITION')!.getCount()).toBe(vertices)
    expect(prim.getIndices()!.getCount()).toBe((40 - 1) * (40 - 1) * 6)
  }, 30_000)

  it('preserves the surface — every point lands within quantisation error of the original', async () => {
    // Draco reorders vertices as part of compressing them, so comparing index i to
    // index i is meaningless (it reports ~2 units of "error" on a mesh spanning 1).
    // The property that actually matters is geometric: every output vertex sits on
    // the original surface.
    const { glb } = await sampleGLB()
    const before = (await readBack(glb)).getRoot().listMeshes()[0].listPrimitives()[0].getAttribute('POSITION')!
    const after = (await readBack(await compressGLBWithDraco(glb))).getRoot().listMeshes()[0].listPrimitives()[0].getAttribute('POSITION')!

    const src: number[][] = []
    const tmp: number[] = [0, 0, 0]
    for (let i = 0; i < before.getCount(); i++) {
      before.getElement(i, tmp)
      src.push([tmp[0], tmp[1], tmp[2]])
    }

    let worst = 0
    const b: number[] = [0, 0, 0]
    for (let i = 0; i < after.getCount(); i++) {
      after.getElement(i, b)
      let nearest = Infinity
      for (const a of src) nearest = Math.min(nearest, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]))
      worst = Math.max(worst, nearest)
    }
    expect(worst).toBeLessThan(0.01) // model units; the mesh spans ~1
  }, 60_000)

  it('is reusable — a second call does not fail on the cached encoder', async () => {
    const { glb } = await sampleGLB(20)
    const first = await compressGLBWithDraco(glb)
    const second = await compressGLBWithDraco(glb)
    expect(second.byteLength).toBe(first.byteLength)
  }, 30_000)

  it('rejects data that is not a glTF rather than producing nonsense', async () => {
    await expect(compressGLBWithDraco(new Uint8Array([1, 2, 3, 4]))).rejects.toBeTruthy()
  }, 30_000)
})
