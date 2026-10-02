import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { garmentSleeveSpecs } from '../src/renderer/garments/factory'
import { getGarment } from '../src/renderer/garments/registry'
import { DEFAULT_PARAMS, type SleeveStyle } from '../src/renderer/garment/templates'

const mann = buildMannequin()
const len = (style: SleeveStyle): number => {
  const spec = garmentSleeveSpecs(getGarment('top'), { ...DEFAULT_PARAMS, sleeve: style, sleeveShape: 'set-in' }, mann.colliders)[0]
  return spec.a.distanceTo(spec.b)
}

describe('sleeve length stops', () => {
  it('orders the stops along the arm: short < elbow < ¾ < bracelet < long', () => {
    const short = len('short')
    const elbow = len('elbow')
    const tq = len('three-quarter')
    const bracelet = len('bracelet')
    const long = len('long')
    expect(short).toBeLessThan(elbow)
    expect(elbow).toBeLessThan(tq)
    expect(tq).toBeLessThan(bracelet)
    expect(bracelet).toBeLessThan(long)
  })

  it('a cap and a flutter stay shorter than a set-in short sleeve', () => {
    const short = garmentSleeveSpecs(getGarment('top'), { ...DEFAULT_PARAMS, sleeve: 'short', sleeveShape: 'set-in' }, mann.colliders)[0]
    const cap = garmentSleeveSpecs(getGarment('top'), { ...DEFAULT_PARAMS, sleeve: 'long', sleeveShape: 'cap' }, mann.colliders)[0]
    const flutter = garmentSleeveSpecs(getGarment('top'), { ...DEFAULT_PARAMS, sleeve: 'long', sleeveShape: 'flutter' }, mann.colliders)[0]
    expect(cap.a.distanceTo(cap.b)).toBeLessThan(short.a.distanceTo(short.b))
    expect(flutter.a.distanceTo(flutter.b)).toBeLessThan(short.a.distanceTo(short.b))
  })

  it('none yields no sleeves; statement shapes stay full-length at any stop', () => {
    expect(garmentSleeveSpecs(getGarment('top'), { ...DEFAULT_PARAMS, sleeve: 'none' }, mann.colliders)).toEqual([])
    const bishopElbow = garmentSleeveSpecs(getGarment('top'), { ...DEFAULT_PARAMS, sleeve: 'elbow', sleeveShape: 'bishop' }, mann.colliders)[0]
    const bishopLong = garmentSleeveSpecs(getGarment('top'), { ...DEFAULT_PARAMS, sleeve: 'long', sleeveShape: 'bishop' }, mann.colliders)[0]
    expect(bishopElbow.a.distanceTo(bishopElbow.b)).toBeCloseTo(bishopLong.a.distanceTo(bishopLong.b), 10)
  })
})
