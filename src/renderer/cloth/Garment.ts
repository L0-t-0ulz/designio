import * as THREE from 'three'

export interface TubeSpec {
  /** Number of rings top→bottom (=> ny). */
  rings: number
  /** Segments around the tube (=> nx, closed loop). */
  radial: number
  topY: number
  bottomY: number
  radiusTop: number
  radiusBottom: number
  centerX?: number
  centerZ?: number
}

export interface TubeBuild {
  geometry: THREE.BufferGeometry
  /** Position attribute's backing array — the solver mutates it in place. */
  positions: Float32Array
  nx: number
  ny: number
  /** Indices of the top ring — pinned so the garment hangs from the shoulders. */
  pinnedTop: number[]
}

/**
 * Writes tube particle positions: `rings` horizontal loops from `topY` to
 * `bottomY`, each a circle of `radial` points whose radius lerps top→bottom
 * (a slight A-line). Shared by the initial build and by respawn.
 */
export function fillTube(positions: Float32Array, spec: TubeSpec): void {
  const { rings, radial, topY, bottomY, radiusTop, radiusBottom } = spec
  const cx = spec.centerX ?? 0
  const cz = spec.centerZ ?? 0
  for (let iy = 0; iy < rings; iy++) {
    const t = rings > 1 ? iy / (rings - 1) : 0
    const y = topY + (bottomY - topY) * t
    const r = radiusTop + (radiusBottom - radiusTop) * t
    for (let ix = 0; ix < radial; ix++) {
      const a = (ix / radial) * Math.PI * 2
      const k = (iy * radial + ix) * 3
      positions[k] = cx + Math.cos(a) * r
      positions[k + 1] = y
      positions[k + 2] = cz + Math.sin(a) * r
    }
  }
}

/**
 * Builds a closed tube garment (a sleeveless dress/tunic) wrapped around the
 * body. Topologically an `nx(radial) * ny(rings)` grid that wraps in X; the
 * returned `positions` is the geometry's own buffer for zero-copy simulation.
 */
export function buildTubeGarment(spec: TubeSpec): TubeBuild {
  const nx = spec.radial
  const ny = spec.rings
  const count = nx * ny
  const positions = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)

  fillTube(positions, spec)

  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const k = iy * nx + ix
      uvs[k * 2] = ix / nx
      uvs[k * 2 + 1] = 1 - iy / (ny - 1)
    }
  }

  const indices: number[] = []
  for (let iy = 0; iy < ny - 1; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const ixr = (ix + 1) % nx // wrap the seam closed
      const tl = iy * nx + ix
      const tr = iy * nx + ixr
      const bl = (iy + 1) * nx + ix
      const br = (iy + 1) * nx + ixr
      indices.push(tl, bl, tr, tr, bl, br)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  const pinnedTop: number[] = []
  for (let ix = 0; ix < nx; ix++) pinnedTop.push(ix) // iy = 0

  return { geometry, positions, nx, ny, pinnedTop }
}
