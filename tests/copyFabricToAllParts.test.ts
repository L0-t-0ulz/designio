import { describe, it, expect } from 'vitest'
import { copyFabricToAllParts, defaultLayer, hasPartFabricOverrides, type GarmentLayerData } from '../src/renderer/studio/document'

const withParts = (over: GarmentLayerData['partFabrics']): GarmentLayerData => {
  const l = defaultLayer('top')
  l.fabricId = 'denim'
  l.color = 0x224466
  l.partFabrics = over
  return l
}

describe('per-part override detection', () => {
  it('sees no overrides on a fresh layer', () => {
    expect(hasPartFabricOverrides(defaultLayer('top'))).toBe(false)
  })

  it('sees an override when one is set', () => {
    expect(hasPartFabricOverrides(withParts({ sleeves: { fabricId: 'silk', color: 1 } }))).toBe(true)
  })

  it('treats an empty or all-undefined map as no overrides', () => {
    // a button offering to clear nothing is worse than no button
    expect(hasPartFabricOverrides(withParts({}))).toBe(false)
    expect(hasPartFabricOverrides(withParts({ sleeves: undefined, back: undefined }))).toBe(false)
  })
})

describe('match all parts to the body fabric', () => {
  it('drops every override', () => {
    const l = withParts({
      sleeves: { fabricId: 'silk', color: 1 },
      back: { fabricId: 'wool', color: 2 },
      legBack: { fabricId: 'linen', color: 3 }
    })
    const out = copyFabricToAllParts(l)
    expect(out.partFabrics).toBeUndefined()
    expect(hasPartFabricOverrides(out)).toBe(false)
  })

  it('clears rather than writing the body fabric into each part', () => {
    // an override pinned to "whatever the body is right now" stops matching the
    // moment the body fabric changes — which is the opposite of the request
    const out = copyFabricToAllParts(withParts({ sleeves: { fabricId: 'silk', color: 1 } }))
    expect('partFabrics' in out).toBe(false)
  })

  it('keeps the body fabric and colour', () => {
    const out = copyFabricToAllParts(withParts({ sleeves: { fabricId: 'silk', color: 1 } }))
    expect(out.fabricId).toBe('denim')
    expect(out.color).toBe(0x224466)
  })

  it('leaves the contrast trim alone — it is meant to differ', () => {
    const l = withParts({ sleeves: { fabricId: 'silk', color: 1 } })
    l.trim = true
    l.trimFabricId = 'leather'
    l.trimColor = 0x884400
    const out = copyFabricToAllParts(l)
    expect(out.trim).toBe(true)
    expect(out.trimFabricId).toBe('leather')
    expect(out.trimColor).toBe(0x884400)
  })

  it('keeps everything else about the layer', () => {
    const l = withParts({ sleeves: { fabricId: 'silk', color: 1 } })
    l.length = 0.77
    l.collar = true
    l.prints = [{ id: 'p1' } as never]
    const out = copyFabricToAllParts(l)
    expect(out.length).toBe(0.77)
    expect(out.collar).toBe(true)
    expect(out.prints).toHaveLength(1)
    expect(out.garmentType).toBe('top')
  })

  it('does not mutate the layer it was given', () => {
    const l = withParts({ sleeves: { fabricId: 'silk', color: 1 } })
    copyFabricToAllParts(l)
    expect(l.partFabrics?.sleeves?.fabricId).toBe('silk')
  })

  it('returns the same layer when there is nothing to clear, so it costs no undo entry', () => {
    const l = defaultLayer('top')
    expect(copyFabricToAllParts(l)).toBe(l)
  })

  it('is idempotent', () => {
    const once = copyFabricToAllParts(withParts({ sleeves: { fabricId: 'silk', color: 1 } }))
    expect(copyFabricToAllParts(once)).toBe(once)
  })
})
