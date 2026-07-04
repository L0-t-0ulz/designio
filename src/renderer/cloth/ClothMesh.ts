import * as THREE from 'three'

export interface ClothGeometry {
  geometry: THREE.BufferGeometry
  /** The position attribute's backing array — the solver mutates this in place. */
  positions: Float32Array
}

/**
 * Writes a flat rectangular grid of particle positions (in the XZ plane at a
 * fixed height) into `positions`. Shared by the initial build and by "reset" so
 * the panel always respawns identically.
 */
export function fillFlatGrid(
  positions: Float32Array,
  nx: number,
  ny: number,
  spacing: number,
  origin: THREE.Vector3
): void {
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const k = (iy * nx + ix) * 3
      positions[k] = origin.x + ix * spacing
      positions[k + 1] = origin.y
      positions[k + 2] = origin.z + iy * spacing
    }
  }
}

/**
 * Indices of particles inside a circular hole centred on the panel (in the XZ
 * plane), e.g. the neck hole that turns the sheet into a poncho/tunic so it
 * hangs from the shoulders instead of sliding off. Radius is in metres.
 */
export function computeHoleDeadSet(
  nx: number,
  ny: number,
  spacing: number,
  holeRadius: number
): Set<number> {
  const dead = new Set<number>()
  if (holeRadius <= 0) return dead
  const cx = (nx - 1) / 2
  const cy = (ny - 1) / 2
  const r2 = holeRadius * holeRadius
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const dx = (ix - cx) * spacing
      const dz = (iy - cy) * spacing
      if (dx * dx + dz * dz < r2) dead.add(iy * nx + ix)
    }
  }
  return dead
}

/**
 * Builds a triangulated `nx * ny` cloth panel. The returned `positions` array is
 * the geometry's own position buffer, so the solver can mutate particles and the
 * mesh updates with zero copies. Triangles touching a `dead` particle are
 * omitted, which cuts the neck hole.
 */
export function buildClothGeometry(
  nx: number,
  ny: number,
  spacing: number,
  origin: THREE.Vector3,
  dead: Set<number> = new Set()
): ClothGeometry {
  const count = nx * ny
  const positions = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)

  fillFlatGrid(positions, nx, ny, spacing, origin)

  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const k = iy * nx + ix
      uvs[k * 2] = ix / (nx - 1)
      uvs[k * 2 + 1] = iy / (ny - 1)
    }
  }

  const indices: number[] = []
  for (let iy = 0; iy < ny - 1; iy++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const tl = iy * nx + ix
      const tr = tl + 1
      const bl = (iy + 1) * nx + ix
      const br = bl + 1
      if (dead.has(tl) || dead.has(tr) || dead.has(bl) || dead.has(br)) continue
      indices.push(tl, bl, tr, tr, bl, br)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return { geometry, positions }
}
