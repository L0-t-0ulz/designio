import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { exportSTL } from '../src/renderer/export/exporters3d'

/** Binary STL: 80-byte header, uint32 triangle count, then 50 bytes per triangle
 *  (12 floats of normal+vertices = 48, plus a 2-byte attribute word). */
const HEADER = 80
const COUNT = 4
const TRI = 50

const triangleCount = (stl: Uint8Array): number =>
  new DataView(stl.buffer, stl.byteOffset, stl.byteLength).getUint32(HEADER, true)

const boxMesh = (): THREE.Mesh => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial())

describe('STL export', () => {
  it('produces a well-formed binary STL', async () => {
    const stl = await exportSTL([boxMesh()])
    expect(stl).toBeInstanceOf(Uint8Array)
    expect(stl.byteLength).toBeGreaterThan(HEADER + COUNT)
    // the declared triangle count must match the actual payload length exactly
    expect(stl.byteLength).toBe(HEADER + COUNT + triangleCount(stl) * TRI)
  })

  it('writes the triangles the geometry actually has', async () => {
    // a box is 6 faces × 2 triangles
    expect(triangleCount(await exportSTL([boxMesh()]))).toBe(12)
  })

  it('is binary, not ASCII', async () => {
    // an ASCII STL starts with "solid"; a binary one must not be mistaken for it
    const stl = await exportSTL([boxMesh()])
    expect(new TextDecoder().decode(stl.slice(0, 5))).not.toBe('solid')
  })

  it('accumulates every object it is given', async () => {
    const one = triangleCount(await exportSTL([boxMesh()]))
    const two = triangleCount(await exportSTL([boxMesh(), boxMesh()]))
    expect(two).toBe(one * 2)
  })

  it('carries world transforms rather than exporting everything at the origin', async () => {
    const moved = boxMesh()
    moved.position.set(5, 0, 0)
    const stl = await exportSTL([moved])
    const view = new DataView(stl.buffer, stl.byteOffset, stl.byteLength)
    // first triangle's first vertex x sits after the 80-byte header, the count, and
    // the 3-float normal
    const x = view.getFloat32(HEADER + COUNT + 12, true)
    expect(x).toBeGreaterThan(4)
  })

  it('drops lining and topstitch extras, like the other 3D exporters', async () => {
    const plain = boxMesh()
    const withExtras = boxMesh()
    const lining = boxMesh()
    lining.userData.lining = true
    const topstitch = boxMesh()
    topstitch.userData.topstitch = true
    withExtras.add(lining, topstitch)
    // the extras must not inflate the exported surface
    expect(triangleCount(await exportSTL([withExtras]))).toBe(triangleCount(await exportSTL([plain])))
  })

  it('does not reparent or modify the scene objects it exports', async () => {
    const mesh = boxMesh()
    const lining = boxMesh()
    lining.userData.lining = true
    mesh.add(lining)
    await exportSTL([mesh])
    expect(mesh.children).toHaveLength(1) // the clone was stripped, not the original
    expect(mesh.parent).toBeNull()
  })

  it('handles an empty export without throwing', async () => {
    const stl = await exportSTL([])
    expect(triangleCount(stl)).toBe(0)
    expect(stl.byteLength).toBe(HEADER + COUNT)
  })
})
