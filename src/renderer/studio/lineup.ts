import * as THREE from 'three'

/**
 * Runway line-up — a **collection shot** of the current garment across several
 * colourways, rendered side by side into one image. The per-avatar body + cloth
 * sim is a singleton, so rather than surgically offset colliders (fragile), the
 * line-up snapshots the live view once per colourway and composites them. The
 * layout + colour maths are pure so they're unit-tested; `main` drives the
 * snapshot/compositing.
 */

/** Even side-by-side cell x-positions + the total canvas width for `n` cells. */
export function lineupCells(n: number, cellW: number, gap = 0): { totalW: number; xs: number[] } {
  const xs: number[] = []
  for (let i = 0; i < n; i++) xs.push(i * (cellW + gap))
  const totalW = n > 0 ? n * cellW + (n - 1) * gap : 0
  return { totalW, xs }
}

/**
 * `n` colourway hexes for the line-up — cell 0 is the current colour, the rest are
 * evenly hue-rotated around the wheel (kept saturated + mid-light so they read).
 */
export function lineupHues(base: number, n: number): number[] {
  const c = new THREE.Color(base)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  const s = Math.max(0.4, hsl.s)
  const l = Math.min(0.62, Math.max(0.38, hsl.l))
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    out.push(i === 0 ? base : new THREE.Color().setHSL((hsl.h + i / n) % 1, s, l).getHex())
  }
  return out
}
