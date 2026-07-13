import { SIZES, type SizeLabel } from './document'

/**
 * **Size-run strip** — one composite shot of the garment worn at every size of the
 * graded run, side by side (the runway line-up machinery, sized instead of
 * coloured), each cell labelled with its size. The plan + label maths are pure;
 * `main` re-grades, settles the sim synchronously and composites the stills.
 */

export interface SizeRunCell {
  size: SizeLabel
  label: string
}

/** The run in order, labelled — the drafted block (M) is marked as the base. */
export function sizeRunPlan(base: SizeLabel = 'M'): SizeRunCell[] {
  return SIZES.map((size) => ({ size, label: size === base ? `${size} · block` : size }))
}
