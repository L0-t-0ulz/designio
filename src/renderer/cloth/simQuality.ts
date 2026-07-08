/**
 * Simulation **resolution** (particle count) + **quality** (solver substeps) — the
 * dense-garment path in lieu of a GPU rewrite. Higher resolution tessellates the
 * garment tubes into far more particles (denser cloth, finer folds); the quality
 * slider trades solver substeps for framerate. Pure math, unit-tested; the factory
 * scales the tubes and the controllers set the substeps.
 */
export type SimResolution = 'coarse' | 'normal' | 'fine' | 'ultra'

export const SIM_RESOLUTIONS: { name: SimResolution; label: string; scale: number }[] = [
  { name: 'coarse', label: 'Coarse', scale: 0.7 },
  { name: 'normal', label: 'Normal', scale: 1 },
  { name: 'fine', label: 'Fine', scale: 1.45 },
  { name: 'ultra', label: 'Ultra', scale: 1.9 }
]

export function getResolutionScale(name: SimResolution): number {
  return SIM_RESOLUTIONS.find((r) => r.name === name)?.scale ?? 1
}

/**
 * Scale a tube's segment counts by the sim resolution, clamped to sane bounds so a
 * dense garment stays stable + tractable. `divisor` is the metres-per-ring the piece
 * was authored at (bodies ≈ 0.022, sleeves ≈ 0.03).
 */
export function simTube(baseRadial: number, height: number, divisor: number, scale: number): { radial: number; rings: number } {
  return {
    radial: Math.max(8, Math.min(150, Math.round(baseRadial * scale))),
    rings: Math.max(6, Math.min(120, Math.round((height / divisor) * scale)))
  }
}

/** Quality slider `t` ∈ [0,1] (perf → quality) → solver substeps (6…20). */
export function qualityToSubsteps(t: number): number {
  const u = Math.max(0, Math.min(1, t))
  return Math.round(6 + u * 14)
}
