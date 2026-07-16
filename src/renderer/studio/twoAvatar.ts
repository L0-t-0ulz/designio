/**
 * **Two-avatar scene** — a shot of the design on TWO figures side by side (a pair /
 * a couple / a fit comparison across bodies). The per-avatar body + cloth sim is a
 * singleton, so — like the runway line-up — the scene snapshots the design on each
 * body preset in turn and composites them, rather than simulating two bodies at once.
 * The plan + layout are pure so they're unit-tested; `main` drives the body swap +
 * settle + composite.
 */

export interface AvatarSlot {
  label: string
  /** The body-shape preset this avatar wears. */
  bodyPreset: string
}

/** The two avatars to render — defaults to a runway + a curvy figure. Pure. */
export function twoAvatarPlan(a = 'runway', b = 'curvy'): [AvatarSlot, AvatarSlot] {
  return [
    { label: a, bodyPreset: a },
    { label: b, bodyPreset: b }
  ]
}

/** Two side-by-side cell x-positions + the total width. Pure. */
export function twoAvatarCells(cellW: number, gap = 0): { totalW: number; xs: number[] } {
  return { totalW: cellW * 2 + gap, xs: [0, cellW + gap] }
}
