import { describe, it, expect } from 'vitest'
import { defaultConfig } from '../src/renderer/start/design'
import {
  newTextPrint,
  newImagePrint,
  printHasContent,
  printToSpec,
  printFromSpec,
  hasArt,
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
})
