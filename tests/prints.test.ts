import { describe, it, expect } from 'vitest'
import { defaultConfig } from '../src/renderer/start/design'
import {
  newTextPrint,
  newImagePrint,
  printHasContent,
  printToSpec,
  printFromSpec,
  printIsRaised,
  anyRaised,
  hasArt,
  foilTone,
  PRINT_STYLES,
  type Print
} from '../src/renderer/start/design'
import { docFromConfig, serializeDoc, parseDoc } from '../src/renderer/studio/document'

const fakeImg = { width: 10, height: 10 } as unknown as HTMLImageElement

describe('placed prints (multiple logos + text)', () => {
  it('new prints have sensible placement defaults', () => {
    const t = newTextPrint('HELLO')
    expect(t.kind).toBe('text')
    expect(t.x).toBeGreaterThan(0) // placed on the front by default
    expect(t.rotation).toBe(0)
    const i = newImagePrint(fakeImg, 'logo.png')
    expect(i.kind).toBe('image')
    expect(i.image).toBe(fakeImg)
    expect(i.id).not.toBe(t.id)
  })

  it('printHasContent: text needs text, image needs an image', () => {
    expect(printHasContent(newTextPrint('X'))).toBe(true)
    expect(printHasContent(newTextPrint('   '))).toBe(false)
    expect(printHasContent(newImagePrint(fakeImg, 'a'))).toBe(true)
    expect(printHasContent({ ...newImagePrint(fakeImg, 'a'), image: null })).toBe(false)
  })

  it('hasArt is true when any print has content', () => {
    expect(hasArt({ prints: [] })).toBe(false)
    expect(hasArt({ prints: [newTextPrint('')] })).toBe(false)
    expect(hasArt({ prints: [newTextPrint('LOGO')] })).toBe(true)
  })

  it('spec round-trip drops the runtime image but keeps placement', () => {
    const p = newImagePrint(fakeImg, 'logo.png')
    p.x = 0.2
    p.rotation = 30
    const spec = printToSpec(p)
    expect((spec as unknown as { image?: unknown }).image).toBeUndefined()
    expect(spec.x).toBe(0.2)
    const back = printFromSpec(spec)
    expect(back.image).toBeNull()
    expect(back.rotation).toBe(30)
  })

  it('text prints survive save → reopen (images are runtime-only)', () => {
    const c = defaultConfig()
    c.prints = [newTextPrint('TEAM'), { ...newImagePrint(fakeImg, 'logo.png'), x: 0.3 } as Print]
    const back = parseDoc(serializeDoc(docFromConfig(c)))
    const prints = back.layers[0].prints ?? []
    expect(prints).toHaveLength(2)
    expect(prints.find((p) => p.kind === 'text')?.text).toBe('TEAM')
    expect(prints.find((p) => p.kind === 'image')?.x).toBe(0.3) // placement kept
  })

  it('a print carries the garment part it sits on (body by default)', () => {
    expect(newTextPrint('X').part).toBe('body')
    expect(newImagePrint(fakeImg, 'a').part).toBe('body')
    const sleeve = { ...newTextPrint('ARM'), part: 'sleeves' as const }
    expect(printToSpec(sleeve).part).toBe('sleeves') // survives the spec round-trip
    expect(printFromSpec(printToSpec(sleeve)).part).toBe('sleeves')
  })

  it('legacy specs (no part) default to the body panel on load', () => {
    const legacy = { id: 'x', kind: 'text' as const, text: 'HI', color: 0, x: 0.25, y: 0.5, scale: 0.5, rotation: 0 }
    expect(printFromSpec(legacy as never).part).toBe('body')
  })

  it('prints on the sleeves/legs survive save → reopen', () => {
    const c = defaultConfig()
    c.prints = [
      { ...newTextPrint('ARM'), part: 'sleeves' },
      { ...newTextPrint('LEG'), part: 'legs' }
    ]
    const back = parseDoc(serializeDoc(docFromConfig(c)))
    const prints = back.layers[0].prints ?? []
    expect(prints.find((p) => p.text === 'ARM')?.part).toBe('sleeves')
    expect(prints.find((p) => p.text === 'LEG')?.part).toBe('legs')
  })

  it('a print has a finish style (flat by default) that flags a raised motif', () => {
    expect(newTextPrint('X').style).toBe('flat')
    expect(printIsRaised(newTextPrint('X'))).toBe(false)
    expect(printIsRaised({ ...newTextPrint('X'), style: 'embroidery' })).toBe(true)
    expect(printIsRaised({ ...newTextPrint('X'), style: 'applique' })).toBe(true)
  })

  it('puff / discharge / foil print finishes: puff is raised, the others are flat', () => {
    expect(PRINT_STYLES).toContain('puff')
    expect(PRINT_STYLES).toContain('discharge')
    expect(PRINT_STYLES).toContain('foil')
    expect(printIsRaised({ ...newTextPrint('X'), style: 'puff' })).toBe(true) // a chunky high-loft
    expect(printIsRaised({ ...newTextPrint('X'), style: 'discharge' })).toBe(false) // bleach, no relief
    expect(printIsRaised({ ...newTextPrint('X'), style: 'foil' })).toBe(false) // flat transfer
  })

  it('the enamel pin is a raised, opaque physical badge', () => {
    expect(PRINT_STYLES).toContain('enamel-pin')
    expect(printIsRaised({ ...newTextPrint('X'), style: 'enamel-pin' })).toBe(true) // a hard raised disc
  })

  it('foilTone lifts a print colour toward a bright metallic sheen', () => {
    const lum = (c: number): number => 0.2126 * ((c >> 16) & 255) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255)
    for (const base of [0xd4af37, 0x8a1538, 0x0d2b1a, 0x101014]) {
      expect(lum(foilTone(base))).toBeGreaterThan(lum(base)) // always brighter (a metallic lift)
      expect(lum(foilTone(base))).toBeGreaterThan(150) // reads as light metal even from a dark base
    }
  })

  it('anyRaised: true only when a *content-bearing* motif is embroidery/appliqué', () => {
    expect(anyRaised([newTextPrint('LOGO')])).toBe(false) // flat
    expect(anyRaised([{ ...newTextPrint('LOGO'), style: 'embroidery' }])).toBe(true)
    expect(anyRaised([{ ...newTextPrint('   '), style: 'embroidery' }])).toBe(false) // empty text
    expect(anyRaised([{ ...newTextPrint('A'), style: 'flat' }, { ...newTextPrint('B'), style: 'applique' }])).toBe(true)
  })

  it('legacy specs (no style) default to flat; style survives save → reopen', () => {
    const legacy = { id: 'x', kind: 'text' as const, text: 'HI', color: 0, x: 0.25, y: 0.5, scale: 0.5, rotation: 0, part: 'body' as const }
    expect(printFromSpec(legacy as never).style).toBe('flat')
    const emb = { ...newTextPrint('LUXE'), style: 'embroidery' as const }
    expect(printFromSpec(printToSpec(emb)).style).toBe('embroidery')
    const c = defaultConfig()
    c.prints = [emb]
    const back = parseDoc(serializeDoc(docFromConfig(c)))
    expect(back.layers[0].prints?.[0].style).toBe('embroidery')
  })
})
