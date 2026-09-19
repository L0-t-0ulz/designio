import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { hasWireframeOverlay, setWireframeOverlay, triangleEdgeIndex } from '../src/renderer/studio/wireframeOverlay'

/** Edges as canonical "lo-hi" strings, so assertions don't depend on winding order. */
const edgeSet = (flat: number[]): Set<string> => {
  const s = new Set<string>()
  for (let i = 0; i < flat.length; i += 2) {
    const [a, b] = [flat[i], flat[i + 1]]
    s.add(a < b ? `${a}-${b}` : `${b}-${a}`)
  }
  return s
}

describe('wireframe edge index', () => {
  it('gives one triangle its three edges', () => {
    const e = triangleEdgeIndex([0, 1, 2], 3)
    expect(e).toHaveLength(6)
    expect(edgeSet(e)).toEqual(new Set(['0-1', '1-2', '0-2']))
  })

  it('emits a shared edge once, not once per triangle', () => {
    // two triangles of a quad, sharing edge 1-2
    const e = triangleEdgeIndex([0, 1, 2, 2, 1, 3], 4)
    expect(edgeSet(e)).toEqual(new Set(['0-1', '1-2', '0-2', '1-3', '2-3']))
    expect(e).toHaveLength(10) // 5 unique edges, not 6
  })

  it('treats an edge as the same edge regardless of direction', () => {
    // the second triangle walks the shared edge the other way round
    expect(triangleEdgeIndex([0, 1, 2, 1, 0, 3], 4)).toHaveLength(10)
  })

  it('drops degenerate edges', () => {
    const e = triangleEdgeIndex([0, 0, 1], 2)
    expect(edgeSet(e)).toEqual(new Set(['0-1'])) // 0-0 dropped, 0-1 and 1-0 are one edge
  })

  it('skips triangles pointing past the end of the vertex buffer', () => {
    expect(triangleEdgeIndex([0, 1, 9], 3)).toEqual([])
    expect(edgeSet(triangleEdgeIndex([0, 1, 2, 0, 1, 9], 3))).toEqual(new Set(['0-1', '1-2', '0-2']))
  })

  it('ignores a trailing partial triangle', () => {
    expect(edgeSet(triangleEdgeIndex([0, 1, 2, 3], 4))).toEqual(new Set(['0-1', '1-2', '0-2']))
  })

  it('walks consecutive vertices when the geometry is not indexed', () => {
    expect(edgeSet(triangleEdgeIndex(null, 6))).toEqual(new Set(['0-1', '1-2', '0-2', '3-4', '4-5', '3-5']))
  })

  it('handles an empty geometry', () => {
    expect(triangleEdgeIndex([], 0)).toEqual([])
    expect(triangleEdgeIndex(null, 0)).toEqual([])
  })

  it('keys edges without collisions on a larger mesh', () => {
    // a 20x20 grid of quads: (v-1)^2*2 triangles, and Euler gives the edge count
    const n = 20
    const idx: number[] = []
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const a = y * n + x
        idx.push(a, a + 1, a + n, a + 1, a + n + 1, a + n)
      }
    }
    const quads = (n - 1) * (n - 1)
    const expected = 2 * n * (n - 1) + quads // horizontals + verticals + one diagonal each
    expect(triangleEdgeIndex(idx, n * n)).toHaveLength(expected * 2)
  })
})

describe('wireframe overlay on a mesh', () => {
  const quad = (): THREE.Mesh => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3))
    g.setIndex([0, 1, 2, 2, 1, 3])
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial())
  }

  it('adds lines that share the mesh position attribute, so they follow the cloth', () => {
    const mesh = quad()
    setWireframeOverlay([mesh], true)
    const line = mesh.children[0] as THREE.LineSegments
    expect(line.isLineSegments).toBe(true)
    // the same attribute object, not a copy — this is what makes the overlay track
    // the solver's in-place position updates
    expect(line.geometry.getAttribute('position')).toBe(mesh.geometry.getAttribute('position'))
    expect(hasWireframeOverlay([mesh])).toBe(true)
  })

  it('leaves the shaded material alone — it is an overlay, not a replacement', () => {
    const mesh = quad()
    setWireframeOverlay([mesh], true)
    expect((mesh.material as THREE.MeshBasicMaterial).wireframe).toBe(false)
  })

  it('draws after the surface so coincident edges win the depth tie', () => {
    const mesh = quad()
    mesh.renderOrder = 3
    setWireframeOverlay([mesh], true)
    expect(mesh.children[0].renderOrder).toBe(4)
  })

  it('is idempotent — toggling on twice does not stack overlays', () => {
    const mesh = quad()
    setWireframeOverlay([mesh], true)
    setWireframeOverlay([mesh], true)
    expect(mesh.children).toHaveLength(1)
  })

  it('removes itself cleanly, and reports absence', () => {
    const mesh = quad()
    setWireframeOverlay([mesh], true)
    setWireframeOverlay([mesh], false)
    expect(mesh.children).toHaveLength(0)
    expect(hasWireframeOverlay([mesh])).toBe(false)
  })

  it('removing when there is nothing to remove is harmless', () => {
    const mesh = quad()
    setWireframeOverlay([mesh], false)
    expect(mesh.children).toHaveLength(0)
  })

  it('rebuilds when the mesh geometry has been replaced under it', () => {
    const mesh = quad()
    setWireframeOverlay([mesh], true)
    const stale = mesh.children[0] as THREE.LineSegments

    // a garment change swaps the cloth geometry; the old overlay would be frozen
    // in the previous shape
    const fresh = new THREE.BufferGeometry()
    fresh.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 3), 3))
    fresh.setIndex([0, 1, 2])
    mesh.geometry = fresh

    setWireframeOverlay([mesh], true)
    expect(mesh.children).toHaveLength(1)
    expect(mesh.children[0]).not.toBe(stale)
    expect((mesh.children[0] as THREE.LineSegments).geometry.getAttribute('position')).toBe(fresh.getAttribute('position'))
  })

  it('reaches meshes nested under the objects it is given', () => {
    const root = new THREE.Group()
    const mesh = quad()
    root.add(mesh)
    setWireframeOverlay([root], true)
    expect(mesh.children).toHaveLength(1)
    expect(hasWireframeOverlay([root])).toBe(true)
  })

  it('skips an object with no position attribute', () => {
    const empty = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial())
    setWireframeOverlay([empty], true)
    expect(empty.children).toHaveLength(0)
    expect(hasWireframeOverlay([empty])).toBe(false)
  })
})
