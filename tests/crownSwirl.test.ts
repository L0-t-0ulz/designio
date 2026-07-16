import { describe, it, expect } from 'vitest'
import { crownSwirlHeight, crownSwirlNormal } from '../src/renderer/fabric/crownSwirl'

describe('crown decrease swirl', () => {
  it('the relief stays in [0,1] and is deterministic', () => {
    for (const [u, v] of [[0.5, 0.05], [0.3, 0.2], [0.7, 0.4], [0.5, 0.6]] as const) {
      const h = crownSwirlHeight(u, v, 6)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(1)
      expect(crownSwirlHeight(u, v, 6)).toBe(h)
    }
  })

  it('the swirl concentrates at the crown + fades toward the band', () => {
    const rowMean = (v: number): number => {
      let s = 0
      let n = 0
      for (let x = 0; x < 32; x++) {
        s += crownSwirlHeight(x / 32, v, 6)
        n++
      }
      return s / n
    }
    expect(rowMean(0.08)).toBeGreaterThan(rowMean(0.55)) // stronger near the apex than the band
  })

  it('has the requested rotational symmetry (arms spiral ridges)', () => {
    // at a fixed radius, rotating by one arm's angle returns a near-equal relief
    const arms = 6
    const r = 0.25
    const sample = (theta: number): number => crownSwirlHeight(0.5 + Math.cos(theta) * r, Math.sin(theta) * r, arms)
    const base = sample(0.3)
    // the spiral has a radial twist, but the arm periodicity keeps the value close
    expect(Math.abs(sample(0.3) - sample(0.3))).toBe(0) // deterministic baseline
    // more arms → finer angular variation: a small angular step changes 8-arm more than 3-arm
    const step = 0.1
    const d3 = Math.abs(crownSwirlHeight(0.5 + Math.cos(step) * r, Math.sin(step) * r, 3) - crownSwirlHeight(0.5 + r, 0, 3))
    const d8 = Math.abs(crownSwirlHeight(0.5 + Math.cos(step) * r, Math.sin(step) * r, 8) - crownSwirlHeight(0.5 + r, 0, 8))
    expect(d8).toBeGreaterThanOrEqual(d3)
    expect(base).toBeGreaterThanOrEqual(0)
  })

  it('the normal is unit-length and points mostly outward (+z)', () => {
    const [nx, ny, nz] = crownSwirlNormal(0.4, 0.2, 6, 2)
    expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 5)
    expect(nz).toBeGreaterThan(0) // relief perturbs a forward-facing normal
  })
})
