import { describe, it, expect } from 'vitest'
import { iridescentParams, IRIDESCENT_KINDS, type IridescentKind } from '../src/renderer/fabric/iridescent'
import { defaultConfig } from '../src/renderer/start/design'
import { docFromConfig, defaultLayer, cloneLayer, serializeDoc, parseDoc } from '../src/renderer/studio/document'

describe('iridescent / holographic finish', () => {
  it('every kind maps to a valid MeshPhysicalMaterial recipe', () => {
    for (const k of IRIDESCENT_KINDS) {
      const p = iridescentParams(k)
      expect(p.iridescence).toBeGreaterThan(0)
      expect(p.iridescence).toBeLessThanOrEqual(1)
      expect(p.iridescenceIOR).toBeGreaterThanOrEqual(1)
      expect(p.thicknessRange[0]).toBeLessThan(p.thicknessRange[1]) // a real range
      expect(p.roughness).toBeGreaterThan(0)
      expect(p.roughness).toBeLessThan(1)
      expect(p.metalness).toBeGreaterThanOrEqual(0)
      expect(p.metalness).toBeLessThanOrEqual(1)
    }
  })

  it('holographic + oil-slick shift colour harder than the subtle iridescent', () => {
    const subtle = iridescentParams('iridescent')
    expect(iridescentParams('holographic').iridescence).toBeGreaterThan(subtle.iridescence)
    expect(iridescentParams('oil-slick').iridescence).toBeGreaterThan(subtle.iridescence)
    // oil-slick is the most metallic (darkest, most saturated swirl)
    expect(iridescentParams('oil-slick').metalness).toBeGreaterThan(iridescentParams('holographic').metalness)
  })

  it('exposes exactly the three kinds', () => {
    expect(IRIDESCENT_KINDS).toEqual(['iridescent', 'holographic', 'oil-slick'])
  })

  it('round-trips through save/parse and cloneLayer deep-copies it', () => {
    const c = defaultConfig()
    c.iridescent = 'holographic'
    expect(parseDoc(serializeDoc(docFromConfig(c))).layers[0].iridescent).toBe('holographic')

    const base = defaultLayer('gown')
    base.iridescent = 'oil-slick'
    const copy = cloneLayer(base)
    copy.iridescent = 'iridescent' as IridescentKind
    expect(base.iridescent).toBe('oil-slick') // original untouched
  })
})
