import { describe, it, expect } from 'vitest'
import { iridescentParams, iridescentThickness, IRIDESCENT_KINDS, type IridescentKind } from '../src/renderer/fabric/iridescent'
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

  it('pearlescent is a soft pale nacre — gentlest shift, glossy clearcoat, least metallic', () => {
    const pearl = iridescentParams('pearlescent')
    // the subtlest colour shift of the family (a pale sheen, not a hard hologram)
    for (const k of ['holographic', 'oil-slick'] as IridescentKind[]) {
      expect(pearl.iridescence).toBeLessThan(iridescentParams(k).iridescence)
      expect(pearl.metalness).toBeLessThan(iridescentParams(k).metalness)
    }
    expect(pearl.clearcoat).toBeGreaterThan(0.5) // glossy pearl coat
  })

  it('exposes exactly the four kinds', () => {
    expect(IRIDESCENT_KINDS).toEqual(['iridescent', 'holographic', 'oil-slick', 'pearlescent'])
  })

  it('the thickness field stays in [0,1], varies across the surface, and differs by kind', () => {
    let lo = Infinity
    let hi = -Infinity
    for (const k of IRIDESCENT_KINDS) {
      for (let i = 0; i < 40; i++) {
        const u = (i * 7 % 40) / 40
        const v = (i * 13 % 40) / 40
        const t = iridescentThickness(k, u, v)
        expect(t).toBeGreaterThanOrEqual(0)
        expect(t).toBeLessThanOrEqual(1)
        lo = Math.min(lo, t)
        hi = Math.max(hi, t)
      }
    }
    expect(hi - lo).toBeGreaterThan(0.3) // genuinely swirls, not flat
    // busier finishes read differently at the same point
    expect(iridescentThickness('oil-slick', 0.3, 0.7)).not.toBeCloseTo(iridescentThickness('iridescent', 0.3, 0.7), 3)
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
