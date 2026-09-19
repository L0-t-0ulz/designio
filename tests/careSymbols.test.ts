import { describe, it, expect } from 'vitest'
import { careSymbols, careSymbolsSVG } from '../src/renderer/export/careSymbols'
import { careInstructions } from '../src/renderer/export/careLabel'
import { FABRIC_LIBRARY } from '../src/renderer/fabric/FabricLibrary'

const byId = (id: string) => FABRIC_LIBRARY.find((f) => f.id === id)!
const symsFor = (id: string) => careSymbols(careInstructions(byId(id)))
const variant = (id: string, key: string) => symsFor(id).find((s) => s.key === key)!.variant

describe('ISO 3758 care symbols', () => {
  it('yields the basic symbols in order, with tumble beside natural drying', () => {
    // ISO 3758 treats natural drying and tumble drying as separate symbols
    // cotton is tumble dried and says nothing about hanging it, so there is no
    // natural-drying symbol to show
    expect(careSymbols(careInstructions(byId('cotton-poplin'))).map((x) => x.key)).toEqual(['wash', 'bleach', 'tumble', 'iron', 'pro'])
    // wool says both: dry flat AND do not tumble
    expect(careSymbols(careInstructions(byId('wool-flannel'))).map((x) => x.key)).toEqual(['wash', 'bleach', 'dry', 'tumble', 'iron', 'pro'])
  })

  it('maps a cotton fabric to sensible variants', () => {
    // cotton: machine wash warm, non-chlorine bleach, tumble medium, iron medium, dry clean
    expect(variant('cotton-poplin', 'wash')).toBe('warm')
    expect(variant('cotton-poplin', 'bleach')).toBe('nonchlorine')
    expect(variant('cotton-poplin', 'tumble')).toBe('medium')
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
    expect(variant('leather', 'tumble')).toBe('no')
    expect(variant('leather', 'iron')).toBe('no')
  })

  it('wool shows BOTH dry-flat and do-not-tumble — the bug this fixes', () => {
    // 'Dry flat, do not tumble' is two instructions. Folding them into one slot
    // matched /flat/ first and silently dropped the prohibition, so every wool
    // garment shipped a label that permitted tumble drying by omission.
    expect(variant('wool-flannel', 'dry')).toBe('flat')
    expect(variant('wool-flannel', 'tumble')).toBe('no')
  })

  it('shows each drying symbol only when the text gives that instruction', () => {
    // silence is not permission — an absent symbol beats a guessed one
    const linen = symsFor('linen') // 'Line dry' — nothing about tumbling
    expect(linen.find((s) => s.key === 'tumble')).toBeUndefined()
    expect(linen.find((s) => s.key === 'dry')!.variant).toBe('line')

    const cotton = symsFor('cotton-poplin') // 'Tumble dry medium' — nothing about hanging
    expect(cotton.find((s) => s.key === 'dry')).toBeUndefined()
    expect(cotton.find((s) => s.key === 'tumble')!.variant).toBe('medium')
  })

  it('labels the natural-drying symbol for what it says', () => {
    expect(symsFor('wool-flannel').find((s) => s.key === 'dry')!.label).toBe('Dry flat')
    expect(symsFor('linen').find((s) => s.key === 'dry')!.label).toBe('Line dry')
  })

  it('labels the tumble symbol for what it says', () => {
    expect(symsFor('leather').find((s) => s.key === 'tumble')!.label).toBe('Do not tumble')
    expect(symsFor('cotton-poplin').find((s) => s.key === 'tumble')!.label).toBe('Tumble dry')
  })

  it('reads the heat setting off the care text', () => {
    expect(variant('cotton-poplin', 'tumble')).toBe('medium') // 'Tumble dry medium'
    const low = FABRIC_LIBRARY.find((f) => /tumble dry low/i.test(careInstructions(f).dry))
    if (low) expect(careSymbols(careInstructions(low)).find((s) => s.key === 'tumble')!.variant).toBe('low')
  })

  it('every fabric produces a valid variant for each symbol (no fallthrough gaps)', () => {
    const valid: Record<string, string[]> = {
      wash: ['warm', 'cool', 'cold', 'hand', 'no'],
      bleach: ['any', 'nonchlorine', 'no'],
      dry: ['flat', 'line'],
      tumble: ['low', 'medium', 'no'],
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

  it('draws the tumble symbol as a circle in a square, distinct from natural drying', () => {
    const wool = careSymbolsSVG(symsFor('wool-flannel'))
    expect(wool).toContain('Do not tumble')
    expect(wool).toContain('<circle') // the tumble drum
    // and both drying symbols are present, not one
    expect(symsFor('wool-flannel').filter((s) => s.key === 'dry' || s.key === 'tumble')).toHaveLength(2)
  })
})
