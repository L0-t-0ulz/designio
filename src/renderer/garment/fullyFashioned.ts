/**
 * **Fully-fashioned knit shaping** — a fully-fashioned knit is shaped by DECREASING
 * stitches a few wales in from the edge (not by cutting), which leaves the tell-tale
 * diagonal fashioning marks. This computes the shaping plan for a panel that tapers
 * from a start girth to an end girth over a length: how many decreases each side
 * seam takes and where the fashioning marks fall. Pure (no DOM) so it's unit-tested;
 * the tech pack prints the shaping note for knit garments.
 */
export interface FashioningMark {
  /** Height fraction down the panel (0 = top, 1 = hem). */
  v: number
  side: 'left' | 'right'
}

export interface FashioningPlan {
  /** Decreases worked into each side seam. */
  decreasesPerSide: number
  /** Knit rows over the shaped length. */
  rows: number
  /** The paired fashioning marks (one each side per decrease). */
  marks: FashioningMark[]
}

/**
 * The fully-fashioned shaping plan for a panel tapering from `startCircCm` to
 * `endCircCm` over `lengthCm`. A widening (end ≥ start) yields no decreases. Pure.
 */
export function fashioningPlan(startCircCm: number, endCircCm: number, lengthCm: number, stitchesPerCm = 3, rowsPerCm = 4): FashioningPlan {
  const rows = Math.max(1, Math.round(lengthCm * rowsPerCm))
  // panel (front) width change = ΔC / 2; each side seam takes half of that
  const perSideCm = Math.max(0, (startCircCm - endCircCm) / 4)
  const decreasesPerSide = Math.round(perSideCm * stitchesPerCm)
  const marks: FashioningMark[] = []
  for (let i = 0; i < decreasesPerSide; i++) {
    const v = (i + 0.5) / decreasesPerSide // spread evenly down the shaped run
    marks.push({ v, side: 'left' }, { v, side: 'right' })
  }
  return { decreasesPerSide, rows, marks }
}

/** True when the taper is enough to warrant fully-fashioned shaping. Pure. */
export function isFullyFashioned(plan: FashioningPlan): boolean {
  return plan.decreasesPerSide > 0
}

/** One-line tech-pack summary of the shaping. Pure. */
export function fashioningSummary(plan: FashioningPlan): string {
  if (!isFullyFashioned(plan)) return 'straight (no side shaping)'
  return `fully-fashioned — ${plan.decreasesPerSide} decreases/side over ${plan.rows} rows (${plan.marks.length} fashioning marks)`
}
