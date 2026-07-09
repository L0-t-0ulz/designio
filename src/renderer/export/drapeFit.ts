/**
 * **Draped fit measure** — girth read off the *simulated* garment, not the flat
 * draft. The garment tube is a structured `nx × ny` grid whose positions the solver
 * mutates in place; slicing at a body height (chest / waist / hip) and summing the
 * nearest ring's perimeter gives the true **in-wear circumference** — folds, flare
 * and the body pushing the cloth out all included.
 *
 * This gives an honest **hip** measurement the flat draft can't: the tube has no
 * hip control radius (the hip sits in the interpolated waist→hem zone), but the
 * draped slice is the real fabric-around-the-hip. Reported as an absolute girth
 * (not an ease) because the garment is draped on the live avatar, whose body may
 * differ from the abstract `Measurements` — so ease against that reference would be
 * inconsistent, but the measured girth is always true. Pure (reads a Float32Array),
 * so `ringGirthCm` is unit-tested and a headless drape test proves the slice tracks
 * the body.
 */
import type { Measurements } from '../avatar/Mannequin'

const round1 = (v: number): number => Math.round(v * 10) / 10

export interface GirthRow {
  /** 'Chest' | 'Waist' | 'Hip'. */
  label: string
  /** Measured girth on the draped garment, cm. */
  cm: number
}

/**
 * Circumference (cm) of the garment at world height `targetY` — a true **horizontal
 * plane slice** of the draped tube, not a topological ring (which tilts and dips as
 * the garment drapes). For each column its vertical edge is intersected with the
 * plane `y = targetY`; the intersection points, joined around the tube, give the real
 * in-wear circumference (fold fullness included). Returns null when too few columns
 * reach that height (so a crop top has no waist/hip reading). `(iy*nx+ix)*3` layout.
 */
export function ringGirthCm(positions: Float32Array, nx: number, ny: number, targetY: number): number | null {
  if (nx < 3 || ny < 2) return null
  const px = new Float64Array(nx)
  const pz = new Float64Array(nx)
  const hit = new Uint8Array(nx)
  let hits = 0
  for (let ix = 0; ix < nx; ix++) {
    // first (topmost) segment on this column that straddles the target height
    for (let iy = 0; iy < ny - 1; iy++) {
      const kA = (iy * nx + ix) * 3
      const kB = ((iy + 1) * nx + ix) * 3
      const yA = positions[kA + 1]
      const yB = positions[kB + 1]
      if ((yA >= targetY && yB <= targetY) || (yA <= targetY && yB >= targetY)) {
        const t = Math.abs(yB - yA) < 1e-9 ? 0 : (targetY - yA) / (yB - yA)
        px[ix] = positions[kA] + (positions[kB] - positions[kA]) * t
        pz[ix] = positions[kA + 2] + (positions[kB + 2] - positions[kA + 2]) * t
        hit[ix] = 1
        hits++
        break
      }
    }
  }
  if (hits < nx * 0.5) return null // the garment doesn't really span this height
  let per = 0
  let first = -1
  let prev = -1
  for (let ix = 0; ix < nx; ix++) {
    if (!hit[ix]) continue
    if (prev >= 0) per += Math.hypot(px[ix] - px[prev], pz[ix] - pz[prev])
    if (first < 0) first = ix
    prev = ix
  }
  if (first >= 0 && prev > first) per += Math.hypot(px[first] - px[prev], pz[first] - pz[prev]) // close the loop
  return per * 100
}

/**
 * Chest / waist / hip girth measured on the draped garment body tube — the true
 * in-wear circumference at each height the garment covers. Unlike the flat spec, this
 * gives a real **hip** because it slices the actual draped fabric.
 */
export function drapedGirths(body: { positions: Float32Array; nx: number; ny: number }, m: Measurements): GirthRow[] {
  const rows: GirthRow[] = []
  const pts: [string, number][] = [
    ['Chest', m.chestY],
    ['Waist', m.waistY],
    ['Hip', m.hipY]
  ]
  for (const [label, y] of pts) {
    const g = ringGirthCm(body.positions, body.nx, body.ny, y)
    if (g != null) rows.push({ label, cm: round1(g) })
  }
  return rows
}
