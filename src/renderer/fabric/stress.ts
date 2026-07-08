/**
 * Stress / fit-failure colouring — a fit-validation view: where a too-tight garment
 * **stretches past its tolerance** it reads red (would strain/fail), warning-amber as
 * it approaches, and green where it's within tolerance. Only **tension** (positive
 * strain) counts toward failure; slack (compression) is safe. Pure + unit-tested;
 * reuses the heatmap's per-vertex colouring machinery.
 */

/** Fraction of stretch treated as the failure threshold (~22% ≈ seams/fabric at risk;
 *  a normal snug fit sits well under this, so only a genuinely too-tight garment reds out). */
export const STRESS_THRESHOLD = 0.22

export type StressLevel = 'safe' | 'warn' | 'fail'

/** The failure threshold scaled by a fabric's stretch (0 rigid … 1 knit): a stretchy
 *  fabric tolerates far more strain before it "fails" than a rigid one. */
export function stressThreshold(fabricStretch: number): number {
  return STRESS_THRESHOLD * (0.5 + Math.max(0, Math.min(1, fabricStretch)) * 2.5)
}

/** Classify a particle's strain against the failure threshold. */
export function stressLevel(strain: number, threshold = STRESS_THRESHOLD): StressLevel {
  const t = Math.max(0, strain) / (threshold || 1)
  if (t >= 1) return 'fail'
  if (t >= 0.5) return 'warn'
  return 'safe'
}

/** Strain → fit-validation colour: green (safe) → amber (warning) → red (fail). */
export function stressColor(strain: number, threshold = STRESS_THRESHOLD): [number, number, number] {
  const t = Math.max(0, strain) / (threshold || 1) // compression is safe → 0
  if (t < 0.5) {
    const u = t / 0.5 // green → yellow-green
    return [0.18 + 0.55 * u, 0.72 - 0.02 * u, 0.22]
  }
  if (t < 1) {
    const u = (t - 0.5) / 0.5 // amber → orange
    return [0.92, 0.72 - 0.5 * u, 0.16]
  }
  return [0.95, 0.12, 0.1] // red = would fail
}
