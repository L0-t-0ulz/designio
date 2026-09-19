import { describe, it, expect } from 'vitest'
import {
  GRAIN_TOLERANCE_DEG,
  checkGrainlines,
  grainDeviationDeg,
  grainSummary,
  grainVerdict,
  isGrainFault
} from '../src/renderer/export/grainline'

const P = (x: number, y: number) => ({ x, y })
const dev = (dx: number, dy: number, rot = 0) => grainDeviationDeg(P(0, 0), P(dx, dy), rot)

describe('grain deviation', () => {
  it('is zero along the warp (the roll direction, +Y)', () => {
    expect(dev(0, 1)).toBeCloseTo(0, 10)
    expect(dev(0, 100)).toBeCloseTo(0, 10)
  })

  it('is 90° across the roll', () => {
    expect(dev(1, 0)).toBeCloseTo(90, 10)
    expect(dev(-1, 0)).toBeCloseTo(90, 10)
  })

  it('is 45° on the true bias, in both diagonals', () => {
    expect(dev(1, 1)).toBeCloseTo(45, 10)
    expect(dev(-1, 1)).toBeCloseTo(45, 10)
    expect(dev(1, -1)).toBeCloseTo(45, 10)
    expect(dev(-1, -1)).toBeCloseTo(45, 10)
  })

  it('treats a grainline as an axis, not a vector — end-for-end is the same grain', () => {
    // a piece flipped 180° is on exactly the same grain; measuring the unfolded
    // angle would call a correctly-placed inverted piece maximally wrong
    expect(dev(0, -1)).toBeCloseTo(0, 10)
    for (const a of [5, 30, 77]) {
      const rad = (a * Math.PI) / 180
      const fwd = dev(Math.sin(rad), Math.cos(rad))
      const back = dev(-Math.sin(rad), -Math.cos(rad))
      expect(back).toBeCloseTo(fwd, 9)
    }
  })

  it('always lands in [0, 90]', () => {
    for (let a = -720; a <= 720; a += 7) {
      const rad = (a * Math.PI) / 180
      const d = dev(Math.sin(rad), Math.cos(rad))
      expect(d).toBeGreaterThanOrEqual(-1e-9)
      expect(d).toBeLessThanOrEqual(90 + 1e-9)
    }
  })

  it('adds the nest rotation', () => {
    // an on-grain piece turned 90° by the nester is now across the roll
    expect(dev(0, 1, 90)).toBeCloseTo(90, 9)
    // and a cross-grain piece turned 90° comes back on grain
    expect(dev(1, 0, 90)).toBeCloseTo(0, 9)
  })

  it('is symmetric about 90° — 100° from warp is the same as 80°', () => {
    const rad = (100 * Math.PI) / 180
    expect(dev(Math.sin(rad), Math.cos(rad))).toBeCloseTo(80, 9)
  })

  it('returns 0 for a zero-length grainline rather than inventing an error', () => {
    expect(grainDeviationDeg(P(5, 5), P(5, 5))).toBe(0)
  })

  it('is scale-invariant — only the direction matters', () => {
    expect(dev(3, 3)).toBeCloseTo(dev(300, 300), 10)
  })
})

describe('verdicts', () => {
  it('names the three deliberate placements and the one fault', () => {
    expect(grainVerdict(0)).toBe('on-grain')
    expect(grainVerdict(90)).toBe('cross-grain')
    expect(grainVerdict(45)).toBe('bias')
    expect(grainVerdict(20)).toBe('off-grain')
    expect(grainVerdict(70)).toBe('off-grain')
  })

  it('only off-grain counts as a fault — the other two are choices', () => {
    expect(isGrainFault('off-grain')).toBe(true)
    for (const v of ['on-grain', 'bias', 'cross-grain'] as const) expect(isGrainFault(v)).toBe(false)
  })

  it('works to a cutting-room tolerance', () => {
    expect(grainVerdict(GRAIN_TOLERANCE_DEG)).toBe('on-grain')
    expect(grainVerdict(GRAIN_TOLERANCE_DEG + 0.01)).toBe('off-grain')
    expect(grainVerdict(45 - GRAIN_TOLERANCE_DEG)).toBe('bias')
    expect(grainVerdict(90 - GRAIN_TOLERANCE_DEG)).toBe('cross-grain')
  })

  it('honours a caller-supplied tolerance', () => {
    expect(grainVerdict(5, 10)).toBe('on-grain')
    expect(grainVerdict(5, 1)).toBe('off-grain')
  })
})

describe('checking a nest', () => {
  it('passes a draft laid straight', () => {
    const r = checkGrainlines([{ name: 'Front', grain: [P(0, 0), P(0, 100)] }, { name: 'Back', grain: [P(0, 0), P(0, 80)] }])
    expect(r.faults).toHaveLength(0)
    expect(r.rotatedOffGrain).toHaveLength(0)
    expect(grainSummary(r)).toBe('All 2 pieces on grain')
  })

  it('reports a piece the nester turned as cross-grain, not as on-grain', () => {
    // this is the real case: the packer rotates to save cloth, which is only safe
    // if the fabric has no nap, sheen or directional weave
    const r = checkGrainlines([{ name: 'Sleeve', grain: [P(0, 0), P(0, 100)], rotated: true }])
    expect(r.checks[0].verdict).toBe('cross-grain')
    expect(r.checks[0].rotatedByNest).toBe(true)
    expect(r.faults).toHaveLength(0) // cross-grain is a choice, not a fault
    expect(r.rotatedOffGrain).toHaveLength(1)
    expect(grainSummary(r)).toContain('nap')
  })

  it('flags a genuinely askew piece, with its angle', () => {
    const r = checkGrainlines([{ name: 'Yoke', grain: [P(0, 0), P(30, 100)] }])
    expect(r.faults).toHaveLength(1)
    expect(r.faults[0].deviationDeg).toBeCloseTo(16.7, 1)
    expect(grainSummary(r)).toContain('Yoke')
    expect(grainSummary(r)).toContain('off grain')
  })

  it('reports faults ahead of nest rotations when both are present', () => {
    const r = checkGrainlines([
      { name: 'Askew', grain: [P(0, 0), P(30, 100)] },
      { name: 'Turned', grain: [P(0, 0), P(0, 100)], rotated: true }
    ])
    expect(grainSummary(r)).toContain('Askew') // the fault is the more urgent message
  })

  it('handles nothing to check', () => {
    const r = checkGrainlines([])
    expect(r.checks).toEqual([])
    expect(grainSummary(r)).toBe('No pieces to check')
  })

  it('a bias-cut piece is not reported as a fault', () => {
    const r = checkGrainlines([{ name: 'Bias skirt', grain: [P(0, 0), P(100, 100)] }])
    expect(r.checks[0].verdict).toBe('bias')
    expect(r.faults).toHaveLength(0)
  })

})
