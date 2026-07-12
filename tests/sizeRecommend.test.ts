import { describe, it, expect } from 'vitest'
import { recommendSize } from '../src/renderer/avatar/sizeRecommend'
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
    expect(r).toEqual({ size: 'M', points: 0, score: 0 })
  })
})
