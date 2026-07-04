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
 * Snaps the ring of live particles bordering the hole onto the exact hole circle,
 * turning the staircase grid boundary into a clean round neckline. Call right
 * after `fillFlatGrid` with the same origin (operates on the flat layout).
 */
export function snapHoleRim(
  positions: Float32Array,
  nx: number,
  ny: number,
  spacing: number,
  origin: THREE.Vector3,
  dead: Set<number>,
  holeRadius: number
): void {
  if (holeRadius <= 0 || dead.size === 0) return
  const cx = origin.x + ((nx - 1) / 2) * spacing
  const cz = origin.z + ((ny - 1) / 2) * spacing
  const isDead = (ix: number, iy: number): boolean =>
    ix >= 0 && ix < nx && iy >= 0 && iy < ny && dead.has(iy * nx + ix)

  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const k = iy * nx + ix
      if (dead.has(k)) continue
      // rim = a live particle with at least one dead 4-neighbour
      if (!(isDead(ix - 1, iy) || isDead(ix + 1, iy) || isDead(ix, iy - 1) || isDead(ix, iy + 1)))
        continue
      const i = k * 3
      const dx = positions[i] - cx
      const dz = positions[i + 2] - cz
      const d = Math.hypot(dx, dz)
      if (d < 1e-6) continue
      const s = holeRadius / d
      positions[i] = cx + dx * s
      positions[i + 2] = cz + dz * s
    }
  }
}

/**
 * Builds a triangulated `nx * ny` cloth panel. The returned `positions` array is
 * the geometry's own position buffer, so the solver can mutate particles and the
 * mesh updates with zero copies. Triangles touching a `dead` particle are
 * omitted (cutting the neck hole), and the rim is snapped to a clean circle.
 */
export function buildClothGeometry(
  nx: number,
  ny: number,
  spacing: number,
  origin: THREE.Vector3,
  dead: Set<number> = new Set(),
  holeRadius = 0
): ClothGeometry {
  const count = nx * ny
  const positions = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)

  fillFlatGrid(positions, nx, ny, spacing, origin)
  snapHoleRim(positions, nx, ny, spacing, origin, dead, holeRadius)

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
