import { describe, it, expect } from 'vitest'
import { clampStep, tourProgress, shouldAutoStartTour, TOUR_STEPS } from '../src/renderer/ui/onboardingTour'

describe('onboarding tour — step logic', () => {
  it('clamps step indices into range (and handles an empty tour)', () => {
    expect(clampStep(-3, 5)).toBe(0)
    expect(clampStep(2, 5)).toBe(2)
    expect(clampStep(9, 5)).toBe(4)
    expect(clampStep(2.7, 5)).toBe(2) // floored
    expect(clampStep(1, 0)).toBe(0) // empty tour → 0, no crash
  })

  it('reports start/end flags and a 1-based "i of n" label', () => {
    expect(tourProgress(0, 4)).toEqual({ atStart: true, atEnd: false, label: '1 of 4' })
    expect(tourProgress(2, 4)).toEqual({ atStart: false, atEnd: false, label: '3 of 4' })
    expect(tourProgress(3, 4)).toEqual({ atStart: false, atEnd: true, label: '4 of 4' })
    // out-of-range indices are clamped before the flags are computed
    expect(tourProgress(99, 4).atEnd).toBe(true)
    expect(tourProgress(-1, 4).atStart).toBe(true)
  })

  it('auto-starts only when the "seen" flag is unset', () => {
    expect(shouldAutoStartTour(null)).toBe(true)
    expect(shouldAutoStartTour('')).toBe(true) // empty string = never really set
    expect(shouldAutoStartTour('1')).toBe(false)
  })

  it('ships a non-empty tour, each step with a target selector, title and body', () => {
    expect(TOUR_STEPS.length).toBeGreaterThan(0)
    for (const s of TOUR_STEPS) {
      expect(s.selector.startsWith('.dio-')).toBe(true)
      expect(s.title.length).toBeGreaterThan(0)
      expect(s.body.length).toBeGreaterThan(0)
    }
  })
})
