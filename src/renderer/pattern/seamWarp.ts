/**
 * **Print warp-to-seamline** — warp a placed print so it follows a curved seam
 * (a princess line, a shaped side seam) instead of ignoring the garment's shaping.
 * A seam is sampled as its horizontal position by height; the warp shifts a print's
 * x by how far the real seam deviates from a straight reference at that height, so a
 * motif riding the seam bends with it. Pure geometry (no DOM) so it's unit-tested;
 * the print painter / pattern placer apply it.
 */
export interface SeamSample {
  /** Height fraction down the panel (0 = top, 1 = hem). */
  v: number
  /** The seam's horizontal position at that height (panel-width fractions or mm). */
  x: number
}

/** The seam's x at height `v` by piecewise-linear interpolation between samples. Pure. */
export function seamXAt(seam: SeamSample[], v: number): number {
  if (!seam.length) return 0
  if (v <= seam[0].v) return seam[0].x
  if (v >= seam[seam.length - 1].v) return seam[seam.length - 1].x
  for (let i = 1; i < seam.length; i++) {
    if (v <= seam[i].v) {
      const a = seam[i - 1]
      const b = seam[i]
      const t = (v - a.v) / (b.v - a.v || 1)
      return a.x + (b.x - a.x) * t
    }
  }
  return seam[seam.length - 1].x
}

/** The straight-line reference seam x at `v` (endpoints connected directly). Pure. */
export function straightRefAt(seam: SeamSample[], v: number): number {
  if (seam.length < 2) return seam[0]?.x ?? 0
  const a = seam[0]
  const b = seam[seam.length - 1]
  const t = (v - a.v) / (b.v - a.v || 1)
  return a.x + (b.x - a.x) * t
}

/** How far the seam bulges from straight at `v` — the warp displacement. Pure. */
export function seamDeviationAt(seam: SeamSample[], v: number): number {
  return seamXAt(seam, v) - straightRefAt(seam, v)
}

/**
 * Warp a print's x to follow the seam: shift it by the seam's deviation from straight
 * at the print's height, scaled by `strength` (1 = ride the seam fully). A straight
 * seam leaves the print unchanged. `xFrac`/output are panel-width fractions. Pure.
 */
export function warpToSeamline(xFrac: number, v: number, seam: SeamSample[], strength = 1): number {
  return xFrac + seamDeviationAt(seam, v) * strength
}

/** An identity (straight) seam between two heights — warps to a no-op. Pure. */
export function straightSeam(x = 0): SeamSample[] {
  return [
    { v: 0, x },
    { v: 1, x }
  ]
}
