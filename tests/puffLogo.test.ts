import { describe, it, expect } from 'vitest'
import { puffHeight, PUFF_SHAPES, DEFAULT_PUFF_LOGO } from '../src/renderer/avatar/puffLogo'

describe('3D puff cap embroidery — the loft field', () => {
  it('every mark is non-negative, bounded, and lands back on the dome at the window border', () => {
    for (const s of PUFF_SHAPES) {
      for (let u = -1.1; u <= 1.1; u += 0.1) {
        for (let v = -1.1; v <= 1.1; v += 0.1) {
          const h = puffHeight(s, u, v)
          expect(h).toBeGreaterThanOrEqual(0)
          expect(h).toBeLessThanOrEqual(1)
          if (Math.abs(u) >= 0.98 || Math.abs(v) >= 0.98) expect(h).toBe(0)
        }
      }
    }
  })

  it('none is flat; the default cap ships unmarked', () => {
    expect(puffHeight('none', 0, 0)).toBe(0)
    expect(DEFAULT_PUFF_LOGO.shape).toBe('none')
  })

  it('dot: a centred bump', () => {
    expect(puffHeight('dot', 0, 0)).toBe(1)
    expect(puffHeight('dot', 0.9, 0)).toBe(0)
  })

  it('bar: wider than tall', () => {
    expect(puffHeight('bar', 0.45, 0)).toBeGreaterThan(0.5)
    expect(puffHeight('bar', 0, 0.45)).toBe(0) // above the bar
    expect(puffHeight('bar', 0.3, 0.1)).toBeCloseTo(puffHeight('bar', -0.3, 0.1), 10)
  })

  it('peak: a chevron rising to its apex at centre', () => {
    expect(puffHeight('peak', 0, 0.35)).toBeGreaterThan(0.9) // the apex
    expect(puffHeight('peak', 0.5, -0.1)).toBeGreaterThan(0.5) // down the flank
    expect(puffHeight('peak', 0, -0.6)).toBe(0) // under the chevron
  })

  it('ring: raised on the loop, flat in the middle', () => {
    expect(puffHeight('ring', 0.45, 0)).toBeGreaterThan(0.9)
    expect(puffHeight('ring', 0, 0)).toBe(0)
    expect(puffHeight('ring', 0, -0.45)).toBeGreaterThan(0.9) // rotationally symmetric
  })
})
