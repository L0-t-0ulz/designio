import * as THREE from 'three'

/**
 * **Angle-weighted vertex normals** (Max 1999). three.js's `computeVertexNormals`
 * weights each incident face's normal by its (implicit) **area**, so where the
 * adaptive remesh packs many small rings next to long straight runs, the big
 * triangles dominate a shared vertex and the shading skews/flattens across cinches,
 * necklines and flare onsets. Weighting instead by the **interior angle** at the
 * vertex makes the normal depend on the surface's *shape*, not triangle size, so the
 * shading is even regardless of remeshing. Pure (typed-array in/out), unit-tested.
 */

/** Interior angle at P between edges P→Q and P→R (radians); 0 for degenerate edges. */
function cornerAngle(
  px: number, py: number, pz: number,
  qx: number, qy: number, qz: number,
  rx: number, ry: number, rz: number
): number {
  const e1x = qx - px, e1y = qy - py, e1z = qz - pz
  const e2x = rx - px, e2y = ry - py, e2z = rz - pz
  const l1 = Math.hypot(e1x, e1y, e1z)
  const l2 = Math.hypot(e2x, e2y, e2z)
  if (l1 < 1e-12 || l2 < 1e-12) return 0
  let d = (e1x * e2x + e1y * e2y + e1z * e2z) / (l1 * l2)
  if (d < -1) d = -1
  else if (d > 1) d = 1
  return Math.acos(d)
}

/**
 * Write angle-weighted unit normals for an indexed triangle mesh into `out`
 * (length = `position.length`). Degenerate triangles/edges contribute nothing; a
 * vertex that ends up with no contribution falls back to +Z (never NaN).
 */
export function angleWeightedNormals(position: Float32Array, index: ArrayLike<number>, out: Float32Array): void {
  out.fill(0)
  for (let t = 0; t + 2 < index.length; t += 3) {
    const ia = index[t] * 3
    const ib = index[t + 1] * 3
    const ic = index[t + 2] * 3
    const ax = position[ia], ay = position[ia + 1], az = position[ia + 2]
    const bx = position[ib], by = position[ib + 1], bz = position[ib + 2]
    const cx = position[ic], cy = position[ic + 1], cz = position[ic + 2]

    // face normal (B-A) × (C-A) — matches three.js winding/orientation
    const abx = bx - ax, aby = by - ay, abz = bz - az
    const acx = cx - ax, acy = cy - ay, acz = cz - az
    let fnx = aby * acz - abz * acy
    let fny = abz * acx - abx * acz
    let fnz = abx * acy - aby * acx
    const fl = Math.hypot(fnx, fny, fnz)
    if (fl < 1e-12) continue // zero-area triangle
    fnx /= fl; fny /= fl; fnz /= fl

    const wa = cornerAngle(ax, ay, az, bx, by, bz, cx, cy, cz)
    const wb = cornerAngle(bx, by, bz, ax, ay, az, cx, cy, cz)
    const wc = cornerAngle(cx, cy, cz, ax, ay, az, bx, by, bz)

    out[ia] += fnx * wa; out[ia + 1] += fny * wa; out[ia + 2] += fnz * wa
    out[ib] += fnx * wb; out[ib + 1] += fny * wb; out[ib + 2] += fnz * wb
    out[ic] += fnx * wc; out[ic + 1] += fny * wc; out[ic + 2] += fnz * wc
  }

  for (let i = 0; i < out.length; i += 3) {
    const x = out[i], y = out[i + 1], z = out[i + 2]
    const l = Math.hypot(x, y, z)
    if (l > 1e-12) {
      out[i] = x / l; out[i + 1] = y / l; out[i + 2] = z / l
    } else {
      out[i] = 0; out[i + 1] = 0; out[i + 2] = 1
    }
  }
}

/**
 * Recompute an indexed `BufferGeometry`'s vertex normals angle-weighted, in place.
 * Falls back to three.js's area-weighted `computeVertexNormals` for non-indexed
 * geometry. Drop-in for `geometry.computeVertexNormals()` on the garment pieces.
 */
export function computeAngleWeightedNormals(geometry: THREE.BufferGeometry): void {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute | undefined
  const idx = geometry.index
  if (!pos || !idx) {
    geometry.computeVertexNormals()
    return
  }
  let nrm = geometry.getAttribute('normal') as THREE.BufferAttribute | undefined
  if (!nrm || nrm.count !== pos.count) {
    nrm = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3)
    geometry.setAttribute('normal', nrm)
  }
  angleWeightedNormals(pos.array as Float32Array, idx.array as ArrayLike<number>, nrm.array as Float32Array)
  nrm.needsUpdate = true
}
