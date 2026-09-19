import { describe, it, expect } from 'vitest'
import { recommendSize, scoresToConfidence, confidenceLabel, sizeRecommendationReadout } from '../src/renderer/avatar/sizeRecommend'
import { BASE_MEASUREMENTS_CM } from '../src/renderer/avatar/measure'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer } from '../src/renderer/studio/document'
import { pomTable } from '../src/renderer/export/pom'

const mann = buildMannequin()
const pomFor = (id: 'dress' | 'top' | 'pants') => pomTable(getGarment(id), defaultLayer(id), mann.measurements, mann.colliders).rows

describe('size recommendation', () => {
  it('the base body gets the drafted block (M) on every garment family', () => {
    for (const id of ['dress', 'top', 'pants'] as const) {
      const r = recommendSize(BASE_MEASUREMENTS_CM, pomFor(id))
      expect(r.size).toBe('M')
      expect(r.points).toBeGreaterThan(0)
    }
  })

  it('a fuller bust sizes up; a smaller one sizes down (≈4 cm circumference per size)', () => {
    const rows = pomFor('dress')
    const up = recommendSize({ ...BASE_MEASUREMENTS_CM, bust: BASE_MEASUREMENTS_CM.bust + 8 }, rows)
    expect(['L', 'XL']).toContain(up.size) // +8 cm ≈ two sizes
    const down = recommendSize({ ...BASE_MEASUREMENTS_CM, bust: BASE_MEASUREMENTS_CM.bust - 8 }, rows)
    expect(['XS', 'S']).toContain(down.size)
  })

  it('bottoms fit from the waistband: a bigger waist sizes trousers up even with the base bust', () => {
    const rows = pomFor('pants')
    const r = recommendSize({ ...BASE_MEASUREMENTS_CM, waist: BASE_MEASUREMENTS_CM.waist + 8 }, rows)
    expect(['L', 'XL']).toContain(r.size)
  })

  it('the chest outweighs the waist when they disagree (industry fit point)', () => {
    const rows = pomFor('dress')
    // bust says size up two, waist says size down two → chest (w3) wins over waist (w1)
    const r = recommendSize({ ...BASE_MEASUREMENTS_CM, bust: BASE_MEASUREMENTS_CM.bust + 8, waist: BASE_MEASUREMENTS_CM.waist - 8 }, rows)
    expect(['L', 'XL']).toContain(r.size)
  })

  it('no girth rows → falls back to M with zero points', () => {
    const r = recommendSize(BASE_MEASUREMENTS_CM, [{ label: 'Length', bySize: { XS: 1, S: 1, M: 1, L: 1, XL: 1, XXL: 1 } }])
    // with nothing to weigh up there is no competing size, so the pick is certain
    expect(r).toEqual({ size: 'M', points: 0, score: 0, confidence: 1, runnerUp: null, marginCm: 0 })
  })
})

describe('recommendation confidence', () => {
  it('is a probability distribution — sums to 1, all non-negative', () => {
    const p = scoresToConfidence([0, 2, 5, 9, 14, 20], 7)
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    for (const v of p) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('is uniform when every size fits equally badly', () => {
    const p = scoresToConfidence([4, 4, 4, 4], 3)
    for (const v of p) expect(v).toBeCloseTo(0.25, 12)
  })

  it('splits evenly between two tied leaders', () => {
    // two sizes tied at the front, the rest far behind
    const p = scoresToConfidence([0, 0, 40, 40], 3)
    expect(p[0]).toBeCloseTo(p[1], 12)
    expect(p[0] + p[1]).toBeGreaterThan(0.99)
  })

  it('is monotone — a better score never gets less probability', () => {
    const scores = [1, 3, 3.0001, 8, 20]
    const p = scoresToConfidence(scores, 4)
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[i - 1]) expect(p[i]).toBeLessThanOrEqual(p[i - 1] + 1e-12)
    }
  })

  it('is invariant to shifting every score by a constant', () => {
    // only differences between sizes carry information
    const a = scoresToConfidence([1, 4, 9], 3)
    const b = scoresToConfidence([101, 104, 109], 3)
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i], 12)
  })

  it('survives scores large enough to overflow a naive exp()', () => {
    // exp(2000) is Infinity; without the log-sum-exp shift the whole vector is NaN
    const p = scoresToConfidence([0, 2000, 5000], 1)
    expect(p.every((v) => Number.isFinite(v))).toBe(true)
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    expect(p[0]).toBeCloseTo(1, 10)
  })

  it('does not drift with the number of fit points — the weight scaling', () => {
    // the same *relative* fit, scored at double the weight, must read the same
    const light = scoresToConfidence([0, 3, 7], 3)
    const heavy = scoresToConfidence([0, 6, 14], 6)
    for (let i = 0; i < light.length; i++) expect(heavy[i]).toBeCloseTo(light[i], 12)
  })

  it('handles an empty or single-size input', () => {
    expect(scoresToConfidence([], 3)).toEqual([])
    expect(scoresToConfidence([5], 3)).toEqual([1])
  })

  it('never claims certainty, and never goes below uniform', () => {
    const p = scoresToConfidence([0, 1e6, 1e6, 1e6], 3)
    expect(Math.max(...p)).toBeLessThanOrEqual(1)
    expect(Math.min(...p)).toBeGreaterThanOrEqual(0)
    const flat = scoresToConfidence([2, 2, 2, 2], 3)
    expect(Math.max(...flat)).toBeCloseTo(0.25, 12)
  })
})

describe('the recommendation reads out honestly', () => {
  const rows = [{ label: 'Chest', bySize: { XS: 84, S: 88, M: 92, L: 96, XL: 100, XXL: 104 } }]

  it('is confident when the body sits squarely on a size', () => {
    const r = recommendSize({ ...BASE_MEASUREMENTS_CM, bust: BASE_MEASUREMENTS_CM.bust }, rows)
    expect(r.confidence).toBeGreaterThan(0.45)
    expect(r.runnerUp).not.toBe(r.size)
  })

  it('is less confident when the body sits between two sizes', () => {
    const onSize = recommendSize({ ...BASE_MEASUREMENTS_CM }, rows)
    const between = recommendSize({ ...BASE_MEASUREMENTS_CM, bust: BASE_MEASUREMENTS_CM.bust + 2 }, rows)
    expect(between.confidence).toBeLessThan(onSize.confidence)
    expect(between.marginCm).toBeLessThan(onSize.marginCm)
  })

  it('names a runner-up and a margin', () => {
    const r = recommendSize({ ...BASE_MEASUREMENTS_CM }, rows)
    expect(r.runnerUp).toBeTruthy()
    expect(r.marginCm).toBeGreaterThanOrEqual(0)
  })

  it('still recommends M with full confidence when nothing is girth-graded', () => {
    const r = recommendSize({ ...BASE_MEASUREMENTS_CM }, [])
    expect(r).toMatchObject({ size: 'M', points: 0, confidence: 1, runnerUp: null, marginCm: 0 })
  })

  it('bands the confidence for a reader', () => {
    expect(confidenceLabel(0.9)).toBe('high')
    expect(confidenceLabel(0.5)).toBe('moderate')
    expect(confidenceLabel(0.2)).toBe('low')
  })

  it('mentions the alternative only when the pick is not clear-cut', () => {
    const sure = sizeRecommendationReadout({ size: 'M', points: 2, score: 0, confidence: 0.92, runnerUp: 'L', marginCm: 9 })
    expect(sure).toContain('92%')
    expect(sure).not.toContain('close to')
    const unsure = sizeRecommendationReadout({ size: 'M', points: 2, score: 1, confidence: 0.5, runnerUp: 'L', marginCm: 0.2 })
    expect(unsure).toContain('close to L')
  })
})
