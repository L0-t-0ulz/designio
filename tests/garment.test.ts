import { describe, it, expect } from 'vitest'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import {
  buildGarmentSpecs,
  DEFAULT_PARAMS,
  GARMENT_TYPES,
  type GarmentType
} from '../src/renderer/garment/templates'

describe('garment templates', () => {
  it('produces the right number of pieces per type', () => {
    const count = (t: GarmentType): number =>
      buildGarmentSpecs(t, DEFAULT_PARAMS, MEASUREMENTS).length
    expect(count('dress')).toBe(1)
    expect(count('skirt')).toBe(1)
    expect(count('top')).toBe(1)
    expect(count('pants')).toBe(2) // two legs
  })

  it('produces geometrically valid tube pieces', () => {
    for (const t of GARMENT_TYPES) {
      for (const spec of buildGarmentSpecs(t, DEFAULT_PARAMS, MEASUREMENTS)) {
        expect(spec.topY).toBeGreaterThan(spec.bottomY)
        expect(spec.radiusTop).toBeGreaterThan(0)
        expect(spec.radiusBottom).toBeGreaterThan(0)
        expect(spec.rings).toBeGreaterThanOrEqual(10)
        expect(spec.radial).toBeGreaterThan(3)
      }
    }
  })

  it('length makes the hem lower', () => {
    const short = buildGarmentSpecs('dress', { ...DEFAULT_PARAMS, length: 0.1 }, MEASUREMENTS)[0]
    const long = buildGarmentSpecs('dress', { ...DEFAULT_PARAMS, length: 0.95 }, MEASUREMENTS)[0]
    expect(long.bottomY).toBeLessThan(short.bottomY)
  })

  it('pants legs are offset left and right of centre', () => {
    const [l, r] = buildGarmentSpecs('pants', DEFAULT_PARAMS, MEASUREMENTS)
    expect(Math.sign(l.centerX ?? 0)).toBe(-Math.sign(r.centerX ?? 0))
    expect(Math.abs(l.centerX ?? 0)).toBeCloseTo(MEASUREMENTS.hipHalfX, 6)
  })
})
