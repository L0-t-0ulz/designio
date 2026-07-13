import { describe, it, expect } from 'vitest'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentParams, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'

const spec = (t: GarmentType) => garmentTubeSpecs(getGarment(t), { ...DEFAULT_PARAMS, ...getGarment(t).defaults } as GarmentParams, MEASUREMENTS)[0]

describe('menswear blocks', () => {
  it('registers the five blocks with tailored construction defaults', () => {
    const shirt = getGarment('dress-shirt')
    expect(shirt.defaults.collarStyle).toBe('shirt')
    expect(shirt.defaults.closure).toBe(true)
    expect(shirt.defaults.cuff).toBe(true)
    expect(shirt.defaults.yoke).toBe(true)
    const vest = getGarment('waistcoat')
    expect(vest.defaults.sleeve).toBe('none')
    expect(vest.defaults.neckline).toBe('v')
    expect(vest.supports.sleeve).toBe(false)
    const jacket = getGarment('suit-jacket')
    expect(jacket.defaults.collarStyle).toBe('notch')
    expect(jacket.defaults.interfaced).toBe(true)
    const trousers = getGarment('suit-trousers')
    expect(trousers.defaults.crease).toBe(true)
    expect(trousers.defaults.trouserBreak).toBe(true)
    // the suit halves share the cloth (one bolt cuts both)
    expect(jacket.defaultFabric).toBe(trousers.defaultFabric)
  })

  it('silhouettes read right: vest cropped < shirt < suit jacket < overcoat', () => {
    const vestLen = spec('waistcoat').topY - spec('waistcoat').bottomY
    const shirtLen = spec('dress-shirt').topY - spec('dress-shirt').bottomY
    const jacketLen = spec('suit-jacket').topY - spec('suit-jacket').bottomY
    const coatLen = spec('overcoat').topY - spec('overcoat').bottomY
    expect(vestLen).toBeLessThan(shirtLen)
    expect(shirtLen).toBeLessThan(jacketLen)
    expect(jacketLen).toBeLessThan(coatLen)
    // the suit jacket cuts closer than the blazer (a true suit block)
    expect(spec('suit-jacket').radiusTop).toBeLessThan(spec('blazer').radiusTop)
    // the overcoat is the roomiest (worn over a suit)
    expect(spec('overcoat').radiusTop).toBeGreaterThan(spec('suit-jacket').radiusTop)
  })
})
