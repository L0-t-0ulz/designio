import { describe, it, expect } from 'vitest'
import {
  BEARD_STYLES,
  BEARD_LABELS,
  BEARD_LENGTH_MM,
  LIP_Y,
  NOSE_BASE_Y,
  MOUTH_HALF,
  CHIN_TOP_Y,
  SIDEBURN_Y,
  CHEEK_LINE_AT_MOUTH,
  cheekLineY,
  jawHalfWidth,
  beardCoverage,
  beardLengthMm,
  beardColour,
  type BeardStyle
} from '../src/renderer/avatar/beard'

const grown = (s: BeardStyle, x: number, y: number) => beardCoverage(s, x, y) > 0.5

describe('the cheek line', () => {
  it('starts high at the sideburn and falls toward the mouth', () => {
    // a straight horizontal cut-off across the cheeks is the tell-tale of a beard
    // that has been drawn rather than grown
    expect(cheekLineY(1)).toBeCloseTo(SIDEBURN_Y, 9)
    expect(cheekLineY(0)).toBeCloseTo(CHEEK_LINE_AT_MOUTH, 9)
    expect(cheekLineY(0.5)).toBeGreaterThan(cheekLineY(0))
    expect(cheekLineY(0.5)).toBeLessThan(cheekLineY(1))
  })

  it('is symmetric and never flat', () => {
    for (const x of [0.2, 0.5, 0.9]) expect(cheekLineY(x)).toBeCloseTo(cheekLineY(-x), 12)
    const ys = [0, 0.25, 0.5, 0.75, 1].map(cheekLineY)
    expect(new Set(ys.map((v) => v.toFixed(3))).size).toBeGreaterThan(3)
  })

  it('clamps beyond the face', () => {
    expect(cheekLineY(3)).toBeCloseTo(cheekLineY(1), 12)
  })
})

describe('the jaw outline', () => {
  it('is narrow at the chin and widest at the jaw angle', () => {
    expect(jawHalfWidth(0)).toBeLessThan(jawHalfWidth(0.5))
    expect(jawHalfWidth(0.5)).toBeLessThan(jawHalfWidth(1))
  })

  it('stays within the face and clamps outside its range', () => {
    for (let y = -0.5; y <= 1.5; y += 0.05) {
      const w = jawHalfWidth(y)
      expect(w).toBeGreaterThan(0)
      expect(w).toBeLessThanOrEqual(1)
    }
  })
})

describe('where hair grows', () => {
  it('grows nothing at all when clean shaven', () => {
    for (let x = -1; x <= 1; x += 0.1) {
      for (let y = 0; y <= 1; y += 0.1) expect(beardCoverage('none', x, y)).toBe(0)
    }
  })

  it('leaves the upper cheek bare on a full beard — the point of the cheek line', () => {
    // high on the cheek, above the line: bare. Below it: grown.
    expect(grown('full', 0.45, 0.9)).toBe(false)
    expect(grown('full', 0.45, 0.35)).toBe(true)
    expect(grown('full', 0, 0.85)).toBe(false)
  })

  it('does not fill the whole lower face, which would read as fur', () => {
    let bare = 0
    let total = 0
    for (let x = -1; x <= 1; x += 0.05) {
      for (let y = 0; y <= 1; y += 0.05) {
        total++
        if (beardCoverage('full', x, y) < 0.5) bare++
      }
    }
    expect(bare / total).toBeGreaterThan(0.3) // a real share of the region is bare
  })

  it('keeps a moustache to the upper lip and no wider than the mouth', () => {
    expect(grown('moustache', 0, (LIP_Y + NOSE_BASE_Y) / 2)).toBe(true)
    expect(grown('moustache', 0, 0.05)).toBe(false) // not on the chin
    expect(grown('moustache', 0, 0.8)).toBe(false) // not on the cheek
    expect(grown('moustache', MOUTH_HALF + 0.25, (LIP_Y + NOSE_BASE_Y) / 2)).toBe(false)
  })

  it('gives a goatee a chin patch and a moustache, and bare cheeks', () => {
    expect(grown('goatee', 0, 0.1)).toBe(true) // the chin
    expect(grown('goatee', 0, (LIP_Y + NOSE_BASE_Y) / 2)).toBe(true) // the moustache
    expect(grown('goatee', 0.7, 0.5)).toBe(false) // the cheek stays bare
    expect(grown('goatee', 0.75, 0.2)).toBe(false) // and so does the jaw
  })

  it('puts stubble on the same map as a full beard, only shorter', () => {
    for (let x = -1; x <= 1; x += 0.07) {
      for (let y = 0; y <= 1; y += 0.07) {
        expect(beardCoverage('stubble', x, y)).toBeCloseTo(beardCoverage('full', x, y), 12)
      }
    }
    expect(beardLengthMm('stubble')).toBeLessThan(beardLengthMm('full'))
    expect(beardLengthMm('stubble')).toBeGreaterThan(0)
  })

  it('softens its edges instead of cutting them hard', () => {
    // hair thins at a boundary; a hard edge is the other way a drawn beard shows
    let partial = 0
    for (let x = -1; x <= 1; x += 0.01) {
      for (let y = 0; y <= 1; y += 0.02) {
        const c = beardCoverage('full', x, y)
        if (c > 0.02 && c < 0.98) partial++
      }
    }
    expect(partial).toBeGreaterThan(50)
  })

  it('stays inside the jaw and inside 0…1 everywhere', () => {
    for (const s of BEARD_STYLES) {
      for (let x = -1.5; x <= 1.5; x += 0.05) {
        for (let y = -0.3; y <= 1.3; y += 0.05) {
          const c = beardCoverage(s, x, y)
          expect(c, `${s} ${x},${y}`).toBeGreaterThanOrEqual(0)
          expect(c).toBeLessThanOrEqual(1)
          if (Math.abs(x) > jawHalfWidth(y) || y < 0 || y > 1) expect(c).toBe(0)
        }
      }
    }
  })

  it('is symmetric for every style', () => {
    for (const s of BEARD_STYLES) {
      for (const x of [0.15, 0.4, 0.7]) {
        for (const y of [0.1, 0.35, 0.6]) {
          expect(beardCoverage(s, x, y), `${s}`).toBeCloseTo(beardCoverage(s, -x, y), 12)
        }
      }
    }
  })

  it('leaves the lips themselves less hairy than the chin below them', () => {
    expect(beardCoverage('full', 0, LIP_Y + 0.03)).toBeLessThan(beardCoverage('full', 0, CHIN_TOP_Y * 0.5))
  })
})

describe('style set and colour', () => {
  it('labels and lengths every style, ordered short to long', () => {
    expect(new Set(BEARD_STYLES).size).toBe(BEARD_STYLES.length)
    for (const s of BEARD_STYLES) expect(BEARD_LABELS[s], s).toBeTruthy()
    expect(BEARD_LENGTH_MM.none).toBe(0)
    expect(BEARD_LENGTH_MM.stubble).toBeLessThan(BEARD_LENGTH_MM.goatee)
    expect(BEARD_LENGTH_MM.goatee).toBeLessThan(BEARD_LENGTH_MM.full)
  })

  it('takes the beard’s colour off the hair, a touch warmer and lighter', () => {
    // a fixed dark patch looks stuck on rather than grown
    for (const hair of [0x1a1412, 0x5a3620, 0xc8a15a]) {
      const b = beardColour(hair)
      const lum = (v: number) => ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11
      expect(lum(b)).toBeGreaterThanOrEqual(lum(hair))
      // warmer: red gains more than blue
      expect(((b >> 16) & 255) - ((hair >> 16) & 255)).toBeGreaterThan((b & 255) - (hair & 255))
    }
  })

  it('never leaves the byte range, even from white', () => {
    const b = beardColour(0xffffff)
    for (const ch of [(b >> 16) & 255, (b >> 8) & 255, b & 255]) {
      expect(ch).toBeGreaterThanOrEqual(0)
      expect(ch).toBeLessThanOrEqual(255)
    }
  })
})
