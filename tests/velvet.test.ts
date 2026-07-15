import { describe, it, expect } from 'vitest'
import { velvetFacingFactor, isVelvet, VELVET_FLOOR } from '../src/renderer/fabric/velvet'
import { getFabric } from '../src/renderer/fabric/FabricLibrary'

describe('velvetFacingFactor', () => {
  it('is full brightness at the grazing rim (N·V → 0)', () => {
    expect(velvetFacingFactor(0)).toBe(1)
  })
  it('darkens to the floor facing the camera (N·V → 1)', () => {
    expect(velvetFacingFactor(1)).toBeCloseTo(VELVET_FLOOR, 6)
  })
  it('decreases monotonically from rim to facing (retroreflective)', () => {
    let prev = velvetFacingFactor(0)
    for (let v = 0.1; v <= 1.0001; v += 0.1) {
      const cur = velvetFacingFactor(v)
      expect(cur).toBeLessThanOrEqual(prev + 1e-9)
      prev = cur
    }
  })
  it('clamps N·V outside 0…1', () => {
    expect(velvetFacingFactor(-2)).toBe(1)
    expect(velvetFacingFactor(5)).toBeCloseTo(VELVET_FLOOR, 6)
  })
  it('honours a custom floor', () => {
    expect(velvetFacingFactor(1, 0.1)).toBeCloseTo(0.1, 6)
    expect(velvetFacingFactor(0, 0.1)).toBe(1)
  })
})

describe('isVelvet', () => {
  it('is true for velvet (lustrous nap) and false for matte-nap or smooth fabrics', () => {
    expect(isVelvet(getFabric('velvet'))).toBe(true)
    expect(isVelvet(getFabric('suede'))).toBe(false) // napped but matte
    expect(isVelvet(getFabric('fleece'))).toBe(false)
    expect(isVelvet(getFabric('satin'))).toBe(false) // smooth, no nap
    expect(isVelvet(getFabric('cotton-poplin'))).toBe(false)
  })
})
