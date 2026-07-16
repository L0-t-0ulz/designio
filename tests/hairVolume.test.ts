import { describe, it, expect } from 'vitest'
import { hairVolumeCm, effectiveHeadCircCm } from '../src/renderer/avatar/hairVolume'
import { headSizing } from '../src/renderer/export/headSizing'

describe('hair-volume aware fit', () => {
  it('adds more girth for more voluminous hair; bald adds none', () => {
    expect(hairVolumeCm('bald')).toBe(0)
    expect(hairVolumeCm('afro')).toBeGreaterThan(hairVolumeCm('short'))
    expect(hairVolumeCm('long')).toBeGreaterThan(hairVolumeCm('bob'))
    expect(effectiveHeadCircCm(56, 'afro')).toBeGreaterThan(56)
    expect(effectiveHeadCircCm(56, 'bald')).toBe(56)
  })

  it('head sizing recommends the size for head + hair', () => {
    // a 55.x cm head (S) with a big afro should push into a bigger size
    const bald = headSizing(0.087, 0.2, 'bald')
    expect(bald.hairVolumeCm).toBeUndefined() // bald adds no volume
    const afro = headSizing(0.087, 0.2, 'afro')
    expect(afro.hairVolumeCm).toBeGreaterThan(0)
    expect(afro.withHairCircCm).toBeGreaterThan(afro.circCm)
    // the base size is unchanged by hair; the with-hair size is at least as large
    expect(afro.size).toBe(bald.size)
    const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    expect(order.indexOf(afro.withHairSize!)).toBeGreaterThanOrEqual(order.indexOf(afro.size))
  })

  it('no hair argument leaves the sizing hair-free', () => {
    const h = headSizing(0.095, 0.2)
    expect(h.hairVolumeCm).toBeUndefined()
    expect(h.withHairSize).toBeUndefined()
  })
})
