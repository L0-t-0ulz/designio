import { describe, it, expect } from 'vitest'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentParams, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'

const specs = (t: GarmentType, p: Partial<GarmentParams> = {}) =>
  garmentTubeSpecs(getGarment(t), { ...DEFAULT_PARAMS, ...getGarment(t).defaults, ...p }, MEASUREMENTS)

describe('ease by zone (chest · waist · hip)', () => {
  it('chest ease widens only the chest landmark of a top', () => {
    const base = specs('top')[0]
    const eased = specs('top', { easeChest: 0.02 })[0]
    expect(eased.radiusTop).toBeCloseTo(base.radiusTop + 0.02, 6) // chest zone grows
    expect(eased.radiusBottom).toBeCloseTo(base.radiusBottom, 6) // hem untouched
  })

  it('hip ease widens the hem of a dress and the leg top of trousers, not the chest', () => {
    const dBase = specs('dress')[0]
    const dEased = specs('dress', { easeHip: 0.02 })[0]
    expect(dEased.radiusBottom).toBeCloseTo(dBase.radiusBottom + 0.02, 6)
    expect(dEased.radiusTop).toBeCloseTo(dBase.radiusTop, 6)
    const pBase = specs('pants', {})[0]
    const pEased = specs('pants', { easeHip: 0.02 })[0]
    expect(pEased.radiusTop).toBeCloseTo(pBase.radiusTop + 0.02, 6) // the seat governs the leg top
  })

  it('waist ease opens a cinched waist and a skirt waistband', () => {
    const dBase = specs('dress')[0] // dressTube cinches the waist
    const dEased = specs('dress', { easeWaist: 0.015 })[0]
    expect(dEased.radiusWaist!).toBeCloseTo(dBase.radiusWaist! + 0.015, 6)
    const sBase = specs('skirt')[0] // skirtTube anchors at the waist
    const sEased = specs('skirt', { easeWaist: 0.015 })[0]
    expect(sEased.radiusTop).toBeCloseTo(sBase.radiusTop + 0.015, 6)
  })

  it('the bra band (chest90 bottom) takes the chest zone, not the hip zone', () => {
    const base = specs('sports-bra')[0]
    const chest = specs('sports-bra', { easeChest: 0.01 })[0]
    const hip = specs('sports-bra', { easeHip: 0.01 })[0]
    expect(chest.radiusBottom).toBeCloseTo(base.radiusBottom + 0.01, 6)
    expect(hip.radiusBottom).toBeCloseTo(base.radiusBottom, 6)
  })
})
