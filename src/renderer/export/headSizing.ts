/**
 * Head-circumference sizing for headwear — the mannequin's head circumference (from
 * the head collider radius) mapped to a standard hat **size run** (XS–XL / cm). Pure
 * (no DOM) so it's unit-tested; the manufacturing pack renders it for headwear garments.
 */

export interface HatSize {
  label: string
  /** Head-circumference band this size covers, cm (min inclusive, max exclusive). */
  minCm: number
  maxCm: number
}

/** The standard adult hat size run (head circumference, cm). */
export const HAT_SIZE_RUN: HatSize[] = [
  { label: 'XS', minCm: 53, maxCm: 54.5 },
  { label: 'S', minCm: 54.5, maxCm: 56 },
  { label: 'M', minCm: 56, maxCm: 58 },
  { label: 'L', minCm: 58, maxCm: 60 },
  { label: 'XL', minCm: 60, maxCm: 62 },
  { label: 'XXL', minCm: 62, maxCm: 64 }
]

/**
 * Head circumference (cm) from the head collider radius (m). The head is a slight
 * oval, so the girth runs a touch over a true circle of that radius (~3 %). Pure.
 */
export function headCircumferenceCm(headR: number): number {
  return Math.round(2 * Math.PI * Math.max(0, headR) * 1.03 * 100 * 10) / 10
}

/** The hat size for a head circumference (cm) — the run band it falls in, clamped to the ends. */
export function hatSizeFor(circCm: number): string {
  for (const s of HAT_SIZE_RUN) if (circCm < s.maxCm) return s.label
  return HAT_SIZE_RUN[HAT_SIZE_RUN.length - 1].label
}

export interface HeadSizing {
  /** Measured head circumference, cm. */
  circCm: number
  /** The hat size that circumference falls in. */
  size: string
  run: HatSize[]
}

/** The full head-sizing readout for a head radius (m): circumference, its size, + the run. */
export function headSizing(headR: number): HeadSizing {
  const circCm = headCircumferenceCm(headR)
  return { circCm, size: hatSizeFor(circCm), run: HAT_SIZE_RUN }
}
