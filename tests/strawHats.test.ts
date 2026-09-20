import { describe, it, expect } from 'vitest'
import {
  STRAW_HATS,
  STRAW_STYLES,
  brimProfileAt,
  centreDent,
  hatWidthMm,
  isFlatBrim,
  bandFitsHead
} from '../src/renderer/avatar/strawHats'
import { mmToUnits } from '../src/renderer/avatar/brimless'

describe('straw hat blocks', () => {
  it('drafts both bands to a head', () => {
    for (const s of STRAW_STYLES) expect(bandFitsHead(STRAW_HATS[s]), s).toBe(true)
  })

  it('separates the two the way the straw does', () => {
    // sennit is stiffened rigid, so a boater's brim is dead flat and its crown a drum
    expect(isFlatBrim(STRAW_HATS.boater)).toBe(true)
    expect(STRAW_HATS.boater.topMm).toBe(STRAW_HATS.boater.bandMm)
    expect(STRAW_HATS.boater.dentMm).toBe(0)
    // toquilla stays soft, so a panama's brim falls and its crown takes a dent
    expect(isFlatBrim(STRAW_HATS.panama)).toBe(false)
    expect(STRAW_HATS.panama.dentMm).toBeGreaterThan(0)
    expect(STRAW_HATS.panama.brimMm).toBeGreaterThan(STRAW_HATS.boater.brimMm)
  })

  it('keeps both hats to a wearable width', () => {
    for (const s of STRAW_STYLES) {
      expect(hatWidthMm(STRAW_HATS[s]), s).toBeGreaterThan(250)
      expect(hatWidthMm(STRAW_HATS[s]), s).toBeLessThan(360) // not a sombrero
    }
  })
})

describe('brim profile', () => {
  it('starts at the band and reaches the full brim width', () => {
    for (const s of STRAW_STYLES) {
      const h = STRAW_HATS[s]
      expect(brimProfileAt(h, 0).out).toBeCloseTo((h.bandMm / 2) * mmToUnits, 9)
      expect(brimProfileAt(h, 1).out).toBeCloseTo((h.bandMm / 2 + h.brimMm) * mmToUnits, 9)
    }
  })

  it('leaves a boater dead flat except for its turned edge', () => {
    const h = STRAW_HATS.boater
    for (let t = 0; t <= 0.9; t += 0.05) expect(brimProfileAt(h, t).down).toBeCloseTo(0, 9)
    expect(brimProfileAt(h, 1).down).toBeLessThan(0) // the edge turns UP
  })

  it('hangs a panama, with most of the fall toward the edge', () => {
    const h = STRAW_HATS.panama
    const half = brimProfileAt(h, 0.5).down
    const full = brimProfileAt(h, 0.9).down
    expect(half).toBeGreaterThan(0)
    expect(half).toBeLessThan(full * 0.4) // quadratic: a soft brim hangs, it does not ramp
  })

  it('turns every brim up at the very edge', () => {
    // a brim that just stops reads as a paper disc
    for (const s of STRAW_STYLES) {
      const h = STRAW_HATS[s]
      expect(brimProfileAt(h, 1).down, s).toBeLessThan(brimProfileAt(h, 0.9).down)
    }
  })

  it('goes out monotonically and stays finite', () => {
    for (const s of STRAW_STYLES) {
      let prev = -Infinity
      for (let t = -0.2; t <= 1.2; t += 0.02) {
        const p = brimProfileAt(STRAW_HATS[s], t)
        expect(Number.isFinite(p.out) && Number.isFinite(p.down), `${s} @ ${t}`).toBe(true)
        expect(p.out).toBeGreaterThanOrEqual(prev - 1e-12)
        prev = p.out
      }
    }
  })
})

describe('centre dent', () => {
  const h = STRAW_HATS.panama

  it('is a crease down the middle, not a groove of constant depth', () => {
    expect(centreDent(h, 0, 0)).toBeCloseTo(h.dentMm * mmToUnits, 9) // deepest at the centre
    expect(centreDent(h, 0.8, 0)).toBeCloseTo(0, 9) // and nothing out at the sides
  })

  it('eases out to nothing at the front and back edges', () => {
    // a pinched hat's dent runs out; a machined slot does not
    expect(centreDent(h, 0, 1)).toBeCloseTo(0, 9)
    expect(centreDent(h, 0, -1)).toBeCloseTo(0, 9)
    expect(centreDent(h, 0, 0.5)).toBeGreaterThan(0)
    expect(centreDent(h, 0, 0.5)).toBeLessThan(centreDent(h, 0, 0))
  })

  it('is symmetric across the crown and along it', () => {
    for (const a of [0.1, 0.3, 0.5]) {
      expect(centreDent(h, a, 0.3)).toBeCloseTo(centreDent(h, -a, 0.3), 12)
      expect(centreDent(h, 0.2, a)).toBeCloseTo(centreDent(h, 0.2, -a), 12)
    }
  })

  it('presses nothing at all into a hard flat top', () => {
    for (let a = -1; a <= 1; a += 0.1) {
      for (let b = -1; b <= 1; b += 0.5) expect(centreDent(STRAW_HATS.boater, a, b)).toBe(0)
    }
  })

  it('never lifts the crown, only sinks it', () => {
    for (let a = -1.5; a <= 1.5; a += 0.05) {
      for (let b = -1.5; b <= 1.5; b += 0.1) expect(centreDent(h, a, b)).toBeGreaterThanOrEqual(0)
    }
  })
})
