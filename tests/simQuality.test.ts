import { describe, it, expect } from 'vitest'
import { SIM_RESOLUTIONS, getResolutionScale, simTube, qualityToSubsteps } from '../src/renderer/cloth/simQuality'

describe('simulation resolution + quality', () => {
  it('exposes the resolution ladder, ascending in particle density', () => {
    expect(SIM_RESOLUTIONS.map((r) => r.name)).toEqual(['coarse', 'normal', 'fine', 'ultra'])
    const scales = SIM_RESOLUTIONS.map((r) => r.scale)
    for (let i = 1; i < scales.length; i++) expect(scales[i]).toBeGreaterThan(scales[i - 1])
    expect(getResolutionScale('normal')).toBe(1)
    expect(getResolutionScale('bogus' as never)).toBe(1)
  })

  it('simTube scales radial + rings with the resolution (more particles)', () => {
    const normal = simTube(60, 1.0, 0.022, 1)
    const ultra = simTube(60, 1.0, 0.022, 1.9)
    expect(ultra.radial).toBeGreaterThan(normal.radial)
    expect(ultra.rings).toBeGreaterThan(normal.rings)
    // a coarse tube has fewer particles than normal
    const coarse = simTube(60, 1.0, 0.022, 0.7)
    expect(coarse.radial * coarse.rings).toBeLessThan(normal.radial * normal.rings)
  })

  it('simTube clamps to sane bounds (stable + tractable)', () => {
    const huge = simTube(60, 4.0, 0.022, 5)
    expect(huge.radial).toBeLessThanOrEqual(150)
    expect(huge.rings).toBeLessThanOrEqual(120)
    const tiny = simTube(4, 0.05, 0.03, 0.1)
    expect(tiny.radial).toBeGreaterThanOrEqual(8)
    expect(tiny.rings).toBeGreaterThanOrEqual(6)
  })

  it('quality slider maps perf→quality onto substeps 6…20', () => {
    expect(qualityToSubsteps(0)).toBe(6)
    expect(qualityToSubsteps(1)).toBe(20)
    expect(qualityToSubsteps(0.5)).toBe(13)
    expect(qualityToSubsteps(-1)).toBe(6) // clamped
    expect(qualityToSubsteps(2)).toBe(20)
  })
})
