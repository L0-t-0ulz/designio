import { describe, it, expect } from 'vitest'
import {
  NAMED_COLORS,
  nearestNamedColor,
  colorDistance,
  colorRefLabel,
  isExactNamedColor
} from '../src/renderer/fabric/namedColors'

describe('named textile colour library', () => {
  it('every entry has a unique code + a valid 24-bit hex', () => {
    const codes = new Set<string>()
    for (const nc of NAMED_COLORS) {
      expect(nc.code).toMatch(/^TR-\d{4}$/)
      expect(nc.name.length).toBeGreaterThan(0)
      expect(nc.hex).toBeGreaterThanOrEqual(0)
      expect(nc.hex).toBeLessThanOrEqual(0xffffff)
      expect(codes.has(nc.code)).toBe(false)
      codes.add(nc.code)
    }
    expect(NAMED_COLORS.length).toBeGreaterThanOrEqual(24) // a real library, not a handful
  })

  it('colorDistance is zero for identical colours and grows with difference', () => {
    expect(colorDistance(0x336699, 0x336699)).toBe(0)
    expect(colorDistance(0x000000, 0xffffff)).toBeGreaterThan(colorDistance(0x000000, 0x333333))
  })

  it('an exact library colour maps to its own reference (distance 0)', () => {
    for (const nc of NAMED_COLORS) {
      expect(nearestNamedColor(nc.hex).code).toBe(nc.code)
    }
  })

  it('a near-black maps to Jet Black, a near-white to Bright White', () => {
    expect(nearestNamedColor(0x0a0b0c).name).toBe('Jet Black')
    expect(nearestNamedColor(0xf4f4f0).name).toBe('Bright White')
  })

  it('an arbitrary navy-ish colour resolves to a blue reference', () => {
    const ref = nearestNamedColor(0x243050) // close to Classic Navy
    expect(ref.code.startsWith('TR-6')).toBe(true)
  })

  it('colorRefLabel reads as "CODE Name"', () => {
    expect(colorRefLabel(0x25324f)).toBe('TR-6030 Classic Navy')
  })

  it('isExactNamedColor distinguishes a library pick from a wheel colour', () => {
    expect(isExactNamedColor(0x25324f)).toBe(true) // Classic Navy exactly
    expect(isExactNamedColor(0x25324e)).toBe(false) // one bit off → a wheel colour
  })
})
