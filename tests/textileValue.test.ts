import { describe, it, expect } from 'vitest'
import { textileValue, textileTiles, TEXTILE_PATTERNS, type TextilePattern } from '../src/renderer/fabric/textile'

describe('textileValue — repeating textile pattern tones', () => {
  it('every pattern stays in the [0,1] tonal range', () => {
    for (const p of TEXTILE_PATTERNS) {
      for (let i = 0; i <= 20; i++) {
        for (let j = 0; j <= 20; j++) {
          const v = textileValue(p, i / 20, j / 20)
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('tiles seamlessly — the value wraps every unit repeat', () => {
    for (const p of TEXTILE_PATTERNS) {
      for (const [u, v] of [[0.1, 0.3], [0.42, 0.88], [0.7, 0.05]]) {
        expect(textileValue(p, u, v)).toBeCloseTo(textileValue(p, u + 1, v), 10)
        expect(textileValue(p, u, v)).toBeCloseTo(textileValue(p, u, v + 3), 10)
        expect(textileValue(p, u, v)).toBeCloseTo(textileValue(p, u - 2, v + 1), 10)
      }
    }
  })

  it('camo/plaid tile without a hard seam — the tone stays continuous across the tile edge', () => {
    // The floor-wrap makes textileValue periodic by construction; the real question is
    // whether the underlying field is *continuous* at the seam (field(1⁻) === field(0⁺)).
    // A non-periodic field (the old camo used non-integer sin frequencies) jumps here and
    // shows a visible tile edge. Sample both seams: a seamless motif matches at ~every row.
    for (const p of ['camo', 'plaid'] as TextilePattern[]) {
      let uMatch = 0
      let vMatch = 0
      const N = 200
      for (let i = 0; i < N; i++) {
        const t = (i + 0.5) / N
        if (textileValue(p, 0.9995, t) === textileValue(p, 0.0005, t)) uMatch++ // vertical seam
        if (textileValue(p, t, 0.9995) === textileValue(p, t, 0.0005)) vMatch++ // horizontal seam
      }
      expect(uMatch).toBeGreaterThan(N * 0.95)
      expect(vMatch).toBeGreaterThan(N * 0.95)
    }
  })

  it('stripe splits the tile into a base half and a contrast half', () => {
    expect(textileValue('stripe', 0.25, 0.5)).toBe(0)
    expect(textileValue('stripe', 0.75, 0.5)).toBe(1)
  })

  it('check flips tone across the diagonal quadrants', () => {
    expect(textileValue('check', 0.25, 0.25)).toBe(0) // both low
    expect(textileValue('check', 0.75, 0.25)).toBe(1) // one high
    expect(textileValue('check', 0.25, 0.75)).toBe(1)
    expect(textileValue('check', 0.75, 0.75)).toBe(0) // both high
  })

  it('gingham has a three-tone overlap (base / mid / dark)', () => {
    const tones = new Set([
      textileValue('gingham', 0.75, 0.75), // neither → 0
      textileValue('gingham', 0.25, 0.75), // one → 0.5
      textileValue('gingham', 0.25, 0.25) // both → 1
    ])
    expect(tones).toEqual(new Set([0, 0.5, 1]))
  })

  it('polka is a contrast dot at the tile centre, base at the corners', () => {
    expect(textileValue('polka', 0.5, 0.5)).toBe(1)
    expect(textileValue('polka', 0.02, 0.02)).toBe(0)
  })

  it('plaid layers thick bands (dark crossings) over thin lines', () => {
    expect(textileValue('plaid', 0.02, 0.02)).toBe(1) // band × band crossing = darkest
    expect(textileValue('plaid', 0.9, 0.9)).toBe(0) // clear ground
    // it uses more than two tones (a real tartan gradation)
    const seen = new Set<number>()
    for (let i = 0; i < 100; i++) seen.add(textileValue('plaid', (i % 10) / 10, Math.floor(i / 10) / 10))
    expect(seen.size).toBeGreaterThanOrEqual(3)
  })

  it('exposes exactly the advertised pattern set', () => {
    const expected: TextilePattern[] = ['stripe', 'plaid', 'check', 'gingham', 'polka', 'camo', 'herringbone', 'houndstooth', 'chevron', 'argyle', 'pinstripe', 'windowpane', 'glen-check', 'dot-grid', 'basketweave', 'diagonal-stripe']
    expect([...TEXTILE_PATTERNS].sort()).toEqual([...expected].sort())
  })

  it('the added patterns are real, varied motifs (not flat fields)', () => {
    for (const p of ['argyle', 'pinstripe', 'windowpane', 'glen-check', 'dot-grid', 'basketweave', 'diagonal-stripe'] as TextilePattern[]) {
      const seen = new Set<number>()
      for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) seen.add(textileValue(p, i / 24, j / 24))
      expect(seen.size, `${p} should vary across the tile`).toBeGreaterThanOrEqual(2)
    }
    // pinstripe is a thin vertical stripe (ground most of the tile), windowpane adds the horizontal rule
    expect(textileValue('pinstripe', 0.02, 0.5)).toBe(1)
    expect(textileValue('pinstripe', 0.3, 0.5)).toBe(0)
    expect(textileValue('windowpane', 0.3, 0.02)).toBe(1) // a horizontal rule pinstripe wouldn't draw
    // diagonal-stripe runs on the bias — moving along the diagonal crosses stripes
    expect(textileValue('diagonal-stripe', 0.05, 0.05)).not.toBe(textileValue('diagonal-stripe', 0.05, 0.25))
  })

  it('chevron / herringbone / houndstooth are two-tone motifs that vary across the tile', () => {
    for (const p of ['chevron', 'herringbone', 'houndstooth'] as TextilePattern[]) {
      const seen = new Set<number>()
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) seen.add(textileValue(p, i / 8, j / 8))
      expect(seen).toEqual(new Set([0, 1])) // crisp two-tone weave
      expect(seen.size).toBe(2) // actually patterned, not a flat field
    }
    // houndstooth's 4×4 dogtooth tile: the corner cell is set, its right neighbour clear
    expect(textileValue('houndstooth', 0.05, 0.05)).toBe(1)
    expect(textileValue('houndstooth', 0.95, 0.05)).toBe(0)
  })
})

describe('textileTiles — motif scale → repeat count', () => {
  it('scale 1 keeps the base tile count', () => {
    expect(textileTiles(10, 1)).toBe(10)
  })
  it('a larger scale enlarges the motif (fewer repeats); smaller shrinks it (more)', () => {
    expect(textileTiles(10, 2)).toBe(5) // bigger motif
    expect(textileTiles(10, 0.5)).toBe(20) // smaller motif
    expect(textileTiles(10, 4)).toBeLessThan(textileTiles(10, 1))
  })
  it('clamps scale to 0.25…4 and never drops below one repeat', () => {
    expect(textileTiles(10, 100)).toBe(textileTiles(10, 4)) // clamped high
    expect(textileTiles(10, 0.001)).toBe(textileTiles(10, 0.25)) // clamped low
    expect(textileTiles(1, 4)).toBeGreaterThanOrEqual(1)
  })
  it('treats a zero/NaN scale as 1', () => {
    expect(textileTiles(10, 0)).toBe(10)
    expect(textileTiles(10, NaN)).toBe(10)
  })
})
