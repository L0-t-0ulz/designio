import * as THREE from 'three'

export type NecklineStyle = 'strapless' | 'scoop' | 'crew' | 'v'

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
  /** Neckline: shapes the top edge (straps at the shoulders, a dip for the neck). */
  neckline?: NecklineStyle
  /** Shoulder height — the straps rise to here for non-strapless necklines. */
  shoulderY?: number
  /** Optional cinched-waist radius (bust → waist → hip hourglass). */
  radiusWaist?: number
  /** Fraction of the height where the waist sits (0 top … 1 hem). */
  waistT?: number
}

/** Per-angle top-edge height: straps at the sides (shoulders), a dip for the neck. */
function topEdge(spec: TubeSpec, angle: number): number {
  const style = spec.neckline ?? 'strapless'
  if (style === 'strapless') return spec.topY
  const shoulderY = spec.shoulderY ?? spec.topY
  const side = Math.abs(Math.cos(angle)) // 1 at the sides (shoulders), 0 front/back
  const front = Math.max(0, Math.sin(angle)) // 1 at centre-front
  let dip: number
  if (style === 'crew') dip = 0.055 * (1 - side ** 0.55)
  else if (style === 'scoop') dip = 0.13 * (1 - side)
  else dip = 0.09 * (1 - side) + 0.12 * front * (1 - side) // v: deeper at the front
  return shoulderY - dip
}

/** Radius along the height, with an optional cinched waist. */
function radiusAt(spec: TubeSpec, t: number): number {
  if (spec.radiusWaist == null) return spec.radiusTop + (spec.radiusBottom - spec.radiusTop) * t
  const wt = spec.waistT ?? 0.45
  if (t <= wt) return spec.radiusTop + (spec.radiusWaist - spec.radiusTop) * (t / wt)
  return spec.radiusWaist + (spec.radiusBottom - spec.radiusWaist) * ((t - wt) / (1 - wt))
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
  const { rings, radial, bottomY } = spec
  const cx = spec.centerX ?? 0
  const cz = spec.centerZ ?? 0
  for (let iy = 0; iy < rings; iy++) {
    const t = rings > 1 ? iy / (rings - 1) : 0
    const r = radiusAt(spec, t)
    for (let ix = 0; ix < radial; ix++) {
      const a = (ix / radial) * Math.PI * 2
      const top = topEdge(spec, a) // per-column top so the neckline is shaped
      const y = top + (bottomY - top) * t
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
/** Build the wrapped-tube geometry (uvs + closed-seam indices) + pinned top ring. */
function finishTube(positions: Float32Array, nx: number, ny: number): TubeBuild {
  const uvs = new Float32Array(nx * ny * 2)
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

/**
 * Builds a closed tube garment (dress/tunic) wrapped around the body. The
 * returned `positions` is the geometry's own buffer for zero-copy simulation.
 */
export function buildTubeGarment(spec: TubeSpec): TubeBuild {
  const positions = new Float32Array(spec.radial * spec.rings * 3)
  fillTube(positions, spec)
  return finishTube(positions, spec.radial, spec.rings)
}

/** A tube that follows an arbitrary segment a→b (e.g. a sleeve along the arm). */
export interface AxisTubeSpec {
  rings: number
  radial: number
  a: THREE.Vector3
  b: THREE.Vector3
  radiusStart: number
  radiusEnd: number
}

/** Writes rings perpendicular to the a→b axis, radius lerping start→end. */
export function fillAxisTube(positions: Float32Array, spec: AxisTubeSpec): void {
  const { rings, radial, a, b, radiusStart, radiusEnd } = spec
  const axis = new THREE.Vector3().subVectors(b, a)
  axis.multiplyScalar(1 / (axis.length() || 1))
  const up = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const u = new THREE.Vector3().crossVectors(up, axis).normalize()
  const v = new THREE.Vector3().crossVectors(axis, u).normalize()
  for (let iy = 0; iy < rings; iy++) {
    const t = rings > 1 ? iy / (rings - 1) : 0
    const cx = a.x + (b.x - a.x) * t
    const cy = a.y + (b.y - a.y) * t
    const cz = a.z + (b.z - a.z) * t
    const r = radiusStart + (radiusEnd - radiusStart) * t
    for (let ix = 0; ix < radial; ix++) {
      const ang = (ix / radial) * Math.PI * 2
      const c = Math.cos(ang) * r
      const s = Math.sin(ang) * r
      const k = (iy * radial + ix) * 3
      positions[k] = cx + u.x * c + v.x * s
      positions[k + 1] = cy + u.y * c + v.y * s
      positions[k + 2] = cz + u.z * c + v.z * s
    }
  }
}

export function buildAxisTube(spec: AxisTubeSpec): TubeBuild {
  const positions = new Float32Array(spec.radial * spec.rings * 3)
  fillAxisTube(positions, spec)
  return finishTube(positions, spec.radial, spec.rings)
}
