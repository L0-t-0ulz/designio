import { describe, it, expect } from 'vitest'
import type { Measurements } from '../src/renderer/avatar/Mannequin'
import { figureDistance, standardView, standardViews } from '../src/renderer/studio/standardViews'

const measurements = (over: Partial<Measurements> = {}): Measurements => ({
  chestR: 0.15,
  waistR: 0.13,
  hipR: 0.17,
  thighR: 0.1,
  headR: 0.1,
  neckR: 0.06,
  crownY: 1.75,
  headBaseY: 1.5,
  neckY: 1.45,
  shoulderY: 1.4,
  chestY: 1.25,
  waistY: 1.05,
  hipY: 0.9,
  kneeY: 0.45,
  ankleY: 0.08,
  hipHalfX: 0.18,
  shoulderHalfX: 0.2,
  ...over
})

describe('standard views', () => {
  it('offers exactly front, back, left and right, in that order', () => {
    expect(standardViews(measurements()).map((v) => v.id)).toEqual(['front', 'back', 'left', 'right'])
  })

  it('every view is labelled and described', () => {
    for (const v of standardViews(measurements())) {
      expect(v.label.length).toBeGreaterThan(0)
      expect(v.label.length).toBeLessThanOrEqual(2) // the status bar is tight
      expect(v.title.trim().length).toBeGreaterThan(0)
    }
  })

  it('puts the camera dead-on at each of the four compass points', () => {
    const by = (id: 'front' | 'back' | 'left' | 'right'): number => standardView(measurements(), id)!.pose.azimuth
    expect(by('front')).toBe(0)
    expect(by('back')).toBeCloseTo(Math.PI)
    expect(by('left')).toBeCloseTo(-Math.PI / 2)
    expect(by('right')).toBeCloseTo(Math.PI / 2)
  })

  it('front and back are opposite, and the sides are a quarter turn either way', () => {
    const v = standardViews(measurements())
    const az = Object.fromEntries(v.map((x) => [x.id, x.pose.azimuth]))
    expect(Math.abs(az.front - az.back)).toBeCloseTo(Math.PI)
    expect(Math.abs(az.left - az.right)).toBeCloseTo(Math.PI)
    expect(Math.abs(az.right - az.front)).toBeCloseTo(Math.PI / 2)
  })

  it('holds the camera level so these read as elevations, not a casual orbit', () => {
    for (const v of standardViews(measurements())) expect(v.pose.polar).toBeCloseTo(Math.PI / 2)
  })

  it('aims at mid-figure and stays on the centre line', () => {
    for (const v of standardViews(measurements({ crownY: 1.8 }))) {
      expect(v.pose.target[0]).toBe(0)
      expect(v.pose.target[1]).toBeCloseTo(0.9)
      expect(v.pose.target[2]).toBe(0)
    }
  })

  it('all four share one framing, so flipping between them only rotates', () => {
    const v = standardViews(measurements())
    for (const one of v) {
      expect(one.pose.distance).toBe(v[0].pose.distance)
      expect(one.pose.target).toEqual(v[0].pose.target)
    }
  })

  it('a taller figure is framed from further back', () => {
    expect(figureDistance(measurements({ crownY: 2 }))).toBeGreaterThan(figureDistance(measurements({ crownY: 1.5 })))
  })

  it('an unusually broad figure is framed from further back too', () => {
    const wide = measurements({ shoulderHalfX: 0.8, hipHalfX: 0.8 })
    expect(figureDistance(wide)).toBeGreaterThan(figureDistance(measurements()))
  })

  it('never produces a degenerate or negative orbit distance', () => {
    // a collapsed or garbage measurement set must not put the camera at/behind the target
    for (const m of [measurements({ crownY: 0 }), measurements({ crownY: -5, shoulderHalfX: -1, hipHalfX: -1 })]) {
      expect(figureDistance(m)).toBeGreaterThan(0)
      for (const v of standardViews(m)) {
        expect(v.pose.distance).toBeGreaterThan(0)
        expect(Number.isFinite(v.pose.distance)).toBe(true)
        expect(v.pose.target[1]).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('recomputes from whatever measurements it is given, so it follows a resize', () => {
    const small = standardView(measurements({ crownY: 1.5 }), 'front')!
    const tall = standardView(measurements({ crownY: 2.0 }), 'front')!
    expect(tall.pose.distance).toBeGreaterThan(small.pose.distance)
    expect(tall.pose.target[1]).toBeGreaterThan(small.pose.target[1])
  })

  it('returns undefined for an unknown view id', () => {
    expect(standardView(measurements(), 'top' as 'front')).toBeUndefined()
  })
})
