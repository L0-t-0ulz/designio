import { describe, it, expect } from 'vitest'
import { cflNumber, stiffnessRatio, substepsForStiffness } from '../src/renderer/cloth/diagnostics'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'

describe('cflNumber (Courant monitor)', () => {
  it('is zero at rest and grows linearly with speed', () => {
    expect(cflNumber(0, 1 / 60, 0.02)).toBe(0)
    expect(cflNumber(1.2, 1 / 60, 0.02)).toBeCloseTo((1.2 / 60) / 0.02, 10)
    expect(cflNumber(2, 1 / 60, 0.02)).toBeGreaterThan(cflNumber(1, 1 / 60, 0.02))
  })

  it('flags a sub-rest-length step as safe (<1) and a tunnelling step as unsafe (>1)', () => {
    expect(cflNumber(0.5, 1 / 60, 0.02)).toBeLessThan(1) // 0.008 m/step vs 0.02 m edge
    expect(cflNumber(8, 1 / 60, 0.02)).toBeGreaterThan(1) // VMAX cap would jump the edge
  })

  it('is Infinity for a degenerate (zero) rest length', () => {
    expect(cflNumber(1, 1 / 60, 0)).toBe(Infinity)
  })
})

describe('stiffnessRatio (condition monitor)', () => {
  it('is Infinity for a perfectly rigid (zero-compliance) constraint', () => {
    expect(stiffnessRatio(0, 0.3, 1 / 60)).toBe(Infinity)
  })

  it('rises as compliance or mass falls (stiffer / lighter = harder to solve)', () => {
    const soft = stiffnessRatio(4e-3, 0.3, 1 / 60)
    const stiff = stiffnessRatio(1e-4, 0.3, 1 / 60)
    expect(stiff).toBeGreaterThan(soft)
    const heavy = stiffnessRatio(1e-3, 0.5, 1 / 60)
    const light = stiffnessRatio(1e-3, 0.1, 1 / 60)
    expect(light).toBeGreaterThan(heavy)
  })

  it('rates a rigid woven (denim) stiffer than a soft knit', () => {
    const dt = 1 / 60
    const denim = stiffnessRatio(FABRICS.denim.stretchCompliance || 1e-6, FABRICS.denim.mass, dt)
    const knit = stiffnessRatio(FABRICS.knit.stretchCompliance || 1e-6, FABRICS.knit.mass, dt)
    expect(denim).toBeGreaterThan(knit)
  })
})

describe('substepsForStiffness (advised budget)', () => {
  it('stays within the clamped band for every preset', () => {
    for (const p of Object.values(FABRICS)) {
      const n = substepsForStiffness(p, 1 / 60)
      expect(n).toBeGreaterThanOrEqual(8)
      expect(n).toBeLessThanOrEqual(28)
      expect(Number.isInteger(n)).toBe(true)
    }
  })

  it('advises at least as many substeps for a stiff fabric as a soft one', () => {
    expect(substepsForStiffness(FABRICS.denim, 1 / 60)).toBeGreaterThanOrEqual(substepsForStiffness(FABRICS.knit, 1 / 60))
  })
})
