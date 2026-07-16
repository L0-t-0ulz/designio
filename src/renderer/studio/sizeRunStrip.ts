import { SIZES, type SizeLabel } from './document'
import { HAT_SIZE_RUN } from '../export/headSizing'

/**
 * **Size-run strip** — one composite shot of the garment worn at every size of the
 * graded run, side by side (the runway line-up machinery, sized instead of
 * coloured), each cell labelled with its size. The plan + label maths are pure;
 * `main` re-grades, settles the sim synchronously and composites the stills. For
 * headwear the run is labelled by **head circumference** (the standard hat size run)
 * instead of the body block, since a hat is fit by the head girth.
 */

export interface SizeRunCell {
  size: SizeLabel
  label: string
}

/** The run in order, labelled — the drafted block (M) is marked as the base. */
export function sizeRunPlan(base: SizeLabel = 'M'): SizeRunCell[] {
  return SIZES.map((size) => ({ size, label: size === base ? `${size} · block` : size }))
}

/**
 * The **headwear size-run line-up** — the same graded run, but each cell labelled
 * with its head-circumference band from the standard hat size run (XS…XXL align 1:1
 * with the body sizes), so the strip reads as a hat size run.
 */
export function headwearSizeRunPlan(): SizeRunCell[] {
  return SIZES.map((size, i) => {
    const h = HAT_SIZE_RUN[i] ?? HAT_SIZE_RUN[HAT_SIZE_RUN.length - 1]
    return { size, label: `${size} · ${h.minCm}–${h.maxCm} cm` }
  })
}
