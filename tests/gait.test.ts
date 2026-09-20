import { describe, it, expect } from 'vitest'
import {
  comBob,
  cadenceRatio,
  elbowFlexion,
  WALK_BOB_CM,
  RUN_BOB_CM,
  WALK_CADENCE,
  RUN_CADENCE,
  RUN_LEG_GAIN,
  RUN_ARM_GAIN
} from '../src/renderer/avatar/gait'

describe('gait mechanics', () => {
  it('bobs the opposite way for a walk and a run — the whole difference', () => {
    // walking vaults the body OVER the stance leg, so it is highest at mid-stance;
    // running compresses the leg under it, so it is lowest there
    expect(comBob(0.5, 'walk')).toBeGreaterThan(comBob(0, 'walk'))
    expect(comBob(0.5, 'run')).toBeLessThan(comBob(0, 'run'))
  })

  it('puts the extremes at foot strike and mid-stance, and nowhere else', () => {
    for (const g of ['walk', 'run'] as const) {
      let lo = Infinity
      let hi = -Infinity
      let loAt = 0
      let hiAt = 0
      for (let p = 0; p < 1; p += 0.005) {
        const y = comBob(p, g)
        if (y < lo) {
          lo = y
          loAt = p
        }
        if (y > hi) {
          hi = y
          hiAt = p
        }
      }
      const stance = g === 'walk' ? hiAt : loAt
      expect(stance, g).toBeCloseTo(0.5, 1)
      expect(hi - lo, g).toBeCloseTo((g === 'run' ? RUN_BOB_CM : WALK_BOB_CM) / 100, 6)
    }
  })

  it('moves a runner further than a walker, by the measured amounts', () => {
    expect(RUN_BOB_CM).toBeGreaterThan(WALK_BOB_CM)
    const range = (g: 'walk' | 'run') => comBob(0, g) - comBob(0.5, g)
    expect(Math.abs(range('run'))).toBeGreaterThan(Math.abs(range('walk')))
  })

  it('never goes below the ground it is measured from', () => {
    for (const g of ['walk', 'run'] as const) {
      for (let p = -2; p < 3; p += 0.01) expect(comBob(p, g), `${g} @ ${p}`).toBeGreaterThanOrEqual(0)
    }
  })

  it('repeats every step', () => {
    for (const g of ['walk', 'run'] as const) {
      for (const p of [0.1, 0.37, 0.8]) {
        expect(comBob(p, g)).toBeCloseTo(comBob(p + 1, g), 12)
        expect(comBob(p, g)).toBeCloseTo(comBob(p - 3, g), 12)
      }
    }
  })

  it('scales with the body without changing its shape', () => {
    expect(comBob(0.25, 'run', 2)).toBeCloseTo(comBob(0.25, 'run') * 2, 12)
    expect(comBob(0.5, 'run', 5)).toBeCloseTo(0, 12) // the trough stays a trough
  })

  it('steps a jog faster than a walk, at real cadences', () => {
    expect(RUN_CADENCE).toBeGreaterThan(WALK_CADENCE)
    expect(cadenceRatio('walk', 'run')).toBeCloseTo(RUN_CADENCE / WALK_CADENCE, 12)
    expect(cadenceRatio('run', 'walk')).toBeCloseTo(WALK_CADENCE / RUN_CADENCE, 12)
    expect(cadenceRatio('walk', 'walk')).toBe(1)
    expect(cadenceRatio('walk', 'run')).toBeGreaterThan(1.4)
  })

  it('bends a runner’s elbows and leaves a walker’s nearly straight', () => {
    expect(elbowFlexion('run')).toBeCloseTo(Math.PI / 2, 9)
    expect(elbowFlexion('walk')).toBeLessThan(0.3)
  })

  it('drives the procedural body harder in both stride and arms', () => {
    expect(RUN_LEG_GAIN).toBeGreaterThan(1)
    expect(RUN_ARM_GAIN).toBeGreaterThan(RUN_LEG_GAIN) // bent, driving arms swing more
  })
})
