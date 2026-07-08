/**
 * Fit / tension heatmap colour ramp — maps a garment particle's signed strain
 * (from `XPBDSolver.strain`) to an RGB colour: **slack → blue**, neutral → green,
 * **tight → red**. `scale` is the strain that saturates the ends. Pure + unit-tested;
 * the stack bakes it into the mesh's vertex colours.
 */
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

export function strainToColor(strain: number, scale = 0.12): [number, number, number] {
  const t = clamp(strain / (scale || 1), -1, 1) // −1 slack … 0 neutral … +1 tight
  if (t < 0) {
    const u = t + 1 // 0 (blue) → 1 (green)
    return [0.1 * u, 0.3 + 0.5 * u, 1 - 0.85 * u]
  }
  const u = t // 0 (green) → 1 (red)
  return [0.1 + 0.9 * u, 0.8 - 0.65 * u, 0.2 - 0.1 * u]
}
