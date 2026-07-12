import { BASE_MEASUREMENTS_CM, type BodyMeasurementsCm } from './measure'
import { SIZES, type SizeLabel } from '../studio/document'

/**
 * **Size recommendation** — which size of the graded run fits *this* body the way
 * the designer drafted the block to fit the base body. The M block carries the
 * intended ease at every girth point; for a customer's measurements we pick the
 * size whose girths reproduce that intended ease most closely (chest-weighted for
 * tops, waistband-weighted for bottoms — the industry fit points). Pure +
 * unit-tested; fed by the same graded POM the tech pack prints.
 */

/** A graded girth row (subset of the POM's `PomRow`). */
export interface GirthRow {
  label: string
  bySize: Record<SizeLabel, number>
}

/** The girth points that drive fit, mapped to the body measurement they wrap. */
const FIT_POINTS: { label: string; body: keyof BodyMeasurementsCm; weight: number }[] = [
  { label: 'Chest', body: 'bust', weight: 3 }, // tops/dresses fit from the bust first
  { label: 'Waist', body: 'waist', weight: 1 },
  { label: 'Waistband', body: 'waist', weight: 3 } // bottoms fit from the waistband
]

export interface SizeRecommendation {
  size: SizeLabel
  /** How many girth points informed the pick (0 = nothing girth-graded → fell back to M). */
  points: number
  /** Σ weighted |ease error| (cm) at the recommended size — smaller = truer to the draft. */
  score: number
}

/**
 * Recommend a size for `body` given the garment's graded girth rows. The intended
 * ease per point is read from the base (M) column against the base body; the
 * recommended size minimises the weighted ease error. Ties go to the smaller size.
 */
export function recommendSize(body: BodyMeasurementsCm, rows: GirthRow[], base: BodyMeasurementsCm = BASE_MEASUREMENTS_CM): SizeRecommendation {
  const points = FIT_POINTS.map((p) => {
    const row = rows.find((r) => r.label === p.label)
    return row ? { ...p, row, intendedEase: row.bySize.M - base[p.body] } : null
  }).filter((p) => p !== null)
  if (points.length === 0) return { size: 'M', points: 0, score: 0 }

  let best: SizeLabel = 'M'
  let bestScore = Infinity
  for (const size of SIZES) {
    let score = 0
    for (const p of points) {
      const ease = p.row.bySize[size] - body[p.body]
      score += p.weight * Math.abs(ease - p.intendedEase)
    }
    if (score < bestScore) {
      bestScore = score
      best = size
    }
  }
  return { size: best, points: points.length, score: Math.round(bestScore * 100) / 100 }
}
