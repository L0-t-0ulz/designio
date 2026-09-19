import { describe, it, expect } from 'vitest'
import { defaultLayer, resetConstruction, type GarmentLayerData } from '../src/renderer/studio/document'

/** A layer that's been worked on: construction changed all over, and a pile of
 *  appearance/material work that a reset must not throw away. */
const worked = (): GarmentLayerData => {
  const l = defaultLayer('top')
  // construction
  l.length = 0.95
  l.ease = 0.31
  l.flare = 0.44
  l.neckline = 'v'
  l.sleeve = 'long'
  l.collar = true
  l.pleats = true
  l.pocket = true
  l.closure = true
  l.size = 'XL'
  // appearance / material
  l.color = 0x123456
  l.fabricId = 'denim'
  l.textile = 'stripe'
  l.tartan = 'macleod'
  l.wear = 'stone-wash'
  l.sparkle = 'glitter'
  l.trim = true
  l.trimColor = 0xabcdef
  // work that is neither construction nor colour
  l.visible = false
  l.prints = [{ id: 'p1', kind: 'text', text: 'hi', x: 0.1, y: 0.2, scale: 1, rotation: 0, color: 0 } as never]
  l.patternNotes = [{ x: 10, y: 20, text: 'check the dart' }]
  l.colorways = [{ id: 'cw1', name: 'Navy', color: 1, fabricId: 'wool' } as never]
  return l
}

describe('reset construction to defaults', () => {
  it('puts the shape fields back to the garment definition', () => {
    const d = defaultLayer('top')
    const r = resetConstruction(worked())
    expect(r.length).toBe(d.length)
    expect(r.ease).toBe(d.ease)
    expect(r.flare).toBe(d.flare)
    expect(r.neckline).toBe(d.neckline)
    expect(r.sleeve).toBe(d.sleeve)
    expect(r.size).toBe(d.size)
  })

  it('clears construction detail that was switched on', () => {
    const r = resetConstruction(worked())
    const d = defaultLayer('top')
    expect(r.collar).toBe(d.collar)
    expect(r.pleats).toBe(d.pleats)
    expect(r.pocket).toBe(d.pocket)
    expect(r.closure).toBe(d.closure)
  })

  it('keeps the fabric and colour — this is not "new garment"', () => {
    const r = resetConstruction(worked())
    expect(r.color).toBe(0x123456)
    expect(r.fabricId).toBe('denim')
  })

  it('keeps every surface finish, not just the base colour', () => {
    const r = resetConstruction(worked())
    expect(r.textile).toBe('stripe')
    expect(r.tartan).toBe('macleod')
    expect(r.wear).toBe('stone-wash')
    expect(r.sparkle).toBe('glitter')
    expect(r.trim).toBe(true)
    expect(r.trimColor).toBe(0xabcdef)
  })

  it('keeps placed prints — losing artwork to a shape reset would be losing work', () => {
    const r = resetConstruction(worked())
    expect(r.prints).toHaveLength(1)
  })

  it('keeps pinned pattern notes and saved colourways', () => {
    const r = resetConstruction(worked())
    expect(r.patternNotes).toEqual([{ x: 10, y: 20, text: 'check the dart' }])
    expect(r.colorways).toHaveLength(1)
  })

  it('keeps the layer hidden if it was hidden', () => {
    expect(resetConstruction(worked()).visible).toBe(false)
  })

  it('stays on the same garment', () => {
    expect(resetConstruction(worked()).garmentType).toBe('top')
  })

  it('does not mutate the layer it was handed', () => {
    const before = worked()
    const snapshot = JSON.stringify(before)
    resetConstruction(before)
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('is idempotent — resetting twice is the same as once', () => {
    const once = resetConstruction(worked())
    const twice = resetConstruction(once)
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once))
  })

  it('resets an already-default layer to itself', () => {
    const d = defaultLayer('dress')
    expect(JSON.stringify(resetConstruction(d))).toBe(JSON.stringify(d))
  })

  it('works across garment types, using each one’s own defaults', () => {
    for (const type of ['top', 'dress', 'skirt'] as const) {
      const l = defaultLayer(type)
      l.length = 0.99
      const r = resetConstruction(l)
      expect(r.garmentType).toBe(type)
      expect(r.length).toBe(defaultLayer(type).length)
    }
  })
})
