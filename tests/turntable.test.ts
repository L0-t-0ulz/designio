import { describe, it, expect } from 'vitest'
import { turntablePose, turntableFrameCount } from '../src/renderer/studio/turntable'
import type { CameraPose } from '../src/renderer/studio/timeline'

const base: CameraPose = { azimuth: 0.5, polar: 1.2, distance: 3, target: [0, 1, 0] }

describe('turntable spin path', () => {
  it('advances the azimuth by t01 * turns full revolutions, holding the rest', () => {
    expect(turntablePose(base, 0).azimuth).toBe(base.azimuth)
    expect(turntablePose(base, 0.25).azimuth).toBeCloseTo(base.azimuth + Math.PI / 2, 10)
    const full = turntablePose(base, 1)
    expect(full.azimuth).toBeCloseTo(base.azimuth + Math.PI * 2, 10)
    expect(full.polar).toBe(base.polar) // camera height/distance/target don't move — only azimuth
    expect(full.distance).toBe(base.distance)
    expect(full.target).toEqual(base.target)
  })

  it('honours a multi-turn spin', () => {
    expect(turntablePose(base, 1, 2).azimuth).toBeCloseTo(base.azimuth + 4 * Math.PI, 10)
    expect(turntablePose(base, 0.5, 2).azimuth).toBeCloseTo(base.azimuth + 2 * Math.PI, 10)
  })

  it('returns a fresh target array (mutating the result never touches the base)', () => {
    const p = turntablePose(base, 0.3)
    p.target[0] = 9
    expect(base.target[0]).toBe(0)
  })

  it('frame count is seconds*fps, floored at 2', () => {
    expect(turntableFrameCount(6, 30)).toBe(180)
    expect(turntableFrameCount(0, 30)).toBe(2) // never fewer than two frames
    expect(turntableFrameCount(0.01, 30)).toBe(2)
    expect(turntableFrameCount(2.5, 24)).toBe(60)
  })
})
