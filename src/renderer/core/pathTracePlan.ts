/**
 * Pure planning for the path-traced hero render — maps a quality preset + a requested
 * output width to the sample budget, light-bounce depth and tile split the GPU tracer
 * runs with. Kept pure + unit-tested so the (GPU-only) tracer needs no eyeballing to
 * validate its budgeting.
 */
export type PathTraceQuality = 'draft' | 'high' | 'ultra'

export interface PathTracePlan {
  /** Accumulated samples to converge (more = less noise, slower). */
  samples: number
  /** Diffuse/glossy light bounces. */
  bounces: number
  /** Extra bounces allowed through transmissive (sheer/lace) materials. */
  transmissiveBounces: number
  /** N×N tile split per sample — bigger images tile more so a single GPU draw can't time out. */
  tiles: number
  /** Clamped output width in px. */
  width: number
}

const PRESETS: Record<PathTraceQuality, { samples: number; bounces: number; transmissiveBounces: number }> = {
  draft: { samples: 32, bounces: 3, transmissiveBounces: 2 },
  high: { samples: 160, bounces: 5, transmissiveBounces: 4 },
  ultra: { samples: 400, bounces: 8, transmissiveBounces: 6 }
}

export const PATH_TRACE_MIN_WIDTH = 256
export const PATH_TRACE_MAX_WIDTH = 4096

/** Clamp a requested output width to the supported render range (integer px). */
export function clampRenderWidth(width: number): number {
  if (!Number.isFinite(width)) return 2048
  return Math.max(PATH_TRACE_MIN_WIDTH, Math.min(PATH_TRACE_MAX_WIDTH, Math.round(width)))
}

/**
 * Tile split for an output width: ~one tile per 1024 px of width, so a 4K still is
 * split into a 4×4 grid of GPU draws (each small enough to dodge a driver watchdog
 * timeout) while an HD still renders in one pass.
 */
export function tilesForWidth(width: number): number {
  return Math.max(1, Math.min(4, Math.round(clampRenderWidth(width) / 1024)))
}

/** Resolve a quality preset + requested width into a concrete render plan. */
export function pathTracePlan(quality: PathTraceQuality, width: number): PathTracePlan {
  const p = PRESETS[quality] ?? PRESETS.high
  const w = clampRenderWidth(width)
  return { samples: p.samples, bounces: p.bounces, transmissiveBounces: p.transmissiveBounces, tiles: tilesForWidth(w), width: w }
}

/** Convergence fraction (0…1) for a progress bar. */
export function pathTraceProgress(samples: number, target: number): number {
  if (target <= 0) return 1
  return Math.max(0, Math.min(1, samples / target))
}
