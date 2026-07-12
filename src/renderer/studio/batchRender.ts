import { lineupHues } from './lineup'

/**
 * Batch render — export the current design across **all its colourways** as a set of
 * **separate** PNGs bundled into one ZIP (distinct from the runway line-up, which
 * composites the same shots into a single side-by-side image). A designer gets one
 * crisp file per colourway, ready to drop into a lookbook or send to a buyer.
 *
 * The plan (what to render, in what order, under what filename) is pure so it's
 * unit-tested; `main` drives the per-colourway snapshot + zips the results.
 */

/** A colourway to render — a display name + its body colour. */
export interface ColorwayRef {
  name: string
  color: number
}

/** One planned render: a stable index, its zip filename, the colour to apply and a label. */
export interface BatchShot {
  index: number
  filename: string
  color: number
  label: string
}

/** Turn an arbitrary colourway name into a filesystem-safe stem (lower-kebab, capped). */
export function safeStem(name: string, fallback: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  return s || fallback
}

/**
 * Build the batch-render plan: one shot per saved colourway, or — when the design has
 * fewer than two colourways — `fallbackCount` evenly hue-rotated variants of the
 * current colour (cell 0 is the original, matching the line-up). Filenames are
 * zero-padded by order and de-duplicated so no two shots collide inside the zip.
 */
export function batchRenderPlan(baseColor: number, colorways: ColorwayRef[], fallbackCount = 4): BatchShot[] {
  const refs: ColorwayRef[] =
    colorways.length >= 2
      ? colorways
      : lineupHues(baseColor, Math.max(1, fallbackCount)).map((color, i) => ({
          name: i === 0 ? 'original' : `variant-${i + 1}`,
          color
        }))
  const seen = new Map<string, number>()
  return refs.map((r, i) => {
    const base = safeStem(r.name, `look-${i + 1}`)
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    const stem = n > 0 ? `${base}-${n + 1}` : base
    const num = String(i + 1).padStart(2, '0')
    return { index: i, filename: `${num}-${stem}.png`, color: r.color, label: r.name }
  })
}
