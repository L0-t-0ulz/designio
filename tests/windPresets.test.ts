import { describe, it, expect } from 'vitest'
import { WIND_PRESET_NAMES, getWindPreset, gustWind } from '../src/renderer/cloth/windPresets'

describe('wind field presets', () => {
  it('exposes the named set', () => {
    expect(WIND_PRESET_NAMES).toEqual(['still', 'breeze', 'gust', 'runway', 'storm'])
  })

  it('still is calm, gust is stronger than breeze, runway blows front→back (−z)', () => {
    const mag = (p: { x: number; z: number }): number => Math.hypot(p.x, p.z)
    expect(mag(getWindPreset('still')!)).toBe(0)
    expect(getWindPreset('still')!.gust).toBe(0)
    expect(mag(getWindPreset('gust')!)).toBeGreaterThan(mag(getWindPreset('breeze')!))
    expect(getWindPreset('gust')!.gust).toBeGreaterThan(getWindPreset('breeze')!.gust)
    expect(getWindPreset('runway')!.z).toBeLessThan(0) // a front draft pushes garments back
  })

  it('gustWind is steady when gust is 0', () => {
    for (const t of [0, 1, 5, 10]) expect(gustWind(2, -1, 0, t)).toEqual({ x: 2, z: -1 })
  })

  it('gustWind pulses the strength over time within a bounded band', () => {
    const samples = Array.from({ length: 60 }, (_, i) => gustWind(3, 1, 0.9, i * 0.3))
    const factors = samples.map((s) => s.x / 3)
    const min = Math.min(...factors)
    const max = Math.max(...factors)
    expect(max).toBeGreaterThan(min + 0.2) // it actually swells + lulls
    expect(min).toBeGreaterThan(0) // never flips direction
    expect(max).toBeLessThan(1 + 0.9 + 1e-6) // bounded by 1 + gust
    // x and z scale by the same pulse (direction preserved)
    expect(samples[5].x / 3).toBeCloseTo(samples[5].z / 1, 6)
  })
})
