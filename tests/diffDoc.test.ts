import { describe, it, expect } from 'vitest'
import { diffDocs, diffSummary } from '../src/renderer/studio/diffDoc'
import { docFromConfig } from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

const base = () => docFromConfig(defaultConfig())

describe('version compare (doc diff)', () => {
  it('identical docs → no differences', () => {
    expect(diffDocs(base(), base())).toEqual([])
    expect(diffSummary(base(), base())).toBe('No changes')
  })

  it('compares any two versions (not just vs current) — version-to-version diff', () => {
    // two saved versions, neither the working design: v1 (denim) vs v2 (satin + collar)
    const v1 = base()
    v1.layers[0].fabricId = 'denim'
    const v2 = base()
    v2.layers[0].fabricId = 'satin'
    v2.layers[0].collar = true
    const d = diffDocs(v1, v2) // how v2 differs from v1
    expect(d.some((l) => l.includes('fabric:') && l.includes('satin'))).toBe(true)
    expect(d).toContain('Layer 1 collar: — → on')
    // the reverse direction is also meaningful
    expect(diffDocs(v2, v1).some((l) => l.includes('denim'))).toBe(true)
  })

  it('reports a fabric + colour change on a layer', () => {
    const a = base()
    const b = base()
    b.layers[0].fabricId = 'satin'
    b.layers[0].color = 0x123456
    const d = diffDocs(a, b)
    expect(d.some((l) => l.includes('fabric:') && l.includes('satin'))).toBe(true)
    expect(d.some((l) => l.includes('colour:') && l.includes('#123456'))).toBe(true)
    expect(diffSummary(a, b)).toBe('2 changes')
  })

  it('reports body changes', () => {
    const a = base()
    const b = base()
    b.body.hips = 1.2
    const d = diffDocs(a, b)
    expect(d.some((l) => l.startsWith('Hips:') && l.includes('1.2'))).toBe(true)
  })

  it('reports a boolean construction toggle as on/off', () => {
    const a = base()
    const b = base()
    b.layers[0].collar = true
    expect(diffDocs(a, b)).toContain('Layer 1 collar: — → on')
  })

  it('reports added + removed layers', () => {
    const a = base()
    const b = base()
    b.layers.push({ ...b.layers[0], garmentType: 'beanie' })
    expect(diffDocs(a, b).some((l) => l.startsWith('Added layer 2: beanie'))).toBe(true)
    expect(diffDocs(b, a).some((l) => l.startsWith('Removed layer 2: beanie'))).toBe(true)
  })

  it('one change reads singular', () => {
    const a = base()
    const b = base()
    b.layers[0].size = 'L'
    expect(diffSummary(a, b)).toBe('1 change')
  })
})
