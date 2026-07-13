import { describe, it, expect } from 'vitest'
import { cantileverTest, circularDrapeTest, drapeBench, benchSummary } from '../src/renderer/fabric/drapeBench'
import { getFabric, fabricToSolverParams } from '../src/renderer/fabric/FabricLibrary'

// a crisp/stiff heavyweight vs a fluid lightweight from the library
const stiff = fabricToSolverParams(getFabric('denim'))
const fluid = fabricToSolverParams(getFabric('chiffon'))

describe('cantileverTest', () => {
  it('a stiff fabric measures higher rigidity and a longer bending length', () => {
    const s = cantileverTest(stiff)
    const f = cantileverTest(fluid)
    expect(s.flexuralRigidityUNm).toBeGreaterThan(f.flexuralRigidityUNm)
    expect(s.bendingLengthCm).toBeGreaterThan(f.bendingLengthCm)
    // real-world ranges: chiffon c ≈ 1–2.5 cm, denim c ≈ 2–8 cm
    expect(f.bendingLengthCm).toBeGreaterThan(0.5)
    expect(f.bendingLengthCm).toBeLessThan(2.5)
    expect(s.bendingLengthCm).toBeGreaterThan(2)
    expect(s.bendingLengthCm).toBeLessThan(8)
  })

  it('is deterministic (pure formula)', () => {
    const a = cantileverTest(stiff)
    const b = cantileverTest(stiff)
    expect(a.flexuralRigidityUNm).toBe(b.flexuralRigidityUNm)
    expect(a.bendingLengthCm).toBe(b.bendingLengthCm)
  })
})

describe('circularDrapeTest', () => {
  it('a crisp fabric holds a wider shadow (higher drape coefficient) than a fluid one', () => {
    const s = circularDrapeTest(stiff)
    const f = circularDrapeTest(fluid)
    expect(s.coefficientPct).toBeGreaterThan(f.coefficientPct)
    for (const r of [s, f]) {
      expect(r.coefficientPct).toBeGreaterThanOrEqual(0)
      expect(r.coefficientPct).toBeLessThanOrEqual(100)
      expect(r.sampled).toBeGreaterThan(24) // shadow ring well sampled
    }
    // fluid cloth folds well off the pedestal — comfortably below a rigid disc
    expect(f.coefficientPct).toBeLessThan(80)
  })

  it('is deterministic', () => {
    expect(circularDrapeTest(fluid).coefficientPct).toBe(circularDrapeTest(fluid).coefficientPct)
  })
})

describe('drapeBench + summary', () => {
  it('runs both benches for a library fabric and summarises', () => {
    const r = drapeBench(getFabric('denim'))
    const s = benchSummary(r)
    expect(s).toContain('drape coefficient')
    expect(s).toContain('bending length')
    expect(s).toMatch(/\d+ %/)
  })
})
