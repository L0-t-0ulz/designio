import { describe, it, expect } from 'vitest'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import {
  buildGarmentSpecs,
  DEFAULT_PARAMS,
  GARMENT_TYPES,
  type GarmentType
} from '../src/renderer/garment/templates'
import { fillTube } from '../src/renderer/cloth/Garment'

describe('garment construction', () => {
  it('tops/dresses carry a neckline + shoulder line; a dress has a cinched waist', () => {
    const dress = buildGarmentSpecs('dress', DEFAULT_PARAMS, MEASUREMENTS)[0]
    const top = buildGarmentSpecs('top', DEFAULT_PARAMS, MEASUREMENTS)[0]
    expect(dress.neckline).toBe('scoop')
    expect(dress.shoulderY).toBe(MEASUREMENTS.shoulderY)
    expect(dress.radiusWaist).toBeLessThan(dress.radiusTop) // waist cinched vs bust
    expect(top.neckline).toBe('scoop')
  })

  it('the neckline lifts the shoulders above the front dip', () => {
    const radial = 40
    const rings = 16
    const pos = new Float32Array(radial * rings * 3)
    fillTube(pos, {
      rings,
      radial,
      topY: 1.44,
      bottomY: 0.7,
      radiusTop: 0.16,
      radiusBottom: 0.2,
      neckline: 'scoop',
      shoulderY: 1.44
    })
    const sideY = pos[0 * 3 + 1] // ix=0 → a=0 (side / shoulder)
    const frontY = pos[Math.round(radial / 4) * 3 + 1] // a≈π/2 (centre-front)
    expect(sideY).toBeGreaterThan(frontY + 0.02)
  })
})

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
