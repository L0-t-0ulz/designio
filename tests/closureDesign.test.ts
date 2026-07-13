import { describe, it, expect } from 'vitest'
import { buttonCount, buttonScale } from '../src/renderer/studio/closureDesign'
import { cloneLayer, defaultLayer, parseDoc, serializeDoc, type ProjectDoc } from '../src/renderer/studio/document'

describe('buttons & closures designer', () => {
  it('button count: auto follows the placket height; requests clamp 2…9', () => {
    expect(buttonCount(0.51)).toBe(6) // classic: ~one per 8.5 cm
    expect(buttonCount(0.51, 4)).toBe(4)
    expect(buttonCount(0.51, 1)).toBe(2) // floor
    expect(buttonCount(0.51, 20)).toBe(9) // ceiling
    expect(buttonCount(0.12)).toBe(3) // the auto floor survives short plackets
  })

  it('button scale: 13 mm = the authored profile; sizes clamp 8…30 mm', () => {
    expect(buttonScale()).toBe(1) // absent = byte-identical classic look
    expect(buttonScale(13)).toBe(1)
    expect(buttonScale(26)).toBeCloseTo(2, 10)
    expect(buttonScale(2)).toBeCloseTo(8 / 13, 10) // floor
    expect(buttonScale(99)).toBeCloseTo(30 / 13, 10) // ceiling
  })

  it('closureDesign deep-copies on clone and rides the .dio', () => {
    const l = { ...defaultLayer('hoodie'), closure: true, closureDesign: { buttons: 4, buttonColor: 0x882222 } }
    const c = cloneLayer(l)
    expect(c.closureDesign).toEqual(l.closureDesign)
    expect(c.closureDesign).not.toBe(l.closureDesign) // own copy
    const doc: ProjectDoc = {
      version: 1,
      body: { bodyType: 'female', height: 1, build: 1, bust: 1, waist: 1, hips: 1 },
      scene: { gravity: 9.81, windX: 0, windZ: 0, animMode: 'static', animSpeed: 1 },
      layers: [l],
      activeIndex: 0
    }
    expect(parseDoc(serializeDoc(doc)).layers[0].closureDesign).toEqual({ buttons: 4, buttonColor: 0x882222 })
  })
})
