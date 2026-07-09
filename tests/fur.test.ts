import { describe, it, expect } from 'vitest'
import { furNormal, furParams, FUR_KINDS } from '../src/renderer/fabric/fur'
import { defaultConfig } from '../src/renderer/start/design'
import { docFromConfig, defaultLayer, cloneLayer, serializeDoc, parseDoc } from '../src/renderer/studio/document'

describe('faux fur / shearling pile finish', () => {
  it('the pile normal is a unit vector facing outward, and varies across strands', () => {
    for (const k of FUR_KINDS) {
      const { cells } = furParams(k)
      const seen = new Set<string>()
      for (let i = 0; i < 30; i++) {
        const [nx, ny, nz] = furNormal(k, (i * 0.137) % 1, (i * 0.071) % 1, cells)
        expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 6) // normalized
        expect(nz).toBeGreaterThan(0) // never points into the surface
        seen.add(nx.toFixed(3) + ',' + ny.toFixed(3))
      }
      expect(seen.size).toBeGreaterThan(5) // strands lean different ways (not a flat map)
    }
  })

  it('the pile field is periodic (tiles seamlessly)', () => {
    for (const k of FUR_KINDS) {
      const c = furParams(k).cells
      const a = furNormal(k, 0.2, 0.3, c)
      const b = furNormal(k, 1.2, 2.3, c)
      for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], 10)
    }
  })

  it('every kind is a valid matte recipe (high roughness, soft sheen)', () => {
    for (const k of FUR_KINDS) {
      const p = furParams(k)
      expect(p.roughness).toBeGreaterThan(0.85) // matte pile
      expect(p.roughness).toBeLessThanOrEqual(1)
      expect(p.sheen).toBeGreaterThan(0)
      expect(p.cells).toBeGreaterThan(0)
      expect(p.repeat).toBeGreaterThan(0)
    }
    // fleece is the shortest/densest pile, faux-fur the longest/softest
    expect(furParams('fleece').cells).toBeGreaterThan(furParams('faux-fur').cells)
  })

  it('round-trips through save/parse and cloneLayer deep-copies it', () => {
    const c = defaultConfig()
    c.fur = 'shearling'
    expect(parseDoc(serializeDoc(docFromConfig(c))).layers[0].fur).toBe('shearling')

    const base = defaultLayer('coat')
    base.fur = 'faux-fur'
    const copy = cloneLayer(base)
    copy.fur = 'fleece'
    expect(base.fur).toBe('faux-fur') // original untouched
  })
})
