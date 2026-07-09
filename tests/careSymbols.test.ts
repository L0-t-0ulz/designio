import { describe, it, expect } from 'vitest'
import { careSymbols, careSymbolsSVG } from '../src/renderer/export/careSymbols'
import { careInstructions } from '../src/renderer/export/careLabel'
import { FABRIC_LIBRARY } from '../src/renderer/fabric/FabricLibrary'

const byId = (id: string) => FABRIC_LIBRARY.find((f) => f.id === id)!
const symsFor = (id: string) => careSymbols(careInstructions(byId(id)))
const variant = (id: string, key: string) => symsFor(id).find((s) => s.key === key)!.variant

describe('ISO 3758 care symbols', () => {
  it('always yields the five basic symbols in order', () => {
    const s = careSymbols(careInstructions(byId('cotton-poplin')))
    expect(s.map((x) => x.key)).toEqual(['wash', 'bleach', 'dry', 'iron', 'pro'])
  })

  it('maps a cotton fabric to sensible variants', () => {
    // cotton: machine wash warm, non-chlorine bleach, tumble medium, iron medium, dry clean
    expect(variant('cotton-poplin', 'wash')).toBe('warm')
    expect(variant('cotton-poplin', 'bleach')).toBe('nonchlorine')
    expect(variant('cotton-poplin', 'dry')).toBe('tumble-med')
    expect(variant('cotton-poplin', 'iron')).toBe('medium')
    expect(variant('cotton-poplin', 'pro')).toBe('dryclean')
  })

  it('silk hand-washes, dries flat, irons cool, no bleach', () => {
    expect(variant('silk-charmeuse', 'wash')).toBe('hand')
    expect(variant('silk-charmeuse', 'bleach')).toBe('no')
    expect(variant('silk-charmeuse', 'dry')).toBe('flat')
    expect(variant('silk-charmeuse', 'iron')).toBe('cool')
  })

  it('leather forbids wash / tumble / iron', () => {
    expect(variant('leather', 'wash')).toBe('no')
    expect(variant('leather', 'dry')).toBe('no')
    expect(variant('leather', 'iron')).toBe('no')
  })

  it('every fabric produces a valid variant for each symbol (no fallthrough gaps)', () => {
    const valid: Record<string, string[]> = {
      wash: ['warm', 'cool', 'cold', 'hand', 'no'],
      bleach: ['any', 'nonchlorine', 'no'],
      dry: ['tumble-low', 'tumble-med', 'flat', 'line', 'no'],
      iron: ['cool', 'medium', 'hot', 'no'],
      pro: ['dryclean', 'no']
    }
    for (const f of FABRIC_LIBRARY) {
      for (const s of careSymbols(careInstructions(f))) {
        expect(valid[s.key], `${f.id} ${s.key}=${s.variant}`).toContain(s.variant)
      }
    }
  })

  it('renders inline SVG glyphs with captions', () => {
    const svg = careSymbolsSVG(symsFor('linen'))
    expect(svg).toContain('<svg')
    expect(svg).toContain('care-symbols')
    expect(svg).toContain('Wash')
    expect(svg).toContain('Iron')
    // prohibition variants draw a cross
    expect(careSymbolsSVG(symsFor('leather'))).toContain('<line') // crossed-out symbols
  })
})
