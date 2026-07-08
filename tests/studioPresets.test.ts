import { describe, it, expect } from 'vitest'
import {
  lampPosition,
  LIGHTING_PRESETS,
  BACKDROP_PRESETS,
  LIGHTING_IDS,
  BACKDROP_IDS,
  getLightingPreset,
  getBackdropPreset
} from '../src/renderer/core/studioPresets'

describe('lampPosition', () => {
  it('maps azimuth/elevation to the expected cardinal directions', () => {
    const front = lampPosition({ azimuth: 0, elevation: 0, intensity: 1, color: 0 }, 10)
    expect(front.x).toBeCloseTo(0, 5)
    expect(front.y).toBeCloseTo(0, 5)
    expect(front.z).toBeCloseTo(10, 5) // 0° = front (+z)

    const right = lampPosition({ azimuth: 90, elevation: 0, intensity: 1, color: 0 }, 10)
    expect(right.x).toBeCloseTo(10, 5) // +90° = camera-right (+x)
    expect(right.z).toBeCloseTo(0, 5)

    const top = lampPosition({ azimuth: 0, elevation: 90, intensity: 1, color: 0 }, 10)
    expect(top.y).toBeCloseTo(10, 5) // 90° elevation = overhead
  })

  it('keeps the lamp on the sphere of the given radius', () => {
    for (const [az, el] of [[0, 0], [37, 49], [-122, 26], [180, 22], [76, 17]]) {
      const p = lampPosition({ azimuth: az, elevation: el, intensity: 1, color: 0 }, 7.5)
      expect(p.length()).toBeCloseTo(7.5, 5)
    }
  })

  it('raising the elevation raises the lamp', () => {
    const low = lampPosition({ azimuth: 30, elevation: 10, intensity: 1, color: 0 })
    const high = lampPosition({ azimuth: 30, elevation: 60, intensity: 1, color: 0 })
    expect(high.y).toBeGreaterThan(low.y)
  })
})

describe('lighting presets', () => {
  it('exist with sane, in-range values', () => {
    expect(LIGHTING_PRESETS.length).toBeGreaterThan(3)
    for (const p of LIGHTING_PRESETS) {
      expect(p.exposure).toBeGreaterThanOrEqual(0.4)
      expect(p.exposure).toBeLessThanOrEqual(2)
      expect(p.hemi).toBeGreaterThanOrEqual(0)
      expect(p.key.intensity).toBeGreaterThan(0)
      expect(p.rims.length).toBeLessThanOrEqual(2) // the Environment builds 2 rim lamps
      for (const r of [p.key, ...p.rims]) expect(r.intensity).toBeGreaterThanOrEqual(0)
    }
  })

  it('has a dramatic look darker than a high-key one', () => {
    const dramatic = getLightingPreset('dramatic')!
    const highKey = getLightingPreset('high-key')!
    expect(dramatic.hemi).toBeLessThan(highKey.hemi)
    expect(dramatic.exposure).toBeLessThan(highKey.exposure)
  })

  it('lookups: known id resolves, unknown is undefined', () => {
    expect(getLightingPreset('studio')).toBeDefined()
    expect(getLightingPreset('nope')).toBeUndefined()
    expect(LIGHTING_IDS).toContain('studio')
  })
})

describe('backdrop presets', () => {
  it('cover the full gradient with valid hex colours (except the transparent one)', () => {
    expect(BACKDROP_PRESETS.length).toBeGreaterThan(3)
    for (const p of BACKDROP_PRESETS.filter((b) => !b.transparent)) {
      const positions = p.stops.map((s) => s[0])
      expect(Math.min(...positions)).toBe(0)
      expect(Math.max(...positions)).toBe(1)
      for (const [, hex] of p.stops) expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
      expect(typeof p.floor).toBe('boolean')
    }
  })

  it('the "black" backdrop hides the stage floor for a floating shot', () => {
    expect(getBackdropPreset('black')!.floor).toBe(false)
    expect(getBackdropPreset('studio-grey')!.floor).toBe(true)
    expect(BACKDROP_IDS).toContain('white')
  })

  it('has product-shot backgrounds — a transparent cutout + a flat product white', () => {
    const t = getBackdropPreset('transparent')!
    expect(t.transparent).toBe(true)
    expect(t.floor).toBe(false)
    expect(t.stops).toEqual([]) // no gradient — the scene clears to alpha
    const w = getBackdropPreset('product-white')!
    expect(w.floor).toBe(false)
    expect(w.stops.every((s) => s[1] === '#ffffff')).toBe(true) // a flat white sweep
  })
})
