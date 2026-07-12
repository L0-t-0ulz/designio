/**
 * Multi-angle **contact sheet** — one garment shot from several angles around the
 * current camera (0° = the view you're looking at), composited into a single
 * labelled grid PNG: the classic product-turnaround sheet a buyer or factory
 * flips through. The view + grid maths are pure (unit-tested); `main` drives the
 * camera via `turntablePose` and composites the snapshots.
 */

export interface ContactView {
  /** Angle label shown under the cell ('0°' = the current view). */
  label: string
  /** Fraction of a full turn from the current azimuth (feeds `turntablePose`). */
  t: number
}

/** `n` evenly spaced views around the subject, starting at the current camera. */
export function contactViews(n = 6): ContactView[] {
  const count = Math.max(2, Math.round(n))
  return Array.from({ length: count }, (_, i) => ({
    label: `${Math.round((i / count) * 360)}°`,
    t: i / count
  }))
}

export interface ContactGrid {
  totalW: number
  totalH: number
  /** Top-left corner of each image cell, in view order (row-major). */
  cells: { x: number; y: number }[]
  /** Baseline y for each cell's label (centred under the image). */
  labelY: number[]
}

/** Row-major grid layout for `n` cells of `cellW`×`cellH` + a label strip per row. */
export function contactGrid(n: number, cellW: number, cellH: number, cols = 3, gap = 8, labelH = 28): ContactGrid {
  const c = Math.max(1, Math.min(cols, n))
  const rows = Math.ceil(n / c)
  const cells: { x: number; y: number }[] = []
  const labelY: number[] = []
  for (let i = 0; i < n; i++) {
    const col = i % c
    const row = Math.floor(i / c)
    const x = col * (cellW + gap)
    const y = row * (cellH + labelH + gap)
    cells.push({ x, y })
    labelY.push(y + cellH + labelH * 0.72)
  }
  return {
    totalW: c * cellW + (c - 1) * gap,
    totalH: rows * (cellH + labelH) + (rows - 1) * gap,
    cells,
    labelY
  }
}
