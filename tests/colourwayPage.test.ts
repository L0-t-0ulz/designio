import { describe, it, expect } from 'vitest'
import { colourwayFinishes, colourwayPage, colourwaySummary, colourwayTag, hexOf } from '../src/renderer/export/colourwayPage'
import type { Colorway } from '../src/renderer/studio/document'

const cw = (over: Partial<Colorway> = {}): Colorway =>
  ({ id: 'a', name: 'Navy', color: 0x223366, fabricId: 'denim', ...over }) as Colorway

const names: Record<string, string> = { denim: 'Denim', silk: 'Silk charmeuse' }
const fabricName = (id: string): string | undefined => names[id]

describe('hex formatting', () => {
  it('pads short values', () => {
    expect(hexOf(0x0000ff)).toBe('#0000ff')
    expect(hexOf(0)).toBe('#000000')
  })

  it('handles white and stays six digits', () => {
    expect(hexOf(0xffffff)).toBe('#ffffff')
  })
})

describe('colourway finishes', () => {
  it('is empty for a plain colourway', () => {
    expect(colourwayFinishes(cw())).toEqual([])
    expect(colourwayTag(cw())).toBeUndefined()
  })

  it('names the value for fields that carry one', () => {
    expect(colourwayFinishes(cw({ textile: 'stripe', wear: 'stone-wash' } as Partial<Colorway>))).toEqual(['stripe', 'stone-wash'])
  })

  it('uses a fixed word for flags', () => {
    expect(colourwayFinishes(cw({ tartan: 'macleod', trim: true, thermo: true } as Partial<Colorway>))).toEqual(['tartan', 'contrast trim', 'thermochromic'])
  })

  it('keeps a stable order regardless of how the object was built', () => {
    const a = cw({ wear: 'faded', textile: 'stripe' } as Partial<Colorway>)
    const b = cw({ textile: 'stripe', wear: 'faded' } as Partial<Colorway>)
    expect(colourwayFinishes(a)).toEqual(colourwayFinishes(b))
    expect(colourwayFinishes(a)).toEqual(['stripe', 'faded'])
  })

  it('joins into a tag for the compact swatch grid', () => {
    expect(colourwayTag(cw({ textile: 'plaid', trim: true } as Partial<Colorway>))).toBe('plaid · contrast trim')
  })
})

describe('colourway summary', () => {
  it('resolves the fabric name', () => {
    expect(colourwaySummary(cw(), fabricName).fabric).toBe('Denim')
  })

  it('falls back to the raw id for a fabric that no longer exists', () => {
    // a human can still chase "retired-tweed"; a blank cell tells them nothing
    expect(colourwaySummary(cw({ fabricId: 'retired-tweed' }), fabricName).fabric).toBe('retired-tweed')
  })

  it('prints the colour as hex alongside the raw value', () => {
    const s = colourwaySummary(cw({ color: 0xab12cd }), fabricName)
    expect(s.hex).toBe('#ab12cd')
    expect(s.color).toBe(0xab12cd)
  })

  it('shows a trim colour only when a contrast trim is actually on', () => {
    expect(colourwaySummary(cw({ trim: true, trimColor: 0x112233 } as Partial<Colorway>), fabricName).trimHex).toBe('#112233')
    // a stale trimColour with the trim switched off must not print a swatch
    expect(colourwaySummary(cw({ trim: false, trimColor: 0x112233 } as Partial<Colorway>), fabricName).trimHex).toBeUndefined()
    expect(colourwaySummary(cw({ trim: true } as Partial<Colorway>), fabricName).trimHex).toBeUndefined()
  })

  it('carries the name and id through', () => {
    const s = colourwaySummary(cw({ id: 'x9', name: 'Ecru' }), fabricName)
    expect(s.id).toBe('x9')
    expect(s.name).toBe('Ecru')
  })
})

describe('colourway page', () => {
  it('keeps saved order', () => {
    const page = colourwayPage([cw({ id: '1', name: 'A' }), cw({ id: '2', name: 'B' })], fabricName)
    expect(page.map((p) => p.name)).toEqual(['A', 'B'])
  })

  it('is empty when nothing has been saved', () => {
    expect(colourwayPage([], fabricName)).toEqual([])
  })

  it('copes with a resolver that knows nothing', () => {
    expect(colourwayPage([cw()], () => undefined)[0].fabric).toBe('denim')
  })
})
