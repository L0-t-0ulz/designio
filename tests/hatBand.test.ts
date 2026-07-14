import { describe, it, expect } from 'vitest'
import { bandProfile, braidY, trimAnchor, HAT_BAND_STYLES, BAND_TRIMS, BAND_COLORS, DEFAULT_HAT_BAND } from '../src/renderer/avatar/hatBand'

describe('the hat band designer — pure band math', () => {
  it('every real style has a positive profile; none has none', () => {
    expect(bandProfile('none')).toBeNull()
    for (const s of HAT_BAND_STYLES.filter((x) => x !== 'none')) {
      const p = bandProfile(s)!
      expect(p.height).toBeGreaterThan(0)
      expect(p.standoff).toBeGreaterThan(0)
      expect(BAND_COLORS[s as keyof typeof BAND_COLORS]).toBeGreaterThan(0)
    }
  })

  it('the grosgrain ribbon reads taller than the leather strap', () => {
    expect(bandProfile('grosgrain')!.height).toBeGreaterThan(bandProfile('leather')!.height)
  })

  it('cord strands fit inside the band height', () => {
    const p = bandProfile('cord')!
    expect(p.strandR).toBeGreaterThan(0)
    expect(p.strandR * 2).toBeLessThan(p.height)
  })

  it('the braid closes and its two strands interleave around the crown', () => {
    expect(braidY(0, 0)).toBeCloseTo(braidY(1, 0), 10)
    const p = bandProfile('cord')!
    let crossings = 0
    let prev = Math.sign(braidY(0, 0) - braidY(0, Math.PI))
    for (let t = 0.005; t <= 1; t += 0.005) {
      const d = Math.sign(braidY(t, 0) - braidY(t, Math.PI))
      if (d !== 0 && d !== prev) {
        crossings++
        prev = d
      }
      // both strands stay inside the band
      expect(Math.abs(braidY(t, 0))).toBeLessThanOrEqual(p.height / 2)
    }
    expect(crossings).toBeGreaterThanOrEqual(8) // a real braid crosses many times
  })

  it('trims anchor on the band — bow/feather at the side, buckle centre-front', () => {
    expect(trimAnchor('none')).toBeNull()
    expect(trimAnchor('bow')!.az).toBeGreaterThan(1) // side placement
    expect(trimAnchor('feather')!.az).toBeGreaterThan(1)
    expect(trimAnchor('buckle')!.az).toBe(0)
  })

  it('the default band is a plain grosgrain', () => {
    expect(DEFAULT_HAT_BAND.style).toBe('grosgrain')
    expect(DEFAULT_HAT_BAND.trim).toBe('none')
    expect(BAND_TRIMS).toContain(DEFAULT_HAT_BAND.trim)
  })
})
