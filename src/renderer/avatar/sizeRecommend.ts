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
  /**
   * How sure the pick is, 0…1 — the posterior probability of this size under the
   * softmax below. Never reaches 1 (some other size is always *conceivable*) and
   * never falls below 1/N (the uniform case, where every size fits equally badly).
   */
  confidence: number
  /** The next-best size, or null when only one size was scored. */
  runnerUp: SizeLabel | null
  /** How much worse the runner-up is, in weighted cm of ease error. */
  marginCm: number
}

/**
 * Ease error a wearer cannot tell apart, in cm per unit weight.
 *
 * This sets the softmax temperature, and it is the one number that decides what
 * "confident" means. A centimetre of girth ease is around the threshold of
 * perception on a body — below that, two sizes genuinely are equally good, and a
 * recommender that claims certainty between them is lying.
 */
export const FIT_INDIFFERENCE_CM = 1

/**
 * Turn per-size ease errors into a probability distribution.
 *
 * Softmax over the negated scores: p(s) ∝ exp(−score_s / T). The temperature is
 * scaled by the **total fit-point weight** so that confidence does not drift when a
 * garment happens to match two fit points instead of one — the scores scale with
 * weight, so the temperature has to as well, or a bottoms block would look
 * systematically more confident than a tops block.
 *
 * Scores are shifted by their minimum before exponentiating (the standard
 * log-sum-exp stabilisation): without it a large ease error overflows `exp` to
 * Infinity and the whole distribution comes back NaN.
 */
export function scoresToConfidence(scores: number[], totalWeight: number): number[] {
  if (!scores.length) return []
  const T = Math.max(1e-9, totalWeight * FIT_INDIFFERENCE_CM)
  const min = Math.min(...scores)
  const weights = scores.map((s) => Math.exp(-(s - min) / T))
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!(sum > 0) || !Number.isFinite(sum)) return scores.map(() => 1 / scores.length)
  return weights.map((w) => w / sum)
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
  if (points.length === 0) return { size: 'M', points: 0, score: 0, confidence: 1, runnerUp: null, marginCm: 0 }

  const totalWeight = points.reduce((w, p) => w + p.weight, 0)
  const scores = SIZES.map((size) => {
    let score = 0
    for (const p of points) {
      const ease = p.row.bySize[size] - body[p.body]
      score += p.weight * Math.abs(ease - p.intendedEase)
    }
    return score
  })

  // ties go to the smaller size, which is why this is a strict `<` over SIZES order
  let bestIdx = 0
  for (let i = 1; i < scores.length; i++) if (scores[i] < scores[bestIdx]) bestIdx = i

  let runnerIdx = -1
  for (let i = 0; i < scores.length; i++) {
    if (i === bestIdx) continue
    if (runnerIdx === -1 || scores[i] < scores[runnerIdx]) runnerIdx = i
  }

  const confidence = scoresToConfidence(scores, totalWeight)[bestIdx]
  const round2 = (v: number): number => Math.round(v * 100) / 100
  return {
    size: SIZES[bestIdx],
    points: points.length,
    score: round2(scores[bestIdx]),
    confidence: Math.round(confidence * 1000) / 1000,
    runnerUp: runnerIdx === -1 ? null : SIZES[runnerIdx],
    marginCm: runnerIdx === -1 ? 0 : round2(scores[runnerIdx] - scores[bestIdx])
  }
}

/** How sure the pick reads to a person. */
export function confidenceLabel(confidence: number): 'high' | 'moderate' | 'low' {
  if (confidence >= 0.7) return 'high'
  if (confidence >= 0.45) return 'moderate'
  return 'low'
}

/** A one-line readout for the panel, naming the alternative when it is close. */
export function sizeRecommendationReadout(r: SizeRecommendation): string {
  if (r.points === 0) return `Best fit for this body: ${r.size}`
  const pct = Math.round(r.confidence * 100)
  const level = confidenceLabel(r.confidence)
  const close = level !== 'high' && r.runnerUp ? ` · close to ${r.runnerUp}` : ''
  return `Best fit for this body: ${r.size} (${pct}% confidence${close})`
}
