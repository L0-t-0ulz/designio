/**
 * **Wrinkle density** — how sharply and how often the cloth folds, per unit area.
 *
 * A wrinkle is a fold, and a fold is curvature. The right measure is therefore the
 * **mean curvature** of the draped surface, not strain: cloth can be under tension
 * and perfectly smooth (a stretched panel), or under no tension at all and deeply
 * creased (a gathered skirt). Strain views cannot tell those apart; this can.
 *
 * Discretisation is the **normal-cycle** formula, the standard discrete mean
 * curvature for a triangle mesh:
 *
 *     ∫ H dA over a vertex's region  ≈  ¼ Σ_{e ∋ v} |e| · θ_e
 *
 * (Steiner's formula gives the total as ½Σ|e|θ over all edges; each edge's share is
 * split between its two endpoints, hence the ¼.)
 *
 * where θ_e is the dihedral angle across edge `e`. Dividing by the barycentric area
 * of a vertex's incident faces gives H at that vertex, in units of 1/length — so on
 * a metre-scale garment the numbers are per-metre, and a cylinder of radius R comes
 * out at 1/(2R) as it should. The tests check exactly that against analytic surfaces.
 *
 * Pure + unit-tested.
 */

/** Unnormalised face normal (its magnitude is twice the face area). */
function faceNormalRaw(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number
): [number, number, number] {
  const ux = bx - ax
  const uy = by - ay
  const uz = bz - az
  const vx = cx - ax
  const vy = cy - ay
  const vz = cz - az
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
}

/**
 * Angle between two face normals, in [0, π].
 *
 * Computed with `atan2(|n1 × n2|, n1 · n2)` rather than `acos(n1 · n2)`. The acos
 * form loses all precision for nearly-parallel faces — which is most of a smooth
 * drape — because acos has infinite derivative at ±1 and the dot product rounds to
 * exactly 1. The atan2 form is accurate across the whole range.
 *
 * **Unsigned on purpose.** A wrinkle is a fold whichever way it goes, and a signed
 * angle would let the alternating ridges and troughs of a pleat cancel to zero —
 * reporting the most wrinkled thing on the garment as perfectly smooth.
 */
export function dihedralAngle(n1: readonly [number, number, number], n2: readonly [number, number, number]): number {
  const cx = n1[1] * n2[2] - n1[2] * n2[1]
  const cy = n1[2] * n2[0] - n1[0] * n2[2]
  const cz = n1[0] * n2[1] - n1[1] * n2[0]
  const cross = Math.hypot(cx, cy, cz)
  const dot = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]
  if (cross === 0 && dot === 0) return 0 // a degenerate face has no orientation
  return Math.atan2(cross, dot)
}

/**
 * Per-vertex mean curvature magnitude (1/length) for an indexed triangle mesh.
 *
 * Vertices on a boundary — a hem, a neckline, an armhole — are left at 0. Their edge
 * fan is incomplete, so the formula would read the missing half of the surface as a
 * fold and light up every edge of the garment.
 */
export function wrinkleDensity(positions: ArrayLike<number>, indices: ArrayLike<number>, vertexCount: number): Float32Array {
  const out = new Float32Array(vertexCount)
  const area = new Float32Array(vertexCount)
  const boundary = new Uint8Array(vertexCount)

  // face normals and areas, once
  const faceCount = Math.floor(indices.length / 3)
  const normals: [number, number, number][] = new Array(faceCount)
  for (let f = 0; f < faceCount; f++) {
    const a = indices[f * 3] * 3
    const b = indices[f * 3 + 1] * 3
    const c = indices[f * 3 + 2] * 3
    const n = faceNormalRaw(
      positions[a], positions[a + 1], positions[a + 2],
      positions[b], positions[b + 1], positions[b + 2],
      positions[c], positions[c + 1], positions[c + 2]
    )
    normals[f] = n
    // |n| is twice the face area; each vertex takes a third of the face (barycentric)
    const faceArea = Math.hypot(n[0], n[1], n[2]) / 2
    for (let k = 0; k < 3; k++) area[indices[f * 3 + k]] += faceArea / 3
  }

  // edge → the faces that share it
  const edgeFaces = new Map<number, number[]>()
  const key = (i: number, j: number): number => (i < j ? i * vertexCount + j : j * vertexCount + i)
  for (let f = 0; f < faceCount; f++) {
    for (let k = 0; k < 3; k++) {
      const i = indices[f * 3 + k]
      const j = indices[f * 3 + ((k + 1) % 3)]
      const e = key(i, j)
      const list = edgeFaces.get(e)
      if (list) list.push(f)
      else edgeFaces.set(e, [f])
    }
  }

  for (const [e, faces] of edgeFaces) {
    const i = Math.floor(e / vertexCount)
    const j = e % vertexCount
    if (faces.length !== 2) {
      // an edge with one face is a boundary; with more, the mesh is non-manifold and
      // the dihedral angle is not defined
      boundary[i] = 1
      boundary[j] = 1
      continue
    }
    const theta = dihedralAngle(normals[faces[0]], normals[faces[1]])
    const len = Math.hypot(
      positions[i * 3] - positions[j * 3],
      positions[i * 3 + 1] - positions[j * 3 + 1],
      positions[i * 3 + 2] - positions[j * 3 + 2]
    )
    // Steiner's formula gives the total mean curvature as ½Σ|e|θ over all edges.
    // Each edge's ½|e|θ is shared equally by its two endpoints, so an endpoint
    // receives ¼|e|θ. (Writing /8 here instead makes every reading exactly half the
    // true curvature — the analytic cylinder and sphere tests catch precisely that.)
    const contribution = (len * theta) / 4
    out[i] += contribution
    out[j] += contribution
  }

  for (let v = 0; v < vertexCount; v++) {
    out[v] = boundary[v] || !(area[v] > 0) ? 0 : out[v] / area[v]
  }
  return out
}

/** Curvature that saturates the ramp, 1/m. A 1 cm-radius crease is 100 m⁻¹. */
export const WRINKLE_SCALE = 60

/** Smooth (dark, unobtrusive) → creased (bright). Sequential, because the quantity
 *  has a zero and no meaningful negative side. */
export function wrinkleColor(density: number, scale = WRINKLE_SCALE): [number, number, number] {
  const t = Math.max(0, Math.min(1, density / (scale || 1)))
  if (t < 0.5) {
    const u = t / 0.5 // deep blue → teal
    return [0.08 + 0.02 * u, 0.12 + 0.45 * u, 0.28 + 0.3 * u]
  }
  const u = (t - 0.5) / 0.5 // teal → hot yellow
  return [0.1 + 0.88 * u, 0.57 + 0.36 * u, 0.58 - 0.4 * u]
}

/** Mean and peak density over a mesh, for a readout. */
export function wrinkleSummary(density: ArrayLike<number>): { mean: number; peak: number } {
  if (!density.length) return { mean: 0, peak: 0 }
  let sum = 0
  let peak = 0
  for (let i = 0; i < density.length; i++) {
    sum += density[i]
    if (density[i] > peak) peak = density[i]
  }
  return { mean: sum / density.length, peak }
}
