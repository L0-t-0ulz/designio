import { describe, it, expect } from 'vitest'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentParams, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'
import { creaseWave, fillTube, tubeRingT, type TubeSpec } from '../src/renderer/cloth/Garment'

const specs = (t: GarmentType, p: GarmentParams) => garmentTubeSpecs(getGarment(t), p, MEASUREMENTS)
const withDefaults = (t: GarmentType): GarmentParams => ({ ...DEFAULT_PARAMS, ...getGarment(t).defaults })

describe('trouser break + crease', () => {
  it('creaseWave: sharp ridges at front/back, ~flat at the sides', () => {
    expect(creaseWave(Math.PI / 2)).toBeCloseTo(1, 10) // front centre
    expect(creaseWave((3 * Math.PI) / 2)).toBeCloseTo(1, 10) // back centre
    expect(creaseWave(0)).toBeCloseTo(0, 10) // side seam
    expect(creaseWave(Math.PI)).toBeCloseTo(0, 10)
    // narrow: 30° off the ridge it has already died away
    expect(creaseWave(Math.PI / 2 + Math.PI / 6)).toBeLessThan(0.2)
  })

  it('a creased tube cross-section is elongated fore-aft, unchanged at the sides', () => {
    const base: TubeSpec = { rings: 6, radial: 16, topY: 1, bottomY: 0.5, radiusTop: 0.1, radiusBottom: 0.1 }
    const flat = new Float32Array(16 * 6 * 3)
    const creased = new Float32Array(16 * 6 * 3)
    fillTube(flat, base, tubeRingT(base))
    fillTube(creased, { ...base, crease: true }, tubeRingT({ ...base, crease: true }))
    const radiusOf = (pos: Float32Array, ix: number): number => Math.hypot(pos[ix * 3], pos[ix * 3 + 2])
    expect(radiusOf(creased, 4)).toBeGreaterThan(radiusOf(flat, 4)) // ix=4 → angle π/2 (front) pushed out
    expect(radiusOf(creased, 0)).toBeCloseTo(radiusOf(flat, 0), 10) // side seam untouched
  })

  it('trousers press a crease + carry a break by default; skirts and leggings support neither', () => {
    expect(getGarment('pants').defaults.crease).toBe(true)
    expect(getGarment('pants').defaults.trouserBreak).toBe(true)
    expect(getGarment('pants').supports.crease).toBe(true)
    expect(getGarment('skirt').supports.crease).toBeUndefined()
    expect(getGarment('leggings').supports.trouserBreak).toBeUndefined()
    const legs = specs('pants', withDefaults('pants'))
    expect(legs.every((s) => s.crease)).toBe(true)
  })

  it('the break lengthens the leg — the hem runs past where it would otherwise end', () => {
    const p = withDefaults('pants')
    const withBreak = specs('pants', { ...p, trouserBreak: true })[0]
    const without = specs('pants', { ...p, trouserBreak: false })[0]
    expect(without.bottomY - withBreak.bottomY).toBeCloseTo(0.028, 5)
  })
})
