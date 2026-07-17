import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { ombreT, ombreDip, OMBRE_DIRECTIONS } from '../src/renderer/fabric/ombre'
import { hasArt } from '../src/renderer/start/design'
import { defaultConfig } from '../src/renderer/start/design'
import { docFromConfig, defaultLayer, cloneLayer, serializeDoc, parseDoc } from '../src/renderer/studio/document'

describe('ombré / dip-dye gradient', () => {
  it('top-down fades base→dip from the top edge to the hem', () => {
    expect(ombreT('top-down', 0.5, 0)).toBe(0) // top edge = base
    expect(ombreT('top-down', 0.5, 1)).toBe(1) // hem = dip
    expect(ombreT('top-down', 0.5, 0.5)).toBeCloseTo(0.5, 10)
  })

  it('bottom-up is the reverse of top-down', () => {
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      expect(ombreT('bottom-up', 0.5, v)).toBeCloseTo(1 - ombreT('top-down', 0.5, v), 10)
    }
  })

  it('radial is base at the centre → dip at the edges (clamped to 1)', () => {
    expect(ombreT('radial', 0.5, 0.5)).toBe(0) // centre = base
    expect(ombreT('radial', 0, 0.5)).toBe(1) // left edge = dip
    expect(ombreT('radial', 0, 0)).toBe(1) // corner clamps to dip, not >1
  })

  it('diagonal sweeps base (top-left) → dip (bottom-right) at 45°', () => {
    expect(ombreT('diagonal', 0, 0)).toBe(0) // top-left corner = base
    expect(ombreT('diagonal', 1, 1)).toBe(1) // bottom-right corner = dip
    expect(ombreT('diagonal', 0.5, 0.5)).toBeCloseTo(0.5, 10) // centre = midpoint
    // the anti-diagonal is iso-tone (constant blend), so it reads as a 45° sweep
    expect(ombreT('diagonal', 1, 0)).toBeCloseTo(ombreT('diagonal', 0, 1), 10)
  })

  it('the dipped tone is deeper (lower lightness) than the base', () => {
    const base = 0x8ab4d8 // a mid blue
    const dip = ombreDip(base)
    const b = { h: 0, s: 0, l: 0 }
    const d = { h: 0, s: 0, l: 0 }
    new THREE.Color(base).getHSL(b)
    dip.getHSL(d)
    expect(d.l).toBeLessThan(b.l)
  })

  it('an ombré alone (no prints/textile) still needs an albedo map', () => {
    expect(hasArt({ prints: [], ombre: 'top-down' })).toBe(true)
    expect(hasArt({ prints: [] })).toBe(false)
  })

  it('ombré round-trips through save/parse and cloneLayer deep-copies it', () => {
    const c = defaultConfig()
    c.ombre = 'radial'
    const back = parseDoc(serializeDoc(docFromConfig(c)))
    expect(back.layers[0].ombre).toBe('radial')

    const base = defaultLayer('dress')
    base.ombre = 'bottom-up'
    const copy = cloneLayer(base)
    copy.ombre = 'top-down'
    expect(base.ombre).toBe('bottom-up') // original untouched
  })

  it('exposes exactly the four directions', () => {
    expect(OMBRE_DIRECTIONS).toEqual(['top-down', 'bottom-up', 'radial', 'diagonal'])
  })
})
