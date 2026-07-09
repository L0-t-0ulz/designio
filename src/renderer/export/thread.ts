/**
 * Thread consumption — how much sewing thread a garment eats, from its total seam
 * length. A lockstitch (ISO 301) consumes roughly **2.5× the seam length** in
 * thread (needle + bobbin threads plus the interlocking take-up); it's the rule of
 * thumb cutting rooms cost thread by. A small waste allowance covers thread-up,
 * backtacks and offcuts. Pure + unit-tested; the manufacturing BOM prints it.
 */

/** Thread consumed per unit of seam, by stitch class (ISO stitch numbers). */
export const THREAD_RATIO = {
  /** 301 lockstitch — the default garment seam. */
  lockstitch: 2.5,
  /** 504 3-thread overlock — edge finishing (much hungrier). */
  overlock: 14
} as const

const WASTE = 1.1 // +10% for thread-up, backtacks, offcuts

/**
 * Estimated thread metres for a total `seamCm` of seaming at a given consumption
 * `ratio` (default lockstitch), including the waste allowance.
 */
export function threadMetres(seamCm: number, ratio: number = THREAD_RATIO.lockstitch): number {
  const m = (Math.max(0, seamCm) / 100) * Math.max(0, ratio) * WASTE
  return Math.round(m * 10) / 10
}
