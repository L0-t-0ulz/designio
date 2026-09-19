/**
 * **Stretch utilisation** — how much of a fabric's *available* stretch a garment is
 * actually consuming, as a dimensionless fraction.
 *
 * The fit heatmap shows raw strain and the stress view shows distance to failure.
 * Neither answers the question a designer asks when choosing cloth: *is there any
 * give left?* A 6% strain is nothing in a power knit and is past the limit in a
 * rigid woven, so the same colour means opposite things unless it is normalised by
 * what the fabric can give.
 *
 *   utilisation u = ε⁺ / ε_max(fabric)
 *
 * where ε is engineering strain and ε_max the fabric's usable elongation.
 *
 * Pure + unit-tested.
 */

/**
 * Usable elongation for the library's normalised `stretch` index (0 rigid … 1 knit).
 *
 * The index is a dimensionless handle, so it has to be calibrated onto real
 * elongation before a utilisation figure means anything. The endpoints are taken
 * from textile practice:
 *
 *  - **3%** at index 0 — the on-grain give of a stable woven (denim, canvas). Not
 *    zero: even a rigid woven has crimp interchange, which is why a bias cut behaves
 *    so differently from a straight-grain one.
 *  - **100%** at index 1 — a power/elastane knit, which extends to double its length
 *    and recovers.
 *
 * Interpolation is **geometric, not linear**, because the range spans a factor of
 * ~33. Linear interpolation puts the midpoint at 51% elongation, which would call a
 * mid-range fabric a power knit; geometric puts it at ~17%, which is a stable jersey.
 * That is the physically sensible reading of a perceptual 0…1 index.
 */
export const MIN_USABLE_STRETCH = 0.03
export const MAX_USABLE_STRETCH = 1.0

export function usableStretch(stretchIndex: number): number {
  // Math.min/max propagate NaN, so a NaN index would poison the elongation, the
  // utilisation and every vertex colour derived from it. Treat it as the rigid end:
  // under-reporting a fabric's give is the safe direction for a fit warning.
  const t = Number.isFinite(stretchIndex) ? Math.max(0, Math.min(1, stretchIndex)) : 0
  return MIN_USABLE_STRETCH * Math.pow(MAX_USABLE_STRETCH / MIN_USABLE_STRETCH, t)
}

/**
 * Utilisation for a particle's signed strain against a fabric.
 *
 * Only **tension** consumes stretch: a slack region (negative strain) is using none
 * of it, so compression floors at 0 rather than reading as negative utilisation.
 *
 * Deliberately **not clamped above 1**. u > 1 means the garment is demanding more
 * elongation than the cloth has — it will distort, grin at the seams, or fail — and
 * flattening that to "100%" would hide exactly the case worth seeing.
 */
export function stretchUtilisation(strain: number, stretchIndex: number): number {
  const max = usableStretch(stretchIndex)
  if (!(max > 0) || !Number.isFinite(strain)) return 0
  return Math.max(0, strain) / max
}

export type UtilisationBand = 'slack' | 'comfortable' | 'working' | 'limit' | 'over'

/**
 * Bands a fitter reads off the garment.
 *
 * The boundaries are practical rather than arbitrary: under 10% the cloth is doing
 * nothing, 10–60% is the range a garment is meant to live in, 60–90% is working hard
 * (it will feel tight and recover slowly), 90–100% is at the limit, and over 100% is
 * asking for elongation the fabric does not have.
 */
export function utilisationBand(u: number): UtilisationBand {
  if (u > 1) return 'over'
  if (u >= 0.9) return 'limit'
  if (u >= 0.6) return 'working'
  if (u >= 0.1) return 'comfortable'
  return 'slack'
}

/** Band → colour, cool (unused) through to magenta (past the limit). */
export function utilisationColor(u: number): [number, number, number] {
  if (u > 1) return [0.85, 0.1, 0.75] // magenta: distinct from the stress view's red
  const t = Math.max(0, Math.min(1, u))
  if (t < 0.6) {
    const k = t / 0.6 // slate → green
    return [0.22 + 0.0 * k, 0.35 + 0.37 * k, 0.55 - 0.32 * k]
  }
  const k = (t - 0.6) / 0.4 // green → red
  return [0.22 + 0.7 * k, 0.72 - 0.58 * k, 0.23 - 0.09 * k]
}

export interface UtilisationSummary {
  /** Highest utilisation anywhere on the garment. */
  peak: number
  /** Area-unweighted mean over the sampled particles. */
  mean: number
  /** Fraction of samples demanding more stretch than the fabric has, 0…1. */
  overFraction: number
  /** The fabric's usable elongation, for the readout. */
  usable: number
}

/**
 * Summarise a garment's utilisation from its per-particle strains.
 *
 * `peak` is what decides whether the garment is wearable; `mean` alone would hide a
 * single blown-out armhole in an otherwise slack shirt, which is precisely the defect
 * this view exists to find.
 */
export function utilisationSummary(strains: readonly number[], stretchIndex: number): UtilisationSummary {
  const usable = usableStretch(stretchIndex)
  if (!strains.length) return { peak: 0, mean: 0, overFraction: 0, usable }
  let peak = 0
  let sum = 0
  let over = 0
  for (const s of strains) {
    const u = stretchUtilisation(s, stretchIndex)
    if (u > peak) peak = u
    sum += u
    if (u > 1) over++
  }
  return { peak, mean: sum / strains.length, overFraction: over / strains.length, usable }
}

/** A one-line readout, e.g. "peak 72% of 17% usable stretch". */
export function utilisationReadout(s: UtilisationSummary): string {
  const pct = (v: number): string => `${Math.round(v * 100)}%`
  const over = s.overFraction > 0 ? ` · ${pct(s.overFraction)} over limit` : ''
  return `peak ${pct(s.peak)} of ${pct(s.usable)} usable stretch${over}`
}
