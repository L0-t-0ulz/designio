import { describe, it, expect } from 'vitest'
import {
  pathTracePlan,
  clampRenderWidth,
  tilesForWidth,
  pathTraceProgress,
  PATH_TRACE_MIN_WIDTH,
  PATH_TRACE_MAX_WIDTH,
  type PathTraceQuality
} from '../src/renderer/core/pathTracePlan'

describe('path-trace plan — width clamping', () => {
  it('clamps to the supported range + rounds to an integer', () => {
    expect(clampRenderWidth(50)).toBe(PATH_TRACE_MIN_WIDTH)
    expect(clampRenderWidth(99999)).toBe(PATH_TRACE_MAX_WIDTH)
    expect(clampRenderWidth(2048.7)).toBe(2049)
  })
  it('falls back to 2048 for a non-finite width', () => {
    expect(clampRenderWidth(NaN)).toBe(2048)
    expect(clampRenderWidth(Infinity)).toBe(2048) // non-finite → the safe default, not a clamp
  })
})

describe('path-trace plan — tiling', () => {
  it('tiles ~one per 1024 px so a single GPU draw can never time out', () => {
    expect(tilesForWidth(1280)).toBe(1) // HD → one pass
    expect(tilesForWidth(2048)).toBe(2) // 2K → 2×2
    expect(tilesForWidth(3840)).toBe(4) // 4K → 4×4
  })
  it('never drops below one tile', () => {
    expect(tilesForWidth(256)).toBe(1)
    expect(tilesForWidth(0)).toBeGreaterThanOrEqual(1)
  })
})

describe('path-trace plan — quality presets', () => {
  const qualities: PathTraceQuality[] = ['draft', 'high', 'ultra']

  it('monotonically raises the sample budget + bounces with quality', () => {
    const plans = qualities.map((q) => pathTracePlan(q, 2048))
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].samples).toBeGreaterThan(plans[i - 1].samples)
      expect(plans[i].bounces).toBeGreaterThanOrEqual(plans[i - 1].bounces)
    }
  })

  it('allows at least as many transmissive bounces as it needs (≤ bounces)', () => {
    for (const q of qualities) {
      const p = pathTracePlan(q, 2048)
      expect(p.transmissiveBounces).toBeGreaterThan(0)
      expect(p.transmissiveBounces).toBeLessThanOrEqual(p.bounces)
    }
  })

  it('carries the clamped width + a valid tile count into the plan', () => {
    const p = pathTracePlan('high', 99999)
    expect(p.width).toBe(PATH_TRACE_MAX_WIDTH)
    expect(p.tiles).toBe(tilesForWidth(PATH_TRACE_MAX_WIDTH))
  })

  it('falls back to the high preset for an unknown quality', () => {
    const bogus = pathTracePlan('cinematic' as PathTraceQuality, 2048)
    expect(bogus.samples).toBe(pathTracePlan('high', 2048).samples)
  })
})

describe('path-trace progress', () => {
  it('maps samples → a clamped 0…1 fraction', () => {
    expect(pathTraceProgress(0, 160)).toBe(0)
    expect(pathTraceProgress(80, 160)).toBeCloseTo(0.5, 6)
    expect(pathTraceProgress(160, 160)).toBe(1)
    expect(pathTraceProgress(999, 160)).toBe(1) // never past 100%
  })
  it('is complete when there is nothing to converge', () => {
    expect(pathTraceProgress(0, 0)).toBe(1)
  })
})
