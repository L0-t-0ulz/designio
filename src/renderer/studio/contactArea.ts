/**
 * **Contact area** — how much of a garment is actually touching the body.
 *
 * A useful fit number on its own (a bodycon dress is most of its area, a cape is
 * almost none), and the honest denominator for the pressure map: a garment can show
 * alarming pressure over 2% of its surface and be perfectly comfortable.
 *
 * The measurement is **area-weighted**, which is the whole difficulty. Counting
 * vertices instead would report whatever the mesher did: cloth is tessellated more
 * finely where it curves, so a vertex count over-weights collars, armholes and
 * gathers — exactly the regions that touch — and would inflate every reading.
 *
 * Pure geometry + unit-tested.
 */

/**
 * Area of the triangle (a, b, c) from the cross product: |AB × AC| / 2.
 *
 * Exact for any triangle, including obtuse and degenerate ones, and needs no angles
 * or square roots beyond the final magnitude — Heron's formula would lose precision
 * on the sliver triangles a cloth solver produces around a gather.
 */
export function triangleArea(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number
): number {
  const ux = bx - ax
  const uy = by - ay
  const uz = bz - az
  const vx = cx - ax
  const vy = cy - ay
  const vz = cz - az
  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  return Math.hypot(nx, ny, nz) / 2
}

/** Total surface area of an indexed triangle mesh, in the mesh's own units². */
export function meshArea(positions: ArrayLike<number>, indices: ArrayLike<number>): number {
  let total = 0
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i] * 3
    const b = indices[i + 1] * 3
    const c = indices[i + 2] * 3
    total += triangleArea(
      positions[a], positions[a + 1], positions[a + 2],
      positions[b], positions[b + 1], positions[b + 2],
      positions[c], positions[c + 1], positions[c + 2]
    )
  }
  return total
}

export interface ContactAreaResult {
  /** Area in contact, in the mesh's units² (world units are metres, so m²). */
  contact: number
  /** Total surface area, same units. */
  total: number
  /** contact ÷ total, 0…1. Zero for an empty mesh rather than NaN. */
  fraction: number
}

/**
 * Area of the mesh in contact with the body.
 *
 * A triangle is not treated as all-or-nothing. Its contributed area is scaled by the
 * **mean of its three vertices' contact indicators** — a linear (first-order)
 * estimate of how much of that triangle is touching. A binary per-triangle test would
 * quantise the answer to whole triangles and make the reading jump as the cloth
 * settles; the linear estimate moves smoothly and is exact when a triangle is wholly
 * in or wholly out.
 *
 * `threshold` is the contact pressure above which a vertex counts as touching, in the
 * solver's own pressure units.
 */
export function contactArea(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  contact: ArrayLike<number>,
  threshold = 0
): ContactAreaResult {
  let touching = 0
  let total = 0
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const ia = indices[i]
    const ib = indices[i + 1]
    const ic = indices[i + 2]
    const a = ia * 3
    const b = ib * 3
    const c = ic * 3
    const area = triangleArea(
      positions[a], positions[a + 1], positions[a + 2],
      positions[b], positions[b + 1], positions[b + 2],
      positions[c], positions[c + 1], positions[c + 2]
    )
    if (!(area > 0)) continue // a degenerate sliver contributes nothing either way
    total += area
    const hits =
      ((contact[ia] ?? 0) > threshold ? 1 : 0) +
      ((contact[ib] ?? 0) > threshold ? 1 : 0) +
      ((contact[ic] ?? 0) > threshold ? 1 : 0)
    touching += (area * hits) / 3
  }
  return { contact: touching, total, fraction: total > 0 ? touching / total : 0 }
}

/** Combine per-piece results into one garment figure. Areas add; fractions do not. */
export function sumContactAreas(parts: readonly ContactAreaResult[]): ContactAreaResult {
  let contact = 0
  let total = 0
  for (const p of parts) {
    contact += p.contact
    total += p.total
  }
  return { contact, total, fraction: total > 0 ? contact / total : 0 }
}

/** A readout in percent and cm², e.g. "38% in contact · 1,240 cm² of 3,250 cm²". */
export function contactReadout(r: ContactAreaResult): string {
  const cm2 = (m2: number): string => Math.round(m2 * 10000).toLocaleString()
  return `${Math.round(r.fraction * 100)}% in contact · ${cm2(r.contact)} cm² of ${cm2(r.total)} cm²`
}
