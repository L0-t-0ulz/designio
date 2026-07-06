import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentParams } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs, garmentSleeveSpecs } from '../src/renderer/garments/factory'
import { garmentToPanels } from '../src/renderer/export/garmentPattern'

const mann = buildMannequin()
const M = mann.measurements
const C = mann.colliders
const body = (id: string, over: Partial<GarmentParams> = {}) =>
  garmentTubeSpecs(getGarment(id), { ...DEFAULT_PARAMS, ...getGarment(id).defaults, ...over }, M)[0]

describe('construction detail', () => {
  it('pleats add hem fullness', () => {
    expect(body('dress', { pleats: true }).radiusBottom).toBeGreaterThan(body('dress', { pleats: false }).radiusBottom)
  })

  it('darts nip the waist', () => {
    const plain = body('dress', { dart: false })
    const darted = body('dress', { dart: true })
    expect(darted.radiusWaist!).toBeLessThan(plain.radiusWaist!)
  })

  it('a collar raises/closes the neckline (crew)', () => {
    expect(body('top', { collar: true }).neckline).toBe('crew')
    expect(body('top', { collar: false }).neckline).not.toBe('crew') // keeps the chosen neckline
  })

  it('a cuff draws the sleeve hem in', () => {
    const p = (cuff: boolean): GarmentParams => ({ ...DEFAULT_PARAMS, ...getGarment('top').defaults, sleeve: 'short', cuff })
    const plain = garmentSleeveSpecs(getGarment('top'), p(false), C)[0]
    const cuffed = garmentSleeveSpecs(getGarment('top'), p(true), C)[0]
    expect(cuffed.radiusEnd).toBeLessThan(plain.radiusEnd)
  })

  it('the flat pattern notes the active detail', () => {
    const res = garmentToPanels(
      getGarment('dress'),
      { ...DEFAULT_PARAMS, ...getGarment('dress').defaults, pleats: true, dart: true },
      M,
      C
    )
    expect(res.detail).toContain('pleats')
    expect(res.detail).toContain('darts')
  })
})
