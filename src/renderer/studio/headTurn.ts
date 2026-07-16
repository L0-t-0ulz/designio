/**
 * **Head-turn stress captures** — the pure sweep of head-turn angles a stress
 * capture steps through, so a maker can see where headwear strains as the head turns
 * left↔right (a beanie's crown seam, a strap). A symmetric fan from −max to +max;
 * the capture tooling poses the head at each and snapshots the strain view.
 */

/** `n` evenly-spaced turn angles (deg) from −maxDeg to +maxDeg (includes 0 for odd n). */
export function headTurnAngles(n = 5, maxDeg = 45): number[] {
  if (n <= 1) return [0]
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(Math.round((-maxDeg + (2 * maxDeg * i) / (n - 1)) * 10) / 10)
  return out
}
