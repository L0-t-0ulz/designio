import { describe, it, expect } from 'vitest'
import { textileValue, TEXTILE_PATTERNS, type TextilePattern } from '../src/renderer/fabric/textile'

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
    const expected: TextilePattern[] = ['stripe', 'plaid', 'check', 'gingham', 'polka', 'camo']
    expect([...TEXTILE_PATTERNS].sort()).toEqual([...expected].sort())
  })
})
