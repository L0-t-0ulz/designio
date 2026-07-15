import { describe, it, expect } from 'vitest'
import { duotonePalette, duotoneMap, luminance, DUOTONE_KINDS } from '../src/renderer/fabric/duotone'
import {
  captureColorway,
  applyColorway,
  defaultLayer,
  serializeDoc,
  parseDoc,
  docFromConfig
} from '../src/renderer/studio/document'
import { defaultConfig, hasArt } from '../src/renderer/start/design'

describe('duotone — two-tone remap', () => {
  it('maps luminance 0 → shadow, 1 → highlight', () => {
    const dark = 0x102030
    const light = 0xe0f0ff
    expect(duotoneMap(0, dark, light)).toBe(dark)
    expect(duotoneMap(1, dark, light)).toBe(light)
    expect(duotoneMap(-5, dark, light)).toBe(dark) // clamps
    expect(duotoneMap(9, dark, light)).toBe(light) // clamps
  })

  it('is monotonic in luminance (a lighter pixel lands lighter on the ramp)', () => {
    const { dark, light } = duotonePalette('cyanotype')
    const lum = (c: number): number => luminance((c >> 16) & 255, (c >> 8) & 255, c & 255)
    expect(lum(duotoneMap(0.8, dark, light))).toBeGreaterThan(lum(duotoneMap(0.2, dark, light)))
  })

  it('every preset has a dark shadow below a light highlight', () => {
    const lum = (c: number): number => luminance((c >> 16) & 255, (c >> 8) & 255, c & 255)
    for (const k of DUOTONE_KINDS) {
      const { dark, light } = duotonePalette(k)
      expect(lum(dark)).toBeLessThan(lum(light))
    }
  })

  it('luminance follows Rec-709 weights (green brightest, blue darkest)', () => {
    expect(luminance(0, 255, 0)).toBeGreaterThan(luminance(255, 0, 0))
    expect(luminance(255, 0, 0)).toBeGreaterThan(luminance(0, 0, 255))
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 5)
  })
})

describe('duotone — pipeline + persistence', () => {
  it('counts as art so the albedo map is built', () => {
    expect(hasArt({ prints: [], duotone: 'noir' })).toBe(true)
    expect(hasArt({ prints: [] })).toBe(false)
  })

  it('a colorway + a .dio round-trip carry the duotone', () => {
    const l = defaultLayer('dress')
    l.duotone = 'sepia'
    const cw = captureColorway(l, 'Sepia')
    expect(cw.duotone).toBe('sepia')
    const l2 = defaultLayer('dress')
    applyColorway(l2, cw)
    expect(l2.duotone).toBe('sepia')

    const doc = docFromConfig(defaultConfig())
    doc.layers[0].duotone = 'acid'
    expect(parseDoc(serializeDoc(doc)).layers[0].duotone).toBe('acid')
  })

  it('defaults off', () => {
    expect(defaultLayer('top').duotone).toBeUndefined()
  })
})
