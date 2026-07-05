import { describe, it, expect } from 'vitest'
import { defaultConfig } from '../src/renderer/start/design'
import {
  docFromConfig,
  defaultLayer,
  cloneLayer,
  serializeDoc,
  parseDoc,
  DOC_VERSION
} from '../src/renderer/studio/document'

describe('studio document (serialisable project model)', () => {
  it('builds a single-layer doc from a start-page config', () => {
    const c = defaultConfig()
    const doc = docFromConfig(c)
    expect(doc.version).toBe(DOC_VERSION)
    expect(doc.layers).toHaveLength(1)
    expect(doc.layers[0].garmentType).toBe(c.garmentType)
    expect(doc.layers[0].fabricId).toBe(c.fabricId)
    expect(doc.body.bodyType).toBe(c.bodyType)
    expect(doc.activeIndex).toBe(0)
  })

  it('round-trips through serialise → parse', () => {
    const doc = docFromConfig(defaultConfig())
    doc.layers.push(defaultLayer('skirt'), defaultLayer('pants'))
    doc.activeIndex = 2
    doc.scene.windX = 3
    const back = parseDoc(serializeDoc(doc))
    expect(back).toEqual(doc)
  })

  it('a duplicated layer is an independent copy', () => {
    const l = defaultLayer('dress')
    const copy = cloneLayer(l)
    copy.color = 0x112233
    expect(l.color).not.toBe(0x112233)
  })

  it('coerces missing fields and clamps the active index', () => {
    const doc = parseDoc(JSON.stringify({ layers: [{ garmentType: 'gown' }], activeIndex: 9 }))
    expect(doc.layers[0].garmentType).toBe('gown')
    expect(doc.layers[0].visible).toBe(true)
    expect(doc.body.bodyType).toBe('female') // default
    expect(doc.scene.gravity).toBe(9.81) // default
    expect(doc.activeIndex).toBe(0) // clamped to the single layer
  })

  it('rejects input that is not a project', () => {
    expect(() => parseDoc('{"nope":true}')).toThrow()
    expect(() => parseDoc('not json')).toThrow()
  })
})
