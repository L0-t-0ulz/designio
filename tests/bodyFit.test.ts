import { describe, it, expect } from 'vitest'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import { FIT_CLEARANCE, chestSurfaceR, clearedEase, stopAt } from '../src/renderer/avatar/bodyFit'
import { DEFAULT_PARAMS, type GarmentParams } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'
import { radiusAt } from '../src/renderer/cloth/Garment'

const withDefaults = (id: string): GarmentParams => ({ ...DEFAULT_PARAMS, ...getGarment(id).defaults })

describe('body fit clearance', () => {
  it('floors a relaxed ease at the collision shell and keeps compression', () => {
    expect(clearedEase(0.004)).toBe(FIT_CLEARANCE)
    expect(clearedEase(0.02)).toBe(0.02)
    expect(clearedEase(0)).toBe(FIT_CLEARANCE)
    expect(clearedEase(-0.006)).toBeCloseTo(-0.006, 6)
  })

  it('the bust sticks out past the chest measurement', () => {
    const female = chestSurfaceR(MEASUREMENTS.chestR, 'female')
    const male = chestSurfaceR(0.155, 'male')
    expect(female).toBeGreaterThan(MEASUREMENTS.chestR)
    expect(male).toBeGreaterThan(0.155)
    expect(MEASUREMENTS.chestSurfaceR).toBeCloseTo(female, 6)
  })

  it('a stop lands only when the landmark is inside the tube', () => {
    expect(stopAt(1.4, 0.5, 1.07, 0.12)?.t).toBeGreaterThan(0)
    expect(stopAt(1.4, 0.5, 1.4, 0.12)).toBeNull()
    expect(stopAt(1.07, 0.5, 1.2, 0.12)).toBeNull()
  })
})

describe('garments clear the mannequin', () => {
  const M = MEASUREMENTS

  it('a dress clears the bust and the waist instead of drafting inside them', () => {
    const dress = garmentTubeSpecs(getGarment('dress'), withDefaults('dress'), M)[0]
    const span = dress.topY - dress.bottomY
    const chestT = (dress.topY - M.chestY) / span
    const bust = (M.chestSurfaceR ?? chestSurfaceR(M.chestR, 'female')) + (getGarment('dress').defaults.ease ?? 0)
    expect(radiusAt(dress, chestT)).toBeGreaterThanOrEqual(bust - 1e-6)
    expect(dress.radiusWaist!).toBeGreaterThanOrEqual(M.waistR + FIT_CLEARANCE)
    expect(dress.radiusWaist!).toBeLessThan(dress.radiusTop)
  })

  it('a t-shirt follows the waist instead of tenting past it', () => {
    const top = garmentTubeSpecs(getGarment('top'), withDefaults('top'), M)[0]
    expect(top.radiusWaist).toBeDefined()
    expect(top.radiusWaist!).toBeGreaterThanOrEqual(M.waistR + FIT_CLEARANCE)
    expect(top.radiusWaist!).toBeLessThan(top.radiusTop)
  })

  it('darts still nip, and compression activewear stays inside the chest measurement', () => {
    const plain = garmentTubeSpecs(getGarment('dress'), withDefaults('dress'), M)[0]
    const darted = garmentTubeSpecs(getGarment('dress'), { ...withDefaults('dress'), dart: true }, M)[0]
    expect(darted.radiusWaist!).toBeLessThan(plain.radiusWaist!)
    const bra = garmentTubeSpecs(getGarment('sports-bra'), withDefaults('sports-bra'), M)[0]
    expect(bra.radiusTop).toBeLessThan(M.chestR)
    expect(bra.radiusStops).toBeUndefined()
  })
})
