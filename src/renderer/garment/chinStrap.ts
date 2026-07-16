/**
 * **Chin-strap physics** — a verlet strand pinned at BOTH ends (the two sides of a
 * hat) so it sags under the jaw into a catenary and swings when the head moves,
 * instead of a rigid bar. Unlike a hanging fringe strand (one anchor), a chin strap
 * is constrained at both anchors, so gravity pulls its middle down into the strap
 * curve. Pure verlet integration + distance constraints (no allocations, no DOM) so
 * it's unit-tested; the renderer draws the point chain as the strap line.
 */

const G = -9.81

/**
 * Advance a chin strap one fixed step. `pos`/`prev` hold `n` interior points (the
 * strand between anchors A and B); the chain is A → p0 → … → p(n-1) → B, each link
 * `segLen` long. Verlet-integrates gravity, then satisfies the links over `iters`
 * passes with both anchors pinned. Pure — mutates `pos`/`prev` in place.
 */
export function stepChinStrap(
  pos: Float32Array,
  prev: Float32Array,
  n: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  segLen: number,
  dt: number,
  damping = 0.96,
  iters = 6
): void {
  const g = G * dt * dt
  for (let i = 0; i < n; i++) {
    const k = i * 3
    const px = pos[k]
    const py = pos[k + 1]
    const pz = pos[k + 2]
    pos[k] = px + (px - prev[k]) * damping
    pos[k + 1] = py + (py - prev[k + 1]) * damping + g
    pos[k + 2] = pz + (pz - prev[k + 2]) * damping
    prev[k] = px
    prev[k + 1] = py
    prev[k + 2] = pz
  }
  // link a fixed anchor (fx,fy,fz) to a free point at index j — move only the point
  const pinTo = (fx: number, fy: number, fz: number, j: number): void => {
    const k = j * 3
    const dx = pos[k] - fx
    const dy = pos[k + 1] - fy
    const dz = pos[k + 2] - fz
    const d = Math.hypot(dx, dy, dz) || 1e-9
    const diff = (d - segLen) / d
    pos[k] -= dx * diff
    pos[k + 1] -= dy * diff
    pos[k + 2] -= dz * diff
  }
  // link two free points — move each half
  const link = (i: number, j: number): void => {
    const ki = i * 3
    const kj = j * 3
    const dx = pos[kj] - pos[ki]
    const dy = pos[kj + 1] - pos[ki + 1]
    const dz = pos[kj + 2] - pos[ki + 2]
    const d = Math.hypot(dx, dy, dz) || 1e-9
    const h = (0.5 * (d - segLen)) / d
    pos[ki] += dx * h
    pos[ki + 1] += dy * h
    pos[ki + 2] += dz * h
    pos[kj] -= dx * h
    pos[kj + 1] -= dy * h
    pos[kj + 2] -= dz * h
  }
  for (let iter = 0; iter < iters; iter++) {
    pinTo(ax, ay, az, 0) // A → p0
    for (let i = 0; i < n - 1; i++) link(i, i + 1) // internal links
    pinTo(bx, by, bz, n - 1) // p(n-1) → B
  }
}
